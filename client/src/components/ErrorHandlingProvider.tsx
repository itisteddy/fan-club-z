import React, { createContext, useContext, useEffect, useState } from 'react';
import { qaLog } from '../utils/devQa';
import { showErrorToast } from '../utils/toasts';
import { AppError, classifyError } from '../utils/errorHandling';

interface ErrorHandlingContextType {
  reportError: (error: AppError | Error, context?: string) => void;
  clearErrors: () => void;
  errors: AppError[];
}

const ErrorHandlingContext = createContext<ErrorHandlingContextType | undefined>(undefined);

export const useErrorHandling = () => {
  const context = useContext(ErrorHandlingContext);
  if (context === undefined) {
    throw new Error('useErrorHandling must be used within an ErrorHandlingProvider');
  }
  return context;
};

interface ErrorHandlingProviderProps {
  children: React.ReactNode;
  maxErrors?: number;
  showToasts?: boolean;
}

export const ErrorHandlingProvider: React.FC<ErrorHandlingProviderProps> = ({
  children,
  maxErrors = 10,
  showToasts = true,
}) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const reportError = (error: AppError | Error, context?: string) => {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(error.message, { context });

    const classification = classifyError(appError);
    
    // Add to errors list
    setErrors(prev => {
      const newErrors = [appError, ...prev].slice(0, maxErrors);
      return newErrors;
    });

    // Log the error
    qaLog('[ErrorHandlingProvider] Error reported:', appError.toErrorInfo());

    // Show toast if appropriate
    if (showToasts && classification.shouldShowToast) {
      showErrorToast(classification.message);
    }
  };

  const clearErrors = () => {
    setErrors([]);
    qaLog('[ErrorHandlingProvider] Errors cleared');
  };

  // Global error handler for unhandled errors
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      const error = new AppError(event.message, {
        context: 'unhandled_error',
        code: 'UNHANDLED_ERROR',
      });
      reportError(error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new AppError(
        event.reason instanceof Error ? event.reason.message : 'Unhandled promise rejection',
        {
          context: 'unhandled_rejection',
          code: 'UNHANDLED_REJECTION',
        }
      );
      reportError(error);
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [reportError]);

  const value = {
    reportError,
    clearErrors,
    errors,
  };

  return (
    <ErrorHandlingContext.Provider value={value}>
      {children}
    </ErrorHandlingContext.Provider>
  );
};
