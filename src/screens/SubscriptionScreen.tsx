import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Crown, Check, Zap, Shield, Sparkles, Lock, Cloud, Smartphone,
  AlertTriangle, RefreshCw, Star, X, CheckCircle2, CreditCard, ChevronRight,
  ShieldCheck, Clock, Flame
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import confetti from 'canvas-confetti';

interface PlanDetail {
  id: 'trial-7d' | '3-months' | '1-year';
  name: string;
  badge?: string;
  price: string;
  period: string;
  subPrice?: string;
  desc: string;
  highlighted?: boolean;
  buttonText: string;
  features: { text: string; strong?: boolean }[];
}

const PLANS: PlanDetail[] = [
  {
    id: '1-year',
    name: '1 Year Pro Shield',
    badge: 'MOST POPULAR • BEST VALUE',
    price: '₹99',
    period: 'for 1 full year',
    subPrice: 'Only ₹8.25 / month',
    desc: 'Maximum cyber protection for 365 days at our lowest price ever.',
    highlighted: true,
    buttonText: 'Get 1 Year for ₹99',
    features: [
      { text: '365 Days Uninterrupted Cyber Protection', strong: true },
      { text: 'Unlimited 2FA Tokens & Passkeys', strong: true },
      { text: 'Zero-Knowledge AES-256 Cloud Backup', strong: true },
      { text: 'Multi-Device Instant Auto-Sync (Mobile & Web)', strong: true },
      { text: 'Hardware FIDO2 & YubiKey Key Support', strong: false },
      { text: 'Biometric Emergency Duress PIN', strong: false },
      { text: 'Real-time Dark Web Breach & Phishing Radar', strong: false },
      { text: 'Exclusive Pro Cyber Avatars & Themes', strong: false },
    ],
  },
  {
    id: '3-months',
    name: '3 Months Shield',
    badge: 'RECOMMENDED',
    price: '₹49',
    period: 'for 3 months',
    subPrice: 'Only ₹16.33 / month',
    desc: 'Flexible quarterly protection for individuals and developers.',
    highlighted: false,
    buttonText: 'Get 3 Months for ₹49',
    features: [
      { text: '90 Days Full Pro Security Access', strong: true },
      { text: 'Unlimited 2FA Tokens & Passkeys', strong: true },
      { text: 'Zero-Knowledge AES-256 Cloud Backup', strong: true },
      { text: 'Multi-Device Instant Auto-Sync', strong: false },
      { text: 'Dark Web Breach & Phishing Radar', strong: false },
      { text: 'Biometric Emergency Duress PIN', strong: false },
    ],
  },
  {
    id: 'trial-7d',
    name: '7-Day Free Trial',
    badge: 'FREE TRIAL',
    price: '₹0',
    period: 'for 7 days',
    subPrice: 'No credit card needed',
    desc: 'Experience full military-grade Pro features risk-free for 7 days.',
    highlighted: false,
    buttonText: 'Start 7-Day Free Trial',
    features: [
      { text: '7 Days Full Pro Feature Access', strong: true },
      { text: 'Unlimited 2FA Tokens & Passkeys', strong: true },
      { text: 'Local & Cloud Encrypted Vault', strong: false },
      { text: 'Fingerprint & PIN Biometric Shield', strong: false },
      { text: 'Upgrade or cancel anytime', strong: false },
    ],
  },
];

