import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudyModule } from '../data/academicCatalog';
import {
  extractLocalMaterialFileName,
  filterStudioMaterials,
  mergeCloudAndPendingMaterials,
  mergeCloudAndPendingRooms,
  mergeServerCloudAndLocalMaterials,
  removeMaterialById,
  replaceMaterialInList,
  stripMaterialPpt,
} from './materialManagement';

const sampleModules: StudyModule[] = [
  {
    id: 'mat-1',
    portal: 'utbk',
    subject: 'Penalaran Umum',
    title: 'Logika Deduktif & Silogisme',
    subtitle: 'Materi UTBK & SNBT',
    readMinutes: 8,
    summary: 'Ringkasan aturan silogisme dan penarikan simpulan sah.',
    keyPoints: ['Modus ponens', 'Modus tollens'],
    formulas: ['(p -> q) && p => q'],
    pptUrl: '/api/material-files/m123-abc-slide_logika.pptx',
    pptName: 'Slide Logika.pptx',
    practiceQuestions: [],
    updatedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'mat-2',
    portal: 'sma',
    grade: 'XII',
    subject: 'Fisika',
    title: 'Induksi Elektromagnetik',
    subtitle: 'Kurikulum SMA/MA · Kelas XII',
    readMinutes: 10,
    summary: 'Hukum Faraday dan Lenz.',
    keyPoints: ['Fluks magnetik'],
    formulas: ['E = -N dPhi/dt'],
    pptUrl: 'https://docs.google.com/presentation/d/abc123',
    pptName: 'PPT Induksi Kelas XII',
    practiceQuestions: [],
    updatedAt: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'mat-3',
    portal: 'kedinasan',
    subject: 'TWK',
    title: 'Pilar Kebangsaan & UUD 1945',
    subtitle: 'Modul & Video Kedinasan (SKD)',
    readMinutes: 6,
    summary: 'Ringkasan pasal penting.',
    keyPoints: ['Amandemen UUD 1945'],
    formulas: [],
    practiceQuestions: [],
    updatedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'mat-4',
    portal: 'tka',
    tkaTrack: 'Saintek',
    subject: 'Fisika TKA',
    title: 'Mekanika Lanjut & Dinamika',
    subtitle: 'Modul TKA Saintek',
    readMinutes: 7,
    summary: 'Ringkasan hukum Newton dan usaha energi.',
    keyPoints: ['Usaha dan energi'],
    formulas: ['W = delta Ek'],
    practiceQuestions: [],
    updatedAt: '2026-04-04T10:00:00.000Z',
  },
];

test('extractLocalMaterialFileName parses valid local upload URLs and rejects external/traversal paths', () => {
  assert.equal(
    extractLocalMaterialFileName('/api/material-files/m123-abc-slide_logika.pptx'),
    'm123-abc-slide_logika.pptx'
  );
  assert.equal(
    extractLocalMaterialFileName('/api/material-files/m123-abc-slide.pdf?download=1'),
    'm123-abc-slide.pdf'
  );
  assert.equal(
    extractLocalMaterialFileName('https://docs.google.com/presentation/d/abc123'),
    null
  );
  assert.equal(
    extractLocalMaterialFileName('/api/material-files/..%2F..%2Fetc%2Fpasswd'),
    null
  );
  assert.equal(extractLocalMaterialFileName(undefined), null);
});

test('stripMaterialPpt clears pptUrl and pptName while keeping module metadata', () => {
  const stripped = stripMaterialPpt(sampleModules[0], '2026-05-01T12:00:00.000Z');
  assert.equal(stripped.id, 'mat-1');
  assert.equal(stripped.title, 'Logika Deduktif & Silogisme');
  assert.equal('pptUrl' in stripped && stripped.pptUrl !== undefined, false);
  assert.equal('pptName' in stripped && stripped.pptName !== undefined, false);
  assert.equal(stripped.updatedAt, '2026-05-01T12:00:00.000Z');
  // Original object stays immutable
  assert.equal(sampleModules[0].pptUrl, '/api/material-files/m123-abc-slide_logika.pptx');
});

test('removeMaterialById and replaceMaterialInList update material arrays cleanly', () => {
  const afterDelete = removeMaterialById(sampleModules, 'mat-2');
  assert.equal(afterDelete.length, 3);
  assert.deepEqual(
    afterDelete.map((m) => m.id),
    ['mat-1', 'mat-3', 'mat-4']
  );

  const stripped = stripMaterialPpt(sampleModules[0], '2026-05-01T12:00:00.000Z');
  const afterReplace = replaceMaterialInList(sampleModules, stripped);
  assert.equal(afterReplace.length, 4);
  assert.equal(afterReplace[0].pptUrl, undefined);
});

test('filterStudioMaterials filters by attachment, portal, and search query including tka', () => {
  assert.equal(filterStudioMaterials(sampleModules, { filter: 'all' }).length, 4);
  assert.deepEqual(
    filterStudioMaterials(sampleModules, { filter: 'with-ppt' }).map((m) => m.id),
    ['mat-1', 'mat-2']
  );
  assert.deepEqual(
    filterStudioMaterials(sampleModules, { filter: 'sma' }).map((m) => m.id),
    ['mat-2']
  );
  assert.deepEqual(
    filterStudioMaterials(sampleModules, { filter: 'tka' }).map((m) => m.id),
    ['mat-4']
  );
  assert.deepEqual(
    filterStudioMaterials(sampleModules, { filter: 'kedinasan' }).map((m) => m.id),
    ['mat-3']
  );
  assert.deepEqual(
    filterStudioMaterials(sampleModules, { filter: 'all', query: 'silogisme' }).map((m) => m.id),
    ['mat-1']
  );
});

test('mergeCloudAndPendingMaterials removes deleted cloud items, preserves unsynced drafts, and honors tombstones', () => {
  const cloud = [sampleModules[0], sampleModules[3]]; // mat-2 deleted in cloud
  const local = [sampleModules[0], sampleModules[1], sampleModules[2], sampleModules[3]];
  const merged = mergeCloudAndPendingMaterials(cloud, local, ['mat-3'], ['mat-4']);
  assert.deepEqual(
    merged.map((m) => m.id),
    ['mat-3', 'mat-1']
  );
});

test('mergeServerCloudAndLocalMaterials combines Kedinasan/TKA/UTBK materials without resurrecting deleted IDs', () => {
  const merged = mergeServerCloudAndLocalMaterials({
    serverMaterials: [sampleModules[2], sampleModules[3]],
    cloudMaterials: [sampleModules[0], sampleModules[3]],
    localMaterials: [sampleModules[1]],
    pendingLocalIds: ['mat-1'],
    deletedMaterialIds: ['mat-1', 'mat-3'],
  });
  assert.deepEqual(
    merged.map((m) => m.id),
    ['mat-4']
  );
});

test('mergeCloudAndPendingRooms excludes deleted room codes from Kedinasan, TKA, and UTBK', () => {
  const cloud = {
    KED01: { code: 'KED01', title: 'Try Out SKD' },
    TKA01: { code: 'TKA01', title: 'Try Out TKA' },
  };
  const local = {
    UTBK1: { code: 'UTBK1', title: 'Try Out UTBK' },
    KED01: { code: 'KED01', title: 'Try Out SKD' },
  };
  const merged = mergeCloudAndPendingRooms(cloud, local, ['KED01'], 'DEMO');
  assert.deepEqual(Object.keys(merged).sort(), ['TKA01', 'UTBK1']);
});
