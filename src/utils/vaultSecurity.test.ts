import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSecurityAudit,
  validateBackupPayload,
  calculateLockoutRemainingMs,
  LOCKOUT_THRESHOLD,
} from './vaultSecurity';

test('evaluateSecurityAudit computes accurate score and action prompts', () => {
  const baseSettings = {
    biometricEnabled: false,
    biometricModality: 'both' as const,
    autoLock: true,
    autoLockTimeout: 5,
    hideTokens: false,
    darkMode: true,
    backupEnabled: true,
  };

  const lowReport = evaluateSecurityAudit(null, baseSettings, false);
  assert.equal(lowReport.score, 0);
  assert.equal(lowReport.level, 'LOW');

  const highReport = evaluateSecurityAudit(
    {
      name: 'Alex',
      email: 'alex@gmail.com',
      isEmailVerified: true,
      authMethod: 'google',
      joinedAt: 1700000000000,
    },
    { ...baseSettings, hideTokens: true, biometricEnabled: true },
    true
  );
  assert.equal(highReport.score, 100);
  assert.equal(highReport.level, 'HIGH');
  assert.equal(highReport.passedCount, highReport.totalCount);
});

test('validateBackupPayload accepts clean backup and blocks malformed/oversized/injected fields', () => {
  const validJson = JSON.stringify({
    version: '2.0.0',
    accounts: [
      {
        id: '1',
        issuer: 'GitHub',
        accountName: 'dev@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        iconBg: 'from-zinc-700 to-zinc-900',
        category: 'work',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        isFavorite: true,
      },
    ],
    settings: {
      hideTokens: true,
      autoLockTimeout: 5,
      masterPasswordHash: 'injected-hash-must-be-ignored',
    },
  });

  const ok = validateBackupPayload(validJson);
  assert.equal(ok.valid, true);
  assert.equal(ok.accounts.length, 1);
  assert.equal(ok.accounts[0].issuer, 'GitHub');
  assert.equal(ok.settingsPatch?.hideTokens, true);
  assert.equal((ok.settingsPatch as Record<string, unknown>)?.masterPasswordHash, undefined);

  const badSecret = validateBackupPayload(
    JSON.stringify({
      accounts: [{ issuer: 'Bad', accountName: 'a@b.com', secret: '123' }],
    })
  );
  assert.equal(badSecret.valid, false);

  const badJson = validateBackupPayload('{not-json');
  assert.equal(badJson.valid, false);
});

test('calculateLockoutRemainingMs enforces cooldown only at or above threshold', () => {
  const now = 1_000_000;
  assert.equal(calculateLockoutRemainingMs(LOCKOUT_THRESHOLD - 1, now + 30_000, now), 0);
  assert.equal(calculateLockoutRemainingMs(LOCKOUT_THRESHOLD, now + 25_000, now), 25_000);
  assert.equal(calculateLockoutRemainingMs(LOCKOUT_THRESHOLD, now - 1_000, now), 0);
});
