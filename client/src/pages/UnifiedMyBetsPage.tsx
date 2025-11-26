import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Trophy, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { openAuthGate } from '../auth/authGateAdapter';
import Header, { Subnav } from '../components/layout/Header/Header';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';
import StatCard, { StatRow } from '../components/ui/card/StatCard';
import EmptyState from '../components/ui/empty/EmptyState';
import AuthRequiredState from '../components/ui/empty/AuthRequiredState';
import { SkeletonStatRow, SkeletonCard } from '../components/ui/skeleton/Skeleton';
import { formatUSDCompact } from '@/lib/format';
import { t } from '@/lib/lexicon';

// TODO: Replace with PredictionCardV3 for consistency
// import { PredictionCardV3 } from '../components/predictions/PredictionCardV3';
// Map userEntry to PredictionCardV3 props:
// - id: entry.prediction.id
// - title: entry.prediction.title 
// - poolTotal: entry.prediction.pool_total
// - players: entry.prediction.participant_count
// - thumbnailUrl: entry.prediction.image_url
// - etc.

interface MyBetsPageProps {
  onNavigateBack?: () => void;
}

const MyBetsPage: React.FC<MyBetsPageProps> = ({ onNavigateBack }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { getUserPredictionEntries } = usePredictionStore();
  const [loading, setLoading] = useState(!isAuthenticated);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Calculate user stats
  const userEntries = getUserPredictionEntries(user?.id || '') || [];
  const activeEntries = userEntries.filter(entry => entry.status === 'active');
  const wonEntries = userEntries.filter(entry => entry.status === 'won');
  const lostEntries = userEntries.filter(entry => entry.status === 'lost');
  const completedEntries = [...wonEntries, ...lostEntries];
  
  const totalInvested = userEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalEarnings = wonEntries.reduce((sum, entry) => sum + (entry.actual_payout || 0), 0);
  const winRate = completedEntries.length > 0 ? Math.round((wonEntries.length / completedEntries.length) * 100) : 0;

  const getDisplayEntries = () => {
    switch (activeTab) {
      case 'active':
        return activeEntries;
      case 'won':
        return wonEntries;
      case 'lost':
        return lostEntries;
      default:
        return activeEntries;
    }
  };

  const displayEntries = getDisplayEntries();

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <>
        <Header title={t('myBets')} />
        <Page>
          <AuthRequiredState
            icon={<Trophy />}
            title={`Sign in to view your ${t('bets')}`}
            description="Track your predictions and payouts."
            intent="view_my_bets"
          />
        </Page>
      </>
    );
  }

  return (
    <>
      <Header title={t('myBets')}>
        <Subnav>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'active' 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Active ({activeEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('won')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'won' 
                ? 'bg-green-100 text-green-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Won ({wonEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('lost')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'lost' 
                ? 'bg-red-100 text-red-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Lost ({lostEntries.length})
          </button>
        </Subnav>
      </Header>
      
      <Page>
        {loading ? (
          <>
            <SkeletonStatRow />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Stat Row with Enhanced Formatting */}
            <StatRow>
              <StatCard 
                label="Total Invested" 
                value={totalInvested} 
                variant="currency"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <StatCard 
                label="Win Rate" 
                value={winRate}
                variant="percentage" 
                icon={<Trophy className="w-4 h-4" />}
              />
              <StatCard 
                label="Net Profit" 
                value={totalEarnings - totalInvested}
                variant="balance" 
                icon={<Clock className="w-4 h-4" />}
              />
            </StatRow>

            {/* Predictions List */}
            <Card>
              <CardHeader title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ${t('bets')}`} />
              <CardContent>
                {displayEntries.length > 0 ? (
                  <div className="space-y-4">
                    {displayEntries.map((entry) => (
                      <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 flex-1 mr-3">
                            {entry.prediction?.question || entry.prediction?.title || 'Unknown Prediction'}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            entry.status === 'won' ? 'bg-green-100 text-green-800' :
                            entry.status === 'lost' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>{t('bet')}: {formatUSDCompact(entry.amount || 0)}</span>
                            {entry.selected_option && (
                              <span>On: {entry.selected_option}</span>
                            )}
                            {entry.odds && (
                              <span>{t('odds')}: {entry.odds}x</span>
                            )}
                          </div>
                          <div className="text-right">
                            {entry.status === 'won' && entry.actual_payout && (
                              <span className="text-green-600 font-medium">
                                Won: {formatUSDCompact(entry.actual_payout)}
                              </span>
                            )}
                            {entry.status === 'lost' && (
                              <span className="text-red-600 font-medium">
                                Lost: {formatUSDCompact(entry.amount || 0)}
                              </span>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(entry.created_at || 0).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={activeTab === 'active' ? <Clock /> : activeTab === 'won' ? <Trophy /> : <AlertCircle />}
                    title={`No ${activeTab} ${t('bets')}`}
                    description={
                      activeTab === 'active' 
                        ? "You don't have any active predictions yet." 
                        : activeTab === 'won'
                        ? `No winning ${t('bets')} yet. Keep predicting!`
                        : `No losing ${t('bets')} yet. Great job!`
                    }
                    primaryAction={
                      activeTab === 'active' ? (
                        <button
                          onClick={() => window.location.href = '/discover'}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Browse Predictions
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Page>
    </>
  );
};

export default MyBetsPage;
