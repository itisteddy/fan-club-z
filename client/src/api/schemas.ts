// Type guards and validation schemas for API responses
// Using simple type guards instead of Zod for now to avoid additional dependencies

export interface Prediction {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'closed' | 'settled' | 'awaiting_settlement' | 'disputed' | 'refunded' | 'ended';
  creator_id: string;
  created_at: string;
  updated_at: string;
  deadline: string;
  settlement_criteria?: string;
  total_volume?: number;
  participant_count?: number;
  creator?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface PredictionListResponse {
  predictions: Prediction[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

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

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface WalletSummary {
  user_id: string;
  currency: string;
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
  last_updated: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'refund';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  reference_id?: string;
}

export interface UserBet {
  id: string;
  user_id: string;
  prediction_id: string;
  option: 'yes' | 'no';
  amount: number;
  currency: string;
  status: 'active' | 'won' | 'lost' | 'refunded';
  created_at: string;
  updated_at: string;
  prediction?: Prediction;
}

export interface Settlement {
  id: string;
  prediction_id: string;
  outcome: 'yes' | 'no' | 'refund';
  settled_by: string;
  settled_at: string;
  reason?: string;
  prediction?: Prediction;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    total_predictions: number;
    won_predictions: number;
    total_volume: number;
    win_rate: number;
  };
}

// Type guards
export function isPrediction(obj: unknown): obj is Prediction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).title === 'string' &&
    typeof (obj as any).description === 'string' &&
    typeof (obj as any).category === 'string' &&
    typeof (obj as any).status === 'string' &&
    typeof (obj as any).creator_id === 'string' &&
    typeof (obj as any).created_at === 'string' &&
    typeof (obj as any).updated_at === 'string' &&
    typeof (obj as any).deadline === 'string'
  );
}

export function isPredictionListResponse(obj: unknown): obj is PredictionListResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as any).predictions) &&
    typeof (obj as any).total === 'number' &&
    typeof (obj as any).page === 'number' &&
    typeof (obj as any).limit === 'number' &&
    typeof (obj as any).has_more === 'boolean'
  );
}

export function isLeaderboardEntry(obj: unknown): obj is LeaderboardEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).username === 'string' &&
    typeof (obj as any).total_predictions === 'number' &&
    typeof (obj as any).won_predictions === 'number' &&
    typeof (obj as any).total_volume === 'number' &&
    typeof (obj as any).win_rate === 'number' &&
    typeof (obj as any).rank === 'number'
  );
}

export function isLeaderboardResponse(obj: unknown): obj is LeaderboardResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as any).entries) &&
    typeof (obj as any).total === 'number' &&
    typeof (obj as any).page === 'number' &&
    typeof (obj as any).limit === 'number'
  );
}

export function isWalletSummary(obj: unknown): obj is WalletSummary {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).user_id === 'string' &&
    typeof (obj as any).currency === 'string' &&
    typeof (obj as any).available_balance === 'number' &&
    typeof (obj as any).reserved_balance === 'number' &&
    typeof (obj as any).total_balance === 'number' &&
    typeof (obj as any).last_updated === 'string'
  );
}

export function isTransaction(obj: unknown): obj is Transaction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).user_id === 'string' &&
    typeof (obj as any).type === 'string' &&
    typeof (obj as any).amount === 'number' &&
    typeof (obj as any).currency === 'string' &&
    typeof (obj as any).description === 'string' &&
    typeof (obj as any).status === 'string' &&
    typeof (obj as any).created_at === 'string' &&
    typeof (obj as any).updated_at === 'string'
  );
}

export function isUserBet(obj: unknown): obj is UserBet {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).user_id === 'string' &&
    typeof (obj as any).prediction_id === 'string' &&
    typeof (obj as any).option === 'string' &&
    typeof (obj as any).amount === 'number' &&
    typeof (obj as any).currency === 'string' &&
    typeof (obj as any).status === 'string' &&
    typeof (obj as any).created_at === 'string' &&
    typeof (obj as any).updated_at === 'string'
  );
}

export function isSettlement(obj: unknown): obj is Settlement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).prediction_id === 'string' &&
    typeof (obj as any).outcome === 'string' &&
    typeof (obj as any).settled_by === 'string' &&
    typeof (obj as any).settled_at === 'string'
  );
}

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).username === 'string' &&
    typeof (obj as any).created_at === 'string' &&
    typeof (obj as any).updated_at === 'string'
  );
}

// Validation functions that return issues array
export function validatePredictionListResponse(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!isPredictionListResponse(obj)) {
    issues.push('Invalid prediction list response structure');
    return issues;
  }

  // Validate each prediction
  obj.predictions.forEach((prediction, index) => {
    if (!isPrediction(prediction)) {
      issues.push(`Invalid prediction at index ${index}`);
    }
  });

  return issues;
}

export function validateLeaderboardResponse(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!isLeaderboardResponse(obj)) {
    issues.push('Invalid leaderboard response structure');
    return issues;
  }

  // Validate each entry
  obj.entries.forEach((entry, index) => {
    if (!isLeaderboardEntry(entry)) {
      issues.push(`Invalid leaderboard entry at index ${index}`);
    }
  });

  return issues;
}

export function validateWalletSummary(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!isWalletSummary(obj)) {
    issues.push('Invalid wallet summary structure');
  }

  return issues;
}

export function validateTransactionList(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!Array.isArray(obj)) {
    issues.push('Transactions must be an array');
    return issues;
  }

  obj.forEach((transaction, index) => {
    if (!isTransaction(transaction)) {
      issues.push(`Invalid transaction at index ${index}`);
    }
  });

  return issues;
}

export function validateUserBetList(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!Array.isArray(obj)) {
    issues.push('User bets must be an array');
    return issues;
  }

  obj.forEach((bet, index) => {
    if (!isUserBet(bet)) {
      issues.push(`Invalid user bet at index ${index}`);
    }
  });

  return issues;
}

export function validateSettlementList(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!Array.isArray(obj)) {
    issues.push('Settlements must be an array');
    return issues;
  }

  obj.forEach((settlement, index) => {
    if (!isSettlement(settlement)) {
      issues.push(`Invalid settlement at index ${index}`);
    }
  });

  return issues;
}

export function validateUser(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!isUser(obj)) {
    issues.push('Invalid user structure');
  }

  return issues;
}
