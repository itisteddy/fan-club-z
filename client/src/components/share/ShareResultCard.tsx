import React, { forwardRef } from 'react';
import { TrendingUp, DollarSign, Trophy, Target } from 'lucide-react';

export type ShareResultProps = {
  title: string;
  choice: string;
  stake: number;
  payout: number;
  result: 'won' | 'lost' | 'pending' | 'active';
  creatorName?: string;
};

/**
 * Share card component for generating preview images
 * Hidden off-screen, rendered to canvas/image for sharing
 */
const ShareResultCard = forwardRef<HTMLDivElement, ShareResultProps>(
  function ShareResultCard({ title, choice, stake, payout, result, creatorName }, ref) {
    const resultColor = 
      result === 'won' ? 'text-emerald-600' : 
      result === 'lost' ? 'text-rose-600' : 
      'text-amber-600';
    
    const resultBg = 
      result === 'won' ? 'bg-emerald-600/10' : 
      result === 'lost' ? 'bg-rose-600/10' : 
      'bg-amber-600/10';

    return (
      <div 
        ref={ref} 
        className="w-[600px] rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-2xl"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="size-6 text-emerald-600" />
            <span className="text-lg font-bold text-gray-900">FanClubZ</span>
          </div>
          <span className="text-sm text-gray-500">Social Predictions</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
          {title}
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Your Pick */}
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <TrendingUp className="size-4" />
              <span className="text-sm font-medium">Your Pick</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{choice}</div>
          </div>

          {/* Stake */}
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <DollarSign className="size-4" />
              <span className="text-sm font-medium">Stake</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              ${stake.toLocaleString()}
            </div>
          </div>

          {/* Result */}
          <div className={`rounded-2xl ${resultBg} p-4`}>
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Trophy className="size-4" />
              <span className="text-sm font-medium">Result</span>
            </div>
            <div className={`text-lg font-bold uppercase ${resultColor}`}>
              {result}
            </div>
          </div>

          {/* Payout */}
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <DollarSign className="size-4" />
              <span className="text-sm font-medium">
                {result === 'won' ? 'Won' : 'Potential Win'}
              </span>
            </div>
            <div className={`text-lg font-bold ${result === 'won' ? 'text-emerald-600' : 'text-gray-900'}`}>
              ${payout.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Creator Attribution */}
        {creatorName && (
          <div className="mb-6 text-sm text-gray-600">
            Prediction by <span className="font-semibold text-gray-900">{creatorName}</span>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-center">
          <div className="text-white">
            <div className="text-xl font-bold mb-1">Join FanClubZ</div>
            <div className="text-emerald-50 text-sm mb-3">
              Predict outcomes, compete with friends, win rewards
            </div>
            <div className="text-white/90 font-semibold text-lg">
              app.fanclubz.app
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ShareResultCard;

