import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Heart, 
  MessageCircle, 
  Share2, 
  TrendingUp, 
  ChevronDown, 
  User, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Users,
  BarChart3
} from 'lucide-react';
import { usePredictionStore } from '../../store/predictionStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { openAuthGate } from '../../auth/authGateAdapter';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { showSuccessToast, showErrorToast } from '../../utils/toasts';
import { qaLog } from '../../utils/devQa';
import { L } from '@/lib/lexicon';
import { AppError } from '../../utils/errorHandling';
import ErrorBanner from '../ui/ErrorBanner';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import AuthRequiredState from '../ui/empty/AuthRequiredState';

interface PredictionDetailsContentProps {
  predictionId: string;
  onNavigateBack?: () => void;
}

const PredictionDetailsContent: React.FC<PredictionDetailsContentProps> = ({ 
  predictionId, 
  onNavigateBack 
}) => {
  const { user, isAuthenticated } = useAuthSession();
  const { executeWithErrorHandling } = useErrorHandling({
    context: 'PredictionDetailsContent',
  });

  // Local state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  // Refs
  const commentsRef = useRef<HTMLDivElement>(null);
  const engagementRef = useRef<HTMLDivElement>(null);

  // Get prediction from store
  const { predictions, fetchPredictionById, placePrediction, loading, error } = usePredictionStore();
  
  const prediction = useMemo(() => {
    return predictions.find(p => p.id === predictionId) || null;
  }, [predictions, predictionId]);

  // Handle missing creator
  const creatorMissing = useMemo(() => {
    return !prediction?.creator || !prediction.creator.id;
  }, [prediction]);

  // Load prediction data
  const loadPrediction = useCallback(async () => {
    if (!predictionId) return;

    await executeWithErrorHandling(
      async () => {
        qaLog('[PredictionDetailsContent] Loading prediction:', predictionId);
        await fetchPredictionById(predictionId);
      },
      { isUserAction: false }
    );
  }, [predictionId, fetchPredictionById, executeWithErrorHandling]);

  // Load prediction on mount
  useEffect(() => {
    loadPrediction();
  }, [loadPrediction]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthGate({ intent: 'place_prediction', payload: { predictionId } });
      return;
    }

    await executeWithErrorHandling(
      async () => {
        // TODO: Implement like functionality
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        showSuccessToast(isLiked ? 'Unliked prediction' : 'Liked prediction');
      },
      { 
        isUserAction: true,
        successMessage: isLiked ? 'Unliked prediction' : 'Liked prediction',
      }
    );
  }, [isAuthenticated, isLiked, executeWithErrorHandling, predictionId]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: prediction?.title || 'Prediction',
          text: prediction?.description || 'Check out this prediction',
          url: window.location.href,
        });
        showSuccessToast('Shared successfully');
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          showErrorToast('Failed to share');
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        showSuccessToast('Link copied to clipboard');
      } catch (error) {
        showErrorToast('Failed to copy link');
      }
    }
  }, [prediction]);

  // Handle comment toggle
  const handleCommentToggle = useCallback(() => {
    setShowComments(!showComments);
    if (!showComments && commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showComments]);

  // Handle stake placement
  const handlePlaceBet = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthGate({ intent: 'place_prediction', payload: { predictionId } });
      return;
    }

    if (!selectedOption || !stakeAmount) {
      showErrorToast('Please select an option and enter stake amount');
      return;
    }

    setIsPlacingBet(true);

    await executeWithErrorHandling(
      async () => {
        // TODO: Implement bet placement
        qaLog('[PredictionDetailsContent] Placing stake:', { selectedOption, stakeAmount });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        showSuccessToast(`${L("betPlaced")} successfully`);
        setSelectedOption(null);
        setStakeAmount('');
      },
      { 
        isUserAction: true,
        successMessage: `${L("betPlaced")} successfully`,
      }
    );

    setIsPlacingBet(false);
  }, [isAuthenticated, selectedOption, stakeAmount, executeWithErrorHandling, predictionId]);

  // Format time remaining
  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading prediction details..." size="lg" />;
  }

  // Error state
  if (error) {
    return (
      <ErrorBanner
        error={error}
        onRetry={loadPrediction}
        showRetry={true}
        type="error"
      />
    );
  }

  // Missing prediction
  if (!prediction) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Prediction Not Found"
        description="The prediction you're looking for doesn't exist or has been removed."
        action={{
          label: "Go Back",
          onClick: () => onNavigateBack?.(),
        }}
      />
    );
  }

  const entryDeadline = prediction.entryDeadline ?? prediction.entry_deadline ?? '';

  // Render prediction details
  return (
    <div className="space-y-6">
      {/* Prediction Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {prediction.title}
            </h1>
            <p className="text-gray-600 leading-relaxed">
              {prediction.description}
            </p>
          </div>
        </div>

        {/* Creator Info */}
        {!creatorMissing ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {prediction.creator?.username || 'Unknown User'}
              </p>
              <p className="text-sm text-gray-500">
                {prediction.creator?.full_name || prediction.creator?.username || 'User'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Creator Unavailable</p>
              <p className="text-sm text-yellow-600">
                This prediction's creator is no longer available
              </p>
            </div>
          </div>
        )}

        {/* Prediction Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Time Left</p>
            <p className="font-semibold text-gray-900">
              {entryDeadline ? formatTimeRemaining(entryDeadline) : 'TBD'}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Total Staked</p>
            <p className="font-semibold text-gray-900">
              ${prediction.pool_total || '0'}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-sm text-gray-500">Participants</p>
            <p className="font-semibold text-gray-900">
              {prediction.participant_count || '0'}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold text-gray-900 capitalize">
              {prediction.status || 'active'}
            </p>
          </div>
        </div>

        {/* Engagement Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isLiked 
                ? 'bg-red-100 text-red-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </button>
          
          <button
            onClick={handleCommentToggle}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Stake Options */}
      {prediction.options && prediction.options.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Stake Options</h2>
          <div className="space-y-3">
            {prediction.options.map((option: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                  selectedOption === option.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthGate({ intent: 'place_prediction', payload: { predictionId } });
                    return;
                  }
                  setSelectedOption(option.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">
                      {option.total_staked ? `${option.total_staked} staked` : 'No stakes yet'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {option.current_odds ? `${option.current_odds}x` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">{L("odds")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Stake Input or Auth Required */}
          {selectedOption && isAuthenticated ? (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stake Amount
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="1"
                />
                <button
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || !stakeAmount}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPlacingBet ? `${L("betVerb")}...` : L("betVerb")}
                </button>
              </div>
            </div>
          ) : selectedOption && !isAuthenticated ? (
            <div className="mt-6">
              <AuthRequiredState
                icon={<TrendingUp />}
                title={`Sign in to ${L("betVerb").toLowerCase()}`}
                description="Create an account or sign in to make predictions and win rewards."
                intent="place_prediction"
                payload={{ predictionId }}
                className="py-8"
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div ref={commentsRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Comments</h2>
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Comments will be available soon</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionDetailsContent;
