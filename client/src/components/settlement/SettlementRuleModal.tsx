import React, { useState, useEffect } from 'react';
import { useSettlementStore } from '../../store/settlementStore';
import { SettlementConfig } from '../../../../shared/schema';

interface SettlementRuleModalProps {
  predictionId?: string;
  settlement?: SettlementConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementRuleModal: React.FC<SettlementRuleModalProps> = ({ 
  predictionId, 
  settlement, 
  isOpen, 
  onClose 
}) => {
  const { settlementConfigs, fetchSettlement } = useSettlementStore();
  const [config, setConfig] = useState<SettlementConfig | null>(settlement || null);

  useEffect(() => {
    if (isOpen && predictionId && !settlement) {
      fetchSettlement(predictionId);
    }
  }, [isOpen, predictionId, settlement, fetchSettlement]);

  useEffect(() => {
    if (predictionId && settlementConfigs[predictionId]) {
      setConfig(settlementConfigs[predictionId]);
    } else if (settlement) {
      setConfig(settlement);
    }
  }, [settlementConfigs, predictionId, settlement]);

  const handleCopyRule = async () => {
    if (!config) return;
    
    try {
      await navigator.clipboard.writeText(config.rule_text);
      // Could show a toast here
    } catch (err) {
      console.error('Failed to copy rule:', err);
    }
  };

  const formatContingency = (key: string, value: string) => {
    const labels: Record<string, string> = {
      'postponed': 'If event is postponed',
      'source_down': 'If source is unavailable'
    };
    
    const actions: Record<string, string> = {
      'auto_void': 'Automatically void and return stakes',
      'extend_lock': 'Extend the lock time',
      'keep_open': 'Keep prediction open',
      'use_backup': 'Use backup source',
      'pause_and_escalate': 'Pause and escalate to admin'
    };

    return `${labels[key] || key}: ${actions[value] || value}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">How This Settles</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            This market will be settled using official sources.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {config ? (
            <>
              {/* Settlement rule */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Settlement Rule</h4>
                  <button
                    onClick={handleCopyRule}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Copy rule
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {config.rule_text}
                  </p>
                </div>
              </div>

              {/* Sources */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Sources</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{config.primary_source.name}</div>
                      <div className="text-xs text-gray-600">{config.primary_source.url}</div>
                    </div>
                    <span className="text-xs bg-teal-600 text-white px-2 py-1 rounded-full font-semibold">
                      PRIMARY
                    </span>
                  </div>

                  {config.backup_source && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{config.backup_source.name}</div>
                        <div className="text-xs text-gray-600">{config.backup_source.url}</div>
                      </div>
                      <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-full font-semibold">
                        BACKUP
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Method and timezone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">Settlement Method</h5>
                  <p className="text-sm text-gray-900 capitalize">{config.method.replace('_', ' ')}</p>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">Timezone</h5>
                  <p className="text-sm text-gray-900">{config.timezone}</p>
                </div>
              </div>

              {/* Contingencies */}
              {config.contingencies && Object.keys(config.contingencies).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Contingency Rules</h4>
                  <div className="space-y-2">
                    {Object.entries(config.contingencies).map(([key, value]) => (
                      <div key={key} className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                        {formatContingency(key, value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              {config.badges && config.badges.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Quality Indicators</h4>
                  <div className="flex flex-wrap gap-2">
                    {config.badges.map((badge, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {badge.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading settlement information...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
            <p><strong>Note:</strong> We settle using public, official sources—no rumors. All settlements are auditable and transparent.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
