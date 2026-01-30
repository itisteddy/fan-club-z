/**
 * User-facing content reporting (UGC moderation)
 * Feature flag: VITE_FCZ_UGC_MODERATION
 */

import { getApiUrl } from '@/config';

export type ReportTargetType = 'prediction' | 'comment' | 'user';

export async function submitContentReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  accessToken: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/api/v2/content/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ targetType, targetId, reason: reason.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: (data as any)?.message || 'Failed to submit report' };
    }
    return { ok: true, message: (data as any)?.message };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'Failed to submit report' };
  }
}
