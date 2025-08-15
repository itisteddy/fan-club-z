// Fan Club Z Shared Schema Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  full_name?: string;
  phone?: string;
  walletAddress?: string;
  avatar_url?: string;
  is_verified?: boolean;
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

export interface SettlementSource {
  name: string;
  url: string;
  trust_level?: 'high' | 'medium' | 'low';
}

export interface SettlementConfig {
  method: 'api' | 'web' | 'oracle' | 'manual';
  primary_source: SettlementSource;
  backup_source?: SettlementSource;
  rule_text: string;
  timezone: string;
  contingencies: {
    postponed: 'auto_void' | 'extend_lock' | 'keep_open';
    source_down: 'use_backup' | 'pause_and_escalate';
  };
  badges: Array<'Manual-Checked' | 'Auto-Settled' | 'Oracle'>;
}

export interface SettlementProof {
  fetched_at: string;
  source_url: string;
  screenshot_url?: string;
  content_hash: string;
  parser_note?: string;
}

export interface SettlementAcceptance {
  window_hours: number;
  stats: {
    accepted: number;
    auto_accepted: number;
    disputed: number;
  };
}

export interface Settlement {
  prediction_id: string;
  state: 'settling' | 'settled' | 'voided' | 'disputed' | 'resolved';
  outcome?: 'YES' | 'NO' | string | null;
  settled_at?: string;
  proof?: SettlementProof;
  audit_log: Array<{
    ts: string;
    actor: 'system' | 'oracle' | 'admin' | 'user';
    event: string;
    data?: any;
  }>;
  acceptance: SettlementAcceptance;
}

export interface Dispute {
  id: string;
  prediction_id: string;
  user_id: string;
  reason: 'wrong_source' | 'timing' | 'source_updated' | 'other';
  evidence: Array<{
    type: 'link' | 'upload';
    value: string;
  }>;
  state: 'open' | 'under_review' | 'upheld' | 'overturned';
  resolution_note?: string;
  created_at: string;
  updated_at?: string;
}

export interface PlayerAcceptance {
  prediction_id: string;
  user_id: string;
  action: 'accepted' | 'auto_accepted' | 'disputed';
  timestamp: string;
  dispute?: Dispute;
}

export interface Prediction {
  id: string;
  title: string;
  description?: string;
  category: string;
  type: 'binary' | 'multi' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'locked' | 'settling' | 'settled' | 'voided' | 'disputed' | 'resolved';
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
  lock_time?: Date | string; // When betting closes
  settlementMethod?: 'auto' | 'manual';
  settlement_method?: string; // Database compatibility
  settlement?: SettlementConfig; // Settlement configuration
  settlement_outcome?: string; // Final outcome
  settlement_data?: Settlement; // Settlement state and proof
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

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Comment {
  id: string;
  predictionId?: string;
  prediction_id?: string; // Database compatibility
  userId?: string;
  user_id?: string; // Database compatibility
  content: string;
  parent_comment_id?: string; // For nested replies
  depth?: number; // How deep in the thread (0 = top level, 1 = reply, 2 = reply to reply, etc.)
  thread_id?: string; // Root comment ID for the entire thread
  is_edited?: boolean;
  edited_at?: string;
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean; // User's like status
  is_own?: boolean; // Whether this comment belongs to current user
  reactions?: CommentReaction[]; // Array of emoji reactions
  user_reaction?: string; // Current user's reaction emoji
  replies?: Comment[]; // Nested replies
  user?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  createdAt?: Date | string;
  created_at?: string; // Database compatibility
  updatedAt?: Date | string;
  updated_at?: string; // Database compatibility
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

// Create interfaces for mutations
export interface CreateComment {
  prediction_id: string;
  content: string;
  parent_comment_id?: string;
}

export interface CreatePrediction {
  title: string;
  description?: string;
  category: string;
  type: 'binary' | 'multi' | 'pool';
  options: { label: string }[];
  stake_min: number;
  stake_max?: number;
  entry_deadline: string;
  settlement_method: 'auto' | 'manual';
  is_private?: boolean;
}

export interface CreatePredictionEntry {
  prediction_id: string;
  option_id: string;
  amount: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Utility functions
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return d.toLocaleDateString();
  }
}

export function generateInitials(name: string): string {
  if (!name) return 'U';
  
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  return words[0][0].toUpperCase();
}

// Legacy support for transition period
export type Bet = Prediction;
export type BetOption = PredictionOption;
export type BetEntry = PredictionEntry;
