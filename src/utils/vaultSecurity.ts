import type { AppSettings, AuthAccount, User } from '../types';

export interface SecurityCheckItem {
  id: 'google-auth' | 'master-password' | 'auto-lock' | 'hide-tokens' | 'biometric';
  label: string;
  description: string;
  passed: boolean;
  severity: 'critical' | 'recommended';
  actionLabel?: string;
}

export interface SecurityAuditReport {
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  passedCount: number;
  totalCount: number;
  checks: SecurityCheckItem[];
}

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MS = 30_000;

/**
 * Compute remaining brute-force lockout cooldown in milliseconds.
 */
export function calculateLockoutRemainingMs(
  failedAttempts: number,
  lockedUntil: number | null,
  now: number = Date.now()
): number {
  if (failedAttempts < LOCKOUT_THRESHOLD || !lockedUntil) {
    return 0;
  }
  return Math.max(0, lockedUntil - now);
}

/**
 * Evaluate live client-side vault security posture.
 */
export function evaluateSecurityAudit(
  user: User | null,
  settings: AppSettings,
  hasMasterPassword: boolean
): SecurityAuditReport {
  const checks: SecurityCheckItem[] = [
    {
      id: 'google-auth',
      label: 'Google OAuth Identity',
      description: user?.email
        ? `Signed in directly as ${user.email}`
        : 'Sign in with your verified Google account',
      passed: Boolean(user?.isEmailVerified && user?.email),
      severity: 'critical',
    },
    {
      id: 'master-password',
      label: 'Master Password (PBKDF2)',
      description: hasMasterPassword
        ? 'Salted PBKDF2 vault lock active'
        : 'Set a Master Password to lock vault',
      passed: hasMasterPassword,
      severity: 'critical',
      actionLabel: hasMasterPassword ? undefined : 'Set Now',
    },
    {
      id: 'auto-lock',
      label: 'Inactivity Auto-Lock',
      description:
        settings.autoLock && hasMasterPassword
          ? `Locks vault after ${settings.autoLockTimeout} min idle`
          : 'Enable Auto-Lock with Master Password',
      passed: Boolean(settings.autoLock && hasMasterPassword),
      severity: 'recommended',
      actionLabel: settings.autoLock && hasMasterPassword ? undefined : 'Enable',
    },
    {
      id: 'hide-tokens',
      label: 'Shoulder-Surfing Protection',
      description: settings.hideTokens
        ? '2FA tokens stay blurred until tapped'
        : 'Blur 2FA codes by default on vault open',
      passed: Boolean(settings.hideTokens),
      severity: 'recommended',
      actionLabel: settings.hideTokens ? undefined : 'Enable',
    },
    {
      id: 'biometric',
      label: 'Biometric Hardware Guard',
      description:
        settings.biometricEnabled && hasMasterPassword
          ? 'Face ID / Fingerprint unlock armed'
          : 'Link Face ID or Fingerprint on supported devices',
      passed: Boolean(settings.biometricEnabled && hasMasterPassword),
      severity: 'recommended',
      actionLabel: settings.biometricEnabled && hasMasterPassword ? undefined : 'Enable',
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const level: SecurityAuditReport['level'] =
    score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

  return {
    score,
    level,
    passedCount,
    totalCount: checks.length,
    checks,
  };
}

const VALID_CATEGORIES = new Set(['work', 'crypto', 'personal', 'social']);
const VALID_ALGORITHMS = new Set(['SHA1', 'SHA256']);

export interface ValidatedBackupResult {
  valid: boolean;
  accounts: AuthAccount[];
  settingsPatch?: Partial<AppSettings>;
  error?: string;
}

/**
 * Strictly validate and sanitize imported vault backup JSON to prevent
 * corrupted entries, prototype pollution, or invalid TOTP secrets.
 */
export function validateBackupPayload(jsonStr: string): ValidatedBackupResult {
  if (!jsonStr || jsonStr.length > 500_000) {
    return { valid: false, accounts: [], error: 'Backup file is empty or too large' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { valid: false, accounts: [], error: 'Invalid JSON backup format' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, accounts: [], error: 'Backup payload must be an object' };
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.accounts)) {
    return { valid: false, accounts: [], error: 'Backup does not contain an accounts list' };
  }

  if (record.accounts.length > 200) {
    return { valid: false, accounts: [], error: 'Backup exceeds maximum of 200 accounts' };
  }

  const sanitizedAccounts: AuthAccount[] = [];
  for (let i = 0; i < record.accounts.length; i++) {
    const raw = record.accounts[i];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;

    const issuer = String(item.issuer ?? '').trim().slice(0, 64);
    const accountName = String(item.accountName ?? '').trim().slice(0, 128);
    const normalizedSecret = String(item.secret ?? '')
      .toUpperCase()
      .replace(/[^A-Z2-7]/g, '')
      .slice(0, 128);

    if (!issuer || !accountName || normalizedSecret.length < 8) {
      continue;
    }

    const categoryRaw = String(item.category ?? 'personal');
    const category = (VALID_CATEGORIES.has(categoryRaw)
      ? categoryRaw
      : 'personal') as AuthAccount['category'];

    const algoRaw = String(item.algorithm ?? 'SHA1').toUpperCase();
    const algorithm = (VALID_ALGORITHMS.has(algoRaw) ? algoRaw : 'SHA1') as AuthAccount['algorithm'];
    const digits: 6 | 8 = Number(item.digits) === 8 ? 8 : 6;
    const period: 30 | 60 = Number(item.period) === 60 ? 60 : 30;

    sanitizedAccounts.push({
      id: String(item.id ?? `${Date.now()}-${i}`).slice(0, 64),
      issuer,
      accountName,
      secret: normalizedSecret,
      iconInitial: issuer.charAt(0).toUpperCase(),
      iconBg:
        typeof item.iconBg === 'string' && /^from-[a-z0-9-]+ to-[a-z0-9-]+$/.test(item.iconBg)
          ? item.iconBg
          : 'from-teal-500 to-cyan-700',
      category,
      isFavorite: Boolean(item.isFavorite),
      addedAt: typeof item.addedAt === 'number' && Number.isFinite(item.addedAt) ? item.addedAt : Date.now(),
      algorithm,
      digits,
      period,
    });
  }

  if (record.accounts.length > 0 && sanitizedAccounts.length === 0) {
    return {
      valid: false,
      accounts: [],
      error: 'No valid TOTP accounts found in backup file',
    };
  }

  // Only allow safe non-secret settings fields from backup
  let settingsPatch: Partial<AppSettings> | undefined;
  if (record.settings && typeof record.settings === 'object' && !Array.isArray(record.settings)) {
    const s = record.settings as Record<string, unknown>;
    settingsPatch = {};
    if (typeof s.autoLock === 'boolean') settingsPatch.autoLock = s.autoLock;
    if (typeof s.autoLockTimeout === 'number' && [1, 5, 15, 30].includes(s.autoLockTimeout)) {
      settingsPatch.autoLockTimeout = s.autoLockTimeout;
    }
    if (typeof s.hideTokens === 'boolean') settingsPatch.hideTokens = s.hideTokens;
    if (typeof s.backupEnabled === 'boolean') settingsPatch.backupEnabled = s.backupEnabled;
  }

  return { valid: true, accounts: sanitizedAccounts, settingsPatch };
}
