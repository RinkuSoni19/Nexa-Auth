import React from 'react';
import { motion } from 'framer-motion';
import { Home, Plus, Crown, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; icon: React.ElementType; label: string }[] = [
  { screen: 'dashboard',   icon: Home,  label: 'Vault' },
  { screen: 'add-account', icon: Plus,  label: 'Add'   },
  { screen: 'plans',       icon: Crown, label: 'Plans' },
  { screen: 'profile',     icon: User,  label: 'Profile' },
];

export const BottomNav: React.FC = () => {
  const { screen, setScreen, isLocked } = useApp();
  const APP_SCREENS: Screen[] = ['dashboard', 'add-account', 'plans', 'profile', 'settings', 'account-detail'];
  if (isLocked || !APP_SCREENS.includes(screen)) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto">
      {/* Frosted glass effect */}
      <div className="relative mx-3.5 mb-3.5 px-2 py-2 rounded-3xl border border-zinc-700/60 backdrop-blur-xl"
        style={{ background: 'rgba(8,16,10,0.92)', boxShadow: '0 -4px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,136,0.05)' }}>
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(({ screen: s, icon: Icon, label }) => {
            const isActive = screen === s || (s === 'dashboard' && screen === 'account-detail');
            return (
              <button key={s} onClick={() => setScreen(s)}
                className="relative flex flex-col items-center gap-1 py-1 px-4 cursor-pointer group transition-all">
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-400"
                    style={{ boxShadow: '0 0 6px #00ff88' }}
                  />
                )}
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? s === 'plans' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-500 group-hover:text-zinc-300'
                }`}>
                  {s === 'add-account'
                    ? <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#e50914,#00c853)' }}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                    : <Icon className="w-5 h-5" />
                  }
                </div>
                <span className={`text-[9px] font-semibold font-mono uppercase tracking-wide transition-colors ${
                  isActive ? (s === 'plans' ? 'text-yellow-400' : 'text-emerald-400') : 'text-zinc-600'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
