import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Landmark,
  Lock,
  Pencil,
  PlaySquare,
  Radio,
  Search,
  Target,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { HistoryRecord, QuizRoom } from '../types/quiz';
import type { LiveTeachingSession } from '../firebase';
import type { PortalTab } from '../data/academicCatalog';
import { getQuizScheduleStatus } from '../utils/quizSchedule';

interface BimbelCourseHubProps {
  playerName: string;
  userEmail: string | null;
  userHistory: HistoryRecord[];
  uploadedRooms?: QuizRoom[];
  liveSessions?: LiveTeachingSession[];
  isAdmin?: boolean;
  onOpenPortals: (tab: PortalTab) => void;
  onLaunchQuizRoom?: (room: QuizRoom) => void;
  onEditUploadedRoom?: (room: QuizRoom) => void;
  onDeleteUploadedRoom?: (room: QuizRoom) => void;
  onPreviewLobbyDemo: () => void;
}

type BimbelTrackId =
  | 'utbk'
  | 'kedinasan'
  | 'kelas-12'
  | 'kelas-11'
  | 'kelas-10'
  | 'tka-saintek'
  | 'tka-soshum'
  | 'asas-12';

interface BimbelSubjectCard {
  id: string;
  name: string;
  chapters: string;
  tag: string;
  portalTab: PortalTab;
  accentBg: string;
  accentText: string;
  badgeText: string;
}

interface BimbelTrackConfig {
  id: BimbelTrackId;
  label: string;
  shortLabel: string;
  subtitle: string;
  primaryPortal: PortalTab;
  primaryCta: string;
  subjects: BimbelSubjectCard[];
}

