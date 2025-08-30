import toast from 'react-hot-toast';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  action?: string;
}

export const showErrorToast = (error: AppError | Error | string, duration = 4000) => {
  let message: string;
  let action: string | undefined;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || 'An unexpected error occurred';
  } else {
    message = error.message || 'An unexpected error occurred';
    action = error.action;
  }

  // Format message for better readability
  const formattedMessage = formatErrorMessage(message);

  toast.error(formattedMessage, {
    duration,
    style: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      color: '#B91C1C',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
    iconTheme: {
      primary: '#B91C1C',
      secondary: '#FEF2F2',
    },
  });

  // Log detailed error for debugging
  console.error('App Error:', error);

  return formattedMessage;
};

export const showSuccessToast = (message: string, duration = 3000) => {
  toast.success(message, {
    duration,
    style: {
      background: '#ECFDF5',
      border: '1px solid #A7F3D0',
      color: '#065F46',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
    iconTheme: {
      primary: '#059669',
      secondary: '#ECFDF5',
    },
  });
};

export const showWarningToast = (message: string, duration = 4000) => {
  toast(message, {
    duration,
    icon: '⚠️',
    style: {
      background: '#FFFBEB',
      border: '1px solid #FDE68A',
      color: '#92400E',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
  });
};

export const showInfoToast = (message: string, duration = 3000) => {
  toast(message, {
    duration,
    icon: 'ℹ️',
    style: {
      background: '#EFF6FF',
      border: '1px solid #BFDBFE',
      color: '#1E40AF',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
  });
};

const formatErrorMessage = (message: string): string => {
  // Common error message mappings for better UX
  const errorMappings: Record<string, string> = {
    // Network errors
    'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
    'Network request failed': 'Network error. Please check your connection and try again.',
    'NetworkError': 'Network connection failed. Please check your internet and try again.',
    'TypeError: Failed to fetch': 'Connection error. Please check your network and try again.',
    
    // HTTP status errors
    'Unauthorized': 'Your session has expired. Please sign in again.',
    'Forbidden': 'You don\'t have permission to perform this action.',
    'Not Found': 'The requested resource was not found.',
    'Internal Server Error': 'Something went wrong on our end. Please try again later.',
    'Bad Request': 'Invalid request. Please check your input and try again.',
    'Conflict': 'This action conflicts with existing data. Please refresh and try again.',
    'Service Unavailable': 'Service is temporarily unavailable. Please try again in a moment.',
    'Gateway Timeout': 'Request timed out. Please try again.',
    
    // Database errors (Supabase/PostgreSQL)
    'PGRST201': 'Database relationship error. Please try again.',
    'PGRST202': 'Database function not found. Please contact support.',
    'PGRST204': 'Database column not found. Please contact support.',
    'PGRST116': 'No data found for this request.',
    '22P02': 'Invalid data format. Please check your input.',
    '23505': 'This item already exists. Please use a different value.',
    '23503': 'Referenced item not found. Please check your data.',
    '42501': 'Permission denied. Please contact support.',
    
    // Auth specific errors
    'Invalid login credentials': 'Invalid email or password. Please check your credentials.',
    'User already registered': 'An account with this email already exists. Try signing in instead.',
    'Email not confirmed': 'Please check your email and confirm your account.',
    'User not found': 'No account found with this email. Please register first.',
    'Password reset required': 'Please reset your password to continue.',
    'Too many requests': 'Too many attempts. Please wait a moment and try again.',
    
    // Application specific errors
    'Prediction not found': 'This prediction no longer exists or has been removed.',
    'Insufficient funds': 'Not enough funds in your wallet. Please add funds to continue.',
    'Prediction closed': 'This prediction is no longer accepting entries.',
    'Invalid amount': 'Please enter a valid amount.',
    'Comment not found': 'This comment has been removed or no longer exists.',
    'User blocked': 'This action is not available for your account.',
  };

  // Check for exact matches first
  if (errorMappings[message]) {
    return errorMappings[message];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return original message if no mapping found, but clean it up
  return message
    .replace(/^Error:\s*/i, '')
    .replace(/^\w+Error:\s*/i, '')
    .trim();
};

export const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `${response.status} ${response.statusText}`;
  
  try {
    const errorData = await response.json();
    if (errorData.message) {
      errorMessage = errorData.message;
    } else if (errorData.error) {
      errorMessage = typeof errorData.error === 'string' ? errorData.error : errorMessage;
    }
  } catch {
    // If JSON parsing fails, use the default message
  }

  const error: AppError = {
    message: errorMessage,
    code: response.status.toString(),
    details: response,
  };

  throw error;
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const message = errorMessage || 'Operation failed';
    showErrorToast(error instanceof Error ? error : new Error(message));
    return null;
  }
};

// Enhanced error categorization
export const categorizeError = (error: AppError | Error | string): 'network' | 'auth' | 'validation' | 'permission' | 'server' | 'unknown' => {
  const message = typeof error === 'string' ? error : (error instanceof Error ? error.message : error.message);
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'network';
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden') || lowerMessage.includes('sign in')) {
    return 'auth';
  }
  if (lowerMessage.includes('invalid') || lowerMessage.includes('required') || lowerMessage.includes('validation')) {
    return 'validation';
  }
  if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
    return 'permission';
  }
  if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('503')) {
    return 'server';
  }
  return 'unknown';
};