export const SubscriptionScreen: React.FC = () => {
  const { setScreen, user, updateUser, showToast } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail>(PLANS[0]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'gpay'>('upi');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = user?.plan || 'trial-7d';

  const handleSelectPlan = (plan: PlanDetail) => {
    setSelectedPlan(plan);
    if (plan.id === 'trial-7d') {
      // Free trial activates immediately without checkout
      updateUser({ plan: 'trial-7d' });
      showToast('7-Day Free Trial activated! Opening vault 🛡️');
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00ff88', '#00e5ff', '#ffffff'],
      });
      setTimeout(() => {
        setScreen('dashboard');
      }, 1200);
      return;
    }
    setShowCheckout(true);
  };

  const handleCompletePayment = () => {
    showToast('Payments are not configured in this build');
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-[#030705] overflow-hidden select-none">
      {/* Background Cyber Ambience */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-[#ff2e4d]/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-9 pb-3.5 border-b border-emerald-500/10 bg-[#030705]/95 backdrop-blur-xl">
        <button
          onClick={() => setScreen('dashboard')}
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-300 cursor-pointer hover:border-emerald-500/40 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-400" />
          <h2 className="font-bold text-white text-base">Subscription Plans</h2>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>
            {currentPlan === '1-year' ? '1 YEAR' : currentPlan === '3-months' ? '3 MONTHS' : '7D TRIAL'}
          </span>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-36 no-scrollbar space-y-4">

        {/* ── HERO BANNER ─────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 border border-emerald-500/30 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 255, 136, 0.08) 0%, rgba(3, 7, 5, 0.95) 100%)',
            boxShadow: '0 0 40px rgba(0,255,136,0.08)',
          }}
        >
          {/* Animated Crown Badge */}
          <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/20 via-emerald-500/20 to-red-500/20 blur-md"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative w-14 h-14 rounded-2xl bg-[#091710] border-2 border-yellow-400/60 flex items-center justify-center shadow-xl">
              <Crown className="w-7 h-7 text-yellow-400" />
            </div>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            NexaAuth <span className="text-[#00ff88]">Security</span> Plans
          </h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-xs mx-auto leading-relaxed">
            Choose the right defense tier for your 2FA accounts and cloud recovery.
          </p>

          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-emerald-500/15 text-[10px] font-mono text-emerald-400">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" /> Zero-Knowledge
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" /> AES-256 GCM
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" /> Cancel Anytime
            </span>
          </div>
        </div>

        {/* ── PLAN CARDS ──────────────────────────────────── */}
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isHighlighted = plan.highlighted;

          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-3xl p-5 transition-all ${
                isHighlighted
                  ? 'border-2 border-emerald-400/90 shadow-2xl'
                  : 'bg-[#09150f]/85 border border-zinc-800 hover:border-zinc-700'
              }`}
              style={{
                background: isHighlighted
                  ? 'linear-gradient(135deg, rgba(8, 26, 17, 0.96) 0%, rgba(24, 8, 16, 0.96) 100%)'
                  : undefined,
                boxShadow: isHighlighted
                  ? '0 0 35px rgba(0, 255, 136, 0.2), 0 0 60px rgba(255, 46, 77, 0.12)'
                  : undefined,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute top-0 right-0 font-black text-[10px] font-mono px-3 py-1 rounded-bl-2xl uppercase tracking-wider shadow ${
                    isHighlighted
                      ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 border-b border-l border-zinc-700'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan Title */}
              <div className="flex items-center gap-2 mb-2">
                {isHighlighted ? (
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                ) : plan.id === '3-months' ? (
                  <Flame className="w-4 h-4 text-amber-400" />
                ) : (
                  <Clock className="w-4 h-4 text-teal-400" />
                )}
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    isHighlighted ? 'text-emerald-400' : 'text-zinc-300'
                  }`}
                >
                  {plan.name}
                </span>
              </div>

              {/* Price & Period */}
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                <span className="text-xs text-zinc-400 font-mono">{plan.period}</span>
              </div>

              {plan.subPrice && (
                <p className="text-[10px] font-mono text-emerald-400 font-semibold mb-2">
                  {plan.subPrice}
                </p>
              )}

              <p className="text-[11px] text-zinc-400 mb-4">{plan.desc}</p>

              {/* Feature List */}
              <div className="space-y-2 mb-5 pt-3 border-t border-zinc-800 text-xs">
                {plan.features.map(({ text, strong }, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isHighlighted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 text-emerald-400'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className={strong ? 'font-bold text-white' : 'text-zinc-300'}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              {isCurrent ? (
                <div className="w-full py-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Current Active Plan</span>
                </div>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 ${
                    isHighlighted
                      ? 'text-white shadow-xl hover:brightness-110'
                      : 'bg-zinc-800/90 hover:bg-zinc-800 text-white border border-zinc-700'
                  }`}
                  style={
                    isHighlighted
                      ? {
                          background: 'linear-gradient(135deg, #e50914 0%, #ff2e4d 50%, #00c853 100%)',
                          boxShadow: '0 8px 25px rgba(229,9,20,0.4)',
                        }
                      : undefined
                  }
                >
                  {isHighlighted ? <Crown className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  <span>{plan.buttonText}</span>
                </button>
              )}
            </div>
          );
        })}

        {/* ── CONTINUE TO VAULT ──────────────────────────── */}
        <button
          onClick={() => setScreen('dashboard')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl transition active:scale-98"
          style={{ boxShadow: '0 8px 30px rgba(0, 255, 136, 0.3)' }}
        >
          <span>Continue to 2FA Vault</span>
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </button>

        {/* ── SECURITY GUARANTEE ──────────────────────────── */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
          <h4 className="text-xs font-bold text-white">30-Day Money-Back Guarantee</h4>
          <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
            Zero-Knowledge: Your 2FA secrets are encrypted on your device with AES-GCM 256. Even NexaAuth engineers cannot access your keys.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── CHECKOUT / PAYMENT MODAL ────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="w-full max-w-sm rounded-3xl bg-[#08130e] border border-emerald-500/40 p-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Checkout: {selectedPlan.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">{selectedPlan.price} {selectedPlan.period}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 mb-5">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Select Payment Method:
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi' as const, label: 'UPI / QR', icon: '⚡' },
                    { id: 'gpay' as const, label: 'Google Pay', icon: 'G' },
                    { id: 'card' as const, label: 'Debit/Card', icon: '💳' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="text-base mb-0.5">{m.icon}</div>
                      <span className="text-[10px] font-mono block">{m.label}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div className="pt-2">
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Enter UPI ID (VPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi or user@okaxis"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="w-full bg-[#0d1f16] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="p-3 rounded-2xl bg-black/60 border border-zinc-800 mb-4 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Total Due Today:</span>
                <span className="text-emerald-400 font-black text-sm">{selectedPlan.price}</span>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleCompletePayment}
                className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-400 shadow-lg cursor-pointer"
              >
                <Lock className="w-4 h-4" /><span>Payment Provider Not Configured</span>
              </button>

              <p className="text-[9px] text-zinc-500 text-center font-mono mt-3">
                No payment is processed in this build.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
