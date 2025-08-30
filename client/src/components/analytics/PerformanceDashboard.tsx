import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  BarChart3, 
  Calendar,
  Award,
  Activity,
  PieChart,
  LineChart,
  Filter,
  Download
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { socialApiService, PerformanceMetrics, CategoryPerformance } from '../../services/socialApiService';

interface TimeSeriesData {
  date: string;
  predictions: number;
  correct: number;
  winRate: number;
  profit: number;
}

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  className = '' 
}) => {
  const { user } = useAuthStore();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Real performance metrics from API
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalPredictions: 0,
    correctPredictions: 0,
    incorrectPredictions: 0,
    pendingPredictions: 0,
    winRate: 0,
    totalInvested: 0,
    totalWon: 0,
    totalLost: 0,
    netProfit: 0,
    averageReturn: 0,
    bestCategory: '',
    worstCategory: '',
    longestStreak: 0,
    currentStreak: 0
  });

  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  // Fetch performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const { metrics: apiMetrics, categoryPerformance: apiCategoryData } = await socialApiService.getPerformanceMetrics({
            userId: user.id,
            timeRange
          });

          setMetrics(apiMetrics);
          setCategoryPerformance(apiCategoryData);

          // Generate time series data from actual metrics
          const timeSeriesData: TimeSeriesData[] = [];
          const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
          
          for (let i = 0; i < daysToShow; i++) {
            const date = new Date(Date.now() - (daysToShow - 1 - i) * 24 * 60 * 60 * 1000);
            timeSeriesData.push({
              date: date.toISOString().split('T')[0],
              predictions: 0, // Will be populated by real data when available
              correct: 0,
              winRate: 0,
              profit: 0
            });
          }

          setTimeSeriesData(timeSeriesData);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPerformanceData();
    }
  }, [user, timeRange]);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    const roi = metrics.totalInvested > 0 ? (metrics.netProfit / metrics.totalInvested) * 100 : 0;
    const avgBetSize = metrics.totalPredictions > 0 ? metrics.totalInvested / metrics.totalPredictions : 0;
    
    return {
      roi,
      avgBetSize,
      profitMargin: metrics.totalWon > 0 ? (metrics.netProfit / metrics.totalWon) * 100 : 0
    };
  }, [metrics]);

  // Performance trend indicators
  const getTrendIndicator = (value: number, threshold: number = 0) => {
    if (value > threshold) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (value < threshold) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
            <p className="text-sm text-gray-600">Track your prediction performance and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Win Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              {getTrendIndicator(metrics.winRate, 60)}
            </div>
            <div className="text-2xl font-bold text-green-700">{metrics.winRate}%</div>
            <div className="text-sm text-green-600">Win Rate</div>
          </motion.div>

          {/* Net Profit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-xl p-4 ${
              metrics.netProfit >= 0 
                ? 'bg-gradient-to-br from-blue-50 to-blue-100' 
                : 'bg-gradient-to-br from-red-50 to-red-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <DollarSign className={`w-5 h-5 ${metrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
              {getTrendIndicator(metrics.netProfit)}
            </div>
            <div className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              ${metrics.netProfit}
            </div>
            <div className={`text-sm ${metrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Net Profit</div>
          </motion.div>

          {/* Total Predictions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-700">{metrics.totalPredictions}</div>
            <div className="text-sm text-purple-600">Total Predictions</div>
          </motion.div>

          {/* Current Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-orange-600" />
              {getTrendIndicator(metrics.currentStreak, 3)}
            </div>
            <div className="text-2xl font-bold text-orange-700">{metrics.currentStreak}</div>
            <div className="text-sm text-orange-600">Current Streak</div>
          </motion.div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Breakdown */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Performance Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Correct Predictions</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(metrics.correctPredictions / metrics.totalPredictions) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{metrics.correctPredictions}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Incorrect Predictions</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${(metrics.incorrectPredictions / metrics.totalPredictions) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{metrics.incorrectPredictions}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pending Predictions</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(metrics.pendingPredictions / metrics.totalPredictions) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{metrics.pendingPredictions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Invested</span>
                <span className="font-medium text-gray-900">${metrics.totalInvested}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Won</span>
                <span className="font-medium text-green-600">+${metrics.totalWon}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Lost</span>
                <span className="font-medium text-red-600">-${metrics.totalLost}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-900 font-medium">ROI</span>
                <span className={`font-bold ${derivedMetrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {derivedMetrics.roi >= 0 ? '+' : ''}{derivedMetrics.roi.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Category Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Predictions</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Win Rate</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {categoryPerformance.map((category, index) => (
                  <motion.tr
                    key={category.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 text-sm font-medium text-gray-900">{category.category}</td>
                    <td className="py-3 text-right text-sm text-gray-600">{category.predictions}</td>
                    <td className="py-3 text-right text-sm text-gray-600">{category.winRate}%</td>
                    <td className={`py-3 text-right text-sm font-medium ${
                      category.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {category.netProfit >= 0 ? '+' : ''}${category.netProfit}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Best Category</div>
              <div className="text-lg font-semibold text-gray-900">{metrics.bestCategory}</div>
              <div className="text-sm text-green-600">Highest win rate</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Longest Streak</div>
              <div className="text-lg font-semibold text-gray-900">{metrics.longestStreak} predictions</div>
              <div className="text-sm text-blue-600">Your best run</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Average Return</div>
              <div className="text-lg font-semibold text-gray-900">{metrics.averageReturn}%</div>
              <div className="text-sm text-purple-600">Per prediction</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Profit Margin</div>
              <div className="text-lg font-semibold text-gray-900">{derivedMetrics.profitMargin.toFixed(1)}%</div>
              <div className="text-sm text-orange-600">Of total winnings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
