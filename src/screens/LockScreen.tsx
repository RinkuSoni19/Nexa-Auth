import React, { useState, useEffect, useRef } from 'react';
import {
  Fingerprint, ScanFace, KeyRound, CheckCircle2, Eye, EyeOff,
  AlertCircle, ShieldCheck, ArrowLeft, Loader2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  authenticateWithNativeBiometrics,
  checkBiometricCapability,
  isNativeBiometricPlatform,
  formatBiometrySummary,
} from '../services/biometricAuth';
import { getModalityDisplayInfo, validateMasterPassword, type BiometricModality } from '../utils/masterAuth';
import {
  calculateLockoutRemainingMs,
  LOCKOUT_DURATION_MS,
  LOCKOUT_THRESHOLD,
} from '../utils/vaultSecurity';

export const LockScreen: React.FC = () => {
  const {
    unlock,
    showToast,
    settings,
    hasMasterPassword,
    biometryInfo,
    setMasterPassword,
    verifyVaultMasterPassword,
    refreshBiometry,
  } = useApp();

  // Setup state (when locking before a master password has been configured)
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupShowPw, setSetupShowPw] = useState(false);
  const [setupEnableBio, setSetupEnableBio] = useState(true);
  const [setupModality, setSetupModality] = useState<BiometricModality>(settings.biometricModality);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  // Unlock state (when master password exists)
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Biometric prompt state
  const [isVerified, setIsVerified] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const modalityInfo = getModalityDisplayInfo(
    biometryInfo?.biometryTypes ?? [],
    settings.biometricModality
  );

  const canUseBiometrics =
    hasMasterPassword &&
    settings.biometricEnabled &&
    Boolean(biometryInfo?.isAvailable);

  useEffect(() => {
    refreshBiometry(settings.biometricModality);
  }, [refreshBiometry, settings.biometricModality]);

  useEffect(() => {
    if (!lockedUntil) {
      setLockoutSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = calculateLockoutRemainingMs(failedAttempts, lockedUntil, Date.now());
      setLockoutSeconds(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setLockedUntil(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [failedAttempts, lockedUntil]);

  const completeUnlock = (label: string) => {
    setIsVerified(true);
    setBiometricScanning(false);
    setFailedAttempts(0);
    setLockedUntil(null);
    setTimeout(() => {
      unlock();
      showToast(label);
    }, 450);
  };

  const handleMasterPasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    const check = validateMasterPassword(setupPassword, setupConfirm);
    if (!check.valid) {
      setSetupError(check.error || 'Invalid master password');
      return;
    }
    setSetupBusy(true);
    const res = await setMasterPassword(setupPassword, undefined, setupEnableBio, setupModality);
    setSetupBusy(false);
    if (!res.ok) {
      setSetupError(res.error || 'Failed to save master password');
      return;
    }
    setSetupPassword('');
    setSetupConfirm('');
  };

  const handleMasterPasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);

    const remainingMs = calculateLockoutRemainingMs(failedAttempts, lockedUntil, Date.now());
    if (remainingMs > 0) {
      setUnlockError(`Too many failed attempts. Wait ${Math.ceil(remainingMs / 1000)}s before retrying.`);
      return;
    }

    if (!passwordInput) {
      setUnlockError('Enter your master password to unlock');
      return;
    }

    setVerifyingPassword(true);
    const ok = await verifyVaultMasterPassword(passwordInput);
    setVerifyingPassword(false);

    if (!ok) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= LOCKOUT_THRESHOLD) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
        setUnlockError('Too many failed attempts. Vault unlock paused for 30 seconds.');
      } else {
        setUnlockError('Incorrect master password');
      }
      return;
    }

    completeUnlock('Vault Unlocked via Master Password');
  };

  const triggerBiometricAuth = async (requestedMethod: 'faceId' | 'fingerprint') => {
    setUnlockError(null);

    if (!isNativeBiometricPlatform()) {
      setUnlockError(
        'Native Face ID / Fingerprint requires an Android or iOS device. Enter your Master Password to unlock on web.'
      );
      passwordRef.current?.focus();
      return;
    }

    const capability = await checkBiometricCapability(
      requestedMethod === 'faceId' ? 'faceId' : 'fingerprint'
    );

    if (!capability.isAvailable) {
      setUnlockError(capability.reason || 'Biometric hardware not available');
      return;
    }

    setBiometricScanning(true);
    const res = await authenticateWithNativeBiometrics(
      requestedMethod === 'faceId'
        ? 'Verify Face ID to unlock NexaAuth Vault'
        : 'Verify Fingerprint to unlock NexaAuth Vault'
    );
    setBiometricScanning(false);

    if (res.success) {
      completeUnlock(
        requestedMethod === 'faceId'
          ? 'Vault Unlocked via Face ID'
          : 'Vault Unlocked via Fingerprint'
      );
    } else if (!res.cancelled) {
      setUnlockError(res.error || 'Biometric verification failed. Use Master Password.');
    } else {
      passwordRef.current?.focus();
    }
  };

  // ── MODE 1: MASTER PASSWORD SETUP REQUIRED FIRST ──────────────────────────────
  if (!hasMasterPassword) {
    const setupCheck = validateMasterPassword(setupPassword, setupConfirm);
    return (
      <div className="relative flex-1 flex flex-col justify-between px-5 pt-9 pb-6 w-full h-full bg-[#030705] text-white overflow-y-auto no-scrollbar">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={unlock}
            aria-label="Cancel lock and return to vault"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Vault</span>
          </button>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            STEP 1 OF 2
          </span>
        </div>

        <div className="relative z-10 my-auto py-4">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_25px_rgba(0,255,136,0.18)]">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">Create Master Password</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Set a master password first to lock your vault and enable Face ID or Fingerprint unlock.
            </p>
          </div>

          <form onSubmit={handleMasterPasswordSetup} className="space-y-3.5">
            <div>
              <label htmlFor="lock-setup-pw" className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="lock-setup-pw"
                  type={setupShowPw ? 'text' : 'password'}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#0a1610] border border-emerald-500/30 focus:border-emerald-400 rounded-2xl px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setSetupShowPw((s) => !s)}
                  aria-label={setupShowPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {setupShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {setupPassword.length > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Password strength</span>
                  <span className={
                    setupCheck.strength === 'strong'
                      ? 'text-emerald-400 font-bold uppercase'
                      : setupCheck.strength === 'fair'
                      ? 'text-amber-400 font-bold uppercase'
                      : 'text-red-400 font-bold uppercase'
                  }>
                    {setupCheck.strength}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="lock-setup-confirm" className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                Confirm Master Password
              </label>
              <input
                id="lock-setup-confirm"
                type={setupShowPw ? 'text' : 'password'}
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value)}
                placeholder="Re-enter master password"
                className="w-full bg-[#0a1610] border border-zinc-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none font-mono"
              />
            </div>

            <div className="p-3 rounded-2xl bg-[#0a1610] border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Enable Biometric Unlock</span>
                    <span className="text-[10px] text-zinc-400">Allow Face ID / Fingerprint after saving</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={setupEnableBio}
                  aria-label="Enable Biometric Unlock"
                  onClick={() => setSetupEnableBio((b) => !b)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                    setupEnableBio ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      setupEnableBio ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {setupEnableBio && (
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { id: 'both', label: 'Both', icon: ShieldCheck },
                    { id: 'faceId', label: 'Face ID', icon: ScanFace },
                    { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSetupModality(id)}
                      className={`py-1.5 px-2 rounded-xl border text-[10px] font-mono font-semibold flex items-center justify-center gap-1 cursor-pointer transition ${
                        setupModality === id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {setupError && (
              <div role="alert" className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={setupBusy}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-sm cursor-pointer hover:brightness-110 transition disabled:opacity-50"
            >
              {setupBusy ? 'Securing Vault…' : 'Set Master Password & Continue'}
            </button>
          </form>
        </div>

        <p className="relative z-10 text-center text-[10px] text-zinc-500 font-mono">
          AES-256 Salted Hash • Capacitor Biometric Shield
        </p>
      </div>
    );
  }

  // ── MODE 2: VAULT LOCKED (BIOMETRICS + MASTER PASSWORD UNLOCK) ─────────────────
  return (
    <div className="relative flex-1 flex flex-col justify-between px-6 pt-10 pb-6 w-full h-full bg-[#030705] text-white select-none overflow-y-auto no-scrollbar">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center mt-1 text-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/40 p-1 bg-black shadow-lg mb-3">
          <img src="/icon.jpg" alt="NexaAuth" className="w-full h-full object-cover rounded-xl" />
        </div>
        <h2 className="text-xl font-black text-white">NexaAuth Vault Locked</h2>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          {canUseBiometrics
            ? `Unlock with ${modalityInfo.label} or Master Password`
            : 'Enter Master Password to decrypt vault'}
        </p>
      </div>

      {/* Biometric Sensor & Action Buttons */}
      <div className="relative z-10 flex flex-col items-center my-auto py-4 w-full max-w-xs mx-auto space-y-5">
        {canUseBiometrics ? (
          <div className="flex flex-col items-center w-full space-y-4">
            {/* Primary Biometric Trigger Orb */}
            <button
              type="button"
              onClick={() => triggerBiometricAuth(modalityInfo.primaryType === 'face' ? 'faceId' : 'fingerprint')}
              aria-label={`Unlock with ${modalityInfo.label}`}
              disabled={biometricScanning || isVerified}
              className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 ${
                isVerified
                  ? 'bg-emerald-500 text-black border-emerald-300 scale-105 shadow-[0_0_35px_#00ff88]'
                  : biometricScanning
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-400 animate-pulse'
                  : 'bg-[#0a1811] text-emerald-400 hover:bg-[#11261b] border-emerald-500/40 shadow-[0_0_24px_rgba(0,255,136,0.18)]'
              }`}
            >
              {isVerified ? (
                <CheckCircle2 className="w-12 h-12" />
              ) : biometricScanning ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : modalityInfo.primaryType === 'face' ? (
                <ScanFace className="w-12 h-12" />
              ) : (
                <Fingerprint className="w-12 h-12" />
              )}
            </button>

            <div className="text-center">
              <span className="text-xs font-mono text-emerald-300 font-semibold block">
                {isVerified
                  ? 'IDENTITY CONFIRMED'
                  : biometricScanning
                  ? 'Verifying Biometrics…'
                  : `Tap to unlock with ${modalityInfo.label}`}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Capacitor Biometric Auth • {formatBiometrySummary(biometryInfo)}
              </span>
            </div>

            {/* Dedicated Face ID / Fingerprint Buttons when both or specific mode enabled */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {modalityInfo.supportsFace && (
                <button
                  type="button"
                  onClick={() => triggerBiometricAuth('faceId')}
                  disabled={biometricScanning || isVerified}
                  className={`py-2.5 px-3 rounded-2xl bg-[#0b1b13] border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    !modalityInfo.supportsFingerprint ? 'col-span-2' : ''
                  }`}
                >
                  <ScanFace className="w-4 h-4" />
                  <span>Face ID</span>
                </button>
              )}
              {modalityInfo.supportsFingerprint && (
                <button
                  type="button"
                  onClick={() => triggerBiometricAuth('fingerprint')}
                  disabled={biometricScanning || isVerified}
                  className={`py-2.5 px-3 rounded-2xl bg-[#0b1b13] border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    !modalityInfo.supportsFace ? 'col-span-2' : ''
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Fingerprint</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-[11px] font-mono text-zinc-400">
            {settings.biometricEnabled
              ? 'Biometric hardware unavailable — use Master Password below'
              : 'Biometric unlock is turned off in Settings'}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <span className="h-px flex-1 bg-zinc-800" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Master Password</span>
          <span className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Master Password Unlock Form */}
        <form onSubmit={handleMasterPasswordUnlock} className="w-full space-y-3">
          <div>
            <label htmlFor="unlock-master-password" className="sr-only">
              Master Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={passwordRef}
                id="unlock-master-password"
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Master Password"
                className="w-full bg-[#0a1610] border border-emerald-500/25 focus:border-emerald-400 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-600 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide master password' : 'Show master password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {unlockError && (
            <div role="alert" className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {unlockError}
                {failedAttempts > 1 ? ` (${failedAttempts} attempts)` : ''}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={verifyingPassword || isVerified || lockoutSeconds > 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {lockoutSeconds > 0
                ? `Locked (${lockoutSeconds}s)`
                : verifyingPassword
                ? 'Verifying…'
                : 'Unlock Vault'}
            </span>
          </button>
        </form>
      </div>

      <p className="relative z-10 text-center text-[10px] text-zinc-500 font-mono">
        PBKDF2-SHA256 Master Password • Native Biometric Guard
      </p>
    </div>
  );
};
