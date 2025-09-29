import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { createErrorBoundaryFallback } from '../../utils/errorHandling';
import { qaLog } from '../../utils/devQa';

interface PredictionErrorBoundaryProps {
  children: React.ReactNode;
  predictionId?: string;
  onNavigateBack?: () => void;
  onGoHome?: () => void;
}

interface PredictionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class PredictionErrorBoundary extends React.Component<
  PredictionErrorBoundaryProps,
  PredictionErrorBoundaryState
> {
  constructor(props: PredictionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): PredictionErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details only in development
    if (import.meta.env.DEV) {
      console.error('PredictionErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Log to our error handling system
    qaLog('[PredictionErrorBoundary] Error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      predictionId: this.props.predictionId,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const { predictionId, onNavigateBack, onGoHome } = this.props;
      
      // Use our error handling utility to create a fallback
      const fallbackInfo = createErrorBoundaryFallback(error!, 'PredictionErrorBoundary');

      return (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-6 pt-12 pb-6">
              <div className="flex items-center gap-4">
                {onNavigateBack && (
                  <button
                    onClick={onNavigateBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <h1 className="text-2xl font-bold text-gray-900">Prediction Error</h1>
              </div>
            </div>
          </div>

          {/* Error Content */}
          <div className="flex items-center justify-center p-6 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {fallbackInfo.title}
              </h2>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {fallbackInfo.message}
              </p>

              {predictionId && (
                <div className="mb-6 p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Prediction ID:</span> {predictionId}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {fallbackInfo.canRetry && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={this.resetError}
                    className="w-full bg-emerald-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </motion.button>
                )}
                
                {onNavigateBack && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onNavigateBack}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                  </motion.button>
                )}
                
                {onGoHome && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGoHome}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Development Error Details */}
          {error && import.meta.env.DEV && (
            <div className="px-6 pb-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-100 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-gray-800 mb-2">Error Details:</h3>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {error.message}
                  </pre>
                  {error.stack && (
                    <>
                      <h4 className="font-semibold text-sm text-gray-800 mb-2 mt-4">Stack Trace:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <h4 className="font-semibold text-sm text-gray-800 mb-2 mt-4">Component Stack:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default PredictionErrorBoundary;
