-- 326: Idempotent cancel prediction (DB transaction)
-- Adds cancellation metadata fields and a transactional cancel+refund function.

-- ------------------------------------------------------------
-- Prediction cancellation metadata
-- ------------------------------------------------------------
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- ------------------------------------------------------------
-- Cancel + refunds (demo-wallet) in one transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_prediction_with_refunds(
  p_prediction_id text,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pred record;
  e record;
  refunded_demo numeric := 0;
  refunded_demo_count integer := 0;
BEGIN
  -- Lock prediction row
  SELECT id, creator_id, status, title
    INTO pred
  FROM public.predictions
  WHERE id::text = p_prediction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency: already cancelled -> no-op
  IF lower(coalesce(pred.status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'predictionId', pred.id::text,
      'status', 'cancelled',
      'alreadyCancelled', true,
      'refunded', jsonb_build_object('demoAmount', 0, 'demoCount', 0)
    );
  END IF;

  -- Authz: only creator
  IF pred.creator_id <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  -- Allowed states: open only (not settled)
  IF lower(coalesce(pred.status, '')) <> 'open' THEN
    RAISE EXCEPTION 'Invalid state: %', pred.status USING ERRCODE = 'P0001';
  END IF;

  -- Update prediction status + metadata
  UPDATE public.predictions
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = p_actor_id,
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = pred.id;

  -- Refund demo-wallet entries (move reserved -> available and insert ledger tx)
  FOR e IN
    SELECT id, user_id, amount, provider
    FROM public.prediction_entries
    WHERE prediction_id = pred.id
      AND status = 'active'
  LOOP
    IF e.provider = 'demo-wallet' THEN
      -- Ensure demo wallet row exists
      INSERT INTO public.wallets (user_id, currency, available_balance, reserved_balance, updated_at)
      VALUES (e.user_id, 'DEMO_USD', 0, 0, now())
      ON CONFLICT (user_id, currency) DO NOTHING;

      -- Move reserved back to available (best-effort; avoid negative reserved)
      UPDATE public.wallets
      SET
        available_balance = COALESCE(available_balance, 0) + COALESCE(e.amount, 0),
        reserved_balance  = GREATEST(0, COALESCE(reserved_balance, 0) - COALESCE(e.amount, 0)),
        updated_at = now()
      WHERE user_id = e.user_id
        AND currency = 'DEMO_USD';

      -- Idempotent-ish refund ledger row (unique constraint may vary, so use ON CONFLICT DO NOTHING)
      INSERT INTO public.wallet_transactions (
        user_id,
        direction,
        type,
        channel,
        provider,
        amount,
        currency,
        status,
        external_ref,
        prediction_id,
        entry_id,
        description,
        meta
      ) VALUES (
        e.user_id,
        'credit',
        'deposit',
        'fiat',
        'demo-wallet',
        COALESCE(e.amount, 0),
        'DEMO_USD',
        'completed',
        'demo_refund_cancel:' || pred.id::text || ':' || e.id::text,
        pred.id,
        e.id,
        'Refund for cancelled prediction: ' || COALESCE(pred.title, pred.id::text),
        jsonb_build_object('kind', 'bet_refund', 'source', 'prediction_cancelled')
      )
      ON CONFLICT DO NOTHING;

      refunded_demo := refunded_demo + COALESCE(e.amount, 0);
      refunded_demo_count := refunded_demo_count + 1;
    END IF;
  END LOOP;

  -- Mark all active entries as refunded (all rails)
  UPDATE public.prediction_entries
  SET status = 'refunded', updated_at = now()
  WHERE prediction_id = pred.id
    AND status = 'active';

  -- Release any escrow locks for this prediction (demo + crypto)
  UPDATE public.escrow_locks
  SET status = 'released', state = 'released', released_at = now()
  WHERE prediction_id = pred.id
    AND (status IN ('locked', 'consumed') OR state IN ('locked', 'consumed'));

  RETURN jsonb_build_object(
    'predictionId', pred.id::text,
    'status', 'cancelled',
    'alreadyCancelled', false,
    'refunded', jsonb_build_object('demoAmount', refunded_demo, 'demoCount', refunded_demo_count)
  );
END;
$$;

