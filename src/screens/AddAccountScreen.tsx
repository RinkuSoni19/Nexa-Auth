import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode, Key, Camera, Sparkles, Check, Loader2, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const QUICK_TEMPLATES = [
  { issuer: 'Google',    icon: 'G', bg: 'from-blue-500 to-blue-700',    category: 'personal' as const },
  { issuer: 'GitHub',   icon: 'G', bg: 'from-zinc-700 to-zinc-900',    category: 'work'     as const },
  { issuer: 'Discord',  icon: 'D', bg: 'from-indigo-500 to-indigo-700',category: 'social'   as const },
  { issuer: 'Binance',  icon: 'B', bg: 'from-yellow-500 to-amber-600', category: 'crypto'   as const },
  { issuer: 'Notion',   icon: 'N', bg: 'from-zinc-500 to-zinc-700',    category: 'work'     as const },
  { issuer: 'Twitter',  icon: 'X', bg: 'from-sky-500 to-sky-700',      category: 'social'   as const },
];

export const AddAccountScreen: React.FC = () => {
  const { setScreen, addAccount, showToast } = useApp();
  const [tab, setTab] = useState<'qr' | 'manual'>('qr');
  const [scanning, setScanning] = useState(true);
  const [scanned, setScanned] = useState(false);

  /* manual form */
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [secret, setSecret] = useState('');
  const [category, setCategory] = useState<'work'|'crypto'|'personal'|'social'>('personal');
  const [adding, setAdding] = useState(false);

  const simulateScan = () => {
    setScanning(false);
    setScanned(true);
    setTimeout(() => {
      addAccount({
        issuer: 'Cloudflare', accountName: 'admin@cloudflare.com',
        secret: 'CLOUDFLARESECRET', iconInitial: 'C',
        iconBg: 'from-orange-500 to-orange-700', category: 'work',
        isFavorite: false, algorithm: 'SHA1', digits: 6, period: 30,
      });
      showToast('Cloudflare added to your vault!');
      setScreen('dashboard');
    }, 800);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer || !accountName) return;
    setAdding(true);
    setTimeout(() => {
      addAccount({
        issuer, accountName, secret: secret || `SECRET_${Date.now()}`,
        iconInitial: issuer.charAt(0).toUpperCase(),
        iconBg: 'from-teal-500 to-cyan-700', category,
        isFavorite: false, algorithm: 'SHA1', digits: 6, period: 30,
      });
      showToast(`${issuer} added to your vault!`);
      setScreen('dashboard');
    }, 1000);
  };

  const useTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    addAccount({
      issuer: t.issuer, accountName: `user@${t.issuer.toLowerCase()}.com`,
      secret: `${t.issuer.toUpperCase()}SECRET`, iconInitial: t.icon,
      iconBg: t.bg, category: t.category,
      isFavorite: false, algorithm: 'SHA1', digits: 6, period: 30,
    });
    showToast(`${t.issuer} added!`);
    setScreen('dashboard');
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <button onClick={() => setScreen('dashboard')} className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 hover:border-emerald-500/40 transition cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-bold text-white text-base">Add Account</h2>
          <p className="text-[10px] text-zinc-500 font-mono">Scan QR or enter key manually</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-36 no-scrollbar">
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 mb-4">
          {[
            { key: 'qr' as const, label: 'Scan QR Code', icon: Camera },
            { key: 'manual' as const, label: 'Manual Key', icon: Key },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                tab === key ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-zinc-400 hover:text-white'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* QR TAB */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-56 h-56 rounded-2xl border-2 border-emerald-500/40 bg-zinc-950 overflow-hidden group cursor-pointer" onClick={simulateScan}>
              {/* Laser sweep */}
              {scanning && !scanned && (
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"
                  style={{ boxShadow: '0 0 10px #00ff88' }}
                  animate={{ top: ['8%', '88%', '8%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {/* Corner reticles */}
              {[['top-2 left-2','border-t-2 border-l-2'],['top-2 right-2','border-t-2 border-r-2'],['bottom-2 left-2','border-b-2 border-l-2'],['bottom-2 right-2','border-b-2 border-r-2']].map(([pos, border], i) => (
                <div key={i} className={`absolute ${pos} w-4 h-4 ${border} border-emerald-400 z-10`} />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                {scanned ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400">
                    <Check className="w-16 h-16" />
                  </motion.div>
                ) : (
                  <QrCode className="w-28 h-28 text-emerald-400/70" />
                )}
              </div>
              <div className="absolute inset-0 bg-emerald-950/30 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] flex flex-col items-center justify-center transition text-xs text-white font-mono">
                <Sparkles className="w-5 h-5 text-emerald-400 mb-1" />Tap to Simulate Scan
              </div>
            </div>

            <button onClick={simulateScan}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-black cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#00c853,#00ff88)', boxShadow: '0 6px 20px rgba(0,200,83,0.4)' }}>
              Simulate QR Scan
            </button>

            {/* Quick templates */}
            <div className="w-full">
              <p className="text-xs text-zinc-400 font-mono mb-2 text-center">— or add a popular service —</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_TEMPLATES.map(t => (
                  <button key={t.issuer} onClick={() => useTemplate(t)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/40 transition cursor-pointer group">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.bg} flex items-center justify-center font-bold text-white text-sm`}>
                      {t.icon}
                    </div>
                    <span className="text-[11px] text-zinc-400 group-hover:text-white transition">{t.issuer}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MANUAL TAB */}
        {tab === 'manual' && (
          <form onSubmit={handleManualAdd} className="space-y-3">
            {[
              { label: 'Service / Issuer', placeholder: 'e.g. GitHub, Coinbase', value: issuer, onChange: setIssuer, required: true },
              { label: 'Account / Email', placeholder: 'user@example.com', value: accountName, onChange: setAccountName, required: true },
              { label: 'Secret Key (Base32)', placeholder: 'XXXX XXXX XXXX (optional)', value: secret, onChange: setSecret, required: false },
            ].map(({ label, placeholder, value, onChange, required }) => (
              <div key={label}>
                <label className="text-[11px] text-zinc-400 block mb-1 font-mono">{label}</label>
                <input
                  type="text"
                  required={required}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-[#0d1712] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-3 py-3 text-sm text-white placeholder-zinc-600 outline-none font-mono"
                />
              </div>
            ))}

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1 font-mono">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['work','crypto','personal','social'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize cursor-pointer border transition ${
                      category === c ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={!issuer || !accountName || adding}
              className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 text-white"
              style={{ background: 'linear-gradient(135deg,#e50914,#ff2e4d 50%,#00c853)', boxShadow: '0 8px 24px rgba(229,9,20,0.3)' }}>
              {adding ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <>Add to Vault <ChevronRight className="w-4 h-4" /></>}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
};
