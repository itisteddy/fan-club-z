import { supabase } from '../config/database';

export interface CreateNotificationParams {
  userId: string;
  type: string; // 'win', 'loss', 'payout', 'claim', 'dispute', 'comment', 'reminder', 'demo_credit', 'refund'
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, any>;
  externalRef?: string | null; // for idempotency
}

/**
 * Create a notification with idempotency support via external_ref
 * If external_ref is provided and a notification with that ref already exists,
 * returns the existing notification instead of creating a duplicate.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ id: string; created: boolean }> {
  const { userId, type, title, body, href, metadata, externalRef } = params;

  // If external_ref is provided, check for existing notification first
  if (externalRef) {
    const { data: existing, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('external_ref', externalRef)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine; other errors should be logged
      console.error('[Notifications] Error checking existing notification:', checkError);
    }

    if (existing) {
      // Notification already exists with this external_ref; return existing
      return { id: existing.id, created: false };
    }
  }

  // Create new notification
  const { data: inserted, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body: body || null,
      href: href || null,
      metadata: metadata || {},
      external_ref: externalRef || null,
      read_at: null,
    })
    .select('id')
    .single();

  if (error) {
    // If unique constraint violation on external_ref, try to fetch existing
    if (error.code === '23505' && externalRef) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('external_ref', externalRef)
        .maybeSingle();

      if (existing) {
        return { id: existing.id, created: false };
      }
    }

    console.error('[Notifications] Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  if (!inserted) {
    throw new Error('Failed to create notification: no data returned');
  }

  return { id: inserted.id, created: true };
}

/**
 * Batch create notifications (useful for notifying multiple users)
 * Each notification is created idempotently.
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const params of notifications) {
    try {
      const result = await createNotification(params);
      if (result.created) {
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error('[Notifications] Error in batch create:', error);
      // Continue with other notifications even if one fails
    }
  }

  return { created, skipped };
}
