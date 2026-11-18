import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';

export const SplashScreen: React.FC = () => {
  const { setScreen } = useApp();

  useEffect(() => {
    const t = setTimeout(() => setScreen('onboarding'), 2800);
    return () => clearTimeout(t);
  }, [setScreen]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full bg-[#030705] overflow-hidden">
      {/* Deep glow layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,255,136,0.12)_0%,_transparent_65%)]" />
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Outer pulsing rings */}
      {[160, 200, 240].map((size, i) => (
        <motion.div
          key={size}
          className="absolute rounded-full border border-emerald-500/20"
          style={{ width: size, height: size }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 2.5, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Rotating radar ring */}
      <motion.div
        className="absolute w-44 h-44 rounded-full border-2 border-dashed border-emerald-500/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-56 h-56 rounded-full border border-dashed border-red-500/15"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* App Icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.1 }}
        className="relative z-10"
        style={{ filter: 'drop-shadow(0 0 32px rgba(0,255,136,0.5)) drop-shadow(0 0 64px rgba(255,46,77,0.2))' }}
      >
        <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-emerald-500/60 p-1 bg-[#06100a]">
          <img src="/icon.jpg" alt="NexaAuth" className="w-full h-full object-cover rounded-2xl" />
        </div>

        {/* Laser sweep inside icon */}
        <motion.div
          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent rounded-full"
          style={{ boxShadow: '0 0 10px #00ff88' }}
          animate={{ top: ['12%', '82%', '12%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-7 text-center z-10"
      >
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-[#ff2e4d]" style={{ textShadow:'0 0 20px rgba(255,46,77,0.8)' }}>Nexa</span>
          <span className="text-[#00ff88]" style={{ textShadow:'0 0 20px rgba(0,255,136,0.8)' }}>Auth</span>
        </h1>
        <p className="text-[11px] font-mono tracking-[0.3em] text-zinc-400 mt-1 uppercase">
          Secure Authentication
        </p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        className="absolute bottom-20 left-12 right-12 h-0.5 bg-zinc-800 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#ff2e4d] via-[#00ff88] to-[#ff2e4d]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, delay: 0.7, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.p
        className="absolute bottom-14 text-[10px] font-mono text-zinc-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Initializing Secure Vault…
      </motion.p>
    </div>
  );
};
