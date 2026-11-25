import type { HistoryRecord } from '../types/quiz';

export type FormulaSubject =
  | 'Matematika'
  | 'Fisika'
  | 'Kimia'
  | 'TPS & UTBK'
  | 'SKD Kedinasan';

export interface FormulaSliderSpec {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface FormulaLabResult {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  statusText: string;
  statusTone: 'nominal' | 'elevated' | 'caution';
  steps: string[];
  /** Normalized 0..100 coordinates for interactive SVG visualization */
  curvePoints: Array<{ x: number; y: number; rawX: number; rawY: number }>;
  gaugePercent: number;
}

export interface FormulaEntry {
  id: string;
  subject: FormulaSubject;
  title: string;
  topic: string;
  expression: string;
  quickTip: string;
  sliders: FormulaSliderSpec[];
}

export interface StudyLogEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD local
  subject: FormulaSubject | 'Umum';
  minutes: number;
  note: string;
}

export interface DailyRoutineBlock {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  done: boolean;
}

export interface HeatmapCell {
  dateKey: string;
  dayLabel: string;
  shortDate: string;
  minutes: number;
  sessions: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
}

export interface StudyAnalyticsSummary {
  totalMinutes28d: number;
  totalSessions28d: number;
  activeDays28d: number;
  currentStreak: number;
  todayMinutes: number;
}

export interface StudyQuote {
  text: string;
  author: string;
}

export const STUDY_QUOTES: StudyQuote[] = [
  {
    text: 'Konsistensi 45 menit setiap hari jauh lebih kuat daripada sistem kebut semalam sebelum tryout.',
    author: 'Catatan Mentor Hafiz Education',
  },
  {
    text: 'Pahami pola dasar rumusnya dulu — soal sesulit apa pun hanyalah kombinasi dari konsep sederhana.',
    author: 'Strategi UTBK-SNBT',
  },
  {
    text: 'Setiap kesalahan saat latihan adalah investasi skor gratis yang menyelamatkan nilaimu di hari ujian.',
    author: 'Prinsip Pembelajar Tangguh',
  },
  {
    text: 'Tarik napas, atur ritme fokus 25 menit, dan selesaikan satu target kecil terlebih dahulu.',
    author: 'Ruang Fokus Kosmik',
  },
];

