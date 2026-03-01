import React from 'react';
import {
  Target,
  TrendingUp,
  DollarSign,
  Activity,
  Download,
  ArrowUpRight,
  Lock,
  Unlock,
  Trophy,
  XCircle,
  Receipt,
  CheckCircle,
  Gift,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatTimeAgo } from '@/lib/format';

export type ActivityKind = 
  | 'deposit' 
  | 'withdraw' 
  | 'lock' 
  | 'unlock' 
  | 'bet_placed' 
  | 'bet_refund' 
  | 'claim' 
  | 'settlement' 
  | 'creator_fee' 
  | 'platform_fee'
  | 'win' 
  | 'loss'
  | 'payout'
  | 'entry.create'
  | 'prediction.created'
  | 'wallet.unlock'
  | 'wallet.payout'
  | 'wallet.platform_fee'
  | 'wallet.creator_fee';

export interface ActivityItemData {
  id: string;
  kind: ActivityKind | string;
  type?: string;
  amount?: number;
  amountUSD?: number;
  txHash?: string;
  createdAt?: string;
  timestamp?: string;
  description?: string;
  predictionTitle?: string;
  meta?: {
    prediction_title?: string;
    option_label?: string;
    category?: string;
    [key: string]: any;
  };
  data?: {
    amount?: number | string;
    option_label?: string;
    category?: string;
    prediction_title?: string;
    [key: string]: any;
  };
}

interface ActivityDisplayInfo {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  amount: string | null;
  badge: string;
  badgeColor: string;
  isPositive: boolean;
}

/**
 * Maps activity item to display info matching Profile design language
 */
export function getActivityDisplay(item: ActivityItemData): ActivityDisplayInfo {
  const kind = (item.kind || item.type || '').toLowerCase();
  const amount = item.amountUSD ?? item.amount ?? 0;
  const formattedAmount = amount > 0 ? formatCurrency(amount, { compact: true }) : null;
  const predTitle = item.predictionTitle || item.meta?.prediction_title || item.data?.prediction_title || '';
  const optionLabel = item.meta?.option_label || item.data?.option_label || '';
  
  switch (kind) {
    // Deposits
    case 'deposit':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Download className="w-4 h-4 text-emerald-600" />,
        title: 'Deposited Zaurum',
        subtitle: 'To escrow',
        amount: formattedAmount,
        badge: 'deposit',
        badgeColor: 'text-emerald-600',
        isPositive: true,
      };
      
    // Withdrawals
    case 'withdraw':
      return {
        iconBg: 'bg-orange-100',
        icon: <ArrowUpRight className="w-4 h-4 text-orange-600" />,
        title: 'Withdrew Zaurum',
        subtitle: 'From escrow',
        amount: formattedAmount,
        badge: 'withdraw',
        badgeColor: 'text-orange-600',
        isPositive: false,
      };
      
    // Stakes placed
    case 'bet_placed':
    case 'entry':
    case 'entry.create':
      return {
        iconBg: 'bg-blue-100',
        icon: <Target className="w-4 h-4 text-blue-600" />,
        title: predTitle ? `Staked on ${predTitle}` : 'Stake placed',
        subtitle: optionLabel ? `Option: ${optionLabel}` : '',
        amount: formattedAmount,
        badge: 'placed',
        badgeColor: 'text-blue-600',
        isPositive: false,
      };
      
    // Predictions created
    case 'prediction.created':
      return {
        iconBg: 'bg-purple-100',
        icon: <TrendingUp className="w-4 h-4 text-purple-600" />,
        title: predTitle ? `Created "${predTitle}"` : 'Created a prediction',
        subtitle: item.data?.category ? `Category: ${item.data.category}` : '',
        amount: null,
        badge: 'created',
        badgeColor: 'text-purple-600',
        isPositive: true,
      };
      
    // Wins
    case 'win':
    case 'payout':
    case 'wallet.payout':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Trophy className="w-4 h-4 text-emerald-600" />,
        title: 'Won prediction',
        subtitle: predTitle || 'Payout received',
        amount: formattedAmount,
        badge: 'won',
        badgeColor: 'text-emerald-600',
        isPositive: true,
      };
      
    // Losses
    case 'loss':
      return {
        iconBg: 'bg-red-100',
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        title: 'Lost prediction',
        subtitle: predTitle || 'Stake forfeited',
        amount: formattedAmount,
        badge: 'lost',
        badgeColor: 'text-red-500',
        isPositive: false,
      };
      
    // Claims (on-chain)
    case 'claim':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Receipt className="w-4 h-4 text-emerald-700" />,
        title: 'Claimed winnings',
        subtitle: predTitle || 'On-chain claim',
        amount: formattedAmount,
        badge: 'claimed',
        badgeColor: 'text-emerald-700',
        isPositive: true,
      };
      
    // Settlement posted
    case 'settlement':
      return {
        iconBg: 'bg-indigo-100',
        icon: <CheckCircle className="w-4 h-4 text-indigo-600" />,
        title: 'Settlement posted',
        subtitle: predTitle || 'On-chain',
        amount: formattedAmount,
        badge: 'settled',
        badgeColor: 'text-indigo-600',
        isPositive: true,
      };
      
    // Creator fee
    case 'creator_fee':
    case 'wallet.creator_fee':
      return {
        iconBg: 'bg-amber-100',
        icon: <Gift className="w-4 h-4 text-amber-600" />,
        title: 'Creator earnings',
        subtitle: predTitle || 'Fee received',
        amount: formattedAmount,
        badge: 'creator',
        badgeColor: 'text-amber-600',
        isPositive: true,
      };
      
    // Platform fee
    case 'platform_fee':
    case 'wallet.platform_fee':
      return {
        iconBg: 'bg-slate-100',
        icon: <DollarSign className="w-4 h-4 text-slate-600" />,
        title: 'Platform fee',
        subtitle: predTitle || '',
        amount: formattedAmount,
        badge: 'platform',
        badgeColor: 'text-slate-600',
        isPositive: true,
      };
      
    // Lock (funds reserved)
    case 'lock':
      return {
        iconBg: 'bg-amber-100',
        icon: <Lock className="w-4 h-4 text-amber-600" />,
        title: 'Funds locked',
        subtitle: predTitle || 'Reserved for bet',
        amount: formattedAmount,
        badge: 'locked',
        badgeColor: 'text-amber-600',
        isPositive: false,
      };
      
    // Unlock (funds released)
    case 'unlock':
    case 'wallet.unlock':
      return {
        iconBg: 'bg-emerald-100',
        icon: <Unlock className="w-4 h-4 text-emerald-600" />,
        title: 'Funds released',
        subtitle: predTitle || 'From escrow',
        amount: formattedAmount,
        badge: 'released',
        badgeColor: 'text-emerald-600',
        isPositive: true,
      };
      
    // Bet refund
    case 'bet_refund':
      return {
        iconBg: 'bg-blue-100',
        icon: <ArrowUpRight className="w-4 h-4 text-blue-600" />,
        title: 'Bet refunded',
        subtitle: predTitle || 'Stake returned',
        amount: formattedAmount,
        badge: 'refund',
        badgeColor: 'text-blue-600',
        isPositive: true,
      };
      
    // Default
    default:
      return {
        iconBg: 'bg-gray-100',
        icon: <Activity className="w-4 h-4 text-gray-500" />,
        title: item.description || 'Activity',
        subtitle: predTitle || '',
        amount: formattedAmount,
        badge: kind || 'activity',
        badgeColor: 'text-gray-500',
        isPositive: true,
      };
  }
}

