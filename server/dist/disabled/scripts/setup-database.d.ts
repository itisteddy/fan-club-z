#!/usr/bin/env ts-node
/**
 * Simple Database Setup Script
 *
 * This script creates the essential tables needed for Fan Club Z
 * using the Supabase client directly.
 */
declare function setupBasicTables(): Promise<void>;
export { setupBasicTables };
