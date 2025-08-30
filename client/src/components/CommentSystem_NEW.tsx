import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { MessageCircle, Heart, Reply, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useErrorHandler } from '../utils/errorHandling';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  user?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
  parent_comment_id?: string;
}

interface CommentSystemProps {
  predictionId: string;
}

// Simple, working textarea with forced LTR
const TextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}> = ({ value, onChange, placeholder, disabled, autoFocus, onSubmit }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      const input = inputRef.current;
      // Force text direction
      input.dir = 'ltr';
      input.style.direction = 'ltr';
      input.style.textAlign = 'left';
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div style={{ direction: 'ltr' }}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onKeyDown={handleKeyDown}
        dir="ltr"
        rows={3}
        maxLength={500}
        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        style={{
          direction: 'ltr',
          textAlign: 'left',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
};

// Avatar component
const Avatar: React.FC<{ username: string; size?: 'sm' | 'md' }> = ({ username, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initials = username.slice(0, 2).toUpperCase();
  
  return (
    <div className={`${sizeClass} bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold`}>
      {initials}
    </div>
  );
};

const CommentSystem: React.FC<CommentSystemProps> = ({ predictionId }) => {
  const { user } = useAuthStore();
  const { handleError, handleSuccess } = useErrorHandler();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Fetch comments
  const fetchComments = async () => {
    if (!predictionId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/v2/social/predictions/${predictionId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      handleError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  // Submit comment
  const submitComment = async (content: string, parentId?: string) => {
    if (!content.trim() || !user) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v2/social/predictions/${predictionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          userId: user.id,
          parent_comment_id: parentId || null,
          user: {
            id: user.id,
            username: user.firstName || user.email?.split('@')[0] || 'User',
            full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
          }
        })
      });

      if (!response.ok) throw new Error('Failed to post comment');
      
      const result = await response.json();
      
      // Add comment to state
      const newCommentData: Comment = {
        id: result.data?.id || Date.now().toString(),
        content: content.trim(),
        user_id: user.id,
        user: {
          id: user.id,
          username: user.firstName || user.email?.split('@')[0] || 'User',
          full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
        },
        created_at: new Date().toISOString(),
        likes_count: 0,
        is_liked: false,
        replies: []
      };

      if (parentId) {
        // Add as reply
        setComments(prev => prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: [newCommentData, ...(comment.replies || [])] }
            : comment
        ));
        setReplyText('');
        setReplyTo(null);
      } else {
        // Add as new comment
        setComments(prev => [newCommentData, ...prev]);
        setNewComment('');
      }
      
      handleSuccess('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      handleError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Load comments on mount
  useEffect(() => {
    fetchComments();
  }, [predictionId]);

  const getUserName = (comment: Comment): string => {
    return comment.user?.full_name || 
           comment.user?.username || 
           (user && comment.user_id === user.id ? (user.firstName || 'User') : 'User');
  };

  return (
    <div className="bg-white rounded-lg border" style={{ direction: 'ltr' }}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center">
          <MessageCircle size={20} className="mr-2" />
          Comments ({comments.length})
        </h3>
      </div>

      {/* New comment input */}
      {user ? (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex space-x-3">
            <Avatar username={user.firstName || 'User'} />
            <div className="flex-1">
              <TextInput
                value={newComment}
                onChange={setNewComment}
                placeholder="Share your thoughts..."
                disabled={submitting}
                onSubmit={() => submitComment(newComment)}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{newComment.length}/500</span>
                <button
                  onClick={() => submitComment(newComment)}
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  {submitting ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b bg-gray-50 text-center">
          <p className="text-gray-600">Sign in to join the conversation</p>
        </div>
      )}

      {/* Comments list */}
      <div className="divide-y">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium mb-2">No comments yet</h4>
            <p>Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-4">
              <div className="flex space-x-3">
                <Avatar username={getUserName(comment)} size="sm" />
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-sm">{getUserName(comment)}</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <p className="text-gray-900 mb-2" style={{ direction: 'ltr', textAlign: 'left' }}>
                    {comment.content}
                  </p>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-4 text-sm">
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500">
                      <Heart size={14} />
                      <span>{comment.likes_count || 0}</span>
                    </button>
                    
                    {user && (
                      <button 
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                      >
                        <Reply size={14} />
                        <span>Reply</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Reply input */}
                  {replyTo === comment.id && user && (
                    <div className="mt-3 ml-4">
                      <TextInput
                        value={replyText}
                        onChange={setReplyText}
                        placeholder={`Reply to ${getUserName(comment)}...`}
                        disabled={submitting}
                        autoFocus
                        onSubmit={() => submitComment(replyText, comment.id)}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{replyText.length}/500</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setReplyTo(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => submitComment(replyText, comment.id)}
                            disabled={!replyText.trim() || submitting}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Send size={14} />
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-100 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex space-x-3">
                          <Avatar username={getUserName(reply)} size="sm" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-sm">{getUserName(reply)}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-gray-900" style={{ direction: 'ltr', textAlign: 'left' }}>
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSystem;