interface ActivityFeedItemProps {
  item: ActivityItemData;
  onClick?: () => void;
  showTxLink?: boolean;
}

/**
 * Single activity item row matching Profile design
 */
export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ 
  item, 
  onClick,
  showTxLink = true 
}) => {
  const display = getActivityDisplay(item);
  const timestamp = item.createdAt || item.timestamp;
  const txUrl = item.txHash ? `https://sepolia.basescan.org/tx/${item.txHash}` : null;
  
  return (
    <div 
      className={`flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${display.iconBg}`}>
          {display.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{display.title}</p>
          {display.subtitle && (
            <p className="text-xs text-gray-500 truncate">{display.subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-gray-400">
              {timestamp ? formatTimeAgo(timestamp) : 'Recently'}
            </p>
            {showTxLink && txUrl && (
              <a
                href={txUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 hover:text-emerald-700"
              >
                <span className="font-mono">{item.txHash?.slice(0, 6)}…</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right flex-shrink-0 ml-2">
        {display.amount && (
          <div className={`text-sm font-semibold font-mono ${display.isPositive ? 'text-emerald-600' : 'text-gray-700'}`}>
            {display.isPositive ? '+' : '-'}{display.amount}
          </div>
        )}
        <div className={`text-xs font-medium ${display.badgeColor}`}>
          {display.badge}
        </div>
      </div>
    </div>
  );
};

interface ActivityFeedCardProps {
  items: ActivityItemData[];
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onItemClick?: (item: ActivityItemData) => void;
  maxItems?: number;
  showTxLinks?: boolean;
}

/**
 * Unified activity feed card matching Profile design
 */
const ActivityFeedCard: React.FC<ActivityFeedCardProps> = ({
  items,
  loading = false,
  emptyMessage = 'No recent activity',
  emptyAction,
  title = 'Recent Activity',
  showViewAll = false,
  onViewAll,
  onItemClick,
  maxItems = 8,
  showTxLinks = true,
}) => {
  const displayItems = items.slice(0, maxItems);
  
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
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
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {showViewAll && items.length > 0 && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All
          </button>
        )}
      </div>
      
      {displayItems.length > 0 ? (
        <div className="space-y-1">
          {displayItems.map((item, index) => (
            <ActivityFeedItem
              key={item.id || index}
              item={item}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              showTxLink={showTxLinks}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-900 font-medium mb-1">{emptyMessage}</p>
          <p className="text-xs text-gray-500 mb-4">
            Your activity will appear here as you use the platform.
          </p>
          {emptyAction}
        </div>
      )}
    </div>
  );
};

export default ActivityFeedCard;
