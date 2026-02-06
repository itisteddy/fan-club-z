import React from 'react';
import { Heart, Clock, AlertCircle, RefreshCw, X, Loader2 } from 'lucide-react';
import { Comment } from '../../store/unifiedCommentStore';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: Comment;
  onToggleLike?: (commentId: string) => void;
  onRetry?: (clientTempId: string) => void;
  onDismiss?: (clientTempId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onToggleLike,
  onRetry,
  onDismiss,
}) => {
  const likeCount = comment.likes_count || comment.likeCount || 0;
  const isLiked = comment.is_liked || comment.likedByMe || false;
  const createdAt = comment.created_at || comment.createdAt;
  const content = comment.content || comment.text;
  const displayName = comment.user?.full_name || comment.user?.username || 'Anonymous';
  const username = comment.user?.username || 'Anonymous';
  const avatarUrl = comment.user?.avatar_url || comment.user?.avatarUrl;

  const isSending = comment.sendStatus === 'sending';
  const isFailed = comment.sendStatus === 'failed';
  const isOptimistic = isSending || isFailed;

  return (
    <div className={`border-b border-gray-100 pb-4 last:border-b-0 ${isFailed ? 'opacity-80' : ''} ${isSending ? 'opacity-60' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {displayName}
            </span>
            {displayName !== username && username !== 'Anonymous' && (
              <span className="text-xs text-gray-500">@{username}</span>
            )}
            {comment.user?.is_verified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">&#10003;</span>
              </div>
            )}
            {!isOptimistic && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </div>
            )}
            {isSending && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Sending…
              </span>
            )}
          </div>

          {/* Comment text */}
          <div className="text-sm text-gray-900 leading-relaxed mb-2">
            {content}
          </div>

          {/* Failed state: inline retry/dismiss */}
          {isFailed && comment.clientTempId && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{comment.errorMessage || 'Failed to post.'}</span>
              </div>
              {onRetry && (
                <button
                  onClick={() => onRetry(comment.clientTempId!)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(comment.clientTempId!)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-3 h-3" /> Dismiss
                </button>
              )}
            </div>
          )}

          {/* Actions (only for confirmed comments) */}
          {!isOptimistic && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => onToggleLike?.(comment.id)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  isLiked
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
