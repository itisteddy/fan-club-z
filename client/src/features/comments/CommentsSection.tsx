import React, { useEffect } from 'react';
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
  } = useUnifiedCommentStore();

  const predictionComments = getComments(predictionId);
  const predictionStatus = getStatus(predictionId);
  const predictionPosting = isPostingFn(predictionId);
  const predictionHasMore = hasMoreFn(predictionId);

  // Initialize comments on mount
  useEffect(() => {
    if (predictionStatus === 'idle') {
      fetchComments(predictionId).catch((error) => {
        // Only toast for 5xx errors, not 404s (empty threads are valid)
        if (error?.status >= 500) {
          toast.error('Failed to load comments. Please try again.');
        }
      });
    }
  }, [predictionId, predictionStatus, fetchComments]);

  // Handle adding new comments
  const handleAddComment = async (text: string) => {
    try {
      await addComment(predictionId, text);
    } catch (error: any) {
      // Toast for user-initiated errors only
      const message = error?.message || 'Failed to post comment';
      toast.error(message);
      throw error; // Re-throw so CommentInput can handle UI state
    }
  };

  // Handle like toggle
  const handleToggleLike = async (commentId: string) => {
    try {
      // TODO: Implement toggleCommentLike when like functionality is ready
      toast.success('Like feature coming soon!');
    } catch (error: any) {
      if (error?.status >= 500) {
        toast.error('Failed to update like. Please try again.');
      }
    }
  };

  // Handle load more
  const handleLoadMore = async () => {
    try {
      await loadMore(predictionId);
    } catch (error: any) {
      if (error?.status >= 500) {
        toast.error('Failed to load more comments. Please try again.');
      }
    }
  };

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
        />
      </div>
    </div>
  );
};
