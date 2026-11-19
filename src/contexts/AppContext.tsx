import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthAccount, User, AppSettings, Screen, Category, BiometricModality } from '../types';
import {
  hashMasterPassword,
  verifyMasterPassword,
  validateMasterPassword,
  canEnableBiometricUnlock,
} from '../utils/masterAuth';
import {
  checkBiometricCapability,
  subscribeToBiometryResume,
  type CheckBiometryResult,
} from '../services/biometricAuth';
import { auth, onAuthStateChanged, signOutFirebase } from '../firebase';
import { mapFirebaseUserToAppUser } from '../utils/googleAuthFlow';
import { validateBackupPayload } from '../utils/vaultSecurity';

const INITIAL_DEMO_ACCOUNTS: AuthAccount[] = [];

const DEFAULT_SETTINGS: AppSettings = {
  biometricEnabled: false,
  biometricModality: 'both',
  autoLock: true,
  autoLockTimeout: 5,
  hideTokens: false,
  darkMode: true,
  backupEnabled: true,
};

const DEMO_USER: User = {
  name: 'NexaAuth Preview',
  email: 'preview@nexaauth.local',
  isEmailVerified: true,
  isPhoneVerified: false,
  authMethod: 'google',
  joinedAt: Date.now(),
  plan: 'trial-7d',
};

