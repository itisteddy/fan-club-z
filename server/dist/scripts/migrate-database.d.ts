#!/usr/bin/env ts-node
/**
 * Database Migration & Setup Script
 *
 * This script:
 * 1. Runs the SQL schema setup in Supabase
 * 2. Seeds the database with sample data
 * 3. Verifies the migration was successful
 */
declare function main(): Promise<void>;
export { main as runMigration };
