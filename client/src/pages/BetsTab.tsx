import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Plus, 
  Settings,
  Share2
} from 'lucide-react';

// Production BetsTab Component - Extracted from production bundle
const BetsTab: React.FC<{ onNavigateToDiscover?: () => void }> = ({ onNavigateToDiscover }) => {
  const [, setLocation] = useLocation();
  const { 
    predictions, 
    getUserCreatedPredictions, 
    fetchUserCreatedPredictions, 
    fetchUserPredictionEntries, 
    getUserPredictionEntries, 
    loading 
  } = usePredictionStore();
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState("Active");
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Helper function to get time remaining
  const getTimeRemaining = (deadline: string) => {
    if (!deadline) return "2d 14h";
    const now = new Date().getTime();
    const end = new Date(deadline).getTime() - now;
    if (end <= 0) return "Ended";
    
    const days = Math.floor(end / (1000 * 60 * 60 * 24));
    const hours = Math.floor((end % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
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
    
    const activeEntries = userEntries.filter(entry => entry.status === 'active');
    const completedEntries = userEntries.filter(entry => entry.status === 'won' || entry.status === 'lost');
    
    return {
      active: activeEntries.length,
      created: userCreated.length,
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
      .filter(entry => entry.status === 'active')
      .map(entry => {
        const prediction = entry.prediction || predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) {
          console.warn('⚠️ No prediction found for entry:', entry.id);
          return null;
        }

        const option = entry.option || prediction.options?.find(o => o.id === entry.option_id);
        const timeRemaining = getTimeRemaining(prediction.entry_deadline);
        
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

    const createdPredictions = userCreated.map(prediction => {
      const timeRemaining = getTimeRemaining(prediction.entry_deadline);
      
      return {
        id: prediction.id,
        title: prediction.title,
        category: prediction.category,
        totalPool: prediction.pool_total || 0,
        participants: prediction.participant_count || 0,
        timeRemaining,
        status: prediction.status,
        yourCut: prediction.creator_fee_percentage || 3.5,
        description: prediction.description,
        pool_total: prediction.pool_total,
        participant_count: prediction.participant_count,
        creator_fee_percentage: prediction.creator_fee_percentage,
        entry_deadline: prediction.entry_deadline
      };
    });

    const completedPredictions = userEntries
      .filter(entry => entry.status === 'won' || entry.status === 'lost')
      .map(entry => {
        const prediction = entry.prediction || predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) {
          console.warn('⚠️ No prediction found for completed entry:', entry.id);
          return null;
        }

        const option = entry.option || prediction.options?.find(o => o.id === entry.option_id);
        const profit = (entry.actual_payout || 0) - entry.amount;
        
        return {
          id: entry.id,
          title: prediction.title,
          category: prediction.category,
          position: option?.label || 'Unknown',
          stake: entry.amount,
          actualReturn: entry.actual_payout || 0,
          profit,
          status: entry.status,
          participants: prediction.participant_count || 0,
          settledAt: new Date(entry.updated_at).toLocaleDateString()
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
      case 'winning': return 'bg-green-50 text-green-700 border-green-200';
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
    'celebrity_gossip': 'bg-green-100 text-green-700'
  })[category] || 'bg-gray-100 text-gray-700';

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">My Predictions</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Target className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view your predictions</h3>
          <p className="text-gray-600 text-center mb-8 max-w-sm">
            Create an account or sign in to track your predictions, manage your portfolio, and engage with the community.
          </p>
          <motion.button
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            onClick={() => { onNavigateToDiscover && onNavigateToDiscover(); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            Explore Predictions
          </motion.button>
        </div>
      </div>
    );
  }

  // Empty state component
  const EmptyState = ({ tab }: { tab: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        {tab === 'Active' && <TrendingUp className="w-10 h-10 text-gray-400" />}
        {tab === 'Created' && <Target className="w-10 h-10 text-gray-400" />}
        {tab === 'Completed' && <CheckCircle className="w-10 h-10 text-gray-400" />}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No {tab.toLowerCase()} predictions</h3>
      <p className="text-gray-600 text-center mb-8 max-w-sm">
        {tab === 'Active' && "You haven't made any predictions yet. Start by exploring trending topics!"}
        {tab === 'Created' && "You haven't created any predictions yet. Share your insights with the community!"}
        {tab === 'Completed' && "Your prediction history will appear here once you complete some predictions."}
      </p>
      <motion.button
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
        onClick={() => {
          if (tab === 'Created') {
            setLocation('/create');
            window.scrollTo({ behavior: 'instant' });
          } else {
            onNavigateToDiscover && onNavigateToDiscover();
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-5 h-5" />
        {tab === 'Created' ? 'Create Prediction' : 'Explore Predictions'}
      </motion.button>
    </div>
  );

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
        <span className="font-medium text-amber-600">{prediction.timeRemaining} left</span>
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
        <span className="text-sm text-gray-500">Closes in {prediction.timeRemaining}</span>
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
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {prediction.status === 'won' ? 'Won' : 'Lost'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{prediction.title}</h3>
        </div>
      </div>
      
      <div className={`rounded-xl p-4 mb-4 ${prediction.status === 'won' ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${prediction.status === 'won' ? 'text-green-800' : 'text-red-800'}`}>
            Your Position: {prediction.position}
          </span>
          <span className={`text-lg font-bold ${prediction.status === 'won' ? 'text-green-700' : 'text-red-700'}`}>
            {prediction.profit >= 0 ? '+' : ''}${Math.abs(prediction.profit).toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className={`text-xs mb-1 ${prediction.status === 'won' ? 'text-green-600' : 'text-red-600'}`}>Staked</p>
            <p className={`font-semibold ${prediction.status === 'won' ? 'text-green-900' : 'text-red-900'}`}>
              ${prediction.stake.toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${prediction.status === 'won' ? 'text-green-600' : 'text-red-600'}`}>Returned</p>
            <p className={`font-semibold ${prediction.status === 'won' ? 'text-green-900' : 'text-red-900'}`}>
              ${prediction.actualReturn.toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`text-xs mb-1 ${prediction.status === 'won' ? 'text-green-600' : 'text-red-600'}`}>Profit/Loss</p>
            <p className={`font-semibold ${prediction.status === 'won' ? 'text-green-900' : 'text-red-900'}`}>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Predictions</h1>
          
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl" data-tour-id="bets-tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
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
  );
};

export default BetsTab;
