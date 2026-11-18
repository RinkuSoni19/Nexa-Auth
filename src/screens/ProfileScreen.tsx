import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, Star, Settings, LogOut, ChevronRight, Award, Clock,
  Camera, Mail, CheckCircle2, ShieldCheck, ShieldAlert, Edit2, Check,
  X, Plus, RefreshCw, Loader2, Sparkles, User as UserIcon, Crown
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import confetti from 'canvas-confetti';

const AVATAR_PRESETS = [
  { id: 'shield', name: 'Nexa Shield', icon: '/icon.jpg' },
  { id: 'cyber', name: 'Neon Lock', gradient: 'from-emerald-500 to-teal-700', letter: '🛡️' },
  { id: 'matrix', name: 'Matrix Sentinel', gradient: 'from-emerald-600 to-green-950', letter: '⚡' },
  { id: 'crimson', name: 'Crimson Core', gradient: 'from-rose-600 to-red-800', letter: '🔐' },
  { id: 'quantum', name: 'Quantum Key', gradient: 'from-indigo-600 to-purple-800', letter: '🔑' },
  { id: 'crypto', name: 'Crypto Vault', gradient: 'from-amber-500 to-yellow-600', letter: '₿' },
];

export const ProfileScreen: React.FC = () => {
  const { setScreen, user, accounts, setUser, updateUser, showToast } = useApp();

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || 'Rinku Soni');

  // Avatar picker modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email verification modal / flow
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
  const [emailLoading, setEmailLoading] = useState(false);
  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const favorites = accounts.filter(a => a.isFavorite).length;
  const workAcc = accounts.filter(a => a.category === 'work').length;

  // Determine verification state
  const isEmailVerified = !!(user?.isEmailVerified ?? (user?.authMethod === 'google' && user?.email));
  const securityScore = isEmailVerified ? 100 : 70;

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    showToast('Signed out of NexaAuth');
    setScreen('welcome');
  };

  // Save Name
  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    updateUser({ name: nameInput.trim() });
    setIsEditingName(false);
    showToast('Name updated successfully!');
  };

  // Handle File Upload for Profile Picture
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateUser({ avatar: base64 });
      setShowAvatarModal(false);
      showToast('Profile photo updated!');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    };
    reader.readAsDataURL(file);
  };

  // Select Avatar Preset
  const handleSelectPreset = (p: typeof AVATAR_PRESETS[0]) => {
    if (p.icon) {
      updateUser({ avatar: p.icon });
    } else {
      updateUser({ avatar: `preset:${p.id}` });
    }
    setShowAvatarModal(false);
    showToast(`Avatar set to ${p.name}`);
  };

  // Remove Avatar
  const handleRemoveAvatar = () => {
    updateUser({ avatar: undefined });
    setShowAvatarModal(false);
    showToast('Profile photo removed');
  };

  // Email Verification Flow
  const handleSendEmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes('@') || !emailInput.includes('.')) {
      showToast('Please enter a valid email address');
      return;
    }
    setEmailLoading(true);
    setTimeout(() => {
      setEmailLoading(false);
      setEmailStep('otp');
      showToast(`Verification code sent to ${emailInput}`);
    }, 1000);
  };

  const handleEmailOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...emailOtp];
    next[index] = val.slice(-1);
    setEmailOtp(next);
    if (val && index < 5) emailOtpRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) confirmEmailVerification(next.join(''));
  };

  const confirmEmailVerification = (_code?: string) => {
    setEmailLoading(true);
    setTimeout(() => {
      setEmailLoading(false);
      updateUser({ email: emailInput, isEmailVerified: true });
      setShowEmailModal(false);
      setEmailStep('input');
      setEmailOtp(['', '', '', '', '', '']);
      showToast('Email verified successfully!');
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    }, 1200);
  };

  // Render Avatar
  const renderAvatarContent = () => {
    if (user?.avatar) {
      if (user.avatar.startsWith('preset:')) {
        const id = user.avatar.replace('preset:', '');
        const preset = AVATAR_PRESETS.find(p => p.id === id) || AVATAR_PRESETS[1];
        return (
          <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${preset.gradient} flex items-center justify-center text-3xl shadow-inner`}>
            {preset.letter}
          </div>
        );
      }
      return (
        <img
          src={user.avatar}
          alt={user.name || 'Profile'}
          className="w-full h-full object-cover rounded-3xl"
        />
      );
    }
    return (
      <div
        className="w-full h-full rounded-3xl flex items-center justify-center font-black text-4xl text-white shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #e50914 0%, #ff2e4d 50%, #00c853 100%)',
          boxShadow: '0 8px 32px rgba(229,9,20,0.3)',
        }}
      >
        {user?.name?.charAt(0) || 'A'}
      </div>
    );
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/8 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-64 h-64 bg-red-500/8 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <button
          onClick={() => setScreen('dashboard')}
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-bold text-white text-base">My Profile & Security</h2>
        <button
          onClick={() => setScreen('settings')}
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ───────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5 pb-36 no-scrollbar space-y-4">

        {/* ── 1. AVATAR & NAME CARD ────────────────────────── */}
        <div
          className="relative flex flex-col items-center p-6 rounded-3xl bg-gradient-to-b from-[#0a1811] via-[#08120d] to-[#040806] border border-emerald-500/20"
          style={{ boxShadow: '0 0 40px rgba(0,255,136,0.06)' }}
        >
          {/* Avatar with Camera Overlay */}
          <div className="relative mb-3 group">
            {/* Pulsing Outer Rings */}
            {[90, 110].map((s, i) => (
              <motion.div
                key={s}
                className="absolute rounded-full border border-emerald-500/25 pointer-events-none"
                style={{ width: s, height: s, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 2.8, delay: i * 0.4, repeat: Infinity }}
              />
            ))}

            {/* Avatar container */}
            <div className="relative w-22 h-22 rounded-3xl p-1 bg-black/60 border-2 border-emerald-500/50 shadow-2xl overflow-hidden">
              {renderAvatarContent()}
            </div>

            {/* Camera / Edit Button Badge */}
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-black shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all border border-emerald-300"
              title="Add / Change Profile Picture"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Name & Edit Button */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-2 w-full max-w-xs">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter full name"
                className="flex-1 bg-zinc-900 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none font-bold"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-2 rounded-xl bg-emerald-500 text-black cursor-pointer font-bold text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setIsEditingName(false); setNameInput(user?.name || ''); }}
                className="p-2 rounded-xl bg-zinc-800 text-zinc-400 cursor-pointer text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-black text-white">{user?.name || 'Rinku Soni'}</h2>
              <button
                onClick={() => { setIsEditingName(true); setNameInput(user?.name || ''); }}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition cursor-pointer"
                title="Edit Name"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* User Sign-In Primary Badge */}
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-300 font-semibold uppercase tracking-wider">
              Google Account Login
            </span>
          </div>
        </div>

        {/* ── 2. SECURITY PROTECTION SCORE ──────────────────── */}
        <div className="p-4 rounded-2xl bg-[#09150f]/90 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Vault Protection</span>
            </div>
            <span className={`text-xs font-mono font-bold ${securityScore === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {securityScore}% {securityScore === 100 ? 'MAXIMUM' : 'STRONG'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
            <motion.div
              className={`h-full ${securityScore === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-emerald-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${securityScore}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>

          <p className="text-[10px] text-zinc-400 font-mono">
            {securityScore === 100
              ? '✓ Primary Google Account verified (AES-256 Cloud Backup Active)'
              : 'Link and verify your Google account for 100% vault protection'}
          </p>
        </div>

        {/* ── 3. AUTHENTICATION CREDENTIAL (GOOGLE EMAIL) ──── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Primary Credential
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Google OAuth 2.0</span>
          </div>

          {/* ── EMAIL FACTOR CARD ── */}
          <div className="p-4 rounded-2xl bg-[#0a1510]/90 border border-zinc-800 hover:border-emerald-500/25 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isEmailVerified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Email Address</span>
                  {user?.email ? (
                    <span className="text-xs text-zinc-300 font-mono block mt-0.5">{user.email}</span>
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono block mt-0.5">Not linked yet</span>
                  )}
                </div>
              </div>

              {/* Status Badge or Verify Button */}
              {isEmailVerified ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>VERIFIED</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEmailInput(user?.email || '');
                    setEmailStep('input');
                    setShowEmailModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition cursor-pointer flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{user?.email ? 'Verify Email' : 'Add & Verify'}</span>
                </button>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Method: Google OAuth 2.0</span>
              <span>{isEmailVerified ? 'AES-256 Encrypted' : 'Verification Needed'}</span>
            </div>
          </div>
        </div>

        {/* ── 4. STATS TILES ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield, label: 'Vault Tokens', value: accounts.length, color: '#00ff88' },
            { icon: Star, label: 'Favorites', value: favorites, color: '#facc15' },
            { icon: Award, label: 'Work Accounts', value: workAcc, color: '#3b82f6' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="p-3.5 rounded-2xl bg-[#0a1510]/90 border border-zinc-800 flex flex-col items-center gap-1 text-center">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xl font-black text-white">{value}</span>
              <span className="text-[9px] text-zinc-500 font-mono uppercase">{label}</span>
            </div>
          ))}
        </div>

        {/* ── 5. QUICK ACTIONS ─────────────────────────────── */}
        <div className="space-y-2">
          {/* Subscription Plan Row */}
          <button
            onClick={() => setScreen('plans')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-[#0a1510] to-[#0a1510] border border-yellow-500/30 hover:border-yellow-400/60 transition cursor-pointer text-left"
          >
            <div className="p-2 rounded-xl bg-yellow-500/15 text-yellow-400">
              <Crown className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Subscription Plan</span>
                <span className="text-[10px] font-mono font-bold text-yellow-300 bg-yellow-950/80 px-2 py-0.5 rounded-full border border-yellow-500/40">
                  {user?.plan === '1-year'
                    ? '1 YEAR PRO (₹99)'
                    : user?.plan === '3-months'
                    ? '3 MONTHS (₹49)'
                    : '7-DAY FREE TRIAL'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">Upgrade defense & unlimited cloud sync</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            onClick={() => setShowAvatarModal(true)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#0a1510]/90 border border-zinc-800 hover:border-emerald-500/30 transition cursor-pointer text-left"
          >
            <div className="p-2 rounded-xl bg-zinc-800 text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-white block">Change Profile Picture</span>
              <span className="text-[11px] text-zinc-500">Upload photo or pick cyber avatar</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>

          <button
            onClick={() => setScreen('settings')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#0a1510]/90 border border-zinc-800 hover:border-emerald-500/30 transition cursor-pointer text-left"
          >
            <div className="p-2 rounded-xl bg-zinc-800 text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-white block">Security & Settings</span>
              <span className="text-[11px] text-zinc-500">Biometrics, Auto-Lock, Cloud Backup</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0a1510]/90 border border-zinc-800 text-left">
            <div className="p-2 rounded-xl bg-zinc-800 text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-white block">Member Since</span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Active Member'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
              PRO
            </span>
          </div>
        </div>

        {/* ── 6. SIGN OUT BUTTON ───────────────────────────── */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer text-red-400 border border-red-500/25 bg-red-950/20 hover:bg-red-500/10 transition mt-4"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Vault</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: AVATAR / PROFILE PHOTO PICKER ─────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-sm rounded-3xl bg-[#08130e] border border-emerald-500/30 p-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Profile Picture</h3>
                </div>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Custom Image Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg cursor-pointer hover:brightness-110 active:scale-98 transition mb-4"
              >
                <Camera className="w-4 h-4" />
                <span>Upload from Device Gallery / Camera</span>
              </button>

              {/* Preset Cyber Avatars */}
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Or Choose Cyber Preset:
              </span>
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {AVATAR_PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className="p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 flex flex-col items-center gap-1.5 transition cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                      {p.icon ? (
                        <img src={p.icon} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${p.gradient} flex items-center justify-center text-xl`}>
                          {p.letter}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-300 font-mono truncate w-full text-center">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Remove Avatar if active */}
              {user?.avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs cursor-pointer transition text-center"
                >
                  Remove Current Photo
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: ENTER EMAIL & VERIFY ──────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-sm rounded-3xl bg-[#08130e] border border-emerald-500/30 p-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {emailStep === 'input' ? 'Link & Verify Email' : 'Confirm Email OTP'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {emailStep === 'input' ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Enter your email to receive a 6-digit confirmation code and activate AES-256 cloud recovery.
                  </p>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="e.g. alex.kumar@gmail.com"
                      className="w-full bg-[#0d1f16] border border-emerald-500/30 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition font-mono"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg cursor-pointer hover:brightness-110 active:scale-98 transition disabled:opacity-50"
                  >
                    {emailLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin text-black" /><span>Sending Verification Code…</span></>
                    ) : (
                      <><Sparkles className="w-4 h-4" /><span>Send 6-Digit Code</span></>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Enter the 6-digit code sent to <span className="text-emerald-400 font-mono font-bold">{emailInput}</span>
                  </p>

                  {/* 6 OTP Boxes */}
                  <div className="flex justify-center gap-1.5 sm:gap-2 my-2">
                    {emailOtp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { emailOtpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleEmailOtpChange(i, e.target.value)}
                        className={`w-9 h-12 text-center text-lg font-black font-mono rounded-xl border outline-none transition ${
                          digit
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-[#0d1f16] border-zinc-700 text-white focus:border-emerald-500'
                        }`}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <p className="text-[10px] text-zinc-500 font-mono text-center">
                    Demo Mode: enter any 6 digits to verify instantly
                  </p>

                  <button
                    onClick={() => confirmEmailVerification(emailOtp.join(''))}
                    disabled={emailOtp.some(d => !d) || emailLoading}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg cursor-pointer hover:brightness-110 active:scale-98 transition disabled:opacity-40"
                  >
                    {emailLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin text-black" /><span>Verifying Token…</span></>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /><span>Confirm & Mark Verified</span></>
                    )}
                  </button>

                  <button
                    onClick={() => setEmailStep('input')}
                    className="w-full text-center text-xs text-zinc-400 hover:text-white cursor-pointer py-1 font-mono"
                  >
                    ← Change Email Address
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
