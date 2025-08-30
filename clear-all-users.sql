-- Clear All Users from Database
-- This script removes all user-related data to allow fresh registration

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all user-related data in dependency order
DELETE FROM prediction_entries;
DELETE FROM comments;
DELETE FROM reactions;
DELETE FROM club_members;
DELETE FROM clubs;
DELETE FROM wallet_transactions;
DELETE FROM wallets;
DELETE FROM prediction_options;
DELETE FROM predictions;
DELETE FROM users;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

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
