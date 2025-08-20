import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import { UserAnalyticsDashboard } from '../components/analytics/UserAnalyticsDashboard';
import { BehaviorAnalytics } from '../components/analytics/BehaviorAnalytics';

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'behavior'>('personal');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'personal'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Personal
                </div>
              </button>
              <button
                onClick={() => setActiveTab('behavior')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'behavior'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Behavior
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'personal' ? (
          <UserAnalyticsDashboard />
        ) : (
          <BehaviorAnalytics />
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-900">Real-time Analytics</span>
            </div>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              Your analytics data is updated in real-time and helps you make better predictions. 
              All data is private and used only to improve your experience on Fan Club Z.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
