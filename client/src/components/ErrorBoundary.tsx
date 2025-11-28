import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Always log errors to console for debugging (even in production)
    console.error('❌ ErrorBoundary caught an error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
    
    // CRITICAL: Handle dynamic module loading errors (stale Vercel chunks)
    // These occur when Vercel deploys new code but the browser has cached old chunk references
    const isModuleLoadError = 
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Failed to load module script') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError');
    
    if (isModuleLoadError) {
      console.warn('🔄 Module loading error detected - triggering hard reload to fetch fresh chunks');
      // Clear any cached service worker data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      // Force a hard reload bypassing cache
      window.location.reload();
      return;
    }
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  const handleGoHome = () => {
    resetError();
    // Navigate to home
    window.location.href = '/';
  };

  const handleRefresh = () => {
    resetError();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
      >
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            We encountered an unexpected error. This has been logged and our team will investigate.
          </p>
        </div>

        {error && (
          <details className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <summary className="font-semibold text-sm text-gray-800 mb-2 cursor-pointer">
              Error Details (click to expand)
            </summary>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-2">
              {error.message}
              {error.stack && `\n\nStack:\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 w-full bg-teal-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// Specific error boundary for profile navigation
export const ProfileErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleProfileError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Profile navigation error:', error, errorInfo);
    
    // Check if it's the specific React error #301
    if (error.message.includes('Minified React error #301')) {
      console.error('React error #301 detected in profile navigation - this is typically a hydration mismatch');
    }
  };

  return (
    <ErrorBoundary 
      onError={handleProfileError}
      fallback={ProfileErrorFallback}
    >
      {children}
    </ErrorBoundary>
  );
};

// Profile-specific error fallback
const ProfileErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  const handleGoBack = () => {
    resetError();
    window.history.back();
  };

  const handleGoHome = () => {
    resetError();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-teal-600 pt-12 pb-6">
        <div className="px-6">
          <h1 className="text-white text-2xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Error Content */}
      <div className="flex items-center justify-center p-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-6 text-center"
        >
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Profile Unavailable
          </h2>
          
          <p className="text-gray-600 text-sm mb-6">
            We couldn't load this profile. The user might not exist or there was a connection issue.
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoBack}
              className="w-full bg-teal-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Go Back
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoHome}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ErrorBoundary;