import { supabase } from '@/lib/supabase';
import type { FundingMode } from '@/store/fundingModeStore';

type WalletModeRow = { wallet_mode?: FundingMode | null } | null;

function looksLikeMissingColumnError(e: unknown): boolean {
  const msg = String((e as any)?.message || (e as any)?.error_description || '');
  return msg.includes('wallet_mode') && msg.includes('does not exist');
}

export async function getServerWalletMode(userId: string): Promise<FundingMode | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('wallet_mode')
      .eq('id', userId)
      .maybeSingle<WalletModeRow>();

    if (error) throw error;
    const mode = (data as any)?.wallet_mode ?? null;
    if (mode === 'demo' || mode === 'crypto' || mode === 'fiat') return mode;
    return null;
  } catch (e) {
    if (looksLikeMissingColumnError(e)) {
      // Migration not applied yet; fall back to local defaults.
      return null;
    }
    if (import.meta.env.DEV) {
      console.warn('[wallet-mode] Failed to load server wallet_mode; using local default:', e);
    }
    return null;
  }
}

export async function setServerWalletMode(userId: string, mode: FundingMode): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ wallet_mode: mode })
      .eq('id', userId);
    if (error) throw error;
  } catch (e) {
    if (looksLikeMissingColumnError(e)) return;
    if (import.meta.env.DEV) {
      console.warn('[wallet-mode] Failed to persist server wallet_mode (non-fatal):', e);
    }
  }
}

