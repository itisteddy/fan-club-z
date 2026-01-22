import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { createNotification } from '../services/notifications';
import { supabase as supabaseClient } from '../config/database';

// Helper to resolve authenticated user ID from request
async function resolveAuthenticatedUserId(req: any): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return null;

    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data?.user?.id) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

export const remindersRouter = Router();

/**
 * POST /api/v2/notifications/reminders/sync
 * Compute and create reminder notifications for the authenticated user
 * - Closing soon: predictions user participated in closing within 60 minutes
 * - Claim reminders: claimable payouts available for > 60 minutes
 */
remindersRouter.post('/sync', async (req, res) => {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }

    let created = 0;
    const now = new Date();
    const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // A) Closing soon reminders
    // Find predictions the user participated in that:
    // - Are not settled/cancelled/voided
    // - Have entry_deadline within next 60 minutes
    // - User has active entries
    const { data: closingPredictions, error: closingError } = await supabase
      .from('prediction_entries')
      .select(`
        prediction_id,
        predictions!inner(
          id,
          title,
          entry_deadline,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('predictions.entry_deadline', now.toISOString())
      .lte('predictions.entry_deadline', sixtyMinutesFromNow.toISOString())
      .in('predictions.status', ['open', 'closed']);

    if (closingError) {
      console.warn('[Reminders] Error fetching closing predictions:', closingError);
    } else if (closingPredictions) {
      // Dedupe by prediction_id
      const uniquePredictions = new Map<string, any>();
      for (const entry of closingPredictions) {
        const pred = (entry as any).predictions;
        if (pred && !uniquePredictions.has(pred.id)) {
          uniquePredictions.set(pred.id, pred);
        }
      }

      // Create reminder for each unique prediction
      for (const prediction of uniquePredictions.values()) {
        try {
          const externalRef = `notif:reminder_close:${prediction.id}:${userId}`;
          await createNotification({
            userId,
            type: 'reminder',
            title: 'Closing soon',
            body: `A prediction you joined closes soon: "${prediction.title}"`,
            href: `/predictions/${prediction.id}`,
            metadata: {
              predictionId: prediction.id,
              predictionTitle: prediction.title,
              closesAt: prediction.entry_deadline,
            },
            externalRef,
          });
          created++;
        } catch (err) {
          console.warn(`[Reminders] Failed to create closing reminder for ${prediction.id}:`, err);
        }
      }
    }

    // B) Claim reminders
    // Find claimable items for the user where:
    // - Claim is available (settlement finalized)
    // - Not yet claimed
    // - Available for > 60 minutes
    // Note: This assumes claimable data is in bet_settlements or a claimables view
    // We'll check bet_settlements with status='onchain_finalized' or 'onchain_posted'
    // and look for entries where user won but hasn't claimed
    const { data: claimableSettlements, error: claimableError } = await supabase
      .from('bet_settlements')
      .select(`
        bet_id,
        predictions!inner(
          id,
          title,
          settled_at
        )
      `)
      .in('status', ['onchain_finalized', 'onchain_posted'])
      .not('predictions.settled_at', 'is', null)
      .lt('predictions.settled_at', sixtyMinutesAgo.toISOString());

    if (claimableError) {
      console.warn('[Reminders] Error fetching claimable settlements:', claimableError);
    } else if (claimableSettlements) {
      // For each settlement, check if user has winning entries
      for (const settlement of claimableSettlements) {
        const prediction = (settlement as any).predictions;
        if (!prediction) continue;

        // Check if user has winning entries for this prediction
        const { data: winningEntries } = await supabase
          .from('prediction_entries')
          .select('id')
          .eq('prediction_id', prediction.id)
          .eq('user_id', userId)
          .eq('status', 'won')
          .limit(1);

        if (!winningEntries || winningEntries.length === 0) continue;

        // Check if user has already claimed (simplified: check if notification already exists)
        // In a real implementation, you'd check a claims table
        try {
          const externalRef = `notif:reminder_claim:${prediction.id}:${userId}`;
          await createNotification({
            userId,
            type: 'reminder',
            title: 'Claim reminder',
            body: `Your payout is ready to claim for "${prediction.title}".`,
            href: `/predictions/${prediction.id}`,
            metadata: {
              predictionId: prediction.id,
              predictionTitle: prediction.title,
              settledAt: prediction.settled_at,
            },
            externalRef,
          });
          created++;
        } catch (err) {
          // If notification already exists (idempotent), that's fine
          console.warn(`[Reminders] Failed to create claim reminder for ${prediction.id}:`, err);
        }
      }
    }

    return res.json({
      success: true,
      created,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Reminders] Error in sync:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync reminders',
      version: VERSION,
    });
  }
});
