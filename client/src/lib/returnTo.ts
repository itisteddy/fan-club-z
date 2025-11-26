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
  
  // If it's a full URL, extract just the path
  try {
    const url = new URL(p, window.location.origin);
    // Only allow same-origin URLs
    if (url.origin !== window.location.origin) {
      console.warn('⚠️ Blocked external redirect:', p);
      return "/";
    }
    return url.pathname + url.search + url.hash;
  } catch {
    // Not a valid URL, treat as path
  }
  
  // Prevent open-redirects: only allow same-site absolute paths
  if (!p.startsWith("/")) {
    console.warn('⚠️ Blocked non-absolute path:', p);
    return "/";
  }
  
  return p;
};
