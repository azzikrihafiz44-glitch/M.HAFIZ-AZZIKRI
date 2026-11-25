import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity,
  BookmarkCheck,
  Bookmark,
  Check,
  Flame,
  Headphones,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  VolumeX,
} from 'lucide-react';
import type { HistoryRecord } from '../types/quiz';
import {
  DEFAULT_DAILY_ROUTINES,
  FORMULA_VAULT_CATALOG,
  STUDY_QUOTES,
  buildStudyHeatmap28Days,
  evaluateFormulaLab,
  filterFormulaCatalog,
  formatLocalDateKey,
  getDefaultSliderValues,
  type DailyRoutineBlock,
  type FormulaEntry,
  type FormulaSubject,
  type StudyLogEntry,
} from '../utils/aestheticStudyHub';

interface AestheticStudyStudioProps {
  userHistory: HistoryRecord[];
}

type StudioTab = 'formulas' | 'tracker';
type SoundscapeMode = 'off' | 'rain' | 'pad';

const SUBJECT_FILTERS: Array<FormulaSubject | 'Semua'> = [
  'Semua',
  'Matematika',
  'Fisika',
  'Kimia',
  'TPS & UTBK',
  'SKD Kedinasan',
];

const LOG_SUBJECT_OPTIONS: Array<FormulaSubject | 'Umum'> = [
  'TPS & UTBK',
  'Matematika',
  'Fisika',
  'Kimia',
  'SKD Kedinasan',
  'Umum',
];

const DURATION_OPTIONS = [15, 25, 45, 60, 90];

const STORAGE_MASTERED_FORMULAS = 'hafiz_mastered_formulas_v1';
const STORAGE_STUDY_LOGS = 'hafiz_study_logs_v1';
const STORAGE_DAILY_ROUTINES = 'hafiz_daily_routines_v1';

