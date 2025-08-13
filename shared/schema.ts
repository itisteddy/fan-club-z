// Fan Club Z Shared Schema Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  walletAddress?: string;
  kycLevel: 'none' | 'basic' | 'enhanced';
  reputationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionOption {
  id: string;
  label: string;
  totalStaked?: number;
  total_staked?: number; // Database compatibility
  current_odds?: number;
  percentage?: number;
}

export interface Prediction {
  id: string;
  title: string;
  description?: string;
  category: string;
  type: 'binary' | 'multi' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled';
  creatorId?: string;
  creator_id?: string; // Database compatibility
  creatorName?: string;
  creator?: {
    id: string;
    username: string;
    avatar_url?: string;
    is_verified: boolean;
  };
  options?: PredictionOption[];
  stakeMin?: number;
  stake_min?: number; // Database compatibility
  stakeMax?: number;
  stake_max?: number; // Database compatibility
  poolTotal?: number;
  pool_total?: number; // Database compatibility
  entryDeadline?: Date | string;
  entry_deadline?: string; // Database compatibility
  settlementMethod?: 'auto' | 'manual';
  settlement_method?: string; // Database compatibility
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
  updatedAt?: Date | string;
  updated_at?: string; // Database compatibility
  
  // Additional properties for UI components
  entries?: PredictionEntry[];
  likes?: number;
  likes_count?: number;
  comments?: number;
  comments_count?: number;
  participant_count?: number;
  is_private?: boolean;
  creator_fee_percentage?: number;
  platform_fee_percentage?: number;
  club_id?: string;
  image_url?: string;
  tags?: string[];
  user_entry?: {
    option_id: string;
    amount: number;
    potential_payout: number;
  };
}

export interface PredictionEntry {
  id: string;
  predictionId?: string;
  prediction_id?: string; // Database compatibility
  userId?: string;
  user_id?: string; // Database compatibility
  optionId?: string;
  option_id?: string; // Database compatibility
  amount: number;
  potentialPayout?: number;
  potential_payout?: number; // Database compatibility
  actualPayout?: number;
  actual_payout?: number; // Database compatibility
  status: 'active' | 'won' | 'lost' | 'refunded';
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
  updatedAt?: Date | string;
  updated_at?: string; // Database compatibility
}

export interface Club {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  owner_id?: string; // Database compatibility
  visibility: 'public' | 'private' | 'invite_only';
  memberCount?: number;
  member_count?: number; // Database compatibility
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
  updatedAt?: Date | string;
  updated_at?: string; // Database compatibility
}

export interface ClubMember {
  clubId?: string;
  club_id?: string; // Database compatibility
  userId?: string;
  user_id?: string; // Database compatibility
  role: 'member' | 'admin';
  joinedAt?: Date | string;
  joined_at?: string; // Database compatibility
}

export interface Comment {
  id: string;
  predictionId?: string;
  prediction_id?: string; // Database compatibility
  userId?: string;
  user_id?: string; // Database compatibility
  content: string;
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
}

export interface Reaction {
  id: string;
  predictionId?: string;
  prediction_id?: string; // Database compatibility
  userId?: string;
  user_id?: string; // Database compatibility
  type: 'like' | 'cheer';
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
}

export interface WalletTransaction {
  id: string;
  userId?: string;
  user_id?: string; // Database compatibility
  type: 'deposit' | 'withdraw' | 'prediction_lock' | 'prediction_release' | 'transfer';
  currency: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
}

// Legacy support for transition period
export type Bet = Prediction;
export type BetOption = PredictionOption;
export type BetEntry = PredictionEntry;
