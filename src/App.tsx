import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type {
  AppView,
  AvatarConfig,
  HistoryRecord,
  LeaderboardEntry,
  LobbyChatMessage,
  LobbyPlayer,
  PublicParticipantProfile,
  QuizCategory,
  QuizQuestion,
  QuizRoom,
  ToastMessage,
} from './types/quiz';
import {
  ACCESSORY_ITEMS,
  AVATAR_PRESETS,
  BOTTOM_ITEMS,
  CHARACTER_ITEMS,
  HAIR_ITEMS,
  SHOE_ITEMS,
  SKIN_SWATCHES,
  TOP_ITEMS,
  findWardrobeItem,
} from './data/wardrobeCatalog';
import { DEFAULT_ROOM } from './data/defaultQuiz';
import {
  calculateAnswerPoints,
  calculateGrade,
  canAdminStartQuiz,
  compute5050HiddenIndices,
  generateRoomCode,
  normalizeRoomForLobbyEntry,
  rankLeaderboard,
  sha256Hex,
} from './utils/quizLogic';
import {
  ensureSystemPassword,
  exportHistoryToExcel,
  loadActiveRoomCode,
  loadAvatarConfig,
  loadHistory,
  loadPlayerName,
  loadRooms,
  loadWebhookUrl,
  regenerateStoredSystemPassword,
  saveActiveRoomCode,
  saveAvatarConfig,
  saveHistory,
  savePlayerName,
  saveRooms,
  saveWebhookUrl,
  syncRecordToWebhook,
} from './utils/storage';
import {
  downloadCanvasPNG,
  renderCertificateToCanvas,
  type CertificateData,
} from './utils/certificate';
import { compressDataUrlImage } from './utils/imageHelper';
import { OFFICIAL_SITE_ORIGIN } from './utils/appStoreDistribution';
import { getQuizScheduleStatus, parseOpenAtInput, toDateTimeLocalInput } from './utils/quizSchedule';
import { Header } from './components/Header';
import { GalaxyBackground } from './components/GalaxyBackground';
import { IntroSplash } from './components/IntroSplash';
import { LandingView } from './components/LandingView';
import { AcademicPortalsView } from './components/AcademicPortalsView';
import { LobbyView } from './components/LobbyView';
import { QuizView } from './components/QuizView';
import { ResultsView } from './components/ResultsView';
import { AdminStudioView } from './components/AdminStudioView';
import { UtbkCampusAnalyzer } from './components/UtbkCampusAnalyzer';
import type { PortalTab, StudyModule } from './data/academicCatalog';
import { WardrobeModal } from './components/WardrobeModal';
import { TutorialModal } from './components/TutorialModal';
import { WebSettingsModal } from './components/WebSettingsModal';
import { ParticipantAuthModal } from './components/ParticipantAuthModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import {
  DEFAULT_USER_WEB_SETTINGS,
  applyUserWebSettingsToDom,
  loadUserWebSettings,
  saveUserWebSettings,
  type UserWebSettings,
} from './utils/webSettings';
import {
  sanitizeParticipantPhotoUrl,
  type ParticipantAuthMethod,
  type ParticipantTargetTrack,
  type SavedSkdSummary,
} from './utils/participantAuth';
import {
  AdminConfirmModal,
  AdminGateModal,
  GoogleScriptModal,
} from './components/AdminModals';
import type { User } from 'firebase/auth';
import {
  DEFAULT_SITE_SETTINGS,
  FIREBASE_PROJECT_ID,
  GOOGLE_OAUTH_CLIENT_ID,
  adminUpsertParticipantToFirestore,
  clearAllHistoryFromFirestore,
  clearAllParticipantsFromFirestore,
  clearAllUserHistoryFromFirestore,
  deleteHistoryFromFirestore,
  deleteMaterialFromFirestore,
  deleteParticipantFromFirestore,
  deleteRoomFromFirestore,
  deleteUserHistoryFromFirestore,
  fetchRoomFromFirestore,
  isVerifiedAdminUser,
  joinLobbyInFirestore,
  leaveLobbyInFirestore,
  listHistoryFromFirestore,
  listMaterialsFromFirestore,
  listParticipantsFromFirestore,
  listRoomsFromFirestore,
  listUserHistoryFromFirestore,
  loadUserProfileFromFirestore,
  onAuthChange,
  saveHistoryToFirestore,
  saveMaterialToFirestore,
  saveRoomToFirestore,
  saveSiteSettingsToFirestore,
  saveUserHistoryToFirestore,
  saveUserProfileToFirestore,
  setRoomStatusInFirestore,
  deleteLiveSessionFromFirestore,
  saveLiveSessionToFirestore,
  consumeGoogleRedirectResult,
  signInWithGoogleIdToken,
  signInWithGoogleSmart,
  signOutAdmin,
  subscribeToAllMaterials,
  subscribeToAllRooms,
  subscribeToLiveSessions,
  subscribeToLobbyPlayers,
  subscribeToRoomLeaderboard,
  subscribeToRoomState,
  subscribeToSiteSettings,
  testFirestoreConnection,
  updateLobbyPlayerInFirestore,
  upsertRoomLeaderboardScore,
  type LiveTeachingSession,
  type ParticipantRecord,
  type SiteSettings,
} from './firebase';
import {
  isManualGoogleLogoutActive,
  loadGoogleIdentityServices,
  markManualGoogleLogout,
  shouldAttemptAutoGoogleConnect,
  type AutoGoogleConnectStatus,
} from './utils/googleOneTap';
import {
  extractLocalMaterialFileName,
  mergeCloudAndPendingMaterials,
  mergeCloudAndPendingRooms,
  mergeServerCloudAndLocalMaterials,
  removeMaterialById,
  replaceMaterialInList,
  stripMaterialPpt,
} from './utils/materialManagement';
import {
  ADMIN_SESSION_TOKEN_KEY,
  PARTICIPANT_SESSION_TOKEN_KEY,
  buildAdminAuthHeaders,
  buildParticipantAuthHeaders,
  readStoredSessionToken,
  writeStoredSessionToken,
} from './utils/sessionPersistence';

const UPLOADED_MATERIALS_STORAGE_KEY = 'hafiz_uploaded_materials_v1';
const PENDING_LOCAL_MATERIALS_KEY = 'hafiz_pending_local_materials_v1';
const DELETED_LOCAL_MATERIALS_KEY = 'hafiz_deleted_materials_v1';
const DELETED_LOCAL_ROOMS_KEY = 'hafiz_deleted_rooms_v1';

function readPendingLocalMaterialIds(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_LOCAL_MATERIALS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writePendingLocalMaterialIds(ids: string[]): void {
  try {
    localStorage.setItem(PENDING_LOCAL_MATERIALS_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore storage quota
  }
}

function readDeletedMaterialIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_LOCAL_MATERIALS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeDeletedMaterialIds(ids: string[]): void {
  try {
    localStorage.setItem(
      DELETED_LOCAL_MATERIALS_KEY,
      JSON.stringify(Array.from(new Set(ids)).slice(-500))
    );
  } catch {
    // ignore storage quota
  }
}

function readDeletedRoomCodes(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_LOCAL_ROOMS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function writeDeletedRoomCodes(codes: string[]): void {
  try {
    localStorage.setItem(
      DELETED_LOCAL_ROOMS_KEY,
      JSON.stringify(Array.from(new Set(codes)).slice(-300))
    );
  } catch {
    // ignore storage quota
  }
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/session-token', {
    method: 'GET',
    credentials: 'same-origin',
  });
  const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Gagal memverifikasi token sesi.');
  }
  return data.token;
}

