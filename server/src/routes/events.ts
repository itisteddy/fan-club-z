/**
 * POST /api/v2/events
 *
 * Client-side product event ingest.
 * Only accepts events that cannot be reliably recorded server-side
 * (prediction_viewed, share_clicked, tag_used, session_started, etc.).
 * Financial events (stake_placed, claim_*) must come from server-side code only.
 *
 * Auth: requireSupabaseAuth (user must be logged in).
 * Rate limit: 120 events / min per user.
 */

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { logProductEvent, type ProductEventName } from '../services/analyticsEventService';
import { VERSION } from '@fanclubz/shared';

export const eventsRouter = Router();

// Events allowed from client-side (financial/server-authoritative events excluded)
const CLIENT_ALLOWED_EVENTS = new Set<ProductEventName>([
  'session_started',
  'prediction_viewed',
  'share_clicked',
  'tag_used',
  'onboarding_completed',
  // login_completed and signup_completed are also accepted from client for coverage
  // when server-side hooks are not available; idempotency_key prevents double-counting
  'login_completed',
  'signup_completed',
]);

const EventBodySchema = z.object({
  eventName: z.enum([
    'session_started',
    'prediction_viewed',
    'share_clicked',
    'tag_used',
    'onboarding_completed',
    'login_completed',
    'signup_completed',
  ] as const),
  properties:     z.record(z.unknown()).optional(),
  idempotencyKey: z.string().max(256).optional().nullable(),
  sessionId:      z.string().max(128).optional().nullable(),
  /** ISO-8601 timestamp; used for offline-buffered events. Max 48h in the past. */
  occurredAt:     z.string().datetime({ offset: true }).optional(),
});

// 120 events/min per IP (generous for active sessions)
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Event rate limit exceeded', version: VERSION },
  keyGenerator: (req) => {
    const auth = req as AuthenticatedRequest;
    return auth.user?.id || req.ip || 'anon';
  },
});

eventsRouter.post(
  '/',
  eventsLimiter,
  requireSupabaseAuth as any,
  async (req, res) => {
    const auth = req as AuthenticatedRequest;
    const userId = auth.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Auth required', version: VERSION });
    }

    const parsed = EventBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid event body',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { eventName, properties, idempotencyKey, sessionId, occurredAt } = parsed.data;

    // Validate occurred_at is not in the future or older than 48h
    let parsedOccurredAt: Date | undefined;
    if (occurredAt) {
      parsedOccurredAt = new Date(occurredAt);
      const now = Date.now();
      if (parsedOccurredAt.getTime() > now + 5000) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'occurredAt cannot be in the future',
          version: VERSION,
        });
      }
      if (parsedOccurredAt.getTime() < now - 48 * 60 * 60 * 1000) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'occurredAt cannot be older than 48 hours',
          version: VERSION,
        });
      }
    }

    // Namespaced idempotency key: prefix with userId to prevent cross-user collisions
    const safeIdempotencyKey = idempotencyKey
      ? `client:${userId}:${idempotencyKey}`
      : null;

    // Fire and forget — don't hold the response for the analytics write
    logProductEvent({
      eventName,
      userId,
      sessionId: sessionId ?? null,
      properties: {
        ...properties,
        _source: 'client',
      },
      idempotencyKey: safeIdempotencyKey,
      occurredAt: parsedOccurredAt,
    });

    return res.status(202).json({
      ok: true,
      message: 'Event accepted',
      version: VERSION,
    });
  }
);