export const AestheticStudyStudio: React.FC<AestheticStudyStudioProps> = ({ userHistory }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('formulas');

  // --- Tab 1: Formula Vault & Interactive Lab ---
  const [subjectFilter, setSubjectFilter] = useState<FormulaSubject | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(FORMULA_VAULT_CATALOG[0].id);
  const [sliderMap, setSliderMap] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    for (const item of FORMULA_VAULT_CATALOG) {
      initial[item.id] = getDefaultSliderValues(item);
    }
    return initial;
  });
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MASTERED_FORMULAS);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  const filteredFormulas = useMemo(
    () => filterFormulaCatalog(FORMULA_VAULT_CATALOG, subjectFilter, searchQuery),
    [subjectFilter, searchQuery]
  );

  const activeFormula: FormulaEntry = useMemo(() => {
    return (
      filteredFormulas.find((f) => f.id === selectedFormulaId) ||
      filteredFormulas[0] ||
      FORMULA_VAULT_CATALOG.find((f) => f.id === selectedFormulaId) ||
      FORMULA_VAULT_CATALOG[0]
    );
  }, [filteredFormulas, selectedFormulaId]);

  const activeSliders = sliderMap[activeFormula.id] || getDefaultSliderValues(activeFormula);
  const labResult = useMemo(
    () => evaluateFormulaLab(activeFormula.id, activeSliders),
    [activeFormula.id, activeSliders]
  );

  const toggleMastered = (formulaId: string) => {
    setMasteredIds((prev) => {
      const next = prev.includes(formulaId)
        ? prev.filter((id) => id !== formulaId)
        : [...prev, formulaId];
      try {
        localStorage.setItem(STORAGE_MASTERED_FORMULAS, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleSliderChange = (sliderId: string, nextVal: number) => {
    setSliderMap((prev) => ({
      ...prev,
      [activeFormula.id]: {
        ...(prev[activeFormula.id] || getDefaultSliderValues(activeFormula)),
        [sliderId]: nextVal,
      },
    }));
  };

  const handleResetActiveSliders = () => {
    setSliderMap((prev) => ({
      ...prev,
      [activeFormula.id]: getDefaultSliderValues(activeFormula),
    }));
  };

  // --- Tab 2: 28-Day Consistency Heatmap & Daily Aesthetic Routine ---
  const [studyLogs, setStudyLogs] = useState<StudyLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_STUDY_LOGS);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? (parsed as StudyLogEntry[]) : [];
    } catch {
      return [];
    }
  });

  const [routines, setRoutines] = useState<DailyRoutineBlock[]>(() => {
    try {
      const todayKey = formatLocalDateKey(new Date());
      const raw = localStorage.getItem(STORAGE_DAILY_ROUTINES);
      if (raw) {
        const parsed = JSON.parse(raw) as { dateKey?: string; items?: DailyRoutineBlock[] };
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          if (parsed.dateKey === todayKey) {
            return parsed.items;
          }
          // New day: preserve custom list, reset done flags cleanly
          return parsed.items.map((item) => ({ ...item, done: false }));
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_DAILY_ROUTINES;
  });

  const [logSubject, setLogSubject] = useState<FormulaSubject | 'Umum'>('TPS & UTBK');
  const [logMinutes, setLogMinutes] = useState<number>(25);
  const [logNote, setLogNote] = useState('');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineMinutes, setNewRoutineMinutes] = useState(20);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => formatLocalDateKey(new Date()));
  const [quoteIdx, setQuoteIdx] = useState<number>(0);

  // Soundscape Web Audio state
  const [soundMode, setSoundMode] = useState<SoundscapeMode>('off');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const stopSoundscape = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    setSoundMode('off');
  };

  const handleSelectSoundscape = (mode: SoundscapeMode) => {
    if (mode === soundMode || mode === 'off') {
      stopSoundscape();
      return;
    }
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setSoundMode('off');
        return;
      }
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.045, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (mode === 'rain') {
        // Gentle filtered pink-ish rain noise
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < bufferSize; i += 1) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.06;
        }
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(780, ctx.currentTime);

        source.connect(lowpass);
        lowpass.connect(masterGain);
        source.start();

        stopAudioRef.current = () => {
          try {
            source.stop();
            source.disconnect();
            lowpass.disconnect();
            masterGain.disconnect();
          } catch {
            // ignore cleanup errors
          }
        };
      } else {
        // Warm cosmic lo-fi triad drone (C4 - G4 - D5 soft sine)
        const freqs = [130.81, 196.0, 293.66];
        const oscs = freqs.map((freq) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.28, ctx.currentTime);
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          return { osc, g };
        });

        stopAudioRef.current = () => {
          for (const node of oscs) {
            try {
              node.osc.stop();
              node.osc.disconnect();
              node.g.disconnect();
            } catch {
              // ignore
            }
          }
          try {
            masterGain.disconnect();
          } catch {
            // ignore
          }
        };
      }
      setSoundMode(mode);
    } catch {
      setSoundMode('off');
    }
  };

  const persistLogs = (next: StudyLogEntry[]) => {
    setStudyLogs(next);
    try {
      localStorage.setItem(STORAGE_STUDY_LOGS, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const persistRoutines = (next: DailyRoutineBlock[]) => {
    setRoutines(next);
    try {
      localStorage.setItem(
        STORAGE_DAILY_ROUTINES,
        JSON.stringify({ dateKey: formatLocalDateKey(new Date()), items: next })
      );
    } catch {
      // ignore
    }
  };

  const handleAddStudyLog = (e: React.FormEvent) => {
    e.preventDefault();
    const todayKey = formatLocalDateKey(new Date());
    const entry: StudyLogEntry = {
      id: `log-${Date.now()}`,
      dateKey: todayKey,
      subject: logSubject,
      minutes: logMinutes,
      note: logNote.trim() || `Sesi fokus ${logSubject}`,
    };
    persistLogs([entry, ...studyLogs].slice(0, 80));
    setSelectedDayKey(todayKey);
    setLogNote('');
  };

  const handleDeleteStudyLog = (id: string) => {
    persistLogs(studyLogs.filter((l) => l.id !== id));
  };

  const handleToggleRoutine = (id: string) => {
    const next = routines.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
    const justCompletedAll = next.length > 0 && next.every((item) => item.done);
    persistRoutines(next);
    if (justCompletedAll) {
      try {
        void confetti({ particleCount: 55, spread: 68, origin: { y: 0.72 } });
      } catch {
        // ignore headless confetti fallback
      }
    }
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoutineTitle.trim();
    if (!trimmed) return;
    const item: DailyRoutineBlock = {
      id: `rt-${Date.now()}`,
      title: trimmed,
      subject: 'Kustom',
      minutes: newRoutineMinutes,
      done: false,
    };
    persistRoutines([...routines, item]);
    setNewRoutineTitle('');
  };

  const handleRemoveRoutine = (id: string) => {
    persistRoutines(routines.filter((item) => item.id !== id));
  };

  const { cells: heatmapCells, summary: studySummary } = useMemo(
    () => buildStudyHeatmap28Days(userHistory, studyLogs),
    [userHistory, studyLogs]
  );

  const selectedDayCell = useMemo(
    () => heatmapCells.find((c) => c.dateKey === selectedDayKey) || heatmapCells[heatmapCells.length - 1],
    [heatmapCells, selectedDayKey]
  );

  const routineDoneCount = routines.filter((r) => r.done).length;
  const routineProgressPercent =
    routines.length > 0 ? Math.round((routineDoneCount / routines.length) * 100) : 0;

  // Build proportional 360x120 SVG coordinates so marker circles stay round without horizontal stretch
  const mappedSvgPoints = labResult.curvePoints.map((pt) => ({
    x: Number((16 + (pt.x / 100) * 328).toFixed(1)),
    y: Number((10 + (pt.y / 100) * 98).toFixed(1)),
  }));
  const svgPolyline = mappedSvgPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const svgAreaPolygon =
    mappedSvgPoints.length > 0
      ? `${mappedSvgPoints[0].x},112 ${svgPolyline} ${mappedSvgPoints[mappedSvgPoints.length - 1].x},112`
      : '';

  const activeQuote = STUDY_QUOTES[quoteIdx % STUDY_QUOTES.length];

  return (
    <section
      id="aesthetic-study-studio"
      aria-labelledby="aesthetic-studio-heading"
      className="hero-glow-card holo-top-beam rounded-3xl p-6 sm:p-8 space-y-6"
    >
      {/* Header & Workspace Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-sky-400/15 pb-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-sky-300 tracking-wide uppercase inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            <span>Ruang Belajar Estetik · Lab Konsep &amp; Ritme Konsistensi</span>
          </p>
          <h2 id="aesthetic-studio-heading" className="font-display text-2xl sm:text-3xl font-bold text-white">
            Studio Rumus Interaktif &amp; Tracker Belajar
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Eksperimen langsung dengan rumus inti UTBK, Saintek, dan SKD melalui slider visual, lalu pantau ritme belajar 28 hari Anda dalam satu ruang fokus.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Workspace Studio Belajar Estetik"
          className="inline-flex p-1 rounded-2xl bg-[#09162e]/90 border border-sky-400/20 self-start lg:self-auto"
        >
          <button
            type="button"
            id="tab-studio-formulas"
            role="tab"
            aria-selected={activeTab === 'formulas'}
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition inline-flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'formulas'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" aria-hidden="true" />
            <span>Brankas Rumus &amp; Lab</span>
          </button>
          <button
            type="button"
            id="tab-studio-tracker"
            role="tab"
            aria-selected={activeTab === 'tracker'}
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition inline-flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            <span>Heatmap &amp; Jadwal Belajar</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BRANKAS RUMUS & LAB INTERAKTIF */}
      {activeTab === 'formulas' && (
        <div role="tabpanel" aria-labelledby="tab-studio-formulas" className="space-y-5">
          {/* Subject Filter + Search + Mastery Counter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter mata pelajaran rumus">
              {SUBJECT_FILTERS.map((subj) => {
                const active = subjectFilter === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSubjectFilter(subj)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      active
                        ? 'bg-sky-500 border-sky-400 text-white'
                        : 'bg-[#09162e]/70 border-sky-400/20 text-slate-300 hover:border-sky-400/45 hover:text-white'
                    }`}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-sky-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari rumus atau topik..."
                  aria-label="Cari rumus atau topik"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#09162e]/85 border border-sky-400/20 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <span className="text-xs font-semibold text-amber-300 tabular-nums whitespace-nowrap">
                {masteredIds.length}/{FORMULA_VAULT_CATALOG.length} Dikuasai
              </span>
            </div>
          </div>

          {/* Two-Zone Educational Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Zone: Formula Selector List */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
              {filteredFormulas.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#09162e]/70 border border-sky-400/15 text-center text-xs text-slate-300">
                  Tidak ada rumus yang cocok dengan kata kunci tersebut.
                </div>
              ) : (
                filteredFormulas.map((item) => {
                  const isSelected = activeFormula.id === item.id;
                  const isMastered = masteredIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400/60 shadow-[0_10px_28px_rgba(14,165,233,0.16)]'
                          : 'bg-[#09162e]/80 border-sky-400/15 hover:border-sky-400/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFormulaId(item.id)}
                          className="text-left flex-1 min-w-0 space-y-1 focus:outline-none"
                        >
                          <p className="text-[11px] font-semibold text-sky-300">
                            {item.subject} · {item.topic}
                          </p>
                          <h3 className="font-display text-base font-bold text-white leading-snug">
                            {item.title}
                          </h3>
                          <p className="font-hud text-xs text-amber-200 pt-0.5 break-words">
                            {item.expression}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMastered(item.id)}
                          aria-label={isMastered ? `Batalkan tanda dikuasai ${item.title}` : `Tandai dikuasai ${item.title}`}
                          aria-pressed={isMastered}
                          className={`p-2 rounded-xl border transition shrink-0 ${
                            isMastered
                              ? 'bg-emerald-500/20 border-emerald-400/45 text-emerald-300'
                              : 'bg-[#071124]/80 border-sky-400/20 text-slate-400 hover:text-amber-300'
                          }`}
                        >
                          {isMastered ? (
                            <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Bookmark className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Zone: Interactive Concept Lab Stage */}
            <div className="lg:col-span-7 rounded-2xl bg-[#09162e]/90 border border-sky-400/25 p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sky-400/15 pb-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-teal-300 uppercase tracking-wide">
                    Lab Parameter Langsung · {activeFormula.subject}
                  </p>
                  <h3 className="font-display text-xl font-bold text-white">
                    {activeFormula.title}
                  </h3>
                  <p className="font-hud text-xs sm:text-sm text-amber-200">
                    {activeFormula.expression}
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-reset-formula-lab"
                  onClick={handleResetActiveSliders}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-xs font-semibold text-sky-100 inline-flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Nilai</span>
                </button>
              </div>

              {/* Dual Numeric Output & Explicit Status Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#071124]/85 border border-sky-400/20">
                  <p className="text-[11px] text-slate-300">{labResult.primaryLabel}</p>
                  <p
                    data-testid="formula-lab-primary"
                    className="font-display text-2xl font-bold text-white tabular-nums mt-0.5"
                  >
                    {labResult.primaryValue}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#071124]/85 border border-sky-400/20">
                  <p className="text-[11px] text-slate-300">{labResult.secondaryLabel}</p>
                  <p
                    data-testid="formula-lab-secondary"
                    className="font-display text-xl font-bold text-sky-200 tabular-nums mt-0.5"
                  >
                    {labResult.secondaryValue}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#071124]/75 border border-sky-400/15 text-xs">
                <span
                  className={`font-semibold whitespace-nowrap ${
                    labResult.statusTone === 'nominal'
                      ? 'text-emerald-300'
                      : labResult.statusTone === 'elevated'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                  }`}
                >
                  {labResult.statusTone === 'nominal'
                    ? '● OPTIMAL'
                    : labResult.statusTone === 'elevated'
                      ? '▲ TRANSISI'
                      : '■ PERHATIAN'}
                </span>
                <span className="text-slate-200 text-right">{labResult.statusText}</span>
              </div>

              {/* Interactive SVG Visualization Stage */}
              <div className="rounded-2xl bg-[#071124]/90 border border-sky-400/20 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                  <span>Kurva Parameter</span>
                  <span className="font-hud text-sky-300 tabular-nums whitespace-nowrap">
                    Intensitas {labResult.gaugePercent}%
                  </span>
                </div>
                <svg
                  viewBox="0 0 360 120"
                  className="w-full h-32 sm:h-36 overflow-visible"
                  role="img"
                  aria-label={`Grafik interaktif ${activeFormula.title}`}
                >
                  <defs>
                    <linearGradient id="studioCurveStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="55%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="studioCurveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Reference Coordinate Grid */}
                  <line x1="12" y1="28" x2="348" y2="28" stroke="rgba(56,189,248,0.16)" strokeWidth="1" />
                  <line x1="12" y1="58" x2="348" y2="58" stroke="rgba(56,189,248,0.16)" strokeWidth="1" />
                  <line x1="12" y1="88" x2="348" y2="88" stroke="rgba(56,189,248,0.16)" strokeWidth="1" />
                  <line x1="12" y1="112" x2="348" y2="112" stroke="rgba(148,163,184,0.34)" strokeWidth="1.2" />
                  {svgAreaPolygon && (
                    <polygon points={svgAreaPolygon} fill="url(#studioCurveFill)" />
                  )}
                  {svgPolyline && (
                    <polyline
                      fill="none"
                      stroke="url(#studioCurveStroke)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={svgPolyline}
                    />
                  )}
                  {mappedSvgPoints.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={idx === mappedSvgPoints.length - 1 ? 5 : 3.2}
                      fill={idx === mappedSvgPoints.length - 1 ? '#f59e0b' : '#0ea5e9'}
                      stroke="#ffffff"
                      strokeWidth={idx === mappedSvgPoints.length - 1 ? 1.5 : 0.8}
                    />
                  ))}
                </svg>
              </div>

              {/* Labeled Parameter Sliders */}
              <div className="space-y-3">
                {activeFormula.sliders.map((slider) => {
                  const val = activeSliders[slider.id] ?? slider.defaultValue;
                  const inputId = `lab-slider-${activeFormula.id}-${slider.id}`;
                  return (
                    <div key={slider.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor={inputId} className="font-semibold text-sky-100">
                          {slider.label}
                        </label>
                        <span className="font-hud font-bold text-amber-300 tabular-nums">
                          {val} {slider.unit}
                        </span>
                      </div>
                      <input
                        id={inputId}
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={val}
                        onChange={(e) => handleSliderChange(slider.id, Number(e.target.value))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Live Worked Steps & Mentor Quick Tip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#071124]/80 border border-sky-400/15 space-y-1.5">
                  <p className="text-[11px] font-semibold text-sky-300 uppercase">
                    Langkah Hitung Otomatis
                  </p>
                  {labResult.steps.map((stepLine, i) => (
                    <p key={i} className="font-hud text-[11px] text-slate-200 leading-relaxed">
                      {stepLine}
                    </p>
                  ))}
                </div>
                <div className="p-3.5 rounded-2xl bg-[#071124]/80 border border-amber-400/25 space-y-1.5">
                  <p className="text-[11px] font-semibold text-amber-300 uppercase">
                    Trik Cepat Mentor
                  </p>
                  <p className="text-xs text-slate-200 leading-relaxed">{activeFormula.quickTip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRACKER 28-HARI, LOG BELAJAR & JADWAL ESTETIK */}
      {activeTab === 'tracker' && (
        <div role="tabpanel" aria-labelledby="tab-studio-tracker" className="space-y-5">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#09162e]/85 border border-sky-400/20">
              <p className="text-[11px] text-slate-300">Streak Aktif</p>
              <p
                data-testid="study-streak-value"
                className="font-display text-2xl font-bold text-amber-300 tabular-nums mt-0.5 inline-flex items-center gap-1.5"
              >
                <Flame className="w-5 h-5" aria-hidden="true" />
                <span>{studySummary.currentStreak} hari</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#09162e]/85 border border-sky-400/20">
              <p className="text-[11px] text-slate-300">Total 28 Hari</p>
              <p
                data-testid="study-total-minutes"
                className="font-display text-2xl font-bold text-white tabular-nums mt-0.5"
              >
                {studySummary.totalMinutes28d} mnt
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#09162e]/85 border border-sky-400/20">
              <p className="text-[11px] text-slate-300">Fokus Hari Ini</p>
              <p
                data-testid="study-today-minutes"
                className="font-display text-2xl font-bold text-teal-300 tabular-nums mt-0.5"
              >
                {studySummary.todayMinutes} mnt
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#09162e]/85 border border-sky-400/20">
              <p className="text-[11px] text-slate-300">Hari Aktif</p>
              <p className="font-display text-2xl font-bold text-sky-200 tabular-nums mt-0.5">
                {studySummary.activeDays28d} / 28
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: 28-Day Heatmap + Log Sesi Form */}
            <div className="lg:col-span-7 rounded-2xl bg-[#09162e]/90 border border-sky-400/20 p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Peta Konsistensi Belajar 28 Hari
                  </h3>
                  <p className="text-xs text-slate-300">
                    Otomatis menggabungkan sesi kuis Anda dan catatan belajar mandiri.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span>Santai</span>
                  <span className="w-3 h-3 rounded study-heat-cell-0 inline-block" aria-hidden="true" />
                  <span className="w-3 h-3 rounded study-heat-cell-1 inline-block" aria-hidden="true" />
                  <span className="w-3 h-3 rounded study-heat-cell-2 inline-block" aria-hidden="true" />
                  <span className="w-3 h-3 rounded study-heat-cell-3 inline-block" aria-hidden="true" />
                  <span className="w-3 h-3 rounded study-heat-cell-4 inline-block" aria-hidden="true" />
                  <span>Intens</span>
                </div>
              </div>

              {/* 7x4 Interactive Grid */}
              <div className="grid grid-cols-7 gap-2" role="grid" aria-label="Kalender heatmap belajar 28 hari">
                {heatmapCells.map((cell) => {
                  const selected = cell.dateKey === selectedDayKey;
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDayKey(cell.dateKey)}
                      title={`${cell.shortDate} (${cell.dayLabel}): ${cell.minutes} menit · ${cell.sessions} sesi`}
                      aria-label={`${cell.shortDate} ${cell.dayLabel}, ${cell.minutes} menit belajar`}
                      aria-pressed={selected}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center transition border study-heat-cell-${cell.level} ${
                        selected
                          ? 'ring-2 ring-amber-300 border-amber-300'
                          : cell.isToday
                            ? 'border-sky-300/80'
                            : 'border-sky-400/15 hover:border-sky-300/60'
                      }`}
                    >
                      <span className="text-[10px] font-semibold opacity-80 leading-none">
                        {cell.dayLabel}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums mt-0.5 leading-none">
                        {cell.minutes > 0 ? `${cell.minutes}m` : cell.shortDate}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDayCell && (
                <div className="px-3.5 py-2.5 rounded-xl bg-[#071124]/80 border border-sky-400/15 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-sky-200">
                    Tanggal {selectedDayCell.shortDate} ({selectedDayCell.dayLabel})
                    {selectedDayCell.isToday ? ' · Hari Ini' : ''}
                  </span>
                  <span className="tabular-nums text-slate-200">
                    {selectedDayCell.minutes} menit · {selectedDayCell.sessions} aktivitas tercatat
                  </span>
                </div>
              )}

              {/* Quick Study Session Logger */}
              <form
                onSubmit={handleAddStudyLog}
                className="p-4 rounded-2xl bg-[#071124]/80 border border-sky-400/20 space-y-3"
              >
                <p className="text-xs font-bold text-white">Catat Sesi Belajar Hari Ini</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label htmlFor="log-subject-select" className="block text-[11px] text-slate-300 mb-1">
                      Materi
                    </label>
                    <select
                      id="log-subject-select"
                      value={logSubject}
                      onChange={(e) => setLogSubject(e.target.value as FormulaSubject | 'Umum')}
                      className="w-full px-3 py-2 rounded-xl bg-[#09162e] border border-sky-400/25 text-xs text-white focus:outline-none focus:border-sky-400"
                    >
                      {LOG_SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="log-duration-select" className="block text-[11px] text-slate-300 mb-1">
                      Durasi
                    </label>
                    <select
                      id="log-duration-select"
                      value={logMinutes}
                      onChange={(e) => setLogMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#09162e] border border-sky-400/25 text-xs text-white focus:outline-none focus:border-sky-400"
                    >
                      {DURATION_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} menit
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="log-note-input" className="block text-[11px] text-slate-300 mb-1">
                      Topik Singkat
                    </label>
                    <input
                      id="log-note-input"
                      type="text"
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      placeholder="Mis. Drilling 20 soal PK"
                      maxLength={80}
                      className="w-full px-3 py-2 rounded-xl bg-[#09162e] border border-sky-400/25 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    id="btn-save-study-log"
                    className="btn-gold px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Simpan ke Heatmap</span>
                  </button>
                </div>
              </form>

              {studyLogs.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {studyLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="px-3.5 py-2 rounded-xl bg-[#071124]/65 border border-sky-400/15 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{log.note}</p>
                        <p className="text-[11px] text-slate-300 tabular-nums">
                          {log.subject} · {log.minutes} mnt · {log.dateKey}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudyLog(log.id)}
                        aria-label={`Hapus catatan ${log.note}`}
                        className="p-1.5 rounded-lg text-rose-300 hover:bg-rose-500/20 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Aesthetic Daily Checklist + Soundscape + Daily Quote */}
            <div className="lg:col-span-5 space-y-4">
              {/* Daily Study Routine Checklist */}
              <div className="rounded-2xl bg-[#09162e]/90 border border-sky-400/20 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      Jadwal Belajar Harian
                    </h3>
                    <p className="text-xs text-slate-300">
                      Centang target harian agar ritme persiapan tetap terjaga.
                    </p>
                  </div>
                  <span
                    data-testid="routine-progress-text"
                    className="font-hud text-sm font-bold text-teal-300 tabular-nums"
                  >
                    {routineProgressPercent}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-[#071124] overflow-hidden border border-sky-400/15">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-teal-400 to-amber-400 transition-all duration-300"
                    style={{ width: `${routineProgressPercent}%` }}
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {routines.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                        item.done
                          ? 'bg-emerald-500/10 border-emerald-400/35'
                          : 'bg-[#071124]/80 border-sky-400/15 hover:border-sky-400/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleRoutine(item.id)}
                        aria-pressed={item.done}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            item.done
                              ? 'bg-emerald-500 border-emerald-400 text-white'
                              : 'border-sky-400/40 bg-[#09162e]'
                          }`}
                        >
                          {item.done && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              item.done ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-sky-300 tabular-nums">
                            {item.subject} · {item.minutes} mnt
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRoutine(item.id)}
                        aria-label={`Hapus target ${item.title}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddRoutine} className="flex gap-2">
                  <input
                    type="text"
                    value={newRoutineTitle}
                    onChange={(e) => setNewRoutineTitle(e.target.value)}
                    placeholder="Tambah target belajar baru..."
                    aria-label="Judul target belajar baru"
                    maxLength={70}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#071124] border border-sky-400/25 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
                  />
                  <select
                    aria-label="Durasi target belajar"
                    value={newRoutineMinutes}
                    onChange={(e) => setNewRoutineMinutes(Number(e.target.value))}
                    className="px-2.5 py-2 rounded-xl bg-[#071124] border border-sky-400/25 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value={15}>15m</option>
                    <option value={20}>20m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                  </select>
                  <button
                    type="submit"
                    aria-label="Tambahkan target belajar"
                    className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shrink-0"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              </div>

              {/* Ambient Study Soundscape + Daily Quote */}
              <div className="rounded-2xl bg-[#09162e]/90 border border-sky-400/20 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white inline-flex items-center gap-1.5">
                    {soundMode === 'off' ? (
                      <VolumeX className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    ) : (
                      <Headphones className="w-4 h-4 text-teal-300" aria-hidden="true" />
                    )}
                    <span>Ambience Fokus Belajar</span>
                  </p>
                  <div className="inline-flex p-1 rounded-xl bg-[#071124] border border-sky-400/20 gap-1">
                    {(
                      [
                        { id: 'off', label: 'Mati' },
                        { id: 'rain', label: 'Hujan' },
                        { id: 'pad', label: 'Space Pad' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectSoundscape(opt.id)}
                        aria-pressed={soundMode === opt.id}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                          soundMode === opt.id
                            ? 'bg-teal-500 text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-sky-400/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Quote className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Afirmasi Belajar</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteIdx((prev) => (prev + 1) % STUDY_QUOTES.length)}
                      className="text-sky-300 hover:text-white transition"
                    >
                      Ganti Kutipan
                    </button>
                  </div>
                  <blockquote className="text-xs text-slate-200 italic leading-relaxed">
                    &ldquo;{activeQuote.text}&rdquo;
                  </blockquote>
                  <p className="text-[11px] text-slate-400">— {activeQuote.author}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
