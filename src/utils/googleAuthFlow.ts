import { User } from '../types';

export interface FirebaseUserLike {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

export interface UserProfileFirestoreDoc {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  authMethod: 'google';
  plan: 'free' | 'trial-7d' | '3-months' | '1-year' | 'pro' | 'enterprise';
}

export const USER_PROFILE_LIMITS = {
  UID_MAX: 128,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  AVATAR_MAX: 2048,
} as const;

export const ALLOWED_PLANS = [
  'free',
  'trial-7d',
  '3-months',
  '1-year',
  'pro',
  'enterprise',
] as const;

/**
 * Derive a clean display name from a Google/Firebase user record.
 */
export function deriveDisplayName(
  displayName?: string | null,
  email?: string | null
): string {
  const trimmedName = (displayName ?? '').trim();
  if (trimmedName) {
    return trimmedName.slice(0, USER_PROFILE_LIMITS.NAME_MAX);
  }
  const trimmedEmail = (email ?? '').trim();
  if (trimmedEmail.includes('@')) {
    const prefix = trimmedEmail.split('@')[0].trim();
    if (prefix) {
      const formatted = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      return formatted.slice(0, USER_PROFILE_LIMITS.NAME_MAX);
    }
  }
  return 'Google User';
}

/**
 * Convert an authenticated Firebase Google user into the app's User model
 * directly (no OTP step required).
 */
export function mapFirebaseUserToAppUser(
  firebaseUser: FirebaseUserLike,
  existingUser?: User | null,
  now: number = Date.now()
): User {
  const cleanEmail = (firebaseUser.email ?? '').trim().toLowerCase();
  const isSameAccount = Boolean(
    existingUser?.email && cleanEmail && existingUser.email.toLowerCase() === cleanEmail
  );

  const name = deriveDisplayName(
    firebaseUser.displayName || (isSameAccount ? existingUser?.name : undefined),
    cleanEmail
  );

  const avatar =
    (firebaseUser.photoURL ?? '').trim() ||
    (isSameAccount ? existingUser?.avatar : undefined);

  return {
    name,
    email: cleanEmail || undefined,
    isEmailVerified: firebaseUser.emailVerified ?? Boolean(cleanEmail),
    isPhoneVerified: isSameAccount ? Boolean(existingUser?.isPhoneVerified) : false,
    avatar: avatar || undefined,
    authMethod: 'google',
    joinedAt: isSameAccount && existingUser?.joinedAt ? existingUser.joinedAt : now,
    plan: isSameAccount && existingUser?.plan ? existingUser.plan : 'trial-7d',
  };
}

/**
 * Sanitize and bound a user profile payload for Firestore writes so it
 * strictly matches firebase-blueprint.json & firestore.rules constraints.
 */
export function buildUserProfilePayload(
  user: User,
  uid: string
): UserProfileFirestoreDoc {
  const safeUid = uid.trim().slice(0, USER_PROFILE_LIMITS.UID_MAX);
  const safeName = deriveDisplayName(user.name, user.email);
  const safeEmail = (user.email ?? '')
    .trim()
    .toLowerCase()
    .slice(0, USER_PROFILE_LIMITS.EMAIL_MAX);
  const safeAvatar = (user.avatar ?? '')
    .trim()
    .slice(0, USER_PROFILE_LIMITS.AVATAR_MAX);
  const safePlan = ALLOWED_PLANS.includes(user.plan as (typeof ALLOWED_PLANS)[number])
    ? (user.plan as UserProfileFirestoreDoc['plan'])
    : 'trial-7d';

  return {
    uid: safeUid,
    name: safeName,
    email: safeEmail,
    avatar: safeAvatar,
    authMethod: 'google',
    plan: safePlan,
  };
}

/**
 * Convert Firebase Auth popup error codes into clear, actionable messages.
 */
export function mapGoogleAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed. Tap again to sign in.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in request was replaced. Please try again.';
    case 'auth/popup-blocked':
      return 'Browser blocked the Google sign-in popup. Please allow popups and try again.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Google. Check your connection.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google Sign-In.';
    case 'auth/user-disabled':
      return 'This Google account has been disabled.';
    default:
      return 'Could not complete Google Sign-In. Please try again.';
  }
}
