import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Pin,
  Flag,
  Trash2,
  Edit3,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DiscussionDetailPageProps {
  discussionId?: string;
  onBack?: () => void;
}

interface Comment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface Discussion {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  content: string;
  replies: number;
  likes: number;
  timestamp: string;
  isPinned?: boolean;
  isLiked: boolean;
}

const DiscussionDetailPage: React.FC<DiscussionDetailPageProps> = ({ 
  discussionId = '1', 
  onBack 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  }, [discussionId]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmitComment = useCallback(async () => {
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newComment: Comment = {
        id: Date.now().toString(),
        author: 'You',
        authorAvatar: 'YU',
        content: newMessage.trim(),
        timestamp: 'Just now',
        likes: 0,
        isLiked: false
      };

      setComments(prev => [...prev, newComment]);
      setNewMessage('');
      
      // Update discussion reply count
      if (discussion) {
        setDiscussion(prev => prev ? { ...prev, replies: prev.replies + 1 } : null);
      }

      // Auto-resize textarea
      if (messageInputRef.current) {
        messageInputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [newMessage, discussion]);

  const handleLikeComment = (commentId: string, isReply: boolean = false, parentId?: string) => {
    if (isReply && parentId) {
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId && comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === commentId 
                ? {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
                  }
                : reply
            )
          };
        }
        return comment;
      }));
    } else {
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
            }
          : comment
      ));
    }
  };

  const handleLikeDiscussion = () => {
    if (discussion) {
      setDiscussion(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
      } : null);
    }
  };

  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  }, [handleSubmitComment]);

  if (!discussion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discussion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </motion.button>
            <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {discussion.title}
            </h1>
          </div>
          
          <div className="relative" ref={optionsMenuRef}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal size={20} className="text-gray-600" />
            </motion.button>

            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-w-[180px] z-50"
                >
                  <div className="py-2">
                    <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Pin size={16} />
                      Pin Discussion
                    </button>
                    <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Copy size={16} />
                      Copy Link
                    </button>
                    <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Share2 size={16} />
                      Share
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Edit3 size={16} />
                      Edit
                    </button>
                    <button className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                      <Flag size={16} />
                      Report
                    </button>
                    <button className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Original Discussion Post */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {discussion.authorAvatar}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{discussion.author}</h3>
                <span className="text-sm text-gray-500">{discussion.timestamp}</span>
                {discussion.isPinned && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
                    <Pin size={12} className="text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-700">Pinned</span>
                  </div>
                )}
              </div>
              
              <p className="text-gray-700 mb-4 leading-relaxed">{discussion.content}</p>
              
              <div className="flex items-center gap-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLikeDiscussion}
                  className={`flex items-center gap-2 transition-colors ${
                    discussion.isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                  }`}
                >
                  <Heart size={18} className={discussion.isLiked ? 'fill-current' : ''} />
                  <span className="font-medium">{discussion.likes}</span>
                </motion.button>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircle size={18} />
                  <span className="font-medium">{discussion.replies}</span>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
                >
                  <Share2 size={18} />
                  <span className="font-medium">Share</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reply Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6"
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              YU
            </div>
            <div className="flex-1">
              <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                placeholder="Write a thoughtful reply..."
                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 min-h-[80px]"
                style={{ maxHeight: '120px' }}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-xs text-gray-500">
                  {newMessage.length > 0 && `${newMessage.length} characters`}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitComment}
                  disabled={!newMessage.trim() || isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                    !newMessage.trim() || isSubmitting
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/25'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{isSubmitting ? 'Posting...' : 'Reply'}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Comments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-lg">
              Replies ({comments.length})
            </h3>
          </div>
          
          <AnimatePresence mode="popLayout">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {comment.authorAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">{comment.author}</span>
                      <span className="text-xs text-gray-500">{comment.timestamp}</span>
                    </div>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">{comment.content}</p>
                    
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                        }`}
                      >
                        <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                        <span>{comment.likes}</span>
                      </motion.button>
                      
                      <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors">
                        Reply
                      </button>

                      {comment.replies && comment.replies.length > 0 && (
                        <button
                          onClick={() => toggleCommentExpansion(comment.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {expandedComments.has(comment.id) ? (
                            <>
                              <ChevronUp size={14} />
                              Hide replies
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              Show {comment.replies.length} replies
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Nested Replies */}
                    <AnimatePresence>
                      {comment.replies && expandedComments.has(comment.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pl-4 border-l-2 border-gray-100 space-y-3"
                        >
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {reply.authorAvatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-gray-900 text-sm">{reply.author}</span>
                                  <span className="text-xs text-gray-500">{reply.timestamp}</span>
                                </div>
                                <p className="text-gray-700 text-sm mb-2 leading-relaxed">{reply.content}</p>
                                
                                <div className="flex items-center gap-3">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLikeComment(reply.id, true, comment.id)}
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                      reply.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                                    }`}
                                  >
                                    <Heart size={12} className={reply.isLiked ? 'fill-current' : ''} />
                                    <span>{reply.likes}</span>
                                  </motion.button>
                                  
                                  <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors">
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {comments.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No replies yet
              </h3>
              <p className="text-gray-600">
                Be the first to share your thoughts on this discussion!
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionDetailPage;