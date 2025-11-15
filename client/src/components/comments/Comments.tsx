import React, { useState, useEffect } from 'react';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { useUnifiedCommentStore } from '../../store/unifiedCommentStore';
import { openAuthGate } from '../../auth/authGateAdapter';
import UserAvatar from '../common/UserAvatar';
import { formatAgo } from '../../utils/time';

export function Comments({ predictionId }: { predictionId: string }) {
  const { user } = useAuthSession();
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  
  // Get comments data from store
  const { 
    getComments, 
    getCommentCount,
    addComment,
    fetchComments,
    hasMore,
    loadMore 
  } = useUnifiedCommentStore();
  
  const comments = getComments(predictionId) || [];
  const commentCount = getCommentCount(predictionId);
  const hasMoreComments = hasMore(predictionId);

  useEffect(() => {
    // Load initial comments
    fetchComments(predictionId);
  }, [predictionId, fetchComments]);

  const handlePost = async () => {
    if (!commentText.trim() || posting) return;
    
    setPosting(true);
    try {
      await addComment(predictionId, commentText.trim());
      setCommentText('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <section className="px-4 mx-auto max-w-screen-md">
      
      {/* Comment composer */}
      {user ? (
        <div className="rounded-2xl border border-gray-200 p-4 mb-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Share your thoughts…"
            className="w-full min-h-[72px] resize-none border-0 outline-none text-sm placeholder-gray-500"
            disabled={posting}
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              {commentCount > 0 ? `${commentCount} comments` : 'Be the first to comment'}
            </div>
            <button
              onClick={handlePost}
              disabled={posting || !commentText.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px]"
              style={{ minHeight: '44px' }} // Ensure proper touch target
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="text-sm text-gray-600">
            <span>Sign in to join the discussion. </span>
            <button
              onClick={() => openAuthGate({ intent: 'comment_prediction' })}
              className="text-emerald-600 hover:text-emerald-700 font-medium underline"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <ul className="space-y-4">
        {comments.map(comment => (
          <li key={comment.id} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <UserAvatar
                username={comment.user?.username || comment.user?.full_name || 'Anonymous'}
                avatarUrl={comment.user?.avatarUrl || comment.user?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                  {comment.user?.username 
                  ? `@${comment.user.username}` 
                  : comment.user?.full_name || 'User'
                  }
                  </span>
                  <time className="text-xs text-gray-500 flex-shrink-0">
                  {formatAgo(comment.createdAt)}
                  </time>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                  {comment.text}
                  </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Load more button */}
      {hasMoreComments && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => loadMore(predictionId)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Load more comments
          </button>
        </div>
      )}

      {/* Empty state */}
      {comments.length === 0 && !user && (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            No comments yet.
          </p>
        </div>
      )}
      
      {comments.length === 0 && user && (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            No comments yet. Your comment will be the first!
          </p>
        </div>
      )}
    </section>
  );
}

export default Comments;
