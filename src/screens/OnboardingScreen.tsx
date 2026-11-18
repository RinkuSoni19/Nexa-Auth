import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Fingerprint, KeyRound, Smartphone, ArrowRight, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const SLIDES = [
  {
    icon: ShieldCheck,
    color: '#00ff88',
    bg: 'from-emerald-900/40 to-emerald-950/60',
    border: 'border-emerald-500/25',
    title: 'Military-Grade 2FA',
    desc: 'Generate offline TOTP codes backed by hardware-secure enclaves. Works without internet.',
    badge: 'RFC 6238',
  },
  {
    icon: Fingerprint,
    color: '#ff2e4d',
    bg: 'from-red-900/40 to-red-950/60',
    border: 'border-red-500/25',
    title: 'Biometric Shield',
    desc: 'Fingerprint & Face-ID vault lock. Your tokens never leave your device unencrypted.',
    badge: 'Hardware Enclave',
  },
  {
    icon: Smartphone,
    color: '#00ff88',
    bg: 'from-emerald-900/40 to-emerald-950/60',
    border: 'border-emerald-500/25',
    title: 'Instant Verification',
    desc: '1-tap push approvals with anti-phishing location intelligence and device trust scoring.',
    badge: 'Anti-Phishing',
  },
  {
    icon: KeyRound,
    color: '#ff2e4d',
    bg: 'from-red-900/40 to-red-950/60',
    border: 'border-red-500/25',
    title: 'Zero-Knowledge Backup',
    desc: 'Encrypted AES-GCM 256-bit cloud backup. Even we cannot read your keys.',
    badge: 'AES-256',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { setScreen } = useApp();
  const [idx, setIdx] = useState(0);
  const isLast = idx === SLIDES.length - 1;
  const slide = SLIDES[idx];
  const Icon = slide.icon;

  const next = () => {
    if (isLast) setScreen('welcome');
    else setIdx(i => i + 1);
  };

  return (
    <div className="relative flex flex-col min-h-full bg-[#030705] overflow-hidden select-none">
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* Skip */}
      <div className="relative z-10 flex justify-end pt-6 px-5">
        <button
          onClick={() => setScreen('welcome')}
          className="text-xs text-zinc-400 hover:text-white transition font-mono cursor-pointer px-3 py-1 rounded-full border border-zinc-700/50 hover:border-zinc-500"
        >
          Skip →
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            {/* Icon circle */}
            <div className="relative mb-8">
              {[100, 130, 160].map((s, i) => (
                <motion.div
                  key={s}
                  className="absolute rounded-full border"
                  style={{
                    width: s, height: s,
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderColor: `${slide.color}${['30','20','10'][i]}`,
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, delay: i * 0.3, repeat: Infinity }}
                />
              ))}
              <div
                className="relative w-20 h-20 rounded-3xl flex items-center justify-center border"
                style={{
                  background: `radial-gradient(circle, ${slide.color}20, ${slide.color}05)`,
                  borderColor: `${slide.color}40`,
                  boxShadow: `0 0 40px ${slide.color}30`,
                }}
              >
                <Icon size={36} style={{ color: slide.color }} />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-3">{slide.title}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">{slide.desc}</p>

            <div
              className="mt-5 px-3 py-1 rounded-full text-[11px] font-mono border"
              style={{ color: slide.color, borderColor: `${slide.color}40`, background: `${slide.color}10` }}
            >
              {slide.badge}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + Next */}
      <div className="relative z-10 px-6 pb-10 flex flex-col items-center gap-6">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === idx ? 'w-6 bg-gradient-to-r from-[#ff2e4d] to-[#00ff88]' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Next / Get Started */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={next}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #e50914 0%, #ff2e4d 45%, #00c853 100%)',
            boxShadow: '0 8px 32px rgba(0,200,83,0.2), 0 4px 16px rgba(229,9,20,0.3)',
            color: 'white',
          }}
        >
          <span>{isLast ? 'Get Started' : 'Next'}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};
