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
import { SubscriptionScreen }  from './screens/SubscriptionScreen';
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
      case 'plans':           return <SubscriptionScreen />;
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
            className="absolute top-12 left-4 right-4 z-50 py-3 px-4 rounded-2xl bg-[#0f281d] border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl flex items-center justify-center gap-2 backdrop-blur-md"
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

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
