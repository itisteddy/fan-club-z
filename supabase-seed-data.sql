-- Fan Club Z Production Data Seeding Script
-- Run this in your Supabase SQL Editor

-- First, let's check if we have any existing users
SELECT id, email, created_at FROM auth.users LIMIT 5;

-- Create user profiles for existing auth users (if any)
INSERT INTO public.users (id, email, username, full_name, kyc_level, is_verified, reputation_score)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as username,
    COALESCE(raw_user_meta_data->>'full_name', 'User') as full_name,
    'basic' as kyc_level,
    true as is_verified,
    floor(random() * 50 + 50) as reputation_score
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Create wallets for users
INSERT INTO public.wallets (user_id, currency, available_balance, total_deposited)
SELECT 
    u.id,
    'NGN' as currency,
    floor(random() * 50000 + 1000) as available_balance,
    floor(random() * 100000 + 5000) as total_deposited
FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id AND w.currency = 'NGN');

INSERT INTO public.wallets (user_id, currency, available_balance, total_deposited)
SELECT 
    u.id,
    'USD' as currency,
    floor(random() * 1000 + 100) as available_balance,
    floor(random() * 2000 + 500) as total_deposited
FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id AND w.currency = 'USD');

-- Create contextually meaningful clubs
INSERT INTO public.clubs (id, name, description, owner_id, visibility, tags, member_count)
VALUES 
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Premier League Predictions',
        'The ultimate destination for Premier League football predictions. From title races to relegation battles, predict it all!',
        (SELECT id FROM public.users LIMIT 1),
        'public',
        ARRAY['sports', 'football', 'premier-league', 'england'],
        0
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Crypto & Web3 Predictions',
        'Predict cryptocurrency prices, DeFi trends, NFT markets, and blockchain developments. Stay ahead of the crypto curve!',
        (SELECT id FROM public.users LIMIT 1),
        'public',
        ARRAY['crypto', 'finance', 'blockchain', 'web3', 'defi'],
        0
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Nigerian Entertainment Hub',
        'Predict Big Brother Naija winners, Nollywood box office hits, music chart toppers, and celebrity events in Nigeria!',
        (SELECT id FROM public.users LIMIT 1),
        'public',
        ARRAY['entertainment', 'nigeria', 'bbnaija', 'nollywood', 'music'],
        0
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'Esports & Gaming Arena',
        'Predict esports tournament winners, game releases, streaming trends, and gaming industry developments worldwide!',
        (SELECT id FROM public.users LIMIT 1),
        'public',
        ARRAY['esports', 'gaming', 'tournaments', 'streaming', 'competitive'],
        0
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'Global Politics & Elections',
        'Predict election outcomes, policy changes, international relations, and political developments around the world!',
        (SELECT id FROM public.users LIMIT 1),
        'public',
        ARRAY['politics', 'elections', 'government', 'international', 'policy'],
        0
    )
ON CONFLICT (id) DO NOTHING;

-- Create contextually meaningful predictions
INSERT INTO public.predictions (id, creator_id, title, description, category, type, status, stake_min, stake_max, entry_deadline, settlement_method, club_id, tags, pool_total)
VALUES 
    (
        'pred1111-1111-1111-1111-111111111111',
        (SELECT id FROM public.users LIMIT 1),
        'Will Manchester City win the 2024-25 Premier League?',
        'Manchester City has been dominant in recent years. Can they secure another Premier League title this season?',
        'sports',
        'binary',
        'open',
        100.00,
        10000.00,
        (NOW() + INTERVAL '7 days'),
        'manual',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ARRAY['football', 'premier-league', 'manchester-city', 'england'],
        0
    ),
    (
        'pred2222-2222-2222-2222-222222222222',
        (SELECT id FROM public.users LIMIT 1),
        'Bitcoin Price at End of 2025',
        'Will Bitcoin reach $100,000 or higher by December 31, 2025?',
        'finance',
        'binary',
        'open',
        50.00,
        5000.00,
        '2025-12-31T23:59:59Z',
        'auto',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        ARRAY['bitcoin', 'crypto', 'price', '2025'],
        0
    ),
    (
        'pred3333-3333-3333-3333-333333333333',
        (SELECT id FROM public.users LIMIT 1),
        'Big Brother Naija Season 10 Winner',
        'Who will be crowned the winner of Big Brother Naija Season 10?',
        'entertainment',
        'multi_outcome',
        'open',
        25.00,
        2000.00,
        (NOW() + INTERVAL '30 days'),
        'manual',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        ARRAY['bbnaija', 'reality-tv', 'nigeria', 'season-10'],
        0
    ),
    (
        'pred4444-4444-4444-4444-444444444444',
        (SELECT id FROM public.users LIMIT 1),
        'League of Legends Worlds 2025 Champion',
        'Which region will win the League of Legends World Championship 2025?',
        'esports',
        'multi_outcome',
        'open',
        20.00,
        1000.00,
        (NOW() + INTERVAL '90 days'),
        'auto',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        ARRAY['league-of-legends', 'worlds', 'esports', '2025'],
        0
    ),
    (
        'pred5555-5555-5555-5555-555555555555',
        (SELECT id FROM public.users LIMIT 1),
        '2028 US Presidential Election Winner',
        'Will the Democratic Party candidate win the 2028 US Presidential Election?',
        'politics',
        'binary',
        'open',
        10.00,
        50000.00,
        '2028-11-01T00:00:00Z',
        'manual',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        ARRAY['usa', 'election', 'president', '2028'],
        0
    )
