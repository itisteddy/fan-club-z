#!/usr/bin/env ts-node
"use strict";
/**
 * Simple Database Setup Script
 *
 * This script creates the essential tables needed for Fan Club Z
 * using the Supabase client directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBasicTables = setupBasicTables;
const database_1 = require("../config/database");
// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};
// Sample data to insert
const sampleUsers = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@fanclubz.com',
        username: 'admin',
        full_name: 'Admin User',
        kyc_level: 'enhanced',
        is_verified: true,
        reputation_score: 100.0,
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'john@example.com',
        username: 'john_doe',
        full_name: 'John Doe',
        kyc_level: 'basic',
        is_verified: true,
        reputation_score: 85.5,
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'jane@example.com',
        username: 'jane_smith',
        full_name: 'Jane Smith',
        kyc_level: 'basic',
        is_verified: true,
        reputation_score: 92.3,
    },
];
const sampleClubs = [
    {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Premier League Fans',
        description: 'Discussion and predictions about Premier League football',
        owner_id: '22222222-2222-2222-2222-222222222222',
        visibility: 'public',
        member_count: 2,
    },
    {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Crypto Enthusiasts',
        description: 'Predictions about cryptocurrency prices and trends',
        owner_id: '33333333-3333-3333-3333-333333333333',
        visibility: 'public',
        member_count: 2,
    },
];
const samplePredictions = [
    {
        id: 'pred1111-1111-1111-1111-111111111111',
        creator_id: '22222222-2222-2222-2222-222222222222',
        title: 'Will Manchester City win the Premier League this season?',
        description: 'Prediction about Manchester City winning the 2024-25 Premier League title',
        category: 'sports',
        type: 'binary',
        status: 'open',
        stake_min: 100.00,
        stake_max: 10000.00,
        entry_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        pool_total: 3800.00,
    },
    {
        id: 'pred2222-2222-2222-2222-222222222222',
        creator_id: '33333333-3333-3333-3333-333333333333',
        title: 'Bitcoin price at end of 2025',
        description: 'Will Bitcoin be above $100,000 at the end of 2025?',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 50.00,
        stake_max: 5000.00,
        entry_deadline: '2025-12-31T23:59:59Z',
        settlement_method: 'auto',
        club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        pool_total: 5000.00,
    },
];
async function setupBasicTables() {
    console.log(`${colors.bright}${colors.magenta}Fan Club Z - Database Setup${colors.reset}`);
    console.log('Creating essential tables and sample data...\n');
    try {
        // Check if tables already exist by trying to query them
        log.header('Checking Existing Tables');
        const { data: existingUsers, error: usersError } = await database_1.supabase
            .from('users')
            .select('id')
            .limit(1);
        if (!usersError && existingUsers) {
            log.success('Tables already exist and are accessible');
            // Check if we have sample data
            if (existingUsers.length > 0) {
                log.info('Sample data already exists');
                log.success('Database is ready to use!');
                return;
            }
        }
        // Insert sample data
        log.header('Inserting Sample Data');
        // 1. Insert users
        log.info('Inserting sample users...');
        const { error: insertUsersError } = await database_1.supabase
            .from('users')
            .upsert(sampleUsers, { onConflict: 'id' });
        if (insertUsersError) {
            if (insertUsersError.message.includes('does not exist')) {
                log.error('Users table does not exist. Please run the SQL schema first.');
                log.info('Go to your Supabase dashboard → SQL Editor and run the setup-database.sql script');
                return;
            }
            throw insertUsersError;
        }
        log.success(`Inserted ${sampleUsers.length} users`);
        // 2. Create wallets for users
        log.info('Creating wallets...');
        const wallets = sampleUsers.map(user => ({
            user_id: user.id,
            currency: 'NGN',
            available_balance: Math.floor(Math.random() * 50000) + 1000,
            total_deposited: Math.floor(Math.random() * 100000) + 5000,
        }));
        const { error: walletsError } = await database_1.supabase
            .from('wallets')
            .upsert(wallets, { onConflict: 'user_id,currency' });
        if (walletsError) {
            log.warning(`Wallets error: ${walletsError.message}`);
        }
        else {
            log.success(`Created ${wallets.length} wallets`);
        }
        // 3. Insert clubs
        log.info('Inserting sample clubs...');
        const { error: clubsError } = await database_1.supabase
            .from('clubs')
            .upsert(sampleClubs, { onConflict: 'id' });
        if (clubsError) {
            log.warning(`Clubs error: ${clubsError.message}`);
        }
        else {
            log.success(`Inserted ${sampleClubs.length} clubs`);
        }
        // 4. Insert club memberships
        log.info('Creating club memberships...');
        const clubMemberships = [
            {
                club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                user_id: '22222222-2222-2222-2222-222222222222',
                role: 'admin',
            },
            {
                club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                user_id: '33333333-3333-3333-3333-333333333333',
                role: 'member',
            },
            {
                club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                user_id: '33333333-3333-3333-3333-333333333333',
                role: 'admin',
            },
            {
                club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                user_id: '22222222-2222-2222-2222-222222222222',
                role: 'member',
            },
        ];
        const { error: membershipsError } = await database_1.supabase
            .from('club_members')
            .upsert(clubMemberships, { onConflict: 'club_id,user_id' });
        if (membershipsError) {
            log.warning(`Club memberships error: ${membershipsError.message}`);
        }
        else {
            log.success(`Created ${clubMemberships.length} club memberships`);
        }
        // 5. Insert predictions
        log.info('Inserting sample predictions...');
        const { error: predictionsError } = await database_1.supabase
            .from('predictions')
            .upsert(samplePredictions, { onConflict: 'id' });
        if (predictionsError) {
            log.warning(`Predictions error: ${predictionsError.message}`);
        }
        else {
            log.success(`Inserted ${samplePredictions.length} predictions`);
        }
        // 6. Insert prediction options
        log.info('Creating prediction options...');
        const predictionOptions = [
            {
                prediction_id: 'pred1111-1111-1111-1111-111111111111',
                label: 'Yes',
                total_staked: 1500.00,
                current_odds: 1.8,
            },
            {
                prediction_id: 'pred1111-1111-1111-1111-111111111111',
                label: 'No',
                total_staked: 2300.00,
                current_odds: 1.2,
            },
            {
                prediction_id: 'pred2222-2222-2222-2222-222222222222',
                label: 'Yes',
                total_staked: 3200.00,
                current_odds: 2.1,
            },
            {
                prediction_id: 'pred2222-2222-2222-2222-222222222222',
                label: 'No',
                total_staked: 1800.00,
                current_odds: 2.8,
            },
        ];
        const { error: optionsError } = await database_1.supabase
            .from('prediction_options')
            .upsert(predictionOptions, { onConflict: 'prediction_id,label' });
        if (optionsError) {
            log.warning(`Prediction options error: ${optionsError.message}`);
        }
        else {
            log.success(`Created ${predictionOptions.length} prediction options`);
        }
        // 7. Insert some comments and reactions
        log.info('Creating sample comments...');
        const comments = [
            {
                prediction_id: 'pred1111-1111-1111-1111-111111111111',
                user_id: '33333333-3333-3333-3333-333333333333',
                content: 'Man City has a strong squad this season!',
            },
            {
                prediction_id: 'pred2222-2222-2222-2222-222222222222',
                user_id: '22222222-2222-2222-2222-222222222222',
                content: 'Bitcoin has been volatile but the trend seems bullish.',
            },
        ];
        const { error: commentsError } = await database_1.supabase
            .from('comments')
            .insert(comments);
        if (commentsError) {
            log.warning(`Comments error: ${commentsError.message}`);
        }
        else {
            log.success(`Created ${comments.length} comments`);
        }
        log.header('Setup Complete!');
        log.success('🎉 Database setup completed successfully!');
        log.info('Your Fan Club Z database now has:');
        log.info(`  • ${sampleUsers.length} sample users`);
        log.info(`  • ${sampleClubs.length} sample clubs`);
        log.info(`  • ${samplePredictions.length} sample predictions`);
        log.info(`  • ${predictionOptions.length} prediction options`);
        log.info(`  • Sample wallets, memberships, and comments`);
        log.info('\nYou can now start the application with: npm run dev');
    }
    catch (error) {
        log.error(`Setup failed: ${error.message}`);
        if (error.message.includes('does not exist')) {
            log.info('\n📋 To fix this:');
            log.info('1. Go to your Supabase dashboard');
            log.info('2. Open the SQL Editor');
            log.info('3. Copy and paste the contents of server/src/scripts/setup-database.sql');
            log.info('4. Run the SQL script');
            log.info('5. Then run this script again: npm run db:setup');
        }
        process.exit(1);
    }
}
// Run setup if called directly
if (require.main === module) {
    setupBasicTables()
        .then(() => {
        process.exit(0);
    })
        .catch((error) => {
        log.error(`Setup failed: ${error.message}`);
        process.exit(1);
    });
}
