import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAttemptAutoGoogleConnect } from './googleOneTap';

test('shouldAttemptAutoGoogleConnect allows auto-connect only for unauthenticated, non-logged-out visitors with a valid clientId', () => {
  const validClientId = '24398891350-j16rp9i4cpuiqlbc3ksv3bggmsg41sod.apps.googleusercontent.com';

  assert.equal(
    shouldAttemptAutoGoogleConnect({
      hasCurrentUser: false,
      manuallySignedOut: false,
      clientId: validClientId,
    }),
    true
  );

  assert.equal(
    shouldAttemptAutoGoogleConnect({
      hasCurrentUser: true,
      manuallySignedOut: false,
      clientId: validClientId,
    }),
    false
  );

  assert.equal(
    shouldAttemptAutoGoogleConnect({
      hasCurrentUser: false,
      manuallySignedOut: true,
      clientId: validClientId,
    }),
    false
  );

  assert.equal(
    shouldAttemptAutoGoogleConnect({
      hasCurrentUser: false,
      manuallySignedOut: false,
      clientId: '',
    }),
    false
  );

  assert.equal(
    shouldAttemptAutoGoogleConnect({
      hasCurrentUser: false,
      manuallySignedOut: false,
      clientId: validClientId,
      isAutomatedBrowser: true,
    }),
    false
  );
});
