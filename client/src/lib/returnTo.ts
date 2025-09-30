// Stores the current path so we can get back to it after auth
const KEY = "auth:returnTo";

export const captureReturnTo = (path?: string) => {
  try {
    const val =
      path ??
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem(KEY, val);
    console.log('📌 Captured return URL:', val);
  } catch (error) {
    console.warn('Failed to capture return URL:', error);
  }
};

export const consumeReturnTo = (): string | null => {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    console.log('📍 Consumed return URL:', v);
    return v;
  } catch {
    return null;
  }
};

export const sanitizeInternalPath = (p?: string | null): string => {
  if (!p) return "/";
  // Prevent open-redirects: only allow same-site absolute paths
  if (!p.startsWith("/")) return "/";
  return p;
};
