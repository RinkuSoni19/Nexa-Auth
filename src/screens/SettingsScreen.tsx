import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Moon, Eye, CloudUpload, Upload, LogOut, Lock,
  Fingerprint, Smartphone, KeyRound, ScanFace, ShieldCheck, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { MasterPasswordModal } from '../components/MasterPasswordModal';
import { formatBiometrySummary } from '../services/biometricAuth';
import { canEnableBiometricUnlock } from '../utils/masterAuth';
import { evaluateSecurityAudit } from '../utils/vaultSecurity';
import type { BiometricModality } from '../types';

const LOCK_TIMEOUTS = [1, 5, 15, 30] as const;

export const SettingsScreen: React.FC = () => {
  const {
    setScreen, settings, updateSettings, accounts, user, setUser, showToast,
    hasMasterPassword, biometryInfo, setMasterPassword, clearMasterPassword,
    refreshBiometry, exportBackup, importBackup, lock,
  } = useApp();

  const [showMasterModal, setShowMasterModal] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const securityReport = evaluateSecurityAudit(user, settings, hasMasterPassword);

  const toggleSetting = (key: 'autoLock' | 'hideTokens' | 'darkMode' | 'backupEnabled') => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleToggleBiometric = async () => {
    if (settings.biometricEnabled) {
      updateSettings({ biometricEnabled: false });
      showToast('Biometric unlock disabled');
      return;
    }

    const latestInfo = await refreshBiometry(settings.biometricModality);
    const eligibility = canEnableBiometricUnlock(
      hasMasterPassword,
      Boolean(latestInfo?.isAvailable ?? true)
    );

    if (!eligibility.allowed) {
      showToast(eligibility.reason || 'Set a Master Password first');
      if (!hasMasterPassword) {
        setShowMasterModal(true);
      }
      return;
    }

    updateSettings({ biometricEnabled: true });
    showToast('Biometric unlock enabled');
  };

  const handleSecurityCheckAction = (checkId: string) => {
    if (checkId === 'master-password') {
      setShowMasterModal(true);
    } else if (checkId === 'auto-lock') {
      if (!hasMasterPassword) {
        setShowMasterModal(true);
      } else {
        updateSettings({ autoLock: true });
        showToast('Inactivity Auto-Lock enabled');
      }
    } else if (checkId === 'hide-tokens') {
      updateSettings({ hideTokens: true });
      showToast('Tokens blurred by default');
    } else if (checkId === 'biometric') {
      handleToggleBiometric();
    }
  };

  const handleModalityChange = async (modality: BiometricModality) => {
    updateSettings({ biometricModality: modality });
    await refreshBiometry(modality);
    showToast(
      modality === 'faceId'
        ? 'Biometric method set to Face ID'
        : modality === 'fingerprint'
        ? 'Biometric method set to Fingerprint'
        : 'Biometric method set to Face ID & Fingerprint'
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      showToast('Backup file exceeds 500KB safety limit');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      importBackup(String(reader.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = () => {
    setUser(null);
    showToast('Signed out successfully');
    setScreen('welcome');
  };

  const ToggleRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    desc: string;
    checked: boolean;
    onToggle: () => void;
    disabledHint?: string;
  }> = ({ icon, label, desc, checked, onToggle, disabledHint }) => (
    <div className="flex items-center gap-3 py-3.5 border-b border-zinc-800/60 last:border-0">
      <div className="text-zinc-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-white block">{label}</span>
        <span className="text-[11px] text-zinc-500 block">{desc}</span>
        {disabledHint && (
          <span className="text-[10px] font-mono text-amber-400 block mt-0.5">{disabledHint}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 flex-shrink-0 ${
          checked ? 'bg-emerald-500' : 'bg-zinc-700'
        }`}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
          animate={{ left: checked ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setScreen('dashboard')}
          aria-label="Back to Vault"
          className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-bold text-white text-base">Security & Settings</h2>
          <p className="text-[10px] text-zinc-500 font-mono">{accounts.length} tokens · v2.1.0</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-36 no-scrollbar space-y-4">

        {/* Live App Security Check Card */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/25 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                App Security Audit
              </h3>
            </div>
            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                securityReport.level === 'HIGH'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : securityReport.level === 'MEDIUM'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                  : 'bg-red-500/15 text-red-300 border-red-500/35'
              }`}
            >
              {securityReport.score}% · {securityReport.level}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className={`h-full ${
                securityReport.level === 'HIGH'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : securityReport.level === 'MEDIUM'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : 'bg-gradient-to-r from-red-500 to-amber-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${securityReport.score}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="space-y-2 pt-1">
            {securityReport.checks.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80"
              >
                <div className="flex items-start gap-2 min-w-0">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white block truncate">{item.label}</span>
                    <span className="text-[10px] text-zinc-400 block truncate">{item.description}</span>
                  </div>
                </div>
                {item.actionLabel ? (
                  <button
                    type="button"
                    onClick={() => handleSecurityCheckAction(item.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold cursor-pointer hover:bg-emerald-500/25 transition flex-shrink-0"
                  >
                    {item.actionLabel}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex-shrink-0">PASS</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#ff2e4d] to-[#00c853] flex items-center justify-center font-black text-xl text-white border border-emerald-500/30 flex-shrink-0">
              {user?.avatar ? (
                user.avatar.startsWith('preset:') ? (
                  <span className="text-xl">🛡️</span>
                ) : (
                  <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                )
              ) : (
                user?.name?.charAt(0) ?? 'U'
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">{user?.name ?? 'NexaAuth User'}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email ?? 'Not signed in'}</p>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-500/25 inline-block mt-0.5">
                🔐 Google OAuth Verified
              </span>
            </div>
          </div>
        </div>

        {/* Security & Master Password + Biometric Auth */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Vault Lock & Biometrics
          </h3>

          {/* Master Password Row */}
          <div className="flex items-center gap-3 py-3.5 border-b border-zinc-800/60">
            <div className="text-emerald-400 flex-shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Master Password</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border font-bold uppercase ${
                    hasMasterPassword
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {hasMasterPassword ? 'Configured' : 'Not Set'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 block">
                {hasMasterPassword
                  ? 'PBKDF2-SHA256 salted hash · 5-attempt lockout'
                  : 'Set a master password to lock vault & enable biometrics'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMasterModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/25 transition flex-shrink-0"
            >
              {hasMasterPassword ? 'Manage' : 'Set Password'}
            </button>
          </div>

          <ToggleRow
            icon={<Fingerprint className="w-4 h-4" />}
            label="Biometric Lock"
            desc="Capacitor Face ID or Fingerprint vault unlock"
            checked={settings.biometricEnabled}
            onToggle={handleToggleBiometric}
            disabledHint={!hasMasterPassword ? 'Requires Master Password first' : undefined}
          />

          {/* Modality Selector & Hardware Capability Status */}
          {hasMasterPassword && (
            <div className="py-3 border-b border-zinc-800/60 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-400 uppercase tracking-wider">Biometric Method</span>
                <span className="text-emerald-400">
                  {formatBiometrySummary(biometryInfo)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'both', label: 'Both', icon: ShieldCheck },
                  { id: 'faceId', label: 'Face ID', icon: ScanFace },
                  { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={settings.biometricModality === id}
                    onClick={() => handleModalityChange(id)}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-mono font-semibold flex items-center justify-center gap-1 cursor-pointer transition ${
                      settings.biometricModality === id
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={lock}
                className="w-full mt-1 py-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-emerald-400 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Vault Now</span>
              </button>
            </div>
          )}

          <ToggleRow
            icon={<Lock className="w-4 h-4" />}
            label="Auto-Lock Vault"
            desc={`Lock after ${settings.autoLockTimeout} min of inactivity`}
            checked={settings.autoLock}
            onToggle={() => toggleSetting('autoLock')}
          />

          {settings.autoLock && (
            <div className="py-2.5 border-b border-zinc-800/60 space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Idle Lock Timeout
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {LOCK_TIMEOUTS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    aria-pressed={settings.autoLockTimeout === mins}
                    onClick={() => {
                      updateSettings({ autoLockTimeout: mins });
                      showToast(`Auto-lock set to ${mins} min`);
                    }}
                    className={`py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer transition ${
                      settings.autoLockTimeout === mins
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          )}

          <ToggleRow
            icon={<Eye className="w-4 h-4" />}
            label="Hide Tokens by Default"
            desc="Blur all TOTP codes on open"
            checked={settings.hideTokens}
            onToggle={() => toggleSetting('hideTokens')}
          />
        </div>

        {/* Backup & Restore */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-400" /> Backup & Restore
          </h3>
          <ToggleRow
            icon={<CloudUpload className="w-4 h-4" />}
            label="Encrypted Cloud Backup"
            desc="Owner-isolated Firestore profile sync"
            checked={settings.backupEnabled}
            onToggle={() => toggleSetting('backupEnabled')}
          />
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={exportBackup}
              className="py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-emerald-500/40 transition"
            >
              <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-emerald-500/40 transition"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import JSON</span>
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Appearance
          </h3>
          <ToggleRow
            icon={<Moon className="w-4 h-4" />}
            label="Dark Cyber Mode"
            desc="NexaAuth's signature dark theme"
            checked={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
          />
        </div>

        {/* About */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider">About NexaAuth</h3>
          {[
            ['Version', '2.1.0'],
            ['Accounts', String(accounts.length)],
            ['Password KDF', 'PBKDF2-SHA256 (100k)'],
            ['Protocol', 'TOTP (RFC 6238)'],
            ['Auth', 'Direct Google OAuth 2.0'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-zinc-500">{k}</span>
              <span className="text-zinc-300 font-mono">{v}</span>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer text-red-400 border border-red-500/25 bg-red-950/20 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <MasterPasswordModal
        open={showMasterModal}
        hasExisting={hasMasterPassword}
        initialModality={settings.biometricModality}
        onClose={() => setShowMasterModal(false)}
        onSave={setMasterPassword}
        onRemove={clearMasterPassword}
      />
    </div>
  );
};
