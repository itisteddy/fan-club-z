import { z } from 'zod';

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().optional(),
  username: z.string().min(3).max(30).optional(),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  wallet_address: z.string().optional(),
  kyc_level: z.enum(['none', 'basic', 'enhanced']).default('none'),
  kyc_status: z.enum(['pending', 'submitted', 'under_review', 'approved', 'rejected']).default('pending'),
  auth_provider: z.enum(['email', 'google', 'apple']).optional(),
  two_fa_enabled: z.boolean().default(false),
  reputation_score: z.number().default(0),
  is_verified: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  username: z.string().min(3).max(30).optional(),
  full_name: z.string().optional(),
  auth_provider: z.enum(['email', 'google', 'apple']).default('email'),
});

export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().optional(),
});

// ============================================================================
// PREDICTION SCHEMAS
// ============================================================================

export const PredictionOptionSchema = z.object({
  id: z.string().uuid(),
  prediction_id: z.string().uuid(),
  label: z.string().min(1).max(255),
  total_staked: z.number().default(0),
  current_odds: z.number().default(1),
  is_winning_outcome: z.boolean().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const PredictionSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics']),
  type: z.enum(['binary', 'multi_outcome', 'pool']),
  status: z.enum(['pending', 'open', 'closed', 'settled', 'disputed', 'cancelled']).default('pending'),
  stake_min: z.number().positive(),
  stake_max: z.number().positive().optional(),
  pool_total: z.number().default(0),
  entry_deadline: z.string().datetime(),
  settlement_method: z.enum(['auto', 'manual']),
  settlement_proof_url: z.string().url().optional(),
  settled_outcome_id: z.string().uuid().optional(),
  is_private: z.boolean().default(false),
  password_hash: z.string().optional(),
  creator_fee_percentage: z.number().min(0).max(100).default(0),
  platform_fee_percentage: z.number().min(0).max(100).default(2.5),
  club_id: z.string().uuid().optional(),
  sponsor_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreatePredictionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics']),
  type: z.enum(['binary', 'multi_outcome', 'pool']),
  options: z.array(z.object({
    label: z.string().min(1).max(255),
  })).min(2),
  stake_min: z.number().positive(),
  stake_max: z.number().positive().optional(),
  entry_deadline: z.string().datetime(),
  settlement_method: z.enum(['auto', 'manual']),
  is_private: z.boolean().default(false),
  password: z.string().optional(),
  creator_fee_percentage: z.number().min(0).max(5).default(0),
  club_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdatePredictionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  entry_deadline: z.string().datetime().optional(),
  settlement_proof_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// PREDICTION ENTRY SCHEMAS
// ============================================================================

export const PredictionEntrySchema = z.object({
  id: z.string().uuid(),
  prediction_id: z.string().uuid(),
  user_id: z.string().uuid(),
  option_id: z.string().uuid(),
  amount: z.number().positive(),
  potential_payout: z.number().optional(),
  actual_payout: z.number().optional(),
  status: z.enum(['active', 'won', 'lost', 'refunded']).default('active'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreatePredictionEntrySchema = z.object({
  prediction_id: z.string().uuid(),
  option_id: z.string().uuid(),
  amount: z.number().positive(),
});

// ============================================================================
// WALLET SCHEMAS
// ============================================================================

export const WalletSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  currency: z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
  available_balance: z.number().default(0),
  reserved_balance: z.number().default(0),
  total_deposited: z.number().default(0),
  total_withdrawn: z.number().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const WalletTransactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['deposit', 'withdraw', 'prediction_lock', 'prediction_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout']),
  currency: z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
  amount: z.number(),
  status: z.enum(['pending', 'completed', 'failed', 'reversed']).default('pending'),
  reference: z.string().optional(),
  related_prediction_entry_id: z.string().uuid().optional(),
  related_payout_id: z.string().uuid().optional(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const DepositSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
  payment_method: z.enum(['card', 'bank_transfer', 'crypto']).default('card'),
});

export const WithdrawSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'USDT', 'ETH']).default('NGN'),
  destination: z.string(),
  withdrawal_method: z.enum(['bank_transfer', 'crypto']).default('bank_transfer'),
});

