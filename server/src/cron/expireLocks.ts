/**
 * Cron Job: Expire Old Locks
 * Automatically marks locks as 'expired' when they pass their expiration time
 * Runs every 60 seconds
 */

import { supabase } from '../config/database';

const EXPIRE_INTERVAL_MS = 60 * 1000; // Every 60 seconds

export async function expireOldLocks() {
  try {
    const now = new Date().toISOString();
    const legacyCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    console.log('[CRON] Checking for expired locks...');
    
    // Find and update expired locks by expires_at
    // Update both 'state' and 'status' columns for consistency
    const updateData: any = { 
      state: 'expired',
      status: 'expired',
      released_at: now
    };
    
    // Try to add status if column exists (will fail gracefully if it doesn't)
    // We'll catch the error and retry without status
    const { data: expiredLocks, error } = await supabase
      .from('escrow_locks')
      .update(updateData)
      .eq('state', 'locked')
      .lt('expires_at', now)
      .select('id, user_id, amount');

    if (error) {
      // If error is about status column, retry with only state
      if (error.message?.includes('status')) {
        console.log('[CRON] Retrying without status column...');
        const { data: retryLocks, error: retryError } = await supabase
          .from('escrow_locks')
          .update({ state: 'expired', released_at: now })
          .eq('state', 'locked')
          .lt('expires_at', now)
          .select('id, user_id, amount');
        
        if (retryError) {
          console.error('[CRON] Error expiring locks (retry):', retryError);
          return;
        }
        
        if (retryLocks && retryLocks.length > 0) {
          const totalAmount = retryLocks.reduce((sum, lock) => sum + Number(lock.amount || 0), 0);
          console.log(`[CRON] ✅ Expired ${retryLocks.length} locks, total amount: $${totalAmount.toFixed(2)}`);
        }
        // Continue to legacy cleanup
      } else {
        console.error('[CRON] Error expiring locks:', error);
        return;
      }
    }

    if (expiredLocks && expiredLocks.length > 0) {
      const totalAmount = expiredLocks.reduce((sum, lock) => sum + Number(lock.amount || 0), 0);
      console.log(`[CRON] ✅ Expired ${expiredLocks.length} locks, total amount: $${totalAmount.toFixed(2)}`);
      
      // Group by user for logging
      const byUser = expiredLocks.reduce((acc, lock) => {
        const userId = lock.user_id;
        if (!acc[userId]) {
          acc[userId] = { count: 0, amount: 0 };
        }
        acc[userId].count++;
        acc[userId].amount += Number(lock.amount || 0);
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);
      
      Object.entries(byUser).forEach(([userId, stats]) => {
        console.log(`[CRON]   User ${userId.substring(0, 8)}...: ${stats.count} locks, $${stats.amount.toFixed(2)} freed`);
      });
    }

    // Legacy cleanup: expire locks older than 30m with no expires_at
    // Update both columns for consistency
    const { data: legacyExpired, error: legacyErr } = await supabase
      .from('escrow_locks')
      .update({ state: 'expired', status: 'expired', released_at: now })
      .eq('state', 'locked')
      .is('expires_at', null)
      .lt('created_at', legacyCutoff)
      .select('id, user_id, amount');
    if (legacyErr) {
      console.error('[CRON] Legacy lock expiration error:', legacyErr);
    } else if (legacyExpired && legacyExpired.length > 0) {
      console.log(`[CRON] ✅ Legacy expired ${legacyExpired.length} locks with missing expires_at`);
    }

  } catch (error) {
    console.error('[CRON] Unhandled error in expireOldLocks:', error);
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startLockExpirationJob() {
  if (intervalId) {
    console.log('[CRON] Lock expiration job already running');
    return;
  }

  console.log('[CRON] Starting lock expiration job (runs every 60s)');
  
  // Run immediately on start
  expireOldLocks();
  
  // Then run every 60 seconds
  intervalId = setInterval(expireOldLocks, EXPIRE_INTERVAL_MS);
  
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('[CRON] Lock expiration job stopped');
    }
  };
}

export function stopLockExpirationJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[CRON] Lock expiration job stopped');
  }
}

