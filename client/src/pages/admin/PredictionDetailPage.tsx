import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  Target,
  ArrowLeft,
  Loader2,
  User,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet, adminPost } from '@/lib/adminApi';
import { getPredictionStatusUi } from '@/lib/predictionStatusUi';
import { FRONTEND_URL } from '@/utils/environment';
import { getCategoryLabel } from '@/lib/categoryUi';
import { buildPredictionCanonicalPath } from '@/lib/predictionUrls';

interface PredictionDetail {
  prediction: {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    endDate: string | null;
    resolutionDate: string | null;
    closesAt?: string | null;
    closedAt?: string | null;
    settledAt?: string | null;
    winningOptionId: string | null;
    platformFee: number;
    creatorFee: number;
  };
  creator: {
    id: string;
    username: string | null;
    fullName: string | null;
    email: string | null;
  } | null;
  options: Array<{
    id: string;
    text: string;
    odds: number;
    probability: number;
    totalStake: number;
  }>;
  stats: {
    totalStake: number;
    uniqueBettors: number;
    entryCount: number;
  };
  entries: Array<{
    id: string;
    user_id: string;
    option_id: string;
    amount: number;
    provider: string;
    created_at: string;
    status: string;
  }>;
  settlement: any;
  aggregates?: {
    demo?: { pot: number; fees?: { platform: number; creator: number }; entriesCount: number };
    crypto?: { pot: number; fees?: { platform: number; creator: number }; entriesCount: number };
    total?: { pot: number; entriesCount: number };
  };
  disputes?: any[];
}

