import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config';
import {
  User,
  ArrowLeft,
  Wallet,
  Target,
  Trophy,
  Calendar,
  Mail,
  Shield,
  BadgeCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

interface UserDetail {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface WalletInfo {
  availableBalance: number;
  reservedBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  currency: string;
}

interface UserStats {
  totalBets: number;
  totalWins: number;
  winRate: string;
}

interface TimelineItem {
  id: string;
  type: 'wallet_tx' | 'entry' | 'settlement' | 'admin';
  timestamp: string;
  summary: string;
  details: Record<string, any>;
}

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'wallets' | 'bets' | 'settlements'>('timeline');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'wallet' | 'bets' | 'settlements' | 'admin'>('all');

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v2/admin/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data.user);
      setWallet(data.wallet);
      setStats(data.stats);
      setAddresses(data.addresses || []);
    } catch (e) {
      console.error('[UserDetail] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTimeline = useCallback(async () => {
    if (!userId) return;
    setTimelineLoading(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/api/v2/admin/users/${userId}/timeline?limit=100&type=${timelineFilter}`
      );
      if (!res.ok) throw new Error('Failed to fetch timeline');
      const data = await res.json();
      setTimeline(data.items || []);
    } catch (e) {
      console.error('[UserDetail] Timeline error:', e);
    } finally {
      setTimelineLoading(false);
    }
  }, [userId, timelineFilter]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wallet_tx':
        return <Wallet className="w-4 h-4" />;
      case 'entry':
        return <Target className="w-4 h-4" />;
      case 'settlement':
        return <Trophy className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'wallet_tx':
        return 'bg-emerald-600/20 text-emerald-400';
      case 'entry':
        return 'bg-blue-600/20 text-blue-400';
      case 'settlement':
        return 'bg-purple-600/20 text-purple-400';
      case 'admin':
        return 'bg-amber-600/20 text-amber-400';
      default:
        return 'bg-slate-600/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-white font-medium">User not found</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* User Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-slate-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {user.fullName || user.username || 'Unknown User'}
              </h1>
              {user.isAdmin && (
                <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs font-medium rounded flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
              {user.isVerified && (
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-medium rounded flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>

            {user.username && (
              <p className="text-slate-400 mt-1">@{user.username}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm">
              {user.email && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-4 h-4" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2 font-mono">ID: {user.id}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Available</span>
          </div>
          <p className="text-xl font-bold text-white">
            ${wallet?.availableBalance?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-sm">Total Deposited</span>
          </div>
          <p className="text-xl font-bold text-white">
            ${wallet?.totalDeposited?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">Total Bets</span>
          </div>
          <p className="text-xl font-bold text-white">{stats?.totalBets || 0}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Win Rate</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{stats?.winRate || '0'}%</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-semibold">Activity Timeline</h2>
          <select
            value={timelineFilter}
            onChange={(e) => setTimelineFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Activity</option>
            <option value="wallet">Wallet</option>
            <option value="bets">Bets</option>
            <option value="settlements">Settlements</option>
            <option value="admin">Admin Actions</option>
          </select>
        </div>

        <div className="divide-y divide-slate-700 max-h-[500px] overflow-y-auto">
          {timelineLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
              <p className="text-slate-400 mt-2 text-sm">Loading timeline...</p>
            </div>
          ) : timeline.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No activity found</p>
            </div>
          ) : (
            timeline.map((item) => (
              <div key={item.id} className="hover:bg-slate-700/30 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{item.summary}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {expandedId === item.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedId === item.id && (
                  <div className="px-4 pb-3">
                    <div className="bg-slate-900 rounded-lg p-3 ml-11">
                      <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                      {item.details.predictionId && (
                        <button
                          onClick={() => navigate(`/prediction/${item.details.predictionId}`)}
                          className="mt-2 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Prediction
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Crypto Addresses */}
      {addresses.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Crypto Addresses</h3>
          <div className="space-y-2">
            {addresses.map((addr, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-mono text-slate-300">{addr.address}</span>
                <span className="text-slate-500">Chain {addr.chain_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailPage;