export const FORMULA_VAULT_CATALOG: FormulaEntry[] = [
  {
    id: 'math-quadratic',
    subject: 'Matematika',
    title: 'Fungsi Kuadrat & Diskriminan',
    topic: 'Aljabar SNBT / Kelas X–XII',
    expression: 'f(x) = ax² + bx + c  |  D = b² - 4ac',
    quickTip:
      'Titik puncak selalu berada di x_p = -b / (2a). Jika D > 0 grafik memotong sumbu-X di dua titik real.',
    sliders: [
      { id: 'a', label: 'Koefisien a', unit: '', min: -3, max: 3, step: 0.5, defaultValue: 1 },
      { id: 'b', label: 'Koefisien b', unit: '', min: -6, max: 6, step: 1, defaultValue: -4 },
      { id: 'c', label: 'Konstanta c', unit: '', min: -5, max: 8, step: 1, defaultValue: 3 },
    ],
  },
  {
    id: 'math-arithmetic',
    subject: 'Matematika',
    title: 'Barisan & Deret Aritmetika',
    topic: 'Penalaran Kuantitatif',
    expression: 'Un = a + (n - 1)b  |  Sn = (n/2)(2a + (n - 1)b)',
    quickTip:
      'Untuk jumlah n suku berurutan yang ganjil, nilai tengah U_tengah = Sn / n sehingga hitungannya jauh lebih cepat.',
    sliders: [
      { id: 'a', label: 'Suku Awal (a)', unit: '', min: 1, max: 25, step: 1, defaultValue: 4 },
      { id: 'b', label: 'Beda (b)', unit: '', min: 1, max: 12, step: 1, defaultValue: 3 },
      { id: 'n', label: 'Banyak Suku (n)', unit: 'suku', min: 3, max: 20, step: 1, defaultValue: 10 },
    ],
  },
  {
    id: 'phys-glbb',
    subject: 'Fisika',
    title: 'Gerak Lurus Berubah Beraturan (GLBB)',
    topic: 'Mekanika Klasik · TKA Saintek',
    expression: 'vt = v0 + a·t  |  s = v0·t + ½a·t²',
    quickTip:
      'Jika soal tidak menyebut waktu (t), langsung gunakan rumus bebas waktu: vt² = v0² + 2·a·s.',
    sliders: [
      { id: 'v0', label: 'Kecepatan Awal (v0)', unit: 'm/s', min: 0, max: 30, step: 2, defaultValue: 6 },
      { id: 'a', label: 'Percepatan (a)', unit: 'm/s²', min: -4, max: 8, step: 1, defaultValue: 2 },
      { id: 't', label: 'Waktu Tempuh (t)', unit: 'dtk', min: 1, max: 12, step: 1, defaultValue: 5 },
    ],
  },
  {
    id: 'phys-ohm',
    subject: 'Fisika',
    title: 'Hukum Ohm & Daya Listrik',
    topic: 'Listrik Dinamis · Kelas XII',
    expression: 'V = I · R  |  P = V · I = I² · R',
    quickTip:
      'Pada rangkaian seri arus I sama di tiap hambatan; pada paralel tegangan V sama di tiap cabang.',
    sliders: [
      { id: 'V', label: 'Tegangan (V)', unit: 'Volt', min: 3, max: 48, step: 3, defaultValue: 12 },
      { id: 'R', label: 'Hambatan (R)', unit: 'Ω', min: 2, max: 24, step: 2, defaultValue: 4 },
    ],
  },
  {
    id: 'chem-ph',
    subject: 'Kimia',
    title: 'Derajat Keasaman (pH) Asam Kuat',
    topic: 'Larutan Asam-Basa · Kelas XI',
    expression: '[H+] = M · valensi  |  pH = -log[H+]',
    quickTip:
      'Jika [H+] = a × 10^(-n), maka nilai pH langsung sama dengan n - log(a). Hafalkan log 2 ≈ 0,30 dan log 3 ≈ 0,48.',
    sliders: [
      { id: 'mExp', label: 'Pangkat Molaritas (10^-n)', unit: 'n', min: 1, max: 5, step: 1, defaultValue: 2 },
      { id: 'coef', label: 'Koefisien Molar (a)', unit: '', min: 1, max: 9, step: 1, defaultValue: 2 },
      { id: 'val', label: 'Valensi Asam', unit: 'H+', min: 1, max: 2, step: 1, defaultValue: 1 },
    ],
  },
  {
    id: 'tps-percent',
    subject: 'TPS & UTBK',
    title: 'Perubahan Persentase & Diskon Bertingkat',
    topic: 'Pengetahuan Kuantitatif SNBT',
    expression: 'P_akhir = P_awal × (1 - d1) × (1 - d2)',
    quickTip:
      'Diskon 20% + 10% BUKAN 30%, melainkan total potongan 1 - (0,8 × 0,9) = 28%. Selalu kalikan faktor pengalinya!',
    sliders: [
      { id: 'price', label: 'Harga Awal', unit: 'rb', min: 50, max: 500, step: 25, defaultValue: 200 },
      { id: 'd1', label: 'Diskon Tahap 1', unit: '%', min: 5, max: 50, step: 5, defaultValue: 20 },
      { id: 'd2', label: 'Diskon Tambahan', unit: '%', min: 0, max: 30, step: 5, defaultValue: 10 },
    ],
  },
  {
    id: 'skd-margin',
    subject: 'SKD Kedinasan',
    title: 'Simulasi Margin Ambang Batas SKD',
    topic: 'TWK (65) · TIU (80) · TKP (156)',
    expression: 'Skor Total = TWK + TIU + TKP  (Maks 550)',
    quickTip:
      'Setiap subtes wajib melewati Passing Grade masing-masing. Untuk aman masuk perangkingan SKD, bidik margin minimal +60 poin di atas batas lulus.',
    sliders: [
      { id: 'twk', label: 'Skor TWK', unit: 'pt', min: 30, max: 150, step: 5, defaultValue: 95 },
      { id: 'tiu', label: 'Skor TIU', unit: 'pt', min: 40, max: 175, step: 5, defaultValue: 120 },
      { id: 'tkp', label: 'Skor TKP', unit: 'pt', min: 120, max: 225, step: 5, defaultValue: 185 },
    ],
  },
];

