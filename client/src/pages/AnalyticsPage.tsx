import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { PerformanceDashboard } from '../components/analytics/PerformanceDashboard';
import { scrollToTop } from '../utils/scroll';

const AnalyticsPage: React.FC = () => {
  const [, setLocation] = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  const handleBack = () => {
    setLocation('/profile');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="h-11" /> {/* Status bar spacer */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <PerformanceDashboard className="mb-6" />
        
        {/* Additional Analytics Sections */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-2">Advanced Charts</h4>
              <p className="text-sm text-gray-600">
                Interactive charts showing your performance trends over time
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-2">Predictions Analysis</h4>
              <p className="text-sm text-gray-600">
                Deep dive into your prediction patterns and strategies
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-2">Risk Assessment</h4>
              <p className="text-sm text-gray-600">
                Analyze your risk tolerance and betting patterns
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-2">Performance Goals</h4>
              <p className="text-sm text-gray-600">
                Set and track performance goals and milestones
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
