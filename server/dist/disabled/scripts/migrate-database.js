#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = main;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
const seed_database_1 = require("./seed-database");
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
async function runSQLSchema() {
    try {
        log.info('Reading SQL schema file...');
        const sqlFilePath = path_1.default.join(__dirname, 'setup-database.sql');
        const sqlContent = fs_1.default.readFileSync(sqlFilePath, 'utf8');
        log.info('Executing SQL schema in Supabase...');
        const statements = sqlContent
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0 && !statement.startsWith('--'));
        log.info(`Executing ${statements.length} SQL statements...`);
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.toLowerCase().includes('select ') && statement.toLowerCase().includes('message')) {
                continue;
            }
            try {
                const { error } = await database_1.supabase.rpc('exec_sql', { sql: statement + ';' });
                if (error) {
                    if (error.message.includes('already exists') ||
                        error.message.includes('does not exist') ||
                        error.message.includes('cannot drop')) {
                        log.warning(`Skipping: ${error.message}`);
                        continue;
                    }
                    throw error;
                }
                if (i % 10 === 0) {
                    log.info(`Executed ${i + 1}/${statements.length} statements...`);
                }
            }
            catch (error) {
                const { error: directError } = await database_1.supabase
                    .from('information_schema.tables')
                    .select('*')
                    .limit(1);
                if (directError) {
                    log.warning(`Statement ${i + 1} failed, but continuing: ${error.message}`);
                }
            }
        }
        return {
            step: 'SQL Schema Creation',
            success: true,
            details: `Executed ${statements.length} SQL statements`,
        };
    }
    catch (error) {
        return {
            step: 'SQL Schema Creation',
            success: false,
            error: error.message,
        };
    }
}
async function verifyTables() {
    try {
        log.info('Verifying database tables...');
        const expectedTables = [
            'users',
            'predictions',
            'prediction_options',
            'prediction_entries',
            'wallets',
            'wallet_transactions',
            'clubs',
            'club_members',
            'comments',
            'reactions',
        ];
        const verificationResults = [];
        for (const table of expectedTables) {
            try {
                const { data, error } = await database_1.supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                if (error) {
                    verificationResults.push({ table, exists: false, error: error.message });
                }
                else {
                    verificationResults.push({ table, exists: true, rowCount: data?.length || 0 });
                }
            }
            catch (error) {
                verificationResults.push({ table, exists: false, error: error.message });
            }
        }
        const successfulTables = verificationResults.filter(result => result.exists);
        const failedTables = verificationResults.filter(result => !result.exists);
        if (failedTables.length > 0) {
            log.warning(`${failedTables.length} tables failed verification:`);
            failedTables.forEach(result => {
                log.error(`  ${result.table}: ${result.error}`);
            });
        }
        log.success(`${successfulTables.length}/${expectedTables.length} tables verified`);
        return {
            step: 'Table Verification',
            success: successfulTables.length >= expectedTables.length * 0.8,
            details: {
                successful: successfulTables.length,
                failed: failedTables.length,
                total: expectedTables.length,
            },
        };
    }
    catch (error) {
        return {
            step: 'Table Verification',
            success: false,
            error: error.message,
        };
    }
}
async function runSeeding() {
    try {
        log.info('Running database seeding...');
        await (0, seed_database_1.seedDatabase)();
        return {
            step: 'Database Seeding',
            success: true,
            details: 'Sample data inserted successfully',
        };
    }
    catch (error) {
        return {
            step: 'Database Seeding',
            success: false,
            error: error.message,
        };
    }
}
async function verifyData() {
    try {
        log.info('Verifying seeded data...');
        const checks = [
            { table: 'users', expected: 5 },
            { table: 'clubs', expected: 5 },
            { table: 'predictions', expected: 5 },
            { table: 'wallets', expected: 10 },
        ];
        const results = [];
        for (const check of checks) {
            const { data, error } = await database_1.supabase
                .from(check.table)
                .select('id')
                .limit(100);
            if (error) {
                results.push({ ...check, actual: 0, success: false, error: error.message });
            }
            else {
                const actual = data?.length || 0;
                results.push({
                    ...check,
                    actual,
                    success: actual >= check.expected,
                });
            }
        }
        const successfulChecks = results.filter(result => result.success);
        return {
            step: 'Data Verification',
            success: successfulChecks.length >= checks.length * 0.8,
            details: results,
        };
    }
    catch (error) {
        return {
            step: 'Data Verification',
            success: false,
            error: error.message,
        };
    }
}
function printResults(results) {
    log.header('Migration Results');
    let successCount = 0;
    const totalCount = results.length;
    for (const result of results) {
        if (result.success) {
            log.success(`${result.step}: ${result.details || 'Completed'}`);
            successCount++;
        }
        else {
            log.error(`${result.step}: ${result.error || 'Failed'}`);
        }
    }
    console.log(`\n${colors.bright}Summary: ${successCount}/${totalCount} steps completed successfully${colors.reset}`);
    if (successCount === totalCount) {
        log.success('🎉 Database migration completed successfully!');
        log.info('Your Fan Club Z database is ready to use.');
        log.info('You can now start the application with: npm run dev');
    }
    else {
        log.warning(`⚠️  Migration partially completed. ${totalCount - successCount} steps failed.`);
        log.info('The application might still work, but some features may be limited.');
    }
}
async function main() {
    console.log(`${colors.bright}${colors.magenta}Fan Club Z - Database Migration${colors.reset}`);
    console.log('Setting up database schema and sample data...\n');
    const results = [];
    log.header('Step 1: Creating Database Schema');
    const schemaResult = await runSQLSchema();
    results.push(schemaResult);
    log.header('Step 2: Verifying Tables');
    const tableVerification = await verifyTables();
    results.push(tableVerification);
    if (tableVerification.success) {
        log.header('Step 3: Seeding Database');
        const seedingResult = await runSeeding();
        results.push(seedingResult);
        if (seedingResult.success) {
            log.header('Step 4: Verifying Seeded Data');
            const dataVerification = await verifyData();
            results.push(dataVerification);
        }
    }
    else {
        log.warning('Skipping seeding due to table creation issues');
    }
    printResults(results);
    const hasFailures = results.some(result => !result.success);
    process.exit(hasFailures ? 1 : 0);
}
process.on('SIGINT', () => {
    log.warning('\nMigration interrupted by user');
    process.exit(130);
});
process.on('unhandledRejection', (reason, promise) => {
    log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});
if (require.main === module) {
    main().catch((error) => {
        log.error(`Migration failed with error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate-database.js.map