-- ============================================================================
-- PREDICTION ACTIVITY FEED VIEW
-- ============================================================================
-- Creates a unified view of all activity related to a prediction
-- This includes comments, bets placed, reactions, and settlement events

-- Drop the view if it exists
DROP VIEW IF EXISTS public.prediction_activity_feed_v1;

-- Create the unified activity feed view
CREATE OR REPLACE VIEW public.prediction_activity_feed_v1 AS
  -- Comments
  SELECT
    c.prediction_id,
    c.created_at as ts,
    'comment'::text as type,
    c.id::text as ref_id,
    c.user_id as actor_id,
    jsonb_build_object(
      'content', c.content,
      'parent_comment_id', c.parent_comment_id,
      'is_edited', c.is_edited
    ) as data
  FROM public.comments c

  UNION ALL

  -- Prediction Entries (bets placed)
  SELECT
    e.prediction_id,
    e.created_at as ts,
    'entry.create'::text as type,
    e.id::text as ref_id,
    e.user_id as actor_id,
    jsonb_build_object(
      'amount', e.amount,
      'option_id', e.option_id,
      'potential_payout', e.potential_payout,
      'status', e.status
    ) as data
  FROM public.prediction_entries e

  UNION ALL

  -- Reactions (likes, etc.)
  SELECT
    r.prediction_id,
    r.created_at as ts,
    ('reaction.' || r.type)::text as type,
    r.id::text as ref_id,
    r.user_id as actor_id,
    jsonb_build_object(
      'reaction_type', r.type
    ) as data
  FROM public.reactions r

  UNION ALL

  -- Prediction status changes (from predictions table)
  SELECT
    p.id as prediction_id,
    p.updated_at as ts,
    ('prediction.' || p.status)::text as type,
    p.id::text as ref_id,
    p.creator_id as actor_id,
    jsonb_build_object(
      'title', p.title,
      'status', p.status,
      'settled_outcome_id', p.settled_outcome_id
    ) as data
  FROM public.predictions p
  WHERE p.updated_at > p.created_at; -- Only include updates, not initial creation

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_feed_pred_ts 
ON public.prediction_activity_feed_v1 (prediction_id, ts DESC);

-- Create index for actor queries
CREATE INDEX IF NOT EXISTS idx_feed_actor_ts 
ON public.prediction_activity_feed_v1 (actor_id, ts DESC);

-- Grant permissions
GRANT SELECT ON public.prediction_activity_feed_v1 TO authenticated;
GRANT SELECT ON public.prediction_activity_feed_v1 TO anon;
