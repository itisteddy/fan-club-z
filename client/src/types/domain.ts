import type { CategorySlug } from '@/constants/categories';

/**
 * Domain types for client app
 * Core business entities with snake_case backend DTOs and camelCase frontend models
 */

// ================================
// PREDICTION MODELS
// ================================

export type PredictionStatus = 
  | 'open' 
  | 'closed' 
  | 'settled' 
  | 'awaiting_settlement' 
  | 'disputed' 
  | 'refunded'
  | 'ended';

export interface PredictionOption {
  id: string;
  label: string;
  prediction_id?: string;
  pool_amount?: number;
  total_staked?: number; // Amount staked on this option
  current_odds?: number;
  percentage?: number;
  created_at?: string;
  // Legacy aliases
  totalStaked?: number;
  total_amount?: number;
  staked_amount?: number;
  amount_staked?: number;
  // Additional fields from components
  title?: string; // Alias for label
  text?: string;  // Another label alias
  option?: string; // Yet another
  odds?: number;   // Alias for current_odds
}

export interface Prediction {
  id: string;
  title: string;
  description?: string;
  question?: string; // Alternate description field
  category: CategorySlug | string;
  status: PredictionStatus;
  type?: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  deadline: string;
  entry_deadline?: string;
  settlement_criteria?: string;
  settlement_method?: string;
  total_volume?: number;
  pool_total?: number | string;
  participant_count?: number;
  stake_min?: number;
  stake_max?: number;
  creator_fee_percentage?: number;
  creator?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    displayName?: string;
  };
  options?: PredictionOption[];
  user_entry?: PredictionEntry | null;
  comments?: number; // Comment count
  // Legacy/alternate field names
  end_date?: string;
  settledAt?: string;
  participants?: number;
  createdAt?: string; // Alias for created_at
  won?: boolean; // For user entry context
  amount?: number; // For user entry context
  payout?: number; // For user entry context
  stakeMin?: number; // Alias for stake_min
  participantCount?: number; // Alias for participant_count
  settlementMethod?: string; // Alias for settlement_method
}

// ================================
// PREDICTION ENTRY MODELS
// ================================

export type EntryStatus = 'active' | 'won' | 'lost' | 'refunded' | 'pending' | 'settled';

export interface PredictionEntry {
  id: string;
  user_id: string;
  prediction_id: string;
  option_id: string;
  amount: number;
  status: EntryStatus;
  created_at: string;
  updated_at?: string;
  escrow_lock_id?: string;
  payout_odds?: number;
  provider?: string;
  potential_payout?: number;
  actual_payout?: number;
  // Joined data
  prediction?: Prediction;
  option?: PredictionOption;
  user?: User;
  // Legacy/alternate field names
  predictionId?: string;
  optionId?: string;
  potentialPayout?: number;
}

// ================================
// USER MODELS
// ================================

export interface User {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  // Legacy/alternate field names
  avatarUrl?: string;
  firstName?: string;
  avatar?: string;
  displayName?: string;
  // Optional stats
  stats?: {
    total_predictions?: number;
    won_predictions?: number;
    total_volume?: number;
    win_rate?: number;
  };
}

// ================================
// WALLET & ACTIVITY MODELS
// ================================

export interface WalletBalance {
  user_id: string;
  currency: string;
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
  escrow_balance?: number;
  last_updated: string;
}

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'bet_placed' 
  | 'bet_won' 
  | 'bet_lost' 
  | 'refund'
  | 'credit'
  | 'debit'
  | 'bet_lock'
  | 'bet_release'
  | 'bet_entry';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  status: TransactionStatus;
  created_at: string;
  updated_at?: string;
  reference_id?: string;
  meta?: Record<string, any>;
  provider?: string;
  channel?: string;
  direction?: 'credit' | 'debit';
  external_ref?: string;
}

// ================================
// ESCROW & BLOCKCHAIN MODELS
// ================================

export type EscrowLockState = 'active' | 'consumed' | 'released' | 'expired';

export interface EscrowLock {
  id: string;
  user_id: string;
  prediction_id?: string;
  amount: number;
  state: EscrowLockState;
  tx_ref?: string;
  created_at: string;
  released_at?: string;
  consumed_at?: string;
  meta?: {
    tx_hash?: string;
    provider?: string;
    [key: string]: any;
  };
}

// ================================
// LEADERBOARD MODELS
// ================================

export interface LeaderboardEntry {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  total_predictions: number;
  won_predictions: number;
  total_volume: number;
  win_rate: number;
  rank: number;
}

// ================================
// API RESPONSE WRAPPERS
// ================================
// Note: PaginatedResponse is exported from @fanclubz/shared

export type PredictionListResponse = { data: Prediction[]; pagination: any };
export type LeaderboardResponse = { data: LeaderboardEntry[]; pagination: any };

// ================================
// FORM & UI MODELS
// ================================

export interface PlaceBetFormData {
  predictionId: string;
  optionId: string;
  amount: number;
}

export interface CreatePredictionFormData {
  title: string;
  description: string;
  category: string;
  deadline: string;
  entry_deadline?: string;
  settlement_criteria?: string;
  options: Array<{
    label: string;
  }>;
}

// ================================
// COMMENT MODELS
// ================================

export interface UnifiedComment {
  id: string;
  user_id: string;
  prediction_id?: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  updated_at?: string;
  reply_count?: number;
  reaction_counts?: Record<string, number>;
  author: {
    id: string;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

// ================================
// SETTLEMENT MODELS
// ================================

export interface Settlement {
  id: string;
  prediction_id: string;
  outcome: string; // option_id or special values like 'refund'
  settled_by: string;
  settled_at: string;
  reason?: string;
  prediction?: Prediction;
}
