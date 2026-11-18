import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Eye, EyeOff, ShieldCheck, Fingerprint, ScanFace, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateMasterPassword, type BiometricModality } from '../utils/masterAuth';

interface MasterPasswordModalProps {
  open: boolean;
  hasExisting: boolean;
  initialModality: BiometricModality;
  onClose: () => void;
  onSave: (
    newPassword: string,
    currentPassword?: string,
    enableBiometrics?: boolean,
    modality?: BiometricModality
  ) => Promise<{ ok: boolean; error?: string }>;
  onRemove?: (currentPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

export const MasterPasswordModal: React.FC<MasterPasswordModalProps> = ({
  open,
  hasExisting,
  initialModality,
  onClose,
  onSave,
  onRemove,
}) => {
  const [mode, setMode] = useState<'set' | 'remove'>('set');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [enableBiometrics, setEnableBiometrics] = useState(true);
  const [modality, setModality] = useState<BiometricModality>(initialModality);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('set');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setEnableBiometrics(true);
      setModality(initialModality);
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialModality]);

  const validation = validateMasterPassword(newPassword, confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'remove' && onRemove) {
      if (!currentPassword) {
        setError('Enter your current master password');
        return;
      }
      setSubmitting(true);
      const res = await onRemove(currentPassword);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error || 'Incorrect current master password');
        return;
      }
      onClose();
      return;
    }

    if (hasExisting && !currentPassword) {
      setError('Enter your current master password');
      return;
    }

    if (!validation.valid) {
      setError(validation.error || 'Invalid master password');
      return;
    }

    setSubmitting(true);
    const res = await onSave(
      newPassword,
      hasExisting ? currentPassword : undefined,
      enableBiometrics,
      modality
    );
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Failed to save master password');
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="master-password-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            className="w-full max-w-sm rounded-3xl bg-[#08130e] border border-emerald-500/30 p-5 shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="master-password-modal-title" className="font-bold text-white text-base">
                    {mode === 'remove'
                      ? 'Disable Master Password'
                      : hasExisting
                      ? 'Change Master Password'
                      : 'Set Master Password'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Required before enabling Face ID or Fingerprint
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Master Password dialog"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {hasExisting && onRemove && (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 mb-4">
                <button
                  type="button"
                  onClick={() => { setMode('set'); setError(null); }}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    mode === 'set' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('remove'); setError(null); }}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    mode === 'remove' ? 'bg-red-500/20 text-red-300' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Remove Lock
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {hasExisting && (
                <div>
                  <label htmlFor="mp-current" className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                    Current Master Password
                  </label>
                  <div className="relative">
                    <input
                      id="mp-current"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current master password"
                      className="w-full bg-[#0d1f16] border border-zinc-700 focus:border-emerald-400 rounded-2xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((s) => !s)}
                      aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'set' && (
                <>
                  <div>
                    <label htmlFor="mp-new" className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                      {hasExisting ? 'New Master Password' : 'Master Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="mp-new"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        autoFocus={!hasExisting}
                        className="w-full bg-[#0d1f16] border border-emerald-500/30 focus:border-emerald-400 rounded-2xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((s) => !s)}
                        aria-label={showNew ? 'Hide master password' : 'Show master password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {newPassword.length > 0 && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden flex gap-0.5">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={`flex-1 h-full transition-colors ${
                                validation.score >= bar
                                  ? validation.strength === 'strong'
                                    ? 'bg-emerald-400'
                                    : validation.strength === 'fair'
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                  : 'bg-zinc-800'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase font-bold ${
                            validation.strength === 'strong'
                              ? 'text-emerald-400'
                              : validation.strength === 'fair'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {validation.strength}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="mp-confirm" className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                      Confirm Master Password
                    </label>
                    <input
                      id="mp-confirm"
                      type={showNew ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter master password"
                      className="w-full bg-[#0d1f16] border border-zinc-700 focus:border-emerald-400 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none font-mono"
                    />
                  </div>

                  {/* Enable Biometric Unlock immediately */}
                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-white block">Enable Biometric Unlock</span>
                          <span className="text-[10px] text-zinc-400">Unlock with Face ID or Fingerprint</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enableBiometrics}
                        aria-label="Enable Biometric Unlock after setting Master Password"
                        onClick={() => setEnableBiometrics((b) => !b)}
                        className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                          enableBiometrics ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                            enableBiometrics ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {enableBiometrics && (
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {([
                          { id: 'both', label: 'Both', icon: ShieldCheck },
                          { id: 'faceId', label: 'Face ID', icon: ScanFace },
                          { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
                        ] as const).map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setModality(id)}
                            className={`py-1.5 px-2 rounded-xl border text-[10px] font-mono font-semibold flex items-center justify-center gap-1 cursor-pointer transition ${
                              modality === id
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {mode === 'remove' && (
                <div className="p-3 rounded-2xl bg-red-950/30 border border-red-500/25 text-xs text-red-200 leading-relaxed">
                  Removing the Master Password will also disable Face ID and Fingerprint biometric unlock for your vault.
                </div>
              )}

              {error && (
                <div role="alert" className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 ${
                  mode === 'remove'
                    ? 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Saving…'
                    : mode === 'remove'
                    ? 'Remove Master Password'
                    : hasExisting
                    ? 'Update Master Password'
                    : 'Save Master Password'}
                </span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
