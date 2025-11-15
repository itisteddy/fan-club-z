import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, User, Home } from 'lucide-react';
import { usePredictionStore } from '../../store/predictionStore';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { openAuthGate } from '../../auth/authGateAdapter';
import ErrorBanner from '../ui/ErrorBanner';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import PredictionErrorBoundary from './PredictionErrorBoundary';
import { qaLog } from '../../utils/devQa';
import { AppError } from '../../utils/errorHandling';
import { isValidPredictionId } from '../../utils/deepLinking';

interface PredictionDetailsWrapperProps {
  children: React.ReactNode;
}

const PredictionDetailsWrapper: React.FC<PredictionDetailsWrapperProps> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchPredictionById, loading, error } = usePredictionStore();
  const { errorState, clearError, executeWithErrorHandling } = useErrorHandling({
    context: 'PredictionDetailsWrapper',
  });

  const [prediction, setPrediction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorMissing, setCreatorMissing] = useState(false);

  // Handle navigation back
  const handleNavigateBack = useCallback(() => {
    qaLog('[PredictionDetailsWrapper] Navigating back');
    
    if (window.history.length > 1) {
      // Use browser back to restore scroll position
      window.history.back();
    } else {
      // Fallback to discover page
      navigate('/');
    }
  }, [navigate]);

  // Handle navigation to home
  const handleGoHome = useCallback(() => {
    qaLog('[PredictionDetailsWrapper] Navigating to home');
    navigate('/');
  }, [navigate]);

  // Load prediction data
  const loadPrediction = useCallback(async () => {
    if (!id) {
      qaLog('[PredictionDetailsWrapper] No prediction ID provided');
      setPrediction(null);
      setIsLoading(false);
      return;
    }

    // Validate prediction ID format
    if (!isValidPredictionId(id)) {
      qaLog('[PredictionDetailsWrapper] Invalid prediction ID format:', id);
      setPrediction(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      qaLog('[PredictionDetailsWrapper] Loading prediction:', id);
      const predictionData = await fetchPredictionById(id);
      
      qaLog('[PredictionDetailsWrapper] fetchPredictionById result:', predictionData);
      
      if (!predictionData) {
        qaLog('[PredictionDetailsWrapper] No prediction data returned');
        setPrediction(null);
        setIsLoading(false);
        return;
      }

      // Check if creator is missing
      if (!predictionData.creator || !predictionData.creator.id) {
        qaLog('[PredictionDetailsWrapper] Creator missing for prediction:', id);
        setCreatorMissing(true);
      } else {
        setCreatorMissing(false);
      }

      qaLog('[PredictionDetailsWrapper] Setting prediction state:', predictionData);
      console.log('🔍 Prediction data being set:', {
        title: predictionData.title,
        options: predictionData.options,
        optionsLength: predictionData.options?.length,
        creator: predictionData.creator
      });
      setPrediction(predictionData);
    } catch (error) {
      qaLog('[PredictionDetailsWrapper] Error loading prediction:', error);
      setPrediction(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchPredictionById, clearError]);

  // Load prediction on mount and when ID changes
  useEffect(() => {
    loadPrediction();
  }, [loadPrediction]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    await loadPrediction();
  }, [loadPrediction]);

  // Handle auth required
  const handleAuthRequired = useCallback(() => {
    openAuthGate({ intent: 'place_prediction', payload: { predictionId: id } });
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
            </div>
          </div>
        </div>
        <LoadingState 
          message="Loading prediction details..." 
          size="lg" 
          className="py-16"
        />
      </div>
    );
  }

  // Error state
  if (errorState.error || error) {
    const errorMessage = errorState.error || error || 'Failed to load prediction';
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-8">
          <ErrorBanner
            error={errorMessage}
            onRetry={handleRetry}
            showRetry={true}
            type="error"
          />
          
          <div className="mt-8 flex flex-col gap-4 max-w-sm mx-auto">
            <motion.button
              onClick={handleRetry}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Try Again
            </motion.button>
            
            <motion.button
              onClick={handleGoHome}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-4 h-4" />
              Go Home
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging
  qaLog('[PredictionDetailsWrapper] Render state:', { 
    prediction: !!prediction, 
    predictionId: prediction?.id,
    predictionTitle: prediction?.title,
    predictionOptions: prediction?.options?.length || 0,
    isLoading, 
    errorState: !!errorState.error
  });

  // No prediction found
  qaLog('[PredictionDetailsWrapper] About to check prediction condition:', { 
    prediction, 
    predictionType: typeof prediction,
    predictionKeys: prediction ? Object.keys(prediction) : 'null'
  });
  
  if (!prediction) {
    qaLog('[PredictionDetailsWrapper] Showing not found state - prediction is falsy');
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Not Found</h1>
            </div>
          </div>
        </div>
        
        <EmptyState
          icon={AlertTriangle}
          title="Prediction Not Found"
          description="The prediction you're looking for doesn't exist or has been removed."
          action={{
            label: "Go Back",
            onClick: handleNavigateBack,
          }}
          className="py-16"
        />
      </div>
    );
  }

  // Creator missing warning
  if (creatorMissing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Prediction Details</h1>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-8">
          <ErrorBanner
            error="This prediction's creator is no longer available. Some features may be limited."
            type="warning"
            showRetry={false}
            showDismiss={true}
            onDismiss={() => setCreatorMissing(false)}
          />
          
          <div className="mt-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Success state - render children with prediction data
  return (
    <PredictionErrorBoundary
      predictionId={id}
      onNavigateBack={handleNavigateBack}
      onGoHome={handleGoHome}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Prediction Details</h1>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-8">
          {children}
        </div>
      </div>
    </PredictionErrorBoundary>
  );
};

export default PredictionDetailsWrapper;
