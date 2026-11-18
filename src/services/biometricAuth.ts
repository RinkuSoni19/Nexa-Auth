import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
  getBiometryName,
  type CheckBiometryResult,
} from '@aparajita/capacitor-biometric-auth';
import type { BiometricModality } from '../utils/masterAuth';

export interface BiometricAuthResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  code?: BiometryErrorType;
}

export function isNativeBiometricPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function mapModalityToBiometryTypes(modality: BiometricModality): BiometryType[] {
  switch (modality) {
    case 'faceId':
      return [BiometryType.faceId];
    case 'fingerprint':
      return [BiometryType.fingerprintAuthentication];
    case 'both':
    default:
      return [BiometryType.faceId, BiometryType.fingerprintAuthentication];
  }
}

/**
 * On Web, configures @aparajita/capacitor-biometric-auth simulation state
 * so checkBiometry() reflects the chosen Face ID / Fingerprint modality.
 */
export async function syncWebBiometryState(
  modality: BiometricModality,
  enrolled = true
): Promise<void> {
  if (Capacitor.isNativePlatform()) return;

  const types = mapModalityToBiometryTypes(modality);
  await BiometricAuth.setBiometryType(types);
  await BiometricAuth.setBiometryIsEnrolled(enrolled);
  await BiometricAuth.setDeviceIsSecure(enrolled);
}

/**
 * Checks device biometric capability via Capacitor Biometric Auth plugin.
 */
export async function checkBiometricCapability(
  preferredModality: BiometricModality = 'both'
): Promise<CheckBiometryResult> {
  if (!Capacitor.isNativePlatform()) {
    await syncWebBiometryState(preferredModality, true);
  }
  return BiometricAuth.checkBiometry();
}

/**
 * Invokes the native OS Face ID / Touch ID / Android BiometricPrompt via Capacitor.
 */
export async function authenticateWithNativeBiometrics(
  reason = 'Authenticate to unlock NexaAuth Vault'
): Promise<BiometricAuthResult> {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Use Master Password',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use Master Password',
      androidTitle: 'NexaAuth Vault Locked',
      androidSubtitle: 'Verify with Face ID or Fingerprint',
      androidConfirmationRequired: false,
      androidBiometryStrength: AndroidBiometryStrength.weak,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof BiometryError) {
      const cancelled =
        err.code === BiometryErrorType.userCancel ||
        err.code === BiometryErrorType.appCancel ||
        err.code === BiometryErrorType.systemCancel ||
        err.code === BiometryErrorType.userFallback;

      return {
        success: false,
        cancelled,
        code: err.code,
        error: err.message || 'Biometric authentication failed',
      };
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Biometric authentication unavailable',
    };
  }
}

export function formatBiometrySummary(info: CheckBiometryResult | null): string {
  if (!info || !info.isAvailable) {
    return info?.reason || 'No biometrics enrolled';
  }
  if (info.biometryTypes.length > 0) {
    return info.biometryTypes.map((t) => getBiometryName(t)).join(' • ');
  }
  return getBiometryName(info.biometryType) || 'Biometrics Ready';
}

export async function subscribeToBiometryResume(
  callback: (info: CheckBiometryResult) => void
): Promise<PluginListenerHandle | null> {
  try {
    return await BiometricAuth.addResumeListener(callback);
  } catch {
    return null;
  }
}

export { BiometryErrorType, BiometryType, type CheckBiometryResult };
