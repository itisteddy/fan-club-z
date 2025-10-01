import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, MessageCircle, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PredictionDetailsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  commentCount?: number;
  participantCount?: number;
  children: React.ReactNode;
}

const PredictionDetailsTabs: React.FC<PredictionDetailsTabsProps> = ({
  activeTab,
  onTabChange,
  commentCount = 0,
  participantCount = 0,
  children
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', count: 0, icon: BarChart3 },
    { id: 'comments', label: 'Comments', count: commentCount, icon: MessageCircle },
    { id: 'activity', label: 'Activity', count: participantCount, icon: Activity }
  ];

  return (
    <div className="bg-white">
      {/* Tab Navigation - exactly matching My Bets design */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id === 'overview' ? 'Overview' : tab.id === 'comments' ? 'Comments' : 'Activity'}</span>
                  </div>
                  {tab.count > 0 && (
                    <span className={cn(
                      "ml-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                      activeTab === tab.id 
                        ? 'bg-emerald-200 text-emerald-900' 
                        : 'bg-gray-200 text-gray-600'
                    )}>
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {children}
      </div>
    </div>
  );
};

export default PredictionDetailsTabs;