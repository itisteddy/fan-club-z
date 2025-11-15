import express from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { emitWalletUpdate } from '../services/realtime';

const router = express.Router();

// POST /api/escrow/lock - Create escrow lock before placing bet
router.post('/lock', async (req, res) => {
  try {
    const { user_id, prediction_id, amount, currency = 'USD', tx_hash } = req.body;

    console.log(`🔒 Creating escrow lock:`, { user_id, prediction_id, amount, currency, tx_hash });

    // Validate required fields
    if (!user_id || !prediction_id || !amount || amount <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'user_id, prediction_id, and amount are required',
        version: VERSION
      });
    }

    // Verify prediction exists
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, status')
      .eq('id', prediction_id)
      .single();

    if (predError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Create escrow lock
    const lockData: any = {
      user_id,
      prediction_id,
      amount: Number(amount),
      currency: currency || 'USD',
      state: 'locked',
      status: 'locked',
      created_at: new Date().toISOString(),
      meta: { provider: 'crypto-base-usdc' } // Track provider in metadata
    };

    if (tx_hash) {
      lockData.tx_ref = tx_hash;
      lockData.meta = { ...(lockData.meta || {}), tx_hash };
    }

    const { data: lock, error: lockError } = await supabase
      .from('escrow_locks')
      .insert(lockData)
      .select()
      .single();

    if (lockError) {
      // Check if unique constraint violation (duplicate active lock)
      if (lockError.code === '23505' || lockError.message?.includes('uq_lock_user_pred_active')) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Active lock already exists for this user and prediction',
          version: VERSION
        });
      }

      console.error('Error creating escrow lock:', lockError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create escrow lock',
        version: VERSION,
        details: lockError.message
      });
    }

    console.log(`✅ Escrow lock created: ${lock.id} for user ${user_id}, prediction ${prediction_id}, amount ${amount}`);
    emitWalletUpdate({ userId: user_id, reason: 'escrow_locked', amountDelta: -Number(amount) });
    
    return res.status(201).json({
      data: {
        escrowLockId: lock.id,
        lock: {
          id: lock.id,
          user_id: lock.user_id,
          prediction_id: lock.prediction_id,
          amount: lock.amount,
          currency: lock.currency || 'USD',
          status: lock.status || lock.state,
          created_at: lock.created_at
        }
      },
      message: 'Escrow lock created successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error in escrow lock creation:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create escrow lock',
      version: VERSION
    });
  }
});

// POST /api/escrow/release-all
// Body: { userId?: string; walletAddress?: string; predictionId?: string }
// Test/ops helper to force-release any 'locked' or 'consumed' locks so funds become available to stake again.
router.post('/release-all', async (req, res) => {
  try {
    // Guard: only allow in development/test or if explicitly enabled
    const allow = process.env.ALLOW_TEST_UNLOCK === 'true' || process.env.NODE_ENV !== 'production';
    if (!allow) {
      return res.status(403).json({ error: 'forbidden', message: 'Unlock not allowed in production', version: VERSION });
    }

    const { userId, walletAddress, predictionId, email } = req.body as { userId?: string; walletAddress?: string; predictionId?: string; email?: string };
    console.log('[escrow/release-all] request', { userId, walletAddress, predictionId, email });
    let targetUserId = userId as string | undefined;

    // Resolve userId from wallet address if needed
    if (!targetUserId && walletAddress) {
      const { data, error } = await supabase
        .from('crypto_addresses')
        .select('user_id')
        .eq('address', String(walletAddress).toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('[escrow/release-all] lookup error', error);
        return res.status(500).json({ error: 'db_error', version: VERSION });
      }
      targetUserId = data?.user_id as string | undefined;
      console.log('[escrow/release-all] resolved via walletAddress =>', targetUserId);
    }

    // Fallback: resolve by email from application users table
    if (!targetUserId && email) {
      const { data: u, error: uErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (uErr) {
        console.error('[escrow/release-all] email lookup error', uErr);
        return res.status(500).json({ error: 'db_error', version: VERSION });
      }
      targetUserId = (u as any)?.id as string | undefined;
      console.log('[escrow/release-all] resolved via email =>', targetUserId);
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'bad_request', message: 'userId or walletAddress is required', version: VERSION });
    }

    let q = supabase
      .from('escrow_locks')
      .update({ status: 'released', state: 'released', released_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .in('status', ['locked', 'consumed']);

    if (predictionId) {
      q = q.eq('prediction_id', predictionId);
    }

    const { data: updated, error: updateErr } = await q.select('id, amount');
    if (updateErr) {
      console.error('[escrow/release-all] update error', updateErr);
      return res.status(500).json({ error: 'db_error', version: VERSION });
    }
    console.log('[escrow/release-all] updated locks', updated?.length || 0);

    const releasedTotal = (updated || []).reduce((s, r) => s + Number(r?.['amount'] || 0), 0);

    // Emit a wallet update so UI refreshes its snapshot
    try {
      emitWalletUpdate({ userId: targetUserId, reason: 'escrow_unlock', amountDelta: releasedTotal });
    } catch (e) {
      console.warn('[escrow/release-all] emit error', e);
    }

    return res.json({ ok: true, releasedCount: updated?.length || 0, releasedTotal, version: VERSION });
  } catch (e) {
    console.error('[escrow/release-all] unhandled', e);
    return res.status(500).json({ error: 'internal_error', version: VERSION });
  }
});

export default router;

