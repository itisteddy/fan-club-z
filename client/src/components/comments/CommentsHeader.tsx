import React from 'react';
import { ChevronDown } from 'lucide-react';
import { FCZ_COMMENTS_SORT } from '@/utils/environment';

interface CommentsHeaderProps {
  count: number;
  sortable?: boolean;
  onSortChange?: (sort: 'newest' | 'oldest') => void;
  currentSort?: 'newest' | 'oldest';
}

const CommentsHeader: React.FC<CommentsHeaderProps> = ({ 
  count, 
  sortable = false, 
  onSortChange,
  currentSort = 'newest'
}) => {
  // Check feature flag for sort functionality
  const sortEnabled = sortable && FCZ_COMMENTS_SORT;

  return (
    <div className="comments-header">
      <div className="flex items-center justify-between">
        <h3 className="comments-title">
          Comments ({count})
        </h3>
        
        {sortEnabled && onSortChange && (
          <div className="relative">
            <button
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => onSortChange(currentSort === 'newest' ? 'oldest' : 'newest')}
            >
              <span>{currentSort === 'newest' ? 'Newest' : 'Oldest'}</span>
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsHeader;