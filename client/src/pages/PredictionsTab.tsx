import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, CheckCircle, Plus, ArrowRight } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { formatTimeRemaining } from '../lib/utils';
import ManagePredictionModal from '../components/modals/ManagePredictionModal';

interface PredictionsTabProps {
  onNavigateToDiscover?: () => void;
}

const PredictionsTab: React.FC<PredictionsTabProps> = ({ onNavigateToDiscover }) => {
  const { 
    predictions, 
    predictionEntries, 
    getUserCreatedPredictions, 
    getUserPredictionEntries,
    fetchUserCreatedPredictions,
    fetchUserPredictionEntries 
  } = usePredictionStore();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Active');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Fetch user data when component mounts
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      fetchUserCreatedPredictions(user.id);
      fetchUserPredictionEntries(user.id);
    }
  }, [user?.id, isAuthenticated, fetchUserCreatedPredictions, fetchUserPredictionEntries]);

  // Get real data from store
  const getUserPredictionsData = () => {
    if (!isAuthenticated || !user) {
      return { Active: [], Created: [], Completed: [] };
    }

    const userEntries = getUserPredictionEntries(user.id);
    const userCreated = getUserCreatedPredictions(user.id);

    const activePredictions = userEntries
      .filter(entry => entry.status === 'active')
      .map(entry => {
        const prediction = predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) return null;
        
        const option = prediction.options?.find(o => o.id === entry.option_id);
        
        return {
          id: entry.id,
          title: prediction.title,
          category: prediction.category,
          position: option?.label || 'Unknown',
          stake: entry.amount,
          potentialReturn: entry.potential_payout || 0,
          odds: `${((entry.potential_payout || 0) / entry.amount).toFixed(2)}x`,
          timeRemaining: formatTimeRemaining(prediction.entry_deadline),
          status: 'active',
          participants: prediction.participant_count || 0,
          confidence: Math.round(Math.random() * 100) // This would be calculated from real data
        };
      })
      .filter(Boolean);

    const createdPredictions = userCreated.map(prediction => ({
      id: prediction.id,
      title: prediction.title,
      category: prediction.category,
      totalPool: prediction.pool_total || 0,
      participants: prediction.participant_count || 0,
      timeRemaining: formatTimeRemaining(prediction.entry_deadline),
      status: prediction.status,
      yourCut: prediction.creator_fee_percentage || 3.5
    }));

    const completedPredictions = userEntries
      .filter(entry => entry.status === 'won' || entry.status === 'lost')
      .map(entry => {
        const prediction = predictions.find(p => p.id === entry.prediction_id);
        if (!prediction) return null;
        
        const option = prediction.options?.find(o => o.id === entry.option_id);
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

  const userPredictionsData = getUserPredictionsData();
  
  const tabs = [
    { id: 'Active', label: 'Active', icon: TrendingUp, count: userPredictionsData.Active.length },
    { id: 'Created', label: 'Created', icon: Target, count: userPredictionsData.Created.length },
    { id: 'Completed', label: 'Completed', icon: CheckCircle, count: userPredictionsData.Completed.length }
  ];

  const currentPredictions = userPredictionsData[activeTab] || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'winning': return 'bg-green-50 text-green-700 border-green-200';
      case 'losing': return 'bg-red-50 text-red-700 border-red-200';
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Crypto': 'bg-orange-100 text-orange-700',
      'Sports': 'bg-blue-100 text-blue-700',
      'Tech': 'bg-purple-100 text-purple-700',
      'Entertainment': 'bg-pink-100 text-pink-700',
      'Politics': 'bg-red-100 text-red-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const EmptyState = ({ tab }) => (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        {tab === 'Active' && <TrendingUp className="w-10 h-10 text-gray-400" />}
        {tab === 'Created' && <Target className="w-10 h-10 text-gray-400" />}
        {tab === 'Completed' && <CheckCircle className="w-10 h-10 text-gray-400" />}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No {tab.toLowerCase()} predictions
      </h3>
      
      <p className="text-gray-600 text-center mb-8 max-w-sm">
        {tab === 'Active' && "You haven't made any predictions yet. Start by exploring trending topics!"}
        {tab === 'Created' && "You haven't created any predictions yet. Share your insights with the community!"}
        {tab === 'Completed' && "Your prediction history will appear here once you complete some predictions."}
      </p>
      
      <motion.button 
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
        onClick={() => {
          if (tab === 'Created') {
            // Navigate to create page
            console.log('Navigate to create page');
          } else {
            // Navigate to discover tab
            if (onNavigateToDiscover) {
              onNavigateToDiscover();
            }
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

  const ActivePredictionCard = ({ prediction }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(prediction.category)}`}>
              {prediction.category}
            </span>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(prediction.status)}`}>
              Active
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {prediction.title}
          </h3>
        </div>
      </div>

      {/* Position and Stats */}
      <div className="bg-emerald-50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-800">Your Position</span>
          <span className="text-lg font-bold text-emerald-700">{prediction.position}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className="text-xs text-emerald-600 mb-1">Staked</p>
            <p className="font-semibold text-emerald-900">${prediction.stake}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 mb-1">Potential</p>
            <p className="font-semibold text-emerald-900">${prediction.potentialReturn}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 mb-1">Odds</p>
            <p className="font-semibold text-emerald-900">{prediction.odds}</p>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
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

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{prediction.participants} participants</span>
        <span className="font-medium text-amber-600">{prediction.timeRemaining} left</span>
      </div>
    </div>
  );

  const CreatedPredictionCard = ({ prediction }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(prediction.category)}`}>
              {prediction.category}
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
              Open
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {prediction.title}
          </h3>
        </div>
      </div>

      {/* Creator Stats */}
      <div className="bg-blue-50 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-600 mb-1">Total Pool</p>
            <p className="font-semibold text-blue-900">${prediction.totalPool}</p>
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

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Closes in {formatTimeRemaining(prediction.entry_deadline || prediction.timeRemaining)}</span>
        <motion.button
          onClick={() => {
            // Open manage modal
            setSelectedPrediction(prediction);
            setIsManageModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Manage <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Predictions</h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            {tabs.map((tab) => {
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
        {currentPredictions.length > 0 ? (
          <div className="space-y-4">
            {activeTab === 'Active' && currentPredictions.map((prediction) => (
              <ActivePredictionCard key={prediction.id} prediction={prediction} />
            ))}
            {activeTab === 'Created' && currentPredictions.map((prediction) => (
              <CreatedPredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} />
        )}
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

export default PredictionsTab;