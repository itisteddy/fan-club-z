import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, MessageCircle, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
}

interface CommentsModalProps {
  predictionId: string;
  predictionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  predictionId,
  predictionTitle,
  isOpen,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'Alex',
      content: 'I think Bitcoin will definitely reach $100k! The institutional adoption is accelerating.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      likes: 12,
      isLiked: false,
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Sarah',
      content: 'Not so sure about this one. The market seems too volatile right now.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      likes: 8,
      isLiked: true,
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'Mike',
      content: 'Great prediction! I\'m betting on Yes as well.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      likes: 5,
      isLiked: false,
    },
  ]);
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const comment: Comment = {
      id: Date.now().toString(),
      userId: 'currentUser',
      userName: 'You',
      content: newComment.trim(),
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    setIsSubmitting(false);
    toast.success('Comment posted successfully!');
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked,
        };
      }
      return comment;
    }));
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        <>
          {/* Backdrop - Separate layer with proper z-index */}
          <motion.div
            key="comments-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              pointerEvents: 'auto'
            }}
            onClick={onClose}
          />
          
          {/* Modal Content - Separate layer with higher z-index */}
          <div className="comments-modal" style={{ position: 'fixed', inset: 0, zIndex: 1001, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div
              key="comments-modal-content"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="modal-container"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Comments</h2>
                  <p className="text-sm text-gray-500 truncate">{predictionTitle}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X size={20} />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="modal-body">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No comments yet</h3>
                  <p className="text-gray-500">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-0">
                  <AnimatePresence initial={false}>
                    {comments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3 mb-2"
                      >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                          <User size={16} className="text-white" />
                        </div>
                      </div>

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {comment.userName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                        
                        {/* Comment Actions */}
                        <div className="flex items-center gap-4 mt-1 ml-3">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              comment.isLiked 
                                ? 'text-red-500' 
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={12} className={comment.isLiked ? 'fill-current' : ''} />
                            <span>{comment.likes}</span>
                          </button>
                        </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={commentsEndRef} />
                </div>
              )}
            </div>

            {/* Comment Input - Fixed visibility */}
            <div className="modal-footer">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="force-visible force-white-bg w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl resize-none min-h-[48px] max-h-[120px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={2}
                    style={{
                      backgroundColor: '#ffffff !important',
                      color: '#111827 !important',
                      opacity: '1 !important',
                      visibility: 'visible !important',
                      zIndex: 51
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <button
                    className="force-visible force-green-button absolute right-2 top-2 w-8 h-8 text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    style={{
                      backgroundColor: '#22c55e !important',
                      opacity: '1 !important',
                      visibility: 'visible !important',
                      zIndex: 52,
                      position: 'absolute',
                      display: 'flex'
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
