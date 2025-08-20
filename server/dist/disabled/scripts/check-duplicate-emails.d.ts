#!/usr/bin/env ts-node
/**
 * Check Duplicate Email Registrations
 *
 * This script queries the database to check for duplicate email registrations
 * and provides detailed information about user registrations.
 */
declare function main(): Promise<void>;
export { main as checkDuplicateEmails };
