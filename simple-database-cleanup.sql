-- Simple Database Cleanup Script
-- This script removes all user-related data from core tables
-- WARNING: This will delete ALL user data

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear core tables in dependency order

-- 1. Clear user bets/entries
DELETE FROM prediction_entries;

-- 2. Clear comments and reactions
DELETE FROM comments;
DELETE FROM reactions;

-- 3. Clear club memberships
DELETE FROM club_members;

-- 4. Clear clubs
DELETE FROM clubs;

-- 5. Clear wallet transactions
DELETE FROM wallet_transactions;

-- 6. Clear wallets
DELETE FROM wallets;

-- 7. Clear prediction options
DELETE FROM prediction_options;

-- 8. Clear predictions
DELETE FROM predictions;

-- 9. Finally, clear users
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
