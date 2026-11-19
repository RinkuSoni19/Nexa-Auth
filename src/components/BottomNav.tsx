import React from 'react';
import { Home, Plus, Settings, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; icon: React.ElementType; label: string }[] = [
  { screen: 'dashboard',   icon: Home,     label: 'Vault'    },
  { screen: 'add-account', icon: Plus,     label: 'Add'      },
  { screen: 'settings',    icon: Settings, label: 'Security' },
  { screen: 'profile',     icon: User,     label: 'Profile'  },
];

export const BottomNav: React.FC = () => {
  const { screen, setScreen, isLocked } = useApp();
  const APP_SCREENS: Screen[] = ['dashboard', 'add-account', 'profile', 'settings', 'account-detail'];
  if (isLocked || !APP_SCREENS.includes(screen)) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto"
    >
      <div
        className="relative mx-3 mb-3 px-2 py-2 rounded-3xl border border-zinc-700/60 backdrop-blur-xl"
        style={{
          background: 'rgba(8,16,10,0.94)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,136,0.05)',
        }}
      >
        <div className="grid grid-cols-4 items-center">
          {NAV_ITEMS.map(({ screen: s, icon: Icon, label }) => {
            const isActive = screen === s || (s === 'dashboard' && screen === 'account-detail');
            return (
              <button
                key={s}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setScreen(s)}
                className="relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 min-h-[48px] rounded-2xl cursor-pointer group transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
              >
                {isActive && (
                  <span
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400"
                    style={{ boxShadow: '0 0 6px #00ff88' }}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    s === 'add-account'
                      ? 'text-white shadow-md'
                      : isActive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                  style={
                    s === 'add-account'
                      ? { background: 'linear-gradient(135deg,#e50914,#00c853)' }
                      : undefined
                  }
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[9px] font-semibold font-mono uppercase tracking-wide transition-colors ${
                    isActive
                      ? 'text-emerald-400'
                      : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
