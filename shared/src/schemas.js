"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLUB_VISIBILITY = exports.CLUB_ROLES = exports.REACTION_TYPES = exports.TRANSACTION_TYPES = exports.WALLET_CURRENCIES = exports.PREDICTION_STATUSES = exports.PREDICTION_TYPES = exports.PREDICTION_CATEGORIES = exports.PredictionQuerySchema = exports.PaginationQuerySchema = exports.PaginatedResponseSchema = exports.ApiResponseSchema = exports.NotificationSchema = exports.ClubMemberSchema = exports.CreateClubSchema = exports.ClubSchema = exports.CreateReactionSchema = exports.ReactionSchema = exports.CreateCommentSchema = exports.CommentSchema = exports.WithdrawSchema = exports.DepositSchema = exports.WalletTransactionSchema = exports.WalletSchema = exports.CreatePredictionEntrySchema = exports.PredictionEntrySchema = exports.UpdatePredictionSchema = exports.CreatePredictionSchema = exports.PredictionSchema = exports.PredictionOptionSchema = exports.UpdateUserSchema = exports.LoginUserSchema = exports.RegisterUserSchema = exports.UserSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// USER SCHEMAS
// ============================================================================
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    username: zod_1.z.string().min(3).max(30).optional(),
    full_name: zod_1.z.string().optional(),
    avatar_url: zod_1.z.string().url().optional(),
    wallet_address: zod_1.z.string().optional(),
    kyc_level: zod_1.z.enum(['none', 'basic', 'enhanced']).default('none'),
    kyc_status: zod_1.z.enum(['pending', 'submitted', 'under_review', 'approved', 'rejected']).default('pending'),
    auth_provider: zod_1.z.enum(['email', 'google', 'apple']).optional(),
    two_fa_enabled: zod_1.z.boolean().default(false),
    reputation_score: zod_1.z.number().default(0),
    is_verified: zod_1.z.boolean().default(false),
    is_active: zod_1.z.boolean().default(true),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.RegisterUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    phone: zod_1.z.string().optional(),
    username: zod_1.z.string().min(3).max(30).optional(),
    full_name: zod_1.z.string().optional(),
    auth_provider: zod_1.z.enum(['email', 'google', 'apple']).default('email'),
});
exports.LoginUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.UpdateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).optional(),
    full_name: zod_1.z.string().optional(),
    avatar_url: zod_1.z.string().url().optional(),
    phone: zod_1.z.string().optional(),
});
// ============================================================================
// PREDICTION SCHEMAS
// ============================================================================
exports.PredictionOptionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    prediction_id: zod_1.z.string().uuid(),
    label: zod_1.z.string().min(1).max(255),
    total_staked: zod_1.z.number().default(0),
    current_odds: zod_1.z.number().default(1),
    is_winning_outcome: zod_1.z.boolean().optional(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.PredictionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    creator_id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    category: zod_1.z.enum(['sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics']),
    type: zod_1.z.enum(['binary', 'multi_outcome', 'pool']),
    status: zod_1.z.enum(['pending', 'open', 'closed', 'settled', 'disputed', 'cancelled']).default('pending'),
    stake_min: zod_1.z.number().positive(),
    stake_max: zod_1.z.number().positive().optional(),
    pool_total: zod_1.z.number().default(0),
    entry_deadline: zod_1.z.string().datetime(),
    settlement_method: zod_1.z.enum(['auto', 'manual']),
    settlement_proof_url: zod_1.z.string().url().optional(),
    settled_outcome_id: zod_1.z.string().uuid().optional(),
    is_private: zod_1.z.boolean().default(false),
    password_hash: zod_1.z.string().optional(),
    creator_fee_percentage: zod_1.z.number().min(0).max(100).default(0),
    platform_fee_percentage: zod_1.z.number().min(0).max(100).default(2.5),
    club_id: zod_1.z.string().uuid().optional(),
    sponsor_id: zod_1.z.string().uuid().optional(),
    image_url: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.CreatePredictionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    category: zod_1.z.enum(['sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics']),
    type: zod_1.z.enum(['binary', 'multi_outcome', 'pool']),
    options: zod_1.z.array(zod_1.z.object({
        label: zod_1.z.string().min(1).max(255),
    })).min(2),
    stake_min: zod_1.z.number().positive(),
    stake_max: zod_1.z.number().positive().optional(),
    entry_deadline: zod_1.z.string().datetime(),
    settlement_method: zod_1.z.enum(['auto', 'manual']),
    is_private: zod_1.z.boolean().default(false),
    password: zod_1.z.string().optional(),
    creator_fee_percentage: zod_1.z.number().min(0).max(5).default(0),
    club_id: zod_1.z.string().uuid().optional(),
    image_url: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.UpdatePredictionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    entry_deadline: zod_1.z.string().datetime().optional(),
    settlement_proof_url: zod_1.z.string().url().optional(),
    image_url: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
// ============================================================================
// PREDICTION ENTRY SCHEMAS
// ============================================================================
exports.PredictionEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    prediction_id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    option_id: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    potential_payout: zod_1.z.number().optional(),
    actual_payout: zod_1.z.number().optional(),
    status: zod_1.z.enum(['active', 'won', 'lost', 'refunded']).default('active'),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.CreatePredictionEntrySchema = zod_1.z.object({
    prediction_id: zod_1.z.string().uuid(),
    option_id: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
});
// ============================================================================
// WALLET SCHEMAS
// ============================================================================
exports.WalletSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    currency: zod_1.z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
    available_balance: zod_1.z.number().default(0),
    reserved_balance: zod_1.z.number().default(0),
    total_deposited: zod_1.z.number().default(0),
    total_withdrawn: zod_1.z.number().default(0),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.WalletTransactionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['deposit', 'withdraw', 'prediction_lock', 'prediction_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout']),
    currency: zod_1.z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
    amount: zod_1.z.number(),
    status: zod_1.z.enum(['pending', 'completed', 'failed', 'reversed']).default('pending'),
    reference: zod_1.z.string().optional(),
    related_prediction_entry_id: zod_1.z.string().uuid().optional(),
    related_payout_id: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().optional(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.DepositSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
    payment_method: zod_1.z.enum(['card', 'bank_transfer', 'crypto']).default('card'),
});
exports.WithdrawSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
    destination: zod_1.z.string(),
    withdrawal_method: zod_1.z.enum(['bank_transfer', 'crypto']).default('bank_transfer'),
});
// ============================================================================
// SOCIAL SCHEMAS
// ============================================================================
exports.CommentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    prediction_id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1).max(1000),
    parent_comment_id: zod_1.z.string().uuid().optional(),
    is_edited: zod_1.z.boolean().default(false),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.CreateCommentSchema = zod_1.z.object({
    prediction_id: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1).max(1000),
    parent_comment_id: zod_1.z.string().uuid().optional(),
});
exports.ReactionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    prediction_id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['like', 'cheer', 'fire', 'thinking']),
    created_at: zod_1.z.string().datetime(),
});
exports.CreateReactionSchema = zod_1.z.object({
    prediction_id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['like', 'cheer', 'fire', 'thinking']),
});
// ============================================================================
// CLUB SCHEMAS
// ============================================================================
exports.ClubSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().optional(),
    owner_id: zod_1.z.string().uuid(),
    visibility: zod_1.z.enum(['public', 'private', 'invite_only']).default('public'),
    member_count: zod_1.z.number().default(0),
    avatar_url: zod_1.z.string().url().optional(),
    cover_url: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    rules: zod_1.z.array(zod_1.z.string()).default([]),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.CreateClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().optional(),
    visibility: zod_1.z.enum(['public', 'private', 'invite_only']).default('public'),
    avatar_url: zod_1.z.string().url().optional(),
    cover_url: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    rules: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.ClubMemberSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    club_id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['member', 'moderator', 'admin']).default('member'),
    joined_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================
