import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode, Key, Camera, ImagePlus, StopCircle, Check, Loader2, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import jsQR from 'jsqr';
import type { AuthAccount } from '../types';

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
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  /* manual form */
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [secret, setSecret] = useState('');
  const [category, setCategory] = useState<'work'|'crypto'|'personal'|'social'>('personal');
  const [algorithm, setAlgorithm] = useState<'SHA1'|'SHA256'>('SHA1');
  const [digits, setDigits] = useState<6|8>(6);
  const [period, setPeriod] = useState<30|60>(30);
  const [adding, setAdding] = useState(false);

  const stopCamera = () => {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopCamera(), []);

  const normalizeSecret = (value: string) => value.toUpperCase().replace(/[^A-Z2-7]/g, '');

  const parseOtpAuthUri = (rawValue: string): Omit<AuthAccount, 'id'|'addedAt'|'isFavorite'> | null => {
    try {
      const url = new URL(rawValue.trim());
      if (url.protocol !== 'otpauth:' || url.hostname !== 'totp') return null;
      const secretValue = normalizeSecret(url.searchParams.get('secret') || '');
      if (!secretValue) return null;
      const label = decodeURIComponent(url.pathname.replace(/^\//, ''));
      const [labelIssuer, labelAccount] = label.includes(':')
        ? label.split(':', 2).map(part => part.trim())
        : ['', label];
      const issuerValue = (url.searchParams.get('issuer') || labelIssuer || 'Authenticator').trim();
      const accountValue = (labelAccount || labelIssuer || 'Unknown account').trim();
      const algorithmValue = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase();
      if (algorithmValue !== 'SHA1' && algorithmValue !== 'SHA256') return null;
      const digitsValue = Number(url.searchParams.get('digits') || 6) === 8 ? 8 : 6;
      const periodValue = Number(url.searchParams.get('period') || 30) === 60 ? 60 : 30;
      return {
        issuer: issuerValue,
        accountName: accountValue,
        secret: secretValue,
        iconInitial: issuerValue.charAt(0).toUpperCase(),
        iconBg: 'from-teal-500 to-cyan-700',
        category: 'personal',
        algorithm: algorithmValue === 'SHA256' ? 'SHA256' : 'SHA1',
        digits: digitsValue,
        period: periodValue,
      };
    } catch {
      return null;
    }
  };

  const addParsedAccount = (rawValue: string) => {
    const parsed = parseOtpAuthUri(rawValue);
    if (!parsed) {
      showToast('QR is not a valid TOTP otpauth:// URI');
      return;
    }
    addAccount({ ...parsed, isFavorite: false });
    showToast(`${parsed.issuer} account added!`);
    stopCamera();
    setScanned(true);
    setTimeout(() => setScreen('dashboard'), 600);
  };

  const decodeImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(pixels.data, pixels.width, pixels.height);
        if (code?.data) addParsedAccount(code.data);
        else showToast('QR code not detected in this image');
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('Camera unavailable; choose a QR image instead');
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      setScanned(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const scan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) {
          scanFrameRef.current = requestAnimationFrame(scan);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(pixels.data, pixels.width, pixels.height);
          if (code?.data) {
            addParsedAccount(code.data);
            return;
          }
        }
        scanFrameRef.current = requestAnimationFrame(scan);
      };
      scanFrameRef.current = requestAnimationFrame(scan);
    } catch {
      stopCamera();
      showToast('Camera permission denied or unavailable');
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedSecret = normalizeSecret(secret);
    if (!issuer.trim() || !accountName.trim()) {
      showToast('Enter both issuer and account name');
      return;
    }
    if (!normalizedSecret) {
      showToast('Enter a valid Base32 secret key');
      return;
    }
    setAdding(true);
    setTimeout(() => {
      addAccount({
        issuer: issuer.trim(),
        accountName: accountName.trim(),
        secret: normalizedSecret,
        iconInitial: issuer.trim().charAt(0).toUpperCase(),
        iconBg: 'from-teal-500 to-cyan-700', category,
        isFavorite: false, algorithm, digits, period,
      });
      showToast(`${issuer.trim()} added to your vault!`);
      setScreen('dashboard');
    }, 500);
  };

  const useTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setIssuer(t.issuer);
    setAccountName(`user@${t.issuer.toLowerCase()}.com`);
    setCategory(t.category);
    setTab('manual');
    showToast(`Enter the Base32 secret from ${t.issuer}`);
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setScreen('dashboard')}
          aria-label="Back to Vault"
          className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 hover:border-emerald-500/40 transition cursor-pointer flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-bold text-white text-base">Add Account</h2>
          <p className="text-[10px] text-zinc-500 font-mono">Scan QR or enter key manually</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-36 no-scrollbar">
        {/* Tabs */}
        <div role="tablist" aria-label="Account entry method" className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 mb-4">
          {[
            { key: 'qr' as const, label: 'Scan QR Code', icon: Camera },
            { key: 'manual' as const, label: 'Manual Key', icon: Key },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => { if (key === 'manual') stopCamera(); setTab(key); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                tab === key ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* QR TAB */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) decodeImage(file);
                event.target.value = '';
              }}
            />
            <div className="relative w-56 h-56 rounded-2xl border-2 border-emerald-500/40 bg-zinc-950 overflow-hidden group">
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
                ) : scanning ? (
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                ) : (
                  <QrCode className="w-28 h-28 text-emerald-400/70" />
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="grid grid-cols-2 gap-2 w-full">
              {scanning ? (
                <button type="button" onClick={stopCamera}
                  className="col-span-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600/80 border border-red-400/30 cursor-pointer flex items-center justify-center gap-2">
                  <StopCircle className="w-4 h-4" /> Stop Camera
                </button>
              ) : (
                <>
                  <button type="button" onClick={startCamera}
                    className="py-3.5 rounded-2xl font-bold text-sm text-black cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#00c853,#00ff88)', boxShadow: '0 6px 20px rgba(0,200,83,0.25)' }}>
                    <Camera className="w-4 h-4" /> Start Camera
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="py-3.5 rounded-2xl font-bold text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 cursor-pointer flex items-center justify-center gap-2">
                    <ImagePlus className="w-4 h-4" /> Choose Image
                  </button>
                </>
              )}
            </div>

            {/* Quick templates */}
            <div className="w-full">
              <p className="text-xs text-zinc-400 font-mono mb-2 text-center">— or add a popular service —</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_TEMPLATES.map(t => (
                  <button type="button" key={t.issuer} onClick={() => useTemplate(t)}
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
              { id: 'manual-issuer', label: 'Service / Issuer', placeholder: 'e.g. GitHub, Coinbase', value: issuer, onChange: setIssuer, required: true },
              { id: 'manual-account', label: 'Account / Email', placeholder: 'user@example.com', value: accountName, onChange: setAccountName, required: true },
              { id: 'manual-secret', label: 'Secret Key (Base32)', placeholder: 'JBSWY3DPEHPK3PXP', value: secret, onChange: setSecret, required: true },
            ].map(({ id, label, placeholder, value, onChange, required }) => (
              <div key={id}>
                <label htmlFor={id} className="text-[11px] text-zinc-400 block mb-1 font-mono">{label}</label>
                <input
                  id={id}
                  type="text"
                  required={required}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-[#0d1712] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-3 py-3 text-sm text-white placeholder-zinc-600 outline-none font-mono"
                />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="manual-algorithm" className="text-[11px] text-zinc-400 block mb-1 font-mono">Algorithm</label>
                <select
                  id="manual-algorithm"
                  value={algorithm}
                  onChange={e => setAlgorithm(e.target.value as 'SHA1'|'SHA256')}
                  className="w-full bg-[#0d1712] border border-emerald-500/20 rounded-xl px-2 py-3 text-xs text-white outline-none"
                >
                  <option value="SHA1">SHA1</option>
                  <option value="SHA256">SHA256</option>
                </select>
              </div>
              <div>
                <label htmlFor="manual-digits" className="text-[11px] text-zinc-400 block mb-1 font-mono">Digits</label>
                <select
                  id="manual-digits"
                  value={digits}
                  onChange={e => setDigits(Number(e.target.value) as 6|8)}
                  className="w-full bg-[#0d1712] border border-emerald-500/20 rounded-xl px-2 py-3 text-xs text-white outline-none"
                >
                  <option value={6}>6 digits</option>
                  <option value={8}>8 digits</option>
                </select>
              </div>
              <div>
                <label htmlFor="manual-period" className="text-[11px] text-zinc-400 block mb-1 font-mono">Period</label>
                <select
                  id="manual-period"
                  value={period}
                  onChange={e => setPeriod(Number(e.target.value) as 30|60)}
                  className="w-full bg-[#0d1712] border border-emerald-500/20 rounded-xl px-2 py-3 text-xs text-white outline-none"
                >
                  <option value={30}>30 sec</option>
                  <option value={60}>60 sec</option>
                </select>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block mb-1 font-mono">Category</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['work','crypto','personal','social'] as const).map(c => (
                  <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize cursor-pointer border transition ${
                      category === c ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={!issuer.trim() || !accountName.trim() || !secret.trim() || adding}
              className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 text-white"
              style={{ background: 'linear-gradient(135deg,#e50914,#ff2e4d 50%,#00c853)', boxShadow: '0 8px 24px rgba(229,9,20,0.3)' }}
            >
              {adding ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <>Add to Vault <ChevronRight className="w-4 h-4" /></>}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
};
