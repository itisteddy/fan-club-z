import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Clock, DollarSign, CheckCircle, AlertTriangle, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getApiUrl } from '@/utils/environment';

interface AnalyticsData {
  total_settled: number;
  total_volume: number;
  avg_settlement_time: string; // PostgreSQL interval as string
  pending_settlements: number;
  open_disputes: number;
  settlement_success_rate: number;
  total_fees_collected: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-teal-50 border-teal-200 text-teal-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-teal-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export const SettlementAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiUrl();
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/api/v2/settlement/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatAvgTime = (intervalString: string) => {
    if (!intervalString) return 'N/A';
    
    // Parse PostgreSQL interval (e.g., "02:30:00" or "1 day 02:30:00")
    const parts = intervalString.split(' ');
    let hours = 0;
    let minutes = 0;
    
    if (parts.length === 1) {
      // Just time (HH:MM:SS)
      const timeParts = parts[0]?.split(':') || [];
      hours = parseInt(timeParts[0] || '0') || 0;
      minutes = parseInt(timeParts[1] || '0') || 0;
    } else if (parts.length >= 3) {
      // Contains days (e.g., "1 day 02:30:00")
      const days = parseInt(parts[0] || '0') || 0;
      const timeParts = parts[2]?.split(':') || [];
      hours = (days * 24) + (parseInt(timeParts[0] || '0') || 0);
      minutes = parseInt(timeParts[1] || '0') || 0;
    }
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="w-12 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
                <div className="w-16 h-8 bg-gray-200 rounded"></div>
                <div className="w-24 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Analytics</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settlement Analytics</h2>
          <p className="text-gray-600 mt-1">Overview of settlement performance and metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Settled"
          value={analytics.total_settled.toLocaleString()}
          subtitle="All-time predictions"
          icon={CheckCircle}
          color="green"
          trend={{ value: 12, isPositive: true }}
        />
        
        <MetricCard
          title="Settlement Volume"
          value={formatCurrency(analytics.total_volume)}
          subtitle="Total value processed"
          icon={DollarSign}
          color="blue"
          trend={{ value: 8, isPositive: true }}
        />
        
        <MetricCard
          title="Average Time"
          value={formatAvgTime(analytics.avg_settlement_time)}
          subtitle="From deadline to settled"
          icon={Clock}
          color="purple"
          trend={{ value: -5, isPositive: false }}
        />
        
        <MetricCard
          title="Success Rate"
          value={`${analytics.settlement_success_rate.toFixed(1)}%`}
          subtitle="Settled without disputes"
          icon={Target}
          color="green"
          trend={{ value: 2, isPositive: true }}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Pending Settlements"
          value={analytics.pending_settlements}
          subtitle="Awaiting resolution"
          icon={Clock}
          color="yellow"
        />
        
        <MetricCard
          title="Open Disputes"
          value={analytics.open_disputes}
          subtitle="Requiring attention"
          icon={AlertTriangle}
          color="red"
        />
        
        <MetricCard
          title="Platform Fees"
          value={formatCurrency(analytics.total_fees_collected)}
          subtitle="Total fees collected"
          icon={DollarSign}
          color="blue"
        />
        
        <MetricCard
          title="Dispute Rate"
          value={`${(100 - analytics.settlement_success_rate).toFixed(1)}%`}
          subtitle="Of settled predictions"
          icon={AlertTriangle}
          color="yellow"
        />
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settlement Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-teal-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Successfully Settled</p>
                  <p className="text-sm text-gray-600">
                    {Math.round((analytics.settlement_success_rate / 100) * analytics.total_settled)} predictions
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold text-teal-600">
                {analytics.settlement_success_rate.toFixed(1)}%
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Disputed</p>
                  <p className="text-sm text-gray-600">
                    {Math.round(((100 - analytics.settlement_success_rate) / 100) * analytics.total_settled)} predictions
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {(100 - analytics.settlement_success_rate).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Total Volume</p>
                <p className="text-sm text-gray-600">All-time settlement volume</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(analytics.total_volume)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Platform Revenue</p>
                <p className="text-sm text-gray-600">
                  {((analytics.total_fees_collected / analytics.total_volume) * 100).toFixed(1)}% of volume
                </p>
              </div>
              <div className="text-2xl font-bold text-teal-600">
                {formatCurrency(analytics.total_fees_collected)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Avg. Prediction Value</p>
                <p className="text-sm text-gray-600">Per settled prediction</p>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {analytics.total_settled > 0 
                  ? formatCurrency(analytics.total_volume / analytics.total_settled)
                  : '$0'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(analytics.pending_settlements > 0 || analytics.open_disputes > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">Action Required</h3>
          <div className="space-y-2">
            {analytics.pending_settlements > 0 && (
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock size={16} />
                <span>
                  {analytics.pending_settlements} prediction{analytics.pending_settlements > 1 ? 's' : ''} 
                  {' '}awaiting settlement
                </span>
              </div>
            )}
            {analytics.open_disputes > 0 && (
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle size={16} />
                <span>
                  {analytics.open_disputes} dispute{analytics.open_disputes > 1 ? 's' : ''} 
                  {' '}requiring resolution
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
