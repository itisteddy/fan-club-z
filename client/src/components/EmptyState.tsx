import React from 'react';
import { User, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  primaryCta: string;
  onPrimary: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  primaryCta,
  onPrimary,
  icon = <User className="w-12 h-12 text-gray-400" />
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          {icon}
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>
        
        <button
          onClick={onPrimary}
          className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
        >
          {primaryCta}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