const BIMBEL_TRACKS: BimbelTrackConfig[] = [
  {
    id: 'utbk',
    label: 'UTBK & SNBT',
    shortLabel: 'UTBK-SNBT',
    subtitle: 'Persiapan masuk PTN favorit: TPS, Literasi Bahasa & Penalaran Matematika.',
    primaryPortal: 'tryout-utbk',
    primaryCta: 'Mulai Try Out UTBK',
    subjects: [
      {
        id: 'utbk-pu',
        name: 'Penalaran Umum (TPS)',
        chapters: '12 Topik · Latihan HOTS',
        tag: 'Try Out & Pembahasan',
        portalTab: 'tryout-utbk',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'PU',
      },
      {
        id: 'utbk-pk',
        name: 'Pengetahuan Kuantitatif',
        chapters: '14 Topik · Rumus Cepat',
        tag: 'Drilling Soal',
        portalTab: 'tryout-utbk',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'PK',
      },
      {
        id: 'utbk-pm',
        name: 'Penalaran Matematika',
        chapters: '10 Topik · Studi Kasus',
        tag: 'Simulasi SNBT',
        portalTab: 'tryout-utbk',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'PM',
      },
      {
        id: 'utbk-lit',
        name: 'Literasi Bahasa ID & EN',
        chapters: '16 Topik · Analisis Teks',
        tag: 'Pemahaman Bacaan',
        portalTab: 'tryout-utbk',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'LIT',
      },
    ],
  },
  {
    id: 'kedinasan',
    label: 'Kedinasan (SKD)',
    shortLabel: 'Kedinasan',
    subtitle: 'Persiapan Sekolah Kedinasan (STAN, STIS, IPDN, STIN): Try Out SKD, Modul TWK/TIU/TKP & Video.',
    primaryPortal: 'kedinasan',
    primaryCta: 'Buka Portal Kedinasan',
    subjects: [
      {
        id: 'ked-twk',
        name: 'TWK (Wawasan Kebangsaan)',
        chapters: 'Pancasila · UUD 1945 · NKRI',
        tag: 'Modul & Video',
        portalTab: 'kedinasan',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'TWK',
      },
      {
        id: 'ked-tiu',
        name: 'TIU (Intelegensia Umum)',
        chapters: 'Verbal · Numerik · Figural',
        tag: 'Drilling SKD',
        portalTab: 'kedinasan',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'TIU',
      },
      {
        id: 'ked-tkp',
        name: 'TKP (Karakteristik Pribadi)',
        chapters: 'Pelayanan · Jejaring · Profesionalisme',
        tag: 'Strategi Skor 5',
        portalTab: 'kedinasan',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'TKP',
      },
      {
        id: 'ked-to',
        name: 'Try Out Akbar Kedinasan',
        chapters: 'Simulasi Passing Grade SKD',
        tag: 'Try Out Resmi',
        portalTab: 'kedinasan',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'SKD',
      },
    ],
  },
  {
    id: 'kelas-12',
    label: 'Kelas XII SMA',
    shortLabel: 'Kelas XII',
    subtitle: 'Pendalaman materi kelas akhir, persiapan ASAS XII, dan kelulusan SMA/MA.',
    primaryPortal: 'sma',
    primaryCta: 'Buka Ruang Belajar XII',
    subjects: [
      {
        id: 'k12-mtk',
        name: 'Matematika Kelas XII',
        chapters: 'Dimensi Tiga · Statistika · Peluang',
        tag: 'Ringkasan & Kuis',
        portalTab: 'sma',
        accentBg: 'bg-indigo-500/15 border-indigo-400/35',
        accentText: 'text-indigo-200',
        badgeText: 'MTK',
      },
      {
        id: 'k12-fis',
        name: 'Fisika Kelas XII',
        chapters: 'Listrik · Medan Magnet · Fisika Modern',
        tag: 'Rumus & Latihan',
        portalTab: 'sma',
        accentBg: 'bg-indigo-500/15 border-indigo-400/35',
        accentText: 'text-indigo-200',
        badgeText: 'FIS',
      },
      {
        id: 'k12-kim',
        name: 'Kimia Kelas XII',
        chapters: 'Sifat Koligatif · Redoks · Organik',
        tag: 'Modul Lengkap',
        portalTab: 'sma',
        accentBg: 'bg-indigo-500/15 border-indigo-400/35',
        accentText: 'text-indigo-200',
        badgeText: 'KIM',
      },
      {
        id: 'k12-bio',
        name: 'Biologi Kelas XII',
        chapters: 'Metabolisme · Genetika · Evolusi',
        tag: 'Konsep & Evaluasi',
        portalTab: 'sma',
        accentBg: 'bg-indigo-500/15 border-indigo-400/35',
        accentText: 'text-indigo-200',
        badgeText: 'BIO',
      },
    ],
  },
  {
    id: 'kelas-11',
    label: 'Kelas XI SMA',
    shortLabel: 'Kelas XI',
    subtitle: 'Kuasai materi inti kelas XI dengan rangkuman konsep dan latihan terarah.',
    primaryPortal: 'sma',
    primaryCta: 'Buka Ruang Belajar XI',
    subjects: [
      {
        id: 'k11-mtk',
        name: 'Matematika Kelas XI',
        chapters: 'Matriks · Turunan · Integral',
        tag: 'Ringkasan & Kuis',
        portalTab: 'sma',
        accentBg: 'bg-emerald-500/15 border-emerald-400/35',
        accentText: 'text-emerald-200',
        badgeText: 'MTK',
      },
      {
        id: 'k11-fis',
        name: 'Fisika Kelas XI',
        chapters: 'Fluida · Termodinamika · Gelombang',
        tag: 'Rumus Cepat',
        portalTab: 'sma',
        accentBg: 'bg-emerald-500/15 border-emerald-400/35',
        accentText: 'text-emerald-200',
        badgeText: 'FIS',
      },
      {
        id: 'k11-kim',
        name: 'Kimia Kelas XI',
        chapters: 'Termokimia · Laju Reaksi · Asam Basa',
        tag: 'Latihan Soal',
        portalTab: 'sma',
        accentBg: 'bg-emerald-500/15 border-emerald-400/35',
        accentText: 'text-emerald-200',
        badgeText: 'KIM',
      },
      {
        id: 'k11-eko',
        name: 'Ekonomi & Soshum XI',
        chapters: 'Pendapatan Nasional · APBN · Inflasi',
        tag: 'Studi Kasus',
        portalTab: 'sma',
        accentBg: 'bg-emerald-500/15 border-emerald-400/35',
        accentText: 'text-emerald-200',
        badgeText: 'EKO',
      },
    ],
  },
  {
    id: 'kelas-10',
    label: 'Kelas X SMA',
    shortLabel: 'Kelas X',
    subtitle: 'Fondasi kuat Kurikulum Merdeka untuk semua mata pelajaran utama kelas X.',
    primaryPortal: 'sma',
    primaryCta: 'Buka Ruang Belajar X',
    subjects: [
      {
        id: 'k10-mtk',
        name: 'Matematika Kelas X',
        chapters: 'Eksponen · Logaritma · Trigonometri',
        tag: 'Konsep Dasar',
        portalTab: 'sma',
        accentBg: 'bg-cyan-500/15 border-cyan-400/35',
        accentText: 'text-cyan-200',
        badgeText: 'MTK',
      },
      {
        id: 'k10-ipa',
        name: 'IPA Terpadu (Fisika & Kimia)',
        chapters: 'Pengukuran · Struktur Atom · Energi',
        tag: 'Modul Interaktif',
        portalTab: 'sma',
        accentBg: 'bg-cyan-500/15 border-cyan-400/35',
        accentText: 'text-cyan-200',
        badgeText: 'IPA',
      },
      {
        id: 'k10-bio',
        name: 'Biologi Kelas X',
        chapters: 'Virus · Keanekaragaman Hayati · Ekosistem',
        tag: 'Ringkasan Visual',
        portalTab: 'sma',
        accentBg: 'bg-cyan-500/15 border-cyan-400/35',
        accentText: 'text-cyan-200',
        badgeText: 'BIO',
      },
      {
        id: 'k10-ing',
        name: 'Bahasa Inggris & Indonesia',
        chapters: 'Teks Recount · Narrative · Eksposisi',
        tag: 'Latihan Pemahaman',
        portalTab: 'sma',
        accentBg: 'bg-cyan-500/15 border-cyan-400/35',
        accentText: 'text-cyan-200',
        badgeText: 'BHS',
      },
    ],
  },
  {
    id: 'tka-saintek',
    label: 'TKA Saintek',
    shortLabel: 'TKA Saintek',
    subtitle: 'Pendalaman khusus rumpun Sains & Teknologi standar seleksi PTN unggulan.',
    primaryPortal: 'tka',
    primaryCta: 'Buka Modul & Try Out TKA',
    subjects: [
      {
        id: 'tka-mipa',
        name: 'Matematika IPA',
        chapters: 'Limit · Kalkulus · Polinomial',
        tag: 'Modul TKA',
        portalTab: 'tka',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'MIPA',
      },
      {
        id: 'tka-fis',
        name: 'Fisika TKA',
        chapters: 'Mekanika · Listrik · Optik',
        tag: 'Try Out TKA',
        portalTab: 'tryout-tka',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'FIS',
      },
      {
        id: 'tka-kim',
        name: 'Kimia TKA',
        chapters: 'Stoikiometri · Kesetimbangan · Organik',
        tag: 'Modul TKA',
        portalTab: 'tka',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'KIM',
      },
      {
        id: 'tka-bio',
        name: 'Biologi TKA',
        chapters: 'Sel · Fisiologi · Bioteknologi',
        tag: 'Try Out TKA',
        portalTab: 'tryout-tka',
        accentBg: 'bg-sky-500/15 border-sky-400/30',
        accentText: 'text-sky-200',
        badgeText: 'BIO',
      },
    ],
  },
  {
    id: 'tka-soshum',
    label: 'TKA Soshum',
    shortLabel: 'TKA Soshum',
    subtitle: 'Materi & simulasi rumpun Sosial Humaniora: Ekonomi, Geografi, Sejarah & Sosiologi.',
    primaryPortal: 'tka',
    primaryCta: 'Buka Modul & Try Out Soshum',
    subjects: [
      {
        id: 'tka-eko',
        name: 'Ekonomi TKA',
        chapters: 'Mikro · Makro · Akuntansi',
        tag: 'Modul TKA',
        portalTab: 'tka',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'EKO',
      },
      {
        id: 'tka-geo',
        name: 'Geografi TKA',
        chapters: 'SIG · Litosfer · Kependudukan',
        tag: 'Try Out TKA',
        portalTab: 'tryout-tka',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'GEO',
      },
      {
        id: 'tka-sej',
        name: 'Sejarah TKA',
        chapters: 'Nusantara · Pergerakan · Dunia',
        tag: 'Modul TKA',
        portalTab: 'tka',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'SEJ',
      },
      {
        id: 'tka-sos',
        name: 'Sosiologi TKA',
        chapters: 'Interaksi · Stratifikasi · Perubahan Sosial',
        tag: 'Try Out TKA',
        portalTab: 'tryout-tka',
        accentBg: 'bg-teal-500/15 border-teal-400/35',
        accentText: 'text-teal-200',
        badgeText: 'SOS',
      },
    ],
  },
  {
    id: 'asas-12',
    label: 'Portal ASAS XII',
    shortLabel: 'ASAS XII',
    subtitle: 'Asesmen Sumatif Akhir Semester XII, rekap nilai, dan unduh E-Sertifikat resmi HD.',
    primaryPortal: 'asas-xii',
    primaryCta: 'Buka Portal ASAS XII',
    subjects: [
      {
        id: 'asas-paket',
        name: 'Paket Ujian ASAS XII',
        chapters: 'Simulasi Berwaktu · Anti-Curang',
        tag: 'Evaluasi Resmi',
        portalTab: 'asas-xii',
        accentBg: 'bg-amber-500/15 border-amber-400/35',
        accentText: 'text-amber-200',
        badgeText: 'ASAS',
      },
      {
        id: 'asas-riwayat',
        name: 'Riwayat Nilai & Analisis',
        chapters: 'Rekap Skor & Peringkat',
        tag: 'Rapor Digital',
        portalTab: 'asas-xii',
        accentBg: 'bg-amber-500/15 border-amber-400/35',
        accentText: 'text-amber-200',
        badgeText: 'RAPOR',
      },
      {
        id: 'asas-sertif',
        name: 'E-Sertifikat Prestasi HD',
        chapters: 'Siap Cetak · Nomor Unik',
        tag: 'Unduh PNG',
        portalTab: 'asas-xii',
        accentBg: 'bg-amber-500/15 border-amber-400/35',
        accentText: 'text-amber-200',
        badgeText: 'CERT',
      },
      {
        id: 'asas-bahas',
        name: 'Pembahasan Lengkap A–E',
        chapters: 'Solusi Langkah demi Langkah',
        tag: 'Review Mandiri',
        portalTab: 'asas-xii',
        accentBg: 'bg-amber-500/15 border-amber-400/35',
        accentText: 'text-amber-200',
        badgeText: 'BAHAS',
      },
    ],
  },
];

