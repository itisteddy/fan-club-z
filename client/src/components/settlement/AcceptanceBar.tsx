import React, { useState, useEffect } from 'react';
import { useSettlementStore } from '../../store/settlementStore';

interface AcceptanceBarProps {
  predictionId: string;
  settlementData: {
    state: string;
    settled_at?: string;
    acceptance_window_hours: number;
  };
  userHasEntry?: boolean;
  className?: string;
}

export const AcceptanceBar: React.FC<AcceptanceBarProps> = ({ 
  predictionId, 
  settlementData, 
  userHasEntry = false,
  className = "" 
}) => {
  const { acceptOutcome, setDisputeModalOpen, loading } = useSettlementStore();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!settlementData.settled_at || settlementData.state !== 'settled') return;

    const updateCountdown = () => {
      const settledTime = new Date(settlementData.settled_at!);
      const expiryTime = new Date(settledTime.getTime() + (settlementData.acceptance_window_hours * 60 * 60 * 1000));
      const now = new Date();
      const diff = expiryTime.getTime() - now.getTime();

      if (diff <= 0) {
        setHasExpired(true);
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} remaining`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [settlementData.settled_at, settlementData.acceptance_window_hours]);

  const handleAccept = async () => {
    try {
      await acceptOutcome(predictionId);
    } catch (error) {
      console.error('Failed to accept outcome:', error);
    }
  };

  const handleDispute = () => {
    setDisputeModalOpen(true);
  };

  // Don't show if not settled or if user has no entry
  if (settlementData.state !== 'settled' || !userHasEntry || hasExpired) {
    return null;
  }

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-50
      bg-white border-t border-gray-200 
      p-4 pb-safe-area-inset-bottom
      ${className}
    `}>
      <div className="max-w-lg mx-auto">
        {/* Countdown */}
        <div className="text-center mb-3">
          <p className="text-xs text-gray-600">
            Review proof and Accept or Dispute within{' '}
            <span className="font-semibold text-amber-600">{timeRemaining}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            No action → auto-accept
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400
                       text-white font-semibold py-3 px-4 rounded-lg
                       transition-colors duration-200
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Accepting...</span>
              </>
            ) : (
              <>
                <span className="text-lg">✓</span>
                <span>Accept</span>
              </>
            )}
          </button>

          <button
            onClick={handleDispute}
            disabled={loading}
            className="px-6 py-3 text-gray-700 hover:text-gray-900 
                       font-medium border border-gray-300 hover:border-gray-400
                       rounded-lg transition-colors duration-200"
          >
            Dispute
          </button>
        </div>
      </div>
    </div>
  );
};
