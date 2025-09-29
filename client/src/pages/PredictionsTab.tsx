import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { usePredictionStore } from '../store/predictionStore';
import { openAuthGate } from '../auth/authGateAdapter';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Plus, 
  Settings
} from 'lucide-react';
import ManagePredictionModal from '../components/modals/ManagePredictionModal';
import AppHeader from '../components/layout/AppHeader';
import Page from '../components/ui/layout/Page';
import EmptyState from '../components/ui/empty/EmptyState';

const PredictionsTab: React.FC<{ onNavigateToDiscover?: () => void }> = ({ onNavigateToDiscover }) => {
  const navigate = useNavigate();
  const { 
    predictions, 
    getUserCreatedPredictions, 
    fetchUserCreatedPredictions, 
    fetchUserPredictionEntries, 
    getUserPredictionEntries, 
    loading 
  } = usePredictionStore();
  const { user: storeUser, isAuthenticated: storeAuthenticated } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  
  const isAuthenticated = sessionUser ? true : storeAuthenticated;
  const user = sessionUser ? {
    id: sessionUser.id,
    firstName: sessionUser.user_metadata?.firstName || sessionUser.user_metadata?.first_name,
    email: sessionUser.email || '',
  } : storeUser;

  const [activeTab, setActiveTab] = useState<'active' | 'created' | 'completed'>('active');
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Fetch user data
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      fetchUserCreatedPredictions(user.id);
      fetchUserPredictionEntries(user.id);
    }
  }, [user?.id, isAuthenticated, fetchUserCreatedPredictions, fetchUserPredictionEntries]);

  // Helper functions
  const getTimeRemaining = (deadline: string) => {
    if (!deadline) return "Unknown";
    const end = new Date(deadline).getTime() - new Date().getTime();
    if (end <= 0) return "Ended";
    const days = Math.floor(end / (1000 * 60 * 60 * 24));
    const hours = Math.floor((end % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const calculateConfidence = (prediction: any) => {
    if (!prediction?.options) return 68;
    const totalStaked = prediction.options.reduce((sum: number, opt: any) => sum + (opt.total_staked || 0), 0);
    if (totalStaked === 0) return 68;
    const maxStaked = Math.max(...prediction.options.map((opt: any) => opt.total_staked || 0));
    return Math.round((maxStaked / totalStaked) * 100);
  };

  // Get user predictions data
  const userPredictions = useMemo(() => {
    if (!isAuthenticated || !user) {
      return { active: [], created: [], completed: [] };
    }

    const userEntries = getUserPredictionEntries(user.id) || [];
    const userCreated = getUserCreatedPredictions(user.id) || [];
    
    const activePredictions = userEntries
      .filter(entry => {
        const prediction = predictions.find(p => p.id === entry.prediction_id);
        return prediction && 
               prediction.status === 'open' && 
               new Date(prediction.entry_deadline) > new Date() &&
               entry.status === 'active';
      })
      .map(entry => {
        const prediction = predictions.find(p => p.id === entry.prediction_id);
        const option = prediction?.options?.find(o => o.id === entry.option_id);
        
        return {
          id: entry.id,
          title: prediction?.title || 'Unknown Prediction',
          category: prediction?.category || 'custom',
          position: option?.label || 'Unknown',
          stake: entry.amount,
          potentialReturn: entry.potential_payout || 0,
          odds: entry.potential_payout ? `${(entry.potential_payout / entry.amount).toFixed(2)}x` : '1.00x',
          timeRemaining: getTimeRemaining(prediction?.entry_deadline || ''),
          participants: prediction?.participant_count || 0,
          confidence: calculateConfidence(prediction)
        };
      });

    const createdPredictions = userCreated
      .filter(prediction => ['open', 'closed', 'awaiting_settlement'].includes(prediction.status))
      .map(prediction => ({
        id: prediction.id,
        title: prediction.title,
        category: prediction.category,
        totalPool: prediction.pool_total || 0,
        participants: prediction.participant_count || 0,
        timeRemaining: getTimeRemaining(prediction.entry_deadline),
        status: prediction.status,
        yourCut: prediction.creator_fee_percentage || 3.5
      }));

    const completedPredictions = userEntries
      .filter(entry => {
        const prediction = predictions.find(p => p.id === entry.prediction_id);
        return prediction && (
          entry.status === 'won' || 
          entry.status === 'lost' ||
          prediction.status === 'settled' ||
          new Date(prediction.entry_deadline) <= new Date()
        );
      })
      .map(entry => {
        const prediction = predictions.find(p => p.id === entry.prediction_id);
        const option = prediction?.options?.find(o => o.id === entry.option_id);
        
        return {
          id: entry.id,
          title: prediction?.title || 'Unknown Prediction',
          category: prediction?.category || 'custom',
          position: option?.label || 'Unknown',
          stake: entry.amount,
          actualReturn: entry.actual_payout || 0,
          profit: (entry.actual_payout || 0) - entry.amount,
          status: entry.status,
          participants: prediction?.participant_count || 0,
          settledAt: new Date(entry.updated_at).toLocaleDateString()
        };
      });

    return { active: activePredictions, created: createdPredictions, completed: completedPredictions };
  }, [user?.id, isAuthenticated, predictions, getUserPredictionEntries, getUserCreatedPredictions]);

  const currentPredictions = userPredictions[activeTab] || [];

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <>
        <AppHeader title="My Bets" />
        <Page>
          <EmptyState
            icon={<TrendingUp />}
            title="Sign in to view your predictions"
            description="See your portfolio, performance, and history."
            primaryAction={
              <button
                onClick={async () => {
                  try {
                    await openAuthGate({ intent: 'view_my_bets' });
                  } catch (error) {
                    console.error('Auth gate error:', error);
                  }
                }}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Sign In
              </button>
            }
            secondaryAction={
              <button
                onClick={() => onNavigateToDiscover && onNavigateToDiscover()}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Explore Predictions
              </button>
            }
          />
        </Page>
      </>
    );
  }

  const renderPredictionCard = (prediction: any) => {
    return (
      <div key={prediction.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-800">
                {prediction.category?.replace('_', ' ')}
              </span>
              {activeTab === 'active' && (
                <span className="px-2 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Active
                </span>
              )}
              {activeTab === 'created' && (
                <span className="px-2 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                  {prediction.status === 'open' ? 'Open' : prediction.status}
                </span>
              )}
              {activeTab === 'completed' && (
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                  prediction.status === 'won' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {prediction.status === 'won' ? 'Won' : 'Lost'}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-lg leading-tight">{prediction.title}</h3>
          </div>
        </div>
        
        {/* Stats section based on tab */}
        {activeTab === 'active' && (
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
        )}
        
        {activeTab === 'created' && (
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
        )}
        
        {activeTab === 'completed' && (
          <div className={`rounded-xl p-4 mb-4 ${prediction.status === 'won' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${prediction.status === 'won' ? 'text-emerald-800' : 'text-red-800'}`}>
                Your Position: {prediction.position}
              </span>
              <span className={`text-lg font-bold ${prediction.status === 'won' ? 'text-emerald-700' : 'text-red-700'}`}>
                {prediction.profit >= 0 ? '+' : ''}${Math.abs(prediction.profit).toLocaleString()}
              </span>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{prediction.participants} participants</span>
          {activeTab === 'created' ? (
            <button
              onClick={() => {
                setSelectedPrediction(prediction);
                setShowManageModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-blue-700 transition-colors"
            >
              Manage <Settings className="w-4 h-4" />
            </button>
          ) : (
            <span className="font-medium">
              {activeTab === 'active' ? `${prediction.timeRemaining} left` : `Settled ${prediction.settledAt}`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Unified header with tabs */}
      <AppHeader title="My Bets" />
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'active' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Active ({userPredictions.active.length})
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'created' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="w-4 h-4" />
              Created ({userPredictions.created.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'completed' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Completed ({userPredictions.completed.length})
            </button>
          </div>
        </div>
      </div>

      <Page>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-600">Loading predictions...</span>
          </div>
        ) : currentPredictions.length > 0 ? (
          <div className="space-y-4">
            {currentPredictions.map(renderPredictionCard)}
          </div>
        ) : (
          <EmptyState
            icon={activeTab === 'active' ? <TrendingUp /> : activeTab === 'created' ? <Target /> : <CheckCircle />}
            title={`No ${activeTab} predictions`}
            description={
              activeTab === 'active' 
                ? "You haven't made any predictions yet. Start by exploring trending topics!"
                : activeTab === 'created'
                ? "You haven't created any predictions yet. Share your insights with the community!"
                : "Your prediction history will appear here once you complete some predictions."
            }
            primaryAction={
              <button
                onClick={() => {
                  if (activeTab === 'created') {
                    navigate('/create');
                  } else {
                    onNavigateToDiscover && onNavigateToDiscover();
                  }
                }}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'created' ? 'Create Prediction' : 'Explore Predictions'}
              </button>
            }
          />
        )}
      </Page>

      {/* Manage Prediction Modal */}
      {selectedPrediction && (
        <ManagePredictionModal
          isOpen={showManageModal}
          onClose={() => {
            setShowManageModal(false);
            setSelectedPrediction(null);
          }}
          prediction={selectedPrediction}
        />
      )}
    </>
  );
};

export default PredictionsTab;
