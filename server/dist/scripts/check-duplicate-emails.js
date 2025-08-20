#!/usr/bin/env ts-node
"use strict";
/**
 * Check Duplicate Email Registrations
 *
 * This script queries the database to check for duplicate email registrations
 * and provides detailed information about user registrations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDuplicateEmails = main;
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
async function checkDuplicateEmails() {
    try {
        log.header('Checking for Duplicate Email Registrations');
        // Query for duplicate emails in auth.users
        log.info('Querying auth.users table for duplicate emails...');
        const { data: duplicateEmails, error: duplicateError } = await database_1.supabase
            .rpc('check_duplicate_emails');
        if (duplicateError) {
            // Fallback: direct query if RPC doesn't exist
            log.warning('RPC function not found, using direct query...');
            const { data, error } = await database_1.supabase
                .from('users')
                .select('email, created_at, id')
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to query auth.users: ${error.message}`);
            }
            // Group by email and find duplicates
            const emailGroups = data.reduce((acc, user) => {
                if (!acc[user.email]) {
                    acc[user.email] = [];
                }
                acc[user.email].push(user);
                return acc;
            }, {});
            const duplicates = Object.entries(emailGroups)
                .filter(([email, users]) => users.length > 1)
                .map(([email, users]) => ({ email, count: users.length, users }));
            if (duplicates.length > 0) {
                log.error(`Found ${duplicates.length} email addresses with duplicate registrations:`);
                duplicates.forEach(({ email, count, users }) => {
                    console.log(`\n${colors.red}Email: ${email} (${count} registrations)${colors.reset}`);
                    users.forEach((user, index) => {
                        console.log(`  ${index + 1}. ID: ${user.id}, Created: ${new Date(user.created_at).toLocaleString()}`);
                    });
                });
            }
            else {
                log.success('No duplicate email registrations found in auth.users');
            }
            // Show all users for reference
            log.header('All Registered Users');
            console.log(`Total users: ${data.length}`);
            data.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} (ID: ${user.id}, Created: ${new Date(user.created_at).toLocaleString()})`);
            });
        }
        else {
            // Use RPC result if available
            if (duplicateEmails && duplicateEmails.length > 0) {
                log.error(`Found ${duplicateEmails.length} email addresses with duplicate registrations:`);
                duplicateEmails.forEach((item) => {
                    console.log(`\n${colors.red}Email: ${item.email} (${item.count} registrations)${colors.reset}`);
                });
            }
            else {
                log.success('No duplicate email registrations found');
            }
        }
    }
    catch (error) {
        log.error(`Failed to check duplicate emails: ${error.message}`);
        console.error(error);
    }
}
async function checkUsersTable() {
    try {
        log.header('Checking users Table');
        // Also check the users table (if it exists separately from auth.users)
        const { data: users, error: usersError } = await database_1.supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        if (usersError) {
            log.warning(`Could not query users table: ${usersError.message}`);
            return;
        }
        if (users && users.length > 0) {
            log.info(`Found ${users.length} records in users table:`);
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email || 'No email'} (ID: ${user.id}, Created: ${new Date(user.created_at).toLocaleString()})`);
            });
        }
        else {
            log.info('No records found in users table');
        }
    }
    catch (error) {
        log.error(`Failed to check users table: ${error.message}`);
    }
}
async function main() {
    console.log(`${colors.bright}${colors.magenta}Fan Club Z - Duplicate Email Check${colors.reset}`);
    console.log('Checking for duplicate email registrations...\n');
    await checkDuplicateEmails();
    await checkUsersTable();
    log.header('Check Complete');
    log.info('Please review the results above to identify any duplicate registrations.');
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    log.warning('\nCheck interrupted by user');
    process.exit(130);
});
process.on('unhandledRejection', (reason, promise) => {
    log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});
if (require.main === module) {
    main().catch((error) => {
        log.error(`Check failed with error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}