ON CONFLICT (id) DO NOTHING;

-- Create prediction options with realistic odds
INSERT INTO public.prediction_options (prediction_id, label, total_staked, current_odds)
VALUES 
    -- Premier League prediction
    ('pred1111-1111-1111-1111-111111111111', 'Yes', 1500.00, 1.8),
    ('pred1111-1111-1111-1111-111111111111', 'No', 2300.00, 1.2),
    
    -- Bitcoin prediction
    ('pred2222-2222-2222-2222-222222222222', 'Yes', 3200.00, 2.1),
    ('pred2222-2222-2222-2222-222222222222', 'No', 1800.00, 2.8),
    
    -- BBNaija prediction
    ('pred3333-3333-3333-3333-333333333333', 'Male Contestant', 800.00, 3.2),
    ('pred3333-3333-3333-3333-333333333333', 'Female Contestant', 1200.00, 2.1),
    ('pred3333-3333-3333-3333-333333333333', 'Wildcard Entry', 600.00, 4.3),
    
    -- LoL Worlds prediction
    ('pred4444-4444-4444-4444-444444444444', 'Korea (LCK)', 2500.00, 1.5),
    ('pred4444-4444-4444-4444-444444444444', 'China (LPL)', 1800.00, 2.1),
    ('pred4444-4444-4444-4444-444444444444', 'Europe (LEC)', 1200.00, 3.1),
    ('pred4444-4444-4444-4444-444444444444', 'North America (LCS)', 900.00, 4.2),
    
    -- US Election prediction
    ('pred5555-5555-5555-5555-555555555555', 'Yes', 5000.00, 1.9),
    ('pred5555-5555-5555-5555-555555555555', 'No', 4200.00, 2.2)
ON CONFLICT DO NOTHING;

-- Update prediction pool totals
UPDATE public.predictions 
SET pool_total = (
    SELECT COALESCE(SUM(total_staked), 0)
    FROM public.prediction_options 
    WHERE prediction_id = predictions.id
);

-- Create meaningful comments
INSERT INTO public.comments (prediction_id, user_id, content)
SELECT 
    p.id,
    u.id,
    CASE 
        WHEN p.id = 'pred1111-1111-1111-1111-111111111111' THEN 'Man City has the strongest squad depth in the league. Pep Guardiola knows how to win titles!'
        WHEN p.id = 'pred2222-2222-2222-2222-222222222222' THEN 'Bitcoin halving in 2024 + institutional adoption = $100k+ by 2025!'
        WHEN p.id = 'pred3333-3333-3333-3333-333333333333' THEN 'This season has some really interesting housemates. The drama is going to be intense!'
        ELSE 'Great prediction! Looking forward to seeing how this plays out.'
    END
FROM public.predictions p
CROSS JOIN public.users u
LIMIT 4;

-- Create reactions
INSERT INTO public.reactions (prediction_id, user_id, type)
SELECT 
    p.id,
    u.id,
    CASE 
        WHEN p.id = 'pred1111-1111-1111-1111-111111111111' THEN 'like'
        WHEN p.id = 'pred2222-2222-2222-2222-222222222222' THEN 'fire'
        WHEN p.id = 'pred3333-3333-3333-3333-333333333333' THEN 'thinking'
        ELSE 'cheer'
    END
FROM public.predictions p
CROSS JOIN public.users u
LIMIT 4;

-- Create wallet transactions
INSERT INTO public.wallet_transactions (user_id, type, currency, amount, status, description, reference)
SELECT 
    u.id,
    'deposit',
    'NGN',
    floor(random() * 50000 + 10000),
    'completed',
    'Initial deposit',
    'DEP_' || extract(epoch from now())::bigint || '_' || substring(u.id from 1 for 8)
FROM public.users u
LIMIT 5;

-- Show summary
SELECT 
    'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Wallets', COUNT(*) FROM public.wallets
UNION ALL
SELECT 'Clubs', COUNT(*) FROM public.clubs
UNION ALL
SELECT 'Predictions', COUNT(*) FROM public.predictions
UNION ALL
SELECT 'Prediction Options', COUNT(*) FROM public.prediction_options
UNION ALL
SELECT 'Comments', COUNT(*) FROM public.comments
UNION ALL
SELECT 'Reactions', COUNT(*) FROM public.reactions
UNION ALL
SELECT 'Transactions', COUNT(*) FROM public.wallet_transactions; 