import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Calendar, Users, Activity } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePredictionStore } from '../../store/predictionStore';

interface AnalyticsData {
  totalPredictions: number;
  correctPredictions: number;
  totalEarnings: number;
  totalStaked: number;
  winRate: number;
  avgStakeSize: number;
  profitLoss: number;
  streak: {
    current: number;
    longest: number;
    type: 'win' | 'loss';
  };
  monthlyData: Array<{
    month: string;
    predictions: number;
    earnings: number;
    winRate: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    predictions: number;
    winRate: number;
    earnings: number;
  }>;
}

export const UserAnalyticsDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { userPredictions } = usePredictionStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateAnalytics();
  }, [userPredictions, timeframe]);

  const calculateAnalytics = () => {
    if (!userPredictions?.length) {
      setLoading(false);
      return;
    }

    // Filter by timeframe
    const now = new Date();
    const timeframeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    };

    const filteredPredictions = userPredictions.filter(prediction => {
      const predictionDate = new Date(prediction.createdAt);
      return now.getTime() - predictionDate.getTime() <= timeframeMs[timeframe];
    });

    const settledPredictions = filteredPredictions.filter(p => p.status === 'settled');
    const correctPredictions = settledPredictions.filter(p => p.won);
    
    const totalStaked = filteredPredictions.reduce((sum, p) => sum + p.amount, 0);
    const totalEarnings = settledPredictions.reduce((sum, p) => sum + (p.payout || 0), 0);
    const profitLoss = totalEarnings - totalStaked;

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;
    let currentStreakType: 'win' | 'loss' = 'win';
    let tempStreak = 0;
    let tempType: 'win' | 'loss' = 'win';

    const sortedPredictions = settledPredictions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (let i = 0; i < sortedPredictions.length; i++) {
      const prediction = sortedPredictions[i];
      const isWin = prediction.won;

      if (i === 0) {
        currentStreak = 1;
        currentStreakType = isWin ? 'win' : 'loss';
        tempStreak = 1;
        tempType = isWin ? 'win' : 'loss';
      } else {
        const previousWin = sortedPredictions[i - 1].won;
        if ((isWin && previousWin) || (!isWin && !previousWin)) {
          currentStreak++;
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          currentStreak = 1;
          currentStreakType = isWin ? 'win' : 'loss';
          tempStreak = 1;
          tempType = isWin ? 'win' : 'loss';
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Monthly breakdown
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      
      const monthPredictions = settledPredictions.filter(p => 
        p.createdAt.slice(0, 7) === monthKey
      );
      
      const monthWins = monthPredictions.filter(p => p.won);
      const monthEarnings = monthPredictions.reduce((sum, p) => sum + (p.payout || 0), 0);

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        predictions: monthPredictions.length,
        earnings: monthEarnings,
        winRate: monthPredictions.length > 0 ? (monthWins.length / monthPredictions.length) * 100 : 0,
      });
    }

    // Category breakdown
    const categoryMap = new Map();
    settledPredictions.forEach(prediction => {
      const category = prediction.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          predictions: 0,
          wins: 0,
          earnings: 0,
        });
      }
      
      const data = categoryMap.get(category);
      data.predictions++;
      if (prediction.won) data.wins++;
      data.earnings += prediction.payout || 0;
    });

    const categoryBreakdown = Array.from(categoryMap.values()).map(data => ({
      category: data.category,
      predictions: data.predictions,
      winRate: (data.wins / data.predictions) * 100,
      earnings: data.earnings,
    }));

    setAnalytics({
      totalPredictions: filteredPredictions.length,
      correctPredictions: correctPredictions.length,
      totalEarnings,
      totalStaked,
      winRate: settledPredictions.length > 0 ? (correctPredictions.length / settledPredictions.length) * 100 : 0,
      avgStakeSize: filteredPredictions.length > 0 ? totalStaked / filteredPredictions.length : 0,
      profitLoss,
      streak: {
        current: currentStreak,
        longest: longestStreak,
        type: currentStreakType,
      },
      monthlyData,
      categoryBreakdown,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="bg-gray-200 h-64 rounded-lg"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No prediction data available</p>
        <p className="text-sm text-gray-400 mt-2">Start making predictions to see your analytics</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {analytics.winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">
            {analytics.correctPredictions} of {analytics.totalPredictions}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-medium text-gray-600">Profit/Loss</span>
          </div>
          <div className={`text-2xl font-bold ${
            analytics.profitLoss >= 0 ? 'text-teal-600' : 'text-red-600'
          }`}>
            {analytics.profitLoss >= 0 ? '+' : ''}${analytics.profitLoss.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            Total: ${analytics.totalEarnings.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Avg Stake</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${analytics.avgStakeSize.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            Total staked: ${analytics.totalStaked.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            {analytics.streak.type === 'win' ? (
              <TrendingUp className="w-5 h-5 text-teal-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-600">Streak</span>
          </div>
          <div className={`text-2xl font-bold ${
            analytics.streak.type === 'win' ? 'text-teal-600' : 'text-red-600'
          }`}>
            {analytics.streak.current}
          </div>
          <div className="text-sm text-gray-500">
            Best: {analytics.streak.longest}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
          <div className="space-y-3">
            {analytics.monthlyData.map((month, index) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{month.month}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{month.predictions} predictions</span>
                  <span className={`font-medium ${
                    month.winRate >= 50 ? 'text-teal-600' : 'text-red-600'
                  }`}>
                    {month.winRate.toFixed(1)}%
                  </span>
                  <span className="text-gray-900 font-medium">${month.earnings.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
          <div className="space-y-3">
            {analytics.categoryBreakdown.map((category) => (
              <div key={category.category} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{category.category}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{category.predictions}</span>
                  <span className={`font-medium ${
                    category.winRate >= 50 ? 'text-teal-600' : 'text-red-600'
                  }`}>
                    {category.winRate.toFixed(1)}%
                  </span>
                  <span className="text-gray-900 font-medium">${category.earnings.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
