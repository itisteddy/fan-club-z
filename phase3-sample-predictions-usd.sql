-- Phase 3 Fix: Add sample prediction data and fix static content issues
-- This script adds realistic sample predictions with proper USD currency

-- First, ensure we have a sample user (if not already created)
INSERT INTO users (id, email, username, full_name, avatar_url, created_at, updated_at)
VALUES 
  ('sample-user-1', 'creator@fanclubz.app', 'fanclubz_creator', 'Fan Club Z Creator', null, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add sample predictions with proper USD values
INSERT INTO predictions (
  id, creator_id, title, description, category, type, status, 
  stake_min, stake_max, pool_total, entry_deadline, settlement_method, 
  is_private, creator_fee_percentage, platform_fee_percentage, 
  participant_count, created_at, updated_at
) VALUES 
  (
    '4b6592c9-e811-409d-8bbf-4da4f71fe261',
    'sample-user-1',
    'Will Bitcoin reach $100,000 by end of 2025?',
    'With Bitcoin''s recent surge and institutional adoption, many experts predict it could hit the six-figure mark. What do you think?',
    'custom',
    'binary',
    'open',
    1.00,
    1000.00,
    2547.50,
    '2025-12-31 23:59:59',
    'manual',
    false,
    3.5,
    1.5,
    42,
    now() - interval '2 hours',
    now()
  ),
  (
    'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
    'sample-user-1',
    'Will Taylor Swift announce a new album in 2025?',
    'Following her recent Eras Tour success, fans are speculating about her next musical project. Will she surprise us with a new album announcement this year?',
    'pop_culture',
    'binary',
    'open',
    5.00,
    500.00,
    1823.25,
    '2025-12-15 23:59:59',
    'manual',
    false,
    3.5,
    1.5,
    29,
    now() - interval '5 hours',
    now()
  ),
  (
    'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
    'sample-user-1',
    'Will the Lakers make the NBA playoffs this season?',
    'With LeBron and AD leading the team, the Lakers are fighting for a playoff spot. Can they secure their position?',
    'sports',
    'binary',
    'open',
    2.50,
    750.00,
    3241.75,
    '2025-04-15 23:59:59',
    'auto',
    false,
    3.5,
    1.5,
    67,
    now() - interval '1 day',
    now()
  ),
  (
    'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7',
    'sample-user-1',
    'Which AI company will be valued highest by end of 2025?',
    'The AI race is heating up between OpenAI, Anthropic, Google, and others. Which company will lead in valuation?',
    'custom',
    'multi_outcome',
    'open',
    10.00,
    2000.00,
    5678.90,
    '2025-12-20 23:59:59',
    'manual',
    false,
    3.5,
    1.5,
    84,
    now() - interval '6 hours',
    now()
  ),
  (
    'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4',
    'sample-user-1',
    'Will Ethereum 2.0 staking rewards exceed 5% APR?',
    'With the ongoing Ethereum upgrades and staking mechanisms, many are watching the reward rates closely.',
    'custom',
    'binary',
    'open',
    3.00,
    1500.00,
    4123.67,
    '2025-09-30 23:59:59',
    'auto',
    false,
    3.5,
    1.5,
    91,
    now() - interval '3 hours',
    now()
  ),
  (
    'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0',
    'sample-user-1',
    'Will the next Marvel movie break $1B box office?',
    'Marvel''s next big release is generating huge buzz. Will it join the billion-dollar club?',
    'pop_culture',
    'binary',
    'open',
    1.50,
    800.00,
    2890.33,
    '2025-07-01 23:59:59',
    'manual',
    false,
    3.5,
    1.5,
    78,
    now() - interval '4 hours',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  pool_total = EXCLUDED.pool_total,
  participant_count = EXCLUDED.participant_count,
  updated_at = now();

-- Add prediction options for each prediction
INSERT INTO prediction_options (
  id, prediction_id, label, total_staked, current_odds, created_at, updated_at
) VALUES 
  -- Bitcoin prediction options
  ('opt-btc-yes', '4b6592c9-e811-409d-8bbf-4da4f71fe261', 'Yes, Bitcoin will reach $100K', 1547.50, 1.65, now(), now()),
  ('opt-btc-no', '4b6592c9-e811-409d-8bbf-4da4f71fe261', 'No, Bitcoin will stay below $100K', 1000.00, 2.55, now(), now()),
  
  -- Taylor Swift prediction options
  ('opt-ts-yes', 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', 'Yes, she will announce a new album', 823.25, 2.21, now(), now()),
  ('opt-ts-no', 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', 'No, no new album announcement', 1000.00, 1.82, now(), now()),
  
  -- Lakers prediction options
  ('opt-lakers-yes', 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', 'Yes, Lakers will make playoffs', 2041.75, 1.59, now(), now()),
  ('opt-lakers-no', 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', 'No, Lakers will miss playoffs', 1200.00, 2.70, now(), now()),
  
  -- AI company prediction options (multi-outcome)
  ('opt-ai-openai', 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', 'OpenAI', 2000.00, 2.84, now(), now()),
  ('opt-ai-google', 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', 'Google/Alphabet', 1678.90, 3.38, now(), now()),
  ('opt-ai-anthropic', 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', 'Anthropic', 1200.00, 4.73, now(), now()),
  ('opt-ai-other', 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', 'Other company', 800.00, 7.10, now(), now()),
  
  -- Ethereum prediction options
  ('opt-eth-yes', 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4', 'Yes, rewards will exceed 5%', 2123.67, 1.94, now(), now()),
  ('opt-eth-no', 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4', 'No, rewards will stay below 5%', 2000.00, 2.06, now(), now()),
  
  -- Marvel prediction options
  ('opt-marvel-yes', 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0', 'Yes, it will break $1B', 1390.33, 2.08, now(), now()),
  ('opt-marvel-no', 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0', 'No, it will stay under $1B', 1500.00, 1.93, now(), now())
ON CONFLICT (id) DO UPDATE SET
  total_staked = EXCLUDED.total_staked,
  current_odds = EXCLUDED.current_odds,
  updated_at = now();

-- Update the statistics for the predictions to match the options
UPDATE predictions SET
  likes_count = CASE 
    WHEN id = '4b6592c9-e811-409d-8bbf-4da4f71fe261' THEN 67
    WHEN id = 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p' THEN 43
    WHEN id = 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6' THEN 89
    WHEN id = 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7' THEN 156
    WHEN id = 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4' THEN 72
    WHEN id = 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0' THEN 95
    ELSE likes_count
  END,
  comments_count = CASE 
    WHEN id = '4b6592c9-e811-409d-8bbf-4da4f71fe261' THEN 23
    WHEN id = 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p' THEN 15
    WHEN id = 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6' THEN 34
    WHEN id = 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7' THEN 67
    WHEN id = 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4' THEN 28
    WHEN id = 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0' THEN 41
    ELSE comments_count
  END
WHERE id IN (
  '4b6592c9-e811-409d-8bbf-4da4f71fe261',
  'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
  'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
  'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7',
  'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4',
  'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0'
);

-- Add some sample user activity to make the predictions feel more real
INSERT INTO users (id, email, username, full_name, created_at, updated_at)
VALUES 
  ('user-activity-1', 'user1@example.com', 'crypto_trader', 'Alex Chen', now() - interval '1 week', now()),
  ('user-activity-2', 'user2@example.com', 'sports_fan', 'Jordan Smith', now() - interval '5 days', now()),
  ('user-activity-3', 'user3@example.com', 'pop_culture_guru', 'Taylor Rodriguez', now() - interval '3 days', now())
ON CONFLICT (id) DO NOTHING;

-- Add sample prediction entries to show activity
INSERT INTO prediction_entries (
  id, prediction_id, user_id, option_id, amount, potential_payout, status, created_at, updated_at
) VALUES 
  ('entry-1', '4b6592c9-e811-409d-8bbf-4da4f71fe261', 'user-activity-1', 'opt-btc-yes', 50.00, 82.50, 'active', now() - interval '2 hours', now()),
  ('entry-2', 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', 'user-activity-2', 'opt-lakers-yes', 25.00, 39.75, 'active', now() - interval '4 hours', now()),
  ('entry-3', 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', 'user-activity-3', 'opt-ts-yes', 15.00, 33.15, 'active', now() - interval '1 hour', now())
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  potential_payout = EXCLUDED.potential_payout,
  updated_at = now();

-- Ensure wallet balances for our sample users
INSERT INTO wallets (id, user_id, currency, available_balance, reserved_balance, created_at, updated_at)
VALUES 
  ('wallet-sample-1', 'sample-user-1', 'USD', 10000.00, 0.00, now(), now()),
  ('wallet-activity-1', 'user-activity-1', 'USD', 1500.00, 50.00, now(), now()),
  ('wallet-activity-2', 'user-activity-2', 'USD', 750.00, 25.00, now(), now()),
  ('wallet-activity-3', 'user-activity-3', 'USD', 500.00, 15.00, now(), now())
ON CONFLICT (user_id, currency) DO UPDATE SET
  available_balance = EXCLUDED.available_balance,
  reserved_balance = EXCLUDED.reserved_balance,
  updated_at = now();