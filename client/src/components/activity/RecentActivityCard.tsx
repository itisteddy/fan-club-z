import React, { useState } from 'react';
import {
  Activity,
  DollarSign,
  Download,
  ArrowUpRight,
  Lock,
  Unlock,
  Target,
  Gift,
  Trophy,
  XCircle,
  CheckCircle,
  PiggyBank,
  ExternalLink,
  Copy,
  X,
  Clock,
} from 'lucide-react';
import { formatTimeAgo, formatCurrency } from '@/lib/format';
import type { ActivityKind } from '@fanclubz/shared';
import toast from 'react-hot-toast';

export interface ActivityDisplayItem {
  id: string;
  kind: ActivityKind;
  amountUSD: number;
  txHash?: string;
  createdAt: string;
  meta?: {
    predictionId?: string;
    predictionTitle?: string;
    optionLabel?: string;
    description?: string;
    [key: string]: any;
  };
}

interface ActivityDisplay {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  amount: string | null;
  badge: string;
  badgeColor: string;
}

function getActivityDisplay(item: ActivityDisplayItem): ActivityDisplay {
  switch (item.kind) {
    case 'deposit':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Download className="w-4 h-4 text-emerald-600" />,
        title: 'Deposited USDC',
        subtitle: item.meta?.description,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: 'deposit',
        badgeColor: 'text-emerald-600',
      };
    case 'withdraw':
      return {
        iconBg: 'bg-orange-100',
        icon: <ArrowUpRight className="w-4 h-4 text-orange-600" />,
        title: 'Withdrew USDC',
        subtitle: item.meta?.description,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: 'withdraw',
        badgeColor: 'text-orange-600',
      };
    case 'lock':
      return {
        iconBg: 'bg-amber-100',
        icon: <Lock className="w-4 h-4 text-amber-600" />,
        title: 'Funds locked',
        subtitle: item.meta?.predictionTitle,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: 'locked',
        badgeColor: 'text-amber-600',
      };
    case 'unlock':
    case 'release':
      return {
        iconBg: 'bg-blue-100',
        icon: <Unlock className="w-4 h-4 text-blue-600" />,
        title: 'Funds released',
        subtitle: item.meta?.predictionTitle,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: 'released',
        badgeColor: 'text-blue-600',
      };
    case 'entry':
    case 'bet_placed':
      return {
        iconBg: 'bg-purple-100',
        icon: <Target className="w-4 h-4 text-purple-600" />,
        title: item.meta?.predictionTitle ? `Staked on "${item.meta.predictionTitle}"` : 'Stake placed',
        subtitle: item.meta?.optionLabel ? `Option: ${item.meta.optionLabel}` : undefined,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: 'placed',
        badgeColor: 'text-purple-600',
      };
    case 'win':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Trophy className="w-4 h-4 text-emerald-600" />,
        title: 'Won prediction',
        subtitle: item.meta?.predictionTitle,
        amount: `+${formatCurrency(item.amountUSD, { compact: true })}`,
        badge: 'won',
        badgeColor: 'text-emerald-600',
      };
    case 'loss':
      return {
        iconBg: 'bg-red-100',
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        title: 'Lost prediction',
        subtitle: item.meta?.predictionTitle,
        amount: `-${formatCurrency(item.amountUSD, { compact: true })}`,
        badge: 'lost',
        badgeColor: 'text-red-500',
      };
    case 'claim':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Gift className="w-4 h-4 text-emerald-600" />,
        title: 'Claimed winnings',
        subtitle: item.meta?.predictionTitle,
        amount: `+${formatCurrency(item.amountUSD, { compact: true })}`,
        badge: 'claimed',
        badgeColor: 'text-emerald-600',
      };
    case 'payout':
      return {
        iconBg: 'bg-emerald-100',
        icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
        title: 'Payout received',
        subtitle: item.meta?.predictionTitle,
        amount: `+${formatCurrency(item.amountUSD, { compact: true })}`,
        badge: 'payout',
        badgeColor: 'text-emerald-600',
      };
    case 'creator_fee':
      return {
        iconBg: 'bg-amber-100',
        icon: <PiggyBank className="w-4 h-4 text-amber-600" />,
        title: 'Creator fee received',
        subtitle: item.meta?.predictionTitle,
        amount: `+${formatCurrency(item.amountUSD, { compact: true })}`,
        badge: 'creator',
        badgeColor: 'text-amber-600',
      };
    case 'platform_fee':
      return {
        iconBg: 'bg-slate-100',
        icon: <DollarSign className="w-4 h-4 text-slate-600" />,
        title: 'Platform fee',
        subtitle: item.meta?.predictionTitle,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: 'platform',
        badgeColor: 'text-slate-600',
      };
    case 'settlement':
      return {
        iconBg: 'bg-indigo-100',
        icon: <CheckCircle className="w-4 h-4 text-indigo-600" />,
        title: 'Settlement posted',
        subtitle: item.meta?.predictionTitle,
        amount: null,
        badge: 'settled',
        badgeColor: 'text-indigo-600',
      };
    case 'bet_refund':
      return {
        iconBg: 'bg-blue-100',
        icon: <Unlock className="w-4 h-4 text-blue-600" />,
        title: 'Bet refunded',
        subtitle: item.meta?.predictionTitle,
        amount: `+${formatCurrency(item.amountUSD, { compact: true })}`,
        badge: 'refund',
        badgeColor: 'text-blue-600',
      };
    default:
      return {
        iconBg: 'bg-gray-100',
        icon: <Activity className="w-4 h-4 text-gray-500" />,
        title: 'Activity',
        subtitle: item.meta?.description,
        amount: formatCurrency(item.amountUSD, { compact: true }),
        badge: item.kind,
        badgeColor: 'text-gray-500',
      };
  }
}