exports.NotificationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['prediction_settled', 'prediction_ending', 'comment_reply', 'club_invite', 'payment_received', 'system_announcement']),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
    is_read: zod_1.z.boolean().default(false),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================
exports.ApiResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
    data: zod_1.z.any().optional(),
    error: zod_1.z.string().optional(),
    errors: zod_1.z.record(zod_1.z.array(zod_1.z.string())).optional(),
});
exports.PaginatedResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(zod_1.z.any()),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
        hasNext: zod_1.z.boolean(),
        hasPrev: zod_1.z.boolean(),
    }),
});
// ============================================================================
// QUERY SCHEMAS
// ============================================================================
exports.PaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.number().min(1).default(1),
    limit: zod_1.z.number().min(1).max(100).default(20),
});
exports.PredictionQuerySchema = exports.PaginationQuerySchema.extend({
    category: zod_1.z.enum(['sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics']).optional(),
    status: zod_1.z.enum(['pending', 'open', 'closed', 'settled', 'disputed', 'cancelled']).optional(),
    creator_id: zod_1.z.string().uuid().optional(),
    club_id: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
    sort: zod_1.z.enum(['created_at', 'pool_total', 'entry_deadline']).default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// ============================================================================
// CONSTANTS
// ============================================================================
exports.PREDICTION_CATEGORIES = [
    'sports',
    'pop_culture',
    'custom',
    'esports',
    'celebrity_gossip',
    'politics',
];
exports.PREDICTION_TYPES = ['binary', 'multi_outcome', 'pool'];
exports.PREDICTION_STATUSES = [
    'pending',
    'open',
    'closed',
    'settled',
    'disputed',
    'cancelled',
];
exports.WALLET_CURRENCIES = ['NGN', 'USD', 'USDT', 'ETH'];
exports.TRANSACTION_TYPES = [
    'deposit',
    'withdraw',
    'prediction_lock',
    'prediction_release',
    'transfer_in',
    'transfer_out',
    'fee',
    'creator_payout',
];
exports.REACTION_TYPES = ['like', 'cheer', 'fire', 'thinking'];
exports.CLUB_ROLES = ['member', 'moderator', 'admin'];
exports.CLUB_VISIBILITY = ['public', 'private', 'invite_only'];
