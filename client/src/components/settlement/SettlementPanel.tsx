import React, { useState, useEffect } from 'react';
import { useSettlementStore } from '../../store/settlementStore';
// Stub type for Settlement since settlement functionality is not implemented
interface Settlement {
  id: string;
  prediction_id: string;
  winning_option_id: string;
  settled_by: string;
  settlement_reason: string;
  created_at: string;
  status: 'pending' | 'completed' | 'disputed';
}

interface SettlementPanelProps {
  predictionId: string;
  state: 'open' | 'locked' | 'settling' | 'settled' | 'voided' | 'disputed' | 'resolved';
  userHasEntry?: boolean;
  className?: string;
}

export const SettlementPanel: React.FC<SettlementPanelProps> = ({ 
  predictionId, 
  state, 
  userHasEntry = false,
  className = "" 
}) => {
  const { settlements, fetchSettlement } = useSettlementStore();
  const [settlement, setSettlement] = useState<Settlement | null>(null);

  useEffect(() => {
    fetchSettlement(predictionId);
  }, [predictionId, fetchSettlement]);

  useEffect(() => {
    if (settlements[predictionId]) {
      setSettlement(settlements[predictionId]);
    }
  }, [settlements, predictionId]);

  const getStateInfo = () => {
    switch (state) {
      case 'settling':
        return {
          title: "Settlement in Progress",
          description: "We're fetching the official result...",
          icon: "⏳",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200"
        };
      case 'settled':
        return {
          title: "Settlement Complete",
          description: "Official outcome has been determined",
          icon: "✅",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-700",
          borderColor: "border-emerald-200"
        };
      case 'voided':
        return {
          title: "Event Voided",
          description: "Event postponed/cancelled—stakes returned",
          icon: "❌",
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-200"
        };
      case 'disputed':
        return {
          title: "Under Dispute",
          description: "Settlement is being reviewed",
          icon: "⚠️",
          bgColor: "bg-amber-50",
          textColor: "text-amber-700",
          borderColor: "border-amber-200"
        };
      case 'resolved':
        return {
          title: "Dispute Resolved",
          description: "Final outcome confirmed after review",
          icon: "🔍",
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          borderColor: "border-purple-200"
        };
      default:
        return null;
    }
  };

  const stateInfo = getStateInfo();
  
  if (!stateInfo) return null;

  return (
    <div className={`
      ${stateInfo.bgColor} ${stateInfo.borderColor} ${stateInfo.textColor}
      border rounded-lg p-4 ${className}
    `}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{stateInfo.icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{stateInfo.title}</h4>
          <p className="text-sm opacity-90">{stateInfo.description}</p>
          
          {/* Settlement specific content */}
          {state === 'settling' && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Estimated time: ~10 minutes</span>
              </div>
              <p className="text-xs mt-2 opacity-75">
                We'll notify you when the outcome is available.
              </p>
            </div>
          )}

          {state === 'settled' && settlement?.outcome && (
            <div className="mt-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm font-semibold">
                <span>Outcome:</span>
                <span className={settlement.outcome === 'YES' ? 'text-emerald-600' : 'text-red-600'}>
                  {settlement.outcome}
                </span>
              </div>
            </div>
          )}

          {state === 'voided' && (
            <div className="mt-3">
              <p className="text-xs opacity-75">
                All participants will receive their original stake back.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
