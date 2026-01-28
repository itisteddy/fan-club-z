import { Router } from 'express';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';

export const overviewRouter = Router();

function isSchemaMismatch(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === '42703' || // undefined_column
    code === '42P01' || // undefined_table
    code === 'PGRST200' ||
    msg.includes('does not exist') ||
    msg.toLowerCase().includes('schema cache') ||
    msg.toLowerCase().includes('could not find the')
  );
}

/**
 * GET /api/v2/admin/overview
 * Lightweight dashboard stats for the admin home page.
 */
overviewRouter.get('/', async (_req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const nowMs = Date.parse(nowIso);

    // Note: DB uses 'open' for active predictions, not 'active'
    const [{ count: totalUsers }, { count: activePredictions }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    // Pending settlements = closed (by UI rules) and not settled yet (schema-tolerant)
    // Try extended select first, fall back to minimal if columns don't exist
    let pendingSettlements = 0;
    const EXT_SELECT = 'id, status, entry_deadline, end_date, closed_at, settled_at, resolution_date, winning_option_id';
    const BASE_SELECT = 'id, status, entry_deadline, end_date, winning_option_id';
    
    let predsRows: any[] = [];
    let predsError: any = null;
    
    const predsFirst = await supabase
      .from('predictions')
      .select(EXT_SELECT)
      .limit(5000);
    
    if (predsFirst.error && isSchemaMismatch(predsFirst.error)) {
      console.warn('[Admin/Overview] Schema mismatch, trying base select:', predsFirst.error.message);
      const predsFallback = await supabase
        .from('predictions')
        .select(BASE_SELECT)
        .limit(5000);
      predsRows = (predsFallback.data as any[]) || [];
      predsError = predsFallback.error;
    } else {
      predsRows = (predsFirst.data as any[]) || [];
      predsError = predsFirst.error;
    }
    
    if (!predsError && predsRows.length > 0) {
      pendingSettlements = predsRows.filter((p: any) => {
        const status = String(p.status || '').toLowerCase();
        if (status === 'voided' || status === 'cancelled') return false;

        const settledAt = p.settled_at || p.resolution_date || null;
        const isSettled = Boolean(settledAt) || status === 'settled' || status === 'complete';
        if (isSettled) return false;

        const closesAt = p.entry_deadline || p.end_date || null;
        const closedAt = p.closed_at || null;
        const closesAtMs = closesAt ? new Date(closesAt).getTime() : NaN;
        const isClosedByTime = Number.isFinite(closesAtMs) ? closesAtMs <= nowMs : false;
        // Keep backend "closed" rules aligned with UI (`client/src/lib/predictionStatusUi.ts`)
        const isClosed =
          Boolean(closedAt) || status === 'closed' || status === 'awaiting_settlement' || isClosedByTime;

        return isClosed;
      }).length;
    } else if (predsError) {
      console.error('[Admin/Overview] Failed to fetch predictions for pending count:', predsError);
    }

    // Total volume = sum of stakes (best-effort; cap to protect performance)
    let totalVolume = 0;
    const stakeRes = await supabase
      .from('prediction_entries')
      .select('amount')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (!(stakeRes as any).error) {
      totalVolume = (((stakeRes as any).data as any[]) || []).reduce(
        (sum: number, e: any) => sum + Number(e.amount || 0),
        0
      );
    }

    return res.json({
      totalUsers: totalUsers || 0,
      activePredictions: activePredictions || 0,
      pendingSettlements,
      totalVolume,
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Overview] Error:', error);
    // If this fails due to schema mismatches, return safe defaults so the UI doesn't look broken.
    if (isSchemaMismatch(error)) {
      return res.json({
        totalUsers: 0,
        activePredictions: 0,
        pendingSettlements: 0,
        totalVolume: 0,
        version: VERSION,
      });
    }
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch overview stats',
      version: VERSION,
    });
  }
});

