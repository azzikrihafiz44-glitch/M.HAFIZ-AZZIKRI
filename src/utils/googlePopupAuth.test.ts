import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractFirebaseAuthCode,
  isPopupBlockedCode,
  isRestrictedInAppBrowser,
  resolveGoogleAuthFailureStrategy,
} from './googlePopupAuth';

describe('Google Popup Auth Resilience Logic', () => {
  it('extracts Firebase auth error codes from both error objects and message strings', () => {
    assert.equal(extractFirebaseAuthCode({ code: 'auth/popup-blocked' }), 'auth/popup-blocked');
    assert.equal(
      extractFirebaseAuthCode(new Error('Firebase: Error (auth/unauthorized-domain).')),
      'auth/unauthorized-domain'
    );
    assert.equal(extractFirebaseAuthCode(null), '');
  });

  it('triggers redirect fallback when popup is blocked outside an iframe', () => {
    const decision = resolveGoogleAuthFailureStrategy({
      error: { code: 'auth/popup-blocked' },
      inIframe: false,
      inAppBrowser: false,
      elapsedMs: 120,
    });
    assert.equal(decision.action, 'redirect-fallback');
  });

  it('triggers iframe recovery UI when popup is blocked inside an iframe', () => {
    const decision = resolveGoogleAuthFailureStrategy({
      error: { code: 'auth/popup-blocked' },
      inIframe: true,
      inAppBrowser: false,
      elapsedMs: 90,
    });
    assert.equal(decision.action, 'iframe-recovery');
  });

  it('treats instant popup-closed-by-user in in-app WebView as blocked rather than manual cancel', () => {
    assert.equal(isRestrictedInAppBrowser('Mozilla/5.0 Instagram 310.0.0.0 Android'), true);
    assert.equal(isRestrictedInAppBrowser('Mozilla/5.0 Chrome/128.0 Safari/537.36'), false);

    const decision = resolveGoogleAuthFailureStrategy({
      error: { code: 'auth/popup-closed-by-user' },
      inIframe: false,
      inAppBrowser: true,
      elapsedMs: 180,
    });
    assert.equal(decision.action, 'redirect-fallback');

    const manualCancel = resolveGoogleAuthFailureStrategy({
      error: { code: 'auth/popup-closed-by-user' },
      inIframe: false,
      inAppBrowser: false,
      elapsedMs: 4200,
    });
    assert.equal(manualCancel.action, 'user-cancelled');
  });

  it('recognizes unauthorized-domain and popup-blocked helper codes cleanly', () => {
    assert.equal(isPopupBlockedCode('auth/operation-not-supported-in-this-environment'), true);
    const domainDecision = resolveGoogleAuthFailureStrategy({
      error: { code: 'auth/unauthorized-domain' },
      inIframe: true,
      inAppBrowser: false,
      elapsedMs: 500,
      hostname: 'hafizeducation.my.id',
    });
    assert.equal(domainDecision.action, 'unauthorized-domain');
    assert.equal(domainDecision.userMessage.includes('hafizeducation.my.id'), true);
  });
});