// ============================================================================
// SOCIAL SCHEMAS
// ============================================================================

export const CommentSchema = z.object({
  id: z.string().uuid(),
  prediction_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  parent_comment_id: z.string().uuid().optional(),
  is_edited: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateCommentSchema = z.object({
  prediction_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  parent_comment_id: z.string().uuid().optional(),
});

export const ReactionSchema = z.object({
  id: z.string().uuid(),
  prediction_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['like', 'cheer', 'fire', 'thinking']),
  created_at: z.string().datetime(),
});

export const CreateReactionSchema = z.object({
  prediction_id: z.string().uuid(),
  type: z.enum(['like', 'cheer', 'fire', 'thinking']),
});

// ============================================================================
// CLUB SCHEMAS
// ============================================================================

export const ClubSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  owner_id: z.string().uuid(),
  visibility: z.enum(['public', 'private', 'invite_only']).default('public'),
  member_count: z.number().default(0),
  avatar_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateClubSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private', 'invite_only']).default('public'),
  avatar_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
});

export const ClubMemberSchema = z.object({
  id: z.string().uuid(),
  club_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['member', 'moderator', 'admin']).default('member'),
  joined_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['prediction_settled', 'prediction_ending', 'comment_reply', 'club_invite', 'payment_received', 'system_announcement']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  is_read: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  errors: z.record(z.array(z.string())).optional(),
});

export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const PaginationQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const PredictionQuerySchema = PaginationQuerySchema.extend({
  category: z.enum(['sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics']).optional(),
  status: z.enum(['pending', 'open', 'closed', 'settled', 'disputed', 'cancelled']).optional(),
  creator_id: z.string().uuid().optional(),
  club_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.enum(['created_at', 'pool_total', 'entry_deadline']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type Prediction = z.infer<typeof PredictionSchema>;
export type PredictionOption = z.infer<typeof PredictionOptionSchema>;
export type CreatePrediction = z.infer<typeof CreatePredictionSchema>;
export type UpdatePrediction = z.infer<typeof UpdatePredictionSchema>;

export type PredictionEntry = z.infer<typeof PredictionEntrySchema>;
export type CreatePredictionEntry = z.infer<typeof CreatePredictionEntrySchema>;

export type Wallet = z.infer<typeof WalletSchema>;
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;
export type Deposit = z.infer<typeof DepositSchema>;
export type Withdraw = z.infer<typeof WithdrawSchema>;

export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type CreateReaction = z.infer<typeof CreateReactionSchema>;

export type Club = z.infer<typeof ClubSchema>;
export type CreateClub = z.infer<typeof CreateClubSchema>;
export type ClubMember = z.infer<typeof ClubMemberSchema>;

export type Notification = z.infer<typeof NotificationSchema>;

export type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
};

export type PaginatedResponse<T = any> = {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PredictionQuery = z.infer<typeof PredictionQuerySchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const PREDICTION_CATEGORIES = [
  'sports',
  'pop_culture',
  'custom',
  'esports',
  'celebrity_gossip',
  'politics',
] as const;

export const PREDICTION_TYPES = ['binary', 'multi_outcome', 'pool'] as const;

export const PREDICTION_STATUSES = [
  'pending',
  'open',
  'closed',
  'settled',
  'disputed',
  'cancelled',
] as const;

export const WALLET_CURRENCIES = ['NGN', 'USD', 'USDT', 'ETH'] as const;

export const TRANSACTION_TYPES = [
  'deposit',
  'withdraw',
  'prediction_lock',
  'prediction_release',
  'transfer_in',
  'transfer_out',
  'fee',
  'creator_payout',
] as const;

export const REACTION_TYPES = ['like', 'cheer', 'fire', 'thinking'] as const;

export const CLUB_ROLES = ['member', 'moderator', 'admin'] as const;

export const CLUB_VISIBILITY = ['public', 'private', 'invite_only'] as const;
