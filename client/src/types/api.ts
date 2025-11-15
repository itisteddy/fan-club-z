/**
 * API client types
 * Type-safe wrappers for API responses and errors
 */

// ================================
// API RESULT TYPE
// ================================

export type ApiResult<T = unknown> =
  | { kind: 'success'; data: T; status: number }
  | { kind: 'error'; error: string; status: number; details?: unknown };

// ================================
// STANDARD API RESPONSE ENVELOPE
// ================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  version?: string;
  details?: unknown;
}

// ================================
// API ERROR TYPES
// ================================

export interface ApiError {
  error: string;
  message: string;
  status: number;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public error: string,
    public details?: unknown
  ) {
    super(error);
    this.name = 'ApiClientError';
  }
}

// ================================
// QUERY PARAMETERS
// ================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PredictionQueryParams extends PaginationParams {
  category?: string;
  search?: string;
  status?: string;
}

export interface WalletQueryParams extends PaginationParams {
  type?: string;
  startDate?: string;
  endDate?: string;
}

// ================================
// REQUEST BODIES
// ================================

export interface PlaceBetRequest {
  predictionId: string;
  optionId: string;
  amount: number;
  escrowLockId?: string;
}

export interface CreatePredictionRequest {
  title: string;
  description: string;
  category: string;
  deadline: string;
  entry_deadline?: string;
  settlement_criteria?: string;
  options: Array<{ label: string }>;
}

export interface DepositRequest {
  amount: number;
  txHash: string;
  userAddress: string;
}

export interface WithdrawRequest {
  amount: number;
  toAddress: string;
}

// ================================
// HELPER TYPES
// ================================

export type LoadStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'network_error'
  | 'server_error'
  | 'client_error'
  | 'parse_error'
  | 'schema_error';
