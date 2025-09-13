import React from 'react';
// Stub type for SettlementProof since settlement functionality is not implemented
interface SettlementProof {
  id: string;
  settlement_id: string;
  proof_type: 'url' | 'text' | 'image';
  proof_value: string;
  created_at: string;
}

interface ProofRowProps {
  proof: SettlementProof;
  className?: string;
}

export const ProofRow: React.FC<ProofRowProps> = ({ proof, className = "" }) => {
  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(proof.content_hash);
      // You might want to show a toast notification here
    } catch (err) {
      console.error('Failed to copy hash:', err);
    }
  };

  const handleOpenSource = () => {
    window.open(proof.source_url, '_blank', 'noopener,noreferrer');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-12 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
          {proof.screenshot_url ? (
            <img 
              src={proof.screenshot_url} 
              alt="Settlement proof" 
              className="w-full h-full object-cover rounded"
              loading="lazy"
            />
          ) : (
            <span className="text-gray-400 text-xs">📄</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              Settlement Proof
            </h4>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {formatTimestamp(proof.fetched_at)}
            </span>
          </div>
          
          {proof.parser_note && (
            <p className="text-sm text-gray-700 mb-2">
              {proof.parser_note}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleOpenSource}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Open source ↗
            </button>
            
            <button
              onClick={handleCopyHash}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              title={`Hash: ${proof.content_hash}`}
            >
              Copy hash
            </button>
          </div>
          
          {/* Hash display (truncated) */}
          <div className="mt-2 text-xs text-gray-500 font-mono truncate">
            {proof.content_hash.slice(0, 16)}...{proof.content_hash.slice(-8)}
          </div>
        </div>
      </div>
    </div>
  );
};
