import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface RulePreviewProps {
  ruleText: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  copyable?: boolean;
  className?: string;
}

const RulePreview: React.FC<RulePreviewProps> = ({ 
  ruleText, 
  title = "Settlement Rule",
  size = 'md',
  copyable = true,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg'
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ruleText);
      setCopied(true);
      toast.success('Rule copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy rule');
    }
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-xl ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={iconSizes[size]} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {copyable && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Copy rule"
          >
            {copied ? (
              <Check size={iconSizes[size] - 2} className="text-green-600" />
            ) : (
              <Copy size={iconSizes[size] - 2} className="text-gray-600" />
            )}
          </motion.button>
        )}
      </div>
      
      <div className="bg-white rounded-lg p-3 border border-gray-100">
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {ruleText}
        </p>
      </div>
      
      {copyable && (
        <div className="mt-2 text-xs text-gray-500">
          {copied ? 'Copied!' : 'Click the copy button to copy this rule'}
        </div>
      )}
    </div>
  );
};

export default RulePreview;
