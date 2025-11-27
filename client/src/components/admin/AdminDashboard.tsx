import React, { useState, useEffect } from 'react';
import { SettlementQueue } from './SettlementQueue';
import { DisputeResolution } from './DisputeResolution';
import { SettlementAnalytics } from './SettlementAnalytics';
import { Settings, Clock, AlertTriangle, BarChart3, Users } from 'lucide-react';
import { getApiUrl } from '@/utils/environment';

interface AdminStats {
  pending_settlements: number;
  open_disputes: number;
  settlements_today: number;
  avg_settlement_time: number;
  success_rate: number;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'disputes' | 'analytics' | 'settings'>('queue');
  const [stats, setStats] = useState<AdminStats>({
    pending_settlements: 0,
    open_disputes: 0,
    settlements_today: 0,
    avg_settlement_time: 0,
    success_rate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = getApiUrl();
      const response = await fetch(`${apiBase}/api/v2/settlement/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          pending_settlements: data.pending_settlements || 0,
          open_disputes: data.open_disputes || 0,
          settlements_today: data.total_settled || 0, // This could be refined to show today's count
          avg_settlement_time: data.avg_settlement_time ? parseFloat(data.avg_settlement_time.split(':')[0]) || 0 : 0,
          success_rate: data.settlement_success_rate || 0
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Fallback to mock data
      setStats({
        pending_settlements: 0,
        open_disputes: 0,
        settlements_today: 0,
        avg_settlement_time: 0,
        success_rate: 0
      });
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'queue', label: 'Settlement Queue', icon: Clock, count: stats.pending_settlements },
    { id: 'disputes', label: 'Dispute Resolution', icon: AlertTriangle, count: stats.open_disputes },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={16} />
              <span>Administrator Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Settlements</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_settlements}</p>
              </div>
              <Clock className="text-orange-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Disputes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open_disputes}</p>
              </div>
              <AlertTriangle className="text-red-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Settled Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.settlements_today}</p>
              </div>
              <BarChart3 className="text-teal-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Time (hours)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avg_settlement_time}</p>
              </div>
              <Clock className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.success_rate}%</p>
              </div>
              <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`
                        ml-2 px-2 py-1 text-xs rounded-full
                        ${isActive 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'queue' && <SettlementQueue />}
            {activeTab === 'disputes' && <DisputeResolution />}
            {activeTab === 'analytics' && <SettlementAnalytics />}
            {activeTab === 'settings' && (
              <div className="text-center py-12 text-gray-500">
                <Settings size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Settlement Settings</p>
                <p className="text-sm">Source management and configuration coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
