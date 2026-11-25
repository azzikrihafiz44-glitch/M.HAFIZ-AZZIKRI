export type GoogleAuthFailureAction =
  | 'redirect-fallback'
  | 'iframe-recovery'
  | 'unauthorized-domain'
  | 'user-cancelled'
  | 'unknown-error';

export interface GoogleAuthFailureDecision {
  action: GoogleAuthFailureAction;
  code: string;
  userMessage: string;
}

const POPUP_BLOCKED_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/cancelled-popup-request',
]);

export function extractFirebaseAuthCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const rawCode = (error as { code?: unknown }).code;
    if (typeof rawCode === 'string' && rawCode.trim()) {
      return rawCode.trim().toLowerCase();
    }
  }
  const msg = error instanceof Error ? error.message : String(error || '');
  const match = msg.match(/\((auth\/[a-z0-9-]+)\)/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return '';
}

export function isPopupBlockedCode(code: string): boolean {
  return POPUP_BLOCKED_CODES.has(code.trim().toLowerCase());
}

export function isRestrictedInAppBrowser(userAgent: string): boolean {
  if (!userAgent) return false;
  return /(?:FBAN|FBAV|Instagram|Line\/|WhatsApp|BytedanceWebview|Musical_ly|TikTok|;\s*wv\))/i.test(
    userAgent
  );
}

export function isRunningInsideIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function resolveGoogleAuthFailureStrategy(params: {
  error: unknown;
  inIframe: boolean;
  inAppBrowser: boolean;
  elapsedMs: number;
}): GoogleAuthFailureDecision {
  const code = extractFirebaseAuthCode(params.error);

  if (code === 'auth/unauthorized-domain') {
    return {
      action: 'unauthorized-domain',
      code,
      userMessage:
        'Domain ini belum diotorisasi untuk pop-up Google. Gunakan login Nama & Kata Sandi atau buka halaman dari domain resmi.',
    };
  }

  // Some strict mobile/WebView popup blockers reject immediately (< 650ms) as auth/popup-closed-by-user
  const looksLikeImmediateBlocker =
    code === 'auth/popup-closed-by-user' && (params.elapsedMs < 650 || params.inAppBrowser);

  if (isPopupBlockedCode(code) || looksLikeImmediateBlocker) {
    if (params.inIframe) {
      return {
        action: 'iframe-recovery',
        code: code || 'auth/popup-blocked',
        userMessage:
          'Pop-up Google ditahan oleh browser di mode frame/pratinjau. Buka di tab baru atau masuk langsung dengan Nama & Kata Sandi tanpa pop-up.',
      };
    }
    return {
      action: 'redirect-fallback',
      code: code || 'auth/popup-blocked',
      userMessage: 'Mengalihkan ke halaman login Google tanpa pop-up...',
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      action: 'user-cancelled',
      code,
      userMessage: 'Jendela login Google ditutup sebelum selesai.',
    };
  }

  return {
    action: 'unknown-error',
    code,
    userMessage:
      'Login Google gagal terhubung. Anda dapat mencoba lagi atau masuk langsung dengan Nama & Kata Sandi.',
  };
}
