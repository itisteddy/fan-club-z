// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonNullable<T> = T extends null | undefined ? never : T;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type KeysOfUnion<T> = T extends T ? keyof T : never;

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

// ============================================================================
// WALLET TYPES
// ============================================================================

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'deposit' | 'withdrawal' | 'stake' | 'payout' | 'refund' | 'fee';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  reference_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: 'card' | 'bank_transfer' | 'crypto' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Withdraw {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'crypto' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  destination_address?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SOCIAL TYPES
// ============================================================================

export interface Comment {
  id: string;
  prediction_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

export interface CreateComment {
  prediction_id: string;
  content: string;
  parent_comment_id?: string;
}

export interface Reaction {
  id: string;
  user_id: string;
  prediction_id: string;
  type: 'like' | 'dislike' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

export interface CreateReaction {
  prediction_id: string;
  type: 'like' | 'dislike' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
}

// ============================================================================
// DATABASE TYPES (Unique to types.ts)
// ============================================================================

export interface DatabaseUser {
  id: string;
  email: string;
  phone?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  wallet_address?: string;
  kyc_level: 'none' | 'basic' | 'enhanced';
  kyc_status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  auth_provider?: 'email' | 'google' | 'apple';
  two_fa_enabled: boolean;
  reputation_score: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabasePrediction {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  category: 'sports' | 'pop_culture' | 'custom' | 'esports' | 'celebrity_gossip' | 'politics';
  type: 'binary' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled';
  stake_min: number;
  stake_max?: number;
  pool_total: number;
  entry_deadline: string;
  settlement_method: 'auto' | 'manual';
  settlement_proof_url?: string;
  settled_outcome_id?: string;
  is_private: boolean;
  password_hash?: string;
  creator_fee_percentage: number;
  platform_fee_percentage: number;
  club_id?: string;
  sponsor_id?: string;
  image_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface LoginResponse {
  user: DatabaseUser;
  tokens: AuthTokens;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface PredictionUpdateMessage extends WebSocketMessage {
  type: 'prediction_update';
  payload: {
    prediction_id: string;
    pool_total: number;
    options: Array<{
      id: string;
      total_staked: number;
      current_odds: number;
    }>;
  };
}

export interface CommentMessage extends WebSocketMessage {
  type: 'new_comment';
  payload: {
    prediction_id: string;
    comment: Comment;
  };
}

export interface ReactionMessage extends WebSocketMessage {
  type: 'new_reaction';
  payload: {
    prediction_id: string;
    reaction: {
      id: string;
      user_id: string;
      type: string;
      created_at: string;
    };
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatCurrency = (amount: number, currency: string = 'NGN'): string => {
  const formatters: Record<string, Intl.NumberFormat> = {
    NGN: new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    USD: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    USDT: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
    ETH: new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    }),
  };

  const formatter = formatters[currency] || formatters.NGN;
  
  if (currency === 'USDT') {
    return `${formatter?.format(amount)} USDT`;
  }
  
  if (currency === 'ETH') {
    return `${formatter?.format(amount)} ETH`;
  }
  
  return formatter?.format(amount) || `${amount} ${currency}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const formatTimeRemaining = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'Ended';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  if (diffMins > 0) return `${diffMins}m left`;
  
  return 'Ending soon';
};

export const calculateOdds = (totalPool: number, optionStaked: number): number => {
  if (optionStaked === 0) return 1;
  return Math.max(1, totalPool / optionStaked);
};

export const calculatePotentialPayout = (stake: number, odds: number): number => {
  return stake * odds;
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const generateInitials = (name?: string): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const getAvatarUrl = (user: { avatar_url?: string; username?: string; full_name?: string }): string => {
  if (user.avatar_url) return user.avatar_url;
  
  const initials = generateInitials(user.full_name || user.username);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=00D084&color=fff&size=128`;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const validatePredictionDeadline = (deadline: string): boolean => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const minDeadline = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
  
  return deadlineDate > minDeadline;
};

export const validatePredictionStakeRange = (stakeMin: number, stakeMax?: number): boolean => {
  if (stakeMin <= 0) return false;
  if (stakeMax && stakeMax <= stakeMin) return false;
  return true;
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}