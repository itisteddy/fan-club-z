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

    const [{ count: totalUsers }, { count: activePredictions }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    // Pending settlements = closed/closed-by-time and not settled yet (schema-tolerant)
    let pendingSettlements = 0;
    const preds = await supabase
      .from('predictions')
      .select('id, status, entry_deadline, end_date, closed_at, settled_at, resolution_date')
      .limit(5000);
    if (!(preds as any).error) {
      const rows = ((preds as any).data as any[]) || [];
      pendingSettlements = rows.filter((p: any) => {
        const status = String(p.status || '').toLowerCase();
        if (status === 'settled' || status === 'voided' || status === 'cancelled') return false;
        const closesAt = p.entry_deadline || p.end_date || null;
        const closedAt = p.closed_at || null;
        const settledAt = p.settled_at || p.resolution_date || null;
        const isClosedByTime = closesAt ? String(closesAt) < nowIso : false;
        const isClosed = Boolean(closedAt) || status === 'closed' || isClosedByTime;
        return isClosed && !settledAt;
      }).length;
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

