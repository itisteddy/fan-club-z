-- Clear Database Users Script
-- This script removes all user-related data to allow fresh registration
-- WARNING: This will delete ALL user data including predictions, wallets, etc.

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all user-related tables in the correct order
-- Start with dependent tables first

-- Clear prediction entries (user bets)
DELETE FROM prediction_entries;

-- Clear prediction comments
DELETE FROM comments;

-- Clear prediction reactions
DELETE FROM reactions;

-- Clear club memberships
DELETE FROM club_members;

-- Clear clubs (will cascade to club_members)
DELETE FROM clubs;

-- Clear wallet transactions
DELETE FROM wallet_transactions;

-- Clear wallets
DELETE FROM wallets;

-- Clear user reputations (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_reputations') THEN
        DELETE FROM user_reputations;
    END IF;
END $$;

-- Clear notifications (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
    END IF;
END $$;

-- Clear creator payouts (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'creator_payouts') THEN
        DELETE FROM creator_payouts;
    END IF;
END $$;

-- Clear prediction options (will cascade to prediction_entries)
DELETE FROM prediction_options;

-- Clear predictions
DELETE FROM predictions;

-- Finally, clear users
DELETE FROM users;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences if they exist
-- Note: PostgreSQL doesn't have sequences for UUID primary keys, but we'll reset any that might exist
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
    END LOOP;
END $$;

-- Verify cleanup
SELECT 
    'users' as table_name, COUNT(*) as remaining_records FROM users
UNION ALL
SELECT 'wallets', COUNT(*) FROM wallets
UNION ALL
SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL
SELECT 'clubs', COUNT(*) FROM clubs
UNION ALL
SELECT 'prediction_entries', COUNT(*) FROM prediction_entries;

-- Success message
SELECT 'Database cleanup completed successfully. All user data has been removed.' as status;
