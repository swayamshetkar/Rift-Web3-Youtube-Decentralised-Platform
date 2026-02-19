// Utility for device fingerprinting
// Used to identify unique devices for view tracking

export const generateDeviceFingerprint = (): string => {
  const stored = localStorage.getItem('device_fingerprint');
  if (stored) {
    return stored;
  }

  const fingerprint = generateUniqueId();
  localStorage.setItem('device_fingerprint', fingerprint);
  return fingerprint;
};

export const getStoredDeviceFingerprint = (): string => {
  const stored = localStorage.getItem('device_fingerprint');
  if (!stored) {
    return generateDeviceFingerprint();
  }
  return stored;
};

const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  const userAgent = navigator.userAgent
    .split('')
    .reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0)
    .toString(36);

  return `${timestamp}${randomStr}${userAgent}`;
};
