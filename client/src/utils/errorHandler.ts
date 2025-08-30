/**
 * User-friendly error handling system
 * Displays errors in a clear, actionable way for users
 */

import { toast } from 'react-hot-toast';

export interface UserError {
  title: string;
  message: string;
  action?: string;
  type: 'error' | 'warning' | 'success' | 'info';
}

// Error type mappings for common API errors
const errorMappings: Record<string, UserError> = {
  'NETWORK_ERROR': {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection.',
    action: 'Try again in a moment',
    type: 'error'
  },
  'AUTHENTICATION_FAILED': {
    title: 'Authentication Required',
    message: 'Your session has expired. Please sign in again.',
    action: 'Sign in to continue',
    type: 'warning'
  },
  'INSUFFICIENT_BALANCE': {
    title: 'Insufficient Funds',
    message: 'You don\'t have enough balance to place this prediction.',
    action: 'Add funds to your wallet',
    type: 'warning'
  },
  'PREDICTION_ENDED': {
    title: 'Prediction Closed',
    message: 'This prediction is no longer accepting entries.',
    action: 'View other active predictions',
    type: 'info'
  },
  'COMMENT_POST_FAILED': {
    title: 'Comment Not Posted',
    message: 'Your comment couldn\'t be posted. Please try again.',
    action: 'Retry posting your comment',
    type: 'error'
  },
  'EDIT_FAILED': {
    title: 'Edit Failed',
    message: 'Your changes couldn\'t be saved. Please try again.',
    action: 'Retry saving changes',
    type: 'error'
  },
  'SHARE_FAILED': {
    title: 'Share Failed',
    message: 'Unable to create share link. Please try again.',
    action: 'Try sharing again',
    type: 'error'
  },
  'VALIDATION_ERROR': {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    action: 'Review and correct the highlighted fields',
    type: 'warning'
  }
};

export function showUserError(errorCode: string, customMessage?: string): void {
  const error = errorMappings[errorCode] || {
    title: 'Something went wrong',
    message: customMessage || 'An unexpected error occurred.',
    action: 'Please try again',
    type: 'error' as const
  };

  toast.error(`${error.title}: ${error.message}${error.action ? ` - ${error.action}` : ''}`, {
    duration: error.type === 'error' ? 6000 : 4000,
    position: 'top-center',
  });
}

export function showSuccess(title: string, message: string): void {
  toast.success(`${title}: ${message}`, {
    duration: 3000,
    position: 'top-center',
  });
}

export function showWarning(title: string, message: string, action?: string): void {
  toast(`${title}: ${message}${action ? ` - ${action}` : ''}`, {
    duration: 5000,
    position: 'top-center',
    icon: '⚠️',
  });
}

export function showInfo(title: string, message: string): void {
  toast(`${title}: ${message}`, {
    duration: 4000,
    position: 'top-center',
    icon: 'ℹ️',
  });
}



// Helper function to handle API errors
export function handleApiError(error: any, fallbackMessage?: string): void {
  console.error('API Error:', error);
  
  // Extract error code from different error formats
  let errorCode = 'NETWORK_ERROR';
  
  if (error?.response?.status === 401) {
    errorCode = 'AUTHENTICATION_FAILED';
  } else if (error?.response?.status === 403) {
    errorCode = 'INSUFFICIENT_BALANCE';
  } else if (error?.response?.status === 400) {
    errorCode = 'VALIDATION_ERROR';
  } else if (error?.message?.includes('comment')) {
    errorCode = 'COMMENT_POST_FAILED';
  } else if (error?.message?.includes('edit')) {
    errorCode = 'EDIT_FAILED';
  } else if (error?.message?.includes('share')) {
    errorCode = 'SHARE_FAILED';
  }
  
  showUserError(errorCode, fallbackMessage);
}

// Helper for form validation errors
export function showValidationError(field: string, message: string): void {
  showUserError('VALIDATION_ERROR', `${field}: ${message}`);
}

// Helper for network connectivity issues
export function showNetworkError(): void {
  showUserError('NETWORK_ERROR');
}

// Helper for authentication issues
export function showAuthError(): void {
  showUserError('AUTHENTICATION_FAILED');
}
