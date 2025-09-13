import React from 'react';
// Stub type for SettlementConfig since settlement functionality is not implemented
interface SettlementConfig {
  id: string;
  prediction_id: string;
  source_type: 'manual' | 'api' | 'automated';
  source_url?: string;
  source_selector?: string;
  created_at: string;
  updated_at: string;
}

interface RulePreviewProps {
  settlement: SettlementConfig;
  className?: string;
}

export const RulePreview: React.FC<RulePreviewProps> = ({ settlement, className = "" }) => {
  const handleCopyRule = async () => {
    try {
      await navigator.clipboard.writeText(settlement.rule_text);
      // You might want to show a toast notification here
    } catch (err) {
      console.error('Failed to copy rule:', err);
    }
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Settlement Rule</h4>
        <button
          onClick={handleCopyRule}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Copy rule
        </button>
      </div>
      
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {settlement.rule_text}
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Primary Source:</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span className="text-xs text-gray-700">{settlement.primary_source.name}</span>
          </div>
        </div>
        
        {settlement.backup_source && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Backup Source:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              <span className="text-xs text-gray-700">{settlement.backup_source.name}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Timezone:</span>
          <span className="text-xs text-gray-700">{settlement.timezone}</span>
        </div>
      </div>
    </div>
  );
};
