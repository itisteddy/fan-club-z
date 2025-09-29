import { qaLog } from './devQa';
import { showErrorToast, showUserActionToast } from './toasts';

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  timestamp: number;
  context?: string;
  userAction?: boolean;
}

export class AppError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly context?: string;
  public readonly userAction?: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    options: {
      code?: string;
      status?: number;
      context?: string;
      userAction?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status;
    this.context = options.context;
    this.userAction = options.userAction;
    this.timestamp = Date.now();
  }

  toErrorInfo(): ErrorInfo {
    return {
      message: this.message,
      code: this.code,
      status: this.status,
      timestamp: this.timestamp,
      context: this.context,
      userAction: this.userAction,
    };
  }
}

// Error classification
export const classifyError = (error: unknown): {
  type: 'network' | 'validation' | 'auth' | 'server' | 'unknown';
  message: string;
  userFriendly: boolean;
  shouldShowToast: boolean;
} => {
  if (error instanceof AppError) {
    return {
      type: error.code === 'AUTH_REQUIRED' ? 'auth' : 
            error.code === 'VALIDATION_ERROR' ? 'validation' :
            error.status && error.status >= 500 ? 'server' :
            error.status && error.status >= 400 ? 'validation' : 'unknown',
      message: error.message,
      userFriendly: true,
      shouldShowToast: error.userAction || false,
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return {
        type: 'network',
        message: 'Connection problem. Please check your internet and try again.',
        userFriendly: true,
        shouldShowToast: false, // Background error, show in banner instead
      };
    }

    // Generic error
    return {
      type: 'unknown',
      message: error.message,
      userFriendly: false,
      shouldShowToast: false,
    };
  }

  // Unknown error type
  return {
    type: 'unknown',
    message: 'Something went wrong. Please try again.',
    userFriendly: true,
    shouldShowToast: false,
  };
};

// Error handler for async operations
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          { context }
        );
    
    qaLog('[ErrorHandler] Async error:', appError.toErrorInfo());
    
    const classification = classifyError(appError);
    if (classification.shouldShowToast) {
      showErrorToast(classification.message);
    }
    
    return { error: appError };
  }
};

// Error handler for user actions
export const handleUserActionError = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Action failed',
          { context, userAction: true }
        );
    
    qaLog('[ErrorHandler] User action error:', appError.toErrorInfo());
    
    const classification = classifyError(appError);
    showErrorToast(classification.message);
    
    throw appError;
  }
};

// Retry logic with exponential backoff
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        qaLog(`[ErrorHandler] Max retries (${maxRetries}) reached for:`, context);
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      qaLog(`[ErrorHandler] Retry ${attempt + 1}/${maxRetries} after ${delay}ms for:`, context);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Error boundary helper
export const createErrorBoundaryFallback = (error: Error, context?: string) => {
  const appError = error instanceof AppError 
    ? error 
    : new AppError(error.message, { context });
  
  qaLog('[ErrorHandler] Error boundary triggered:', appError.toErrorInfo());
  
  return {
    title: 'Something went wrong',
    message: 'We encountered an unexpected error. Please refresh the page and try again.',
    canRetry: true,
    error: appError,
  };
};

// Network error detection
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.code === 'NETWORK_ERROR' || error.status === 0;
  }
  
  if (error instanceof Error) {
    return error.message.includes('fetch') || 
           error.message.includes('network') || 
           error.message.includes('Failed to fetch') ||
           error.name === 'NetworkError';
  }
  
  return false;
};

// Auth error detection
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.code === 'AUTH_REQUIRED' || error.status === 401;
  }
  
  if (error instanceof Error) {
    return error.message.includes('unauthorized') || 
           error.message.includes('authentication');
  }
  
  return false;
};

// Validation error detection
export const isValidationError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.code === 'VALIDATION_ERROR' || 
           (error.status && error.status >= 400 && error.status < 500);
  }
  
  return false;
};
