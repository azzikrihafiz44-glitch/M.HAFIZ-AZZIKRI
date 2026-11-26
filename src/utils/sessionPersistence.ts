export const PARTICIPANT_SESSION_TOKEN_KEY = 'hafiz_participant_session_token_v1';
export const ADMIN_SESSION_TOKEN_KEY = 'hafiz_admin_session_token_v1';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const VALID_SIGNED_TOKEN_RE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}$/;

export function isValidSignedTokenShape(token: unknown): token is string {
  return typeof token === 'string' && VALID_SIGNED_TOKEN_RE.test(token.trim());
}

export function readStoredSessionToken(
  key: string,
  storage: StorageLike | null | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): string {
  if (!storage) return '';
  try {
    const raw = storage.getItem(key);
    return isValidSignedTokenShape(raw) ? raw.trim() : '';
  } catch {
    return '';
  }
}

export function writeStoredSessionToken(
  key: string,
  token: string | null | undefined,
  storage: StorageLike | null | undefined = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
): void {
  if (!storage) return;
  try {
    if (isValidSignedTokenShape(token)) {
      storage.setItem(key, token.trim());
    } else {
      storage.removeItem(key);
    }
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

export function buildParticipantAuthHeaders(
  token?: string | null,
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (isValidSignedTokenShape(token)) {
    const clean = token.trim();
    headers['Authorization'] = `Bearer ${clean}`;
    headers['X-Hafiz-Participant-Token'] = clean;
  }
  return headers;
}

export function buildAdminAuthHeaders(
  adminToken?: string | null,
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (isValidSignedTokenShape(adminToken)) {
    headers['X-Hafiz-Admin-Token'] = adminToken.trim();
  }
  return headers;
}
