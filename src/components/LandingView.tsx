import React from 'react';
import {
  ArrowRight,
  Compass,
  Download,
  HelpCircle,
  Landmark,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  AvatarConfig,
  HistoryRecord,
  PublicParticipantProfile,
  QuizRoom,
} from '../types/quiz';
import type { LiveTeachingSession, SiteSettings } from '../firebase';
import type { PortalTab } from '../data/academicCatalog';
import { CosmicStudyStation } from './CosmicStudyStation';
import { CosmicPlaygroundHub } from './CosmicPlaygroundHub';
import { AestheticStudyStudio } from './AestheticStudyStudio';
import { BimbelCourseHub } from './BimbelCourseHub';
import { UI_TRANSLATIONS, type UserWebLanguage } from '../utils/webSettings';
import { PWAInstallButton } from './PWAInstallButton';

import type { AutoGoogleConnectStatus } from '../utils/googleOneTap';

interface LandingViewProps {
  siteSettings: SiteSettings;
  playerName: string;
  roomCodeInput: string;
  avatar: AvatarConfig;
  activeSavedRoom: QuizRoom | null;
  userEmail: string | null;
  isGoogleConnected?: boolean;
  googleAutoConnectStatus?: AutoGoogleConnectStatus;
  participantPhotoUrl?: string;
  participantSchool?: string;
  participantTargetCampus?: string;
  publicDirectory?: PublicParticipantProfile[];
  userHistory: HistoryRecord[];
  onParticipantLogin?: () => Promise<void>;
  onOpenParticipantAuth?: (mode?: 'register' | 'login' | 'profile') => void;
  onParticipantLogout: () => Promise<void>;
  onDownloadCertificate: (rec: HistoryRecord) => void;
  onDeleteHistoryItem?: (rec: HistoryRecord) => void;
  onClearAllHistory?: () => void;
  onPlayerNameChange: (val: string) => void;
  onRoomCodeChange: (val: string) => void;
  onJoinRoom: () => void;
  onFillSavedRoom: () => void;
  onOpenWardrobe: () => void;
  onOpenTutorial: () => void;
  onOpenPortals: (tab: PortalTab) => void;
  onOpenCampusAnalysis?: (mode?: 'utbk' | 'kedinasan') => void;
  onOpenWebSettings?: () => void;
  language?: UserWebLanguage;
  onRandomizeAvatar: () => void;
  onPreviewLobbyDemo: () => void;
  isAdmin?: boolean;
  uploadedRooms?: QuizRoom[];
  liveSessions?: LiveTeachingSession[];
  onLaunchQuizRoom?: (room: QuizRoom) => void;
  onEditUploadedRoom?: (room: QuizRoom) => void;
  onDeleteUploadedRoom?: (room: QuizRoom) => void;
  onUploadFounderPhoto?: (file: File) => void;
}

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.39 0 3.41 2.65 1.49 6.51l3.66 2.84C6.01 6.77 8.77 5 12 5z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.72-4.92 3.72-8.69z"
    />
    <path
      fill="#FBBC05"
      d="M5.15 14.65c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.63H1.49C.54 9.52 0 11.65 0 13.9c0 2.25.54 4.38 1.49 6.27l3.66-2.84z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.08.72-2.45 1.16-4.23 1.16-3.23 0-5.99-2.18-6.97-5.13l-3.66 2.84C3.41 21.35 7.39 24 12 24z"
    />
  </svg>
);

