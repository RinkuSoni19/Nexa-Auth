import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './contexts/AppContext';

/* Screens */
import { SplashScreen }        from './screens/SplashScreen';
import { OnboardingScreen }    from './screens/OnboardingScreen';
import { AuthScreen }          from './screens/AuthScreen';
import { DashboardScreen }     from './screens/DashboardScreen';
import { AddAccountScreen }    from './screens/AddAccountScreen';
import { AccountDetailScreen } from './screens/AccountDetailScreen';
import { SettingsScreen }      from './screens/SettingsScreen';
import { ProfileScreen }       from './screens/ProfileScreen';
import { LockScreen }          from './screens/LockScreen';

/* Shared components */
import { PhoneContainer } from './components/PhoneContainer';
import { BottomNav }      from './components/BottomNav';

function AppInner() {
  const { screen, toast, isLocked } = useApp();

  const renderScreen = () => {
    if (isLocked) {
      return <LockScreen />;
    }

    switch (screen) {
      case 'splash':          return <SplashScreen />;
      case 'onboarding':      return <OnboardingScreen />;
      case 'welcome':         return <AuthScreen />;
      case 'dashboard':       return <DashboardScreen />;
      case 'add-account':     return <AddAccountScreen />;
      case 'account-detail':  return <AccountDetailScreen />;
      case 'settings':        return <SettingsScreen />;
      case 'profile':         return <ProfileScreen />;
      default:                return <AuthScreen />;
    }
  };

  return (
    <PhoneContainer>
      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-3 left-4 right-4 z-50 py-2.5 px-4 rounded-2xl bg-[#0f281d] border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl flex items-center justify-center gap-2 backdrop-blur-md"
            style={{ boxShadow: '0 8px 30px rgba(0,255,136,0.25)' }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen container */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLocked ? 'locked' : screen}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="w-full h-full flex flex-col flex-1 overflow-hidden"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav (auto-hides on auth/splash/lock screens) */}
      {!isLocked && <BottomNav />}
    </PhoneContainer>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <PhoneContainer>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#030705] text-white space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 text-2xl font-black">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">NexaAuth Recovery</h2>
              <p className="text-xs text-zinc-400 font-mono max-w-xs break-words">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer transition"
            >
              Reload Vault
            </button>
          </div>
        </PhoneContainer>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </AppErrorBoundary>
  );
}
