import { Router } from 'express';
import { supabase, db } from '../config/database';

export function qaCryptoMock() {
  const r = Router();

  r.post('/api/qa/crypto/mock-deposit', async (req, res) => {
    if (process.env.BASE_DEPOSITS_MOCK !== '1') {
      return res.status(403).json({ ok: false, error: 'mock disabled' });
    }
    
    const { user_id, amount } = req.body || {};
    if (!user_id || !amount) {
      return res.status(400).json({ ok: false, error: 'user_id and amount required' });
    }

    try {
      // 1. Verify user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .single();
      
      if (userError || !user) {
        return res.status(400).json({ ok: false, error: 'unknown user_id' });
      }

      // 2. Create synthetic external_ref (30s buckets to avoid spam)
      const ext = `mock:${user_id}:${amount}:${Math.floor(Date.now() / 30000)}`;

      // 3. Insert wallet transaction (idempotent)
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id,
          type: 'deposit',
          channel: 'crypto',
          provider: 'base-usdc',
          amount,
          status: 'success',
          external_ref: ext,
          description: 'MOCK deposit',
          meta: {},
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      // Check if this is a duplicate (conflict handled by unique index)
      const isNewTransaction = !txError && txData;
      
      if (txError && txError.code !== '23505') { // 23505 is unique violation
        console.error('[FCZ-PAY] mock deposit tx error', txError);
        return res.status(500).json({ ok: false, error: 'tx insert failed', details: txError.message });
      }

      // 4. Update wallet balance only if transaction was newly inserted
      if (isNewTransaction) {
        // First, ensure wallet exists
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user_id)
          .eq('currency', 'USD')
          .single();
        
        if (!existingWallet) {
          // Create wallet if doesn't exist
          const { error: createError } = await supabase
            .from('wallets')
            .insert({
              user_id,
              currency: 'USD',
              available_balance: amount,
              reserved_balance: 0,
              total_deposited: amount,
              total_withdrawn: 0
            });
          
          if (createError) {
            console.error('[FCZ-PAY] mock deposit wallet create error', createError);
            return res.status(500).json({ ok: false, error: 'wallet create failed', details: createError.message });
          }
        } else {
          // Update existing wallet
          const { error: updateError } = await supabase
            .from('wallets')
            .update({
              available_balance: existingWallet.available_balance + amount,
              total_deposited: (existingWallet.total_deposited || 0) + amount,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user_id)
            .eq('currency', 'USD');
          
          if (updateError) {
            console.error('[FCZ-PAY] mock deposit wallet update error', updateError);
            return res.status(500).json({ ok: false, error: 'wallet update failed', details: updateError.message });
          }
        }
        
        // 5. Log event
        await supabase
          .from('event_log')
          .insert({
            source: 'qa',
            kind: 'mock-deposit',
            ref: ext,
            payload: { user_id, amount },
            ts: new Date().toISOString()
          });
        
        console.log(`[FCZ-PAY] Mock deposit credited: ${amount} USD to user ${user_id}`);
      } else {
        console.log(`[FCZ-PAY] Mock deposit duplicate (idempotent): ${ext}`);
      }
      
      return res.json({ ok: true, credited: isNewTransaction });
    } catch (e) {
      console.error('[FCZ-PAY] mock deposit error', e);
      return res.status(500).json({ ok: false, error: 'mock failed', details: e instanceof Error ? e.message : 'unknown' });
    }
  });

  return r;
}
