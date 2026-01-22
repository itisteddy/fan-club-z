import React, { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  Settings,
  Loader2,
  Save,
  AlertTriangle,
  Power,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Percent,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet, adminPost, adminPut } from '@/lib/adminApi';

interface FeatureFlags {
  crypto_deposits: boolean;
  demo_wallet: boolean;
  referrals: boolean;
  comments: boolean;
  [key: string]: boolean;
}

interface ConfigData {
  maintenance_mode: boolean;
  maintenance_message: string;
  feature_flags: FeatureFlags;
  platform_fee_percentage: number;
  creator_fee_percentage: number;
  min_bet_amount: number;
  max_bet_amount: number;
  default_demo_balance: number;
}

const defaultConfig: ConfigData = {
  maintenance_mode: false,
  maintenance_message: 'The platform is currently under maintenance. Please check back soon.',
  feature_flags: {
    crypto_deposits: true,
    demo_wallet: true,
    referrals: true,
    comments: true,
  },
  platform_fee_percentage: 2.5,
  creator_fee_percentage: 1.0,
  min_bet_amount: 1,
  max_bet_amount: 10000,
  default_demo_balance: 1000,
};

export const ConfigPage: React.FC = () => {
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [config, setConfig] = useState<ConfigData>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<any>(`/api/v2/admin/config`, actorId || '');
      setConfig({ ...defaultConfig, ...data.config });
      setMaintenanceMessage(data.config?.maintenance_message || defaultConfig.maintenance_message);
    } catch (e) {
      console.error('[ConfigPage] Fetch error:', e);
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleToggleMaintenance = async () => {
    setSaving(true);
    try {
      const newValue = !config.maintenance_mode;
      await adminPost<any>(`/api/v2/admin/config/maintenance`, actorId || '', {
        enabled: newValue,
        message: maintenanceMessage,
      });
      setConfig(prev => ({ ...prev, maintenance_mode: newValue }));
      toast.success(newValue ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      // Refresh config to ensure UI is in sync
      setTimeout(() => fetchConfig(), 500);
    } catch (e: any) {
      console.error('[ConfigPage] Maintenance toggle error:', e);
      toast.error(e?.message || 'Failed to toggle maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeature = async (feature: string) => {
    setSaving(true);
    try {
      const newFlags = {
        ...config.feature_flags,
        [feature]: !config.feature_flags[feature],
      };
      await adminPost<any>(`/api/v2/admin/config/feature-flags`, actorId || '', {
        flags: { [feature]: newFlags[feature] },
      });
      setConfig(prev => ({ ...prev, feature_flags: newFlags }));
      toast.success(`${feature.replace(/_/g, ' ')} ${newFlags[feature] ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      console.error('[ConfigPage] Feature flag toggle error:', e);
      toast.error(e?.message || 'Failed to update feature flag');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async (key: string, value: any) => {
    setSaving(true);
    try {
      await adminPut<any>(`/api/v2/admin/config/${key}`, actorId || '', { value });
      setConfig(prev => ({ ...prev, [key]: value }));
      toast.success('Config saved');
    } catch (e: any) {
      console.error('[ConfigPage] Save config error:', e);
      toast.error(e?.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-emerald-500" />
          App Configuration
        </h1>
        <p className="text-slate-400 mt-1">Manage platform settings and feature flags</p>
      </div>

      {/* Maintenance Mode */}
      <div className={`rounded-xl p-6 border ${
        config.maintenance_mode 
          ? 'bg-amber-900/20 border-amber-600' 
          : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              config.maintenance_mode ? 'bg-amber-600/20' : 'bg-slate-700'
            }`}>
              <Wrench className={`w-6 h-6 ${config.maintenance_mode ? 'text-amber-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Maintenance Mode
                {config.maintenance_mode && (
                  <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
                    ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-slate-400 mt-1">
                When enabled, users will see a maintenance message instead of the app
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleMaintenance}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              config.maintenance_mode
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {config.maintenance_mode ? 'Disable' : 'Enable'}
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Maintenance Message
          </label>
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 resize-none"
          />
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
          <p className="text-sm text-slate-400">Enable or disable platform features</p>
        </div>
        <div className="divide-y divide-slate-700">
          {Object.entries(config.feature_flags).map(([key, enabled]) => (
            <div key={key} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-400">
                  {key === 'crypto_deposits' && 'Allow users to deposit crypto to their wallet'}
                  {key === 'demo_wallet' && 'Enable demo wallet for testing'}
                  {key === 'referrals' && 'Enable referral program'}
                  {key === 'comments' && 'Allow comments on predictions'}
                </p>
              </div>
              <button
                onClick={() => handleToggleFeature(key)}
                disabled={saving}
                className="relative"
              >
                {enabled ? (
                  <ToggleRight className="w-10 h-10 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Configuration */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-500" />
            Fee Configuration
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Platform Fee (%)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={config.platform_fee_percentage}
                onChange={(e) => setConfig(prev => ({ ...prev, platform_fee_percentage: Number(e.target.value) }))}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSaveConfig('platform_fee_percentage', config.platform_fee_percentage)}
                disabled={saving}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Creator Fee (%)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={config.creator_fee_percentage}
                onChange={(e) => setConfig(prev => ({ ...prev, creator_fee_percentage: Number(e.target.value) }))}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSaveConfig('creator_fee_percentage', config.creator_fee_percentage)}
                disabled={saving}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bet Limits */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Bet Limits
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Min Bet Amount ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={config.min_bet_amount}
                onChange={(e) => setConfig(prev => ({ ...prev, min_bet_amount: Number(e.target.value) }))}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSaveConfig('min_bet_amount', config.min_bet_amount)}
                disabled={saving}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Bet Amount ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={config.max_bet_amount}
                onChange={(e) => setConfig(prev => ({ ...prev, max_bet_amount: Number(e.target.value) }))}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSaveConfig('max_bet_amount', config.max_bet_amount)}
                disabled={saving}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Demo Balance ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={config.default_demo_balance}
                onChange={(e) => setConfig(prev => ({ ...prev, default_demo_balance: Number(e.target.value) }))}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSaveConfig('default_demo_balance', config.default_demo_balance)}
                disabled={saving}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-200 font-medium">Configuration Changes Are Immediate</p>
          <p className="text-amber-200/70 text-sm mt-1">
            Changes to these settings take effect immediately across the platform. 
            Use caution when modifying production settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;

