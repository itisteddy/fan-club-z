const MODULE_RECOVERY_ATTEMPTS_KEY = 'fcz:module-recovery-attempts';

function readAttempts(): number {
  try {
    return Number(sessionStorage.getItem(MODULE_RECOVERY_ATTEMPTS_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}

function writeAttempts(v: number): void {
  try {
    sessionStorage.setItem(MODULE_RECOVERY_ATTEMPTS_KEY, String(v));
  } catch {
    // Ignore storage failures.
  }
}

async function clearServiceWorkersAndCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    // Ignore cleanup failures.
  }

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {
    // Ignore cleanup failures.
  }
}

function withCacheBuster(url: URL): string {
  url.searchParams.set('__fcz_chunk_recover', String(Date.now()));
  return url.toString();
}

export async function recoverFromModuleLoadError(): Promise<void> {
  const attempts = readAttempts();
  if (attempts >= 2) return;
  writeAttempts(attempts + 1);
  await clearServiceWorkersAndCaches();

  const url = new URL(window.location.href);
  window.location.replace(withCacheBuster(url));
}

