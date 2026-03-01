import React from 'react';
import { Heart, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Comment } from '../../store/unifiedCommentStore';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: Comment;
  onToggleLike?: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onToggleLike
}) => {
  const navigate = useNavigate();
  const handleLikeClick = () => {
    if (onToggleLike) {
      onToggleLike(comment.id);
    }
  };

  const likeCount = comment.likes_count || comment.likeCount || 0;
  const isLiked = comment.is_liked || comment.likedByMe || false;
  const createdAt = comment.created_at || comment.createdAt;
  const content = comment.content || comment.text;
  const username = comment.user?.username || 'Anonymous';
  const avatarUrl = comment.user?.avatar_url || comment.user?.avatarUrl;
  const userId = String(comment.user?.id || '').trim();
  const handleOpenProfile = () => {
    const handle = String(comment.user?.username || '').trim();
    if (handle) {
      navigate(`/u/${encodeURIComponent(handle)}`);
      return;
    }
    if (userId) {
      navigate(`/profile/${encodeURIComponent(userId)}`);
    }
  };

  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0">
      <div className="flex gap-3">
        {/* Avatar */}
        <button
          type="button"
          onClick={handleOpenProfile}
          className="flex-shrink-0 p-0 border-0 bg-transparent appearance-none"
          aria-label={`Open profile for ${username}`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="font-medium text-sm text-gray-900 p-0 border-0 bg-transparent appearance-none text-left hover:text-emerald-700"
            >
              {username}
            </button>
            {comment.user?.is_verified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Comment text */}
          <div className="text-sm text-gray-900 leading-relaxed mb-2">
            {content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isLiked 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-gray-500 hover:text-red-600'
              }`}
            >
              <Heart 
                className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} 
              />
              {likeCount > 0 && (
                <span>{likeCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
