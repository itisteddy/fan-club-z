/**
 * Product Analytics Event Service
 *
 * Thin, fire-and-forget wrapper around the product_events table.
 * All errors are caught internally — never propagates to callers.
 *
 * Idempotency:
 *   Pass idempotencyKey = `${eventName}:${entityId}` for server-side events
 *   with a stable entity ID (stake entry, prediction, user, etc.).
 *   Client-side events may pass a client-generated UUID.
 *   Duplicate keys are silently ignored (unique index + 23505 handler).
 *
 * Usage:
 *   import { logProductEvent } from '../services/analyticsEventService';
 *   await logProductEvent({ eventName: 'stake_placed', userId, properties: { ... }, idempotencyKey: `stake_placed:${entryId}` });
 */

import { supabase } from '../config/database';

export type ProductEventName =
  | 'signup_completed'
  | 'onboarding_completed'
  | 'login_completed'
  | 'session_started'
  | 'prediction_viewed'
  | 'prediction_created'
  | 'stake_placed'
  | 'claim_started'
  | 'claim_completed'
  | 'claim_failed'
  | 'comment_created'
  | 'like_added'
  | 'tag_used'
  | 'share_clicked'
  | 'referral_link_clicked'
  | 'referred_signup_completed';

export interface ProductEventParams {
  eventName: ProductEventName;
  userId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
  /** Format: "{eventName}:{entityId}" for deduplication. Null = no dedup. */
  idempotencyKey?: string | null;
  /** When the event actually occurred (for backfill / async paths). Defaults to NOW(). */
  occurredAt?: Date;
}

/** True when the product_events table has been confirmed present. Avoids noisy logs on missing migration. */
let _tableConfirmed: boolean | null = null;

export async function logProductEvent(params: ProductEventParams): Promise<void> {
  // Skip quickly if we've confirmed the table doesn't exist
  if (_tableConfirmed === false) return;

  try {
    const { error } = await supabase.from('product_events').insert({
      event_name:         params.eventName,
      user_id:            params.userId        ?? null,
      anonymous_id:       params.anonymousId   ?? null,
      session_id:         params.sessionId     ?? null,
      properties:         params.properties    ?? {},
      idempotency_key:    params.idempotencyKey ?? null,
      occurred_at:        (params.occurredAt ?? new Date()).toISOString(),
      server_received_at: new Date().toISOString(),
    });

    if (!error) {
      _tableConfirmed = true;
      return;
    }

    const code = String((error as any).code ?? '');
    const msg  = String((error as any).message ?? '').toLowerCase();

    // 23505 = unique_violation: duplicate idempotency_key → safely ignore
    if (code === '23505') return;

    // 42P01 = undefined_table: migration not run yet → suppress after first warning
    if (code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
      if (_tableConfirmed !== false) {
        console.warn('[Analytics] product_events table not available (run migration 345)');
        _tableConfirmed = false;
      }
      return;
    }

    // Other errors: log but don't throw
    console.error('[Analytics] Failed to log product event:', params.eventName, error);
  } catch (err: any) {
    // Never let analytics break primary request handling
    console.error('[Analytics] Unexpected error logging event:', params.eventName, err?.message ?? err);
  }
}

/**
 * Convenience: log multiple events in parallel (fire-and-forget).
 */
export async function logProductEvents(events: ProductEventParams[]): Promise<void> {
  await Promise.all(events.map(logProductEvent));
}
