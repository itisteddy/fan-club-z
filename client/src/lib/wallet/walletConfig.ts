/**
 * Wallet configuration helpers.
 *
 * Accept both legacy and canonical WalletConnect env vars to avoid
 * platform-specific build drift:
 * - VITE_WALLETCONNECT_PROJECT_ID (canonical)
 * - VITE_WC_PROJECT_ID (legacy)
 * - VITE_REOWN_PROJECT_ID (alias)
 */

const canonicalProjectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() || '';
const legacyProjectId = (import.meta.env.VITE_WC_PROJECT_ID as string | undefined)?.trim() || '';
const reownAliasProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined)?.trim() || '';
const fallbackProjectId = '00bf3e007580babfff66bd23c646f3ff';

function getRuntimeLocalProjectId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem('fcz.walletconnect.projectId') || undefined;
  } catch {
    return undefined;
  }
}

export function getWalletConnectProjectId(): string {
  const runtimeOverride = (typeof window !== 'undefined'
    ? (window as any).__FCZ_WALLETCONNECT_PROJECT_ID__
    : undefined) as string | undefined;

  const runtimeLocalOverride = getRuntimeLocalProjectId();

  return (
    runtimeOverride?.trim() ||
    runtimeLocalOverride?.trim() ||
    canonicalProjectId ||
    legacyProjectId ||
    reownAliasProjectId ||
    fallbackProjectId
  ).trim();
}

export function hasWalletConnectProjectId(): boolean {
  return getWalletConnectProjectId().length >= 8;
}

export function getWalletConnectProjectIdSource(): 'runtime' | 'runtime_local' | 'canonical' | 'legacy' | 'reown_alias' | 'fallback' | 'missing' {
  const runtimeOverride = (typeof window !== 'undefined'
    ? (window as any).__FCZ_WALLETCONNECT_PROJECT_ID__
    : undefined) as string | undefined;
  if ((runtimeOverride || '').trim().length >= 8) return 'runtime';
  const runtimeLocalOverride = getRuntimeLocalProjectId();
  if ((runtimeLocalOverride || '').trim().length >= 8) return 'runtime_local';
  if (canonicalProjectId.length >= 8) return 'canonical';
  if (legacyProjectId.length >= 8) return 'legacy';
  if (reownAliasProjectId.length >= 8) return 'reown_alias';
  if (fallbackProjectId.length >= 8) return 'fallback';
  return 'missing';
}