interface RecentActivityCardProps {
  items: ActivityDisplayItem[];
  loading?: boolean;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function RecentActivityCard({
  items,
  loading = false,
  maxItems = 5,
  showViewAll = false,
  onViewAll,
  emptyTitle = 'No recent activity',
  emptyDescription = 'Your activity will appear here.',
  emptyAction,
}: RecentActivityCardProps) {
  const [selectedItem, setSelectedItem] = useState<ActivityDisplayItem | null>(null);
  const displayItems = items.slice(0, maxItems);

  return (
    <>
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          {showViewAll && items.length > 0 && (
            <button
              onClick={onViewAll}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="animate-pulse flex items-center justify-between py-2 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full" />
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-32 mb-1" />
                    <div className="h-2 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-12" />
              </div>
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <div className="space-y-2">
            {displayItems.map((item) => {
              const display = getActivityDisplay(item);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${display.iconBg}`}
                    >
                      {display.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{display.title}</p>
                      {display.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{display.subtitle}</p>
                      )}
                      <p className="text-[11px] text-gray-400">
                        {item.createdAt ? formatTimeAgo(item.createdAt) : 'Recently'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-3">
                    {display.amount && (
                      <div className={`text-sm font-semibold font-mono ${
                        display.amount.startsWith('+') ? 'text-emerald-600' :
                        display.amount.startsWith('-') ? 'text-red-500' :
                        'text-gray-700'
                      }`}>
                        {display.amount}
                      </div>
                    )}
                    <div className={`text-xs font-medium ${display.badgeColor}`}>{display.badge}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-900 font-medium mb-1">{emptyTitle}</p>
            <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">{emptyDescription}</p>
            {emptyAction}
          </div>
        )}
      </div>

      {/* Activity detail modal */}
      {selectedItem && (
        <ActivityDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}

interface ActivityDetailModalProps {
  item: ActivityDisplayItem;
  onClose: () => void;
}

function ActivityDetailModal({ item, onClose }: ActivityDetailModalProps) {
  const display = getActivityDisplay(item);

  const handleCopyTxHash = async () => {
    if (!item.txHash) return;
    try {
      await navigator.clipboard.writeText(item.txHash);
      toast.success('Copied transaction hash');
    } catch {
      toast.error('Unable to copy hash');
    }
  };

  const handleViewOnExplorer = () => {
    if (!item.txHash) return;
    const url = `https://sepolia.basescan.org/tx/${item.txHash}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 z-[1] mb-[calc(72px+env(safe-area-inset-bottom,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${display.iconBg}`}>
              {display.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Activity</p>
              <h3 className="text-lg font-semibold text-gray-900">{display.title}</h3>
            </div>
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close details"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-1">Amount</p>
          <p className={`text-2xl font-semibold ${
            display.amount?.startsWith('+') ? 'text-emerald-600' :
            display.amount?.startsWith('-') ? 'text-red-500' :
            'text-gray-900'
          }`}>
            {display.amount || '$0.00'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.createdAt ? formatTimeAgo(item.createdAt) : 'Just now'}</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${display.badgeColor} bg-gray-100`}>
              {display.badge}
            </span>
          </div>
        </div>

        {(item.meta?.predictionTitle || item.meta?.optionLabel) && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Prediction</p>
            <p className="text-sm font-medium text-gray-900">
              {item.meta.predictionTitle || 'Unknown prediction'}
            </p>
            {item.meta.optionLabel && (
              <p className="text-xs text-gray-500 mt-0.5">Position: {item.meta.optionLabel}</p>
            )}
          </div>
        )}

        {item.txHash ? (
          <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Transaction hash
              </span>
              <span className="font-mono text-xs text-gray-900 truncate max-w-[140px]">
                {item.txHash.slice(0, 10)}…{item.txHash.slice(-6)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50"
                onClick={handleCopyTxHash}
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50"
                onClick={handleViewOnExplorer}
              >
                <ExternalLink className="w-4 h-4" />
                View
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-2xl p-4 text-sm text-gray-600 bg-gray-50">
            This entry was recorded off-chain, so a transaction hash isn't available.
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentActivityCard;
