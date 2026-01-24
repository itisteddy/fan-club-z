import React from 'react';

interface AuthInProgressOverlayProps {
  isVisible: boolean;
  status?: 'in_progress' | 'error';
  onRetry?: () => void;
  onCancel?: () => void;
}

/**
 * Full-screen overlay shown during OAuth authentication
 * Prevents user from getting stuck if they close the browser
 */
export const AuthInProgressOverlay: React.FC<AuthInProgressOverlayProps> = ({
  isVisible,
  status = 'in_progress',
  onRetry,
  onCancel,
}) => {
  if (!isVisible) return null;

  const isError = status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="mb-4">
            {isError ? (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <span className="text-2xl font-bold">!</span>
              </div>
            ) : (
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isError ? 'Sign-in canceled' : 'Signing in...'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {isError
              ? 'You can try again to continue signing in.'
              : 'Please complete the sign-in process in the browser window.'}
          </p>
          <div className="flex gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                {isError ? 'Dismiss' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
