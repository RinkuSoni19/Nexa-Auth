import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveDisplayName,
  mapFirebaseUserToAppUser,
  buildUserProfilePayload,
  mapGoogleAuthError,
  USER_PROFILE_LIMITS,
} from './googleAuthFlow';

test('deriveDisplayName prefers displayName, falls back to email prefix, then Google User', () => {
  assert.equal(deriveDisplayName('Rinku Soni', 'rinkusoni28489@gmail.com'), 'Rinku Soni');
  assert.equal(deriveDisplayName('   ', 'alex.kumar@gmail.com'), 'Alex.kumar');
  assert.equal(deriveDisplayName(null, null), 'Google User');
});

test('mapFirebaseUserToAppUser maps Google sign-in directly without OTP and preserves joinedAt for same email', () => {
  const fixedNow = 1700000000000;
  const freshUser = mapFirebaseUserToAppUser(
    {
      uid: 'uid_123',
      displayName: 'Rinku Soni',
      email: 'RinkuSoni28489@gmail.com',
      photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
      emailVerified: true,
    },
    null,
    fixedNow
  );

  assert.equal(freshUser.name, 'Rinku Soni');
  assert.equal(freshUser.email, 'rinkusoni28489@gmail.com');
  assert.equal(freshUser.avatar, 'https://lh3.googleusercontent.com/photo.jpg');
  assert.equal(freshUser.isEmailVerified, true);
  assert.equal(freshUser.authMethod, 'google');
  assert.equal(freshUser.joinedAt, fixedNow);

  const returningUser = mapFirebaseUserToAppUser(
    {
      uid: 'uid_123',
      displayName: 'Rinku Soni',
      email: 'rinkusoni28489@gmail.com',
      photoURL: 'https://lh3.googleusercontent.com/photo2.jpg',
      emailVerified: true,
    },
    { ...freshUser, joinedAt: 1600000000000 },
    fixedNow + 5000
  );

  assert.equal(returningUser.joinedAt, 1600000000000);
  assert.equal(returningUser.avatar, 'https://lh3.googleusercontent.com/photo2.jpg');
});

test('buildUserProfilePayload enforces schema bounds without subscription plan fields', () => {
  const longName = 'A'.repeat(250);
  const payload = buildUserProfilePayload(
    {
      name: longName,
      email: 'User@Gmail.com',
      avatar: 'https://example.com/a.png',
      authMethod: 'google',
      joinedAt: 1700000000000,
    },
    'uid_abc123'
  );

  assert.equal(payload.uid, 'uid_abc123');
  assert.equal(payload.name.length, USER_PROFILE_LIMITS.NAME_MAX);
  assert.equal(payload.email, 'user@gmail.com');
  assert.equal(payload.authMethod, 'google');
  assert.equal('plan' in payload, false);
});

test('mapGoogleAuthError returns user-friendly messages for known Firebase Auth error codes', () => {
  assert.match(mapGoogleAuthError({ code: 'auth/popup-closed-by-user' }), /closed/i);
  assert.match(mapGoogleAuthError({ code: 'auth/popup-blocked' }), /blocked/i);
  assert.match(mapGoogleAuthError({ code: 'auth/network-request-failed' }), /network/i);
  assert.match(mapGoogleAuthError({ code: 'auth/unauthorized-domain' }), /authorized/i);
  assert.match(mapGoogleAuthError(new Error('unknown')), /Could not complete Google Sign-In/i);
});
