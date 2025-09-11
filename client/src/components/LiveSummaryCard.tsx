import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePredictionStore } from '../store/predictionStore';

export const LiveSummaryCard: React.FC = () => {
  const predictions = usePredictionStore((s) => s.predictions);
  const { volume, liveCount, players } = useMemo(
    () => usePredictionStore.getState().selectActiveStats(),
    [predictions] // keeps it up-to-date when list changes
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-900">LIVE MARKETS</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            ${volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-600">Volume</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {liveCount}
          </div>
          <div className="text-xs text-gray-600">Live</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {players}
          </div>
          <div className="text-xs text-gray-600">Players</div>
        </div>
      </div>
    </motion.div>
  );
};