export const DEFAULT_DAILY_ROUTINES: DailyRoutineBlock[] = [
  {
    id: 'rt-1',
    title: 'Pemanasan 10 Soal Penalaran Umum / TIU',
    subject: 'TPS & UTBK',
    minutes: 20,
    done: false,
  },
  {
    id: 'rt-2',
    title: 'Review 3 Rumus Inti & Uji Parameter Lab',
    subject: 'Matematika',
    minutes: 25,
    done: false,
  },
  {
    id: 'rt-3',
    title: 'Latihan 1 Modul Paket Soal Resmi',
    subject: 'UTBK / Kedinasan',
    minutes: 35,
    done: false,
  },
  {
    id: 'rt-4',
    title: 'Catat Ringkasan Konsep & Evaluasi Salah',
    subject: 'Refleksi',
    minutes: 15,
    done: false,
  },
];

export function filterFormulaCatalog(
  catalog: FormulaEntry[],
  subject: FormulaSubject | 'Semua',
  query: string
): FormulaEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return catalog.filter((item) => {
    const matchesSubject = subject === 'Semua' || item.subject === subject;
    if (!matchesSubject) return false;
    if (!normalizedQuery) return true;
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.topic.toLowerCase().includes(normalizedQuery) ||
      item.expression.toLowerCase().includes(normalizedQuery) ||
      item.subject.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getDefaultSliderValues(formula: FormulaEntry): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of formula.sliders) {
    out[s.id] = s.defaultValue;
  }
  return out;
}

