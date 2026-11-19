export type Screen =
  | 'splash'
  | 'onboarding'
  | 'welcome'
  | 'phone-entry'
  | 'otp-verify'
  | 'biometric-lock'
  | 'dashboard'
  | 'add-account'
  | 'account-detail'
  | 'settings'
  | 'profile';

export type Category = 'all' | 'work' | 'crypto' | 'personal' | 'social';

export interface AuthAccount {
  id: string;
  issuer: string;
  accountName: string;
  secret: string;
  iconInitial: string;
  iconBg: string;
  category: Exclude<Category, 'all'>;
  isFavorite: boolean;
  addedAt: number;
  algorithm: 'SHA1' | 'SHA256';
  digits: 6 | 8;
  period: 30 | 60;
}

export interface User {
  name: string;
  email?: string;
  isEmailVerified?: boolean;
  phone?: string;
  isPhoneVerified?: boolean;
  avatar?: string;
  authMethod: 'google' | 'phone';
  joinedAt: number;
}

export type BiometricModality = 'fingerprint' | 'faceId' | 'both';

export interface AppSettings {
  biometricEnabled: boolean;
  biometricModality: BiometricModality;
  autoLock: boolean;
  autoLockTimeout: number; // minutes
  hideTokens: boolean;
  darkMode: boolean;
  backupEnabled: boolean;
  masterPasswordHash?: string;
  appLockPin?: string;
}
