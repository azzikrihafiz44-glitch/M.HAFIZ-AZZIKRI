import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SESSION_TOKEN_KEY,
  PARTICIPANT_SESSION_TOKEN_KEY,
  buildAdminAuthHeaders,
  buildParticipantAuthHeaders,
  isValidSignedTokenShape,
  readStoredSessionToken,
  writeStoredSessionToken,
  type StorageLike,
} from './sessionPersistence';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('isValidSignedTokenShape validates base64url claim.signature tokens', () => {
  assert.equal(isValidSignedTokenShape('eyJyb2xlIjoicGFydGljaXBhbnQifQ.abcdef1234567890_sig'), true);
  assert.equal(isValidSignedTokenShape(''), false);
  assert.equal(isValidSignedTokenShape('invalid-no-dot'), false);
  assert.equal(isValidSignedTokenShape('short.sig'), false);
});

test('readStoredSessionToken and writeStoredSessionToken persist and clear participant/admin tokens cleanly', () => {
  const storage = createMemoryStorage();
  const sampleToken = 'eyJyb2xlIjoiYWRtaW4iLCJ1aWQiOiJzdHVkaW8ifQ.signature1234567890abc';

  assert.equal(readStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, storage), '');
  writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, sampleToken, storage);
  assert.equal(readStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, storage), sampleToken);

  writeStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, sampleToken, storage);
  assert.equal(readStoredSessionToken(ADMIN_SESSION_TOKEN_KEY, storage), sampleToken);

  // Clearing removes token cleanly
  writeStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, '', storage);
  assert.equal(readStoredSessionToken(PARTICIPANT_SESSION_TOKEN_KEY, storage), '');
});

test('buildParticipantAuthHeaders and buildAdminAuthHeaders attach tokens only when valid', () => {
  const tok = 'eyJyb2xlIjoicGFydGljaXBhbnQifQ.signature1234567890abc';
  const pHeaders = buildParticipantAuthHeaders(tok, { 'Content-Type': 'application/json' });
  assert.equal(pHeaders['Authorization'], `Bearer ${tok}`);
  assert.equal(pHeaders['X-Hafiz-Participant-Token'], tok);
  assert.equal(pHeaders['Content-Type'], 'application/json');

  const emptyPHeaders = buildParticipantAuthHeaders('');
  assert.equal('Authorization' in emptyPHeaders, false);
  assert.equal('X-Hafiz-Participant-Token' in emptyPHeaders, false);

  const aHeaders = buildAdminAuthHeaders(tok);
  assert.equal(aHeaders['X-Hafiz-Admin-Token'], tok);
});
