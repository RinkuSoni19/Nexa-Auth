import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMasterPassword,
  hashMasterPassword,
  verifyMasterPassword,
  canEnableBiometricUnlock,
  getModalityDisplayInfo,
  sha256Hex,
} from './masterAuth';

test('validateMasterPassword enforces minimum length and confirmation match', () => {
  const shortRes = validateMasterPassword('12345', '12345');
  assert.equal(shortRes.valid, false);
  assert.match(shortRes.error || '', /at least 6/i);

  const mismatchRes = validateMasterPassword('Secret123!', 'Secret999!');
  assert.equal(mismatchRes.valid, false);
  assert.match(mismatchRes.error || '', /do not match/i);

  const weakRes = validateMasterPassword('abcdef', 'abcdef');
  assert.equal(weakRes.valid, true);
  assert.equal(weakRes.strength, 'weak');

  const strongRes = validateMasterPassword('NexaVault#2026', 'NexaVault#2026');
  assert.equal(strongRes.valid, true);
  assert.equal(strongRes.strength, 'strong');
});

test('hashMasterPassword & verifyMasterPassword verify PBKDF2-SHA256 and legacy hashes accurately', async () => {
  const stored = await hashMasterPassword('MyMasterPass#99');
  assert.ok(stored.startsWith('pbkdf2_v1:100000:'));

  const ok = await verifyMasterPassword('MyMasterPass#99', stored);
  assert.equal(ok, true);

  const wrong = await verifyMasterPassword('WrongPassword', stored);
  assert.equal(wrong, false);

  const malformed = await verifyMasterPassword('MyMasterPass#99', 'not-a-valid-hash');
  assert.equal(malformed, false);

  const empty = await verifyMasterPassword('', stored);
  assert.equal(empty, false);

  const anotherStored = await hashMasterPassword('MyMasterPass#99');
  assert.notEqual(stored, anotherStored);
  assert.equal(await verifyMasterPassword('MyMasterPass#99', anotherStored), true);

  // Backwards compatibility for legacy "salt:sha256" hashes
  const legacyDigest = await sha256Hex('deadbeef:LegacyPass1!');
  assert.equal(await verifyMasterPassword('LegacyPass1!', `deadbeef:${legacyDigest}`), true);
  assert.equal(await verifyMasterPassword('WrongLegacy', `deadbeef:${legacyDigest}`), false);
});

test('sha256Hex produces standard NIST SHA-256 test vector', async () => {
  const digest = await sha256Hex('abc');
  assert.equal(
    digest,
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('canEnableBiometricUnlock requires master password first and hardware availability', () => {
  const noPw = canEnableBiometricUnlock(false, true);
  assert.equal(noPw.allowed, false);
  assert.match(noPw.reason || '', /Master Password/i);

  const noHw = canEnableBiometricUnlock(true, false);
  assert.equal(noHw.allowed, false);
  assert.match(noHw.reason || '', /not available/i);

  const ok = canEnableBiometricUnlock(true, true);
  assert.equal(ok.allowed, true);
});

test('getModalityDisplayInfo resolves Face ID, Fingerprint, and combined modes', () => {
  assert.deepEqual(getModalityDisplayInfo([2, 3], 'both'), {
    supportsFace: true,
    supportsFingerprint: true,
    label: 'Face ID & Fingerprint',
    primaryType: 'both',
  });

  assert.deepEqual(getModalityDisplayInfo([2, 3], 'faceId'), {
    supportsFace: true,
    supportsFingerprint: false,
    label: 'Face ID',
    primaryType: 'face',
  });

  assert.deepEqual(getModalityDisplayInfo([2, 3], 'fingerprint'), {
    supportsFace: false,
    supportsFingerprint: true,
    label: 'Fingerprint',
    primaryType: 'fingerprint',
  });

  assert.deepEqual(getModalityDisplayInfo([]), {
    supportsFace: false,
    supportsFingerprint: false,
    label: 'Biometrics',
    primaryType: 'none',
  });
});
