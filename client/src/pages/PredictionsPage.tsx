import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuthStore } from '../store/authStore';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { usePredictionStore } from '../store/predictionStore';
import { openAuthGate } from '../auth/authGateAdapter';
import SignedOutGateCard from '../components/auth/SignedOutGateCard';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Plus, 
  Settings,
  Share2
} from 'lucide-react';
import ManagePredictionModal from '../components/modals/ManagePredictionModal';
import { cn } from '../utils/cn';
import { AppHeader } from '../components/layout/AppHeader';

// Production BetsTab Component - Extracted from production bundle
const PredictionsPage: React.FC<{ onNavigateToDiscover?: () => void }> = ({ onNavigateToDiscover }) => {
  const [, setLocation] = useLocation();
  const { 
    predictions, 
    getUserCreatedPredictions, 
    fetchUserCreatedPredictions, 
    fetchUserPredictionEntries, 
    getUserPredictionEntries, 
    loading 
  } = usePredictionStore();
  const { user: storeUser, isAuthenticated: storeAuthenticated } = useAuthStore();
  const { user: sessionUser, initialized: sessionInitialized } = useAuthSession();
  
  // Use session as source of truth for authentication, fallback to store
  const isAuthenticated = sessionUser ? true : storeAuthenticated;
  const user = sessionUser ? {
    id: sessionUser.id,
    firstName: sessionUser.user_metadata?.firstName || sessionUser.user_metadata?.first_name || sessionUser.user_metadata?.full_name?.split(' ')[0] || 'User',
    lastName: sessionUser.user_metadata?.lastName || sessionUser.user_metadata?.last_name || sessionUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: sessionUser.email || '',
    phone: sessionUser.phone,
    avatar: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
    provider: sessionUser.app_metadata?.provider || 'email',
    createdAt: sessionUser.created_at
  } : storeUser;

  const [activeTab, setActiveTab] = useState("Active");
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Helper function to get time remaining with proper status context
  const getTimeRemaining = (deadline: string, predictionStatus?: string) => {
    if (!deadline) return "Unknown";
    
    const now = new Date().getTime();
    const end = new Date(deadline).getTime() - now;
    
    // Handle different prediction states
    if (predictionStatus === 'closed') return "Closed";
    if (predictionStatus === 'settled') return "Settled";
    if (predictionStatus === 'awaiting_settlement') return "Awaiting Settlement";
    if (predictionStatus === 'disputed') return "Disputed";
    if (predictionStatus === 'refunded') return "Refunded";
    if (predictionStatus === 'ended') return "Ended";
    
    // Time-based logic for active predictions
    if (end <= 0) return "Ended";
    
    const days = Math.floor(end / (1000 * 60 * 60 * 24));
    const hours = Math.floor((end % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Helper function to calculate confidence
  const calculateConfidence = (prediction: any) => {
    if (!prediction || !prediction.options) return 68;
    const totalStaked = prediction.options.reduce((sum: number, option: any) => sum + (option.total_staked || 0), 0);
    if (totalStaked === 0) return 68;
    const maxStaked = Math.max(...prediction.options.map((option: any) => option.total_staked || 0));
    return Math.round((maxStaked / totalStaked) * 100);
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ behavior: 'instant' });
  }, []);

  // Fetch user data
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;
    
    let isMounted = true;
    let hasStarted = false;
    
    const timeout = setTimeout(() => {
      if (!isMounted || hasStarted) return;
      console.log('📊 BetsTab: Fetching data for user:', user.id);
      fetchUserCreatedPredictions(user.id);
      fetchUserPredictionEntries(user.id);
      hasStarted = true;
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [user?.id, isAuthenticated]);

  // Get counts for tabs
  const getCounts = () => {
    if (!isAuthenticated || !user) return { active: 0, created: 0, completed: 0 };
    
    const userCreated = getUserCreatedPredictions(user.id);
    const userEntries = getUserPredictionEntries(user.id);
    
    // Count active entries (same logic as getUserPredictions)
    const activeEntries = userEntries.filter(entry => {
      const prediction = (entry as any).prediction || predictions.find(p => p.id === entry.prediction_id);
      if (!prediction) return false;
      
      const isOpen = prediction.status === 'open';
      const beforeDeadline = new Date(prediction.entry_deadline) > new Date();
      const entryActive = entry.status === 'active';
      
      return isOpen && beforeDeadline && entryActive;
    });
    
    // Count created predictions (only open and before deadline)
    const activeCreated = userCreated.filter(prediction => {
      // Include predictions that need management: open, closed, or awaiting settlement
      const needsManagement = prediction.status === 'open' || 
                             prediction.status === 'closed' || 
                             prediction.status === 'awaiting_settlement';
      return needsManagement;
    });
    
    // Count completed entries (settled or ended)
    const completedEntries = userEntries.filter(entry => {
      const prediction = (entry as any).prediction || predictions.find(p => p.id === entry.prediction_id);
      if (!prediction) return false;
      
      const isSettled = entry.status === 'won' || entry.status === 'lost';
      const predictionEnded = prediction.status === 'closed' || prediction.status === 'settled' || prediction.status === 'ended';
      const pastDeadline = new Date(prediction.entry_deadline) <= new Date();
      
      return isSettled || predictionEnded || pastDeadline;
    });
    
    return {
      active: activeEntries.length,
      created: activeCreated.length,
      completed: completedEntries.length
    };
  };

  const counts = getCounts();

  // Tab configuration
  const tabs = [
    { id: 'Active', label: 'Active', icon: TrendingUp, count: counts.active },
    { id: 'Created', label: 'Created', icon: Target, count: counts.created },
    { id: 'Completed', label: 'Completed', icon: CheckCircle, count: counts.completed }
  ];

  // Get user predictions data
  const getUserPredictions = () => {
    if (!isAuthenticated || !user) {
      return { Active: [], Created: [], Completed: [] };
    }

    const userEntries = getUserPredictionEntries(user.id);
    const userCreated = getUserCreatedPredictions(user.id);
    
    const activePredictions = userEntries
      .filter(entry => {
        const prediction = (entry as any).prediction || predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) return false;
        
        // Check if prediction is still active (not ended/closed/settled and before deadline)
        const isOpen = prediction.status === 'open';
        const beforeDeadline = new Date(prediction.entry_deadline) > new Date();
        const entryActive = entry.status === 'active';
        
        return isOpen && beforeDeadline && entryActive;
      })
      .map(entry => {
        const prediction = (entry as any).prediction || predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) {
          console.warn('⚠️ No prediction found for entry:', entry.id);
          return null;
        }

        const option = (entry as any).option || prediction.options?.find(o => o.id === entry.option_id);
        const timeRemaining = getTimeRemaining(prediction.entry_deadline, prediction.status);
        
        return {
          id: entry.id,
          title: prediction.title,
          category: prediction.category,
          position: option?.label || 'Unknown',
          stake: entry.amount,
          potentialReturn: entry.potential_payout || 0,
          odds: entry.potential_payout ? `${(entry.potential_payout / entry.amount).toFixed(2)}x` : '1.00x',
          timeRemaining,
          status: 'active',
          participants: prediction.participant_count || 0,
          confidence: calculateConfidence(prediction)
        };
      })
      .filter(Boolean);

    const createdPredictions = userCreated
      .filter(prediction => {
        // Show predictions that need management: open, closed, or awaiting settlement
        const needsManagement = prediction.status === 'open' || 
                               prediction.status === 'closed' || 
                               prediction.status === 'awaiting_settlement';
        return needsManagement;
      })
      .map(prediction => {
        // Determine the actual status based on current time and prediction state
        let actualStatus = prediction.status;
        const now = new Date();
        const deadline = new Date(prediction.entry_deadline);
        
        // If prediction is still "open" but deadline has passed, it should be considered "ended"
        if (actualStatus === 'open' && deadline <= now) {
          actualStatus = 'ended';
        }
        
        const timeRemaining = getTimeRemaining(prediction.entry_deadline, actualStatus);
        
        return {
          id: prediction.id,
          title: prediction.title,
          category: prediction.category,
          totalPool: prediction.pool_total || 0,
          participants: prediction.participant_count || 0,
          timeRemaining,
          status: actualStatus,
          yourCut: prediction.creator_fee_percentage || 3.5,
          description: prediction.description,
          pool_total: prediction.pool_total,
          participant_count: prediction.participant_count,
          creator_fee_percentage: prediction.creator_fee_percentage,
          entry_deadline: prediction.entry_deadline
        };
      });

    const completedPredictions = userEntries
      .filter(entry => {
        const prediction = (entry as any).prediction || predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) return false;
        
        // Include entries that are settled (won/lost) OR predictions that have ended
        const isSettled = entry.status === 'won' || entry.status === 'lost';
        const predictionEnded = prediction.status === 'closed' || prediction.status === 'settled' || prediction.status === 'ended';
        const pastDeadline = new Date(prediction.entry_deadline) <= new Date();
        
        return isSettled || predictionEnded || pastDeadline;
      })
      .map(entry => {
        const prediction = (entry as any).prediction || predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) {
          console.warn('⚠️ No prediction found for completed entry:', entry.id);
        return null;
    }

        const option = (entry as any).option || prediction.options?.find(o => o.id === entry.option_id);
        const profit = (entry.actual_payout || 0) - entry.amount;
        
        // Determine display status and time with proper terminology
        let displayStatus: 'active' | 'won' | 'lost' | 'refunded' = entry.status;
        let timeLabel = "";
        
        if (prediction.status === 'settled' && (entry.status === 'won' || entry.status === 'lost')) {
          timeLabel = `Settled on ${new Date(entry.updated_at).toLocaleDateString()}`;
        } else if (prediction.status === 'closed') {
          timeLabel = "Closed - Awaiting Settlement";
        } else if (prediction.status === 'awaiting_settlement') {
          timeLabel = "Awaiting Settlement";
        } else if (prediction.status === 'disputed') {
          timeLabel = "Settlement Disputed";
        } else if (prediction.status === 'refunded') {
          timeLabel = `Refunded on ${new Date(prediction.updated_at || prediction.created_at).toLocaleDateString()}`;
        } else if (new Date(prediction.entry_deadline) <= new Date()) {
          timeLabel = `Ended on ${new Date(prediction.entry_deadline).toLocaleDateString()}`;
          // Keep the original status for ended predictions that haven't been settled
          if (entry.status === 'active') {
            displayStatus = 'active'; // Will show as "pending settlement" in UI
          }
        } else {
          timeLabel = getTimeRemaining(prediction.entry_deadline, prediction.status);
        }
        
        return {
          id: entry.id,
          title: prediction.title,
          category: prediction.category,
          position: option?.label || 'Unknown',
          stake: entry.amount,
          actualReturn: entry.actual_payout || 0,
          profit,
          status: displayStatus,
          participants: prediction.participant_count || 0,
          settledAt: timeLabel
        };
      })
      .filter(Boolean);

    return {
      Active: activePredictions,
      Created: createdPredictions,
      Completed: completedPredictions
    };
  };

  const userPredictions = useMemo(() => {
    try {
      return getUserPredictions();
    } catch (error) {
      console.error('Error getting user predictions:', error);
      return { Active: [], Created: [], Completed: [] };
    }
  }, [user?.id, isAuthenticated, predictions, activeTab]);

  const currentPredictions = userPredictions[activeTab] || [];

  // Helper functions for styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'winning': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'losing': return 'bg-red-50 text-red-700 border-red-200';
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => ({
    'custom': 'bg-orange-100 text-orange-700',
    'sports': 'bg-blue-100 text-blue-700',
    'esports': 'bg-purple-100 text-purple-700',
    'pop_culture': 'bg-pink-100 text-pink-700',
    'politics': 'bg-red-100 text-red-700',
    'celebrity_gossip': 'bg-emerald-100 text-emerald-700'
  })[category] || 'bg-gray-100 text-gray-700';

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <>
        <AppHeader title="My Bets" />
        <div className="min-h-screen bg-gray-50 px-4 py-6">
          <SignedOutGateCard
            icon={<TrendingUp />}
            title="Sign in to view your predictions"
            body="See your portfolio, performance, and history."
            intent="view_my_bets"
            primaryLabel="Sign In"
          />
        </div>
      </>
    );
  }

  // Contextual empty state component
  const EmptyState = ({ tab }: { tab: string }) => {
    const emptyStateConfig = {
      'Active': {
        icon: TrendingUp,
        title: 'No active predictions',
        description: "You haven't placed any bets yet. Start by exploring trending topics and making your first prediction!",
        buttonText: 'Discover Predictions',
        buttonColor: 'from-emerald-500 to-emerald-600',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-500'
      },
      'Created': {
        icon: Target,
        title: 'No predictions created',
        description: "Share your insights with the community! Create predictions and earn fees when others participate.",
        buttonText: 'Create Prediction',
        buttonColor: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-500'
      },
      'Completed': {
        icon: CheckCircle,
        title: 'No completed predictions',
        description: "Your prediction history and earnings will appear here as you complete predictions.",
        buttonText: 'Browse Active Predictions',
        buttonColor: 'from-purple-500 to-purple-600',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-500'
      }
    };

    const config = emptyStateConfig[tab];
    const Icon = config.icon;

  return (
    <motion.div 
        className="flex flex-col items-center justify-center py-20 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Animated Icon */}
        <motion.div 
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-6",
            config.iconBg
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.2 
          }}
        >
          <motion.div 
            initial={{ rotateY: -180 }}
            animate={{ rotateY: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Icon className={cn("w-10 h-10", config.iconColor)} />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h3 
          className="text-xl font-bold text-gray-900 mb-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {config.title}
        </motion.h3>

        {/* Description */}
        <motion.p 
          className="text-gray-600 text-center mb-8 max-w-md leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {config.description}
        </motion.p>

        {/* Action Button */}
        <motion.button
          className={cn(
            "bg-gradient-to-r text-white px-8 py-3 rounded-xl font-semibold",
            "transition-all duration-200 flex items-center gap-2 shadow-lg",
            "hover:shadow-xl hover:scale-105 active:scale-95",
            `${config.buttonColor}`
          )}
          onClick={() => {
            if (tab === 'Created') {
              setLocation('/create');
              window.scrollTo({ behavior: 'instant' });
            } else {
              onNavigateToDiscover && onNavigateToDiscover();
            }
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          {config.buttonText}
        </motion.button>
      </motion.div>
    );
  };

  // Active prediction card
  const ActivePredictionCard = ({ prediction }: { prediction: any }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(prediction.category)}`}>
              {prediction.category.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(prediction.status)}`}>
              Active
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{prediction.title}</h3>
              </div>
            </div>
      
      <div className="bg-emerald-50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-800">Your Position</span>
          <span className="text-lg font-bold text-emerald-700">{prediction.position}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className="text-xs text-emerald-600 mb-1">Staked</p>
            <p className="font-semibold text-emerald-900">${prediction.stake.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 mb-1">Potential</p>
            <p className="font-semibold text-emerald-900">${prediction.potentialReturn.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 mb-1">Odds</p>
            <p className="font-semibold text-emerald-900">{prediction.odds}</p>
              </div>
            </div>
          </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Market Confidence</span>
          <span className="text-sm font-medium text-gray-900">{prediction.confidence}%</span>
            </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${prediction.confidence}%` }}
              />
            </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{prediction.participants} participants</span>
        <span className={`font-medium ${
          prediction.timeRemaining.includes('Closed') || 
          prediction.timeRemaining.includes('Settled') || 
          prediction.timeRemaining.includes('Disputed') || 
          prediction.timeRemaining.includes('Ended') ? 'text-red-600' :
          prediction.timeRemaining.includes('Awaiting') ? 'text-yellow-600' :
          'text-amber-600'
        }`}>
          {(prediction.timeRemaining.includes('h') || prediction.timeRemaining.includes('d')) && 
           !prediction.timeRemaining.includes('Closed') && 
           !prediction.timeRemaining.includes('Ended') && 
           !prediction.timeRemaining.includes('Settled') && 
           !prediction.timeRemaining.includes('Disputed') && 
           !prediction.timeRemaining.includes('Awaiting') ? 
            `${prediction.timeRemaining} left` : 
            prediction.timeRemaining
          }
        </span>
      </div>
    </div>
  );

  // Created prediction card
  const CreatedPredictionCard = ({ prediction }: { prediction: any }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(prediction.category)}`}>
              {prediction.category.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
              {prediction.status === 'open' ? 'Open' : prediction.status}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{prediction.title}</h3>
          </div>
        </div>

      <div className="bg-blue-50 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-600 mb-1">Total Pool</p>
            <p className="font-semibold text-blue-900">${prediction.totalPool.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">Participants</p>
            <p className="font-semibold text-blue-900">{prediction.participants}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">Your Cut</p>
            <p className="font-semibold text-blue-900">{prediction.yourCut}%</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-sm ${
          prediction.timeRemaining.includes('Closed') || 
          prediction.timeRemaining.includes('Settled') || 
          prediction.timeRemaining.includes('Disputed') || 
          prediction.timeRemaining.includes('Ended') ? 'text-red-600' :
          prediction.timeRemaining.includes('Awaiting') ? 'text-yellow-600' :
          'text-gray-500'
        }`}>
          {(prediction.timeRemaining.includes('h') || prediction.timeRemaining.includes('d')) && 
           !prediction.timeRemaining.includes('Closed') && 
           !prediction.timeRemaining.includes('Ended') && 
           !prediction.timeRemaining.includes('Settled') && 
           !prediction.timeRemaining.includes('Disputed') && 
           !prediction.timeRemaining.includes('Awaiting') ? 
            `Closes in ${prediction.timeRemaining}` : 
            prediction.timeRemaining
          }
        </span>
        <button
          onClick={() => {
            setSelectedPrediction(prediction);
            setShowManageModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-blue-700 transition-colors"
        >
          Manage <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Completed prediction card
  const CompletedPredictionCard = ({ prediction }: { prediction: any }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(prediction.category)}`}>
              {prediction.category.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
              prediction.status === 'won' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {prediction.status === 'won' ? 'Won' : 'Lost'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{prediction.title}</h3>
        </div>
      </div>

      <div className={`rounded-xl p-4 mb-4 ${prediction.status === 'won' ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${prediction.status === 'won' ? 'text-emerald-800' : 'text-red-800'}`}>
            Your Position: {prediction.position}
          </span>
          <span className={`text-lg font-bold ${prediction.status === 'won' ? 'text-emerald-700' : 'text-red-700'}`}>
            {prediction.profit >= 0 ? '+' : ''}${Math.abs(prediction.profit).toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className={`text-xs mb-1 ${prediction.status === 'won' ? 'text-emerald-600' : 'text-red-600'}`}>Staked</p>
            <p className={`font-semibold ${prediction.status === 'won' ? 'text-emerald-900' : 'text-red-900'}`}>
              ${prediction.stake.toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${prediction.status === 'won' ? 'text-emerald-600' : 'text-red-600'}`}>Returned</p>
            <p className={`font-semibold ${prediction.status === 'won' ? 'text-emerald-900' : 'text-red-900'}`}>
              ${prediction.actualReturn.toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${prediction.status === 'won' ? 'text-emerald-600' : 'text-red-600'}`}>Profit/Loss</p>
            <p className={`font-semibold ${prediction.status === 'won' ? 'text-emerald-900' : 'text-red-900'}`}>
              {prediction.profit >= 0 ? '+' : ''}${Math.abs(prediction.profit).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{prediction.participants} participants</span>
        <span>Settled {prediction.settledAt}</span>
      </div>
      </div>
  );

  return (
    <>
      <AppHeader title="My Bets" />
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4 inline mr-1" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === 'Active' ? 'Active' : tab.id === 'Created' ? 'Created' : 'Complete'}</span>
                  {tab.count > 0 && (
                    <span className={cn(
                      "ml-1 px-2 py-0.5 rounded-full text-xs font-semibold inline-block",
                      activeTab === tab.id 
                        ? 'bg-emerald-200 text-emerald-900' 
                        : 'bg-gray-200 text-gray-600'
                    )}>
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">Loading predictions...</span>
            </div>
          ) : currentPredictions.length > 0 ? (
            <div className="space-y-4">
              {activeTab === 'Active' && currentPredictions.map((prediction, index) => 
                !prediction || typeof prediction.id === 'undefined' ? (
                  console.warn('Invalid prediction object:', prediction), null
                ) : (
                  <ActivePredictionCard key={`active-${prediction.id}-${index}`} prediction={prediction} />
                )
              )}
              {activeTab === 'Created' && currentPredictions.map((prediction, index) => 
                !prediction || typeof prediction.id === 'undefined' ? (
                  console.warn('Invalid prediction object:', prediction), null
                ) : (
                  <CreatedPredictionCard key={`created-${prediction.id}-${index}`} prediction={prediction} />
                )
              )}
              {activeTab === 'Completed' && currentPredictions.map((prediction, index) => 
                !prediction || typeof prediction.id === 'undefined' ? (
                  console.warn('Invalid prediction object:', prediction), null
                ) : (
                  <CompletedPredictionCard key={`completed-${prediction.id}-${index}`} prediction={prediction} />
                )
              )}
            </div>
          ) : (
            <EmptyState tab={activeTab} />
          )}
        </div>
      </div>

      {/* Manage Prediction Modal */}
      {selectedPrediction && (
        <ManagePredictionModal
          isOpen={showManageModal}
          onClose={() => {
            setShowManageModal(false);
            setSelectedPrediction(null);
          }}
          prediction={{
            id: (selectedPrediction as any).id,
            title: (selectedPrediction as any).title,
            category: (selectedPrediction as any).category,
            totalPool:
              (selectedPrediction as any).totalPool ||
              (selectedPrediction as any).pool_total ||
              0,
            participants:
              (selectedPrediction as any).participants ||
              (selectedPrediction as any).participant_count ||
              0,
            timeRemaining: (selectedPrediction as any).timeRemaining || '0h',
            yourCut:
              (selectedPrediction as any).yourCut ||
              (selectedPrediction as any).creator_fee_percentage ||
              3.5,
            status: (selectedPrediction as any).status || 'open',
            description: (selectedPrediction as any).description,
            pool_total: (selectedPrediction as any).pool_total,
            participant_count: (selectedPrediction as any).participant_count,
            creator_fee_percentage: (selectedPrediction as any).creator_fee_percentage,
            entry_deadline: (selectedPrediction as any).entry_deadline,
          }}
        />
      )}
    </>
  );
};

export default PredictionsPage;