export const LandingView: React.FC<LandingViewProps> = ({
  siteSettings,
  playerName,
  roomCodeInput,
  userEmail,
  isGoogleConnected = false,
  googleAutoConnectStatus = 'idle',
  participantPhotoUrl = '',
  participantSchool = '',
  participantTargetCampus = '',
  publicDirectory = [],
  userHistory,
  onParticipantLogin,
  onOpenParticipantAuth,
  onParticipantLogout,
  onDownloadCertificate,
  onDeleteHistoryItem,
  onClearAllHistory,
  onPlayerNameChange,
  onRoomCodeChange,
  onJoinRoom,
  onOpenWardrobe,
  onOpenTutorial,
  onOpenPortals,
  onOpenCampusAnalysis,
  onOpenWebSettings,
  language = 'id',
  onPreviewLobbyDemo,
  isAdmin = false,
  uploadedRooms = [],
  liveSessions = [],
  onLaunchQuizRoom,
  onEditUploadedRoom,
  onDeleteUploadedRoom,
  onUploadFounderPhoto,
}) => {
  const t = UI_TRANSLATIONS[language];

  return (
    <section id="view-landing" className="space-y-12 sm:space-y-14">
      {siteSettings.announcement.trim() && (
        <div
          id="site-announcement-banner"
          className="px-5 py-3 rounded-2xl bg-[#0b1a38]/90 border border-sky-400/25 text-center text-xs sm:text-sm font-medium text-sky-100 tracking-wide backdrop-blur-md"
        >
          {siteSettings.announcement}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Hero Intro, Shortcuts & App Distribution */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-sky-300 tracking-wide uppercase">
              <span>{siteSettings.heroTagline}</span>
              <span className="mx-2 text-sky-500/60">·</span>
              <span className="font-hud text-[11px] text-amber-300 normal-case">
                hafizeducation.my.id
              </span>
            </p>

            <h1 className="font-display text-3xl sm:text-5xl lg:text-[52px] font-bold tracking-tight leading-[1.06] text-balance">
              <span className="text-gold-gradient">{siteSettings.heroTitle}</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              {siteSettings.heroDescription}
            </p>
          </div>

          {/* Architectural 3-Step Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-sky-400/15 py-4">
            <div className="space-y-1">
              <p className="font-hud text-[11px] font-semibold text-sky-400 tabular-nums">01.</p>
              <p className="font-display text-xs sm:text-sm font-bold text-white">
                {language === 'en' ? 'Sign In & Profile' : 'Daftar & Profil'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                {language === 'en'
                  ? 'Continue via Google or create a student account in seconds'
                  : 'Masuk dengan Google atau buat akun peserta dalam hitungan detik'}
              </p>
            </div>
            <div className="space-y-1 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-sky-400/15 sm:pl-4">
              <p className="font-hud text-[11px] font-semibold text-teal-300 tabular-nums">02.</p>
              <p className="font-display text-xs sm:text-sm font-bold text-white">
                {language === 'en' ? 'Enter Room Code' : 'Masuk Kode Room'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                {language === 'en'
                  ? 'Join the Quiz Lobby together in real-time'
                  : 'Bergabung ke Lobi Kuis real-time bersama peserta lain'}
              </p>
            </div>
            <div className="space-y-1 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-sky-400/15 sm:pl-4">
              <p className="font-hud text-[11px] font-semibold text-amber-300 tabular-nums">03.</p>
              <p className="font-display text-xs sm:text-sm font-bold text-white">
                {language === 'en' ? 'Podium & Certificate' : 'Podium & Sertifikat'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                {language === 'en'
                  ? 'Live leaderboard & official HD E-Certificate'
                  : 'Peringkat langsung & E-Sertifikat resmi HD'}
              </p>
            </div>
          </div>

          {onOpenCampusAnalysis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-landing-campus-analysis"
                onClick={() => onOpenCampusAnalysis('utbk')}
                className="glass-card cosmic-portal-card py-3.5 px-4 rounded-2xl text-left flex items-center justify-between gap-2.5 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0 text-sky-300">
                    <Compass className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">Analisis Kampus UTBK</p>
                    <p className="text-[10px] text-sky-200/80 font-medium">Simulasi 7 Subtes PTN</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
              <button
                type="button"
                id="btn-landing-kedinasan-analysis"
                onClick={() => onOpenCampusAnalysis('kedinasan')}
                className="glass-card cosmic-portal-card py-3.5 px-4 rounded-2xl text-left flex items-center justify-between gap-2.5 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center shrink-0 text-teal-300">
                    <Landmark className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">Analisis Kedinasan SKD</p>
                    <p className="text-[10px] text-teal-200/80 font-medium">TWK · TIU · TKP BKN</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            </div>
          )}

          <PWAInstallButton
            variant="card"
            language={language}
            playStoreUrl={siteSettings.playStoreUrl}
            appStoreUrl={siteSettings.appStoreUrl}
            microsoftStoreUrl={siteSettings.microsoftStoreUrl}
            microsoftStoreId={siteSettings.microsoftStoreId}
          />
        </div>

        {/* Right Column: Command Deck & Participant Auth */}
        <div className="lg:col-span-6 space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onJoinRoom();
            }}
            className="hero-glow-card holo-top-beam p-6 sm:p-7 rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                  {language === 'en' ? 'Enter Quiz Room' : 'Masuk ke Room Kuis'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {language === 'en'
                    ? 'Complete your student identity to enter the Quiz Lobby'
                    : 'Lengkapi identitas peserta untuk memasuki Lobi Kuis'}
                </p>
              </div>
              <button
                type="button"
                onClick={onPreviewLobbyDemo}
                className="text-xs font-semibold text-sky-300 hover:text-amber-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition"
              >
                <span>{language === 'en' ? 'Quiz Lobby' : 'Lobi Kuis'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Unified Account Bar: Google Sign-In/Register + Non-Google Nama & Sandi */}
            <div className="p-4 rounded-2xl bg-[#09162e]/85 border border-sky-400/20 space-y-3">
              {userEmail ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs min-w-0">
                    {participantPhotoUrl ? (
                      <img
                        src={participantPhotoUrl}
                        alt={playerName || 'Foto peserta'}
                        className="w-11 h-11 rounded-xl object-cover border border-amber-300/60 shrink-0 bg-[#071124]"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-sky-500/20 border border-sky-400/35 flex items-center justify-center shrink-0 text-sky-100 font-bold">
                        {(playerName || userEmail || 'P').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-emerald-300 inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {isGoogleConnected
                            ? 'Akun Google Terhubung · Database Peserta'
                            : 'Akun Aktif · Database Peserta'}
                        </span>
                      </p>
                      <p className="text-slate-100 truncate font-medium">
                        {playerName || userEmail}
                        {participantSchool ? ` · ${participantSchool}` : ''}
                      </p>
                      {participantTargetCampus && (
                        <p className="text-[11px] text-sky-200/80 truncate">
                          Target: {participantTargetCampus}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenParticipantAuth && (
                      <button
                        type="button"
                        id="btn-landing-edit-profile-db"
                        onClick={() => onOpenParticipantAuth('profile')}
                        className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-100 font-semibold text-xs whitespace-nowrap transition"
                      >
                        Profil &amp; Foto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onParticipantLogout}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 text-rose-200 font-semibold text-xs whitespace-nowrap transition inline-flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs">
                      <p className="font-bold text-white">Akun Peserta &amp; Simpan Progres</p>
                      <p data-testid="google-autoconnect-status" className="text-[11px] text-slate-300 mt-0.5">
                        {googleAutoConnectStatus === 'connecting'
                          ? 'Menghubungkan akun Google secara otomatis...'
                          : googleAutoConnectStatus === 'prompted'
                            ? 'Pilih akun Google pada jendela otomatis di sudut layar atau klik tombol di samping.'
                            : 'Terhubung otomatis saat masuk, atau hubungkan manual dengan Google maupun Nama & Sandi.'}
                      </p>
                    </div>
                    {onParticipantLogin && (
                      <button
                        type="button"
                        id="btn-landing-google-signin"
                        onClick={() => void onParticipantLogin()}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-slate-900 font-bold text-xs whitespace-nowrap transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
                      >
                        <GoogleGIcon className="w-3.5 h-3.5" />
                        <span>Masuk / Daftar Google</span>
                      </button>
                    )}
                  </div>

                  {onOpenParticipantAuth && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-sky-400/15">
                      <span className="text-[11px] text-slate-300">Tanpa akun Google?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="btn-landing-register"
                          onClick={() => onOpenParticipantAuth('register')}
                          className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-100 font-semibold text-xs whitespace-nowrap transition"
                        >
                          Buat Akun
                        </button>
                        <button
                          type="button"
                          id="btn-landing-login-email"
                          onClick={() => onOpenParticipantAuth('login')}
                          className="px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-100 font-semibold text-xs whitespace-nowrap transition"
                        >
                          Masuk Sandi
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="input-player-name"
                  className="block text-xs font-semibold text-sky-200 mb-2"
                >
                  Nama Lengkap Peserta
                </label>
                <input
                  type="text"
                  id="input-player-name"
                  maxLength={28}
                  value={playerName}
                  onChange={(e) => onPlayerNameChange(e.target.value)}
                  placeholder="Contoh: Aisyah Putri / Hafiz"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#071124]/90 border border-sky-400/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 outline-none text-white text-sm font-medium placeholder:text-slate-400 transition"
                />
              </div>
              <div>
                <label
                  htmlFor="input-room-code"
                  className="block text-xs font-semibold text-sky-200 mb-2"
                >
                  Kode Room Kuis
                </label>
                <input
                  type="text"
                  id="input-room-code"
                  maxLength={8}
                  value={roomCodeInput}
                  onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode dari Admin"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#071124]/90 border border-sky-400/20 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 outline-none text-amber-200 text-sm font-hud font-bold uppercase tracking-widest placeholder:font-sans placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="submit"
                className="btn-gold flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Join Quiz Lobby' : 'Gabung Lobi Kuis'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenTutorial}
                className="py-3.5 px-4 rounded-2xl bg-sky-500/12 hover:bg-sky-500/22 border border-sky-400/25 text-sky-100 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap"
              >
                <HelpCircle className="w-4 h-4 text-sky-300" aria-hidden="true" />
                <span>{language === 'en' ? 'How to Play' : 'Cara Main'}</span>
              </button>
              {onOpenWebSettings && (
                <button
                  type="button"
                  id="btn-landing-web-settings"
                  onClick={onOpenWebSettings}
                  className="py-3.5 px-4 rounded-2xl bg-sky-500/12 hover:bg-sky-500/22 border border-sky-400/25 text-sky-100 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <SlidersHorizontal className="w-4 h-4 text-sky-300" aria-hidden="true" />
                  <span>{t.navSettings}</span>
                </button>
              )}
            </div>
          </form>

          {/* Personal Quiz & Certificate History */}
          {userEmail && userHistory.length > 0 && (
            <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Riwayat Nilai &amp; Sertifikat Saya ({userHistory.length})
                  </h3>
                  <span className="text-[11px] text-sky-200/80 truncate block max-w-[240px]">
                    {userEmail}
                  </span>
                </div>
                {onClearAllHistory && (
                  <button
                    type="button"
                    onClick={onClearAllHistory}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 font-semibold text-[11px] shrink-0 whitespace-nowrap transition inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Hapus Semua</span>
                  </button>
                )}
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {userHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 px-4 py-3 rounded-xl bg-[#09162e]/80 border border-sky-400/15 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{rec.quizTitle}</p>
                      <p className="text-[11px] text-slate-300 tabular-nums mt-0.5">
                        Room <span className="font-mono text-sky-300 font-semibold">{rec.roomCode}</span> · Nilai{' '}
                        <strong className="text-emerald-300">{rec.grade}</strong> · Poin{' '}
                        <strong className="text-amber-300">{rec.points}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onDownloadCertificate(rec)}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-100 font-semibold text-xs whitespace-nowrap transition inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Sertifikat</span>
                      </button>
                      {onDeleteHistoryItem && (
                        <button
                          type="button"
                          onClick={() => onDeleteHistoryItem(rec)}
                          title={`Hapus riwayat ${rec.quizTitle}`}
                          aria-label={`Hapus riwayat nilai dan sertifikat ${rec.quizTitle}`}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structured Bimbingan Belajar Course Hub */}
      <BimbelCourseHub
        playerName={playerName}
        userEmail={userEmail}
        userHistory={userHistory}
        uploadedRooms={uploadedRooms}
        liveSessions={liveSessions}
        isAdmin={isAdmin}
        onOpenPortals={onOpenPortals}
        onLaunchQuizRoom={onLaunchQuizRoom}
        onEditUploadedRoom={onEditUploadedRoom}
        onDeleteUploadedRoom={onDeleteUploadedRoom}
        onPreviewLobbyDemo={onPreviewLobbyDemo}
      />

      {/* Galeri Peserta Terdaftar — Menampilkan Foto Profil Peserta dari Database Peserta */}
      <section
        id="participant-photo-gallery"
        className="hero-glow-card holo-top-beam rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-sky-400/15 pb-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-sky-300 tracking-wide inline-flex items-center gap-1.5 uppercase">
              <Users className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
              <span>Komunitas Pelajar · Database Peserta Resmi</span>
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Galeri Profil Peserta Terdaftar ({publicDirectory.length})
            </h2>
            <p className="text-xs text-slate-300">
              Foto profil peserta yang ditambahkan melalui Database Peserta Admin maupun akun peserta tampil langsung di sini, di Lobi Kuis, dan di Podium Juara.
            </p>
          </div>
          {onOpenParticipantAuth && (
            <button
              type="button"
              id="btn-gallery-manage-profile"
              onClick={() => onOpenParticipantAuth(userEmail ? 'profile' : 'register')}
              className="px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-xs font-semibold text-sky-100 whitespace-nowrap shrink-0 transition"
            >
              {userEmail ? 'Lihat / Edit Foto Profil Saya' : 'Daftar & Pasang Foto Profil'}
            </button>
          )}
        </div>

        {publicDirectory.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#09162e]/70 border border-sky-400/15 text-center space-y-2">
            <p className="text-sm font-semibold text-sky-100">
              Belum ada peserta terdaftar di galeri saat ini.
            </p>
            <p className="text-xs text-slate-300">
              Daftar akun peserta atau tambahkan peserta beserta foto profil di Database Peserta Admin.
            </p>
          </div>
        ) : (
          <div
            data-testid="participant-gallery-grid"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5"
          >
            {publicDirectory.slice(0, 24).map((person) => {
              const isMe =
                userEmail &&
                person.displayName.trim().toLowerCase() === playerName.trim().toLowerCase();
              return (
                <div
                  key={person.uid}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-2.5 transition ${
                    isMe
                      ? 'bg-sky-500/15 border-sky-400/45 shadow-[0_8px_24px_rgba(14,165,233,0.18)]'
                      : 'bg-[#09162e]/80 border-sky-400/15 hover:border-amber-400/40'
                  }`}
                >
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt={`Foto ${person.displayName}`}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-400/45 bg-[#071124] shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/25 to-teal-500/25 border border-sky-400/30 flex items-center justify-center font-display text-lg font-bold text-sky-100 shrink-0">
                      {(person.displayName || 'P').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 w-full space-y-0.5">
                    <p className="text-xs font-bold text-white truncate">
                      {person.displayName}
                    </p>
                    <p className="text-[10px] text-sky-200/80 truncate">
                      {person.school || person.targetCampus || 'Peserta Hafiz Education'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cosmic Study Station: Pomodoro Focus Timer, Ambient Space Sound & Astronaut Rank */}
      <CosmicStudyStation
        userHistory={userHistory}
        onOpenPortalsAsas={() => onOpenPortals('asas-xii')}
        onOpenWardrobe={onOpenWardrobe}
      />

      {/* Interactive Study Playground: Speed Math, 3D Flashcards & Exam Countdown/Notes */}
      <CosmicPlaygroundHub />

      {/* Aesthetic Bimbel Studio: Interactive Formula Lab & 28-Day Study Consistency Tracker */}
      <AestheticStudyStudio userHistory={userHistory} />

      {/* About Web & Founder Hafiz Education Section */}
      <div id="about-hafiz-education" className="pt-2 scroll-mt-24">
        <div className="hero-glow-card holo-top-beam rounded-3xl p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Founder Portrait & Credentials */}
            <div className="lg:col-span-4 flex flex-col items-center text-center space-y-5 lg:border-r lg:border-sky-400/15 lg:pr-8">
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute -top-2 -left-2 w-4 h-4 border-t border-l border-sky-400/60 rounded-tl-lg" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-amber-400/60 rounded-br-lg" />
                <div className="w-40 h-48 sm:w-44 sm:h-56 rounded-2xl p-[1.5px] bg-gradient-to-br from-amber-300/80 via-sky-400/70 to-teal-400/70 shadow-2xl overflow-hidden relative">
                  <img
                    src={siteSettings.founderPhoto || '/assets/hafiz-logo.png'}
                    alt="Foto Founder Hafiz Education — M. Hafiz Azzikri"
                    className={`w-full h-full rounded-[14px] bg-[#021d1c] ${
                      siteSettings.founderPhoto ? 'object-cover object-top' : 'object-contain p-1.5'
                    }`}
                  />
                  <div aria-hidden="true" className="holo-scanline" />
                </div>
              </div>

              {isAdmin && onUploadFounderPhoto && (
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-xs font-semibold text-sky-100 transition">
                  <span>{siteSettings.founderPhoto ? 'Ganti Foto Founder' : 'Upload Foto Founder'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadFounderPhoto(f);
                    }}
                  />
                </label>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
                  Pendiri Hafiz Education
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-gold-gradient">
                  M. Hafiz Azzikri
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Pelajar di MAN Insan Cendekia Jambi
                </p>
              </div>

              <div className="w-full max-w-xs border-t border-sky-400/15 pt-4 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Nama Lengkap</span>
                  <span className="font-semibold text-white">M. Hafiz Azzikri</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Tempat, Tgl Lahir</span>
                  <span className="font-semibold text-white">Jambi, 01 Juni 2009</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Institusi</span>
                  <span className="font-semibold text-white">MAN Insan Cendekia Jambi</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-slate-400">Instagram</span>
                  <a
                    href="https://instagram.com/hafiz_education"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-amber-300 hover:text-amber-200 transition"
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
            </div>

            {/* Official About Platform, Visi & Misi */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-sky-300 tracking-wide uppercase">
                  Tentang Hafiz Education
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug text-balance">
                  Ruang Edukasi Digital &amp; Teman Belajar Pelajar Indonesia
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  <strong className="text-white">Hafiz Education</strong> adalah platform edukasi
                  dan ruang berbagi wawasan belajar yang digagas oleh{' '}
                  <strong className="text-amber-200">M. Hafiz Azzikri</strong> (lahir di Jambi, 01
                  Juni 2009), seorang pelajar{' '}
                  <strong className="text-sky-200">MAN Insan Cendekia Jambi</strong>. Website ini
                  hadir sebagai teman belajar bagi pelajar dan generasi muda untuk menemukan materi
                  pembelajaran yang terstruktur, tips strategi akademik, serta inspirasi pengembangan
                  diri agar proses belajar terasa lebih terarah, relevan, dan menyenangkan.
                </p>
              </div>

              {/* Visi */}
              <div className="p-5 rounded-2xl bg-[#09162e]/80 border border-sky-400/20 space-y-1.5">
                <h3 className="font-display text-lg font-bold text-sky-200">Visi</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Menjadi ruang edukasi digital yang inspiratif, mudah diakses, dan berdampak positif
                  dalam membantu pelajar menumbuhkan semangat belajar, berpikir kritis, serta meraih
                  prestasi akademik dan masa depan yang cemerlang.
                </p>
              </div>

              {/* Misi */}
              <div className="space-y-3">
                <h3 className="font-display text-lg font-bold text-amber-200">Misi</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-300">
                  <li className="p-4 rounded-2xl bg-[#09162e]/75 border border-sky-400/15 leading-relaxed">
                    <span className="font-hud font-bold text-sky-400 mr-1.5">01.</span>
                    Menyajikan materi pembelajaran, ringkasan konsep, dan tips belajar yang sistematis
                    serta mudah dipahami.
                  </li>
                  <li className="p-4 rounded-2xl bg-[#09162e]/75 border border-teal-400/15 leading-relaxed">
                    <span className="font-hud font-bold text-teal-300 mr-1.5">02.</span>
                    Mendorong kebiasaan belajar mandiri, disiplin, dan rasa ingin tahu yang
                    berkelanjutan di kalangan pelajar.
                  </li>
                  <li className="p-4 rounded-2xl bg-[#09162e]/75 border border-amber-400/15 leading-relaxed">
                    <span className="font-hud font-bold text-amber-300 mr-1.5">03.</span>
                    Membagikan wawasan persiapan studi lanjut, manajemen waktu, dan pengembangan
                    potensi diri.
                  </li>
                  <li className="p-4 rounded-2xl bg-[#09162e]/75 border border-emerald-400/15 leading-relaxed">
                    <span className="font-hud font-bold text-emerald-300 mr-1.5">04.</span>
                    Membangun komunitas belajar yang suportif, inklusif, dan saling menginspirasi
                    antar pelajar.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
