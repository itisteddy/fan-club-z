import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

export const walletMaintenance = Router();

// POST /api/wallet/expire-locks { userId?: string, olderThanMinutes?: number }
walletMaintenance.post('/expire-locks', async (req, res) => {
  try {
    const { userId, olderThanMinutes = 10 } = req.body as { userId?: string; olderThanMinutes?: number };
    const cutoff = new Date(Date.now() - Math.max(1, olderThanMinutes) * 60 * 1000).toISOString();

    // Update both state and status for consistency
    let query = supabase
      .from('escrow_locks')
      .update({ state: 'expired', status: 'expired', released_at: new Date().toISOString() })
      .eq('state', 'locked')
      .lt('created_at', cutoff);

    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query.select('id, user_id, amount');
    if (error) {
      console.error('[walletMaintenance] expire-locks error', error);
      return res.status(500).json({ error: 'Database error', version: VERSION });
    }

    const total = (data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    return res.json({ ok: true, expiredCount: data?.length || 0, totalAmount: total, version: VERSION });
  } catch (e) {
    console.error('[walletMaintenance] expire-locks unhandled', e);
    return res.status(500).json({ error: 'Internal server error', version: VERSION });
  }
});

export default walletMaintenance;


