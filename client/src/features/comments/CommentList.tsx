import React from 'react';
import { Comment } from '../../store/unifiedCommentStore';
import { CommentItem } from './CommentItem';
import { CommentListSkeleton } from './CommentListSkeleton';
import { isReported } from '@/lib/reportedContent';

interface CommentListProps {
  comments: Comment[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  onToggleLike?: (commentId: string) => void;
  onRetry?: (clientTempId: string) => void;
  onDismiss?: (clientTempId: string) => void;
  onEdit?: (commentId: string, text: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onReply?: (parentCommentId: string, text: string) => Promise<void> | void;
  onReport?: (commentId: string) => void;
  onBlockUser?: (userId: string) => void;
  blockedUserIds?: string[];
  reportNonce?: number;
  predictionTitle?: string;
  openMenuCommentId?: string | null;
  onOpenMenu?: (commentId: string) => void;
  onCloseMenu?: () => void;
  highlightedId?: string;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  isLoading,
  hasMore,
  onLoadMore,
  onToggleLike,
  onRetry,
  onDismiss,
  onEdit,
  onDelete,
  onReply,
  onReport,
  onBlockUser,
  blockedUserIds = [],
  reportNonce,
  predictionTitle,
  openMenuCommentId,
  onOpenMenu,
  onCloseMenu,
  highlightedId,
}) => {
  const reportVersion = reportNonce ?? 0;
  const hideIfReported = (commentId: string) => {
    void reportVersion;
    return isReported('comment', commentId);
  };

  const filteredComments = comments.filter((c) => {
    if (blockedUserIds.includes(c.user?.id)) return false;
    if (hideIfReported(c.id)) return false;
    return true;
  });

  if (isLoading && comments.length === 0) {
    return <CommentListSkeleton count={3} />;
  }

  if (filteredComments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-lg mb-2">No comments yet</div>
        <div className="text-sm">Be the first to share your thoughts!</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredComments.map((comment) => (
        <div key={comment.clientTempId || comment.id} className="space-y-3">
            <CommentItem
              comment={comment}
            onToggleLike={onToggleLike}
            onRetry={onRetry}
            onDismiss={onDismiss}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              onReport={onReport}
              onBlockUser={onBlockUser}
              isReply={false}
              predictionTitle={predictionTitle}
              openMenuCommentId={openMenuCommentId}
              onOpenMenu={onOpenMenu}
              onCloseMenu={onCloseMenu}
              highlighted={highlightedId === comment.id}
            />
          {(comment.replies || [])
            .filter((reply) => !blockedUserIds.includes(reply.user?.id) && !hideIfReported(reply.id))
            .map((reply) => (
              <div key={reply.clientTempId || reply.id} className="pl-4 border-l border-gray-100/80">
                <CommentItem
                  comment={reply}
                  onToggleLike={onToggleLike}
                  onRetry={onRetry}
                  onDismiss={onDismiss}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={undefined}
                  onReport={onReport}
                  onBlockUser={onBlockUser}
                  isReply={true}
                  predictionTitle={predictionTitle}
                  openMenuCommentId={openMenuCommentId}
                  onOpenMenu={onOpenMenu}
                  onCloseMenu={onCloseMenu}
                  highlighted={highlightedId === reply.id}
                />
              </div>
            ))}
        </div>
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