export const BimbelCourseHub: React.FC<BimbelCourseHubProps> = ({
  playerName,
  userEmail,
  userHistory,
  uploadedRooms = [],
  liveSessions = [],
  isAdmin = false,
  onOpenPortals,
  onLaunchQuizRoom,
  onEditUploadedRoom,
  onDeleteUploadedRoom,
  onPreviewLobbyDemo,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<BimbelTrackId>('utbk');
  const [searchQuery, setSearchQuery] = useState('');

  const activeTrack = useMemo(
    () => BIMBEL_TRACKS.find((t) => t.id === selectedTrackId) ?? BIMBEL_TRACKS[0],
    [selectedTrackId]
  );

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeTrack.subjects;
    return BIMBEL_TRACKS.flatMap((t) => t.subjects).filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.chapters.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q)
    );
  }, [activeTrack, searchQuery]);

  const livePublishedRooms = useMemo(() => {
    const valid = uploadedRooms.filter((r) => r.questions.length > 0);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return valid.slice(0, 6);
    return valid.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
    );
  }, [uploadedRooms, searchQuery]);

  const featuredLiveSession = useMemo(
    () => liveSessions.find((s) => s.isLive) ?? liveSessions[0] ?? null,
    [liveSessions]
  );

  const weeklyTarget = 5;
  const weeklyPct = Math.min(100, Math.round((userHistory.length / weeklyTarget) * 100));

  const avgGrade = useMemo(() => {
    if (userHistory.length === 0) return 0;
    const sum = userHistory.reduce((acc, rec) => acc + (rec.grade || 0), 0);
    return Math.round(sum / userHistory.length);
  }, [userHistory]);

  const totalPoints = useMemo(
    () => userHistory.reduce((acc, rec) => acc + (rec.points || 0), 0),
    [userHistory]
  );

  return (
    <section id="bimbel-course-hub" className="pt-2 space-y-6">
      <div className="hero-glow-card holo-top-beam rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sky-400/15 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-300 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Ruang Belajar · Bimbingan Belajar Digital Hafiz Education</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {playerName.trim()
                ? `Mau belajar apa hari ini, ${playerName.trim()}?`
                : 'Pilih Jenjang & Mulai Belajar Terstruktur'}
            </h2>
            <p className="text-xs text-slate-300">
              {userEmail
                ? 'Akun Peserta aktif · Seluruh ruang belajar, try out, dan rapor nilai tersinkron ke cloud.'
                : 'Masuk dengan Google atau buat akun peserta di atas untuk membuka seluruh paket Try Out, Modul TKA, dan E-Sertifikat.'}
            </p>
          </div>

          {/* Student Learning Metrics */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="px-3.5 py-2.5 rounded-2xl bg-[#09162e]/85 border border-sky-400/20 text-center">
              <p className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider">
                Kuis Selesai
              </p>
              <p className="font-hud text-lg font-bold text-white tabular-nums mt-0.5">
                {userHistory.length}
              </p>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-[#09162e]/85 border border-emerald-400/20 text-center">
              <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                Rata-rata
              </p>
              <p className="font-hud text-lg font-bold text-emerald-200 tabular-nums mt-0.5">
                {avgGrade}%
              </p>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-[#09162e]/85 border border-amber-400/20 text-center">
              <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                Total Poin
              </p>
              <p className="font-hud text-lg font-bold text-amber-200 tabular-nums mt-0.5">
                {totalPoints}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar & Weekly Progress Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-7 relative">
            <Search
              className="w-4 h-4 text-sky-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran, bab (Kalkulus, TWK, SKD), atau judul Try Out..."
              aria-label="Cari materi atau paket Try Out"
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#071124]/90 border border-sky-400/20 focus:border-sky-400 outline-none text-xs sm:text-sm text-white placeholder-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="lg:col-span-5 px-4 py-2.5 rounded-2xl bg-[#09162e]/85 border border-sky-400/20 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-sky-100 inline-flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
                <span>Target Belajar Mingguan</span>
              </span>
              <span className="text-amber-300 tabular-nums">
                {Math.min(userHistory.length, weeklyTarget)}/{weeklyTarget} Paket ({weeklyPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-300 to-amber-400 transition-all duration-500"
                style={{ width: `${Math.max(6, weeklyPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Teaching Highlight Banner */}
        {featuredLiveSession && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/90 via-[#0c1d3d] to-teal-950/85 border border-sky-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-rose-300">
                {featuredLiveSession.isLive ? (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" aria-hidden="true" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-rose-300" aria-hidden="true" />
                )}
                <span>
                  {featuredLiveSession.isLive
                    ? 'SEDANG LIVE TEACHING (ZOOM)'
                    : 'JADWAL LIVE TEACHING TERDEKAT'}{' '}
                  · {featuredLiveSession.category}
                </span>
              </div>
              <p className="text-sm font-bold text-white">{featuredLiveSession.title}</p>
              <p className="text-[11px] text-sky-200/80">
                Mentor: {featuredLiveSession.tutorName} · {featuredLiveSession.scheduleLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPortals('live-teaching')}
              className="btn-gold px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition inline-flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Masuk Kelas Live</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Program Selector Bar */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-sky-300">Pilih Jenjang / Program Belajar</p>
          <div
            role="tablist"
            aria-label="Pilih Jenjang Bimbingan Belajar"
            className="flex flex-wrap gap-1.5"
          >
            {BIMBEL_TRACKS.map((track) => {
              const isSelected = track.id === activeTrack.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedTrackId(track.id);
                    setSearchQuery('');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-500 border-sky-300 text-white font-bold shadow-[0_6px_18px_rgba(14,165,233,0.3)]'
                      : 'bg-[#09162e]/80 border-sky-400/20 text-slate-300 hover:text-white hover:border-sky-400/45'
                  }`}
                >
                  {track.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Track Banner & Subject Grid */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-[#09162e]/85 border border-sky-400/20">
            <div>
              <p className="text-xs font-bold text-sky-200">{activeTrack.label}</p>
              <p className="text-xs text-slate-300 mt-0.5">{activeTrack.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPortals(activeTrack.primaryPortal)}
              className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <span>{activeTrack.primaryCta}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div
            data-testid="bimbel-subjects-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {filteredSubjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => onOpenPortals(subject.portalTab)}
                className="glass-card cosmic-portal-card p-5 rounded-2xl text-left flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`px-2.5 py-1 rounded-lg border font-hud text-[11px] font-bold tracking-wider ${subject.accentBg} ${subject.accentText}`}
                    >
                      {subject.badgeText}
                    </div>
                    <span className="text-[11px] font-medium text-teal-300/90">{subject.tag}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-white group-hover:text-sky-200 transition leading-snug">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{subject.chapters}</p>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-sky-400/15">
                  <span className="text-xs font-semibold text-amber-300">Mulai Belajar</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-1 transition"
                    aria-hidden="true"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Live Uploaded Try Out & Quiz Packages */}
          {livePublishedRooms.length > 0 && (
            <div className="pt-4 space-y-3.5 border-t border-sky-400/15">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    Paket Kuis &amp; Try Out Aktif dari Admin
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Langsung kerjakan paket soal resmi atau pantau jadwal buka otomatisnya
                  </p>
                </div>
                <span className="text-xs font-semibold text-sky-300 tabular-nums">
                  {livePublishedRooms.length} Paket
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {livePublishedRooms.map((room) => {
                  const sched = getQuizScheduleStatus(room.openAt, Date.now(), room.closeAt);
                  return (
                    <div
                      key={room.code}
                      className="glass-card p-4 rounded-2xl flex flex-col justify-between space-y-3 border border-sky-400/20"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-sky-300">
                            {room.category || 'Umum'}
                          </span>
                          <span className="font-mono text-amber-300 font-bold">{room.code}</span>
                        </div>
                        <h4 className="font-display text-sm sm:text-base font-bold text-white leading-snug">
                          {room.title}
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          {room.questions.length} Soal · Pembahasan A–E · E-Sertifikat HD
                        </p>
                        {sched.isClosed ? (
                          <p className="text-[11px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>Ditutup {sched.formattedCloseDate}</span>
                          </p>
                        ) : sched.isNotYetOpen ? (
                          <p className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>
                              Dibuka {sched.formattedDate} ({sched.countdownLabel})
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-emerald-300 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>
                              Tersedia Sekarang
                              {sched.formattedCloseDate ? ` · Tutup ${sched.formattedCloseDate}` : ''}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={sched.isLocked && !isAdmin}
                          onClick={() => onLaunchQuizRoom?.(room)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 ${
                            sched.isLocked && !isAdmin
                              ? sched.isClosed
                                ? 'bg-slate-900 border border-rose-400/25 text-rose-200/80 cursor-not-allowed'
                                : 'bg-slate-900 border border-amber-400/25 text-amber-200/80 cursor-not-allowed'
                              : 'btn-gold'
                          }`}
                        >
                          {sched.isClosed ? (
                            isAdmin ? (
                              <>
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Preview Admin (Ditutup)</span>
                              </>
                            ) : (
                              <span>Soal Sudah Ditutup</span>
                            )
                          ) : sched.isNotYetOpen ? (
                            isAdmin ? (
                              <>
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Preview Admin</span>
                              </>
                            ) : (
                              <span>Dibuka {sched.formattedDate}</span>
                            )
                          ) : (
                            <>
                              <span>Masuk Lobi Kuis</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </>
                          )}
                        </button>
                        {isAdmin && onEditUploadedRoom && (
                          <button
                            type="button"
                            onClick={() => onEditUploadedRoom(room)}
                            title="Edit soal & jadwal paket ini"
                            aria-label={`Edit soal ${room.title}`}
                            className="px-3 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-100 text-xs font-semibold transition shrink-0 inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                        )}
                        {isAdmin && onDeleteUploadedRoom && (
                          <button
                            type="button"
                            onClick={() => onDeleteUploadedRoom(room)}
                            title="Hapus paket soal ini"
                            aria-label={`Hapus paket soal ${room.title}`}
                            className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 transition shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick-Access Bimbel Facilities Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-sky-400/15">
          <button
            type="button"
            onClick={() => onOpenPortals('live-teaching')}
            className="px-4 py-3.5 rounded-2xl bg-[#09162e]/80 hover:bg-sky-950/80 border border-sky-400/20 hover:border-sky-400/45 text-left transition flex items-start gap-2.5"
          >
            <Video className="w-4 h-4 text-sky-300 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white">Live Teaching Zoom</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Kelas Langsung Bersama Mentor</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onOpenPortals('kedinasan')}
            className="px-4 py-3.5 rounded-2xl bg-[#09162e]/80 hover:bg-teal-950/75 border border-teal-400/20 hover:border-teal-400/45 text-left transition flex items-start gap-2.5"
          >
            <Landmark className="w-4 h-4 text-teal-300 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white">Portal Kedinasan</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Try Out SKD, Modul &amp; Video</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onOpenPortals('sma')}
            className="px-4 py-3.5 rounded-2xl bg-[#09162e]/80 hover:bg-amber-950/45 border border-amber-400/20 hover:border-amber-400/45 text-left transition flex items-start gap-2.5"
          >
            <PlaySquare className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white">Materi X–XII (Video &amp; PPT)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Video YouTube, Slide &amp; Rumus</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onPreviewLobbyDemo}
            className="px-4 py-3.5 rounded-2xl bg-[#09162e]/80 hover:bg-emerald-950/60 border border-emerald-400/20 hover:border-emerald-400/45 text-left transition flex items-start gap-2.5"
          >
            <Users className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white">Lobi Kuis Multiplayer</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Belajar Bareng dengan Avatar</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
