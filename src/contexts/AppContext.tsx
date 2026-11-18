import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthAccount, User, AppSettings, Screen, Category } from '../types';

const INITIAL_DEMO_ACCOUNTS: AuthAccount[] = [];

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

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persistent user state
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexa_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [screen, _setScreen] = useState<Screen>(() => {
    try {
      const savedUser = localStorage.getItem('nexa_user');
      return savedUser ? 'dashboard' : 'welcome';
    } catch {
      return 'welcome';
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
      return saved ? JSON.parse(saved) : {
        biometricEnabled: true,
        autoLock: true,
        autoLockTimeout: 5,
        hideTokens: false,
        darkMode: true,
        backupEnabled: true,
      };
    } catch {
      return {
        biometricEnabled: true,
        autoLock: true,
        autoLockTimeout: 5,
        hideTokens: false,
        darkMode: true,
        backupEnabled: true,
      };
    }
  });

  const [selectedAccount, setSelectedAccount] = useState<AuthAccount | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!settings.autoLock || !user) return;
    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsLocked(true), settings.autoLockTimeout * 60 * 1000);
    };
    const events: (keyof DocumentEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(eventName => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timeoutId);
      events.forEach(eventName => window.removeEventListener(eventName, resetTimer));
    };
  }, [settings.autoLock, settings.autoLockTimeout, user]);

  // Sync state to localStorage
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('nexa_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('nexa_user');
    }
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
      localStorage.setItem('nexa_settings', JSON.stringify(next));
      return next;
    });
  }, []);

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
  }, [setAccounts]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock   = useCallback(() => setIsLocked(true),  []);

  const exportBackup = useCallback(async () => {
    if (!settings.backupEnabled) {
      showToast('Enable encrypted local backup in Settings');
      return;
    }
    if (!settings.appLockPin) {
      showToast('Set a 4-digit vault PIN before exporting');
      return;
    }
    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(settings.appLockPin),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
      );
      const plaintext = JSON.stringify({
        version: '2.0.0',
        exportedAt: Date.now(),
        accounts,
        settings,
      });
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext),
      );
      const payload = {
        format: 'nexa-vault-aes-gcm',
        version: '2.0.0',
        salt: Array.from(salt).map(v => v.toString(16).padStart(2, '0')).join(''),
        iv: Array.from(iv).map(v => v.toString(16).padStart(2, '0')).join(''),
        ciphertext: Array.from(new Uint8Array(encrypted)).map(v => v.toString(16).padStart(2, '0')).join(''),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexa-vault-backup-${new Date().toISOString().slice(0, 10)}.nexa.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Encrypted vault backup saved');
    } catch {
      showToast('Could not create vault backup');
    }
  }, [accounts, settings, showToast]);

  const importBackup = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.format === 'nexa-vault-aes-gcm') {
        const pin = window.prompt('Enter the 4-digit PIN used for this backup');
        if (!pin || !/^\d{4}$/.test(pin)) {
          showToast('A valid 4-digit PIN is required');
          return false;
        }
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
        (async () => {
          try {
            const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
            const key = await crypto.subtle.deriveKey(
              { name: 'PBKDF2', salt: hexToBytes(parsed.salt), iterations: 150000, hash: 'SHA-256' },
              keyMaterial,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt'],
            );
            const decrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: hexToBytes(parsed.iv) },
              key,
              hexToBytes(parsed.ciphertext),
            );
            const backup = JSON.parse(decoder.decode(decrypted));
            if (Array.isArray(backup.accounts)) {
              setAccounts(backup.accounts);
              if (backup.settings) updateSettings(backup.settings);
              showToast(`Imported ${backup.accounts.length} accounts!`);
            } else {
              showToast('Invalid encrypted backup data');
            }
          } catch {
            showToast('Incorrect PIN or damaged backup');
          }
        })();
        return true;
      }
      if (Array.isArray(parsed.accounts)) {
        setAccounts(parsed.accounts);
        if (parsed.settings) updateSettings(parsed.settings);
        showToast(`Imported ${parsed.accounts.length} accounts!`);
        return true;
      }
      return false;
    } catch {
      showToast('Invalid backup file format');
      return false;
    }
  }, [setAccounts, updateSettings, showToast]);

  return (
    <AppContext.Provider value={{
      screen, setScreen, prevScreen, goBack,
      user, setUser, updateUser,
      accounts, addAccount, removeAccount, toggleFavorite,
      selectedAccount, setSelectedAccount,
      settings, updateSettings,
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
