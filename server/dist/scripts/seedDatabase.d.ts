#!/usr/bin/env node
/**
 * Database Seeding Script for Fan Club Z v2.0.54
 * Seeds the database with sample predictions, users, and options
 */
declare function seedDatabase(): Promise<{
    users: number;
    predictions: number;
    options: number;
}>;
export { seedDatabase };
