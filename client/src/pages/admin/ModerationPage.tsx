import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  Shield,
  Search,
  Loader2,
  User,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flag,
  BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet, adminPost } from '@/lib/adminApi';

interface Creator {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isBanned: boolean;
  banReason: string | null;
  isVerified: boolean;
  predictionCount: number;
}

interface ContentReport {
  id: string;
  reporterId: string;
  reporterUsername: string | null;
  targetType: string;
  targetId: string;
  reasonCategory?: string | null;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

type TabType = 'creators' | 'reports';
type ReportStatusFilter = 'pending' | 'resolved';

export const ModerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [activeTab, setActiveTab] = useState<TabType>('creators');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banTarget, setBanTarget] = useState<Creator | null>(null);
  const [banReason, setBanReason] = useState('');

  // Reports tab state
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>('pending');
  const [resolveTarget, setResolveTarget] = useState<ContentReport | null>(null);
  const [resolveAction, setResolveAction] = useState<'dismiss' | 'warn' | 'remove' | 'ban'>('dismiss');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    try {
      if (!actorId) throw new Error('Missing user');
      const data = await adminGet<any>(`/api/v2/admin/moderation/creators`, actorId, { limit: 100 });
      setCreators(data.items || []);
    } catch (e) {
      console.error('[ModerationPage] Fetch error:', e);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      if (!actorId) throw new Error('Missing user');
      const data = await adminGet<any>(`/api/v2/admin/moderation/reports`, actorId, {
        status: reportStatusFilter,
        limit: 100,
      });
      setReports(data.items || []);
    } catch (e) {
      console.error('[ModerationPage] Reports fetch error:', e);
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [actorId, reportStatusFilter]);

  useEffect(() => {
    if (activeTab === 'creators') {
      fetchCreators();
    }
  }, [activeTab, fetchCreators]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, reportStatusFilter, fetchReports]);

  const handleBan = async () => {
    if (!banTarget || !actorId || banReason.length < 5) return;
    setActionLoading(banTarget.id);
    try {
      const json = await adminPost<any>(`/api/v2/admin/moderation/users/${banTarget.id}/ban`, actorId, { reason: banReason });
      toast.success('User banned successfully');
      setShowBanModal(false);
      setBanTarget(null);
      setBanReason('');
      fetchCreators();
    } catch (e: any) {
      toast.error(e.message || 'Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId: string) => {
    if (!actorId) return;
    setActionLoading(userId);
    try {
      await adminPost<any>(`/api/v2/admin/moderation/users/${userId}/unban`, actorId, {});
      toast.success('User unbanned successfully');
      fetchCreators();
    } catch (e: any) {
      toast.error(e.message || 'Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (userId: string) => {
    if (!actorId) return;
    setActionLoading(userId);
    try {
      await adminPost<any>(`/api/v2/admin/moderation/users/${userId}/verify`, actorId, {});
      toast.success('User verified successfully');
      fetchCreators();
    } catch (e: any) {
      toast.error(e.message || 'Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnverify = async (userId: string) => {
    if (!actorId) return;
    setActionLoading(userId);
    try {
      await adminPost<any>(`/api/v2/admin/moderation/users/${userId}/unverify`, actorId, {});
      toast.success('Verification removed');
      fetchCreators();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove verification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async () => {
    if (!resolveTarget || !actorId) return;
    setResolveLoading(true);
    try {
      await adminPost<any>(
        `/api/v2/admin/moderation/reports/${resolveTarget.id}/resolve`,
        actorId,
        { action: resolveAction, actorId, notes: resolveNotes || undefined }
      );
      toast.success('Report resolved');
      setResolveTarget(null);
      setResolveNotes('');
      setResolveAction('dismiss');
      fetchReports();
    } catch (e: any) {
      toast.error(e.message || 'Failed to resolve report');
    } finally {
      setResolveLoading(false);
    }
  };

  const formatReportDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const filteredCreators = searchQuery
    ? creators.filter(c =>
        c.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : creators;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="w-7 h-7 text-emerald-500" />
          Moderation
        </h1>
        <p className="text-slate-400 mt-1">Manage creators, bans, and content reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('creators')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'creators'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Creators
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'reports'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Flag className="w-4 h-4 inline mr-2" />
          Reports
        </button>
      </div>

      {activeTab === 'creators' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by username, name, or email..."
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Creators List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-slate-400 mt-3">Loading creators...</p>
              </div>
            ) : filteredCreators.length === 0 ? (
              <div className="p-12 text-center">
                <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">No creators found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className={`px-4 py-3 flex items-center justify-between ${
                      creator.isBanned ? 'bg-red-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                        {creator.avatarUrl ? (
                          <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">
                            {creator.fullName || creator.username || 'Unknown'}
                          </p>
                          {creator.isVerified && (
                            <BadgeCheck className="w-4 h-4 text-blue-400" aria-label="Verified" />
                          )}
                          {creator.isBanned && (
                            <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded-full">
                              Banned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">
                          {creator.email} • {creator.predictionCount} predictions
                        </p>
                        {creator.isBanned && creator.banReason && (
                          <p className="text-xs text-red-400 mt-0.5">
                            Reason: {creator.banReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Profile */}
                      <button
                        onClick={() => navigate(`/admin/users/${creator.id}`)}
                        className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
                      >
                        View
                      </button>

                      {/* Verify/Unverify */}
                      {creator.isVerified ? (
                        <button
                          onClick={() => handleUnverify(creator.id)}
                          disabled={actionLoading === creator.id}
                          className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-500 disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === creator.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Unverify
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerify(creator.id)}
                          disabled={actionLoading === creator.id}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === creator.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <BadgeCheck className="w-3 h-3" />
                          )}
                          Verify
                        </button>
                      )}

                      {/* Ban/Unban */}
                      {creator.isBanned ? (
                        <button
                          onClick={() => handleUnban(creator.id)}
                          disabled={actionLoading === creator.id}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === creator.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBanTarget(creator); setShowBanModal(true); }}
                          disabled={actionLoading === creator.id}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          Ban
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setReportStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                reportStatusFilter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setReportStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                reportStatusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Resolved
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {reportsLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-slate-400 mt-3">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center">
                <Flag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">
                  {reportStatusFilter === 'pending' ? 'No pending reports' : 'No resolved reports'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {reportStatusFilter === 'pending'
                    ? 'User reports will appear here when submitted.'
                    : 'Resolved reports are listed here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                          {report.targetType}
                        </span>
                        <span className="text-white font-medium truncate">
                          @{report.reporterUsername ?? report.reporterId.slice(0, 8)}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {formatReportDate(report.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {report.reasonCategory && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-200">
                            {report.reasonCategory}
                          </span>
                        )}
                        <p className="text-slate-300 text-sm line-clamp-2">{report.reason}</p>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Target: {report.targetType} {report.targetId.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {report.targetType === 'prediction' && (
                        <a
                          href={`/prediction/${report.targetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
                        >
                          View
                        </a>
                      )}
                      {report.status === 'pending' && (
                        <button
                          onClick={() => {
                            setResolveTarget(report);
                            setResolveAction('dismiss');
                            setResolveNotes('');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Resolve Report Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Resolve Report</h3>
            <p className="text-slate-400 text-sm mb-4">
              {resolveTarget.targetType} · reported by @{resolveTarget.reporterUsername ?? 'unknown'}
            </p>
            <div className="flex items-center gap-2 mb-4">
              {resolveTarget.reasonCategory && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-200">
                  {resolveTarget.reasonCategory}
                </span>
              )}
              <p className="text-slate-300 text-sm line-clamp-2">{resolveTarget.reason}</p>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Resolution action</label>
            <select
              value={resolveAction}
              onChange={(e) => setResolveAction(e.target.value as 'dismiss' | 'warn' | 'remove' | 'ban')}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            >
              <option value="dismiss">Dismiss</option>
              <option value="warn">Warn user</option>
              <option value="remove">Remove content</option>
              <option value="ban">Ban user</option>
            </select>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Internal notes..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setResolveTarget(null); setResolveNotes(''); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveReport}
                disabled={resolveLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {resolveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && banTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Ban User</h3>
            <p className="text-slate-400 mb-4">
              Ban <strong className="text-white">{banTarget.fullName || banTarget.username}</strong>?
              They will be unable to access the platform.
            </p>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason (required)
            </label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Explain why this user is being banned..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowBanModal(false); setBanTarget(null); setBanReason(''); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={banReason.length < 5 || actionLoading === banTarget.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading === banTarget.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationPage;