export function evaluateFormulaLab(
  formulaId: string,
  values: Record<string, number>
): FormulaLabResult {
  if (formulaId === 'math-quadratic') {
    const aRaw = values.a ?? 1;
    const a = aRaw === 0 ? 0.5 : aRaw;
    const b = values.b ?? -4;
    const c = values.c ?? 3;
    const D = b * b - 4 * a * c;
    const xp = -b / (2 * a);
    const yp = a * xp * xp + b * xp + c;

    const minX = xp - 4;
    const maxX = xp + 4;
    const rawSamples = Array.from({ length: 13 }, (_, idx) => {
      const rx = minX + ((maxX - minX) * idx) / 12;
      const ry = a * rx * rx + b * rx + c;
      return { rx, ry };
    });
    const ys = rawSamples.map((p) => p.ry);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanY = Math.max(1e-6, maxY - minY);

    const curvePoints = rawSamples.map((p, idx) => ({
      x: Number(((idx / 12) * 100).toFixed(1)),
      y: Number((90 - ((p.ry - minY) / spanY) * 76).toFixed(1)),
      rawX: Number(p.rx.toFixed(1)),
      rawY: Number(p.ry.toFixed(1)),
    }));

    return {
      primaryLabel: 'Diskriminan (D)',
      primaryValue: `${Number(D.toFixed(2))}`,
      secondaryLabel: 'Titik Puncak (xp, yp)',
      secondaryValue: `(${xp.toFixed(2)}, ${yp.toFixed(2)})`,
      statusText:
        D > 0
          ? '2 Akar Real Berbeda (Memotong sumbu-X)'
          : D === 0
            ? '1 Akar Kembar (Menyinggung sumbu-X)'
            : 'Definit / Tidak Memotong sumbu-X',
      statusTone: D > 0 ? 'nominal' : D === 0 ? 'elevated' : 'caution',
      steps: [
        `D = (${b})² - 4(${a})(${c}) = ${Number(D.toFixed(2))}`,
        `xp = -(${b}) / (2 × ${a}) = ${xp.toFixed(2)}`,
        `yp = ${a}(${xp.toFixed(2)})² + (${b})(${xp.toFixed(2)}) + (${c}) = ${yp.toFixed(2)}`,
      ],
      curvePoints,
      gaugePercent: Math.min(100, Math.max(12, Math.round(((D + 20) / 80) * 100))),
    };
  }

  if (formulaId === 'math-arithmetic') {
    const a = values.a ?? 4;
    const b = values.b ?? 3;
    const n = Math.max(1, Math.round(values.n ?? 10));
    const un = a + (n - 1) * b;
    const sn = (n / 2) * (a + un);
    const samples = Array.from({ length: Math.min(n, 10) }, (_, idx) => {
      const k = idx + 1;
      const val = a + (k - 1) * b;
      return { rx: k, ry: val };
    });
    const maxVal = Math.max(...samples.map((p) => p.ry), 1);
    const curvePoints = samples.map((p, idx) => ({
      x: Number(((idx / Math.max(1, samples.length - 1)) * 100).toFixed(1)),
      y: Number((90 - (p.ry / maxVal) * 74).toFixed(1)),
      rawX: p.rx,
      rawY: p.ry,
    }));

    return {
      primaryLabel: `Suku ke-${n} (U${n})`,
      primaryValue: `${un}`,
      secondaryLabel: `Jumlah ${n} Suku (S${n})`,
      secondaryValue: `${sn}`,
      statusText: `Rata-rata suku = ${(sn / n).toFixed(1)} · Beda tetap +${b}`,
      statusTone: 'nominal',
      steps: [
        `U${n} = ${a} + (${n} - 1) × ${b} = ${un}`,
        `S${n} = (${n}/2) × (${a} + ${un}) = ${sn}`,
      ],
      curvePoints,
      gaugePercent: Math.min(100, Math.round((un / 220) * 100)),
    };
  }

  if (formulaId === 'phys-glbb') {
    const v0 = values.v0 ?? 6;
    const a = values.a ?? 2;
    const t = values.t ?? 5;
    const vt = v0 + a * t;
    const s = v0 * t + 0.5 * a * t * t;

    const rawSamples = Array.from({ length: 11 }, (_, idx) => {
      const dt = (t * idx) / 10;
      const pos = v0 * dt + 0.5 * a * dt * dt;
      return { rx: dt, ry: pos };
    });
    const ys = rawSamples.map((p) => p.ry);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    const spanY = Math.max(1e-6, maxY - minY);
    const curvePoints = rawSamples.map((p, idx) => ({
      x: Number(((idx / 10) * 100).toFixed(1)),
      y: Number((90 - ((p.ry - minY) / spanY) * 74).toFixed(1)),
      rawX: Number(p.rx.toFixed(1)),
      rawY: Number(p.ry.toFixed(1)),
    }));

    return {
      primaryLabel: 'Jarak Tempuh (s)',
      primaryValue: `${s.toFixed(1)} m`,
      secondaryLabel: 'Kecepatan Akhir (vt)',
      secondaryValue: `${vt.toFixed(1)} m/s`,
      statusText:
        a > 0
          ? 'Dipercepat Beraturan (vt meningkat)'
          : a === 0
            ? 'GLB Konstan (a = 0)'
            : 'Diperlambat Beraturan (pengereman)',
      statusTone: a >= 0 ? 'nominal' : 'elevated',
      steps: [
        `vt = ${v0} + (${a})(${t}) = ${vt.toFixed(1)} m/s`,
        `s = (${v0})(${t}) + 0.5(${a})(${t})² = ${s.toFixed(1)} m`,
      ],
      curvePoints,
      gaugePercent: Math.min(100, Math.max(8, Math.round((Math.abs(s) / 400) * 100))),
    };
  }

  if (formulaId === 'phys-ohm') {
    const V = values.V ?? 12;
    const R = Math.max(0.5, values.R ?? 4);
    const I = V / R;
    const P = V * I;
    const rawSamples = Array.from({ length: 9 }, (_, idx) => {
      const rv = (V * (idx + 1)) / 9;
      return { rx: rv, ry: rv / R };
    });
    const maxI = Math.max(...rawSamples.map((p) => p.ry), 0.1);
    const curvePoints = rawSamples.map((p, idx) => ({
      x: Number(((idx / 8) * 100).toFixed(1)),
      y: Number((90 - (p.ry / maxI) * 74).toFixed(1)),
      rawX: Number(p.rx.toFixed(1)),
      rawY: Number(p.ry.toFixed(2)),
    }));

    return {
      primaryLabel: 'Arus Listrik (I)',
      primaryValue: `${I.toFixed(2)} A`,
      secondaryLabel: 'Daya Disipasi (P)',
      secondaryValue: `${P.toFixed(1)} W`,
      statusText: P > 150 ? 'Beban Daya Tinggi — Perhatikan Sekring' : 'Arus Sirkuit Aman & Stabil',
      statusTone: P > 150 ? 'elevated' : 'nominal',
      steps: [
        `I = V / R = ${V} / ${R} = ${I.toFixed(2)} Ampere`,
        `P = V × I = ${V} × ${I.toFixed(2)} = ${P.toFixed(1)} Watt`,
      ],
      curvePoints,
      gaugePercent: Math.min(100, Math.round((P / 300) * 100)),
    };
  }

  if (formulaId === 'chem-ph') {
    const mExp = Math.max(1, Math.round(values.mExp ?? 2));
    const coef = Math.max(1, values.coef ?? 2);
    const val = Math.max(1, Math.round(values.val ?? 1));
    const hPlus = coef * Math.pow(10, -mExp) * val;
    const pH = Math.max(0, -Math.log10(hPlus));
    const logPart = Math.log10(coef * val);

    const curvePoints = Array.from({ length: 7 }, (_, idx) => {
      const phTick = idx * 2.3;
      const dist = Math.abs(phTick - pH);
      const height = Math.max(10, 88 - dist * 10);
      return {
        x: Number(((idx / 6) * 100).toFixed(1)),
        y: Number(height.toFixed(1)),
        rawX: Number(phTick.toFixed(1)),
        rawY: Number(pH.toFixed(2)),
      };
    });

    return {
      primaryLabel: 'Nilai pH Larutan',
      primaryValue: pH.toFixed(2),
      secondaryLabel: 'Konsentrasi [H+]',
      secondaryValue: `${(coef * val).toFixed(0)} × 10^-${mExp} M`,
      statusText:
        pH < 2.5
          ? 'Asam Sangat Kuat (Korosif Tinggi)'
          : pH < 5
            ? 'Asam Menengah'
            : 'Mendekati Asam Lemah / Encer',
      statusTone: pH < 2.5 ? 'caution' : 'nominal',
      steps: [
        `[H+] = ${coef} × 10^-${mExp} × ${val} = ${coef * val} × 10^-${mExp} M`,
        `pH = ${mExp} - log(${coef * val}) ≈ ${mExp} - ${logPart.toFixed(2)} = ${pH.toFixed(2)}`,
      ],
      curvePoints,
      gaugePercent: Math.min(100, Math.round((pH / 14) * 100)),
    };
  }

  if (formulaId === 'tps-percent') {
    const price = values.price ?? 200;
    const d1 = values.d1 ?? 20;
    const d2 = values.d2 ?? 10;
    const afterFirst = price * (1 - d1 / 100);
    const finalPrice = afterFirst * (1 - d2 / 100);
    const effectiveDiscount = (1 - finalPrice / Math.max(1, price)) * 100;

    const curvePoints = [
      { x: 10, y: 18, rawX: 0, rawY: price },
      { x: 50, y: Number((90 - (afterFirst / price) * 72).toFixed(1)), rawX: 1, rawY: Number(afterFirst.toFixed(1)) },
      { x: 90, y: Number((90 - (finalPrice / price) * 72).toFixed(1)), rawX: 2, rawY: Number(finalPrice.toFixed(1)) },
    ];

    return {
      primaryLabel: 'Harga Akhir Dibayar',
      primaryValue: `Rp ${finalPrice.toFixed(1)} rb`,
      secondaryLabel: 'Diskon Efektif Total',
      secondaryValue: `${effectiveDiscount.toFixed(1)}% (bukan ${d1 + d2}%)`,
      statusText: `Hemat Rp ${(price - finalPrice).toFixed(1)} rb dari harga awal`,
      statusTone: 'nominal',
      steps: [
        `Setelah diskon 1 (${d1}%): ${price} × ${(1 - d1 / 100).toFixed(2)} = ${afterFirst.toFixed(1)} rb`,
        `Setelah diskon 2 (${d2}%): ${afterFirst.toFixed(1)} × ${(1 - d2 / 100).toFixed(2)} = ${finalPrice.toFixed(1)} rb`,
      ],
      curvePoints,
      gaugePercent: Math.min(100, Math.round(effectiveDiscount)),
    };
  }

  // Default: skd-margin
  const twk = values.twk ?? 95;
  const tiu = values.tiu ?? 120;
  const tkp = values.tkp ?? 185;
  const total = twk + tiu + tkp;
  const passedAll = twk >= 65 && tiu >= 80 && tkp >= 156;
  const margin = total - 301;

  const curvePoints = [
    { x: 15, y: Number((90 - (twk / 150) * 70).toFixed(1)), rawX: 1, rawY: twk },
    { x: 50, y: Number((90 - (tiu / 175) * 70).toFixed(1)), rawX: 2, rawY: tiu },
    { x: 85, y: Number((90 - (tkp / 225) * 70).toFixed(1)), rawX: 3, rawY: tkp },
  ];

  return {
    primaryLabel: 'Total Skor SKD',
    primaryValue: `${total} / 550`,
    secondaryLabel: 'Margin dari Ambang (301)',
    secondaryValue: `${margin >= 0 ? '+' : ''}${margin} pt`,
    statusText: passedAll
      ? total >= 400
        ? 'Lulus Ambang Batas · Zona Kompetitif PKN STAN / IPDN'
        : 'Lulus Ambang Batas · Tingkatkan TIU/TKP untuk Peringkat Aman'
      : 'Belum Memenuhi Seluruh Ambang Batas Subtes',
    statusTone: passedAll ? (total >= 400 ? 'nominal' : 'elevated') : 'caution',
    steps: [
      `TWK ${twk} (min 65) ${twk >= 65 ? '✓' : '✗'} · TIU ${tiu} (min 80) ${tiu >= 80 ? '✓' : '✗'} · TKP ${tkp} (min 156) ${tkp >= 156 ? '✓' : '✗'}`,
      `Total = ${twk} + ${tiu} + ${tkp} = ${total} poin`,
    ],
    curvePoints,
    gaugePercent: Math.min(100, Math.round((total / 550) * 100)),
  };
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseTimestampToLocalDateKey(rawTimestamp: string): string | null {
  if (!rawTimestamp) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawTimestamp.trim())) {
    return rawTimestamp.trim();
  }
  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalDateKey(parsed);
}

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function minutesToHeatLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 25) return 1;
  if (minutes < 50) return 2;
  if (minutes < 90) return 3;
  return 4;
}

