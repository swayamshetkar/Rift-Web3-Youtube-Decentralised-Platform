/**
 * Device Fingerprint Utility
 * Generates and stores a unique device fingerprint for analytics
 */

/**
 * Generate a unique device fingerprint based on browser/device properties
 */
function generateDeviceFingerprint(): string {
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: Date.now(),
  };

  // Create a simple hash of the fingerprint
  const fingerprintString = JSON.stringify(fingerprint);
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16);
}

const FINGERPRINT_KEY = 'device_fingerprint';

/**
 * Get stored device fingerprint or generate a new one
 */
export function getStoredDeviceFingerprint(): string {
  try {
    const stored = localStorage.getItem(FINGERPRINT_KEY);
    if (stored) {
      return stored;
    }

    const newFingerprint = generateDeviceFingerprint();
    localStorage.setItem(FINGERPRINT_KEY, newFingerprint);
    return newFingerprint;
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    return generateDeviceFingerprint();
  }
}

/**
 * Clear the stored device fingerprint
 */
export function clearDeviceFingerprint(): void {
  try {
    localStorage.removeItem(FINGERPRINT_KEY);
  } catch (error) {
    console.error('Error clearing device fingerprint:', error);
  }
}

/**
 * Reset to generate a new fingerprint
 */
export function resetDeviceFingerprint(): string {
  clearDeviceFingerprint();
  return getStoredDeviceFingerprint();
}
