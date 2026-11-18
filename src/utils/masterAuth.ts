export type PasswordStrength = 'weak' | 'fair' | 'strong';
export type BiometricModality = 'fingerprint' | 'faceId' | 'both';

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength: PasswordStrength;
  score: number;
}

export interface BiometricEligibility {
  allowed: boolean;
  reason?: string;
}

export interface ModalityDisplayInfo {
  supportsFace: boolean;
  supportsFingerprint: boolean;
  label: string;
  primaryType: 'face' | 'fingerprint' | 'both' | 'none';
}

export const MIN_MASTER_PASSWORD_LENGTH = 6;

/**
 * Evaluate master password strength and optional confirmation match.
 */
export function validateMasterPassword(
  password: string,
  confirmPassword?: string
): PasswordValidationResult {
  let score = 0;
  if (password.length >= MIN_MASTER_PASSWORD_LENGTH) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const strength: PasswordStrength =
    score >= 3 ? 'strong' : score >= 2 ? 'fair' : 'weak';

  if (!password || password.length < MIN_MASTER_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Master password must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters`,
      strength,
      score,
    };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return {
      valid: false,
      error: 'Master passwords do not match',
      strength,
      score,
    };
  }

  return { valid: true, strength, score };
}

/**
 * Pure TypeScript SHA-256 fallback for environments without WebCrypto subtle.
 */
function pureSha256Hex(message: string): string {
  const utf8 = unescape(encodeURIComponent(message));
  const bytes: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    bytes.push(utf8.charCodeAt(i));
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  const hiLen = Math.floor(bitLen / 0x100000000);
  const loLen = bitLen >>> 0;
  bytes.push((hiLen >>> 24) & 0xff, (hiLen >>> 16) & 0xff, (hiLen >>> 8) & 0xff, hiLen & 0xff);
  bytes.push((loLen >>> 24) & 0xff, (loLen >>> 16) & 0xff, (loLen >>> 8) & 0xff, loLen & 0xff);

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return pureSha256Hex(input);
}

export function generateSalt(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive a salted SHA-256 hash ("salt:digestHex") for master password storage.
 */
export async function hashMasterPassword(
  password: string,
  existingSalt?: string
): Promise<string> {
  const salt = existingSalt || generateSalt(16);
  const digest = await sha256Hex(`${salt}:${password}`);
  return `${salt}:${digest}`;
}

/**
 * Verify a candidate password against a stored "salt:digestHex" value.
 */
export async function verifyMasterPassword(
  password: string,
  storedHash?: string | null
): Promise<boolean> {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const candidateHex = await sha256Hex(`${salt}:${password}`);
  if (candidateHex.length !== expectedHex.length) return false;

  let diff = 0;
  for (let i = 0; i < candidateHex.length; i++) {
    diff |= candidateHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Enforce that biometric unlock (Face ID / Fingerprint) is only permitted after a master password is set.
 */
export function canEnableBiometricUnlock(
  hasMasterPassword: boolean,
  biometryAvailable: boolean
): BiometricEligibility {
  if (!hasMasterPassword) {
    return {
      allowed: false,
      reason: 'Set a Master Password first to enable Face ID or Fingerprint unlock',
    };
  }
  if (!biometryAvailable) {
    return {
      allowed: false,
      reason: 'Biometric authentication is not available or enrolled on this device',
    };
  }
  return { allowed: true };
}

/**
 * BiometryType numeric values matching @aparajita/capacitor-biometric-auth:
 * 0 = none, 1 = touchId, 2 = faceId, 3 = fingerprintAuthentication, 4 = faceAuthentication, 5 = irisAuthentication
 */
export function getModalityDisplayInfo(
  biometryTypes: number[],
  preferredModality: BiometricModality = 'both'
): ModalityDisplayInfo {
  const hwFace = biometryTypes.some((t) => t === 2 || t === 4);
  const hwFinger = biometryTypes.some((t) => t === 1 || t === 3);

  const supportsFace = hwFace && (preferredModality === 'faceId' || preferredModality === 'both');
  const supportsFingerprint = hwFinger && (preferredModality === 'fingerprint' || preferredModality === 'both');

  if (supportsFace && supportsFingerprint) {
    return {
      supportsFace: true,
      supportsFingerprint: true,
      label: 'Face ID & Fingerprint',
      primaryType: 'both',
    };
  }
  if (supportsFace) {
    return {
      supportsFace: true,
      supportsFingerprint: false,
      label: 'Face ID',
      primaryType: 'face',
    };
  }
  if (supportsFingerprint) {
    return {
      supportsFace: false,
      supportsFingerprint: true,
      label: 'Fingerprint',
      primaryType: 'fingerprint',
    };
  }
  if (hwFace) {
    return { supportsFace: true, supportsFingerprint: false, label: 'Face ID', primaryType: 'face' };
  }
  if (hwFinger) {
    return { supportsFace: false, supportsFingerprint: true, label: 'Fingerprint', primaryType: 'fingerprint' };
  }
  return {
    supportsFace: false,
    supportsFingerprint: false,
    label: 'Biometrics',
    primaryType: 'none',
  };
}
