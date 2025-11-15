// src/stores/resetAllStores.ts
export function resetAllStores() {
  try {
    // Import and reset the app stores you already use:
    // Note: We'll implement this based on the actual stores in the codebase
    
    // Clear any localStorage/sessionStorage that might contain stale state
    if (typeof window !== 'undefined') {
      // Clear auth-related storage
      sessionStorage.removeItem('sb-ihtnsyhknvltgrksffun-auth-token');
      localStorage.removeItem('sb-ihtnsyhknvltgrksffun-auth-token');
      
      // Clear any other app-specific storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fcz-') || key.startsWith('fanclubz-')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('fcz-') || key.startsWith('fanclubz-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (e) {
    // best-effort; no-op on failures
    console.warn('Failed to reset some stores:', e);
  }
}
