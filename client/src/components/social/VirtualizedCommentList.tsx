import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import EnhancedCommentItem from './EnhancedCommentItem';
import { UnifiedComment } from '../../store/unifiedCommentStore';

interface VirtualizedCommentListProps {
  comments: UnifiedComment[];
  height: number;
  itemHeight?: number;
  onReply?: (parentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onLike?: (commentId: string) => Promise<void>;
  onReport?: (commentId: string) => void;
  overscanCount?: number;
  className?: string;
}

// Simple virtualization hook for large comment lists
const useVirtualization = (
  itemCount: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleRange = { startIndex, endIndex };
  const totalHeight = itemCount * itemHeight;
  
  return {
    visibleRange,
    totalHeight,
    setScrollTop
  };
};

export const VirtualizedCommentList: React.FC<VirtualizedCommentListProps> = ({
  comments,
  height,
  itemHeight = 120,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onReport,
  overscanCount = 5,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { visibleRange, totalHeight, setScrollTop } = useVirtualization(
    comments.length,
    height,
    itemHeight,
    overscanCount
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, [setScrollTop]);

  // Get visible comments based on virtualization
  const visibleComments = useMemo(() => {
    return comments.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [comments, visibleRange]);

  if (comments.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No comments to display</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      {/* Virtual spacer before visible items */}
      <div style={{ height: visibleRange.startIndex * itemHeight }} />
      
      {/* Visible comments */}
      {visibleComments.map((comment, index) => {
        const globalIndex = visibleRange.startIndex + index;
        return (
          <div key={comment.id} style={{ minHeight: itemHeight }}>
            <EnhancedCommentItem
              comment={comment}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              onReport={onReport}
              className="border-b border-gray-100 last:border-b-0"
            />
          </div>
        );
      })}
      
      {/* Virtual spacer after visible items */}
      <div style={{ 
        height: (comments.length - visibleRange.endIndex - 1) * itemHeight 
      }} />
    </div>
  );
};

export default React.memo(VirtualizedCommentList);
