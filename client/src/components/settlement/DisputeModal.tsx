import React, { useState } from 'react';
import { useSettlementStore } from '../../store/settlementStore';
import { Dispute } from '../../../../shared/schema';

interface DisputeModalProps {
  predictionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ 
  predictionId, 
  isOpen, 
  onClose 
}) => {
  const { createDispute, loading } = useSettlementStore();
  const [reason, setReason] = useState<Dispute['reason']>('wrong_source');
  const [evidenceLinks, setEvidenceLinks] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const reasonOptions = [
    { value: 'wrong_source', label: 'Wrong Source Used', desc: 'The settlement used an incorrect or unreliable source' },
    { value: 'timing', label: 'Timing Issue', desc: 'Settlement occurred at wrong time or before event completion' },
    { value: 'source_updated', label: 'Source Was Updated', desc: 'The source corrected or updated the information after settlement' },
    { value: 'other', label: 'Other', desc: 'Other reason (please specify below)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const evidence = evidenceLinks
      .split('\n')
      .filter(link => link.trim())
      .map(link => ({ type: 'link' as const, value: link.trim() }));

    if (reason === 'other' && customReason.trim()) {
      evidence.push({ type: 'link' as const, value: `Custom reason: ${customReason}` });
    }

    try {
      await createDispute(predictionId, reason, evidence);
      onClose();
      // Reset form
      setReason('wrong_source');
      setEvidenceLinks('');
      setCustomReason('');
    } catch (error) {
      console.error('Failed to create dispute:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Dispute Settlement</h3>
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
            Please provide a reason for your dispute and any supporting evidence.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for dispute
            </label>
            <div className="space-y-2">
              {reasonOptions.map((option) => (
                <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={(e) => setReason(e.target.value as Dispute['reason'])}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom reason (if "other" is selected) */}
          {reason === 'other' && (
            <div>
              <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify
              </label>
              <textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the issue in detail..."
                required
              />
            </div>
          )}

          {/* Evidence links */}
          <div>
            <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 mb-1">
              Supporting evidence (optional)
            </label>
            <textarea
              id="evidence"
              value={evidenceLinks}
              onChange={(e) => setEvidenceLinks(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Paste URLs to supporting evidence, one per line..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Include links to news articles, official sources, or other relevant evidence.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Dispute'
              )}
            </button>
          </div>
        </form>

        {/* Disclaimer */}
        <div className="px-6 pb-6">
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
            <p><strong>Note:</strong> We've received your dispute. A reviewer will follow up within 24 hours. Fraudulent disputes may result in account restrictions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
