-- Production Database Seeding Script - FIXED VERSION
-- Run this in your Supabase SQL Editor at: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql

-- Step 1: Get the first user from auth.users
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in auth.users. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Using user ID: %', first_user_id;
    
    -- Step 2: Create user profile
    INSERT INTO users (id, email, username, full_name, kyc_level, is_verified, reputation_score)
    VALUES (
        first_user_id,
        (SELECT email FROM auth.users WHERE id = first_user_id),
        'genthisgenthat',
        'Gent This Gent That',
        'basic',
        true,
        85
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        kyc_level = EXCLUDED.kyc_level,
        is_verified = EXCLUDED.is_verified,
        reputation_score = EXCLUDED.reputation_score;
    
    -- Step 3: Create wallets
    INSERT INTO wallets (user_id, currency, available_balance, total_deposited)
    VALUES 
        (first_user_id, 'NGN', 25000, 50000),
        (first_user_id, 'USD', 500, 1000)
    ON CONFLICT (user_id, currency) DO UPDATE SET
        available_balance = EXCLUDED.available_balance,
        total_deposited = EXCLUDED.total_deposited;
    
    -- Step 4: Create clubs
    INSERT INTO clubs (id, name, description, owner_id, visibility, tags, member_count)
    VALUES 
        ('11111111-1111-1111-1111-111111111111', 'Premier League Predictions', 'The ultimate destination for Premier League football predictions. From title races to relegation battles, predict it all!', first_user_id, 'public', ARRAY['sports', 'football', 'premier-league', 'england'], 0),
        ('22222222-2222-2222-2222-222222222222', 'Crypto & Web3 Predictions', 'Predict cryptocurrency prices, DeFi trends, NFT markets, and blockchain developments. Stay ahead of the crypto curve!', first_user_id, 'public', ARRAY['crypto', 'finance', 'blockchain', 'web3', 'defi'], 0),
        ('33333333-3333-3333-3333-333333333333', 'Nigerian Entertainment Hub', 'Predict Big Brother Naija winners, Nollywood box office hits, music chart toppers, and celebrity events in Nigeria!', first_user_id, 'public', ARRAY['entertainment', 'nigeria', 'bbnaija', 'nollywood', 'music'], 0),
        ('44444444-4444-4444-4444-444444444444', 'Esports & Gaming Arena', 'Predict esports tournament winners, game releases, streaming trends, and gaming industry developments worldwide!', first_user_id, 'public', ARRAY['esports', 'gaming', 'tournaments', 'streaming', 'competitive'], 0),
        ('55555555-5555-5555-5555-555555555555', 'Global Politics & Elections', 'Predict election outcomes, policy changes, international relations, and political developments around the world!', first_user_id, 'public', ARRAY['politics', 'elections', 'government', 'international', 'policy'], 0)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        owner_id = EXCLUDED.owner_id,
        visibility = EXCLUDED.visibility,
        tags = EXCLUDED.tags,
        member_count = EXCLUDED.member_count;
    
    -- Step 5: Create predictions
    INSERT INTO predictions (id, creator_id, title, description, category, type, status, stake_min, stake_max, entry_deadline, settlement_method, club_id, tags, pool_total)
    VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', first_user_id, 'Will Manchester City win the 2024-25 Premier League?', 'Manchester City has been dominant in recent years. Can they secure another Premier League title this season?', 'sports', 'binary', 'open', 100.00, 10000.00, (NOW() + INTERVAL '7 days'), 'manual', '11111111-1111-1111-1111-111111111111', ARRAY['football', 'premier-league', 'manchester-city', 'england'], 0),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', first_user_id, 'Bitcoin Price at End of 2025', 'Will Bitcoin reach $100,000 or higher by December 31, 2025?', 'finance', 'binary', 'open', 50.00, 5000.00, '2025-12-31 23:59:59', 'auto', '22222222-2222-2222-2222-222222222222', ARRAY['bitcoin', 'crypto', 'price', '2025'], 0),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', first_user_id, 'Big Brother Naija Season 10 Winner', 'Who will be crowned the winner of Big Brother Naija Season 10?', 'entertainment', 'multi_outcome', 'open', 25.00, 2000.00, (NOW() + INTERVAL '30 days'), 'manual', '33333333-3333-3333-3333-333333333333', ARRAY['bbnaija', 'reality-tv', 'nigeria', 'season-10'], 0),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', first_user_id, 'League of Legends Worlds 2025 Champion', 'Which region will win the League of Legends World Championship 2025?', 'esports', 'multi_outcome', 'open', 20.00, 1000.00, (NOW() + INTERVAL '90 days'), 'auto', '44444444-4444-4444-4444-444444444444', ARRAY['league-of-legends', 'worlds', 'esports', '2025'], 0),
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', first_user_id, '2028 US Presidential Election Winner', 'Will the Democratic Party candidate win the 2028 US Presidential Election?', 'politics', 'binary', 'open', 10.00, 50000.00, '2028-11-01 00:00:00', 'manual', '55555555-5555-5555-5555-555555555555', ARRAY['usa', 'election', 'president', '2028'], 0)
    ON CONFLICT (id) DO UPDATE SET
        creator_id = EXCLUDED.creator_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        stake_min = EXCLUDED.stake_min,
        stake_max = EXCLUDED.stake_max,
        entry_deadline = EXCLUDED.entry_deadline,
        settlement_method = EXCLUDED.settlement_method,
        club_id = EXCLUDED.club_id,
        tags = EXCLUDED.tags,
        pool_total = EXCLUDED.pool_total;
    
    -- Step 6: Create prediction options
    INSERT INTO prediction_options (prediction_id, label, total_staked, current_odds)
    VALUES 
        -- Premier League
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yes', 1500.00, 1.8),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'No', 2300.00, 1.2),
        -- Bitcoin
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Yes', 3200.00, 2.1),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'No', 1800.00, 2.8),
        -- BBNaija
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Male Contestant', 800.00, 3.2),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Female Contestant', 1200.00, 2.1),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Wildcard Entry', 600.00, 4.3),
        -- LoL Worlds
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Korea (LCK)', 2500.00, 1.5),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'China (LPL)', 1800.00, 2.1),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Europe (LEC)', 1200.00, 3.1),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'North America (LCS)', 900.00, 4.2),
        -- US Election
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Yes', 5000.00, 1.9),
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'No', 4200.00, 2.2)
    ON CONFLICT (prediction_id, label) DO UPDATE SET
        total_staked = EXCLUDED.total_staked,
        current_odds = EXCLUDED.current_odds;
    
    -- Step 7: Update pool totals
    UPDATE predictions 
    SET pool_total = (
        SELECT COALESCE(SUM(total_staked), 0)
        FROM prediction_options 
        WHERE prediction_id = predictions.id
    );
    
    -- Step 8: Create comments
    INSERT INTO comments (prediction_id, user_id, content)
    VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', first_user_id, 'Man City has the strongest squad depth in the league. Pep Guardiola knows how to win titles!'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', first_user_id, 'Bitcoin halving in 2024 + institutional adoption = $100k+ by 2025!'),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', first_user_id, 'This season has some really interesting housemates. The drama is going to be intense!')
    ON CONFLICT DO NOTHING;
    
    -- Step 9: Create reactions
    INSERT INTO reactions (prediction_id, user_id, type)
    VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', first_user_id, 'like'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', first_user_id, 'fire'),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', first_user_id, 'thinking')
    ON CONFLICT DO NOTHING;
    
    -- Step 10: Create transactions
    INSERT INTO wallet_transactions (user_id, type, currency, amount, status, description, reference)
    VALUES 
        (first_user_id, 'deposit', 'NGN', 25000, 'completed', 'Initial deposit', 'DEP_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || SUBSTRING(first_user_id::text, 1, 8))
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Database seeding completed successfully!';
    RAISE NOTICE 'Created: 1 user profile, 2 wallets, 5 clubs, 5 predictions, 13 options, 3 comments, 3 reactions, 1 transaction';
    
END $$; 