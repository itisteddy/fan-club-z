import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Target, CheckCircle, Plus, ArrowRight, Sparkles, Users, Clock, DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { scrollToTop } from '../utils/scroll';
import { formatTimeRemaining } from '../lib/utils';
import { Prediction } from '../store/predictionStore';
import BetCard from '../components/BetCard';
import ManagePredictionModal from '../components/modals/ManagePredictionModal';
import { openAuthGate } from '../auth/authGateAdapter';

interface BetsTabProps {
  onNavigateToDiscover?: () => void;
}

const BetsTab: React.FC<BetsTabProps> = ({ onNavigateToDiscover }) => {
  const [, setLocation] = useLocation();
  const { 
    predictions, 
    getUserCreatedPredictions, 
    fetchUserCreatedPredictions, 
    getUserPredictionEntries,
    fetchUserPredictionEntries,
    loading 
  } = usePredictionStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('Active');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  // Fetch user's created predictions when component mounts or user changes
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      const timeoutId = setTimeout(() => {
        fetchUserCreatedPredictions(user.id);
        fetchUserPredictionEntries(user.id);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, isAuthenticated, fetchUserCreatedPredictions, fetchUserPredictionEntries]);
  
  // Get real prediction entries from the database
  const getPredictionEntries = () => {
    if (!isAuthenticated || !user) return [];
    return getUserPredictionEntries(user.id);
  };

  // Get completed predictions
  const getCompletedPredictions = () => {
    if (!isAuthenticated || !user) return [];
    const userEntries = getUserPredictionEntries(user.id);
    return userEntries.filter(entry => entry.status === 'won' || entry.status === 'lost');
  };

  // Get dynamic counts based on actual data
  const getUserPredictionCounts = () => {
    if (!isAuthenticated || !user) {
      return { active: 0, created: 0, completed: 0 };
    }

    const userCreatedPredictions = getUserCreatedPredictions(user.id);
    const predictionEntries = getPredictionEntries();
    const completedPredictions = getCompletedPredictions();
    
    return {
      active: predictionEntries.filter(entry => entry.status === 'active').length,
      created: userCreatedPredictions.length,
      completed: completedPredictions.length
    };
  };

  const counts = getUserPredictionCounts();
  
  const tabs = [
    { id: 'Active', label: 'Active', icon: TrendingUp, count: counts.active, color: 'emerald' },
    { id: 'Created', label: 'Created', icon: Target, count: counts.created, color: 'blue' },
    { id: 'Completed', label: 'Completed', icon: CheckCircle, count: counts.completed, color: 'purple' }
  ];

  // Enhanced user predictions data with better mock data
  const getUserPredictions = () => {
    if (!isAuthenticated || !user) {
      return { Active: [], Created: [], Completed: [] };
    }

    const userEntries = getPredictionEntries();
    
    const activePredictions = userEntries
      .filter(entry => entry.status === 'active')
      .map(entry => {
        const prediction = predictions.find(p => p.id === entry.predictionId);
        const option = prediction?.options.find(o => o.id === entry.optionId);
        return {
          id: entry.id,
          title: prediction?.title || 'Unknown Prediction',
          category: prediction?.category || 'General',
          position: option?.label || 'Unknown',
          stake: entry.amount,
          potentialReturn: entry.potentialPayout || 0,
          odds: `${((entry.potentialPayout || 0) / entry.amount).toFixed(2)}x`,
          timeRemaining: getTimeRemaining(prediction?.entry_deadline),
          status: 'active',
          participants: prediction?.participant_count || 0,
          confidence: calculateConfidence(prediction),
          trend: false ? 'up' : 'down',
          isHot: Math.random() > 0.7
        };
      });

    const createdPredictions = getUserCreatedPredictions(user.id)
      .map(prediction => {
        const recentActivity = [
          {
            id: '1',
            type: 'participant_joined' as const,
            description: 'New participant joined',
            amount: 75,
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            timeAgo: '2 minutes ago'
          },
          {
            id: '2',
            type: 'prediction_placed' as const,
            description: 'Large prediction placed',
            amount: 200,
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            timeAgo: '15 minutes ago'
          }
        ];

        return {
          id: prediction.id,
          title: prediction.title,
          category: prediction.category,
          totalPool: prediction.pool_total || 0,
          participants: prediction.participant_count || 0,
          timeRemaining: getTimeRemaining(prediction.entry_deadline),
          status: prediction.status,
          yourCut: 3.5,
          description: prediction.description,
          recentActivity,
          growth: false ? 'growing' : 'stable',
          isPopular: Math.random() > 0.6
        };
      });

    return {
      Active: activePredictions,
      Created: createdPredictions,
      Completed: []
    };
  };

  const getTimeRemaining = (deadline: Date | string | undefined) => {
    if (!deadline) return '2d 14h';
    const now = new Date().getTime();
    const deadlineTime = new Date(deadline).getTime();
    const diff = deadlineTime - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const calculateConfidence = (prediction: Prediction | undefined) => {
    if (!prediction || !prediction.options) return 68;
    const totalStaked = prediction.options.reduce((sum, option) => sum + option.totalStaked, 0);
    if (totalStaked === 0) return 68;
    const maxStaked = Math.max(...prediction.options.map(option => option.totalStaked));
    return Math.round((maxStaked / totalStaked) * 100);
  };

  const mockPredictions = getUserPredictions();
  const currentPredictions = mockPredictions[activeTab] || [];

  // Enhanced category colors with more vibrant palette
  const getCategoryColor = (category: string) => {
    const colors = {
      'crypto': 'bg-gradient-to-r from-orange-400 to-amber-400 text-white',
      'sports': 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white',
      'tech': 'bg-gradient-to-r from-purple-400 to-violet-400 text-white',
      'pop_culture': 'bg-gradient-to-r from-pink-400 to-rose-400 text-white',
      'politics': 'bg-gradient-to-r from-red-400 to-pink-400 text-white',
      'custom': 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white'
    };
    return colors[category.toLowerCase()] || 'bg-gradient-to-r from-gray-400 to-slate-400 text-white';
  };

  // Show enhanced authentication prompt if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Enhanced header with status bar */}
        <div className="h-11" />
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="px-6 pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
                My Predictions
              </h1>
              <p className="text-gray-600">Track your portfolio and earnings</p>
            </motion.div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl"
          >
            <Target className="w-16 h-16 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to start predicting?
            </h3>
            
            <p className="text-gray-600 text-center mb-8 max-w-sm leading-relaxed">
              Join thousands of predictors earning rewards for their insights. 
              Track your performance and build your reputation.
            </p>
          </motion.div>
          
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl"
            onClick={async () => {
              const result = await openAuthGate({ intent: 'view_my_bets' });
              if (result.status === 'success' && onNavigateToDiscover) {
                onNavigateToDiscover();
              }
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5" />
            Sign In to View Predictions
          </motion.button>
        </div>
      </div>
    );
  }

  // Enhanced Empty State with better visual design
  const EmptyState = ({ tab }: { tab: string }) => {
    const emptyStateConfig = {
      'Active': {
        icon: TrendingUp,
        title: 'No active predictions',
        description: 'Start making predictions to track your performance and earn rewards!',
        action: 'Start Predicting',
        gradient: 'from-emerald-400 to-teal-500'
      },
      'Created': {
        icon: Target,
        title: 'No predictions created',
        description: 'Share your insights and earn fees when others participate in your predictions!',
        action: 'Create Prediction',
        gradient: 'from-blue-400 to-cyan-500'
      },
      'Completed': {
        icon: CheckCircle,
        title: 'No completed predictions',
        description: 'Your prediction history and earnings will appear here as you complete predictions.',
        action: 'View Active',
        gradient: 'from-purple-400 to-violet-500'
      }
    };

    const config = emptyStateConfig[tab];
    const Icon = config.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center justify-center py-16 px-6"
      >
        <div className={`w-24 h-24 bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
          <Icon className="w-12 h-12 text-white" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {config.title}
        </h3>
        
        <p className="text-gray-600 text-center mb-8 max-w-sm leading-relaxed">
          {config.description}
        </p>
        
        <motion.button 
          className={`bg-gradient-to-r ${config.gradient} text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg`}
          onClick={() => {
            if (tab === 'Created') {
              setLocation('/create');
              scrollToTop({ behavior: 'instant' });
            } else {
              if (onNavigateToDiscover) {
                onNavigateToDiscover();
              }
            }
          }}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          {config.action}
        </motion.button>
      </motion.div>
    );
  };

  // Enhanced Active Prediction Card with modern design
  const ActivePredictionCard = ({ prediction }: { prediction: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-xl hover:border-teal-200 transition-all duration-300 group relative overflow-hidden"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative">
        {/* Header with enhanced badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(prediction.category)} shadow-sm`}>
                {prediction.category}
              </span>
              {prediction.isHot && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse">
                  🔥 Hot
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200">
                Active
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-teal-900 transition-colors">
              {prediction.title}
            </h3>
          </div>
          
          {/* Trend indicator */}
          {prediction.trend === 'up' && (
            <div className="text-teal-500 text-sm font-medium flex items-center gap-1">
              ↗ +2.4%
            </div>
          )}
        </div>

        {/* Enhanced Position Display */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 mb-4 border border-teal-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-teal-800 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Your Position
            </span>
            <span className="text-xl font-bold text-teal-700 bg-white px-3 py-1 rounded-full shadow-sm">
              {prediction.position}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-teal-600 mb-1 font-medium">Staked</p>
              <p className="font-bold text-teal-900 text-lg">${prediction.stake.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-teal-600 mb-1 font-medium">Potential</p>
              <p className="font-bold text-teal-900 text-lg">${prediction.potentialReturn.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-teal-600 mb-1 font-medium">Odds</p>
              <p className="font-bold text-teal-900 text-lg">{prediction.odds}</p>
            </div>
          </div>
        </div>

        {/* Enhanced Confidence Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Market Confidence
            </span>
            <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
              {prediction.confidence}%
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${prediction.confidence}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full relative"
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {prediction.participants}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Pool Growing
            </span>
          </div>
          <span className="font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {prediction.timeRemaining}
          </span>
        </div>
      </div>
    </motion.div>
  );

  // Enhanced Created Prediction Card
  const CreatedPredictionCard = ({ prediction }: { prediction: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-xl hover:border-blue-200 transition-all duration-300 group relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        {/* Enhanced Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(prediction.category)} shadow-sm`}>
                {prediction.category}
              </span>
              {prediction.isPopular && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                  ⭐ Popular
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                Open
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-900 transition-colors">
              {prediction.title}
            </h3>
          </div>
        </div>

        {/* Enhanced Creator Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 mb-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Creator Dashboard</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-blue-600 mb-1 font-medium">Total Pool</p>
              <p className="font-bold text-blue-900 text-lg">${prediction.totalPool.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-blue-600 mb-1 font-medium">Participants</p>
              <p className="font-bold text-blue-900 text-lg">{prediction.participants}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-blue-600 mb-1 font-medium">Your Cut</p>
              <p className="font-bold text-blue-900 text-lg">{prediction.yourCut}%</p>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            Closes in {formatTimeRemaining(prediction.entry_deadline || prediction.timeRemaining)}
          </div>
          <motion.button
            onClick={() => {
              setSelectedPrediction(prediction);
              setIsManageModalOpen(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            Manage
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Enhanced Header with status bar */}
      <div className="h-11" />
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-11 z-40">
        <div className="px-6 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
              My Predictions
            </h1>
            <p className="text-gray-600">Track your portfolio and earnings</p>
          </motion.div>
          
          {/* Enhanced Tab Navigation */}
          <div className="mt-6">
            <div className="flex space-x-2 bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                    whileHover={{ scale: isActive ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : ''}`} />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isActive
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {tab.count}
                      </motion.span>
                    )}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white rounded-xl shadow-lg -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content with better spacing */}
      <div className="px-6 py-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-teal-300 rounded-full animate-spin animate-reverse" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <span className="mt-4 text-gray-600 font-medium">Loading your predictions...</span>
            </motion.div>
          ) : currentPredictions.length > 0 ? (
            <motion.div
              key="predictions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Performance Summary for Active tab */}
              {activeTab === 'Active' && currentPredictions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 mb-6 text-white shadow-lg"
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Portfolio Performance
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-teal-100 text-sm font-medium">Total Staked</p>
                      <p className="text-2xl font-bold">$2,350</p>
                    </div>
                    <div className="text-center">
                      <p className="text-teal-100 text-sm font-medium">Potential Win</p>
                      <p className="text-2xl font-bold">$4,890</p>
                    </div>
                    <div className="text-center">
                      <p className="text-teal-100 text-sm font-medium">Win Rate</p>
                      <p className="text-2xl font-bold">78%</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Creator Analytics for Created tab */}
              {activeTab === 'Created' && currentPredictions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl p-6 mb-6 text-white shadow-lg"
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Creator Analytics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-blue-100 text-sm font-medium">Total Volume</p>
                      <p className="text-2xl font-bold">$12.4K</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-100 text-sm font-medium">Earnings</p>
                      <p className="text-2xl font-bold">$434</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-100 text-sm font-medium">Followers</p>
                      <p className="text-2xl font-bold">127</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Predictions List */}
              {activeTab === 'Active' && currentPredictions.map((prediction, index) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <ActivePredictionCard prediction={prediction} />
                </motion.div>
              ))}
              {activeTab === 'Created' && currentPredictions.map((prediction, index) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <CreatedPredictionCard prediction={prediction} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState tab={activeTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manage Prediction Modal */}
      {selectedPrediction && (
        <ManagePredictionModal
          isOpen={isManageModalOpen}
          onClose={() => {
            setIsManageModalOpen(false);
            setSelectedPrediction(null);
          }}
          prediction={selectedPrediction}
        />
      )}
    </div>
  );
};

export default BetsTab;