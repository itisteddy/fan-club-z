import React, { useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useUnifiedCommentStore } from '../../store/unifiedCommentStore';
import { CommentInput } from './CommentInput';
import { CommentList } from './CommentList';
import toast from 'react-hot-toast';

interface CommentsSectionProps {
  predictionId: string;
  className?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  predictionId,
  className = ''
}) => {
  const {
    getComments,
    getCommentCount,
    getStatus,
    isPosting: isPostingFn,
    hasMore: hasMoreFn,
    fetchComments,
    loadMore,
    addComment,
    retryComment,
    dismissFailedComment,
  } = useUnifiedCommentStore();

  const predictionComments = getComments(predictionId);
  const predictionStatus = getStatus(predictionId);
  const predictionPosting = isPostingFn(predictionId);
  const predictionHasMore = hasMoreFn(predictionId);

  // Initialize comments on mount
  useEffect(() => {
    if (predictionStatus === 'idle') {
      fetchComments(predictionId).catch((error) => {
        if (error?.status >= 500) {
          toast.error('Failed to load comments. Please try again.');
        }
      });
    }
  }, [predictionId, predictionStatus, fetchComments]);

  // Handle adding new comments
  const handleAddComment = useCallback(async (text: string) => {
    try {
      await addComment(predictionId, text);
    } catch (error: any) {
      // Don't toast generic "failed" — the inline failed state handles it.
      // Only toast for auth/account errors that need immediate attention.
      const status = error?.status;
      if (status === 401 || status === 403 || status === 409) {
        toast.error(error?.message || 'Unable to comment.');
      }
      // Error propagated so CommentInput can handle UI
      throw error;
    }
  }, [addComment, predictionId]);

  // Retry a failed comment
  const handleRetry = useCallback(async (clientTempId: string) => {
    try {
      await retryComment(predictionId, clientTempId);
    } catch (error: any) {
      const status = error?.status;
      if (status === 401 || status === 403 || status === 409) {
        toast.error(error?.message || 'Unable to comment.');
      }
      // Failed again — store keeps it as failed with updated message
    }
  }, [retryComment, predictionId]);

  // Dismiss a failed comment
  const handleDismiss = useCallback((clientTempId: string) => {
    dismissFailedComment(predictionId, clientTempId);
  }, [dismissFailedComment, predictionId]);

  // Handle like toggle
  const handleToggleLike = useCallback(async (_commentId: string) => {
    toast.success('Like feature coming soon!');
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMore(predictionId);
    } catch (error: any) {
      if (error?.status >= 500) {
        toast.error('Failed to load more comments.');
      }
    }
  }, [loadMore, predictionId]);

  const isLoading = predictionStatus === 'loading' || predictionStatus === 'paginating';
  const showCount = getCommentCount(predictionId);

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">
          Comments {showCount > 0 && `(${showCount})`}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Comment Input */}
        <CommentInput
          predictionId={predictionId}
          onSubmit={handleAddComment}
          isPosting={predictionPosting}
        />

        {/* Comments List */}
        <CommentList
          comments={predictionComments}
          isLoading={isLoading}
          hasMore={predictionHasMore}
          onLoadMore={handleLoadMore}
          onToggleLike={handleToggleLike}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
};