// Enhanced error handling with retry options
export const withRetryErrorHandling = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryCondition?: (error: any) => boolean;
    onRetry?: (attempt: number, error: any) => void;
    errorMessage?: string;
  } = {}
): Promise<T | null> => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    retryCondition = (error: any) => {
      const category = categorizeError(error);
      return category === 'network' || category === 'server';
    },
    onRetry,
    errorMessage
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt <= maxRetries && retryCondition(error)) {
        onRetry?.(attempt, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
      break;
    }
  }
  
  const message = errorMessage || 'Operation failed';
  const category = categorizeError(lastError);
  
  // Only show toast for non-validation errors (validation should be handled inline)
  if (category !== 'validation') {
    showErrorToast(lastError instanceof Error ? lastError : new Error(message));
  }
  
  return null;
};

// Hook for consistent error handling in components
export const useErrorHandler = () => {
  const handleError = (error: AppError | Error | string, context?: string, options?: { silent?: boolean }) => {
    const { silent = false } = options || {};
    
    if (silent) {
      console.error('Silent error:', error);
      return;
    }
    
    const contextMessage = context ? `${context}: ` : '';
    const fullMessage = typeof error === 'string' 
      ? `${contextMessage}${error}`
      : `${contextMessage}${error instanceof Error ? error.message : error.message}`;
    
    const category = categorizeError(error);
    
    // For validation errors, don't show toast - these should be handled inline
    if (category === 'validation') {
      console.warn('Validation error (should be handled inline):', fullMessage);
      return fullMessage;
    }
    
    showErrorToast(fullMessage);
    return fullMessage;
  };

  const handleApiError = async (response: Response, context?: string) => {
    let errorMessage = `${response.status} ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' ? errorData.error : errorMessage;
      }
    } catch {
      // JSON parsing failed, use default message
    }
    
    const fullContext = context ? `${context}: ` : '';
    const appError: AppError = {
      message: `${fullContext}${errorMessage}`,
      code: response.status.toString(),
      details: response,
    };
    
    showErrorToast(appError);
    return appError;
  };

  const handleSuccess = (message: string, duration?: number) => {
    showSuccessToast(message, duration);
  };

  const handleWarning = (message: string, duration?: number) => {
    showWarningToast(message, duration);
  };

  const handleInfo = (message: string, duration?: number) => {
    showInfoToast(message, duration);
  };

  const handleNetworkError = (error: any, operation: string) => {
    const message = `Network error during ${operation}. Please check your connection and try again.`;
    showErrorToast(message);
    return message;
  };

  const handleValidationErrors = (errors: Record<string, string>) => {
    // Return errors for inline display, don't show toast
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      console.log(`Validation failed with ${errorCount} error(s):`, errors);
    }
    return errors;
  };

  return {
    handleError,
    handleApiError,
    handleSuccess,
    handleWarning,
    handleInfo,
    handleNetworkError,
    handleValidationErrors,
    categorizeError,
    showErrorToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
  };
};
