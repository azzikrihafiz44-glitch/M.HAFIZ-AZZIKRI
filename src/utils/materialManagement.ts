import type { StudyModule } from '../data/academicCatalog';

export type MaterialStudioFilter =
  | 'all'
  | 'with-ppt'
  | 'utbk'
  | 'tka'
  | 'kedinasan'
  | 'sma';

const LOCAL_MATERIAL_PREFIX = '/api/material-files/';
const SAFE_STORED_NAME_RE = /^[a-zA-Z0-9._-]{4,180}$/;

/**
 * Extracts a safe stored filename from a local `/api/material-files/:storedName` URL.
 * Returns null for external links (e.g. Google Slides/Drive) or malformed paths.
 */
export function extractLocalMaterialFileName(pptUrl?: string | null): string | null {
  if (!pptUrl || typeof pptUrl !== 'string') return null;
  const trimmed = pptUrl.trim();
  if (!trimmed.startsWith(LOCAL_MATERIAL_PREFIX)) return null;
  const withoutPrefix = trimmed.slice(LOCAL_MATERIAL_PREFIX.length);
  const pathPart = withoutPrefix.split(/[?#]/)[0] || '';
  let decoded = pathPart;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    return null;
  }
  if (!SAFE_STORED_NAME_RE.test(decoded) || decoded.includes('..')) {
    return null;
  }
  return decoded;
}

/**
 * Returns a copy of StudyModule with its PPT / attachment fields cleared.
 */
export function stripMaterialPpt(
  material: StudyModule,
  nowIso: string = new Date().toISOString()
): StudyModule {
  const next: StudyModule = {
    ...material,
    updatedAt: nowIso,
  };
  delete next.pptUrl;
  delete next.pptName;
  return next;
}

/**
 * Returns a new list without the specified material ID.
 */
export function removeMaterialById(
  materials: readonly StudyModule[],
  materialId: string
): StudyModule[] {
  return materials.filter((m) => m.id !== materialId);
}

/**
 * Updates an existing material in-place or prepends it if new.
 */
export function replaceMaterialInList(
  materials: readonly StudyModule[],
  updated: StudyModule
): StudyModule[] {
  const idx = materials.findIndex((m) => m.id === updated.id);
  if (idx === -1) return [updated, ...materials];
  return materials.map((m, i) => (i === idx ? updated : m));
}

/**
 * Filters study materials in Admin Studio by portal / attachment / search query.
 */
export function filterStudioMaterials(
  materials: readonly StudyModule[],
  options: { filter?: MaterialStudioFilter; query?: string } = {}
): StudyModule[] {
  const { filter = 'all', query = '' } = options;
  const q = query.trim().toLowerCase();

  return materials.filter((m) => {
    if (filter === 'with-ppt' && !m.pptUrl?.trim()) return false;
    if (filter === 'utbk' && m.portal !== 'utbk') return false;
    if (filter === 'tka' && m.portal !== 'tka') return false;
    if (filter === 'kedinasan' && m.portal !== 'kedinasan') return false;
    if (filter === 'sma' && m.portal !== 'sma') return false;

    if (!q) return true;
    const haystack = [m.title, m.subject, m.subtitle, m.pptName || '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Merges Firestore cloud materials with locally pending (unsynced) materials
 * while strictly suppressing any explicitly deleted material IDs so deletions
 * across Kedinasan, TKA, UTBK, and Kelas X-XII never resurrect.
 */
export function mergeCloudAndPendingMaterials(
  cloudMaterials: readonly StudyModule[],
  localMaterials: readonly StudyModule[],
  pendingLocalIds: readonly string[],
  deletedMaterialIds: readonly string[] = []
): StudyModule[] {
  const deletedSet = new Set(deletedMaterialIds);
  const filteredCloud = cloudMaterials.filter((m) => !deletedSet.has(m.id));
  const cloudById = new Set(filteredCloud.map((m) => m.id));
  const pendingSet = new Set(pendingLocalIds);
  const unsyncedLocals = localMaterials.filter(
    (m) => pendingSet.has(m.id) && !cloudById.has(m.id) && !deletedSet.has(m.id)
  );
  return [...unsyncedLocals, ...filteredCloud];
}

/**
 * Combines materials persisted on the Express server, Firestore cloud materials,
 * and locally pending drafts while filtering out deleted material IDs.
 */
export function mergeServerCloudAndLocalMaterials(options: {
  serverMaterials: readonly StudyModule[];
  cloudMaterials: readonly StudyModule[];
  localMaterials: readonly StudyModule[];
  pendingLocalIds: readonly string[];
  deletedMaterialIds?: readonly string[];
}): StudyModule[] {
  const deletedSet = new Set(options.deletedMaterialIds || []);
  const byId = new Map<string, StudyModule>();
  const upsert = (item: StudyModule) => {
    if (!item || !item.id || deletedSet.has(item.id)) return;
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      return;
    }
    const prevTime = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
    const nextTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    if (nextTime >= prevTime) {
      byId.set(item.id, item);
    }
  };

  for (const m of options.cloudMaterials) upsert(m);
  for (const m of options.serverMaterials) upsert(m);

  const pendingSet = new Set(options.pendingLocalIds);
  for (const m of options.localMaterials) {
    if (pendingSet.has(m.id)) upsert(m);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Merges cloud Try Out / Quiz rooms with local rooms while excluding any
 * deleted room codes so Studio Password Admin deletions never resurrect.
 */
export function mergeCloudAndPendingRooms<T extends { code: string }>(
  cloudRooms: Record<string, T>,
  localRooms: Record<string, T>,
  deletedRoomCodes: readonly string[] = [],
  excludedCode?: string
): Record<string, T> {
  const deletedSet = new Set(deletedRoomCodes);
  const merged: Record<string, T> = {};
  for (const [code, room] of Object.entries(localRooms)) {
    if (deletedSet.has(code) || (excludedCode && code === excludedCode)) continue;
    merged[code] = room;
  }
  for (const [code, room] of Object.entries(cloudRooms)) {
    if (deletedSet.has(code) || (excludedCode && code === excludedCode)) continue;
    merged[code] = room;
  }
  return merged;
}
