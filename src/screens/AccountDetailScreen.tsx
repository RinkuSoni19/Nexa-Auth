import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Star, Trash2, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { generateTOTP, getSecondsRemaining, formatCode } from '../utils/totp';

export const AccountDetailScreen: React.FC = () => {
  const { selectedAccount: acc, setScreen, removeAccount, toggleFavorite, showToast } = useApp();
  const [now, setNow] = useState(Date.now());
  const [secsLeft, setSecsLeft] = useState(getSecondsRemaining());
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setSecsLeft(getSecondsRemaining(t));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!acc) { setScreen('dashboard'); return null; }

  const code = generateTOTP(acc.secret, now, acc.period);
  const pct = (secsLeft / acc.period) * 100;
  const isUrgent = secsLeft <= 5;

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    showToast('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    removeAccount(acc.id);
    showToast(`${acc.issuer} removed from vault`);
    setScreen('dashboard');
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <button
          onClick={() => setScreen('dashboard')}
          aria-label="Back to Vault"
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-white">{acc.issuer}</span>
        <button
          onClick={() => { toggleFavorite(acc.id); showToast(acc.isFavorite ? 'Removed from favorites' : 'Added to favorites'); }}
          aria-label={acc.isFavorite ? `Remove ${acc.issuer} from favorites` : `Add ${acc.issuer} to favorites`}
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 cursor-pointer hover:border-yellow-500/40 transition"
        >
          <Star className={`w-4 h-4 ${acc.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-400'}`} />
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5 pb-36 no-scrollbar">
        {/* Service card */}
        <div className="flex flex-col items-center mb-6">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${acc.iconBg} flex items-center justify-center font-black text-3xl text-white shadow-xl mb-3`}
            style={{ boxShadow: '0 8px 32px rgba(0,255,136,0.2)' }}>
            {acc.iconInitial}
          </div>
          <h2 className="text-xl font-black text-white">{acc.issuer}</h2>
          <p className="text-sm text-zinc-400">{acc.accountName}</p>
          <span className="mt-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full uppercase">{acc.category}</span>
        </div>

        {/* TOTP code display */}
        <div className="p-5 rounded-3xl bg-[#09150e]/90 border border-emerald-500/20 mb-4"
          style={{ boxShadow: '0 0 40px rgba(0,255,136,0.08)' }}>
          {/* Countdown ring */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="#1a2e1f" strokeWidth="4" fill="transparent" />
                <motion.circle cx="32" cy="32" r="28"
                  stroke={isUrgent ? '#ef4444' : '#00ff88'}
                  strokeWidth="4" fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - (175.9 * pct / 100)}
                  strokeLinecap="round"
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold font-mono ${isUrgent ? 'text-red-400' : 'text-zinc-200'}`}>
                {secsLeft}s
              </span>
            </div>
          </div>

          {/* The big tappable code — tapping automatically copies OTP to clipboard */}
          <div className="text-center mb-4">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy OTP code ${hidden ? 'hidden' : formatCode(code)}`}
              data-testid="detail-otp-tap-copy"
              className={`group w-full py-2.5 px-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                copied
                  ? 'bg-emerald-500/15 border-emerald-400/60 shadow-[0_0_24px_rgba(0,255,136,0.2)]'
                  : 'bg-transparent border-transparent hover:bg-emerald-500/5 hover:border-emerald-500/25'
              }`}
            >
              <div
                className={`text-5xl font-black font-mono tracking-[0.15em] transition-all ${
                  isUrgent ? 'text-red-400' : 'text-[#00ff88]'
                } ${hidden ? 'blur-md' : ''}`}
                style={{ textShadow: `0 0 24px ${isUrgent ? 'rgba(239,68,68,0.6)' : 'rgba(0,255,136,0.5)'}` }}
              >
                {hidden ? '••• •••' : formatCode(code)}
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-mono">
                {copied ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Copied to clipboard!
                  </span>
                ) : (
                  <span className="text-zinc-500 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    Tap code to copy • refreshes every {acc.period}s
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleCopy}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border text-xs font-semibold cursor-pointer transition ${
                copied ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:border-emerald-500/40'
              }`}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setHidden(h => !h)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border border-zinc-700 text-zinc-300 bg-zinc-900/80 hover:border-zinc-500 text-xs font-semibold cursor-pointer transition">
              {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {hidden ? 'Show' : 'Hide'}
            </button>
            <button onClick={() => setNow(Date.now())}
              className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border border-zinc-700 text-zinc-300 bg-zinc-900/80 hover:border-zinc-500 text-xs font-semibold cursor-pointer transition">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Token metadata */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 mb-4 space-y-2.5">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Token Details
          </h3>
          {[
            ['Algorithm', acc.algorithm],
            ['Digits', String(acc.digits)],
            ['Period', `${acc.period} seconds`],
            ['Added', new Date(acc.addedAt).toLocaleDateString()],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{label}</span>
              <span className="text-xs text-zinc-200 font-mono bg-zinc-800 px-2 py-0.5 rounded-lg">{val}</span>
            </div>
          ))}
        </div>

        {/* Delete */}
        <button onClick={handleDelete}
          className={`w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition border ${
            confirmDelete
              ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-900/40'
              : 'bg-transparent text-red-400 border-red-500/30 hover:bg-red-500/10'
          }`}>
          <Trash2 className="w-4 h-4" />
          {confirmDelete ? 'Confirm Delete — Tap Again' : 'Remove from Vault'}
        </button>
      </div>
    </div>
  );
};