export function App() {
  const [view, setView] = useState<AppView>('landing');
  const [playerName, setPlayerName] = useState<string>(() => loadPlayerName());
  const [roomCodeInput, setRoomCodeInput] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || '').toUpperCase();
  });
  const [avatar, setAvatar] = useState<AvatarConfig>(() => loadAvatarConfig());

  // Rooms & Active Room
  const [rooms, setRooms] = useState<Record<string, QuizRoom>>(() => loadRooms());
  const [activeRoomCode, setActiveRoomCode] = useState<string>(() => loadActiveRoomCode());
  const [currentRoom, setCurrentRoom] = useState<QuizRoom>(DEFAULT_ROOM);

  // Persistent History
  const [history, setHistory] = useState<HistoryRecord[]>(() => loadHistory());

  // Modals & Admin Auth
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [adminNavUnlocked, setAdminNavUnlocked] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [googleScriptOpen, setGoogleScriptOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [googleAutoConnectStatus, setGoogleAutoConnectStatus] =
    useState<AutoGoogleConnectStatus>('idle');
  const autoGoogleAttemptedRef = useRef(false);
  const finalizeGoogleUserRef = useRef<(user: User) => Promise<void>>(async () => {});
  const [serverParticipant, setServerParticipant] = useState<ParticipantRecord | null>(null);
  const adminTokenRef = useRef<string>(readStoredSessionToken(ADMIN_SESSION_TOKEN_KEY));
  const participantTokenRef = useRef<string>(readStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY));
  const [userHistory, setUserHistory] = useState<HistoryRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [publicDirectory, setPublicDirectory] = useState<PublicParticipantProfile[]>([]);
  const [uploadedMaterials, setUploadedMaterials] = useState<StudyModule[]>(() => {
    try {
      const raw = localStorage.getItem('hafiz_uploaded_materials_v1');
      return raw ? (JSON.parse(raw) as StudyModule[]) : [];
    } catch {
      return [];
    }
  });
  const [liveSessions, setLiveSessions] = useState<LiveTeachingSession[]>(() => {
    try {
      const raw = localStorage.getItem('hafiz_live_sessions_v1');
      return raw ? (JSON.parse(raw) as LiveTeachingSession[]) : [];
    } catch {
      return [];
    }
  });
  const [webSettingsOpen, setWebSettingsOpen] = useState(false);
  const [webSettings, setWebSettings] = useState<UserWebSettings>(() => loadUserWebSettings());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'register' | 'login' | 'profile'>('register');
  const [googleRecoveryMessage, setGoogleRecoveryMessage] = useState('');
  const [adminGoogleRecoveryMessage, setAdminGoogleRecoveryMessage] = useState('');
  const [participantMeta, setParticipantMeta] = useState<{
    username?: string;
    photoUrl?: string;
    school: string;
    phone: string;
    targetTrack: ParticipantTargetTrack;
    targetCampus: string;
    authMethod: ParticipantAuthMethod;
    savedSkdSummary?: SavedSkdSummary;
  }>(() => {
    try {
      const raw = localStorage.getItem('hafiz_participant_meta_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          username: typeof parsed.username === 'string' ? parsed.username : '',
          photoUrl: typeof parsed.photoUrl === 'string' ? parsed.photoUrl : '',
          school: typeof parsed.school === 'string' ? parsed.school : '',
          phone: typeof parsed.phone === 'string' ? parsed.phone : '',
          targetTrack:
            parsed.targetTrack === 'kedinasan' || parsed.targetTrack === 'both'
              ? parsed.targetTrack
              : 'utbk',
          targetCampus: typeof parsed.targetCampus === 'string' ? parsed.targetCampus : '',
          authMethod:
            parsed.authMethod === 'password'
              ? 'password'
              : parsed.authMethod === 'email'
                ? 'email'
                : 'google',
          savedSkdSummary: parsed.savedSkdSummary,
        };
      }
    } catch {
      // ignore localStorage error
    }
    return {
      username: '',
      photoUrl: '',
      school: '',
      phone: '',
      targetTrack: 'utbk',
      targetCampus: '',
      authMethod: 'password',
    };
  });
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [studioRoomStatus, setStudioRoomStatus] = useState<'waiting' | 'started'>('waiting');
  const [failedAdminAttempts, setFailedAdminAttempts] = useState(0);
  const [adminLockUntil, setAdminLockUntil] = useState<number>(0);
  const [systemPw, setSystemPw] = useState<{ plain: string; hash: string }>({
    plain: 'HFZ-XXXXXX',
    hash: '',
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(() => loadWebhookUrl());
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // Secret 5x brand click tracker
  const secretClicksRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  // Studio Draft State
  const [studioTitle, setStudioTitle] = useState<string>(DEFAULT_ROOM.title);
  const [studioCategory, setStudioCategory] = useState<QuizCategory>('UTBK-SNBT');
  const [studioOpenAt, setStudioOpenAt] = useState<string>('');
  const [studioCloseAt, setStudioCloseAt] = useState<string>('');
  const [studioCode, setStudioCode] = useState<string>(() => generateRoomCode());
  const [studioQuestions, setStudioQuestions] = useState<QuizQuestion[]>(DEFAULT_ROOM.questions);
  const [studioPublished, setStudioPublished] = useState<boolean>(false);
  const [portalTab, setPortalTab] = useState<PortalTab>('tryout-utbk');
  const [campusAnalysisMode, setCampusAnalysisMode] = useState<'utbk' | 'kedinasan'>('utbk');

  // Real-time 3D Lobby Presence State (no fake bots — only real joined players)
  const sessionPlayerIdRef = useRef<string>(
    `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  );
  const [firestoreLobbyPlayers, setFirestoreLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [serverLobbyPlayers, setServerLobbyPlayers] = useState<LobbyPlayer[]>([]);

  // Lobby Chat State
  const [lobbyChat, setLobbyChat] = useState<LobbyChatMessage[]>([
    {
      id: 'sys-welcome',
      sender: 'Sistem',
      text: 'Selamat datang di Lobi Kuis! Avatar peserta akan muncul otomatis saat bergabung.',
      isSystem: true,
      time: '',
    },
  ]);

  // Quiz Session State
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [cheatCount, setCheatCount] = useState(0);
  const [powerup5050Used, setPowerup5050Used] = useState(false);
  const [answersByIndex, setAnswersByIndex] = useState<Record<number, number>>({});
  const [hiddenChoicesByIndex, setHiddenChoicesByIndex] = useState<Record<number, number[]>>({});
  const [flaggedIndices, setFlaggedIndices] = useState<number[]>([]);
  const [roomLeaderboardRaw, setRoomLeaderboardRaw] = useState<LeaderboardEntry[]>([]);
  const [countdownValue, setCountdownValue] = useState<number | 'go' | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const raw = localStorage.getItem('hafiz_edu_site_settings_v1');
      if (raw) {
        return { ...DEFAULT_SITE_SETTINGS, ...(JSON.parse(raw) as Partial<SiteSettings>) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SITE_SETTINGS;
  });

  // Results State
  const [lastResult, setLastResult] = useState<{
    grade: number;
    points: number;
    correctCount: number;
    totalQuestions: number;
    rank: number;
    leaderboard: (LeaderboardEntry & { rank: number })[];
    certificateData: CertificateData;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback(
    (text: string, type: ToastMessage['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    []
  );

  const isGoogleAdminVerified = isVerifiedAdminUser(firebaseUser);
  const isAnyAdminSession = isGoogleAdminVerified || adminAuthenticated;
  const activeParticipantIdentity = serverParticipant
    ? `@${serverParticipant.username || serverParticipant.displayName}`
    : firebaseUser?.email ?? null;
  const activeParticipantUid =
    serverParticipant?.uid || firebaseUser?.uid || sessionPlayerIdRef.current;

  const fetchPublicDirectory = useCallback(async () => {
    try {
      const res = await fetch('/api/participants/public-directory', {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        directory?: PublicParticipantProfile[];
      };
      if (Array.isArray(data.directory)) {
        setPublicDirectory(data.directory);
      }
    } catch {
      // ignore directory fetch failure
    }
  }, []);

  const matchedDirEntry = useMemo(() => {
    const uid = serverParticipant?.uid || firebaseUser?.uid;
    if (uid) {
      const byUid = publicDirectory.find((p) => p.uid === uid && p.photoUrl);
      if (byUid) return byUid;
    }
    const cleanName = playerName.trim().toLowerCase();
    if (cleanName.length >= 2) {
      return publicDirectory.find(
        (p) => p.photoUrl && p.displayName.trim().toLowerCase() === cleanName
      );
    }
    return undefined;
  }, [firebaseUser?.uid, playerName, publicDirectory, serverParticipant?.uid]);

  const activeParticipantPhotoUrl = participantMeta.photoUrl?.startsWith('data:image/')
    ? participantMeta.photoUrl
    : matchedDirEntry?.photoUrl ||
      serverParticipant?.photoUrl ||
      participantMeta.photoUrl ||
      '';

  const fetchServerParticipantsList = useCallback(async (): Promise<ParticipantRecord[]> => {
    if (!adminTokenRef.current) return [];
    try {
      const res = await fetch('/api/participants/list', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'X-Hafiz-Admin-Token': adminTokenRef.current,
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { ok?: boolean; participants?: ParticipantRecord[] };
      return Array.isArray(data.participants) ? data.participants : [];
    } catch {
      return [];
    }
  }, []);

  // Sync rooms, materials, participants & permanent history from Firestore + Server DB for Admin
  const syncAdminCloudData = useCallback(
    async (silent = false) => {
      setIsSyncingCloud(true);
      try {
        const isGoogleAdmin = Boolean(firebaseUser && isVerifiedAdminUser(firebaseUser));
        const [
          cloudRooms,
          cloudHistory,
          cloudParticipants,
          serverParticipants,
          cloudMaterials,
          serverMaterialsRes,
        ] = await Promise.all([
          listRoomsFromFirestore().catch(() => ({} as Record<string, QuizRoom>)),
          isGoogleAdmin
            ? listHistoryFromFirestore().catch(() => [] as HistoryRecord[])
            : Promise.resolve([] as HistoryRecord[]),
          isGoogleAdmin
            ? listParticipantsFromFirestore().catch(() => [] as ParticipantRecord[])
            : Promise.resolve([] as ParticipantRecord[]),
          fetchServerParticipantsList(),
          listMaterialsFromFirestore().catch(() => [] as StudyModule[]),
          fetch('/api/materials', { method: 'GET', credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null) as Promise<{
            ok?: boolean;
            materials?: StudyModule[];
            deletedIds?: string[];
            deletedRoomCodes?: string[];
          } | null>,
        ]);

        const mergedDeletedIds = Array.from(
          new Set([
            ...readDeletedMaterialIds(),
            ...(Array.isArray(serverMaterialsRes?.deletedIds) ? serverMaterialsRes!.deletedIds : []),
          ])
        );
        writeDeletedMaterialIds(mergedDeletedIds);

        const mergedDeletedRoomCodes = Array.from(
          new Set([
            ...readDeletedRoomCodes(),
            ...(Array.isArray(serverMaterialsRes?.deletedRoomCodes)
              ? serverMaterialsRes!.deletedRoomCodes
              : []),
          ])
        );
        writeDeletedRoomCodes(mergedDeletedRoomCodes);

        const deletedMatSet = new Set(mergedDeletedIds);
        const deletedRoomSet = new Set(mergedDeletedRoomCodes);

        // Auto-backup any locally uploaded rooms/materials not yet in Firestore Cloud
        // and flush any pending cloud deletions when Google Admin is active
        const currentAdmin = firebaseUser;
        if (currentAdmin && isVerifiedAdminUser(currentAdmin)) {
          for (const delRoomCode of mergedDeletedRoomCodes) {
            if (cloudRooms[delRoomCode]) {
              deleteRoomFromFirestore(delRoomCode).catch(() => {});
              delete cloudRooms[delRoomCode];
            }
          }
          const localRooms = loadRooms();
          for (const localRoom of Object.values(localRooms)) {
            if (
              localRoom.code !== DEFAULT_ROOM.code &&
              !deletedRoomSet.has(localRoom.code) &&
              !cloudRooms[localRoom.code] &&
              localRoom.questions.length > 0
            ) {
              saveRoomToFirestore(localRoom, currentAdmin.uid).catch(() => {});
              cloudRooms[localRoom.code] = localRoom;
            }
          }
          for (const cloudMat of cloudMaterials) {
            if (deletedMatSet.has(cloudMat.id)) {
              deleteMaterialFromFirestore(cloudMat.id).catch(() => {});
            }
          }
          const cloudMatIds = new Set(cloudMaterials.map((m) => m.id));
          const remainingPending: string[] = [];
          for (const localMat of uploadedMaterials) {
            if (!deletedMatSet.has(localMat.id) && !cloudMatIds.has(localMat.id)) {
              try {
                await saveMaterialToFirestore(localMat, currentAdmin.uid);
                cloudMaterials.push(localMat);
              } catch {
                remainingPending.push(localMat.id);
              }
            }
          }
          writePendingLocalMaterialIds(remainingPending);
        }

        setRooms((prev) => {
          const merged = mergeCloudAndPendingRooms(
            cloudRooms,
            prev,
            mergedDeletedRoomCodes,
            DEFAULT_ROOM.code
          );
          saveRooms(merged);
          return merged;
        });

        // Merge Firestore & Server participant lists by UID
        const mergedByUid = new Map<string, ParticipantRecord>();
        for (const p of cloudParticipants) {
          mergedByUid.set(p.uid, p);
        }
        for (const sp of serverParticipants) {
          const prev = mergedByUid.get(sp.uid);
          if (!prev) {
            mergedByUid.set(sp.uid, sp);
          } else {
            mergedByUid.set(sp.uid, {
              ...prev,
              ...sp,
              photoUrl: sp.photoUrl || prev.photoUrl,
              username: sp.username || prev.username,
            });
          }
        }
        const mergedParticipants = Array.from(mergedByUid.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setParticipants(mergedParticipants);

        setUploadedMaterials((prev) => {
          const pendingIds = readPendingLocalMaterialIds();
          const serverMats = Array.isArray(serverMaterialsRes?.materials)
            ? serverMaterialsRes!.materials
            : [];
          const mergedMaterials = mergeServerCloudAndLocalMaterials({
            serverMaterials: serverMats,
            cloudMaterials,
            localMaterials: prev,
            pendingLocalIds: pendingIds,
            deletedMaterialIds: mergedDeletedIds,
          });
          try {
            localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(mergedMaterials));
          } catch {
            // ignore storage quota
          }
          return mergedMaterials;
        });

        setHistory((prev) => {
          const byKey = new Map<string, HistoryRecord>();
          for (const rec of cloudHistory) {
            byKey.set(rec.certificateId || rec.id, rec);
          }
          for (const rec of prev) {
            const k = rec.certificateId || rec.id;
            if (!byKey.has(k)) byKey.set(k, rec);
          }
          const merged = Array.from(byKey.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          saveHistory(merged);
          return merged;
        });

        if (!silent) {
          notify('☁️ Database Peserta, Materi, Room & Riwayat berhasil disinkronkan!', 'success');
        }
        fetchPublicDirectory();
      } catch (err) {
        console.warn('Cloud sync error:', err);
        if (!silent) {
          notify('⚠️ Gagal menyinkronkan sebagian data cloud.', 'warning');
        }
      } finally {
        setIsSyncingCloud(false);
      }
    },
    [fetchPublicDirectory, fetchServerParticipantsList, firebaseUser, notify, uploadedMaterials]
  );

  // Restore participant session, admin session, public directory & server materials on mount
  useEffect(() => {
    fetchPublicDirectory();

    const storedPartToken = readStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY);
    if (storedPartToken) {
      participantTokenRef.current = storedPartToken;
    }
    fetch('/api/participants/me', {
      method: 'GET',
      credentials: 'include',
      headers: buildParticipantAuthHeaders(storedPartToken),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            ok?: boolean;
            sessionToken?: string;
            participant?: ParticipantRecord | null;
          } | null
        ) => {
          if (data?.ok && data.participant) {
            if (data.sessionToken) {
              participantTokenRef.current = data.sessionToken;
              writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, data.sessionToken);
            }
            const p = data.participant;
            setServerParticipant(p);
            if (p.displayName) setPlayerName(p.displayName);
            setParticipantMeta((prev) => ({
              username: p.username || prev.username,
              photoUrl: p.photoUrl || prev.photoUrl,
              school: p.school ?? prev.school,
              phone: p.phone ?? prev.phone,
              targetTrack: p.targetTrack ?? prev.targetTrack,
              targetCampus: p.targetCampus ?? prev.targetCampus,
              authMethod: p.authMethod || prev.authMethod || 'password',
              savedSkdSummary: p.savedSkdSummary ?? prev.savedSkdSummary,
            }));
          } else if (data?.ok && !data.participant) {
            participantTokenRef.current = '';
            writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, '');
          }
        }
      )
      .catch(() => {});

    const storedAdminToken = readStoredSessionToken(ADMIN_SESSION_TOKEN_KEY);
    if (storedAdminToken) {
      adminTokenRef.current = storedAdminToken;
    }
    fetch('/api/admin/me', {
      method: 'GET',
      credentials: 'include',
      headers: buildAdminAuthHeaders(storedAdminToken),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; isAdmin?: boolean; adminToken?: string } | null) => {
        if (data?.ok && data.isAdmin && data.adminToken) {
          adminTokenRef.current = data.adminToken;
          writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, data.adminToken);
          setAdminAuthenticated(true);
          setAdminNavUnlocked(true);
        } else if (data?.ok && !data.isAdmin && storedAdminToken) {
          adminTokenRef.current = '';
          writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, '');
        }
      })
      .catch(() => {});

    fetch('/api/materials', { method: 'GET', credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            ok?: boolean;
            materials?: StudyModule[];
            deletedIds?: string[];
            deletedRoomCodes?: string[];
          } | null
        ) => {
          if (!data?.ok) return;
          const nextDeletedIds = Array.from(
            new Set([...readDeletedMaterialIds(), ...(data.deletedIds || [])])
          );
          writeDeletedMaterialIds(nextDeletedIds);

          const nextDeletedRooms = Array.from(
            new Set([...readDeletedRoomCodes(), ...(data.deletedRoomCodes || [])])
          );
          writeDeletedRoomCodes(nextDeletedRooms);

          if (nextDeletedRooms.length > 0) {
            setRooms((prev) => {
              const filtered = mergeCloudAndPendingRooms({}, prev, nextDeletedRooms, DEFAULT_ROOM.code);
              saveRooms(filtered);
              return filtered;
            });
          }

          setUploadedMaterials((prev) => {
            const merged = mergeServerCloudAndLocalMaterials({
              serverMaterials: data.materials || [],
              cloudMaterials: [],
              localMaterials: prev,
              pendingLocalIds: prev.map((m) => m.id),
              deletedMaterialIds: nextDeletedIds,
            });
            try {
              localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // ignore quota
            }
            return merged;
          });
        }
      )
      .catch(() => {});
  }, []);

  // Initialize SHA-256 system password, test Firestore connection, consume redirect login, and listen to Firebase Auth
  useEffect(() => {
    ensureSystemPassword().then(setSystemPw);
    testFirestoreConnection();
    consumeGoogleRedirectResult()
      .then(async ({ user, role }) => {
        if (!user) return;
        if (role === 'admin' && isVerifiedAdminUser(user)) {
          setAdminAuthenticated(true);
          setAdminNavUnlocked(true);
          setView('admin');
          notify(`🛡️ Login Google Admin berhasil (${user.email})!`, 'success');
          await syncAdminCloudData(true);
        } else {
          const fallbackName = user.displayName || user.email?.split('@')[0] || 'Peserta';
          notify(`Berhasil masuk dengan Google sebagai ${fallbackName}.`, 'success');
        }
      })
      .catch(() => {});
    const unsub = onAuthChange(async (user) => {
      setFirebaseUser(user);
      setAuthHydrated(true);
      if (user && user.email) {
        markManualGoogleLogout(false);
        setGoogleAutoConnectStatus('connected');
        // Load participant's personal profile, avatar, quiz history, published Try Out rooms, and study materials
        const [profile, personalHist, cloudRooms, cloudMaterials] = await Promise.all([
          loadUserProfileFromFirestore(user.uid),
          listUserHistoryFromFirestore(user.uid),
          listRoomsFromFirestore().catch(() => ({} as Record<string, QuizRoom>)),
          listMaterialsFromFirestore().catch(() => [] as StudyModule[]),
        ]);
        const isEmailProvider = user.providerData.some((p) => p.providerId === 'password');
        const googlePhotoUrl = sanitizeParticipantPhotoUrl(user.photoURL);
        if (profile) {
          if (profile.displayName) {
            setPlayerName(profile.displayName);
          } else if (user.displayName) {
            setPlayerName((prev) => prev || user.displayName || '');
          }
          if (profile.avatar) setAvatar(profile.avatar);
          setParticipantMeta((prev) => ({
            username: profile.username || prev.username,
            photoUrl: profile.photoUrl || prev.photoUrl || googlePhotoUrl,
            school: profile.school ?? prev.school,
            phone: profile.phone ?? prev.phone,
            targetTrack: profile.targetTrack ?? prev.targetTrack,
            targetCampus: profile.targetCampus ?? prev.targetCampus,
            authMethod: profile.authMethod ?? (isEmailProvider ? 'email' : 'google'),
            savedSkdSummary: profile.savedSkdSummary ?? prev.savedSkdSummary,
          }));
        } else {
          if (user.displayName) {
            setPlayerName((prev) => prev || user.displayName || '');
          }
          setParticipantMeta((prev) => ({
            ...prev,
            photoUrl: prev.photoUrl || googlePhotoUrl,
            authMethod: isEmailProvider ? 'email' : 'google',
          }));
        }
        setUserHistory(personalHist);
        if (Object.keys(cloudRooms).length > 0) {
          setRooms((prev) => {
            const merged = mergeCloudAndPendingRooms(
              cloudRooms,
              prev,
              readDeletedRoomCodes(),
              DEFAULT_ROOM.code
            );
            saveRooms(merged);
            return merged;
          });
        }
        setUploadedMaterials((prev) => {
          const mergedMaterials = mergeCloudAndPendingMaterials(
            cloudMaterials,
            prev,
            readPendingLocalMaterialIds(),
            readDeletedMaterialIds()
          );
          try {
            localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(mergedMaterials));
          } catch {
            // ignore storage quota
          }
          return mergedMaterials;
        });
        // Sync Google user into Database Peserta so Admin & fellow participants can see/manage their photo
        try {
          const idToken = await user.getIdToken();
          const syncRes = await fetch('/api/participants/sync-google', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              displayName: profile?.displayName || user.displayName || user.email.split('@')[0],
              school: profile?.school ?? '',
              phone: profile?.phone ?? '',
              targetTrack: profile?.targetTrack ?? 'utbk',
              targetCampus: profile?.targetCampus ?? '',
              photoUrl: profile?.photoUrl || googlePhotoUrl || '',
            }),
          });
          if (syncRes.ok) {
            const syncJson = (await syncRes.json()) as {
              ok?: boolean;
              sessionToken?: string;
              participant?: ParticipantRecord;
            };
            if (syncJson.sessionToken) {
              participantTokenRef.current = syncJson.sessionToken;
              writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, syncJson.sessionToken);
            }
            if (syncJson.participant?.photoUrl) {
              setParticipantMeta((prev) => ({
                ...prev,
                photoUrl: syncJson.participant!.photoUrl || prev.photoUrl,
              }));
            }
            fetchPublicDirectory();
          }
        } catch {
          // ignore sync hiccup
        }
      } else {
        setUserHistory([]);
      }

      if (isVerifiedAdminUser(user) && user) {
        setAdminAuthenticated(true);
        setAdminNavUnlocked(true);
        try {
          const [sessionToken, idToken] = await Promise.all([
            fetchCsrfToken(),
            user.getIdToken(),
          ]);
          const authRes = await fetch('/api/admin/authorize', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Hafiz-Token': sessionToken,
            },
            body: JSON.stringify({ method: 'google', idToken }),
          });
          const authJson = (await authRes.json()) as { ok?: boolean; adminToken?: string };
          if (authRes.ok && authJson.adminToken) {
            adminTokenRef.current = authJson.adminToken;
            writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, authJson.adminToken);
          }
        } catch {
          // continue even if server token exchange failed
        }
        syncAdminCloudData(true);
      }
    });
    return () => unsub();
  }, [syncAdminCloudData]);

  // Automatically connect / prompt Google account (One Tap + auto_select) when entering web without active session
  useEffect(() => {
    if (!authHydrated) return;
    if (firebaseUser || serverParticipant) {
      setGoogleAutoConnectStatus('connected');
      return;
    }
    if (autoGoogleAttemptedRef.current) return;
    if (
      !shouldAttemptAutoGoogleConnect({
        hasCurrentUser: Boolean(firebaseUser || serverParticipant),
        manuallySignedOut: isManualGoogleLogoutActive(),
        clientId: GOOGLE_OAUTH_CLIENT_ID,
        isAutomatedBrowser: typeof navigator !== 'undefined' && Boolean(navigator.webdriver),
      })
    ) {
      setGoogleAutoConnectStatus('ready-manual');
      return;
    }

    autoGoogleAttemptedRef.current = true;
    let cancelled = false;
    setGoogleAutoConnectStatus('connecting');

    const timer = window.setTimeout(async () => {
      try {
        const gsi = await loadGoogleIdentityServices();
        if (cancelled) return;
        if (!gsi) {
          setGoogleAutoConnectStatus('ready-manual');
          return;
        }
        gsi.initialize({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          auto_select: true,
          cancel_on_tap_outside: false,
          itp_support: true,
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            if (!response?.credential || cancelled) return;
            try {
              const user = await signInWithGoogleIdToken(response.credential);
              markManualGoogleLogout(false);
              setGoogleAutoConnectStatus('connected');
              await finalizeGoogleUserRef.current(user);
            } catch {
              setGoogleAutoConnectStatus('ready-manual');
            }
          },
        });
        setGoogleAutoConnectStatus('prompted');
        gsi.prompt();
      } catch {
        if (!cancelled) {
          setGoogleAutoConnectStatus('ready-manual');
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authHydrated, firebaseUser, serverParticipant]);

  // Real-time web database sync for ALL visitors (rooms: Try Out, ASAS XII, Kuis & study materials)
  useEffect(() => {
    const unsubRooms = subscribeToAllRooms((cloudRooms) => {
      setRooms((prev) => {
        const merged = mergeCloudAndPendingRooms(
          cloudRooms,
          prev,
          readDeletedRoomCodes(),
          DEFAULT_ROOM.code
        );
        saveRooms(merged);
        return merged;
      });
    });
    const unsubMaterials = subscribeToAllMaterials((cloudMaterials) => {
      setUploadedMaterials((prev) => {
        const mergedMaterials = mergeCloudAndPendingMaterials(
          cloudMaterials,
          prev,
          readPendingLocalMaterialIds(),
          readDeletedMaterialIds()
        );
        try {
          localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(mergedMaterials));
        } catch {
          // ignore storage quota
        }
        return mergedMaterials;
      });
    });
    const unsubLive = subscribeToLiveSessions((cloudSessions) => {
      setLiveSessions(cloudSessions);
      try {
        localStorage.setItem('hafiz_live_sessions_v1', JSON.stringify(cloudSessions));
      } catch {
        // ignore
      }
    });
    return () => {
      unsubRooms();
      unsubMaterials();
      unsubLive();
    };
  }, []);

  // Apply User Web Settings (theme, accent, language, font scale, density, motion, contrast)
  useEffect(() => {
    applyUserWebSettingsToDom(webSettings);
    saveUserWebSettings(webSettings);
  }, [webSettings]);

  // Persist participant meta locally
  useEffect(() => {
    try {
      localStorage.setItem('hafiz_participant_meta_v1', JSON.stringify(participantMeta));
    } catch {
      // ignore storage quota
    }
  }, [participantMeta]);

  // Persist avatar, playerName & participant metadata locally + to participant's DB in Firestore
  useEffect(() => {
    saveAvatarConfig(avatar);
    if (firebaseUser && firebaseUser.email) {
      const timer = window.setTimeout(() => {
        saveUserProfileToFirestore(
          firebaseUser.uid,
          firebaseUser.email!,
          playerName || firebaseUser.displayName || 'Peserta',
          avatar,
          participantMeta
        );
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [avatar, playerName, participantMeta, firebaseUser]);

  useEffect(() => {
    savePlayerName(playerName);
  }, [playerName]);

  // Auto-fetch shared ?room=CODE from Cloud Firestore so everyone can view the room immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCode = (params.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!sharedCode) return;
    fetchRoomFromFirestore(sharedCode).then((cloudRoom) => {
      if (cloudRoom && cloudRoom.questions.length > 0) {
        setRooms((prev) => {
          const next = { ...prev, [sharedCode]: cloudRoom };
          saveRooms(next);
          return next;
        });
        setActiveRoomCode(sharedCode);
        setRoomCodeInput(sharedCode);
      }
    });
  }, []);

  // Real-time Firestore + Server lobby presence + Admin-controlled quiz start listener
  useEffect(() => {
    if (view !== 'lobby') {
      setFirestoreLobbyPlayers([]);
      setServerLobbyPlayers([]);
      return;
    }
    const roomCode = currentRoom.code;
    const playerId = activeParticipantUid;
    const displayName = playerName.trim() || serverParticipant?.displayName || firebaseUser?.displayName || 'Peserta';
    const localChar = findWardrobeItem(avatar.characterId, CHARACTER_ITEMS);
    const hasFirebaseAccount = Boolean(firebaseUser?.email);

    if (hasFirebaseAccount) {
      joinLobbyInFirestore(
        roomCode,
        playerId,
        displayName,
        avatar,
        localChar.name,
        activeParticipantPhotoUrl
      );
    }
    const unsubPlayers = hasFirebaseAccount
      ? subscribeToLobbyPlayers(roomCode, playerId, setFirestoreLobbyPlayers)
      : () => {};

    const unsubRoom = subscribeToRoomState(roomCode, (updatedRoom) => {
      setCurrentRoom(updatedRoom);
      if (
        updatedRoom.status === 'started' &&
        !canAdminStartQuiz({ isGoogleAdminVerified, adminAuthenticated })
      ) {
        startLobbyCountdownToQuiz();
      }
    });

    const syncServerLobby = async () => {
      try {
        await fetch(`/api/lobby/${encodeURIComponent(roomCode)}/players`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: playerId,
            name: displayName,
            avatar,
            avatarLabel: localChar.name,
            photoUrl: activeParticipantPhotoUrl || undefined,
          }),
        });
      } catch {
        // ignore network hiccup
      }
      try {
        const [playersRes, statusRes] = await Promise.all([
          fetch(`/api/lobby/${encodeURIComponent(roomCode)}/players`, { credentials: 'same-origin' }),
          fetch(`/api/room-status/${encodeURIComponent(roomCode)}`, { credentials: 'same-origin' }),
        ]);
        if (playersRes.ok) {
          const pData = (await playersRes.json()) as {
            ok?: boolean;
            players?: Array<{
              id: string;
              name: string;
              avatar: AvatarConfig;
              avatarLabel: string;
              photoUrl?: string;
            }>;
          };
          if (Array.isArray(pData.players)) {
            setServerLobbyPlayers(
              pData.players
                .filter((p) => p.id !== playerId)
                .map((p) => ({
                  id: p.id,
                  name: p.name,
                  isLocal: false,
                  avatar: p.avatar,
                  avatarLabel: p.avatarLabel,
                  photoUrl: p.photoUrl,
                }))
            );
          }
        }
        if (statusRes.ok) {
          const sData = (await statusRes.json()) as { ok?: boolean; status?: 'waiting' | 'started' };
          if (
            sData.status === 'started' &&
            !canAdminStartQuiz({ isGoogleAdminVerified, adminAuthenticated })
          ) {
            setCurrentRoom((prev) => ({ ...prev, status: 'started' }));
            startLobbyCountdownToQuiz();
          }
        }
      } catch {
        // ignore transient poll error
      }
    };

    syncServerLobby();
    const pollInterval = window.setInterval(syncServerLobby, 2500);

    const handleBeforeUnload = () => {
      if (hasFirebaseAccount) {
        leaveLobbyInFirestore(roomCode, playerId);
      }
      fetch(`/api/lobby/${encodeURIComponent(roomCode)}/players`, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId, leave: true }),
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearInterval(pollInterval);
      unsubPlayers();
      unsubRoom();
      if (hasFirebaseAccount) {
        leaveLobbyInFirestore(roomCode, playerId);
      }
      fetch(`/api/lobby/${encodeURIComponent(roomCode)}/players`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId, leave: true }),
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentRoom.code, activeParticipantUid, firebaseUser?.email]);

  // Sync local avatar wardrobe changes live to other players in the same lobby
  useEffect(() => {
    if (view !== 'lobby') return;
    const localChar = findWardrobeItem(avatar.characterId, CHARACTER_ITEMS);
    const displayName =
      playerName.trim() || serverParticipant?.displayName || firebaseUser?.displayName || 'Peserta';
    if (firebaseUser?.email) {
      updateLobbyPlayerInFirestore(
        currentRoom.code,
        firebaseUser.uid,
        displayName,
        avatar,
        localChar.name,
        activeParticipantPhotoUrl
      );
    }
    fetch(`/api/lobby/${encodeURIComponent(currentRoom.code)}/players`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeParticipantUid,
        name: displayName,
        avatar,
        avatarLabel: localChar.name,
        photoUrl: activeParticipantPhotoUrl || undefined,
      }),
    }).catch(() => {});
  }, [
    view,
    currentRoom.code,
    avatar,
    playerName,
    firebaseUser,
    serverParticipant?.displayName,
    activeParticipantUid,
    activeParticipantPhotoUrl,
  ]);

  // Real-time shared room leaderboard visible to ALL participants during quiz & results
  useEffect(() => {
    if ((view !== 'quiz' && view !== 'results') || !firebaseUser?.email) {
      return;
    }
    const unsub = subscribeToRoomLeaderboard(
      currentRoom.code,
      firebaseUser.uid,
      setRoomLeaderboardRaw
    );
    return () => unsub();
  }, [view, currentRoom.code, firebaseUser?.uid, firebaseUser?.email]);

  const liveRankedLeaderboard = useMemo(() => {
    const uid = firebaseUser?.uid || 'current-user';
    const hasMe = roomLeaderboardRaw.some((e) => e.id === uid || e.isCurrentUser);
    const total = Math.max(1, currentRoom.questions.length);
    const merged: LeaderboardEntry[] = hasMe
      ? roomLeaderboardRaw
      : [
          ...roomLeaderboardRaw,
          {
            id: uid,
            name: playerName.trim() || firebaseUser?.displayName || 'Peserta',
            grade: calculateGrade(correctCount, total),
            points: score,
            correctCount,
            totalQuestions: total,
            answeredCount: view === 'results' ? total : Object.keys(answersByIndex).length,
            cheatCount,
            status: view === 'results' ? 'finished' : 'playing',
            isCurrentUser: true,
            timestamp: new Date().toISOString(),
          },
        ];
    const resolvePhotoForEntry = (uid: string, name: string): string | undefined => {
      if (uid === activeParticipantUid && activeParticipantPhotoUrl) {
        return activeParticipantPhotoUrl;
      }
      const dirMatch =
        publicDirectory.find((p) => p.uid === uid && p.photoUrl) ||
        publicDirectory.find(
          (p) => p.photoUrl && p.displayName.trim().toLowerCase() === name.trim().toLowerCase()
        );
      if (dirMatch?.photoUrl) return dirMatch.photoUrl;
      const lobbyMatch =
        firestoreLobbyPlayers.find((p) => p.id === uid && p.photoUrl) ||
        serverLobbyPlayers.find((p) => p.id === uid && p.photoUrl);
      return lobbyMatch?.photoUrl || undefined;
    };

    const enriched = merged.map((entry) => ({
      ...entry,
      photoUrl: entry.photoUrl || resolvePhotoForEntry(entry.id, entry.name),
    }));

    return rankLeaderboard(enriched);
  }, [
    roomLeaderboardRaw,
    firebaseUser?.uid,
    firebaseUser?.displayName,
    playerName,
    correctCount,
    currentRoom.questions.length,
    score,
    view,
    answersByIndex,
    cheatCount,
    activeParticipantUid,
    activeParticipantPhotoUrl,
    publicDirectory,
    firestoreLobbyPlayers,
    serverLobbyPlayers,
  ]);

  const activeSavedRoom = rooms[activeRoomCode] ?? rooms[DEFAULT_ROOM.code] ?? DEFAULT_ROOM;

  const lobbyPlayers: LobbyPlayer[] = useMemo(() => {
    const localChar = findWardrobeItem(avatar.characterId, CHARACTER_ITEMS);
    const localEntry: LobbyPlayer = {
      id: activeParticipantUid,
      name: playerName.trim() || 'Peserta',
      isLocal: true,
      avatar,
      avatarLabel: localChar.name,
      photoUrl: activeParticipantPhotoUrl || undefined,
    };
    const mergedMap = new Map<string, LobbyPlayer>();
    const enrichPhoto = (p: LobbyPlayer): LobbyPlayer => {
      if (p.photoUrl) return p;
      const dir =
        publicDirectory.find((d) => d.uid === p.id && d.photoUrl) ||
        publicDirectory.find(
          (d) => d.photoUrl && d.displayName.trim().toLowerCase() === p.name.trim().toLowerCase()
        );
      return dir?.photoUrl ? { ...p, photoUrl: dir.photoUrl } : p;
    };
    for (const p of firestoreLobbyPlayers) {
      if (p.id !== activeParticipantUid) mergedMap.set(p.id, enrichPhoto(p));
    }
    for (const sp of serverLobbyPlayers) {
      if (sp.id !== activeParticipantUid && !mergedMap.has(sp.id)) {
        mergedMap.set(sp.id, enrichPhoto(sp));
      }
    }
    return [localEntry, ...Array.from(mergedMap.values())];
  }, [
    activeParticipantPhotoUrl,
    activeParticipantUid,
    avatar,
    firestoreLobbyPlayers,
    playerName,
    publicDirectory,
    serverLobbyPlayers,
  ]);

  // 5x secret brand click handler
  const handleBrandClick = () => {
    const now = Date.now();
    if (now - secretClicksRef.current.lastTime > 1800) {
      secretClicksRef.current.count = 1;
    } else {
      secretClicksRef.current.count += 1;
    }
    secretClicksRef.current.lastTime = now;

    if (secretClicksRef.current.count >= 5) {
      secretClicksRef.current.count = 0;
      setAdminNavUnlocked((prev) => {
        const next = !prev;
        notify(
          next
            ? '🛡️ Portal Admin dibuka di bilah navigasi (klik logo 5x lagi untuk menyembunyikan).'
            : '🔒 Menu Admin disembunyikan dari tampilan.',
          next ? 'success' : 'info'
        );
        return next;
      });
    } else if (view !== 'landing') {
      setView('landing');
    }
  };

  // Subscribe to live public site settings (Admin web updates)
  useEffect(() => {
    const unsub = subscribeToSiteSettings((next) => {
      setSiteSettings(next);
      document.title = `${next.brandName} – Bimbel UTBK, Kedinasan & Kuis Interaktif`;
    });
    return () => unsub();
  }, []);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        window.clearTimeout(countdownTimerRef.current);
      }
    };
  }, []);

  const playCountdownTone = useCallback(
    (isGo: boolean, num?: number) => {
      if (!webSettings.soundEffects) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = isGo ? 'triangle' : 'sine';
        osc.frequency.value = isGo ? 880 : num !== undefined && num <= 3 ? 660 : 440;
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isGo ? 0.55 : 0.18));
        osc.start();
        osc.stop(ctx.currentTime + (isGo ? 0.56 : 0.2));
        window.setTimeout(() => {
          ctx.close().catch(() => {});
        }, 700);
      } catch {
        // Audio playback blocked by browser autoplay policy
      }
    },
    [webSettings.soundEffects]
  );

  const startLobbyCountdownToQuiz = useCallback(() => {
    if (countdownTimerRef.current !== null) return;
    let current = 10;
    setCountdownValue(current);
    playCountdownTone(false, current);

    const step = () => {
      if (current > 0) {
        current -= 1;
        setCountdownValue(current);
        playCountdownTone(false, current);
        countdownTimerRef.current = window.setTimeout(step, 1000);
      } else {
        setCountdownValue('go');
        playCountdownTone(true);
        if (webSettings.confettiEnabled) {
          confetti({ particleCount: 95, spread: 85, origin: { y: 0.55 } });
        }
        countdownTimerRef.current = window.setTimeout(() => {
          countdownTimerRef.current = null;
          setCountdownValue(null);
          setQIndex(0);
          setScore(0);
          setStreak(0);
          setCorrectCount(0);
          setCheatCount(0);
          setPowerup5050Used(false);
          setAnswersByIndex({});
          setHiddenChoicesByIndex({});
          setFlaggedIndices([]);
          setView('quiz');
          notify('🚀 LET\'S GO! Selamat mengerjakan kuis dengan jujur!', 'success');
        }, 1150);
      }
    };

    countdownTimerRef.current = window.setTimeout(step, 1000);
  }, [notify, playCountdownTone, webSettings.confettiEnabled]);

  const handleSaveSiteSettings = async (next: SiteSettings) => {
    setSiteSettings(next);
    try {
      localStorage.setItem('hafiz_edu_site_settings_v1', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    document.title = `${next.brandName} – Bimbel UTBK, Kedinasan & Kuis Interaktif`;
    if (isGoogleAdminVerified) {
      try {
        await saveSiteSettingsToFirestore(next);
        notify('🌐 Update web berhasil dipublikasikan ke seluruh pengunjung secara live!', 'success');
      } catch {
        notify('⚠️ Gagal menyimpan ke Cloud. Pastikan login Google Admin aktif.', 'error');
      }
    } else {
      notify('🌐 Pengaturan situs tersimpan di perangkat ini! Login Google Admin untuk publikasi live ke semua pengunjung.', 'info');
    }
  };

  const handleRandomizeAvatar = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const next: AvatarConfig = {
      characterId: pick(CHARACTER_ITEMS).id,
      skinColor: pick(SKIN_SWATCHES).hex,
      hairId: pick(HAIR_ITEMS).id,
      topId: pick(TOP_ITEMS).id,
      bottomId: pick(BOTTOM_ITEMS).id,
      shoeId: pick(SHOE_ITEMS).id,
      accessoryId: pick(ACCESSORY_ITEMS).id,
    };
    setAvatar(next);
    notify('🎲 Gaya avatar kamu diacak!', 'info');
  };

  const enterLobbyForRoom = (room: QuizRoom, displayName: string) => {
    const cleanRoom = normalizeRoomForLobbyEntry(room);
    setCurrentRoom(cleanRoom);
    setQIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setCheatCount(0);
    setPowerup5050Used(false);
    setAnswersByIndex({});
    setHiddenChoicesByIndex({});
    setFlaggedIndices([]);
    setLobbyChat([
      {
        id: 'sys-welcome',
        sender: 'Sistem',
        text: `Selamat datang ${displayName} di Lobi Kuis (${cleanRoom.code})! Menunggu Admin menekan tombol Mulai Kuis.`,
        isSystem: true,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setView('lobby');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenParticipantAuth = (mode: 'register' | 'login' | 'profile' = 'register') => {
    setGoogleRecoveryMessage('');
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const finalizeParticipantGoogleUser = async (user: User) => {
    if (isVerifiedAdminUser(user)) {
      setAdminAuthenticated(true);
      setAdminNavUnlocked(true);
    }
    const existingProfile = user.uid ? await loadUserProfileFromFirestore(user.uid) : null;
    const resolvedName =
      existingProfile?.displayName ||
      playerName.trim() ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'Peserta';
    const resolvedPhoto =
      existingProfile?.photoUrl ||
      participantMeta.photoUrl ||
      sanitizeParticipantPhotoUrl(user.photoURL);
    const nextMeta = {
      ...participantMeta,
      photoUrl: resolvedPhoto,
      school: existingProfile?.school ?? participantMeta.school,
      phone: existingProfile?.phone ?? participantMeta.phone,
      targetTrack: existingProfile?.targetTrack ?? participantMeta.targetTrack,
      targetCampus: existingProfile?.targetCampus ?? participantMeta.targetCampus,
      savedSkdSummary: existingProfile?.savedSkdSummary ?? participantMeta.savedSkdSummary,
      authMethod: 'google' as const,
    };
    setPlayerName(resolvedName);
    setParticipantMeta(nextMeta);
    if (user.email) {
      await saveUserProfileToFirestore(
        user.uid,
        user.email,
        resolvedName,
        existingProfile?.avatar || avatar,
        nextMeta
      );
    }
    setGoogleRecoveryMessage('');
    setAuthModalOpen(false);
    notify(`Berhasil masuk dengan Google sebagai ${resolvedName}.`, 'success');
  };

  finalizeGoogleUserRef.current = finalizeParticipantGoogleUser;

  const handleParticipantLogin = async () => {
    markManualGoogleLogout(false);
    const flow = await signInWithGoogleSmart('participant');
    if (flow.status === 'success') {
      setGoogleAutoConnectStatus('connected');
      await finalizeParticipantGoogleUser(flow.user);
      return;
    }
    if (flow.status === 'redirecting') {
      notify('Mengalihkan ke halaman login Google tanpa pop-up...', 'info');
      return;
    }
    setGoogleRecoveryMessage(flow.reason.userMessage);
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handlePasswordRegister = async (params: {
    displayName: string;
    username: string;
    password: string;
    school: string;
    phone: string;
    targetTrack: ParticipantTargetTrack;
    targetCampus: string;
    photoDataUrl?: string;
  }) => {
    const token = await fetchCsrfToken();
    const res = await fetch('/api/participants/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Hafiz-Token': token,
      },
      body: JSON.stringify({
        displayName: params.displayName,
        username: params.username,
        password: params.password,
        school: params.school,
        phone: params.phone,
        targetTrack: params.targetTrack,
        targetCampus: params.targetCampus,
        photoDataUrl: params.photoDataUrl,
        avatar,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      sessionToken?: string;
      participant?: ParticipantRecord;
    };
    if (!res.ok || !data.ok || !data.participant) {
      throw new Error(data.error || 'Gagal membuat akun peserta.');
    }
    if (data.sessionToken) {
      participantTokenRef.current = data.sessionToken;
      writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, data.sessionToken);
    }
    const created = data.participant;
    setServerParticipant(created);
    setPlayerName(created.displayName);
    setParticipantMeta({
      username: created.username || '',
      photoUrl: created.photoUrl || '',
      school: created.school || '',
      phone: created.phone || '',
      targetTrack: created.targetTrack || 'utbk',
      targetCampus: created.targetCampus || '',
      authMethod: 'password',
      savedSkdSummary: participantMeta.savedSkdSummary,
    });
    setParticipants((prev) => [created, ...prev.filter((p) => p.uid !== created.uid)]);
    fetchPublicDirectory();
    setAuthModalOpen(false);
    notify(
      `🎉 Akun ${created.displayName} (@${created.username}) berhasil dibuat & masuk ke Database Peserta!`,
      'success'
    );
  };

  const handlePasswordLogin = async (params: { identifier: string; password: string }) => {
    const token = await fetchCsrfToken();
    const res = await fetch('/api/participants/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Hafiz-Token': token,
      },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      sessionToken?: string;
      participant?: ParticipantRecord;
    };
    if (!res.ok || !data.ok || !data.participant) {
      throw new Error(data.error || 'Nama/Username atau kata sandi salah.');
    }
    if (data.sessionToken) {
      participantTokenRef.current = data.sessionToken;
      writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, data.sessionToken);
    }
    const logged = data.participant;
    setServerParticipant(logged);
    setPlayerName(logged.displayName);
    setParticipantMeta((prev) => ({
      username: logged.username || '',
      photoUrl: logged.photoUrl || '',
      school: logged.school || '',
      phone: logged.phone || '',
      targetTrack: logged.targetTrack || 'utbk',
      targetCampus: logged.targetCampus || '',
      authMethod: 'password',
      savedSkdSummary: logged.savedSkdSummary ?? prev.savedSkdSummary,
    }));
    setAuthModalOpen(false);
    notify(`✅ Berhasil masuk sebagai ${logged.displayName}!`, 'success');
  };

  const handleSaveParticipantProfile = async (profile: {
    displayName: string;
    school: string;
    phone: string;
    targetTrack: ParticipantTargetTrack;
    targetCampus: string;
    photoDataUrl?: string;
  }) => {
    let nextPhotoUrl = participantMeta.photoUrl || '';

    if (serverParticipant) {
      const headers = buildParticipantAuthHeaders(participantTokenRef.current, {
        'Content-Type': 'application/json',
      });
      const res = await fetch('/api/participants/profile', {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          displayName: profile.displayName,
          school: profile.school,
          phone: profile.phone,
          targetTrack: profile.targetTrack,
          targetCampus: profile.targetCampus,
          photoDataUrl:
            profile.photoDataUrl && profile.photoDataUrl.startsWith('data:image/')
              ? profile.photoDataUrl
              : undefined,
          avatar,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        participant?: ParticipantRecord;
      };
      if (!res.ok || !data.ok || !data.participant) {
        throw new Error(data.error || 'Gagal memperbarui profil peserta.');
      }
      setServerParticipant(data.participant);
      nextPhotoUrl = data.participant.photoUrl || nextPhotoUrl;
      setParticipants((prev) =>
        prev.map((item) => (item.uid === data.participant!.uid ? data.participant! : item))
      );
    } else if (profile.photoDataUrl) {
      nextPhotoUrl = profile.photoDataUrl;
    }

    const nextMeta = {
      ...participantMeta,
      photoUrl: nextPhotoUrl,
      school: profile.school,
      phone: profile.phone,
      targetTrack: profile.targetTrack,
      targetCampus: profile.targetCampus,
    };
    setPlayerName(profile.displayName);
    setParticipantMeta(nextMeta);
    if (firebaseUser && firebaseUser.email) {
      await saveUserProfileToFirestore(
        firebaseUser.uid,
        firebaseUser.email,
        profile.displayName,
        avatar,
        nextMeta
      );
      try {
        const idToken = await firebaseUser.getIdToken();
        const syncRes = await fetch('/api/participants/sync-google', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            displayName: profile.displayName,
            school: profile.school,
            phone: profile.phone,
            targetTrack: profile.targetTrack,
            targetCampus: profile.targetCampus,
            photoDataUrl:
              profile.photoDataUrl && profile.photoDataUrl.startsWith('data:image/')
                ? profile.photoDataUrl
                : undefined,
            photoUrl: nextPhotoUrl && !nextPhotoUrl.startsWith('data:image/') ? nextPhotoUrl : undefined,
          }),
        });
        if (syncRes.ok) {
          const syncJson = (await syncRes.json()) as {
            sessionToken?: string;
            participant?: ParticipantRecord;
          };
          if (syncJson.sessionToken) {
            participantTokenRef.current = syncJson.sessionToken;
            writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, syncJson.sessionToken);
          }
          if (syncJson.participant?.photoUrl) {
            setParticipantMeta((prev) => ({ ...prev, photoUrl: syncJson.participant!.photoUrl }));
          }
        }
      } catch {
        // ignore server sync error
      }
    }
    fetchPublicDirectory();
    notify('💾 Profil & foto peserta berhasil disimpan ke Database Peserta!', 'success');
  };

  const handleAdminUpsertParticipant = async (payload: {
    uid?: string;
    displayName: string;
    username?: string;
    password?: string;
    school?: string;
    phone?: string;
    targetTrack?: ParticipantTargetTrack;
    targetCampus?: string;
    photoDataUrl?: string;
    clearPhoto?: boolean;
  }) => {
    const existing = payload.uid ? participants.find((p) => p.uid === payload.uid) : undefined;
    let savedRecord: ParticipantRecord | null = null;

    if (adminTokenRef.current) {
      const res = await fetch('/api/participants/admin-upsert', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Hafiz-Admin-Token': adminTokenRef.current,
        },
        body: JSON.stringify({
          ...payload,
          email: existing?.email,
          authMethod: existing?.authMethod || 'password',
          photoUrl:
            !payload.clearPhoto && payload.photoDataUrl && !payload.photoDataUrl.startsWith('data:image/')
              ? payload.photoDataUrl
              : undefined,
          photoDataUrl:
            !payload.clearPhoto && payload.photoDataUrl && payload.photoDataUrl.startsWith('data:image/')
              ? payload.photoDataUrl
              : undefined,
          clearPhoto: Boolean(payload.clearPhoto),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        participant?: ParticipantRecord;
      };
      if (!res.ok || !data.ok || !data.participant) {
        notify(data.error || 'Gagal menyimpan data & foto peserta.', 'error');
        return;
      }
      savedRecord = data.participant;
    } else {
      const fallbackUid =
        payload.uid || `part-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      savedRecord = {
        uid: fallbackUid,
        username: payload.username || existing?.username,
        email: existing?.email || `${fallbackUid}@peserta.hafizeducation.my.id`,
        displayName: payload.displayName,
        photoUrl: payload.clearPhoto ? '' : payload.photoDataUrl || existing?.photoUrl,
        school: payload.school || '',
        phone: payload.phone || '',
        targetTrack: payload.targetTrack || 'utbk',
        targetCampus: payload.targetCampus || '',
        authMethod: existing?.authMethod || 'password',
        updatedAt: new Date().toISOString(),
      };
    }

    if (savedRecord) {
      if (isGoogleAdminVerified) {
        await adminUpsertParticipantToFirestore(savedRecord, avatar);
      }
      setParticipants((prev) => [
        savedRecord!,
        ...prev.filter((item) => item.uid !== savedRecord!.uid),
      ]);
      if (serverParticipant && serverParticipant.uid === savedRecord.uid) {
        setServerParticipant(savedRecord);
        setPlayerName(savedRecord.displayName);
        setParticipantMeta((prev) => ({
          ...prev,
          username: savedRecord!.username || prev.username,
          photoUrl: savedRecord!.photoUrl ?? '',
          school: savedRecord!.school ?? prev.school,
          phone: savedRecord!.phone ?? prev.phone,
          targetTrack: savedRecord!.targetTrack ?? prev.targetTrack,
          targetCampus: savedRecord!.targetCampus ?? prev.targetCampus,
        }));
      } else if (firebaseUser && firebaseUser.uid === savedRecord.uid) {
        setParticipantMeta((prev) => ({
          ...prev,
          photoUrl: savedRecord!.photoUrl ?? '',
        }));
      }
      fetchPublicDirectory();
      notify(`✅ Profil & foto "${savedRecord.displayName}" tersimpan di Database Peserta!`, 'success');
    }
  };

  const handleSaveSkdToProfile = async (summary: SavedSkdSummary) => {
    const nextMeta = {
      ...participantMeta,
      savedSkdSummary: summary,
    };
    setParticipantMeta(nextMeta);
    if (serverParticipant) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (participantTokenRef.current) {
        headers['X-Hafiz-Participant-Token'] = participantTokenRef.current;
      }
      await fetch('/api/participants/profile', {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ savedSkdSummary: summary }),
      }).catch(() => {});
    }
    if (firebaseUser && firebaseUser.email) {
      await saveUserProfileToFirestore(
        firebaseUser.uid,
        firebaseUser.email,
        playerName || firebaseUser.displayName || 'Peserta',
        avatar,
        nextMeta
      );
    }
    if (serverParticipant || firebaseUser?.email) {
      notify(
        `💾 Skor SKD ${summary.total}/550 (${summary.recommendedSchool || 'Kedinasan'}) tersimpan di Database Peserta!`,
        'success'
      );
    } else {
      notify(
        `💾 Skor SKD ${summary.total}/550 tersimpan di perangkat ini. Buat akun peserta untuk sinkronisasi permanen!`,
        'info'
      );
    }
  };

  const handleParticipantLogout = async () => {
    markManualGoogleLogout(true);
    setGoogleAutoConnectStatus('ready-manual');
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.google?.accounts?.id?.cancel?.();
    } catch {
      // ignore GIS cleanup
    }
    try {
      await Promise.all([
        fetch('/api/participants/logout', { method: 'POST', credentials: 'include' }),
        fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }),
      ]);
    } catch {
      // ignore network error
    }
    try {
      await signOutAdmin();
    } catch {
      // continue local cleanup even if network signOut is slow
    }
    participantTokenRef.current = '';
    writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, '');
    setServerParticipant(null);
    setAdminAuthenticated(false);
    setAdminNavUnlocked(false);
    adminTokenRef.current = '';
    writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, '');
    setUserHistory([]);
    setParticipantMeta({
      username: '',
      photoUrl: '',
      school: '',
      phone: '',
      targetTrack: 'utbk',
      targetCampus: '',
      authMethod: 'password',
    });
    if (view === 'admin' || view === 'lobby' || view === 'quiz') {
      setView('landing');
    }
    notify('🚪 Anda telah keluar dari akun.', 'info');
  };

  const handleJoinRoom = async () => {
    const isAdminUser = canAdminStartQuiz({ isGoogleAdminVerified, adminAuthenticated });
    if (!activeParticipantIdentity && !isAdminUser) {
      setAuthModalMode('register');
      setAuthModalOpen(true);
      notify(
        '🔐 Silakan Buat Akun atau Masuk sebagai Peserta terlebih dahulu sebelum bergabung ke room!',
        'warning'
      );
      return;
    }
    const cleanName = (playerName.trim() || (isAdminUser ? 'Admin' : '')).slice(0, 60);
    const cleanCode = roomCodeInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanName) {
      notify('Silakan isi Nama Lengkap Peserta terlebih dahulu.', 'warning');
      return;
    }
    if (!cleanCode) {
      notify('Silakan masukkan Kode Room Kuis (atau klik Pakai Kode di bawah).', 'warning');
      return;
    }
    let found: QuizRoom | undefined = rooms[cleanCode];
    const cloudRoom = await fetchRoomFromFirestore(cleanCode);
    if (cloudRoom && cloudRoom.questions.length > 0) {
      found = cloudRoom;
      setRooms((prev) => {
        const next = { ...prev, [cleanCode]: cloudRoom };
        saveRooms(next);
        return next;
      });
    }
    if (!found) {
      notify(`Kode Room "${cleanCode}" tidak ditemukan. Coba gunakan ${activeSavedRoom.code}.`, 'error');
      return;
    }
    const schedule = getQuizScheduleStatus(found.openAt, Date.now(), found.closeAt);
    if (schedule.isLocked && !isGoogleAdminVerified && !adminAuthenticated) {
      notify(
        schedule.isClosed
          ? `⛔ Kuis "${found.title}" sudah ditutup pada ${schedule.formattedCloseDate}.`
          : `🔒 Kuis "${found.title}" belum dibuka! Jadwal buka: ${schedule.formattedDate} (${schedule.countdownLabel}).`,
        'warning'
      );
      return;
    }
    if (schedule.isLocked && (isGoogleAdminVerified || adminAuthenticated)) {
      notify(
        schedule.isClosed
          ? `👁️ Mode Preview Admin: Kuis ini berstatus DITUTUP sejak ${schedule.formattedCloseDate}.`
          : `👁️ Mode Preview Admin: Kuis ini terkunci bagi peserta hingga ${schedule.formattedDate}.`,
        'info'
      );
    }
    enterLobbyForRoom(found, cleanName);
  };

  const handlePreviewLobbyDemo = () => {
    const name = playerName.trim() || firebaseUser?.displayName || 'Peserta';
    if (!playerName.trim()) setPlayerName(name);
    enterLobbyForRoom(activeSavedRoom, name);
  };

  const handleSendLobbyChat = (text: string) => {
    const sender = playerName.trim() || 'Peserta';
    setLobbyChat((prev) => [
      ...prev.slice(-30),
      {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sender,
        text,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Start Quiz (Strictly Admin-only)
  const handleAdminStartQuiz = async () => {
    if (!canAdminStartQuiz({ isGoogleAdminVerified, adminAuthenticated })) {
      notify('⏳ Hanya Admin yang dapat memulai kuis. Silakan tunggu di lobi.', 'warning');
      return;
    }
    if (!currentRoom.questions.length) {
      notify('Room ini belum memiliki soal.', 'error');
      return;
    }
    const startedRoom: QuizRoom = { ...currentRoom, status: 'started' };
    setCurrentRoom(startedRoom);
    setRooms((prev) => {
      const next = { ...prev, [startedRoom.code]: startedRoom };
      saveRooms(next);
      return next;
    });
    if (studioCode === startedRoom.code) {
      setStudioRoomStatus('started');
    }

    if (adminTokenRef.current) {
      fetch(`/api/room-status/${encodeURIComponent(startedRoom.code)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Hafiz-Admin-Token': adminTokenRef.current,
        },
        body: JSON.stringify({ status: 'started' }),
      }).catch(() => {});
    }

    if (isGoogleAdminVerified && firebaseUser) {
      try {
        await setRoomStatusInFirestore(startedRoom.code, 'started');
      } catch {
        try {
          await saveRoomToFirestore(startedRoom, firebaseUser.uid);
        } catch {
          // Local fallback if network offline
        }
      }
    }
    notify('⏳ Hitungan mundur 10 detik dimulai untuk semua peserta di Lobi!', 'success');
    startLobbyCountdownToQuiz();
  };

  const handleToggleStudioRoomStart = async (
    nextStatus: 'waiting' | 'started',
    targetRoom?: QuizRoom
  ) => {
    if (!canAdminStartQuiz({ isGoogleAdminVerified, adminAuthenticated })) {
      notify('🔒 Hanya Admin yang dapat mengubah status mulai kuis.', 'warning');
      return;
    }
    const targetCode = targetRoom?.code || studioCode;
    if (targetCode === studioCode) {
      setStudioRoomStatus(nextStatus);
    }
    const baseRoom =
      targetRoom || rooms[targetCode] || (currentRoom.code === targetCode ? currentRoom : undefined);
    if (baseRoom) {
      const updatedRoom: QuizRoom = { ...baseRoom, status: nextStatus };
      setRooms((prev) => {
        const next = { ...prev, [targetCode]: updatedRoom };
        saveRooms(next);
        return next;
      });
      if (currentRoom.code === targetCode) {
        setCurrentRoom(updatedRoom);
      }
    }
    if (adminTokenRef.current) {
      await fetch(`/api/room-status/${encodeURIComponent(targetCode)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Hafiz-Admin-Token': adminTokenRef.current,
        },
        body: JSON.stringify({ status: nextStatus }),
      }).catch(() => {});
    }
    if (isGoogleAdminVerified && firebaseUser) {
      try {
        await setRoomStatusInFirestore(targetCode, nextStatus);
        notify(
          nextStatus === 'started'
            ? `🚀 Kuis Room ${targetCode} DIMULAI! Semua peserta di lobi otomatis masuk arena soal.`
            : `⏸️ Room ${targetCode} dikembalikan ke mode Lobi Menunggu.`,
          'success'
        );
      } catch {
        if (baseRoom && baseRoom.questions.length > 0) {
          try {
            await saveRoomToFirestore({ ...baseRoom, status: nextStatus }, firebaseUser.uid);
            notify(
              nextStatus === 'started'
                ? `🚀 Kuis Room ${targetCode} DIMULAI untuk semua peserta!`
                : `⏸️ Room ${targetCode} diset ke Lobi Menunggu.`,
              'success'
            );
            return;
          } catch {
            // fall through
          }
        }
        notify('⚠️ Pastikan Room sudah diterbitkan ke Cloud sebelum memulai.', 'warning');
      }
    } else {
      notify(
        nextStatus === 'started'
          ? `🚀 Room ${targetCode} DIMULAI! Peserta di lobi otomatis masuk ke arena soal.`
          : `⏸️ Room ${targetCode} dikembalikan ke Lobi Menunggu.`,
        'success'
      );
    }
  };

  const handleCheatDetected = useCallback(
    (reason: string) => {
      setCheatCount((prev) => {
        const nextCount = prev + 1;
        if (firebaseUser?.email) {
          const total = Math.max(1, currentRoom.questions.length);
          upsertRoomLeaderboardScore(currentRoom.code, firebaseUser.uid, {
            name: playerName.trim() || firebaseUser.displayName || 'Peserta',
            points: score,
            grade: calculateGrade(correctCount, total),
            correctCount,
            totalQuestions: total,
            answeredCount: Object.keys(answersByIndex).length,
            cheatCount: nextCount,
            status: 'playing',
          });
        }
        return nextCount;
      });
      notify(`🚨 Peringatan Anti-Curang: ${reason}`, 'error');
    },
    [
      firebaseUser,
      currentRoom.code,
      currentRoom.questions.length,
      playerName,
      score,
      correctCount,
      answersByIndex,
      notify,
    ]
  );

  const handleSelectChoice = (idx: number) => {
    if (answersByIndex[qIndex] !== undefined) return;
    const q = currentRoom.questions[qIndex];
    const isCorrect = idx === q.correctIndex;
    const nextAnswers = { ...answersByIndex, [qIndex]: idx };
    setAnswersByIndex(nextAnswers);
    setFlaggedIndices((prev) => prev.filter((i) => i !== qIndex));

    const { pointsAdded, nextStreak } = calculateAnswerPoints(isCorrect, streak);
    const nextScore = score + pointsAdded;
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    setScore(nextScore);
    setStreak(nextStreak);
    if (isCorrect) {
      setCorrectCount(nextCorrect);
    }

    if (firebaseUser?.email) {
      const total = Math.max(1, currentRoom.questions.length);
      upsertRoomLeaderboardScore(currentRoom.code, firebaseUser.uid, {
        name: playerName.trim() || firebaseUser.displayName || 'Peserta',
        points: nextScore,
        grade: calculateGrade(nextCorrect, total),
        correctCount: nextCorrect,
        totalQuestions: total,
        answeredCount: Object.keys(nextAnswers).length,
        cheatCount,
        status: 'playing',
      });
    }
  };

  const handleUse5050 = () => {
    if (powerup5050Used || answersByIndex[qIndex] !== undefined) return;
    const q = currentRoom.questions[qIndex];
    const toHide = compute5050HiddenIndices(q.choices.length, q.correctIndex);
    setHiddenChoicesByIndex((prev) => ({ ...prev, [qIndex]: toHide }));
    setPowerup5050Used(true);
    notify('⚡ Bantuan 50:50 aktif! Opsi salah telah dieliminasi.', 'info');
  };

  const handleJumpToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= currentRoom.questions.length) return;
    setQIndex(targetIndex);
  };

  const handleToggleFlagQuestion = (targetIndex: number) => {
    setFlaggedIndices((prev) =>
      prev.includes(targetIndex)
        ? prev.filter((i) => i !== targetIndex)
        : [...prev, targetIndex]
    );
  };

  const finalizeQuizAndShowResults = () => {
    // Finish Quiz -> Compute Results, Leaderboard, Save History, Render Certificate
    const total = currentRoom.questions.length;
    const finalGrade = calculateGrade(correctCount, total);
    const finalPoints = score;
    const displayName = playerName.trim() || 'Peserta';
    const nowIso = new Date().toISOString();

    // Sync final finished score to shared room leaderboard so ALL participants see real-time rankings
    if (firebaseUser?.email) {
      upsertRoomLeaderboardScore(currentRoom.code, firebaseUser.uid, {
        name: displayName,
        points: finalPoints,
        grade: finalGrade,
        correctCount,
        totalQuestions: total,
        answeredCount: Object.keys(answersByIndex).length,
        cheatCount,
        status: 'finished',
      });
    }

    const uid = activeParticipantUid;
    const others = roomLeaderboardRaw.filter((e) => e.id !== uid && !e.isCurrentUser);
    const entries: LeaderboardEntry[] = [
      {
        id: uid,
        name: displayName,
        grade: finalGrade,
        points: finalPoints,
        correctCount,
        totalQuestions: total,
        answeredCount: Object.keys(answersByIndex).length,
        cheatCount,
        status: 'finished',
        isCurrentUser: true,
        photoUrl: activeParticipantPhotoUrl || undefined,
        timestamp: nowIso,
      },
      ...others.map((entry) => {
        if (entry.photoUrl) return entry;
        const dir =
          publicDirectory.find((p) => p.uid === entry.id && p.photoUrl) ||
          publicDirectory.find(
            (p) => p.photoUrl && p.displayName.trim().toLowerCase() === entry.name.trim().toLowerCase()
          );
        return dir?.photoUrl ? { ...entry, photoUrl: dir.photoUrl } : entry;
      }),
    ];

    const ranked = rankLeaderboard(entries);
    const userEntry = ranked.find((e) => e.isCurrentUser)!;
    const certId = `HFZ-${currentRoom.code}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const certData: CertificateData = {
      playerName: displayName,
      quizTitle: currentRoom.title,
      roomCode: currentRoom.code,
      grade: finalGrade,
      points: finalPoints,
      correctCount,
      totalQuestions: total,
      rank: userEntry.rank,
      certificateId: certId,
      dateStr,
    };

    const record: HistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowIso,
      roomCode: currentRoom.code,
      quizTitle: currentRoom.title,
      playerName: displayName,
      grade: finalGrade,
      points: finalPoints,
      correctCount,
      totalQuestions: total,
      rank: userEntry.rank,
      certificateId: certId,
    };

    setHistory((prev) => {
      const next = [record, ...prev];
      saveHistory(next);
      return next;
    });

    // Permanently save quiz result & certificate record to Firebase Firestore (Admin archive + Participant's own email DB)
    if (firebaseUser?.email) {
      saveHistoryToFirestore(record).catch((err) => {
        console.warn('Firestore history save deferred:', err);
      });
      saveUserHistoryToFirestore(firebaseUser.uid, record)
        .then(() => {
          setUserHistory((prev) => [record, ...prev]);
        })
        .catch(() => {});
    }

    if (webhookUrl) {
      syncRecordToWebhook(webhookUrl, record);
    }

    setLastResult({
      grade: finalGrade,
      points: finalPoints,
      correctCount,
      totalQuestions: total,
      rank: userEntry.rank,
      leaderboard: ranked,
      certificateData: certData,
    });

    setView('results');
    if (webSettings.confettiEnabled) {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
  };

  const handleFinishQuiz = () => {
    const total = currentRoom.questions.length;
    const unansweredCount = Math.max(0, total - Object.keys(answersByIndex).length);
    if (unansweredCount > 0) {
      setConfirmState({
        open: true,
        title: `Selesaikan Kuis Sekarang?`,
        description: `Masih ada ${unansweredCount} dari ${total} soal yang belum dijawab. Soal yang belum dijawab akan dihitung kosong jika Anda mengakhiri kuis sekarang.`,
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, open: false }));
          finalizeQuizAndShowResults();
        },
      });
      return;
    }
    finalizeQuizAndShowResults();
  };

  const handleNextQuestion = () => {
    const total = currentRoom.questions.length;
    if (qIndex + 1 < total) {
      setQIndex((i) => i + 1);
      return;
    }
    // If on the last question, check if any earlier skipped question is still unanswered
    const firstUnanswered = currentRoom.questions.findIndex(
      (_q, idx) => answersByIndex[idx] === undefined
    );
    if (firstUnanswered >= 0) {
      setQIndex(firstUnanswered);
      notify(`⏭️ Melompat ke Soal No. ${firstUnanswered + 1} yang belum dijawab!`, 'info');
      return;
    }
    finalizeQuizAndShowResults();
  };

  // Admin Gate Verification (SHA-256 with brute-force protection)
  const handleVerifyAdmin = async (inputPassword: string) => {
    const now = Date.now();
    if (now < adminLockUntil) {
      const secs = Math.ceil((adminLockUntil - now) / 1000);
      notify(`⏳ Terlalu banyak percobaan gagal. Coba lagi dalam ${secs} detik.`, 'error');
      return;
    }
    const clean = inputPassword.trim();
    if (!clean) {
      notify('Masukkan password sistem terlebih dahulu.', 'warning');
      return;
    }
    const inputHash = await sha256Hex(clean);
    if (inputHash === systemPw.hash) {
      setFailedAdminAttempts(0);
      setAdminLockUntil(0);
      setAdminAuthenticated(true);
      setAdminNavUnlocked(true);
      setAdminGateOpen(false);
      try {
        const sessionToken = await fetchCsrfToken();
        const authRes = await fetch('/api/admin/authorize', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Hafiz-Token': sessionToken,
          },
          body: JSON.stringify({
            method: 'studio',
            passwordSha256: inputHash,
            bootstrapHash: systemPw.hash,
          }),
        });
        const authJson = (await authRes.json()) as { ok?: boolean; adminToken?: string };
        if (authRes.ok && authJson.adminToken) {
          adminTokenRef.current = authJson.adminToken;
          writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, authJson.adminToken);
        }
      } catch {
        // continue with local verification
      }
      setView('admin');
      await syncAdminCloudData(true);
      notify('🔓 Verifikasi SHA-256 berhasil! Selamat datang di Studio Admin.', 'success');
    } else {
      const nextAttempts = failedAdminAttempts + 1;
      setFailedAdminAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setAdminLockUntil(Date.now() + 60_000);
        setFailedAdminAttempts(0);
        notify('🛡️ Akses dikunci 60 detik demi keamanan setelah 5 kali salah password.', 'error');
      } else {
        notify(
          `❌ Password Admin salah (Sisa percobaan: ${5 - nextAttempts}x).`,
          'error'
        );
      }
    }
  };

  const handleGoogleAdminLogin = async () => {
    setAdminGoogleRecoveryMessage('');
    const flow = await signInWithGoogleSmart('admin');
    if (flow.status === 'redirecting') {
      notify('Mengalihkan ke halaman login Google Admin tanpa pop-up...', 'info');
      return;
    }
    if (flow.status === 'recovery-needed') {
      setAdminGoogleRecoveryMessage(flow.reason.userMessage);
      return;
    }
    const user = flow.user;
    if (isVerifiedAdminUser(user)) {
      setAdminAuthenticated(true);
      setAdminNavUnlocked(true);
      setAdminGateOpen(false);
      setAdminGoogleRecoveryMessage('');
      try {
        const [sessionToken, idToken] = await Promise.all([
          fetchCsrfToken(),
          user.getIdToken(),
        ]);
        const authRes = await fetch('/api/admin/authorize', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Hafiz-Token': sessionToken,
          },
          body: JSON.stringify({ method: 'google', idToken }),
        });
        const authJson = (await authRes.json()) as { ok?: boolean; adminToken?: string };
        if (authRes.ok && authJson.adminToken) {
          adminTokenRef.current = authJson.adminToken;
          writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, authJson.adminToken);
        }
      } catch {
        // continue even if token exchange skipped
      }
      setView('admin');
      notify(`🛡️ Login Google Admin berhasil (${user.email})! Akses penuh diaktifkan.`, 'success');
      await syncAdminCloudData(true);
    } else {
      await signOutAdmin();
      notify(
        '⛔ Akun Google ini bukan Admin terdaftar. Hanya email Admin resmi yang diizinkan.',
        'error'
      );
    }
  };

  const handleGoogleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network error
    }
    try {
      await signOutAdmin();
    } catch {
      // ignore if signed in locally only
    }
    adminTokenRef.current = '';
    writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, '');
    setAdminAuthenticated(false);
    setAdminNavUnlocked(false);
    setView('landing');
    notify('🚪 Anda telah keluar dari sesi Admin.', 'info');
  };

  const handleOpenAdminGate = () => {
    if (adminAuthenticated || isGoogleAdminVerified) {
      setView('admin');
    } else {
      setAdminGateOpen(true);
    }
  };

  // Publish Studio Room (Local + Cloud Firestore)
  const handlePublishRoom = async () => {
    const cleanTitle = studioTitle.trim();
    if (!cleanTitle) {
      notify('Judul kuis tidak boleh kosong.', 'warning');
      return;
    }
    if (studioQuestions.length === 0) {
      notify('Tambahkan minimal 1 soal sebelum menerbitkan room.', 'warning');
      return;
    }
    const openAtIso = parseOpenAtInput(studioOpenAt);
    const closeAtIso = parseOpenAtInput(studioCloseAt);
    if (openAtIso && closeAtIso && new Date(closeAtIso).getTime() <= new Date(openAtIso).getTime()) {
      notify('⚠️ Waktu tutup soal harus lebih lambat dari waktu buka soal.', 'warning');
      return;
    }
    const scheduleInfo = getQuizScheduleStatus(openAtIso, Date.now(), closeAtIso);
    const existingRoom = rooms[studioCode];
    const newRoom: QuizRoom = {
      code: studioCode,
      title: cleanTitle,
      questions: studioQuestions,
      category: studioCategory,
      openAt: openAtIso,
      closeAt: closeAtIso,
      status: existingRoom?.status || studioRoomStatus || 'waiting',
      createdAt: existingRoom?.createdAt || new Date().toISOString(),
    };
    const nextRooms = { ...rooms, [studioCode]: newRoom };
    setRooms(nextRooms);
    saveRooms(nextRooms);
    writeDeletedRoomCodes(readDeletedRoomCodes().filter((c) => c !== studioCode));
    if (adminTokenRef.current) {
      fetchCsrfToken()
        .then((sessionToken) =>
          fetch('/api/rooms/deleted', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Hafiz-Token': sessionToken,
              ...buildAdminAuthHeaders(adminTokenRef.current),
            },
            body: JSON.stringify({ roomCode: studioCode, restore: true }),
          })
        )
        .catch(() => {});
    }
    if (currentRoom.code === studioCode) {
      setCurrentRoom(newRoom);
    }
    setActiveRoomCode(studioCode);
    saveActiveRoomCode(studioCode);
    setStudioPublished(true);

    const scheduleNote = scheduleInfo.isClosed
      ? ` Status: Ditutup (${scheduleInfo.formattedCloseDate}).`
      : scheduleInfo.isNotYetOpen
        ? ` Dijadwalkan buka ${scheduleInfo.formattedDate}${scheduleInfo.formattedCloseDate ? `, tutup ${scheduleInfo.formattedCloseDate}` : ''}.`
        : scheduleInfo.formattedCloseDate
          ? ` Ditutup otomatis ${scheduleInfo.formattedCloseDate}.`
          : '';

    if (isGoogleAdminVerified && firebaseUser) {
      try {
        await saveRoomToFirestore(newRoom, firebaseUser.uid);
        notify(`🚀 Room ${studioCode} diterbitkan & tersimpan permanen di Cloud!${scheduleNote}`, 'success');
      } catch {
        notify(
          `⚠️ Room ${studioCode} aktif di perangkat ini, namun gagal tersimpan ke Cloud.`,
          'warning'
        );
      }
    } else {
      notify(
        `🚀 Room ${studioCode} aktif!${scheduleNote} Login Google Admin agar room dapat diakses lintas perangkat.`,
        'success'
      );
    }
  };

  const handleLoadRoomToStudio = (room: QuizRoom) => {
    setStudioCode(room.code);
    setStudioTitle(room.title);
    setStudioCategory(room.category || 'Umum');
    setStudioQuestions(room.questions);
    setStudioOpenAt(toDateTimeLocalInput(room.openAt));
    setStudioCloseAt(toDateTimeLocalInput(room.closeAt));
    setStudioRoomStatus(room.status || 'waiting');
    setStudioPublished(true);
    notify(`✏️ Paket "${room.title}" (${room.code}) dimuat ke editor! Ubah soal atau jadwal lalu klik Simpan Perubahan.`, 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditUploadedRoom = (room: QuizRoom) => {
    if (!isGoogleAdminVerified && !adminAuthenticated) {
      notify('🔒 Hanya Admin terverifikasi yang dapat mengedit soal terupload.', 'warning');
      return;
    }
    handleLoadRoomToStudio(room);
    setView('admin');
    window.setTimeout(() => {
      document
        .getElementById('studio-questions-editor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const handleQuickToggleCloseRoom = async (room: QuizRoom) => {
    const sched = getQuizScheduleStatus(room.openAt, Date.now(), room.closeAt);
    const updatedRoom: QuizRoom = sched.isClosed
      ? {
          ...room,
          closeAt: undefined,
          openAt:
            room.openAt && new Date(room.openAt).getTime() > Date.now() ? undefined : room.openAt,
        }
      : {
          ...room,
          closeAt: new Date(Date.now() - 1000).toISOString(),
        };

    const nextRooms = { ...rooms, [room.code]: updatedRoom };
    setRooms(nextRooms);
    saveRooms(nextRooms);
    if (studioCode === room.code) {
      setStudioOpenAt(toDateTimeLocalInput(updatedRoom.openAt));
      setStudioCloseAt(toDateTimeLocalInput(updatedRoom.closeAt));
    }

    if (isGoogleAdminVerified && firebaseUser) {
      try {
        await saveRoomToFirestore(updatedRoom, firebaseUser.uid);
      } catch {
        notify('⚠️ Perubahan status tersimpan lokal, namun gagal sinkron ke Cloud.', 'warning');
        return;
      }
    }
    notify(
      sched.isClosed
        ? `🔓 Soal "${room.title}" (${room.code}) sekarang DIBUKA kembali!`
        : `🔒 Soal "${room.title}" (${room.code}) sekarang DITUTUP untuk peserta.`,
      'success'
    );
  };

  const handleRequestDeleteRoom = (room: QuizRoom) => {
    if (!isGoogleAdminVerified && !adminAuthenticated) {
      notify('🔒 Hanya Admin terverifikasi yang dapat menghapus paket soal.', 'warning');
      return;
    }
    setConfirmState({
      open: true,
      title: `Hapus Paket Soal "${room.title}"?`,
      description: `Paket kuis (${room.code}, ${room.questions.length} soal) akan dihapus permanen dari Portal Belajar.`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        if (!isGoogleAdminVerified && !adminAuthenticated) {
          notify('🔒 Akses ditolak: hanya Admin yang dapat menghapus soal.', 'error');
          return;
        }
        writeDeletedRoomCodes([...readDeletedRoomCodes(), room.code]);
        setRooms((prev) => {
          const next = { ...prev };
          delete next[room.code];
          saveRooms(next);
          return next;
        });
        if (studioCode === room.code) {
          setStudioPublished(false);
        }
        if (adminTokenRef.current) {
          fetchCsrfToken()
            .then((sessionToken) =>
              fetch('/api/rooms/deleted', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Hafiz-Token': sessionToken,
                  ...buildAdminAuthHeaders(adminTokenRef.current),
                },
                body: JSON.stringify({ roomCode: room.code }),
              })
            )
            .catch(() => {});
        }
        if (isGoogleAdminVerified) {
          try {
            await deleteRoomFromFirestore(room.code);
          } catch {
            notify(
              `⚠️ Paket soal "${room.title}" dihapus dari tampilan, namun gagal menghapus dari Cloud Firestore.`,
              'warning'
            );
            return;
          }
        }
        notify(`🗑️ Paket soal "${room.title}" (${room.code}) berhasil dihapus permanen oleh Admin!`, 'success');
      },
    });
  };

  const handleLaunchPortalQuizRoom = async (portalRoom: QuizRoom) => {
    const isAdminUser = canAdminStartQuiz({ isGoogleAdminVerified, adminAuthenticated });
    if (!activeParticipantIdentity && !isAdminUser) {
      setAuthModalMode('register');
      setAuthModalOpen(true);
      notify('Buat akun atau masuk sebagai Peserta untuk bergabung ke Lobi Kuis.', 'warning');
      return;
    }
    const schedule = getQuizScheduleStatus(portalRoom.openAt, Date.now(), portalRoom.closeAt);
    if (schedule.isLocked && !isAdminUser) {
      notify(
        schedule.isClosed
          ? `⛔ "${portalRoom.title}" sudah ditutup pada ${schedule.formattedCloseDate}.`
          : `🔒 "${portalRoom.title}" belum dibuka! Akan dibuka pada ${schedule.formattedDate} (${schedule.countdownLabel}).`,
        'warning'
      );
      return;
    }
    const displayName =
      playerName.trim() ||
      serverParticipant?.displayName ||
      firebaseUser?.displayName ||
      firebaseUser?.email?.split('@')[0] ||
      (isAdminUser ? 'Admin' : 'Peserta');
    if (!playerName.trim()) {
      setPlayerName(displayName);
    }

    const cloudRoom = await fetchRoomFromFirestore(portalRoom.code).catch(() => null);
    const lobbyRoom = normalizeRoomForLobbyEntry(rooms[portalRoom.code] || portalRoom, cloudRoom);
    enterLobbyForRoom(lobbyRoom, displayName);
    notify(
      isAdminUser
        ? `🏟️ Masuk Lobi "${lobbyRoom.title}". Klik "Mulai Kuis" di Lobi untuk memulai seluruh peserta.`
        : `🏟️ Masuk Lobi "${lobbyRoom.title}". Menunggu Admin memulai kuis...`,
      'info'
    );
  };

  const deleteServerMaterialFileIfNeeded = useCallback(async (pptUrl?: string) => {
    const storedName = extractLocalMaterialFileName(pptUrl);
    if (!storedName || !adminTokenRef.current) return;
    try {
      const sessionToken = await fetchCsrfToken();
      await fetch(`/api/material-files/${encodeURIComponent(storedName)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'X-Hafiz-Token': sessionToken,
          'X-Hafiz-Admin-Token': adminTokenRef.current,
        },
      });
    } catch {
      // best-effort cleanup on server disk
    }
  }, []);

  const saveMaterialToServerDb = useCallback(async (material: StudyModule) => {
    if (!adminTokenRef.current) return false;
    try {
      const sessionToken = await fetchCsrfToken();
      const res = await fetch('/api/materials', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Hafiz-Token': sessionToken,
          ...buildAdminAuthHeaders(adminTokenRef.current),
        },
        body: JSON.stringify({ material }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const deleteMaterialFromServerDb = useCallback(async (materialId: string) => {
    if (!adminTokenRef.current) return false;
    try {
      const sessionToken = await fetchCsrfToken();
      const res = await fetch(`/api/materials/${encodeURIComponent(materialId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-Hafiz-Token': sessionToken,
          ...buildAdminAuthHeaders(adminTokenRef.current),
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const handleSaveMaterial = async (material: StudyModule) => {
    const previous = uploadedMaterials.find((m) => m.id === material.id);
    if (previous?.pptUrl && previous.pptUrl !== material.pptUrl) {
      void deleteServerMaterialFileIfNeeded(previous.pptUrl);
    }

    writeDeletedMaterialIds(readDeletedMaterialIds().filter((id) => id !== material.id));

    setUploadedMaterials((prev) => {
      const next = replaceMaterialInList(prev, material);
      try {
        localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota
      }
      return next;
    });

    const savedOnServer = await saveMaterialToServerDb(material);

    if (isGoogleAdminVerified && firebaseUser) {
      try {
        await saveMaterialToFirestore(material, firebaseUser.uid);
        writePendingLocalMaterialIds(
          readPendingLocalMaterialIds().filter((id) => id !== material.id)
        );
        notify(`📘 Materi "${material.title}" berhasil dipublikasikan ke Cloud!`, 'success');
      } catch {
        writePendingLocalMaterialIds([...readPendingLocalMaterialIds(), material.id]);
        notify('⚠️ Materi tersimpan lokal, namun gagal sinkron ke Cloud.', 'warning');
      }
    } else {
      writePendingLocalMaterialIds([...readPendingLocalMaterialIds(), material.id]);
      notify(
        savedOnServer
          ? `📘 Materi "${material.title}" tersimpan permanen di server & perangkat ini!`
          : `📘 Materi "${material.title}" tersimpan! (Login Google Admin untuk sinkron Cloud publik)`,
        'success'
      );
    }
  };

  const performDeleteMaterial = async (materialId: string) => {
    const target = uploadedMaterials.find((m) => m.id === materialId);
    writeDeletedMaterialIds([...readDeletedMaterialIds(), materialId]);
    setUploadedMaterials((prev) => {
      const next = removeMaterialById(prev, materialId);
      try {
        localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota
      }
      return next;
    });
    writePendingLocalMaterialIds(readPendingLocalMaterialIds().filter((id) => id !== materialId));

    if (target?.pptUrl) {
      void deleteServerMaterialFileIfNeeded(target.pptUrl);
    }
    await deleteMaterialFromServerDb(materialId);

    if (isGoogleAdminVerified) {
      try {
        await deleteMaterialFromFirestore(materialId);
      } catch {
        notify('⚠️ Terhapus di tampilan & server, namun gagal menghapus dari Cloud Firestore.', 'warning');
        return;
      }
    }
    notify(`🗑️ Materi "${target?.title || 'Pilihan'}" berhasil dihapus permanen.`, 'success');
  };

  const performRemoveMaterialPpt = async (materialId: string) => {
    const target = uploadedMaterials.find((m) => m.id === materialId);
    if (!target || !target.pptUrl) {
      notify('Materi ini tidak memiliki lampiran PPT.', 'info');
      return;
    }
    const oldPptUrl = target.pptUrl;
    const stripped = stripMaterialPpt(target);

    setUploadedMaterials((prev) => {
      const next = replaceMaterialInList(prev, stripped);
      try {
        localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota
      }
      return next;
    });

    void deleteServerMaterialFileIfNeeded(oldPptUrl);
    await saveMaterialToServerDb(stripped);

    if (isGoogleAdminVerified && firebaseUser) {
      try {
        await saveMaterialToFirestore(stripped, firebaseUser.uid);
        notify(`🗑️ Lampiran PPT pada "${target.title}" berhasil dihapus!`, 'success');
      } catch {
        notify('⚠️ PPT dihapus secara lokal, namun gagal sinkron ke Cloud.', 'warning');
      }
    } else {
      writePendingLocalMaterialIds([...readPendingLocalMaterialIds(), stripped.id]);
      notify(`🗑️ Lampiran PPT pada "${target.title}" berhasil dihapus!`, 'success');
    }
  };

  const handleRequestDeleteMaterial = (materialId: string) => {
    const target = uploadedMaterials.find((m) => m.id === materialId);
    setConfirmState({
      open: true,
      title: `Hapus Materi & Modul "${target?.title || 'Ini'}"?`,
      description: target?.pptUrl
        ? `Seluruh materi, ringkasan, dan lampiran PPT (${target.pptName || 'File PPT'}) pada modul ini akan dihapus permanen.`
        : 'Seluruh isi materi dan modul pembelajaran ini akan dihapus permanen dari Portal Belajar.',
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        await performDeleteMaterial(materialId);
      },
    });
  };

  const handleRequestRemoveMaterialPpt = (materialId: string) => {
    const target = uploadedMaterials.find((m) => m.id === materialId);
    if (!target || !target.pptUrl) return;
    setConfirmState({
      open: true,
      title: 'Hapus Slide PPT / Lampiran?',
      description: `File "${target.pptName || 'Lampiran PPT'}" akan dihapus dari modul "${target.title}". Ringkasan materi dan video tetap dipertahankan.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        await performRemoveMaterialPpt(materialId);
      },
    });
  };

  const handleRequestDeleteMaterialsBulk = (materialIds: string[]) => {
    if (materialIds.length === 0) return;
    setConfirmState({
      open: true,
      title: `Hapus ${materialIds.length} Materi & Modul Terfilter?`,
      description: `Sebanyak ${materialIds.length} materi beserta seluruh lampiran PPT di dalamnya akan dihapus permanen.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        const idSet = new Set(materialIds);
        const targets = uploadedMaterials.filter((m) => idSet.has(m.id));
        writeDeletedMaterialIds([...readDeletedMaterialIds(), ...materialIds]);
        setUploadedMaterials((prev) => {
          const next = prev.filter((m) => !idSet.has(m.id));
          try {
            localStorage.setItem(UPLOADED_MATERIALS_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore storage quota
          }
          return next;
        });
        writePendingLocalMaterialIds(
          readPendingLocalMaterialIds().filter((id) => !idSet.has(id))
        );
        for (const t of targets) {
          if (t.pptUrl) {
            void deleteServerMaterialFileIfNeeded(t.pptUrl);
          }
        }
        if (adminTokenRef.current) {
          fetchCsrfToken()
            .then((sessionToken) =>
              fetch('/api/materials/bulk-delete', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Hafiz-Token': sessionToken,
                  ...buildAdminAuthHeaders(adminTokenRef.current),
                },
                body: JSON.stringify({ materialIds }),
              })
            )
            .catch(() => {});
        }
        if (isGoogleAdminVerified) {
          await Promise.all(
            materialIds.map((id) => deleteMaterialFromFirestore(id).catch(() => {}))
          );
        }
        notify(`🗑️ ${materialIds.length} materi & modul berhasil dihapus.`, 'success');
      },
    });
  };

  const handleCopyShareLink = () => {
    const shareOrigin = window.location.hostname.endsWith('hafizeducation.my.id')
      ? window.location.origin
      : OFFICIAL_SITE_ORIGIN;
    const shareUrl = `${shareOrigin}/?room=${encodeURIComponent(studioCode)}`;
    navigator.clipboard?.writeText(`Kode Room: ${studioCode}\nLink: ${shareUrl}`).catch(() => {});
    notify(`📋 Kode ${studioCode} & link room (${shareOrigin}) disalin!`, 'success');
  };

  const handleDownloadHistoryCertificate = (rec: HistoryRecord) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 1200;
    offscreen.height = 848;
    renderCertificateToCanvas(offscreen, {
      playerName: rec.playerName,
      quizTitle: rec.quizTitle,
      roomCode: rec.roomCode,
      grade: rec.grade,
      points: rec.points,
      correctCount: rec.correctCount,
      totalQuestions: rec.totalQuestions,
      rank: rec.rank,
      certificateId: rec.certificateId,
      dateStr: new Date(rec.timestamp).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
    const safeName = rec.playerName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Peserta';
    downloadCanvasPNG(offscreen, `Sertifikat_${safeName}_${rec.roomCode}.png`);
    notify(`📜 Sertifikat ${rec.playerName} berhasil diunduh!`, 'success');
  };

  const handleRequestDeleteUserHistoryItem = (rec: HistoryRecord) => {
    setConfirmState({
      open: true,
      title: 'Hapus Riwayat Nilai & Sertifikat?',
      description: `Riwayat nilai (${rec.grade}) dan data sertifikat untuk "${rec.quizTitle}" (${rec.roomCode}) akan dihapus permanen dari akun Anda.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        setUserHistory((prev) => prev.filter((item) => item.id !== rec.id));
        setHistory((prev) => {
          const next = prev.filter((item) => item.id !== rec.id);
          saveHistory(next);
          return next;
        });
        if (firebaseUser?.email) {
          await deleteUserHistoryFromFirestore(firebaseUser.uid, rec.id).catch(() => {});
          if (isGoogleAdminVerified) {
            await deleteHistoryFromFirestore(rec.id).catch(() => {});
          }
        }
        notify('🗑️ Riwayat nilai & sertifikat berhasil dihapus.', 'info');
      },
    });
  };

  const handleRequestClearAllUserHistory = () => {
    if (userHistory.length === 0) return;
    setConfirmState({
      open: true,
      title: 'Hapus Semua Riwayat Nilai & Sertifikat?',
      description: `Seluruh ${userHistory.length} riwayat nilai dan sertifikat yang tersimpan di akun Anda akan dihapus permanen.`,
      onConfirm: async () => {
        const ids = userHistory.map((item) => item.id);
        setConfirmState((s) => ({ ...s, open: false }));
        setUserHistory([]);
        setHistory((prev) => {
          const idSet = new Set(ids);
          const next = prev.filter((item) => !idSet.has(item.id));
          saveHistory(next);
          return next;
        });
        if (firebaseUser?.email && ids.length > 0) {
          await clearAllUserHistoryFromFirestore(firebaseUser.uid, ids).catch(() => {});
          if (isGoogleAdminVerified) {
            await clearAllHistoryFromFirestore(ids).catch(() => {});
          }
        }
        notify('🗑️ Semua riwayat nilai & sertifikat di akun Anda berhasil dihapus.', 'info');
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <OfflineIndicator language={webSettings.language} />
      <IntroSplash
        brandName={siteSettings.brandName}
        introVideoUrl={siteSettings.introVideoUrl}
        skip={webSettings.skipIntroSplash}
      />
      <GalaxyBackground enabled={webSettings.galaxyEffects} />

      <Header
        brandName={siteSettings.brandName}
        currentView={view}
        adminNavUnlocked={adminNavUnlocked}
        theme={webSettings.theme}
        language={webSettings.language}
        liveCount={liveSessions.filter((s) => s.isLive).length}
        userEmail={activeParticipantIdentity}
        participantPhotoUrl={activeParticipantPhotoUrl}
        isAdminSession={adminAuthenticated || isGoogleAdminVerified}
        playStoreUrl={siteSettings.playStoreUrl}
        appStoreUrl={siteSettings.appStoreUrl}
        microsoftStoreUrl={siteSettings.microsoftStoreUrl}
        microsoftStoreId={siteSettings.microsoftStoreId}
        onToggleTheme={() =>
          setWebSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onOpenWebSettings={() => setWebSettingsOpen(true)}
        onOpenParticipantAuth={handleOpenParticipantAuth}
        onBrandClick={handleBrandClick}
        onOpenPortals={(tab = 'tryout-utbk') => {
          setPortalTab(tab);
          setView('portals');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCampusAnalysis={() => {
          setCampusAnalysisMode(
            webSettings.defaultStudyTrack === 'kedinasan' ? 'kedinasan' : 'utbk'
          );
          setView('campus-analysis');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAbout={() => {
          setView('landing');
          window.setTimeout(() => {
            document.getElementById('about-hafiz-education')?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }}
        onOpenTutorial={() => setTutorialOpen(true)}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onSwitchStudent={() => setView('landing')}
        onOpenAdminGate={handleOpenAdminGate}
        onLogout={handleParticipantLogout}
      />

      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {view === 'landing' && (
          <LandingView
            siteSettings={siteSettings}
            playerName={playerName}
            roomCodeInput={roomCodeInput}
            avatar={avatar}
            activeSavedRoom={activeSavedRoom}
            userEmail={activeParticipantIdentity}
            isGoogleConnected={Boolean(
              (firebaseUser?.email && firebaseUser.providerData.some((p) => p.providerId === 'google.com')) ||
                serverParticipant?.authMethod === 'google'
            )}
            googleAutoConnectStatus={googleAutoConnectStatus}
            participantPhotoUrl={activeParticipantPhotoUrl}
            participantSchool={participantMeta.school}
            participantTargetCampus={participantMeta.targetCampus}
            publicDirectory={publicDirectory}
            userHistory={userHistory}
            onParticipantLogin={handleParticipantLogin}
            onOpenParticipantAuth={handleOpenParticipantAuth}
            onParticipantLogout={handleParticipantLogout}
            onDownloadCertificate={handleDownloadHistoryCertificate}
            onDeleteHistoryItem={handleRequestDeleteUserHistoryItem}
            onClearAllHistory={handleRequestClearAllUserHistory}
            onPlayerNameChange={setPlayerName}
            onRoomCodeChange={setRoomCodeInput}
            onJoinRoom={handleJoinRoom}
            onFillSavedRoom={() => {
              setRoomCodeInput(activeSavedRoom.code);
              notify(`Kode Room ${activeSavedRoom.code} diisikan!`, 'info');
            }}
            onOpenWardrobe={() => setWardrobeOpen(true)}
            onOpenTutorial={() => setTutorialOpen(true)}
            onOpenPortals={(tab) => {
              setPortalTab(tab);
              setView('portals');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenCampusAnalysis={(mode = 'utbk') => {
              setCampusAnalysisMode(mode);
              setView('campus-analysis');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenWebSettings={() => setWebSettingsOpen(true)}
            language={webSettings.language}
            onRandomizeAvatar={handleRandomizeAvatar}
            onPreviewLobbyDemo={handlePreviewLobbyDemo}
            isAdmin={isAnyAdminSession && adminNavUnlocked}
            uploadedRooms={Object.values(rooms)}
            liveSessions={liveSessions}
            onLaunchQuizRoom={handleLaunchPortalQuizRoom}
            onEditUploadedRoom={
              isAnyAdminSession && adminNavUnlocked ? handleEditUploadedRoom : undefined
            }
            onDeleteUploadedRoom={
              isAnyAdminSession && adminNavUnlocked ? handleRequestDeleteRoom : undefined
            }
            onUploadFounderPhoto={(file) => {
              const reader = new FileReader();
              reader.onload = async () => {
                if (typeof reader.result !== 'string') return;
                const compressed = await compressDataUrlImage(reader.result, 480, 0.82);
                const updated = { ...siteSettings, founderPhoto: compressed };
                await handleSaveSiteSettings(updated);
              };
              reader.readAsDataURL(file);
            }}
          />
        )}

        {view === 'portals' && (
          <AcademicPortalsView
            initialTab={portalTab}
            userEmail={activeParticipantIdentity}
            isAdmin={isAnyAdminSession && adminNavUnlocked}
            uploadedRooms={Object.values(rooms)}
            uploadedMaterials={uploadedMaterials}
            liveSessions={liveSessions}
            userHistory={userHistory}
            onDownloadCertificate={handleDownloadHistoryCertificate}
            onDeleteHistoryItem={handleRequestDeleteUserHistoryItem}
            onClearAllHistory={handleRequestClearAllUserHistory}
            onParticipantLogin={handleParticipantLogin}
            onOpenParticipantAuth={handleOpenParticipantAuth}
            onParticipantLogout={handleParticipantLogout}
            onLaunchQuizRoom={handleLaunchPortalQuizRoom}
            onEditUploadedRoom={
              isAnyAdminSession && adminNavUnlocked ? handleEditUploadedRoom : undefined
            }
            onDeleteUploadedRoom={
              isAnyAdminSession && adminNavUnlocked ? handleRequestDeleteRoom : undefined
            }
            onDeleteUploadedMaterial={
              isAnyAdminSession && adminNavUnlocked ? handleRequestDeleteMaterial : undefined
            }
            onDeleteMaterialPpt={
              isAnyAdminSession && adminNavUnlocked ? handleRequestRemoveMaterialPpt : undefined
            }
            onToggleLiveSession={
              isGoogleAdminVerified && adminNavUnlocked
                ? async (sess) => {
                    if (!firebaseUser) return;
                    await saveLiveSessionToFirestore(
                      { ...sess, isLive: !sess.isLive },
                      firebaseUser.uid
                    );
                    notify(
                      !sess.isLive
                        ? `🔴 Sesi "${sess.title}" sekarang berstatus SEDANG LIVE!`
                        : `⏸️ Sesi "${sess.title}" dikembalikan ke Terjadwal.`,
                      'info'
                    );
                  }
                : undefined
            }
            onDeleteLiveSession={
              isGoogleAdminVerified && adminNavUnlocked
                ? async (sessionId) => {
                    await deleteLiveSessionFromFirestore(sessionId);
                    notify('🗑️ Sesi Live Teaching dihapus.', 'info');
                  }
                : undefined
            }
            onOpenCampusAnalysis={(mode = 'utbk') => {
              setCampusAnalysisMode(mode);
              setView('campus-analysis');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAdminUpload={() => setView('admin')}
            onBackHome={() => setView('landing')}
          />
        )}

        {view === 'campus-analysis' && (
          <UtbkCampusAnalyzer
            initialMode={campusAnalysisMode}
            language={webSettings.language}
            userHistory={userHistory.length > 0 ? userHistory : history}
            latestQuizGrade={lastResult?.grade ?? null}
            userEmail={activeParticipantIdentity}
            onSaveSkdToProfile={handleSaveSkdToProfile}
            onBackHome={() => setView('landing')}
            onOpenUtbkTryOut={() => {
              setPortalTab('tryout-utbk');
              setView('portals');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenKedinasanPortal={() => {
              setPortalTab('kedinasan');
              setView('portals');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {view === 'lobby' && (
          <LobbyView
            room={currentRoom}
            playerName={playerName.trim() || 'Peserta'}
            avatar={avatar}
            players={lobbyPlayers}
            chatMessages={lobbyChat}
            isAdmin={isGoogleAdminVerified || adminAuthenticated}
            roomStatus={currentRoom.status || 'waiting'}
            countdownValue={countdownValue}
            onSendChat={handleSendLobbyChat}
            onOpenWardrobe={() => setWardrobeOpen(true)}
            onSelectAvatarCharacter={(characterId, skinColor) => {
              setAvatar((prev) => ({ ...prev, characterId, skinColor }));
            }}
            onAdminStartQuiz={handleAdminStartQuiz}
            onLeaveLobby={() => {
              if (countdownTimerRef.current) {
                window.clearTimeout(countdownTimerRef.current);
                countdownTimerRef.current = null;
                setCountdownValue(null);
              }
              setView('landing');
            }}
          />
        )}

        {view === 'quiz' && currentRoom.questions[qIndex] && (
          <QuizView
            quizTitle={currentRoom.title}
            questions={currentRoom.questions}
            question={currentRoom.questions[qIndex]}
            questionIndex={qIndex}
            totalQuestions={currentRoom.questions.length}
            answersByIndex={answersByIndex}
            flaggedIndices={flaggedIndices}
            score={score}
            streak={streak}
            cheatCount={cheatCount}
            liveLeaderboard={liveRankedLeaderboard}
            powerup5050Used={powerup5050Used}
            hiddenChoiceIndices={hiddenChoicesByIndex[qIndex] ?? []}
            selectedChoice={answersByIndex[qIndex] ?? null}
            onSelectChoice={handleSelectChoice}
            onUse5050={handleUse5050}
            onJumpToQuestion={handleJumpToQuestion}
            onToggleFlagQuestion={handleToggleFlagQuestion}
            onNextQuestion={handleNextQuestion}
            onFinishQuiz={handleFinishQuiz}
            onCheatDetected={handleCheatDetected}
            onExitQuiz={() =>
              setConfirmState({
                open: true,
                title: 'Keluar dari Kuis?',
                description: `Progres kuis "${currentRoom.title}" belum selesai dan skor saat ini belum disimpan ke sertifikat.`,
                onConfirm: () => {
                  setConfirmState((prev) => ({ ...prev, open: false }));
                  setView('landing');
                  notify('🚪 Anda telah keluar dari kuis.', 'info');
                },
              })
            }
          />
        )}

        {view === 'results' && lastResult && (() => {
          const activeBoard =
            liveRankedLeaderboard.length > 0 ? liveRankedLeaderboard : lastResult.leaderboard;
          const liveRank =
            activeBoard.find((e) => e.isCurrentUser)?.rank ?? lastResult.rank;
          return (
            <ResultsView
              finalGrade={lastResult.grade}
              totalPoints={lastResult.points}
              correctCount={lastResult.correctCount}
              totalQuestions={lastResult.totalQuestions}
              rank={liveRank}
              leaderboard={activeBoard}
              certificateData={{ ...lastResult.certificateData, rank: liveRank }}
              onExportExcel={() => {
                exportHistoryToExcel(history);
                notify('📊 File Excel rekap nilai berhasil diunduh!', 'success');
              }}
              onOpenCampusAnalysis={(mode = 'utbk') => {
                setCampusAnalysisMode(mode);
                setView('campus-analysis');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBackHome={() => setView('landing')}
            />
          );
        })()}

        {view === 'admin' && (
          <AdminStudioView
            studioTitle={studioTitle}
            studioCategory={studioCategory}
            studioOpenAt={studioOpenAt}
            studioCloseAt={studioCloseAt}
            studioCode={studioCode}
            studioQuestions={studioQuestions}
            isPublished={studioPublished}
            studioRoomStatus={studioRoomStatus}
            history={history}
            googleAdminEmail={firebaseUser?.email ?? null}
            isGoogleAdminVerified={isGoogleAdminVerified}
            isSyncingCloud={isSyncingCloud}
            onStudioTitleChange={setStudioTitle}
            onStudioCategoryChange={setStudioCategory}
            onStudioOpenAtChange={setStudioOpenAt}
            onStudioCloseAtChange={setStudioCloseAt}
            onGenerateNewCode={() => {
              setStudioCode(generateRoomCode());
              setStudioPublished(false);
              setStudioRoomStatus('waiting');
              setStudioOpenAt('');
              setStudioCloseAt('');
              notify('🎲 Kode room sistem baru telah dibuat!', 'info');
            }}
            onStartNewRoom={() => {
              setStudioCode(generateRoomCode());
              setStudioTitle('');
              setStudioQuestions([]);
              setStudioPublished(false);
              setStudioRoomStatus('waiting');
              setStudioOpenAt('');
              setStudioCloseAt('');
              notify('➕ Studio disiapkan untuk membuat paket soal baru.', 'info');
            }}
            onCopyShareLink={handleCopyShareLink}
            onPublishRoom={handlePublishRoom}
            onToggleRoomStart={handleToggleStudioRoomStart}
            onEnterPreviewLobby={(targetRoom?: QuizRoom) => {
              const roomToPreview = targetRoom ?? rooms[studioCode] ?? {
                code: studioCode,
                title: studioTitle || 'Kuis Hafiz Education',
                questions: studioQuestions,
                createdAt: new Date().toISOString(),
                status: studioRoomStatus,
              };
              enterLobbyForRoom(roomToPreview, playerName.trim() || 'Admin');
            }}
            onUpdateQuestions={(qs) => {
              setStudioQuestions(qs);
              setStudioPublished(false);
            }}
            onExportExcel={() => {
              exportHistoryToExcel(history);
              notify('📊 Rekap nilai Excel (.xlsx) berhasil diunduh!', 'success');
            }}
            onOpenGoogleScriptModal={() => setGoogleScriptOpen(true)}
            onGoogleAdminLogin={handleGoogleAdminLogin}
            onGoogleAdminLogout={handleGoogleAdminLogout}
            onSyncCloudNow={() => syncAdminCloudData(false)}
            onCloseStudio={() => setView('landing')}
            siteSettings={siteSettings}
            onSaveSiteSettings={handleSaveSiteSettings}
            participants={participants}
            uploadedRooms={Object.values(rooms)}
            onLoadRoomToStudio={handleLoadRoomToStudio}
            onQuickToggleCloseRoom={handleQuickToggleCloseRoom}
            onDeleteRoom={handleRequestDeleteRoom}
            uploadedMaterials={uploadedMaterials}
            onSaveMaterial={handleSaveMaterial}
            onDeleteMaterial={handleRequestDeleteMaterial}
            onDeleteMaterialPpt={handleRequestRemoveMaterialPpt}
            onDeleteMaterialsBulk={handleRequestDeleteMaterialsBulk}
            onDiscardUploadedAttachment={(pptUrl) => {
              void deleteServerMaterialFileIfNeeded(pptUrl);
            }}
            liveSessions={liveSessions}
            onSaveLiveSession={async (session) => {
              if (!isGoogleAdminVerified || !firebaseUser) {
                notify('Hanya Admin terverifikasi Google yang dapat mengunggah Link Zoom Live Teaching.', 'warning');
                return;
              }
              await saveLiveSessionToFirestore(session, firebaseUser.uid);
              notify(`🎥 Live Teaching "${session.title}" berhasil dipublikasikan!`, 'success');
            }}
            onDeleteLiveSession={async (sessionId) => {
              if (!isGoogleAdminVerified) {
                notify('Hanya Admin terverifikasi yang dapat menghapus Live Teaching.', 'warning');
                return;
              }
              await deleteLiveSessionFromFirestore(sessionId);
              notify('🗑️ Sesi Live Teaching dihapus.', 'info');
            }}
            onRequestDeleteHistoryItem={(rec) =>
              setConfirmState({
                open: true,
                title: 'Hapus Riwayat Peserta?',
                description: `Data nilai & sertifikat milik "${rec.playerName}" pada room ${rec.roomCode} akan dihapus permanen.`,
                onConfirm: async () => {
                  setConfirmState((s) => ({ ...s, open: false }));
                  setHistory((prev) => {
                    const next = prev.filter((item) => item.id !== rec.id);
                    saveHistory(next);
                    return next;
                  });
                  setUserHistory((prev) => prev.filter((item) => item.id !== rec.id));
                  if (isGoogleAdminVerified) {
                    await deleteHistoryFromFirestore(rec.id).catch(() => {});
                    if (firebaseUser?.uid) {
                      await deleteUserHistoryFromFirestore(firebaseUser.uid, rec.id).catch(
                        () => {}
                      );
                    }
                  }
                  notify('🗑️ Riwayat nilai & sertifikat dihapus permanen.', 'info');
                },
              })
            }
            onRequestClearAllHistory={() =>
              setConfirmState({
                open: true,
                title: 'Hapus Semua Arsip Nilai?',
                description:
                  'Seluruh riwayat nilai & sertifikat peserta yang tersimpan akan dihapus permanen.',
                onConfirm: async () => {
                  const ids = history.map((h) => h.id);
                  const userIds = userHistory.map((h) => h.id);
                  setConfirmState((s) => ({ ...s, open: false }));
                  setHistory([]);
                  saveHistory([]);
                  setUserHistory([]);
                  if (isGoogleAdminVerified) {
                    if (ids.length > 0) {
                      await clearAllHistoryFromFirestore(ids).catch(() => {});
                    }
                    if (firebaseUser?.uid && userIds.length > 0) {
                      await clearAllUserHistoryFromFirestore(firebaseUser.uid, userIds).catch(
                        () => {}
                      );
                    }
                  }
                  notify('🗑️ Seluruh arsip riwayat nilai & sertifikat berhasil dikosongkan.', 'info');
                },
              })
            }
            onDownloadHistoryCertificate={handleDownloadHistoryCertificate}
            canManageParticipantDb={isAnyAdminSession}
            onAdminUpsertParticipant={handleAdminUpsertParticipant}
            onRefreshParticipants={() => syncAdminCloudData(false)}
            onRequestDeleteParticipant={(participant) =>
              setConfirmState({
                open: true,
                title: 'Hapus Data Peserta dari Database?',
                description: `Data akun "${participant.displayName}" (${participant.username ? `@${participant.username}` : participant.email}) beserta riwayat skor pribadinya akan dihapus permanen.`,
                onConfirm: async () => {
                  setConfirmState((s) => ({ ...s, open: false }));
                  if (adminTokenRef.current) {
                    await fetch(`/api/participants/${encodeURIComponent(participant.uid)}`, {
                      method: 'DELETE',
                      credentials: 'same-origin',
                      headers: { 'X-Hafiz-Admin-Token': adminTokenRef.current },
                    }).catch(() => {});
                  }
                  if (isGoogleAdminVerified) {
                    await deleteParticipantFromFirestore(participant.uid).catch(() => {});
                  }
                  setParticipants((prev) => prev.filter((item) => item.uid !== participant.uid));
                  fetchPublicDirectory();
                  notify(`🗑️ Peserta "${participant.displayName}" berhasil dihapus.`, 'info');
                },
              })
            }
            onRequestClearAllParticipants={() =>
              setConfirmState({
                open: true,
                title: 'Hapus Semua Database Peserta?',
                description: `Seluruh ${participants.length} data peserta terdaftar akan dihapus permanen dari Database Peserta.`,
                onConfirm: async () => {
                  const targetUids = participants.map((p) => p.uid);
                  setConfirmState((s) => ({ ...s, open: false }));
                  if (adminTokenRef.current) {
                    await fetch('/api/participants', {
                      method: 'DELETE',
                      credentials: 'same-origin',
                      headers: { 'X-Hafiz-Admin-Token': adminTokenRef.current },
                    }).catch(() => {});
                  }
                  if (isGoogleAdminVerified) {
                    await clearAllParticipantsFromFirestore(targetUids).catch(() => {});
                  }
                  setParticipants([]);
                  setPublicDirectory([]);
                  notify('🗑️ Seluruh Database Peserta berhasil dikosongkan.', 'info');
                },
              })
            }
            onNotify={notify}
          />
        )}
      </main>

      <footer className="relative z-10 border-t border-sky-400/15 bg-[#060f22]/92 backdrop-blur-xl py-8 mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 text-xs text-slate-300">
          <div className="space-y-1">
            <p className="text-slate-200">
              © {new Date().getFullYear()} <span className="text-white font-semibold">{siteSettings.brandName}</span> · <span className="font-mono text-sky-300">hafizeducation.my.id</span>
            </p>
            <p className="text-[11px] text-slate-400">
              Didirikan oleh M. Hafiz Azzikri · MAN Insan Cendekia Jambi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <button
              type="button"
              onClick={() => {
                setPortalTab('asas-xii');
                setView('portals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-sky-200 transition"
            >
              Portal ASAS XII
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalTab('tryout-utbk');
                setView('portals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition"
            >
              Try Out UTBK
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalTab('tryout-tka');
                setView('portals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition"
            >
              Try Out TKA
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalTab('tka');
                setView('portals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition"
            >
              Modul TKA
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalTab('sma');
                setView('portals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition"
            >
              Materi X–XII
            </button>
            <button
              type="button"
              onClick={() => {
                setView('landing');
                window.setTimeout(() => {
                  document.getElementById('about-hafiz-education')?.scrollIntoView({ behavior: 'smooth' });
                }, 60);
              }}
              className="hover:text-white transition"
            >
              Tentang Founder
            </button>
            <a
              href="https://instagram.com/hafiz_education"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-sky-200 hover:text-amber-300 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              @hafiz_education
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <WardrobeModal
        open={wardrobeOpen}
        avatar={avatar}
        onChangeAvatar={setAvatar}
        onClose={() => {
          setWardrobeOpen(false);
          notify('👗 Avatar kamu tersimpan!', 'success');
        }}
      />

      <WebSettingsModal
        open={webSettingsOpen}
        settings={webSettings}
        playerName={playerName}
        playStoreUrl={siteSettings.playStoreUrl}
        appStoreUrl={siteSettings.appStoreUrl}
        microsoftStoreUrl={siteSettings.microsoftStoreUrl}
        microsoftStoreId={siteSettings.microsoftStoreId}
        onChangeSettings={setWebSettings}
        onChangePlayerName={setPlayerName}
        onResetDefaults={() => {
          setWebSettings(DEFAULT_USER_WEB_SETTINGS);
          notify('🔄 Pengaturan web dikembalikan ke setelan awal.', 'info');
        }}
        onClose={() => {
          setWebSettingsOpen(false);
          notify('⚙️ Pengaturan web berhasil disimpan!', 'success');
        }}
      />

      <ParticipantAuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        userEmail={activeParticipantIdentity}
        playerName={playerName}
        username={serverParticipant?.username || participantMeta.username}
        photoUrl={activeParticipantPhotoUrl}
        school={participantMeta.school}
        phone={participantMeta.phone}
        targetTrack={participantMeta.targetTrack}
        targetCampus={participantMeta.targetCampus}
        savedSkdSummary={participantMeta.savedSkdSummary}
        onPasswordRegister={handlePasswordRegister}
        onPasswordLogin={handlePasswordLogin}
        onGoogleLogin={handleParticipantLogin}
        onSaveProfile={handleSaveParticipantProfile}
        onOpenSkdAnalysis={() => {
          setCampusAnalysisMode('kedinasan');
          setView('campus-analysis');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={handleParticipantLogout}
        googleRecoveryMessage={googleRecoveryMessage}
        onClearGoogleRecovery={() => setGoogleRecoveryMessage('')}
        onClose={() => {
          setGoogleRecoveryMessage('');
          setAuthModalOpen(false);
        }}
      />

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <AdminGateModal
        open={adminGateOpen}
        systemPasswordPlain={systemPw.plain}
        googleAdminEmail={firebaseUser?.email ?? null}
        isGoogleAdminVerified={isGoogleAdminVerified}
        onVerify={handleVerifyAdmin}
        onGoogleAdminLogin={handleGoogleAdminLogin}
        googleRecoveryMessage={adminGoogleRecoveryMessage}
        firebaseProjectId={FIREBASE_PROJECT_ID}
        onCopyPassword={() => {
          navigator.clipboard?.writeText(systemPw.plain).catch(() => {});
          notify('📋 Password sistem disalin ke clipboard.', 'info');
        }}
        onClose={() => {
          setAdminGoogleRecoveryMessage('');
          setAdminGateOpen(false);
        }}
      />

      <AdminConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />

      <GoogleScriptModal
        open={googleScriptOpen}
        systemPasswordPlain={systemPw.plain}
        webhookUrl={webhookUrl}
        onRegeneratePassword={async () => {
          const next = await regenerateStoredSystemPassword();
          setSystemPw(next);
          try {
            const sessionToken = await fetchCsrfToken();
            await fetch('/api/admin/set-backup-hash', {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/json',
                'X-Hafiz-Token': sessionToken,
                ...(adminTokenRef.current ? { 'X-Hafiz-Admin-Token': adminTokenRef.current } : {}),
              },
              body: JSON.stringify({ backupSha256: next.hash }),
            });
          } catch {
            // ignore network error
          }
          notify(`🔄 Password Admin baru dibuat: ${next.plain}`, 'success');
        }}
        onSaveWebhook={(url) => {
          setWebhookUrl(url);
          saveWebhookUrl(url);
          notify('💾 URL Google Apps Script tersimpan!', 'success');
        }}
        onTestWebhook={async (url) => {
          if (!url.trim().endsWith('/exec')) {
            notify('Pastikan URL Web App berakhiran /exec.', 'warning');
            return;
          }
          setWebhookUrl(url);
          saveWebhookUrl(url);
          notify('🔄 Koneksi Google Apps Script disimpan & siap menyinkronkan nilai!', 'success');
        }}
        onClose={() => setGoogleScriptOpen(false)}
      />

      {/* Toast Notifications */}
      <div
        id="toast-container"
        aria-live="polite"
        className="fixed bottom-20 right-5 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const colorClass =
            t.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-400/50 text-emerald-200'
              : t.type === 'error'
                ? 'bg-rose-950/95 border-rose-400/50 text-rose-200'
                : t.type === 'warning'
                  ? 'bg-[#0b1b3a]/95 border-amber-400/50 text-amber-200'
                  : 'bg-[#0b1b3a]/95 border-sky-400/40 text-sky-100';
          return (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-2xl border shadow-2xl text-xs font-bold max-w-xs ${colorClass}`}
            >
              {t.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
