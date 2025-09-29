import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, classifyError, handleAsyncError, handleUserActionError } from '../utils/errorHandling';
import { showErrorToast, showSuccessToast } from '../utils/toasts';
import { qaLog } from '../utils/devQa';

export interface ErrorState {
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
  lastError: AppError | null;
}

export interface UseErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToasts?: boolean;
  context?: string;
}

export const useErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToasts = true,
    context = 'useErrorHandling',
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastError: null,
    });
  }, []);

  const setError = useCallback((error: AppError | Error | string) => {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : error,
          { context }
        );

    const classification = classifyError(appError);
    
    setErrorState({
      error: classification.message,
      isRetrying: false,
      retryCount: 0,
      lastError: appError,
    });

    if (showToasts && classification.shouldShowToast) {
      showErrorToast(classification.message);
    }

    qaLog('[useErrorHandling] Error set:', appError.toErrorInfo());
  }, [context, showToasts]);

  const retry = useCallback(async (operation: () => Promise<void>) => {
    if (errorState.isRetrying || errorState.retryCount >= maxRetries) {
      qaLog('[useErrorHandling] Cannot retry:', { 
        isRetrying: errorState.isRetrying, 
        retryCount: errorState.retryCount,
        maxRetries 
      });
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    qaLog('[useErrorHandling] Retrying operation:', { 
      attempt: errorState.retryCount + 1,
      maxRetries 
    });

    try {
      await operation();
      clearError();
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            error instanceof Error ? error.message : 'Retry failed',
            { context }
          );

      const classification = classifyError(appError);
      
      setErrorState(prev => ({
        error: classification.message,
        isRetrying: false,
        retryCount: prev.retryCount,
        lastError: appError,
      }));

      if (showToasts && classification.shouldShowToast) {
        showErrorToast(classification.message);
      }

      qaLog('[useErrorHandling] Retry failed:', appError.toErrorInfo());
    }
  }, [errorState.isRetrying, errorState.retryCount, maxRetries, context, showToasts, clearError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options: { 
      isUserAction?: boolean;
      successMessage?: string;
      showSuccessToast?: boolean;
    } = {}
  ): Promise<T | null> => {
    const { isUserAction = false, successMessage, showSuccessToast: showSuccess = false } = options;

    try {
      const result = isUserAction 
        ? await handleUserActionError(operation, context)
        : await handleAsyncError(operation, context);

      if (isUserAction) {
        if (showSuccess && successMessage) {
          showSuccessToast(successMessage);
        }
        return result;
      } else {
        const { data, error } = result;
        if (error) {
          setError(error);
          return null;
        }
        return data || null;
      }
    } catch (error) {
      setError(error as AppError | Error);
      return null;
    }
  }, [context, setError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    errorState,
    clearError,
    setError,
    retry,
    executeWithErrorHandling,
    canRetry: errorState.retryCount < maxRetries && !errorState.isRetrying,
    isError: !!errorState.error,
    isRetrying: errorState.isRetrying,
  };
};

// Hook for handling async operations with loading states
export const useAsyncOperation = <T>(
  operation: () => Promise<T>,
  options: UseErrorHandlingOptions & {
    onSuccess?: (data: T) => void;
    onError?: (error: AppError) => void;
    autoExecute?: boolean;
  } = {}
) => {
  const {
    onSuccess,
    onError,
    autoExecute = false,
    ...errorHandlingOptions
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const errorHandling = useErrorHandling(errorHandlingOptions);

  const execute = useCallback(async () => {
    setIsLoading(true);
    errorHandling.clearError();

    try {
      const result = await operation();
      setData(result);
      onSuccess?.(result);
      qaLog('[useAsyncOperation] Operation successful:', result);
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            error instanceof Error ? error.message : 'Operation failed',
            { context: errorHandlingOptions.context }
          );
      
      errorHandling.setError(appError);
      onError?.(appError);
      qaLog('[useAsyncOperation] Operation failed:', appError.toErrorInfo());
    } finally {
      setIsLoading(false);
    }
  }, [operation, onSuccess, onError, errorHandling, errorHandlingOptions.context]);

  const retry = useCallback(() => {
    errorHandling.retry(execute);
  }, [errorHandling, execute]);

  // Auto-execute on mount if requested
  useEffect(() => {
    if (autoExecute) {
      execute();
    }
  }, [autoExecute, execute]);

  return {
    data,
    isLoading,
    error: errorHandling.errorState.error,
    isError: errorHandling.isError,
    isRetrying: errorHandling.isRetrying,
    canRetry: errorHandling.canRetry,
    execute,
    retry,
    clearError: errorHandling.clearError,
  };
};
