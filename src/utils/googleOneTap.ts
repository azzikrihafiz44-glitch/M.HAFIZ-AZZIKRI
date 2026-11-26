export const MANUAL_GOOGLE_LOGOUT_KEY = 'hafiz_manual_google_logout_v1';

export type AutoGoogleConnectStatus =
  | 'idle'
  | 'connecting'
  | 'prompted'
  | 'ready-manual'
  | 'connected';

export interface AutoGoogleConnectCheckParams {
  hasCurrentUser: boolean;
  manuallySignedOut: boolean;
  clientId: string;
  isAutomatedBrowser?: boolean;
}

export function shouldAttemptAutoGoogleConnect(params: AutoGoogleConnectCheckParams): boolean {
  if (params.hasCurrentUser) return false;
  if (params.manuallySignedOut) return false;
  if (params.isAutomatedBrowser) return false;
  return Boolean(params.clientId && params.clientId.trim().endsWith('.apps.googleusercontent.com'));
}

export function isManualGoogleLogoutActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MANUAL_GOOGLE_LOGOUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markManualGoogleLogout(loggedOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (loggedOut) {
      window.localStorage.setItem(MANUAL_GOOGLE_LOGOUT_KEY, '1');
    } else {
      window.localStorage.removeItem(MANUAL_GOOGLE_LOGOUT_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export interface GoogleIdAccountsApi {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
  disableAutoSelect?: () => void;
  cancel?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdAccountsApi;
      };
    };
  }
}

let gsiScriptPromise: Promise<GoogleIdAccountsApi | null> | null = null;

export function loadGoogleIdentityServices(): Promise<GoogleIdAccountsApi | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  const existing = window.google?.accounts?.id;
  if (existing) {
    return Promise.resolve(existing);
  }
  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }

  gsiScriptPromise = new Promise((resolve) => {
    const scriptId = 'google-gsi-client-script';
    const existingEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingEl) {
      const done = () => resolve(window.google?.accounts?.id ?? null);
      existingEl.addEventListener('load', done, { once: true });
      existingEl.addEventListener('error', () => resolve(null), { once: true });
      window.setTimeout(done, 1500);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => {
      resolve(window.google?.accounts?.id ?? null);
    }, 3500);

    script.onload = () => {
      window.clearTimeout(timer);
      resolve(window.google?.accounts?.id ?? null);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}