function isAutostartMode(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

interface AppContextType {
  screen: Screen;
  setScreen: (s: Screen) => void;
  prevScreen: Screen | null;
  goBack: () => void;

  user: User | null;
  setUser: (u: User | null) => void;
  updateUser: (patch: Partial<User>) => void;

  accounts: AuthAccount[];
  addAccount: (a: Omit<AuthAccount,'id'|'addedAt'>) => void;
  removeAccount: (id: string) => void;
  toggleFavorite: (id: string) => void;
  selectedAccount: AuthAccount | null;
  setSelectedAccount: (a: AuthAccount | null) => void;

  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;

  hasMasterPassword: boolean;
  biometryInfo: CheckBiometryResult | null;
  refreshBiometry: (modality?: BiometricModality) => Promise<CheckBiometryResult | null>;
  setMasterPassword: (
    newPassword: string,
    currentPassword?: string,
    enableBiometrics?: boolean,
    modality?: BiometricModality
  ) => Promise<{ ok: boolean; error?: string }>;
  verifyVaultMasterPassword: (password: string) => Promise<boolean>;
  clearMasterPassword: (currentPassword: string) => Promise<{ ok: boolean; error?: string }>;

  activeCategory: Category;
  setActiveCategory: (c: Category) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  toast: string | null;
  showToast: (msg: string) => void;

  isLocked: boolean;
  unlock: () => void;
  lock: () => void;

  exportBackup: () => void;
  importBackup: (jsonStr: string) => boolean;
}

const APP_CONTEXT_SYMBOL = Symbol.for('nexaauth.AppContext');
type GlobalWithAppContext = typeof globalThis & {
  [APP_CONTEXT_SYMBOL]?: React.Context<AppContextType | null>;
};
const globalContextStore = globalThis as GlobalWithAppContext;
const AppContext: React.Context<AppContextType | null> =
  globalContextStore[APP_CONTEXT_SYMBOL] ??
  (globalContextStore[APP_CONTEXT_SYMBOL] = createContext<AppContextType | null>(null));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persistent user state
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexa_user');
      if (saved) return JSON.parse(saved);
      if (isAutostartMode()) {
        localStorage.setItem('nexa_user', JSON.stringify(DEMO_USER));
        return DEMO_USER;
      }
      return null;
    } catch {
      return isAutostartMode() ? DEMO_USER : null;
    }
  });

  const [screen, _setScreen] = useState<Screen>(() => {
    try {
      const savedUser = localStorage.getItem('nexa_user');
      return savedUser || isAutostartMode() ? 'dashboard' : 'welcome';
    } catch {
      return isAutostartMode() ? 'dashboard' : 'welcome';
    }
  });
  const [prevScreen, setPrevScreen] = useState<Screen | null>(null);

  // Persistent accounts state
  const [accounts, setAccountsState] = useState<AuthAccount[]>(() => {
    try {
      const saved = localStorage.getItem('nexa_accounts');
      return saved ? JSON.parse(saved) : INITIAL_DEMO_ACCOUNTS;
    } catch {
      return INITIAL_DEMO_ACCOUNTS;
    }
  });

  // Persistent settings state
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('nexa_settings');
      if (!saved) return DEFAULT_SETTINGS;
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } as AppSettings;
      if (!parsed.masterPasswordHash) {
        parsed.biometricEnabled = false;
      }
      return parsed;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [biometryInfo, setBiometryInfo] = useState<CheckBiometryResult | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AuthAccount | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      if (isAutostartMode()) return false;
      const savedUser = localStorage.getItem('nexa_user');
      if (!savedUser) return false;
      const unlockedInSession = sessionStorage.getItem('nexa_session_unlocked') === '1';
      return Boolean(settings.masterPasswordHash && settings.autoLock && !unlockedInSession);
    } catch {
      return false;
    }
  });

  const hasMasterPassword = Boolean(settings.masterPasswordHash);

  const refreshBiometry = useCallback(async (modality?: BiometricModality) => {
    try {
      const info = await checkBiometricCapability(modality ?? settings.biometricModality);
      setBiometryInfo(info);
      return info;
    } catch {
      return null;
    }
  }, [settings.biometricModality]);

  useEffect(() => {
    refreshBiometry(settings.biometricModality);
    let handlePromise = subscribeToBiometryResume((info) => {
      setBiometryInfo(info);
    });
    return () => {
      handlePromise.then((h) => h?.remove()).catch(() => {});
    };
  }, [refreshBiometry, settings.biometricModality]);

  // Sync state to localStorage & Firebase Auth sign-out
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('nexa_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('nexa_user');
      try { sessionStorage.removeItem('nexa_session_unlocked'); } catch {}
      setSelectedAccount(null);
      setIsLocked(false);
      signOutFirebase().catch(() => {});
    }
  }, []);

  // Keep signed-in Firebase Google user synchronized across reloads
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) return;
      setUserState((prev) => {
        const mapped = mapFirebaseUserToAppUser(firebaseUser, prev);
        localStorage.setItem('nexa_user', JSON.stringify(mapped));
        return mapped;
      });
    });
    return () => unsubscribe();
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return null;
      const next = { ...prev, ...patch };
      localStorage.setItem('nexa_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const setAccounts = useCallback((updater: React.SetStateAction<AuthAccount[]>) => {
    setAccountsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('nexa_accounts', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...s };
      if (!next.masterPasswordHash) {
        next.biometricEnabled = false;
      }
      localStorage.setItem('nexa_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const setMasterPassword = useCallback(async (
    newPassword: string,
    currentPassword?: string,
    enableBiometrics = true,
    modality?: BiometricModality
  ): Promise<{ ok: boolean; error?: string }> => {
    if (settings.masterPasswordHash) {
      const okCurrent = await verifyMasterPassword(currentPassword || '', settings.masterPasswordHash);
      if (!okCurrent) {
        return { ok: false, error: 'Current master password is incorrect' };
      }
    }

    const validation = validateMasterPassword(newPassword);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const nextModality = modality ?? settings.biometricModality;
    const hash = await hashMasterPassword(newPassword);
    const bioInfo = await refreshBiometry(nextModality);
    const bioAvailable = Boolean(bioInfo?.isAvailable ?? true);
    const eligibility = canEnableBiometricUnlock(true, bioAvailable);

    const nextBiometricEnabled = Boolean(enableBiometrics && eligibility.allowed);

    updateSettings({
      masterPasswordHash: hash,
      biometricModality: nextModality,
      biometricEnabled: nextBiometricEnabled,
    });

    showToast(
      nextBiometricEnabled
        ? 'Master Password saved & Biometric Unlock enabled'
        : 'Master Password saved'
    );
    return { ok: true };
  }, [settings.masterPasswordHash, settings.biometricModality, refreshBiometry, updateSettings, showToast]);

  const verifyVaultMasterPassword = useCallback(async (password: string): Promise<boolean> => {
    return verifyMasterPassword(password, settings.masterPasswordHash);
  }, [settings.masterPasswordHash]);

  const clearMasterPassword = useCallback(async (
    currentPassword: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!settings.masterPasswordHash) {
      return { ok: true };
    }
    const valid = await verifyMasterPassword(currentPassword, settings.masterPasswordHash);
    if (!valid) {
      return { ok: false, error: 'Incorrect master password' };
    }
    updateSettings({
      masterPasswordHash: undefined,
      biometricEnabled: false,
    });
    showToast('Master Password & Biometric Lock disabled');
    return { ok: true };
  }, [settings.masterPasswordHash, updateSettings, showToast]);

  const setScreen = useCallback((s: Screen) => {
    _setScreen(prev => { setPrevScreen(prev); return s; });
  }, []);

  const goBack = useCallback(() => {
    if (prevScreen) setScreen(prevScreen);
  }, [prevScreen, setScreen]);

  const addAccount = useCallback((a: Omit<AuthAccount,'id'|'addedAt'>) => {
    setAccounts(prev => [
      { ...a, id: String(Date.now()), addedAt: Date.now() },
      ...prev,
    ]);
  }, [setAccounts]);

  const removeAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, [setAccounts]);

  const toggleFavorite = useCallback((id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    setSelectedAccount(prev => (prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev));
  }, [setAccounts]);

  const unlock = useCallback(() => {
    try { sessionStorage.setItem('nexa_session_unlocked', '1'); } catch {}
    setIsLocked(false);
  }, []);
  const lock = useCallback(() => {
    try { sessionStorage.removeItem('nexa_session_unlocked'); } catch {}
    setIsLocked(true);
  }, []);

  // Enforce real inactivity auto-lock when Master Password and Auto-Lock are enabled
  useEffect(() => {
    if (!user || !hasMasterPassword || !settings.autoLock || isLocked) return;
    const timeoutMs = Math.max(1, settings.autoLockTimeout || 5) * 60_000;
    let timerId: number | undefined;

    const resetTimer = () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        lock();
      }, timeoutMs);
    };

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [user, hasMasterPassword, settings.autoLock, settings.autoLockTimeout, isLocked, lock]);

  const exportBackup = useCallback(() => {
    const data = JSON.stringify({
      version: '2.0.0',
      exportedAt: Date.now(),
      accounts,
      settings: { ...settings, masterPasswordHash: undefined }
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vault backup saved to files');
  }, [accounts, settings, showToast]);

  const importBackup = useCallback((jsonStr: string) => {
    const result = validateBackupPayload(jsonStr);
    if (!result.valid) {
      showToast(result.error || 'Invalid backup file format');
      return false;
    }
    setAccounts(result.accounts);
    if (result.settingsPatch && Object.keys(result.settingsPatch).length > 0) {
      updateSettings(result.settingsPatch);
    }
    showToast(`Imported ${result.accounts.length} verified account${result.accounts.length === 1 ? '' : 's'}!`);
    return true;
  }, [setAccounts, updateSettings, showToast]);

  return (
    <AppContext.Provider value={{
      screen, setScreen, prevScreen, goBack,
      user, setUser, updateUser,
      accounts, addAccount, removeAccount, toggleFavorite,
      selectedAccount, setSelectedAccount,
      settings, updateSettings,
      hasMasterPassword,
      biometryInfo,
      refreshBiometry,
      setMasterPassword,
      verifyVaultMasterPassword,
      clearMasterPassword,
      activeCategory, setActiveCategory,
      searchQuery, setSearchQuery,
      toast, showToast,
      isLocked, unlock, lock,
      exportBackup, importBackup,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
