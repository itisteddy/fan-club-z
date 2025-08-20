#!/usr/bin/env node
/**
 * Database Seeding Script for Fan Club Z v2.0.47
 * Seeds the database with sample predictions, users, and options
 */
declare const sampleUsers: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar_url: null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}[];
declare const samplePredictions: {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    category: string;
    type: string;
    status: string;
    stake_min: number;
    stake_max: number;
    pool_total: number;
    entry_deadline: string;
    settlement_method: string;
    is_private: boolean;
    creator_fee_percentage: number;
    platform_fee_percentage: number;
    tags: string[];
    participant_count: number;
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
}[];
declare const samplePredictionOptions: {
    id: string;
    prediction_id: string;
    label: string;
    total_staked: number;
    current_odds: number;
    is_winning_outcome: null;
    created_at: string;
    updated_at: string;
}[];
declare function seedDatabase(): Promise<{
    success: boolean;
    usersSeeded: number;
    predictionsSeeded: number;
    optionsSeeded: number;
}>;
export { seedDatabase, sampleUsers, samplePredictions, samplePredictionOptions };
