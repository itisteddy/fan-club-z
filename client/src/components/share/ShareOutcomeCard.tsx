import React, { forwardRef } from 'react';
import { User } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export interface ShareOutcomeProps {
  title: string;
  choice: string;
  stake: number;
  payout: number;
  result: 'won' | 'lost' | 'pending' | 'active';
  creatorName?: string;
  user?: {
    username?: string;
    full_name?: string;
  };
  deeplink?: string;
}

/**
 * Share card component for generating preview images
 * Hidden off-screen, rendered to canvas/image for sharing
 */
const ShareOutcomeCard = forwardRef<HTMLDivElement, ShareOutcomeProps>(function ShareOutcomeCard({ 
  title, 
  choice, 
  stake, 
  payout, 
  result, 
  creatorName,
  user,
  deeplink = 'app.fanclubz.app'
}, ref) {
  const resultColorClass = result === 'won' ? 'text-emerald-600' : result === 'lost' ? 'text-red-600' : 'text-gray-600';
  const resultBgClass = result === 'won' ? 'bg-emerald-50' : result === 'lost' ? 'bg-red-50' : 'bg-gray-50';
  
  const displayName = user?.full_name || user?.username || 'Anonymous';

  return (
    <div ref={ref} className="w-[600px] rounded-3xl border bg-white p-6 shadow-xl font-sans">
      {/* Header */}
      <div className="text-sm text-gray-500 mb-2">FanClubZ • Social Predictions</div>
      
      {/* Title */}
      <div className="text-2xl font-bold text-gray-900 mb-1">{title}</div>
      
      {/* Creator */}
      {creatorName && (
        <div className="text-sm text-gray-600 mb-4">by {creatorName}</div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500 text-sm mb-1">Your pick</div>
          <div className="font-semibold text-gray-900">{choice}</div>
        </div>
        
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500 text-sm mb-1">Stake</div>
          <div className="font-semibold text-gray-900">{formatCurrency(stake, { compact: false })}</div>
        </div>
        
        <div className={`rounded-xl ${resultBgClass} p-3`}>
          <div className="text-gray-500 text-sm mb-1">Result</div>
          <div className={`font-semibold ${resultColorClass}`}>
            {result.toUpperCase()}
          </div>
        </div>
        
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500 text-sm mb-1">Payout</div>
          <div className="font-semibold text-gray-900">{formatCurrency(payout, { compact: false })}</div>
        </div>
      </div>
      
      {/* User info */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <User className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="text-sm text-gray-600">@{displayName}</span>
      </div>
      
      {/* Footer */}
      <div className="rounded-xl bg-emerald-600/10 p-3 text-emerald-700 text-sm text-center font-medium">
        Try FanClubZ: {deeplink}
      </div>
    </div>
  );
});

export default ShareOutcomeCard;
