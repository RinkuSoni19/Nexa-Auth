import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, Shield, Bell, Moon, Eye, CloudUpload, LogOut, ChevronRight, Lock, Fingerprint, Smartphone } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export const SettingsScreen: React.FC = () => {
  const { setScreen, settings, updateSettings, accounts, user, setUser, showToast } = useApp();

  const toggleSetting = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key as 'biometricEnabled'] });
  };

  const handleLogout = () => {
    setUser(null);
    showToast('Signed out successfully');
    setScreen('welcome');
  };

  const ToggleRow: React.FC<{ icon: React.ReactNode; label: string; desc: string; checked: boolean; onToggle: () => void; accent?: string }> = ({
    icon, label, desc, checked, onToggle, accent = 'bg-emerald-400',
  }) => (
    <div className="flex items-center gap-3 py-3.5 border-b border-zinc-800/60 last:border-0">
      <div className="text-zinc-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-white block">{label}</span>
        <span className="text-[11px] text-zinc-500">{desc}</span>
      </div>
      <button onClick={onToggle}
        className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
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
        <button onClick={() => setScreen('dashboard')} className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-bold text-white text-base">Settings</h2>
          <p className="text-[10px] text-zinc-500 font-mono">{accounts.length} tokens · v2.0.0</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-36 no-scrollbar space-y-4">

        {/* Account info */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#ff2e4d] to-[#00c853] flex items-center justify-center font-black text-xl text-white border border-emerald-500/30">
              {user?.avatar ? (
                user.avatar.startsWith('preset:') ? (
                  <span className="text-xl">🛡️</span>
                ) : (
                  <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                )
              ) : (
                user?.name?.charAt(0) ?? 'A'
              )}
            </div>
            <div>
              <p className="font-bold text-white">{user?.name ?? 'Rinku Soni'}</p>
              <p className="text-xs text-zinc-400">{user?.email ?? 'rinkusoni28489@gmail.com'}</p>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
                🔐 Google Account
              </span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Security
          </h3>
          <ToggleRow icon={<Fingerprint className="w-4 h-4" />} label="Biometric Lock" desc="Fingerprint or Face ID vault access"
            checked={settings.biometricEnabled} onToggle={() => toggleSetting('biometricEnabled')} />
          <ToggleRow icon={<Lock className="w-4 h-4" />} label="Auto-Lock Vault" desc={`Lock after ${settings.autoLockTimeout} min of inactivity`}
            checked={settings.autoLock} onToggle={() => toggleSetting('autoLock')} />
          <ToggleRow icon={<Eye className="w-4 h-4" />} label="Hide Tokens by Default" desc="Blur all TOTP codes on open"
            checked={settings.hideTokens} onToggle={() => toggleSetting('hideTokens')} />
        </div>

        {/* Backup */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-400" /> Backup & Sync
          </h3>
          <ToggleRow icon={<CloudUpload className="w-4 h-4" />} label="Encrypted Cloud Backup" desc="AES-256 zero-knowledge backup"
            checked={settings.backupEnabled} onToggle={() => toggleSetting('backupEnabled')} />
          <button onClick={() => showToast('Backup exported to Downloads!')}
            className="w-full mt-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/40 transition">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
            Export Encrypted Backup
          </button>
        </div>

        {/* Appearance */}
        <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Appearance
          </h3>
          <ToggleRow icon={<Moon className="w-4 h-4" />} label="Dark Cyber Mode" desc="NexaAuth's signature dark theme"
            checked={settings.darkMode} onToggle={() => toggleSetting('darkMode')} />
        </div>

        {/* About */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider">About NexaAuth</h3>
          {[['Version', '2.0.0 (Build 42)'],['Accounts', String(accounts.length)],['Encryption', 'AES-GCM 256-bit'],['Protocol', 'TOTP (RFC 6238)']].map(([k,v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-zinc-500">{k}</span>
              <span className="text-zinc-300 font-mono">{v}</span>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer text-red-400 border border-red-500/25 bg-red-950/20 hover:bg-red-500/10 transition">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};
