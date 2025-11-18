import React, { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle, Clock, AlertCircle, Copy } from 'lucide-react';
import { baseSepolia } from 'wagmi/chains';
import toast from 'react-hot-toast';

interface TransactionBannerProps {
  txHash: string;
  kind: 'withdraw' | 'deposit' | 'bet' | 'tx';
  amount?: number;
  currency?: string;
  status?: 'pending' | 'success' | 'failed';
  onDismiss?: () => void;
}

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';

export default function TransactionBanner({
  txHash,
  kind,
  amount,
  currency = 'USDC',
  status = 'pending',
  onDismiss,
}: TransactionBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const explorerUrl = `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`;
  const truncatedHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      toast.success('Transaction hash copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
          bgColor: 'bg-emerald-50 border-emerald-200',
          textColor: 'text-emerald-800',
          label: 'Confirmed',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          label: 'Failed',
        };
      case 'pending':
      default:
        return {
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          bgColor: 'bg-amber-50 border-amber-200',
          textColor: 'text-amber-800',
          label: 'Pending',
        };
    }
  };

  const getKindLabel = () => {
    switch (kind) {
      case 'withdraw':
        return 'Withdrawal';
      case 'deposit':
        return 'Deposit';
      case 'bet':
        return 'Bet Placed';
      default:
        return 'Transaction';
    }
  };

  const statusConfig = getStatusConfig();

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[13000]
        max-w-md w-full mx-4
        rounded-xl border-2 shadow-lg
        ${statusConfig.bgColor}
        animate-in slide-in-from-top-5 duration-300
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {statusConfig.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${statusConfig.textColor}`}>
                  {getKindLabel()}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.textColor} bg-white/50`}>
                  {statusConfig.label}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {amount !== undefined && (
              <div className="text-sm font-medium text-gray-700 mb-2">
                {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
              </div>
            )}

            {/* Transaction Hash */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-mono text-gray-600 hover:text-gray-800 transition-colors"
                title="Copy transaction hash"
              >
                <span>{truncatedHash}</span>
                <Copy className={`w-3.5 h-3.5 ${copied ? 'text-emerald-600' : ''}`} />
              </button>
            </div>

            {/* Explorer Link */}
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>View on BaseScan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

