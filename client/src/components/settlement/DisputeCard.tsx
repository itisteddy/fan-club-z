import React from 'react';
import { Dispute } from '../../../../shared/schema';

interface DisputeCardProps {
  dispute: Dispute;
  className?: string;
}

export const DisputeCard: React.FC<DisputeCardProps> = ({ dispute, className = "" }) => {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upheld':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'overturned':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'wrong_source':
        return 'Wrong Source Used';
      case 'timing':
        return 'Timing Issue';
      case 'source_updated':
        return 'Source Was Updated';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-sm">⚠️</span>
          <span className="font-semibold text-gray-900 text-sm">Dispute #{dispute.id.slice(0, 8)}</span>
        </div>
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium border
          ${getStateColor(dispute.state)}
        `}>
          {dispute.state.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Reason */}
      <div className="mb-3">
        <span className="text-xs font-medium text-gray-500">Reason:</span>
        <p className="text-sm text-gray-900 mt-1">{getReasonLabel(dispute.reason)}</p>
      </div>

      {/* Evidence */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500">Evidence:</span>
          <div className="mt-1 space-y-1">
            {dispute.evidence.map((item, index) => (
              <div key={index} className="text-sm">
                {item.type === 'link' ? (
                  <a 
                    href={item.value} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <span className="text-gray-700">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution note (if resolved) */}
      {dispute.resolution_note && (
        <div className="mb-3 p-3 bg-gray-50 rounded border">
          <span className="text-xs font-medium text-gray-500">Resolution:</span>
          <p className="text-sm text-gray-700 mt-1">{dispute.resolution_note}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Created: {formatDate(dispute.created_at)}</div>
        {dispute.updated_at && dispute.updated_at !== dispute.created_at && (
          <div>Updated: {formatDate(dispute.updated_at)}</div>
        )}
      </div>
    </div>
  );
};
