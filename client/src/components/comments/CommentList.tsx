import React, { useMemo, useRef, useEffect } from 'react';
import { Comment, Status, useCommentsForPrediction } from '../../store/unifiedCommentStore';
import CommentItem from './CommentItem';
import CommentSkeleton from './CommentSkeleton';
import { RefreshCw } from 'lucide-react';
import { showToast } from '../../utils/toasts';
import { qaLog } from '../../utils/devQa';

interface CommentListProps {
  items: Comment[];
  status: Status;
  hasMore: boolean;
  onLoadMore: () => void;
  predictionId: string;
}

const CommentList: React.FC<CommentListProps> = ({
  items,
  status,
  hasMore,
  onLoadMore,
  predictionId,
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { 
    editComment, 
    deleteComment, 
    setHighlighted 
  } = useCommentsForPrediction(predictionId);

  // Get highlighted comment ID from store
  const highlightedId = useMemo(() => {
    // This would come from the store, but for now we'll use URL hash
    const hash = window.location.hash;
    const match = hash.match(/^#comment-(.+)$/);
    return match ? match[1] : undefined;
  }, []);

  // Intersection Observer for infinite loading
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement || !hasMore || status === 'paginating' || status === 'loading') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          qaLog('Loading more comments via intersection observer');
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Load when 100px away from viewport
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, status, onLoadMore]);

  // Handle edit with error handling
  const handleEdit = async (commentId: string, text: string) => {
    try {
      await editComment(commentId, text);
      showToast('Comment updated successfully', 'success', { category: 'user_action' });
    } catch (error) {
      qaLog('Failed to edit comment:', error);
      showToast('Failed to update comment', 'error', { category: 'user_action' });
      throw error; // Re-throw for component handling
    }
  };

  // Handle delete with error handling
  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      showToast('Comment deleted', 'success', { category: 'user_action' });
    } catch (error) {
      qaLog('Failed to delete comment:', error);
      showToast('Failed to delete comment', 'error', { category: 'user_action' });
      throw error; // Re-throw for component handling
    }
  };

  // Handle empty state
  if (status === 'loaded' && items.length === 0) {
    return (
      <div className="comments-empty">
        <h4 className="comments-empty-title">Be the first to comment</h4>
        <p className="comments-empty-body">Share your take with the community.</p>
        <button
          className="comments-empty-cta"
          onClick={() => {
            // Focus the composer
            const composer = document.querySelector('.comment-textarea');
            if (composer instanceof HTMLTextAreaElement) {
              composer.focus();
            }
          }}
        >
          Write a comment
        </button>
      </div>
    );
  }

  // Handle error state
  if (status === 'network_error' || status === 'server_error' || status === 'client_error' || status === 'parse_error') {
    const errorTitle = status === 'network_error' ? 'Connection Error' : 'Can\'t load comments';
    const errorBody = status === 'network_error' 
      ? 'Please check your internet connection and try again.'
      : 'Something went wrong. Please try again.';

    return (
      <div className="comments-error">
        <h4 className="comments-error-title">{errorTitle}</h4>
        <p className="comments-error-body">{errorBody}</p>
        <button
          className="comments-error-retry"
          onClick={onLoadMore}
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  // Handle loading state
  if (status === 'loading' && items.length === 0) {
    return (
      <div className="comments-list">
        <CommentSkeleton count={3} />
      </div>
    );
  }

  // Main list
  return (
    <div 
      className="comments-list"
      role="list" 
      aria-label="Comments list"
    >
      <div className="comments-list-inner" role="list">
        {items.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            highlighted={highlightedId === comment.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Loading more indicator */}
      {(status === 'paginating' || status === 'loading') && (
        <div className="p-4">
          <CommentSkeleton count={2} />
        </div>
      )}

      {/* Load more trigger (invisible) */}
      {hasMore && status !== 'paginating' && status !== 'loading' && (
        <div 
          ref={loadMoreRef}
          className="h-4" // Small invisible element for intersection observer
          aria-hidden="true"
        />
      )}

      {/* Manual load more button (fallback) */}
      {hasMore && status !== 'paginating' && status !== 'loading' && items.length >= 10 && (
        <div className="p-4">
          <button
            onClick={onLoadMore}
            className="comments-load-more"
            disabled={false}
          >
            Load more comments
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentList;