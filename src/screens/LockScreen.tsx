import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export const LockScreen: React.FC = () => {
  const { unlock, showToast } = useApp();
  const [pin, setPin] = useState<string[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFingerprintStart = () => {
    setIsHolding(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsVerified(true);
        setTimeout(() => {
          unlock();
          showToast('Vault Unlocked via Biometrics');
        }, 600);
      }
    }, 60);
  };

  const handleFingerprintEnd = () => {
    if (!isVerified) {
      setIsHolding(false);
      setProgress(0);
    }
  };

  const handlePinPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = [...pin, digit];
      setPin(newPin);
      if (newPin.length === 4) {
        // Any 4 digits unlock in demo or match PIN
        setTimeout(() => {
          unlock();
          showToast('Vault Unlocked via PIN');
        }, 400);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-between px-6 pt-10 pb-6 w-full h-full bg-[#030705] text-white select-none overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center mt-2">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/40 p-1 bg-black shadow-lg mb-3">
          <img src="/icon.jpg" alt="NexaAuth" className="w-full h-full object-cover rounded-xl" />
        </div>
        <h2 className="text-xl font-black text-white">NexaAuth Vault Locked</h2>
        <p className="text-xs text-zinc-400 mt-1 font-mono">Authenticate to decrypt credentials</p>
      </div>

      {/* Center Biometric Sensor */}
      <div className="relative z-10 flex flex-col items-center my-auto">
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Progress Circular SVG */}
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="54" stroke="#182c20" strokeWidth="4" fill="transparent" />
            <circle
              cx="64" cy="64" r="54"
              stroke="#00ff88"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={339}
              strokeDashoffset={339 - (339 * progress / 100)}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          <button
            onMouseDown={handleFingerprintStart}
            onMouseUp={handleFingerprintEnd}
            onTouchStart={handleFingerprintStart}
            onTouchEnd={handleFingerprintEnd}
            className={`absolute inset-3 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isVerified
                ? 'bg-emerald-500 text-black scale-105 shadow-[0_0_30px_#00ff88]'
                : isHolding
                ? 'bg-emerald-950/80 text-emerald-300 scale-95 border-2 border-emerald-400'
                : 'bg-[#0a1811] text-emerald-400 hover:bg-[#11261b] border border-emerald-500/30'
            }`}
          >
            {isVerified ? (
              <CheckCircle2 className="w-14 h-14" />
            ) : (
              <Fingerprint className={`w-14 h-14 ${isHolding ? 'animate-pulse' : ''}`} />
            )}
          </button>
        </div>

        <span className="text-xs font-mono text-zinc-400 mt-4">
          {isVerified ? (
            <span className="text-emerald-400 font-bold">IDENTITY CONFIRMED</span>
          ) : isHolding ? (
            <span className="text-emerald-300 animate-pulse">Scanning biometric sensor…</span>
          ) : (
            <span>Press & hold fingerprint sensor</span>
          )}
        </span>

        {/* PIN Dots */}
        <div className="flex gap-3 mt-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-all ${
                pin.length > i
                  ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_8px_#00ff88]'
                  : 'bg-zinc-900 border-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Numeric PIN Keypad */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 w-full max-w-xs mb-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, idx) => (
          k === '' ? (
            <div key={idx} />
          ) : k === '⌫' ? (
            <button
              key={idx}
              onClick={handlePinDelete}
              className="py-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 active:bg-zinc-800 text-sm font-bold font-mono transition cursor-pointer"
            >
              ⌫
            </button>
          ) : (
            <button
              key={idx}
              onClick={() => handlePinPress(k)}
              className="py-3.5 rounded-2xl bg-[#0a1610]/80 border border-emerald-500/15 text-white active:bg-emerald-500/20 text-lg font-bold font-mono transition cursor-pointer"
            >
              {k}
            </button>
          )
        ))}
      </div>
    </div>
  );
};
