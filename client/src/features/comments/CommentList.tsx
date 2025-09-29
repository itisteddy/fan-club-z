import React from 'react';
import { Comment } from '../../store/unifiedCommentStore';
import { CommentItem } from './CommentItem';
import { CommentListSkeleton } from './CommentListSkeleton';

interface CommentListProps {
  comments: Comment[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  onToggleLike?: (commentId: string) => void;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  isLoading,
  hasMore,
  onLoadMore,
  onToggleLike
}) => {
  if (isLoading && comments.length === 0) {
    return <CommentListSkeleton count={3} />;
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-lg mb-2">No comments yet</div>
        <div className="text-sm">Be the first to share your thoughts!</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onToggleLike={onToggleLike}
        />
      ))}
      
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Load more comments'}
          </button>
        </div>
      )}
    </div>
  );
};