export const PredictionDetailPage: React.FC = () => {
  const { predictionId } = useParams<{ predictionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [data, setData] = useState<PredictionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reason, setReason] = useState('');
  const [settingOutcome, setSettingOutcome] = useState<string | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleOptionId, setSettleOptionId] = useState<string | null>(null);
  const [settleResolutionReason, setSettleResolutionReason] = useState('');
  const [settleResolutionSourceUrl, setSettleResolutionSourceUrl] = useState('');

  const fetchData = useCallback(async () => {
    if (!predictionId) return;
    setLoading(true);
    try {
      const json = await adminGet<any>(`/api/v2/admin/predictions/${predictionId}`, actorId);
      setData(json);
    } catch (e) {
      console.error('[PredictionDetail] Fetch error:', e);
      toast.error('Failed to load prediction');
    } finally {
      setLoading(false);
    }
  }, [predictionId, actorId]);

  const handleSetOutcome = async (
    optionId: string,
    opts?: { resolutionReason?: string; resolutionSourceUrl?: string }
  ): Promise<boolean> => {
    if (!predictionId) {
      toast.error('Missing prediction ID');
      return false;
    }
    
    // Check if we have admin access (either actorId or admin key)
    const adminKey = typeof window !== 'undefined' ? localStorage.getItem('fcz_admin_key') : null;
    if (!actorId && !adminKey) {
      toast.error('Admin access required. Please ensure you are logged in or have an admin key set.');
      return false;
    }
    
    setSettingOutcome(optionId);
    try {
      console.log('[Admin/Settlement] Attempting to settle prediction:', { predictionId, optionId, actorId: actorId || 'using admin key' });
      const result = await adminPost<any>(
        `/api/v2/admin/predictions/${predictionId}/outcome`,
        actorId || '',
        actorId
          ? { optionId, actorId, ...opts }
          : { optionId, ...opts }
      );
      
      console.log('[Admin/Settlement] Settlement result:', result);
      
      // Show detailed success message based on settlement results
      if (result?.alreadySettled) {
        toast.success('Already settled');
      } else if (result?.settlement) {
        const s = result.settlement;
        const totalEntries = (s.demoEntriesCount || 0) + (s.cryptoEntriesCount || 0);
        toast.success(
          `✅ Settled! ${totalEntries} entries processed. ` +
          `Fees: $${(s.totalPlatformFee || 0).toFixed(2)} platform, $${(s.totalCreatorFee || 0).toFixed(2)} creator.`
        );
      } else {
        toast.success('✅ Settlement complete');
      }
      
      // Wait a moment for DB to update, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchData();
      
      // Also refresh if we're on the settlements page (trigger parent refresh)
      if (window.location.pathname.includes('/admin/settlements')) {
        window.dispatchEvent(new Event('settlement-complete'));
      }
      return true;
    } catch (e: any) {
      console.error('[Admin/Settlement] Error:', e);
      const errorMsg = e?.message || e?.error?.message || `Failed to settle prediction (${e?.status || 'unknown error'})`;
      toast.error(errorMsg);
      return false;
    } finally {
      setSettingOutcome(null);
    }
  };

  const openSettleModal = useCallback((optionId: string) => {
    setSettleOptionId(optionId);
    setSettleResolutionReason('');
    setSettleResolutionSourceUrl('');
    setShowSettleModal(true);
  }, []);

  const confirmSettle = useCallback(async () => {
    if (!settleOptionId) return;
    const ok = await handleSetOutcome(settleOptionId, {
      resolutionReason: settleResolutionReason.trim() || undefined,
      resolutionSourceUrl: settleResolutionSourceUrl.trim() || undefined,
    });
    if (ok) {
      setShowSettleModal(false);
      setSettleOptionId(null);
      setSettleResolutionReason('');
      setSettleResolutionSourceUrl('');
    }
  }, [handleSetOutcome, settleOptionId, settleResolutionReason, settleResolutionSourceUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debug: Log admin access status
  useEffect(() => {
    const adminKey = typeof window !== 'undefined' ? localStorage.getItem('fcz_admin_key') : null;
    console.log('[Admin/PredictionDetail] Admin access check:', {
      actorId: actorId || 'MISSING',
      hasAdminKey: !!adminKey,
      predictionId,
    });
  }, [actorId, predictionId]);

  const handleVoid = async () => {
    if (!predictionId) {
      toast.error('Missing prediction ID');
      return;
    }
    if (reason.length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }
    
    // Check if we have admin access (either actorId or admin key)
    const adminKey = typeof window !== 'undefined' ? localStorage.getItem('fcz_admin_key') : null;
    if (!actorId && !adminKey) {
      toast.error('Admin access required. Please ensure you are logged in or have an admin key set.');
      setShowVoidModal(false);
      return;
    }
    
    setActionLoading(true);
    try {
      console.log('[Admin/Void] Attempting to void prediction:', { predictionId, reason: reason.substring(0, 20), actorId: actorId || 'using admin key' });
      const json = await adminPost<any>(`/api/v2/admin/predictions/${predictionId}/void`, actorId || '', { reason });
      console.log('[Admin/Void] Void result:', json);
      toast.success(`Prediction voided. ${json.refunds?.success || 0} bets refunded.`);
      setShowVoidModal(false);
      setReason('');
      fetchData();
    } catch (e: any) {
      console.error('[Admin/Void] Error:', e);
      toast.error(e.message || 'Failed to void prediction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!predictionId) {
      toast.error('Missing prediction ID');
      return;
    }
    if (reason.length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }
    
    // Check if we have admin access (either actorId or admin key)
    const adminKey = typeof window !== 'undefined' ? localStorage.getItem('fcz_admin_key') : null;
    if (!actorId && !adminKey) {
      toast.error('Admin access required. Please ensure you are logged in or have an admin key set.');
      setShowCancelModal(false);
      return;
    }
    
    setActionLoading(true);
    try {
      console.log('[Admin/Cancel] Attempting to cancel prediction:', { predictionId, reason: reason.substring(0, 20), actorId: actorId || 'using admin key' });
      await adminPost<any>(`/api/v2/admin/predictions/${predictionId}/cancel`, actorId || '', { reason });
      console.log('[Admin/Cancel] Cancel successful');
      toast.success('Prediction cancelled');
      setShowCancelModal(false);
      setReason('');
      fetchData();
    } catch (e: any) {
      console.error('[Admin/Cancel] Error:', e);
      toast.error(e.message || 'Failed to cancel prediction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (!predictionId) {
      toast.error('Missing prediction ID');
      return;
    }
    if (!window.confirm('Reset this prediction to active? This will undo settlement.')) return;
    
    // Check if we have admin access (either actorId or admin key)
    const adminKey = typeof window !== 'undefined' ? localStorage.getItem('fcz_admin_key') : null;
    if (!actorId && !adminKey) {
      toast.error('Admin access required. Please ensure you are logged in or have an admin key set.');
      return;
    }
    
    setActionLoading(true);
    try {
      console.log('[Admin/Reset] Attempting to reset prediction:', { predictionId, actorId: actorId || 'using admin key' });
      await adminPost<any>(`/api/v2/admin/predictions/${predictionId}/reset`, actorId || '', {});
      console.log('[Admin/Reset] Reset successful');
      toast.success('Prediction reset to active');
      fetchData();
    } catch (e: any) {
      console.error('[Admin/Reset] Error:', e);
      toast.error(e.message || 'Failed to reset prediction');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-white font-medium">Prediction not found</p>
      </div>
    );
  }

  const { prediction, creator, options, stats, entries } = data;
  const isActive = prediction.status === 'active';
  const isSettled = prediction.status === 'settled';
  const isTerminal = prediction.status === 'voided' || prediction.status === 'cancelled';
  const appUrl = FRONTEND_URL || 'https://app.fanclubz.app';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/predictions')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Predictions
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="w-7 h-7 text-emerald-500" />
            {prediction.title}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-400 font-mono text-sm">{prediction.id}</p>
            {(() => {
              const categoryLabel = getCategoryLabel(data);
              return categoryLabel ? (
                <span className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                  {categoryLabel}
                </span>
              ) : null;
            })()}
          </div>
        </div>

        {/* Status Badge */}
        {(() => {
          const statusUi = getPredictionStatusUi({
            status: prediction.status,
            settledAt: prediction.settledAt || prediction.resolutionDate,
            closedAt: prediction.closedAt || prediction.closesAt || prediction.endDate,
          });
          return (
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              statusUi.tone === 'success' ? 'bg-emerald-600/20 text-emerald-400' :
              statusUi.tone === 'danger' ? 'bg-red-600/20 text-red-400' :
              statusUi.tone === 'warning' ? 'bg-amber-600/20 text-amber-400' :
              'bg-slate-600/20 text-slate-400'
            }`}>
              {statusUi.label}
              {statusUi.subtext && (
                <span className="ml-2 text-xs opacity-75">{statusUi.subtext}</span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Total Stake</span>
          </div>
          <p className="text-2xl font-bold text-white">${stats.totalStake.toFixed(2)}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Bettors</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.uniqueBettors}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">Total Bets</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.entryCount}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Created</span>
          </div>
          <p className="text-lg font-medium text-white">
            {new Date(prediction.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Aggregates (by rail) */}
      {data.aggregates && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">Demo rail</h3>
            <p className="text-slate-400 text-sm">
              Pot: <span className="text-white">${Number(data.aggregates.demo?.pot || 0).toFixed(2)}</span>
            </p>
            <p className="text-slate-400 text-sm">
              Entries: <span className="text-white">{data.aggregates.demo?.entriesCount || 0}</span>
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">Crypto rail</h3>
            <p className="text-slate-400 text-sm">
              Pot: <span className="text-white">${Number(data.aggregates.crypto?.pot || 0).toFixed(2)}</span>
            </p>
            <p className="text-slate-400 text-sm">
              Entries: <span className="text-white">{data.aggregates.crypto?.entriesCount || 0}</span>
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">Total</h3>
            <p className="text-slate-400 text-sm">
              Pot: <span className="text-white">${Number(data.aggregates.total?.pot || 0).toFixed(2)}</span>
            </p>
            <p className="text-slate-400 text-sm">
              Entries: <span className="text-white">{data.aggregates.total?.entriesCount || 0}</span>
            </p>
          </div>
        </div>
      )}

      {/* Creator Info */}
      {creator && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Creator
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{creator.fullName || creator.username || 'Unknown'}</p>
              <p className="text-sm text-slate-400">{creator.email}</p>
            </div>
            <button
              onClick={() => navigate(`/admin/users/${creator.id}`)}
              className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 flex items-center gap-1"
            >
              View Profile
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-white font-semibold">Options</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`px-4 py-3 flex items-center justify-between ${
                prediction.winningOptionId === opt.id ? 'bg-emerald-600/10 border-l-4 border-emerald-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {prediction.winningOptionId === opt.id && (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <p className="text-white font-medium">{opt.text}</p>
                  <p className="text-sm text-slate-400">
                    Odds: {opt.odds?.toFixed(2) || 'N/A'} • Prob: {((opt.probability || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">${opt.totalStake.toFixed(2)}</p>
                <p className="text-sm text-slate-400">staked</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white font-semibold">Recent Bets ({entries.length})</h2>
          </div>
          <div className="divide-y divide-slate-700 max-h-[300px] overflow-y-auto">
            {entries.map((entry) => {
              const opt = options.find(o => o.id === entry.option_id);
              return (
                <div key={entry.id} className="px-4 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white font-mono text-xs">
                      {entry.user_id.slice(0, 8)}...
                    </span>
                    <span className="text-slate-400 ml-2">on "{opt?.text || '?'}"</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">${Number(entry.amount).toFixed(2)}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      entry.provider === 'demo-wallet' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                    }`}>
                      {entry.provider === 'demo-wallet' ? 'Demo' : 'Crypto'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bar (Phase 3B spec) */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Navigation</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {/* View as user (creator) */}
          {creator?.id && (
            <button
              onClick={() => navigate(`/admin/users/${creator.id}/view`)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              View as user (creator)
            </button>
          )}

          {/* Go to prediction page (open in app) */}
          <button
            onClick={() => window.open(`${appUrl.replace(/\/$/, '')}${buildPredictionCanonicalPath(predictionId, prediction?.title)}`, '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Go to prediction page
          </button>
        </div>
      </div>

      {/* Settle Prediction - Admin sets outcome and triggers immediate settlement */}
      {!prediction.winningOptionId && !isTerminal && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2">Settle Prediction</h3>
          <p className="text-slate-400 text-sm mb-3">
            Select the winning outcome to settle this prediction immediately. Winners will be credited and losers debited.
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => openSettleModal(o.id)}
                disabled={settingOutcome !== null}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {settingOutcome === o.id ? 'Settling…' : `Settle: ${o.text}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Admin Actions</h3>
        <div className="flex flex-wrap gap-3">
          {/* Void - refunds bets */}
          <button
            onClick={() => setShowVoidModal(true)}
            disabled={isTerminal || actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Void (Refund Bets)
          </button>

          {/* Cancel - no refunds */}
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={isTerminal || actionLoading}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Cancel (No Refund)
          </button>

          {/* Reset - undo settlement */}
          {isSettled && (
            <button
              onClick={handleReset}
              disabled={actionLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Active
            </button>
          )}
        </div>

        {isTerminal && (
          <p className="text-amber-400 text-sm mt-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            This prediction has been {prediction.status} and cannot be modified further.
          </p>
        )}
      </div>

      {/* Settle Modal (Phase 9: optional resolution reasoning + source URL) */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Confirm settlement</h3>
            <p className="text-slate-400 mb-4">
              Optional: add a short reasoning + source URL for the public “Resolution” section.
            </p>

            <label className="block text-sm font-medium text-slate-300 mb-2">
              Resolution reasoning (optional)
            </label>
            <textarea
              value={settleResolutionReason}
              onChange={(e) => setSettleResolutionReason(e.target.value)}
              placeholder="e.g. Final score 2–1 (official match report)"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
              maxLength={1000}
            />

            <label className="block text-sm font-medium text-slate-300 mb-2 mt-4">
              Source URL (optional)
            </label>
            <input
              value={settleResolutionSourceUrl}
              onChange={(e) => setSettleResolutionSourceUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setShowSettleModal(false); setSettleOptionId(null); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                disabled={settingOutcome !== null}
              >
                Cancel
              </button>
              <button
                onClick={confirmSettle}
                disabled={!settleOptionId || settingOutcome !== null}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {settingOutcome && <Loader2 className="w-4 h-4 animate-spin" />}
                Settle prediction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Void Prediction</h3>
            <p className="text-slate-400 mb-4">
              This will void the prediction and refund all bets to participants.
            </p>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this prediction is being voided..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowVoidModal(false); setReason(''); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={reason.length < 5 || actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Void Prediction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Cancel Prediction</h3>
            <p className="text-amber-400 text-sm mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This will cancel the prediction <strong>without refunding bets</strong>. 
                Use this only for spam/fraud predictions.
              </span>
            </p>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this prediction is being cancelled..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowCancelModal(false); setReason(''); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={reason.length < 5 || actionLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel Prediction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionDetailPage;

