import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Copy, Check, Star, QrCode, Fingerprint, ChevronRight, ShieldCheck, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { generateTOTP, getSecondsRemaining, formatCode } from '../utils/totp';
import { AuthAccount, Category } from '../types';
import confetti from 'canvas-confetti';

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '⚡' },
  { key: 'work', label: 'Work', emoji: '💼' },
  { key: 'crypto', label: 'Crypto', emoji: '₿' },
  { key: 'personal', label: 'Personal', emoji: '👤' },
  { key: 'social', label: 'Social', emoji: '🌐' },
];

const TokenCard: React.FC<{
  account: AuthAccount;
  now: number;
  secsLeft: number;
  hideTokens: boolean;
  onCopy: (id: string, code: string) => void;
  onDetail: (a: AuthAccount) => void;
  copiedId: string | null;
}> = ({ account, now, secsLeft, hideTokens, onCopy, onDetail, copiedId }) => {
  const code = generateTOTP(account.secret, now, account.period, account.digits, account.algorithm);
  const accountSecondsLeft = getSecondsRemaining(now, account.period);
  const isCopied = copiedId === account.id;
  const isUrgent = accountSecondsLeft <= 5;
  const pct = (accountSecondsLeft / account.period) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-[#0a1510]/90 border border-emerald-500/15 hover:border-emerald-500/35 transition-all group cursor-pointer"
      onClick={() => onDetail(account)}
    >
      {/* Left accent */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${isUrgent ? 'bg-red-500' : 'bg-gradient-to-b from-emerald-500 to-teal-700'} transition-colors duration-300`} />

      {/* Token refresh progress line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
        <motion.div
          className={`h-full ${isUrgent ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      <div className="flex items-center gap-3 p-3.5">
        {/* Service icon */}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${account.iconBg} flex items-center justify-center font-bold text-base text-white flex-shrink-0 shadow-md`}>
          {account.iconInitial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white truncate">{account.issuer}</span>
            {account.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
            <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
              {account.category}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 truncate block">{account.accountName}</span>
        </div>

        {/* Code + Copy */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => { e.stopPropagation(); onCopy(account.id, code); }}>
          <span className={`font-mono text-lg font-bold tracking-widest transition-all ${
            isUrgent ? 'text-red-400' : 'text-[#00ff88]'
          } ${hideTokens ? 'blur-sm select-none' : ''}`}>
            {hideTokens ? '••• •••' : formatCode(code)}
          </span>
          <button
            className={`p-2 rounded-xl border transition flex-shrink-0 ${
              isCopied ? 'bg-emerald-500 text-black border-emerald-400 scale-110' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-emerald-500/50'
            }`}
            title="Copy code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const DashboardScreen: React.FC = () => {
  const { user, accounts, settings, setScreen, setSelectedAccount, activeCategory, setActiveCategory, searchQuery, setSearchQuery, showToast, lock } = useApp();
  const [now, setNow] = useState(Date.now());
  const [secsLeft, setSecsLeft] = useState(getSecondsRemaining());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hideTokens, setHideTokens] = useState(settings.hideTokens);

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setSecsLeft(getSecondsRemaining(t));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleCopy = useCallback((id: string, code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedId(id);
    showToast('Code copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  }, [showToast]);

  const handleDetail = useCallback((a: AuthAccount) => {
    setSelectedAccount(a);
    setScreen('account-detail');
  }, [setSelectedAccount, setScreen]);

  const filtered = accounts.filter(a => {
    const matchCat = activeCategory === 'all' || a.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchQ = !q || a.issuer.toLowerCase().includes(q) || a.accountName.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const favorites = filtered.filter(a => a.isFavorite);
  const rest = filtered.filter(a => !a.isFavorite);
  const isUrgent = secsLeft <= 5;
  const pct = (secsLeft / 30) * 100;

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/8 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-56 h-56 bg-red-500/8 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* ── HEADER ──────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-emerald-500/40 p-0.5 bg-black">
            <img src="/icon.jpg" alt="N" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div>
            <div className="flex items-center gap-1 leading-none">
              <span className="font-black text-sm text-[#ff2e4d]">Nexa</span>
              <span className="font-black text-sm text-[#00ff88]">Auth</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">
              {user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'VAULT ACTIVE'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideTokens(h => !h)}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700/60 text-zinc-300 hover:border-emerald-500/40 transition cursor-pointer"
            title={hideTokens ? 'Show tokens' : 'Hide tokens'}
          >
            {hideTokens ? <EyeOff className="w-4 h-4 text-red-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={lock}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700/60 text-zinc-300 hover:border-red-500/40 hover:text-red-400 transition cursor-pointer"
            title="Lock Vault"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScreen('profile')}
            className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-[#ff2e4d] to-[#00c853] flex items-center justify-center font-bold text-white text-sm shadow-md cursor-pointer border border-emerald-500/30"
          >
            {user?.avatar ? (
              user.avatar.startsWith('preset:') ? (
                <span className="text-sm">🛡️</span>
              ) : (
                <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
              )
            ) : (
              user?.name?.charAt(0) ?? 'A'
            )}
          </button>
        </div>
      </div>

      {/* ── TIMER BANNER ──────────────────────── */}
      <div className="relative z-10 mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#09160e]/90 to-[#140810]/90 border border-emerald-500/15 flex items-center gap-3">
        <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="#1a2e1f" strokeWidth="3.5" fill="transparent" />
            <motion.circle
              cx="24" cy="24" r="20"
              stroke={isUrgent ? '#ef4444' : '#00ff88'}
              strokeWidth="3.5"
              fill="transparent"
              strokeDasharray={125.6}
              strokeDashoffset={125.6 - (125.6 * pct / 100)}
              strokeLinecap="round"
              transition={{ duration: 1, ease: 'linear' }}
            />
          </svg>
          <span className={`absolute text-xs font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-zinc-200'}`}>
            {secsLeft}s
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-white">Token Refresh Cycle</span>
          <p className="text-[10px] text-zinc-400 font-mono">Offline codes rotate every 30s</p>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/25 flex-shrink-0">
          {accounts.length} Tokens
        </span>
      </div>

      {/* ── SEARCH ──────────────────────────── */}
      <div className="relative z-10 mx-4 mt-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search accounts…"
          className="w-full bg-[#0d1712]/90 border border-emerald-500/20 focus:border-emerald-400 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition"
        />
      </div>

      {/* ── CATEGORY PILLS ────────────────── */}
      <div className="relative z-10 flex gap-2 px-4 mt-2.5 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border ${
              activeCategory === c.key
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-900/40'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            <span>{c.emoji}</span>{c.label}
          </button>
        ))}
      </div>

      {/* ── ACCOUNTS LIST ─────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 mt-3 pb-36 space-y-2.5 no-scrollbar">
        {favorites.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Favorites</span>
            </div>
            {favorites.map(a => (
              <TokenCard key={a.id} account={a} now={now} secsLeft={secsLeft} hideTokens={hideTokens} onCopy={handleCopy} onDetail={handleDetail} copiedId={copiedId} />
            ))}
            {rest.length > 0 && (
              <div className="flex items-center gap-2 mb-1 mt-3">
                <ShieldCheck className="w-3 h-3 text-zinc-500" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">All Accounts</span>
              </div>
            )}
          </>
        )}
        {rest.map(a => (
          <TokenCard key={a.id} account={a} now={now} secsLeft={secsLeft} hideTokens={hideTokens} onCopy={handleCopy} onDetail={handleDetail} copiedId={copiedId} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-14 text-zinc-500">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">No accounts found</p>
            <button onClick={() => setScreen('add-account')} className="mt-3 text-xs text-emerald-400 hover:underline cursor-pointer">
              + Add your first account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
