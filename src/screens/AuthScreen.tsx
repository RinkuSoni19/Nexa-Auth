import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { signInWithGoogleDirect, syncGoogleUserProfile } from '../firebase';
import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';
import { mapFirebaseUserToAppUser, mapGoogleAuthError } from '../utils/googleAuthFlow';
import { User } from '../types';
import confetti from 'canvas-confetti';

type Step = 'landing' | 'success';

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.3 30.2 0 24 0 14.7 0 6.7 5.5 2.7 13.6l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
    <path fill="#FBBC05" d="M10.6 28.3A14.5 14.5 0 0 1 9.5 24c0-1.5.2-3 .6-4.3L2.2 13.6A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.5l8.1-6.2z"/>
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.7 42.5 14.7 48 24 48z"/>
  </svg>
);

export const AuthScreen: React.FC = () => {
  const { setScreen, user, setUser, showToast } = useApp();
  const [step, setStep] = useState<Step>('landing');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState('');

  const completeDirectGoogleSignIn = (loggedUser: User) => {
    setUser(loggedUser);
    setSignedInEmail(loggedUser.email || loggedUser.name);
    setStep('success');
    showToast(`Signed in as ${loggedUser.email || loggedUser.name}`);

    confetti({
      particleCount: 70,
      spread: 85,
      origin: { y: 0.55 },
      colors: ['#00ff88', '#00e5ff', '#ffd700', '#ffffff'],
    });

    setTimeout(() => {
      setScreen('dashboard');
    }, 900);
  };

  // Fallback for local/Capacitor origins registered in google-oauth.json (direct, no OTP)
  const tryDirectGsiFallback = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const originAllowed =
        typeof window !== 'undefined' &&
        GOOGLE_AUTH_CONFIG.javascriptOrigins.includes(window.location.origin);

      if (!originAllowed || !GOOGLE_AUTH_CONFIG.clientId || !window.google?.accounts?.oauth2) {
        resolve(false);
        return;
      }

      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_AUTH_CONFIG.clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (!tokenResponse?.access_token) {
              resolve(false);
              return;
            }
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const data = await res.json();
              if (data?.email) {
                const loggedUser = mapFirebaseUserToAppUser(
                  {
                    uid: String(data.sub || data.email),
                    displayName: data.name || null,
                    email: data.email,
                    photoURL: data.picture || null,
                    emailVerified: Boolean(data.email_verified ?? true),
                  },
                  user
                );
                completeDirectGoogleSignIn(loggedUser);
                resolve(true);
                return;
              }
            } catch (fetchErr) {
              console.warn('Google userinfo fetch error:', fetchErr);
            }
            resolve(false);
          },
          error_callback: () => {
            resolve(false);
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch {
        resolve(false);
      }
    });
  };

  // Direct Google Sign-In on click — no OTP step
  const handleGoogleSignInClick = async () => {
    if (isConnectingGoogle) return;
    setIsConnectingGoogle(true);

    try {
      const firebaseUser = await signInWithGoogleDirect();
      const loggedUser = mapFirebaseUserToAppUser(firebaseUser, user);

      // Sync profile to Firestore in background without blocking sign-in
      syncGoogleUserProfile(firebaseUser, loggedUser).catch((err) => {
        console.warn('Firestore profile sync skipped:', err);
      });

      completeDirectGoogleSignIn(loggedUser);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';

      if (code === 'auth/unauthorized-domain') {
        const handled = await tryDirectGsiFallback();
        if (handled) {
          setIsConnectingGoogle(false);
          return;
        }
      }

      console.warn('Google sign-in error:', err);
      showToast(mapGoogleAuthError(err));
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-y-auto no-scrollbar select-none">
      {/* Background Ambience */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00ff88]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-72 h-72 bg-[#ff2e4d]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />

      <AnimatePresence mode="wait">
        {/* ══ STEP 1: DIRECT GOOGLE SIGN-IN LANDING ══════════════════ */}
        {step === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-between p-5 pt-8 pb-7 w-full h-full"
          >
            {/* Status bar row */}
            <div className="flex items-center justify-between pt-1 pb-4">
              <div className="flex items-center gap-1.5 bg-[#0d1f18]/90 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono font-semibold text-emerald-300 tracking-wider">SECURE</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs font-mono">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>VAULT</span>
              </div>
            </div>

            {/* Icon Hero Section */}
            <div className="flex flex-col items-center my-auto py-3">
              <div className="relative flex items-center justify-center">
                {/* Rotating Cyber Shield Rings */}
                <motion.div
                  className="absolute w-40 h-40 rounded-3xl border border-emerald-500/20"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.45, 0.2] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute w-36 h-36 rounded-3xl border border-red-500/25"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />
                <motion.div
                  className="absolute w-32 h-32 rounded-3xl border-2 border-dashed border-emerald-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                />

                {/* Main App Icon Container */}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-emerald-500/50 p-1 bg-[#06100a]"
                  style={{ boxShadow: '0 0 36px rgba(0,255,136,0.35), 0 0 72px rgba(255,46,77,0.18)' }}
                >
                  <img src="/icon.jpg" alt="NexaAuth" className="w-full h-full object-cover rounded-xl" />

                  {/* Neon Tech Corner Accents */}
                  <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-red-400" />
                  <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-red-400" />
                  <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />

                  {/* Animated laser scan line */}
                  <motion.div
                    className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent shadow-[0_0_8px_#00ff88]"
                    animate={{ top: ['10%', '85%', '10%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              </div>

              {/* Brand Typography */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-6 text-center"
              >
                <h1 className="text-4xl font-black tracking-tight flex items-center justify-center gap-0.5">
                  <span className="text-[#ff2e4d]" style={{ textShadow: '0 0 18px rgba(255,46,77,0.7)' }}>Nexa</span>
                  <span className="text-[#00ff88]" style={{ textShadow: '0 0 18px rgba(0,255,136,0.7)' }}>Auth</span>
                </h1>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="h-px w-6 bg-gradient-to-r from-transparent to-red-500/50" />
                  <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase">Instant Google Access</span>
                  <span className="h-px w-6 bg-gradient-to-l from-transparent to-emerald-500/50" />
                </div>
              </motion.div>
            </div>

            {/* Direct Google Login Trigger Section */}
            <div className="flex flex-col gap-2.5 mt-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleGoogleSignInClick}
                disabled={isConnectingGoogle}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white text-zinc-900 font-black text-sm shadow-2xl cursor-pointer active:brightness-95 transition border border-zinc-200 disabled:opacity-75"
                style={{ boxShadow: '0 8px 30px rgba(255,255,255,0.18)' }}
              >
                {isConnectingGoogle ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                    <span>Signing in with Google…</span>
                  </>
                ) : (
                  <>
                    <GoogleLogo />
                    <span>Continue with Google</span>
                  </>
                )}
              </motion.button>

              {/* Trust badges footer */}
              <div className="flex items-center justify-center gap-3 pt-1 text-[9px] font-mono text-zinc-500">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  1-TAP GOOGLE LOGIN
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  PRIVATE VAULT
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ STEP 2: DIRECT SIGN-IN CONFIRMED ════════════════════════ */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center w-full h-full"
          >
            <div className="relative mb-5">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-emerald-400 shadow-[0_0_50px_#00ff88] p-1 bg-[#06100a]">
                <img src="/icon.jpg" alt="NexaAuth" className="w-full h-full object-cover rounded-2xl" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring' }}
                className="absolute -bottom-2 -right-2 bg-emerald-400 rounded-full p-2 shadow-lg shadow-emerald-950"
              >
                <Check className="w-5 h-5 text-black stroke-[3]" />
              </motion.div>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Signed In!</h2>
            <p className="text-xs text-emerald-400 mt-1 font-mono tracking-wide truncate max-w-xs">
              {signedInEmail ? `Opening vault for ${signedInEmail}…` : 'Opening your NexaAuth Vault…'}
            </p>

            <div className="flex gap-1.5 mt-5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1, delay: i * 0.25, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
