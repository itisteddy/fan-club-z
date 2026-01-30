/**
 * Block user API (UGC moderation)
 * Feature flag: VITE_FCZ_UGC_MODERATION
 */

import { getApiUrl } from '@/config';

export async function fetchBlockedUserIds(accessToken: string): Promise<string[]> {
  const res = await fetch(`${getApiUrl()}/api/v2/users/me/blocked`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return (data?.data?.blockedUserIds as string[]) || [];
}

export async function blockUser(userId: string, accessToken: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/api/v2/users/me/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: (data as any)?.message || 'Failed to block user' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'Failed to block user' };
  }
}

export async function unblockUser(userId: string, accessToken: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/api/v2/users/me/block/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: (data as any)?.message || 'Failed to unblock user' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'Failed to unblock user' };
  }
}
