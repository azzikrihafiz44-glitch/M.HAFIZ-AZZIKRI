import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FLASHCARDS,
  DEFAULT_SPEED_MATH_DURATION,
  MAX_SPEED_MATH_DURATION,
  MIN_SPEED_MATH_DURATION,
  SPEED_MATH_DURATION_PRESETS,
  calculateSkdPassingGrade,
  calculateSpeedMathPoints,
  calculateUtbkAverage,
  clampSpeedMathDuration,
  computeDaysRemaining,
  extractYouTubeEmbedUrl,
  generateSpeedMathQuestion,
  sanitizeSpeedMathDuration,
} from './studyPlayground';

test('generateSpeedMathQuestion produces valid 4 unique choices containing the exact answer', () => {
  for (const diff of ['santai', 'utbk', 'master'] as const) {
    for (let i = 0; i < 15; i++) {
      const q = generateSpeedMathQuestion(diff);
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(q.choices.includes(q.answer));
      assert.ok(q.prompt.length > 0);
    }
  }
});

test('calculateSpeedMathPoints scales with difficulty and combo streak', () => {
  assert.equal(calculateSpeedMathPoints('santai', 1), 10);
  assert.equal(calculateSpeedMathPoints('santai', 4), 20);
  assert.equal(calculateSpeedMathPoints('utbk', 1), 20);
  assert.equal(calculateSpeedMathPoints('master', 7), 90);
});

test('clampSpeedMathDuration and sanitizeSpeedMathDuration enforce valid duration bounds', () => {
  assert.ok(SPEED_MATH_DURATION_PRESETS.includes(30));
  assert.ok(SPEED_MATH_DURATION_PRESETS.includes(60));
  assert.equal(clampSpeedMathDuration(5), MIN_SPEED_MATH_DURATION);
  assert.equal(clampSpeedMathDuration(999), MAX_SPEED_MATH_DURATION);
  assert.equal(clampSpeedMathDuration(75.4), 75);
  assert.equal(clampSpeedMathDuration(Number.NaN), DEFAULT_SPEED_MATH_DURATION);
  assert.equal(sanitizeSpeedMathDuration('90'), 90);
  assert.equal(sanitizeSpeedMathDuration('-10'), DEFAULT_SPEED_MATH_DURATION);
  assert.equal(sanitizeSpeedMathDuration(null), DEFAULT_SPEED_MATH_DURATION);
});

test('computeDaysRemaining computes future days/hours and handles past dates', () => {
  const now = new Date(2026, 10, 19, 8, 0, 0);
  const future = computeDaysRemaining('2026-11-29', now);
  assert.equal(future.isPast, false);
  assert.equal(future.days, 10);
  assert.equal(future.hours, 0);

  const past = computeDaysRemaining('2026-11-10', now);
  assert.equal(past.isPast, true);
  assert.equal(past.days, 0);
});

test('DEFAULT_FLASHCARDS provides rich multi-subject starter deck', () => {
  assert.ok(DEFAULT_FLASHCARDS.length >= 8);
  const subjects = new Set(DEFAULT_FLASHCARDS.map((c) => c.subject));
  assert.ok(subjects.has('Matematika'));
  assert.ok(subjects.has('Fisika'));
  assert.ok(subjects.has('Kimia'));
});

test('extractYouTubeEmbedUrl parses watch, youtu.be, shorts, and embed URLs safely', () => {
  assert.equal(
    extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'
  );
  assert.equal(
    extractYouTubeEmbedUrl('https://youtu.be/abc123XYZ09?t=30'),
    'https://www.youtube-nocookie.com/embed/abc123XYZ09?rel=0'
  );
  assert.equal(
    extractYouTubeEmbedUrl('https://youtube.com/shorts/shortID999'),
    'https://www.youtube-nocookie.com/embed/shortID999?rel=0'
  );
  assert.equal(extractYouTubeEmbedUrl('https://example.com/video'), null);
  assert.equal(extractYouTubeEmbedUrl(''), null);
});

test('calculateSkdPassingGrade validates TWK >= 65, TIU >= 80, TKP >= 166', () => {
  const passed = calculateSkdPassingGrade(95, 120, 190);
  assert.equal(passed.allPassed, true);
  assert.equal(passed.total, 405);

  const failedTiu = calculateSkdPassingGrade(100, 75, 195);
  assert.equal(failedTiu.allPassed, false);
  assert.equal(failedTiu.tiuPassed, false);
});

test('calculateUtbkAverage computes clamped average and tier label', () => {
  const high = calculateUtbkAverage([750, 720, 740, 710]);
  assert.equal(high.average, 730);
  assert.ok(high.tierLabel.includes('Sangat Kompetitif'));
});
