import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Lock, Check, ArrowLeft, Mail, RefreshCw,
  Sparkles, CheckCircle2, X, ChevronRight, Shield, Plus
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { User } from '../types';
import { GOOGLE_AUTH_CONFIG, parseJwt } from '../config/googleAuth';
import { sendEmailOtp, verifyEmailOtp } from '../services/emailService';
import confetti from 'canvas-confetti';

type Step = 'landing' | 'otp-verify' | 'success';

interface GoogleAccountItem {
  name: string;
  email: string;
  initial: string;
  color: string;
  badge?: string;
}

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.3 30.2 0 24 0 14.7 0 6.7 5.5 2.7 13.6l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
    <path fill="#FBBC05" d="M10.6 28.3A14.5 14.5 0 0 1 9.5 24c0-1.5.2-3 .6-4.3L2.2 13.6A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.5l8.1-6.2z"/>
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.7 42.5 14.7 48 24 48z"/>
  </svg>
);

// Active Google Accounts verified on the user's phone
const PHONE_ACTIVE_ACCOUNTS: GoogleAccountItem[] = [];

export const AuthScreen: React.FC = () => {
  const { setScreen, setUser, showToast } = useApp();
  const [step, setStep] = useState<Step>('landing');
  
  // Google Account Chooser bottom sheet
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [accountsList, setAccountsList] = useState<GoogleAccountItem[]>(PHONE_ACTIVE_ACCOUNTS);
  
  // Custom Google account input
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  
  // Selected Account state
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccountItem>({
    name: 'Google User',
    email: '',
    initial: 'G',
    color: 'from-emerald-500 to-teal-600',
  });
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showNotification, setShowNotification] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 30s countdown timer
  useEffect(() => {
    if (step !== 'otp-verify') return;
    setTimer(30);
    const interval = setInterval(() => {
      setTimer(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Initialize Google Identity Services (GSI) with the user-provided Client ID
  // Note: Only initialize GSI in browser when origin matches authorized origins (http://localhost:3000)
  // to avoid Google OAuth Error 400: origin_mismatch on Android WebView (https://localhost)
  useEffect(() => {
    try {
      const isAllowedOrigin = typeof window !== 'undefined' && (
        window.location.origin === 'http://localhost:3000' ||
        GOOGLE_AUTH_CONFIG.javascriptOrigins.includes(window.location.origin)
      );

      if (isAllowedOrigin && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_AUTH_CONFIG.clientId,
          callback: (response: any) => {
            if (response?.credential) {
              const profile = parseJwt(response.credential);
              if (profile && profile.email) {
                const acc: GoogleAccountItem = {
                  name: profile.name,
                  email: profile.email,
                  initial: (profile.name || profile.email).charAt(0).toUpperCase(),
                  color: 'from-emerald-500 to-teal-600',
                  badge: 'Google OAuth Verified',
                };
                handleSelectAccount(acc);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    } catch (e) {
      console.debug('Google GSI init note:', e);
    }
  }, []);

  // When an account is picked
  const handleSelectAccount = (account: GoogleAccountItem) => {
    if (!GOOGLE_AUTH_CONFIG.clientId) {
      showToast('Google OAuth is not configured. Add a valid Google Client ID to sign in.');
      setShowAccountChooser(false);
      return;
    }
    if (account.badge !== 'Google OAuth Verified') {
      showToast('This account has not been verified by Google OAuth');
      setShowAccountChooser(false);
      return;
    }
    setSelectedAccount(account);
    setShowAccountChooser(false);
    setShowAddCustom(false);

    showToast(`Sending 2FA OTP to ${account.email}…`);

    // Dispatch OTP to user's email
    sendEmailOtp(account.email, account.name).then((res) => {
      if (res.realEmailSent) {
        showToast(`📬 OTP delivered to ${account.email} inbox!`);
      } else if (!res.success) {
        showToast(res.error || 'Could not send OTP');
      }
    });

    setTimeout(() => {
      setStep('otp-verify');
      setOtp(['', '', '', '', '', '']);
      setShowNotification(true);
      showToast(`Google 2FA Code sent to ${account.email}`);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 300);
    }, 600);
  };

  // Google Sign-In button click
  const handleGoogleSignInClick = () => {
    const isAllowedOrigin = typeof window !== 'undefined' && (
      window.location.origin === 'http://localhost:3000' ||
      GOOGLE_AUTH_CONFIG.javascriptOrigins.includes(window.location.origin)
    );

    if (!GOOGLE_AUTH_CONFIG.clientId) {
      showToast('Google OAuth Client ID is missing. Real sign-in is unavailable.');
      return;
    }

    // If in authorized Web origin (http://localhost:3000), use Google OAuth2 Token Client
    if (isAllowedOrigin && typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      setIsConnectingGoogle(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_AUTH_CONFIG.clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            setIsConnectingGoogle(false);
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const data = await res.json();
                if (data.email) {
                  const acc: GoogleAccountItem = {
                    name: data.name || data.email.split('@')[0],
                    email: data.email,
                    initial: (data.name || data.email).charAt(0).toUpperCase(),
                    color: 'from-purple-500 to-indigo-600',
                    badge: 'Google OAuth Verified',
                  };
                  handleSelectAccount(acc);
                  return;
                }
              } catch (fetchErr) {
                console.error('Error fetching Google user info:', fetchErr);
              }
            }
          },
          error_callback: (err: any) => {
            setIsConnectingGoogle(false);
            console.warn('Google OAuth popup closed or error:', err);
            setShowAccountChooser(true);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        setIsConnectingGoogle(false);
        console.debug('TokenClient init fallback:', err);
      }
    }

    // On Android (or when origin is not yet whitelisted in Google Console):
    // Open the authentic Google Play Services account chooser bottom sheet immediately!
    setShowAccountChooser(true);
  };

  // Handle adding custom Google ID
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid Gmail / Google email address');
      return;
    }

    const namePrefix = cleanEmail.split('@')[0];
    const formattedName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
    const newAcc: GoogleAccountItem = {
      name: formattedName,
      email: cleanEmail,
      initial: formattedName.charAt(0).toUpperCase(),
      color: 'from-teal-500 to-emerald-600',
      badge: 'Google Account',
    };

    setAccountsList(prev => [newAcc, ...prev.filter(a => a.email !== cleanEmail)]);
    setCustomEmailInput('');
    handleSelectAccount(newAcc);
  };

  // OTP handlers
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOtp(next);
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== '')) {
      handleVerifyOtp(next.join(''));
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Auto-Fill Code from Notification
  const handleAutoFill = () => {
    showToast('Enter the code received in your email');
  };

  // Resend OTP
  const handleResendOtp = () => {
    setTimer(30);
    setOtp(['', '', '', '', '', '']);
    setShowNotification(true);

    // Dispatch fresh OTP to user's email
    sendEmailOtp(selectedAccount.email, selectedAccount.name).then((res) => {
      if (res.realEmailSent) {
        showToast(`📬 New OTP delivered to ${selectedAccount.email} inbox!`);
      } else if (!res.success) {
        showToast(res.error || 'Could not resend OTP');
      }
    });
  };

  // Verify OTP and open Plan Selection Window
  const handleVerifyOtp = async (codeToCheck?: string) => {
    const code = codeToCheck || otp.join('');
    if (code.length !== 6) {
      showToast('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    const result = await verifyEmailOtp(selectedAccount.email, code);
    setIsVerifying(false);

    if (!result.success) {
      showToast(result.error || 'Incorrect OTP');
      return;
    }

    const loggedUser: User = {
      name: selectedAccount.name,
      email: selectedAccount.email,
      isEmailVerified: true,
      isPhoneVerified: false,
      authMethod: 'google',
      joinedAt: Date.now(),
      plan: 'trial-7d',
    };

    setUser(loggedUser);
    setStep('success');
    showToast('Google ID verified! Opening Security Plans…');
    confetti({
      particleCount: 85,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#00ff88', '#00e5ff', '#ffd700', '#ffffff'],
    });

    setTimeout(() => {
      setScreen('plans');
    }, 1400);
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-y-auto no-scrollbar select-none">
      {/* Background Ambience */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00ff88]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-72 h-72 bg-[#ff2e4d]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />

      {/* ── GOOGLE 2FA EMAIL DELIVERY ALERT ── */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="absolute top-4 left-3 right-3 z-50 p-3.5 rounded-2xl bg-[#0b1c14] border border-emerald-400/50 text-white shadow-2xl flex items-center justify-between gap-2.5 backdrop-blur-xl"
            style={{ boxShadow: '0 10px 30px rgba(0,255,136,0.3)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow">
                <GoogleLogo />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider uppercase">Google Security</span>
                  <span className="text-[9px] text-zinc-400">• Just now</span>
                </div>
                <p className="text-xs font-mono text-zinc-200 truncate">
                  Code sent to {selectedAccount.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleAutoFill}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-[11px] font-bold font-mono flex items-center gap-1 cursor-pointer transition active:scale-95 flex-shrink-0 shadow"
            >
              <Sparkles className="w-3 h-3" />
              <span>Got it</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ══ STEP 1: AUTH LANDING ══════════════════════════════════ */}
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
                <span className="text-[10px] font-mono font-semibold text-emerald-300 tracking-wider">NEXA SHIELD ACTIVE</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs font-mono">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>AES-256</span>
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
                  <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase">Google 2FA Security</span>
                  <span className="h-px w-6 bg-gradient-to-l from-transparent to-emerald-500/50" />
                </div>
              </motion.div>
            </div>

            {/* Google Login Trigger Section */}
            <div className="flex flex-col gap-2.5 mt-2">
              {/* Google OAuth Active Client Badge */}
              <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-[#0a1811] border border-emerald-500/20 text-[10px] font-mono text-zinc-400 mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Google OAuth Project:</span>
                <span className="text-emerald-300 font-bold">{GOOGLE_AUTH_CONFIG.projectId}</span>
              </div>

              {/* 1. Google Login Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGoogleSignInClick}
                disabled={isConnectingGoogle}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white text-zinc-900 font-black text-sm shadow-2xl cursor-pointer active:brightness-95 transition border border-zinc-200"
                style={{ boxShadow: '0 8px 30px rgba(255,255,255,0.18)' }}
              >
                {isConnectingGoogle ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                    <span>Connecting Google OAuth…</span>
                  </>
                ) : (
                  <>
                    <GoogleLogo />
                    <span>Continue with Google</span>
                  </>
                )}
              </motion.button>

              {/* Device Active Account Preview Chip */}
              <div
                onClick={() => setShowAccountChooser(true)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#0c1812]/90 border border-emerald-500/25 cursor-pointer hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${selectedAccount.color} flex items-center justify-center text-white font-bold text-xs shadow`}>
                    {selectedAccount.initial}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">{selectedAccount.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{selectedAccount.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-semibold">
                  <span>Choose ID</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Trust badges footer */}
              <div className="flex items-center justify-center gap-3 pt-1 text-[9px] font-mono text-zinc-500">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  CLIENT: {GOOGLE_AUTH_CONFIG.clientId.slice(0, 12)}…
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  E2EE 256-BIT
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ STEP 2: 6-DIGIT GOOGLE OTP VERIFICATION ══════════════ */}
        {step === 'otp-verify' && (
          <motion.div
            key="otp-verify"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-between p-5 pt-8 pb-7 w-full h-full"
          >
            <div>
              {/* Back navigation */}
              <button
                onClick={() => setStep('landing')}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition mt-1 mb-5 cursor-pointer font-mono"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Switch Google Account</span>
              </button>

              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500/50 mb-3 shadow-lg flex items-center justify-center bg-white p-2.5"
                  style={{ boxShadow: '0 0 25px rgba(0,255,136,0.25)' }}
                >
                  <GoogleLogo />
                </div>
                <h2 className="text-xl font-black text-white">Enter Google 2FA OTP</h2>
                <p className="text-xs text-zinc-300 mt-1 text-center max-w-xs">
                  A 6-digit verification code has been sent to
                </p>
                <div className="flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-300 font-mono font-bold">
                    {selectedAccount.email}
                  </span>
                </div>
              </div>

              {/* 6 OTP Input Boxes */}
              <div className="flex justify-center gap-2 mb-6 max-w-sm mx-auto">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onPaste={handleOtpPaste}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-10 h-13 sm:w-12 sm:h-14 text-center text-xl font-black font-mono rounded-2xl border outline-none transition ${
                      digit
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-105 shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                        : 'bg-[#09150e] border-zinc-700 text-white focus:border-emerald-500'
                    }`}
                  />
                ))}
              </div>

              {/* Verify & Open Plans Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleVerifyOtp()}
                disabled={otp.some(d => !d) || isVerifying}
                className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 text-black shadow-xl transition"
                style={{
                  background: 'linear-gradient(135deg, #00ff88 0%, #00e5ff 100%)',
                  boxShadow: '0 8px 30px rgba(0,255,136,0.35)',
                }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Verifying Code…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Select Plan →</span>
                  </>
                )}
              </motion.button>

              {/* Resend Timer */}
              <div className="flex items-center justify-center mt-5 text-xs font-mono">
                {timer > 0 ? (
                  <span className="text-zinc-500">
                    Resend code in <span className="text-emerald-400 font-bold">{timer}s</span>
                  </span>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    className="text-emerald-400 flex items-center gap-1.5 cursor-pointer hover:underline font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend Google OTP</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-center text-[10px] text-zinc-500 font-mono pt-4">
              Tip: Check your email inbox or spam folder for the 6-digit code.
            </p>
          </motion.div>
        )}

        {/* ══ STEP 3: SUCCESS CONFIRMED CARD ════════════════════════ */}
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
                transition={{ delay: 0.2, type: 'spring' }}
                className="absolute -bottom-2 -right-2 bg-emerald-400 rounded-full p-2 shadow-lg shadow-emerald-950"
              >
                <Check className="w-5 h-5 text-black stroke-[3]" />
              </motion.div>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Google ID Verified!</h2>
            <p className="text-xs text-emerald-400 mt-1 font-mono tracking-wide">
              Opening NexaAuth Security Plans…
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── GOOGLE PLAY SERVICES ACCOUNT CHOOSER BOTTOM SHEET ───── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAccountChooser && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="w-full max-w-md rounded-t-3xl bg-[#1e2022] border-t border-zinc-700/80 p-5 pb-8 shadow-2xl relative text-left"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 rounded-full bg-zinc-600 mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow">
                    <GoogleLogo />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-white leading-tight">Choose an account</h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                        OAuth 2.0
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-tight">
                      to continue to <span className="text-emerald-400 font-bold">NexaAuth</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAccountChooser(false)}
                  className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Google Project Credentials Indicator */}
              <div className="my-2.5 px-3 py-1.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="truncate max-w-[230px]">
                  Project: <strong className="text-zinc-200">{GOOGLE_AUTH_CONFIG.projectId}</strong>
                </span>
                <span className="text-emerald-400 font-bold flex-shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              </div>

              {/* Account list */}
              <div className="divide-y divide-zinc-800/80 my-2 max-h-60 overflow-y-auto">
                {accountsList.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleSelectAccount(acc)}
                    className="w-full flex items-center gap-3.5 py-3 px-3 rounded-2xl hover:bg-zinc-800/80 bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/40 transition cursor-pointer text-left group my-1"
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${acc.color} flex items-center justify-center text-white font-black text-base shadow-md flex-shrink-0 group-hover:scale-105 transition`}>
                      {acc.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate block">{acc.name}</span>
                        {acc.badge && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 font-bold">
                            {acc.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 truncate block font-mono mt-0.5">
                        {acc.email}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition" />
                  </button>
                ))}
              </div>

              {/* Add Custom / Another Account Toggle */}
              {!showAddCustom ? (
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-zinc-800/60 text-zinc-300 text-xs font-semibold cursor-pointer transition border border-dashed border-zinc-700 mt-2"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Use another Google account</span>
                </button>
              ) : (
                <form onSubmit={handleAddCustomAccount} className="mt-2 p-2.5 rounded-2xl bg-black/50 border border-emerald-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 font-mono">Enter Google Email:</span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(false)}
                      className="text-[10px] text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={customEmailInput}
                      onChange={e => setCustomEmailInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs outline-none focus:border-emerald-400 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-emerald-400 text-black text-xs font-bold cursor-pointer hover:bg-emerald-300 transition"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-zinc-400 pt-3 border-t border-zinc-800 leading-relaxed font-sans mt-3">
                To continue, Google will share your name, email address, and profile picture with NexaAuth. Client ID: <span className="font-mono text-zinc-300">{GOOGLE_AUTH_CONFIG.clientId.slice(0, 20)}…</span>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
