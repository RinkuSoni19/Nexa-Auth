import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthAccount, User, AppSettings, Screen, Category } from '../types';

const INITIAL_DEMO_ACCOUNTS: AuthAccount[] = [
  { id:'1', issuer:'Google',        accountName:'alex@gmail.com',       secret:'SECRET001', iconInitial:'G', iconBg:'from-blue-500 to-blue-700',    category:'personal', isFavorite:true,  addedAt:Date.now()-86400000*5, algorithm:'SHA1', digits:6, period:30 },
  { id:'2', issuer:'GitHub',        accountName:'@alexdev',             secret:'SECRET002', iconInitial:'G', iconBg:'from-zinc-700 to-zinc-900',    category:'work',     isFavorite:true,  addedAt:Date.now()-86400000*4, algorithm:'SHA1', digits:6, period:30 },
  { id:'3', issuer:'Binance',       accountName:'pro.trader#8841',      secret:'SECRET003', iconInitial:'B', iconBg:'from-yellow-500 to-amber-600', category:'crypto',   isFavorite:true,  addedAt:Date.now()-86400000*3, algorithm:'SHA1', digits:6, period:30 },
  { id:'4', issuer:'AWS Cloud',     accountName:'root@aws',             secret:'SECRET004', iconInitial:'A', iconBg:'from-orange-500 to-amber-600', category:'work',     isFavorite:false, addedAt:Date.now()-86400000*2, algorithm:'SHA1', digits:6, period:30 },
  { id:'5', issuer:'ProtonMail',    accountName:'vault@proton.me',      secret:'SECRET005', iconInitial:'P', iconBg:'from-purple-600 to-violet-800',category:'personal', isFavorite:false, addedAt:Date.now()-86400000*1, algorithm:'SHA1', digits:6, period:30 },
  { id:'6', issuer:'Discord',       accountName:'nexauser#1234',        secret:'SECRET006', iconInitial:'D', iconBg:'from-indigo-500 to-indigo-700',category:'social',   isFavorite:false, addedAt:Date.now()-86400000,   algorithm:'SHA1', digits:6, period:30 },
  { id:'7', issuer:'Coinbase Pro',  accountName:'crypto.alex@cb.com',   secret:'SECRET007', iconInitial:'C', iconBg:'from-blue-600 to-cyan-600',    category:'crypto',   isFavorite:false, addedAt:Date.now()-3600000,    algorithm:'SHA1', digits:6, period:30 },
];

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

  const exportBackup = useCallback(() => {
    const data = JSON.stringify({
      version: '2.0.0',
      exportedAt: Date.now(),
      accounts,
      settings
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
    try {
      const parsed = JSON.parse(jsonStr);
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
