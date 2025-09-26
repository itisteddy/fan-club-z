import toast from 'react-hot-toast';
import { qaLog } from './devQa';

// Toast throttling and deduplication
interface ToastThrottle {
  lastShown: number;
  count: number;
}

const toastThrottle = new Map<string, ToastThrottle>();
const THROTTLE_DURATION = 10000; // 10 seconds
const MAX_DUPLICATES = 3;

// Toast categories for different types of messages
export type ToastCategory = 
  | 'user_action'
  | 'background_error'
  | 'network_error'
  | 'validation_error'
  | 'success'
  | 'info';

interface ToastOptions {
  category?: ToastCategory;
  duration?: number;
  throttle?: boolean;
  dedupe?: boolean;
}

// Only show toasts for user actions and critical errors
const ALLOWED_CATEGORIES: ToastCategory[] = [
  'user_action',
  'validation_error',
  'success',
  'info'
];

export const showToast = (
  message: string,
  type: 'success' | 'error' | 'loading' | 'info' = 'info',
  options: ToastOptions = {}
) => {
  const {
    category = 'user_action',
    duration = 4000,
    throttle = true,
    dedupe = true
  } = options;

  // Only show toasts for allowed categories
  if (!ALLOWED_CATEGORIES.includes(category)) {
    qaLog('Toast blocked for category:', category, message);
    return;
  }

  // Create a unique key for deduplication
  const key = `${category}:${message}`;

  // Check throttling
  if (throttle) {
    const now = Date.now();
    const throttleInfo = toastThrottle.get(key);

    if (throttleInfo) {
      const timeSinceLastShown = now - throttleInfo.lastShown;
      
      if (timeSinceLastShown < THROTTLE_DURATION) {
        throttleInfo.count++;
        
        // If we've shown this message too many times, don't show it again
        if (throttleInfo.count > MAX_DUPLICATES) {
          qaLog('Toast throttled (max duplicates reached):', message);
          return;
        }
        
        qaLog('Toast throttled:', message, `(${throttleInfo.count}/${MAX_DUPLICATES})`);
        return;
      } else {
        // Reset the counter if enough time has passed
        throttleInfo.count = 1;
        throttleInfo.lastShown = now;
      }
    } else {
      toastThrottle.set(key, {
        lastShown: now,
        count: 1
      });
    }
  }

  // Check deduplication
  if (dedupe) {
    // Check if the same message is already being shown
    const existingToasts = document.querySelectorAll('[data-testid="toast"]');
    for (const existingToast of existingToasts) {
      const text = existingToast.textContent;
      if (text && text.includes(message)) {
        qaLog('Toast deduplicated:', message);
        return;
      }
    }
  }

  qaLog('Showing toast:', { type, category, message });

  // Show the toast with appropriate styling
  switch (type) {
    case 'success':
      toast.success(message, {
        duration,
        style: {
          background: '#10B981',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10B981',
        },
      });
      break;
    case 'error':
      toast.error(message, {
        duration,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#EF4444',
        },
      });
      break;
    case 'loading':
      toast.loading(message, {
        duration,
        style: {
          background: '#3B82F6',
          color: '#fff',
        },
      });
      break;
    case 'info':
    default:
      toast(message, {
        duration,
        style: {
          background: '#6B7280',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#6B7280',
        },
      });
      break;
  }
};

// Convenience functions for different toast types
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'success', { ...options, category: 'success' });
};

export const showErrorToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'error', { ...options, category: 'user_action' });
};

export const showLoadingToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'loading', { ...options, category: 'user_action' });
};

export const showInfoToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'info', { ...options, category: 'info' });
};

// Validation error toasts
export const showValidationError = (message: string, options?: ToastOptions) => {
  showToast(message, 'error', { ...options, category: 'validation_error' });
};

// User action toasts (these are always shown)
export const showUserActionToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  showToast(message, type, { category: 'user_action', throttle: false });
};

// Clear all toasts
export const clearAllToasts = () => {
  toast.dismiss();
  toastThrottle.clear();
};

// Clear throttling for a specific message
export const clearToastThrottle = (message: string, category: ToastCategory = 'user_action') => {
  const key = `${category}:${message}`;
  toastThrottle.delete(key);
};

// Get throttling info for debugging
export const getToastThrottleInfo = () => {
  return Array.from(toastThrottle.entries()).map(([key, info]) => ({
    key,
    lastShown: new Date(info.lastShown).toISOString(),
    count: info.count,
    timeSinceLastShown: Date.now() - info.lastShown
  }));
};
