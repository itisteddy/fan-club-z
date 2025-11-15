/**
 * API schemas - type guards and validation
 * Re-exports domain types and provides runtime validation
 */

// Re-export domain types for backward compatibility
export type {
  Prediction,
  PredictionStatus,
  PredictionOption,
  PredictionEntry,
  EntryStatus,
  User,
  WalletBalance,
  Transaction,
  TransactionType,
  TransactionStatus,
  EscrowLock,
  EscrowLockState,
  LeaderboardEntry,
  Settlement,
  PredictionListResponse,
  LeaderboardResponse,
} from '../types/domain';

// Re-export from shared (Comment, PaginatedResponse)
export type { Comment, PaginatedResponse } from '@fanclubz/shared';

// Import types for validation
import type { 
  Prediction, 
  PredictionListResponse, 
  LeaderboardEntry, 
  LeaderboardResponse,
  WalletBalance,
  Transaction,
  PredictionEntry,
  Settlement,
  User 
} from '../types/domain';

// ================================
// TYPE GUARDS
// ================================

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
    Array.isArray((obj as any).data) &&
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
    Array.isArray((obj as any).data) &&
    typeof (obj as any).total === 'number' &&
    typeof (obj as any).page === 'number' &&
    typeof (obj as any).limit === 'number'
  );
}

export function isWalletBalance(obj: unknown): obj is WalletBalance {
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
    typeof (obj as any).status === 'string' &&
    typeof (obj as any).created_at === 'string'
  );
}

export function isPredictionEntry(obj: unknown): obj is PredictionEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).user_id === 'string' &&
    typeof (obj as any).prediction_id === 'string' &&
    typeof (obj as any).option_id === 'string' &&
    typeof (obj as any).amount === 'number' &&
    typeof (obj as any).status === 'string' &&
    typeof (obj as any).created_at === 'string'
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
    (typeof (obj as any).created_at === 'string' || typeof (obj as any).created_at === 'undefined')
  );
}

// ================================
// VALIDATION FUNCTIONS
// ================================

export function validatePredictionListResponse(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!isPredictionListResponse(obj)) {
    issues.push('Invalid prediction list response structure');
    return issues;
  }

  // Validate each prediction
  obj.data.forEach((prediction, index) => {
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
  obj.data.forEach((entry, index) => {
    if (!isLeaderboardEntry(entry)) {
      issues.push(`Invalid leaderboard entry at index ${index}`);
    }
  });

  return issues;
}

export function validateWalletBalance(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!isWalletBalance(obj)) {
    issues.push('Invalid wallet balance structure');
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

export function validatePredictionEntryList(obj: unknown): string[] {
  const issues: string[] = [];
  
  if (!Array.isArray(obj)) {
    issues.push('Prediction entries must be an array');
    return issues;
  }

  obj.forEach((entry, index) => {
    if (!isPredictionEntry(entry)) {
      issues.push(`Invalid prediction entry at index ${index}`);
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
