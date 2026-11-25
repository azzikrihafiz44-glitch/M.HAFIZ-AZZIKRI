import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMULA_VAULT_CATALOG,
  buildStudyHeatmap28Days,
  evaluateFormulaLab,
  filterFormulaCatalog,
  formatLocalDateKey,
  getDefaultSliderValues,
  minutesToHeatLevel,
  type StudyLogEntry,
} from './aestheticStudyHub';
import type { HistoryRecord } from '../types/quiz';

describe('Aesthetic Study Hub pure logic', () => {
  it('filters formula catalog by subject and query string case-insensitively', () => {
    const all = filterFormulaCatalog(FORMULA_VAULT_CATALOG, 'Semua', '');
    assert.equal(all.length, FORMULA_VAULT_CATALOG.length);

    const physics = filterFormulaCatalog(FORMULA_VAULT_CATALOG, 'Fisika', '');
    assert.ok(physics.length >= 2);
    assert.ok(physics.every((item) => item.subject === 'Fisika'));

    const searchGlbb = filterFormulaCatalog(FORMULA_VAULT_CATALOG, 'Semua', 'glbb');
    assert.equal(searchGlbb.length, 1);
    assert.equal(searchGlbb[0].id, 'phys-glbb');
  });

  it('evaluates GLBB formula lab accurately when sliders change', () => {
    const glbb = FORMULA_VAULT_CATALOG.find((f) => f.id === 'phys-glbb')!;
    const defaults = getDefaultSliderValues(glbb);
    const resDefault = evaluateFormulaLab('phys-glbb', defaults);
    assert.equal(resDefault.primaryValue, '55.0 m'); // 6*5 + 0.5*2*25 = 30 + 25 = 55
    assert.equal(resDefault.secondaryValue, '16.0 m/s'); // 6 + 2*5 = 16
    assert.equal(resDefault.curvePoints.length, 11);

    const resUpdated = evaluateFormulaLab('phys-glbb', { v0: 10, a: 4, t: 3 });
    assert.equal(resUpdated.primaryValue, '48.0 m'); // 10*3 + 0.5*4*9 = 30 + 18 = 48
    assert.equal(resUpdated.secondaryValue, '22.0 m/s');
  });

  it('evaluates SKD margin status accurately for passing and failing subtests', () => {
    const passing = evaluateFormulaLab('skd-margin', { twk: 95, tiu: 120, tkp: 185 });
    assert.equal(passing.primaryValue, '400 / 550');
    assert.equal(passing.secondaryValue, '+99 pt');
    assert.equal(passing.statusTone, 'nominal');

    const failing = evaluateFormulaLab('skd-margin', { twk: 55, tiu: 120, tkp: 185 });
    assert.equal(failing.statusTone, 'caution');
  });

  it('evaluates quadratic discriminant and chemistry pH deterministically', () => {
    const quad = evaluateFormulaLab('math-quadratic', { a: 1, b: -4, c: 3 });
    assert.equal(quad.primaryValue, '4');
    assert.equal(quad.secondaryValue, '(2.00, -1.00)');
    assert.equal(quad.statusTone, 'nominal');

    const ph = evaluateFormulaLab('chem-ph', { mExp: 2, coef: 1, val: 1 });
    assert.equal(ph.primaryValue, '2.00');
  });

  it('builds 28-day study heatmap merging quiz history and logged sessions with streak', () => {
    const refDate = new Date(2026, 10, 24); // 2026-11-24
    const todayKey = formatLocalDateKey(refDate);
    const yesterdayKey = formatLocalDateKey(new Date(2026, 10, 23));
    const twoDaysAgoKey = formatLocalDateKey(new Date(2026, 10, 22));

    const fakeHistory: HistoryRecord[] = [
      {
        id: 'h1',
        timestamp: `${yesterdayKey}T10:15:00`,
        roomCode: 'UTBK01',
        quizTitle: 'Tryout UTBK',
        playerName: 'Hafiz',
        grade: 90,
        points: 1800,
        correctCount: 9,
        totalQuestions: 10,
        rank: 1,
        certificateId: 'CERT-1',
      },
    ];

    const logs: StudyLogEntry[] = [
      { id: 'l1', dateKey: todayKey, subject: 'Matematika', minutes: 45, note: 'Limit Fungsi' },
      { id: 'l2', dateKey: twoDaysAgoKey, subject: 'Fisika', minutes: 30, note: 'GLBB' },
    ];

    const { cells, summary } = buildStudyHeatmap28Days(fakeHistory, logs, refDate);
    assert.equal(cells.length, 28);
    assert.equal(cells[27].dateKey, todayKey);
    assert.equal(cells[27].isToday, true);
    assert.equal(cells[27].minutes, 45);
    assert.equal(cells[26].minutes, 25); // from quiz history
    assert.equal(cells[25].minutes, 30);
    assert.equal(summary.currentStreak, 3);
    assert.equal(summary.activeDays28d, 3);
    assert.equal(summary.totalMinutes28d, 100);
    assert.equal(summary.todayMinutes, 45);
  });

  it('maps study minutes to heatmap intensity levels 0..4', () => {
    assert.equal(minutesToHeatLevel(0), 0);
    assert.equal(minutesToHeatLevel(15), 1);
    assert.equal(minutesToHeatLevel(35), 2);
    assert.equal(minutesToHeatLevel(70), 3);
    assert.equal(minutesToHeatLevel(110), 4);
  });
});
