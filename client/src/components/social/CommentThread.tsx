import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, Reply, MoreVertical, Flag, Trash2, Edit3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useSocialStore } from '../../store/socialStore';
import TappableUsername from '../TappableUsername';

interface Comment {
  id: string;
  predictionId: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  liked: boolean;
  replies: Comment[];
  parentId?: string;
  isEdited: boolean;
}

interface CommentThreadProps {
  predictionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  predictionId,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { comments, addComment, toggleLike, deleteComment, editComment } = useSocialStore();
  
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  const predictionComments = comments.filter(c => c.predictionId === predictionId);
  const topLevelComments = predictionComments.filter(c => !c.parentId);

  const getReplies = (commentId: string): Comment[] => {
    return predictionComments.filter(c => c.parentId === commentId);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      await addComment({
        predictionId,
        content: newComment.trim(),
        parentId: replyTo,
      });
      
      setNewComment('');
      setReplyTo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) return;
    await toggleLike(commentId);
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await editComment(commentId, editContent.trim());
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const CommentComponent: React.FC<{ comment: Comment; depth?: number }> = ({ 
    comment, 
    depth = 0 
  }) => {
    const [showActions, setShowActions] = useState(false);
    const replies = getReplies(comment.id);
    const isOwner = user?.id === comment.userId;
    const isEditing = editingComment === comment.id;

    return (
      <div 
        className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'} ${depth > 2 ? 'border-l-2 border-gray-100 pl-4' : ''}`}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              {comment.avatar ? (
                <img src={comment.avatar} alt={comment.username} className="w-8 h-8 rounded-full" />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {comment.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TappableUsername 
                  username={comment.username}
                  userId={comment.userId}
                  className="font-medium text-sm text-gray-900 hover:text-blue-600"
                  showAt={false}
                />
                {comment.isEdited && (
                  <span className="text-xs text-gray-500">(edited)</span>
                )}
                <span className="text-xs text-gray-500">
                  {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Recently'}
                </span>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                    rows={2}
                    placeholder="Edit your comment..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800">{comment.content}</p>
              )}
            </div>

            {/* Comment Actions */}
            {!isEditing && (
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <button
                  onClick={() => handleLike(comment.id)}
                  className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                    comment.liked ? 'text-red-500' : ''
                  }`}
                >
                  <Heart 
                    className={`w-4 h-4 ${comment.liked ? 'fill-current' : ''}`} 
                  />
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>

                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>

                {isOwner && (
                  <div className="relative">
                    <button
                      onClick={() => setShowActions(!showActions)}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showActions && (
                      <div className="absolute top-6 right-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10">
                        <button
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditContent(comment.content);
                            setShowActions(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            deleteComment(comment.id);
                            setShowActions(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!isOwner && (
                  <button className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                )}
              </div>
            )}

            {/* Reply Form */}
            {replyTo === comment.id && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`Reply to ${comment.username}...`}
                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || loading}
                    className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setNewComment('');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Nested Replies */}
            {replies.length > 0 && (
              <div className="mt-2">
                {replies.map((reply) => (
                  <CommentComponent 
                    key={reply.id} 
                    comment={reply} 
                    depth={depth + 1} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Comments</h3>
            <span className="text-sm text-gray-500">({topLevelComments.length})</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 max-h-96">
          {topLevelComments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No comments yet</p>
              <p className="text-sm text-gray-400">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topLevelComments.map((comment) => (
                <CommentComponent key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>

        {/* New Comment Form */}
        {user && !replyTo && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={2}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || loading}
                    className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