export function buildStudyHeatmap28Days(
  userHistory: HistoryRecord[],
  studyLogs: StudyLogEntry[],
  referenceDate: Date = new Date()
): { cells: HeatmapCell[]; summary: StudyAnalyticsSummary } {
  const todayKey = formatLocalDateKey(referenceDate);
  const dailyMap = new Map<string, { minutes: number; sessions: number }>();

  for (const rec of userHistory) {
    const key = parseTimestampToLocalDateKey(rec.timestamp);
    if (!key) continue;
    const prev = dailyMap.get(key) || { minutes: 0, sessions: 0 };
    dailyMap.set(key, {
      minutes: prev.minutes + 25,
      sessions: prev.sessions + 1,
    });
  }

  for (const log of studyLogs) {
    if (!log.dateKey) continue;
    const mins = Math.max(1, Math.round(Number(log.minutes) || 0));
    const prev = dailyMap.get(log.dateKey) || { minutes: 0, sessions: 0 };
    dailyMap.set(log.dateKey, {
      minutes: prev.minutes + mins,
      sessions: prev.sessions + 1,
    });
  }

  const cells: HeatmapCell[] = [];
  for (let offset = 27; offset >= 0; offset -= 1) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset
    );
    const key = formatLocalDateKey(d);
    const stats = dailyMap.get(key) || { minutes: 0, sessions: 0 };
    cells.push({
      dateKey: key,
      dayLabel: DAY_NAMES_ID[d.getDay()],
      shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
      minutes: stats.minutes,
      sessions: stats.sessions,
      level: minutesToHeatLevel(stats.minutes),
      isToday: key === todayKey,
    });
  }

  let totalMinutes28d = 0;
  let totalSessions28d = 0;
  let activeDays28d = 0;
  for (const cell of cells) {
    totalMinutes28d += cell.minutes;
    totalSessions28d += cell.sessions;
    if (cell.minutes > 0) activeDays28d += 1;
  }

  // Current streak counting backwards from today (if today has 0 yet, allow yesterday to keep streak alive)
  let currentStreak = 0;
  const startIdx = cells[cells.length - 1]?.minutes > 0 ? cells.length - 1 : cells.length - 2;
  for (let i = startIdx; i >= 0; i -= 1) {
    if (cells[i].minutes > 0) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const todayMinutes = cells[cells.length - 1]?.minutes || 0;

  return {
    cells,
    summary: {
      totalMinutes28d,
      totalSessions28d,
      activeDays28d,
      currentStreak,
      todayMinutes,
    },
  };
}
