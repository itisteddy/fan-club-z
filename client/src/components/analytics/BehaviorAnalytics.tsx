import React, { useState, useEffect } from 'react';
import { Eye, Clock, MousePointer, Users, ArrowRight, BarChart3 } from 'lucide-react';

interface PageView {
  page: string;
  views: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

interface UserBehaviorData {
  totalPageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  conversionRate: number;
  topPages: PageView[];
  conversionFunnel: Array<{
    step: string;
    users: number;
    conversionRate: number;
  }>;
  demographics: {
    avgAge: number;
    topCountries: Array<{ country: string; percentage: number }>;
    deviceTypes: Array<{ type: string; percentage: number }>;
  };
}

export const BehaviorAnalytics: React.FC = () => {
  const [data, setData] = useState<UserBehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    
    // Mock data - replace with actual API call
    setTimeout(() => {
      setData({
        totalPageViews: 12847,
        uniqueVisitors: 3421,
        avgSessionDuration: 4.2,
        conversionRate: 12.5,
        topPages: [
          {
            page: '/discover',
            views: 5432,
            avgTimeOnPage: 3.4,
            bounceRate: 35.2,
          },
          {
            page: '/predictions/sports',
            views: 3214,
            avgTimeOnPage: 5.1,
            bounceRate: 28.9,
          },
          {
            page: '/profile',
            views: 2103,
            avgTimeOnPage: 2.8,
            bounceRate: 42.1,
          },
          {
            page: '/wallet',
            views: 1876,
            avgTimeOnPage: 6.2,
            bounceRate: 15.4,
          },
          {
            page: '/leaderboard',
            views: 1342,
            avgTimeOnPage: 4.7,
            bounceRate: 31.8,
          },
        ],
        conversionFunnel: [
          { step: 'Landing Page Visit', users: 3421, conversionRate: 100 },
          { step: 'Sign Up Started', users: 2156, conversionRate: 63.0 },
          { step: 'Account Created', users: 1834, conversionRate: 85.1 },
          { step: 'First Prediction', users: 1245, conversionRate: 67.9 },
          { step: 'Second Prediction', users: 892, conversionRate: 71.7 },
          { step: 'Active User (5+ predictions)', users: 428, conversionRate: 48.0 },
        ],
        demographics: {
          avgAge: 28.5,
          topCountries: [
            { country: 'Nigeria', percentage: 67.8 },
            { country: 'Ghana', percentage: 12.4 },
            { country: 'Kenya', percentage: 8.9 },
            { country: 'South Africa', percentage: 6.2 },
            { country: 'Others', percentage: 4.7 },
          ],
          deviceTypes: [
            { type: 'Mobile', percentage: 78.3 },
            { type: 'Desktop', percentage: 16.7 },
            { type: 'Tablet', percentage: 5.0 },
          ],
        },
      });
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-200 h-64 rounded-lg"></div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Behavior Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((period) => (
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
            <Eye className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Page Views</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.totalPageViews.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-medium text-gray-600">Unique Visitors</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.uniqueVisitors.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Avg Session</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.avgSessionDuration.toFixed(1)}m
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Conversion</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.conversionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-4">
            {data.topPages.map((page, index) => (
              <div key={page.page} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{page.page}</span>
                    <span className="text-xs text-gray-500">
                      {page.views.toLocaleString()} views
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {page.avgTimeOnPage.toFixed(1)}m avg time • {page.bounceRate.toFixed(1)}% bounce
                  </div>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full"
                    style={{ width: `${(page.views / data.topPages[0].views) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            {data.conversionFunnel.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{step.step}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {step.users.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.conversionRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${step.conversionRate}%` }}
                  ></div>
                </div>
                {index < data.conversionFunnel.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Countries</h3>
          <div className="space-y-3">
            {data.demographics.topCountries.map((country) => (
              <div key={country.country} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{country.country}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${country.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {country.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Types */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Types</h3>
          <div className="space-y-3">
            {data.demographics.deviceTypes.map((device) => (
              <div key={device.type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{device.type}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {device.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Average user age: <span className="font-medium text-gray-900">{data.demographics.avgAge} years</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
