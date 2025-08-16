import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface LikeAndCommentTestProps {
  predictionId: string;
  title: string;
}

const LikeAndCommentTest: React.FC<LikeAndCommentTestProps> = ({ predictionId, title }) => {
  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch likes and comments on mount
  useEffect(() => {
    fetchLikes();
    fetchComments();
  }, [predictionId]);

  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/v2/predictions/${predictionId}/likes`);
      if (response.ok) {
        const data = await response.json();
        setLikes({ count: data.data.likes_count, liked: data.data.liked });
        console.log('✅ Likes fetched:', data);
      }
    } catch (error) {
      console.log('❌ Error fetching likes:', error);
      // Set fallback data
      setLikes({ count: Math.floor(Math.random() * 20) + 5, liked: false });
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/v2/predictions/${predictionId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        console.log('✅ Comments fetched:', data);
      }
    } catch (error) {
      console.log('❌ Error fetching comments:', error);
      // Set fallback data
      setComments([]);
    }
  };

  const handleLike = async () => {
    // Optimistic update
    setLikes(prev => ({
      count: prev.liked ? prev.count - 1 : prev.count + 1,
      liked: !prev.liked
    }));

    try {
      const response = await fetch(`/api/v2/predictions/${predictionId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setLikes({ count: data.data.likes_count, liked: data.data.liked });
        
        toast.success(data.data.message || 'Like updated!');
        console.log('✅ Like updated:', data);
      } else {
        // Revert optimistic update
        setLikes(prev => ({
          count: prev.liked ? prev.count + 1 : prev.count - 1,
          liked: !prev.liked
        }));
        toast.error('Failed to update like');
      }
    } catch (error) {
      console.log('❌ Error toggling like:', error);
      toast.error('Network error');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v2/predictions/${predictionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [newCommentData, ...prev]);
        setNewComment('');
        toast.success('Comment added!');
        console.log('✅ Comment added:', newCommentData);
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      console.log('❌ Error adding comment:', error);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const response = await fetch(`/api/v2/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Comment like updated!');
        console.log('✅ Comment like updated:', data);
        
        // Update comment in local state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                is_liked: data.liked, 
                likes_count: data.likes_count 
              }
            : comment
        ));
      }
    } catch (error) {
      console.log('❌ Error toggling comment like:', error);
      toast.error('Network error');
    }
  };

  return (
    <motion.div
      className=\"bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6\"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className=\"flex items-center justify-between mb-4\">
        <h3 className=\"text-xl font-semibold text-gray-900\">{title}</h3>
        <span className=\"px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700\">
          Live Test
        </span>
      </div>

      {/* Prediction ID */}
      <p className=\"text-sm text-gray-600 mb-4\">
        Testing likes and comments for prediction: {predictionId}
      </p>

      {/* Social Actions */}
      <div className=\"flex items-center gap-6 mb-6\">
        <motion.button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${
            likes.liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Heart className={`w-5 h-5 ${likes.liked ? 'fill-current' : ''}`} />
          <span className=\"font-medium\">{likes.count}</span>
        </motion.button>

        <button className=\"flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors\">
          <MessageCircle className=\"w-5 h-5\" />
          <span className=\"font-medium\">{comments.length}</span>
        </button>

        <button className=\"flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors\">
          <Share2 className=\"w-5 h-5\" />
          <span className=\"font-medium\">Share</span>
        </button>

        <div className=\"flex items-center gap-2 text-green-600 ml-auto\">
          <TrendingUp className=\"w-4 h-4\" />
          <span className=\"font-medium text-sm\">Testing</span>
        </div>
      </div>

      {/* Comment Input */}
      <div className=\"mb-6\">
        <div className=\"flex gap-3\">
          <div className=\"w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0\">
            <span className=\"text-green-600 font-semibold text-sm\">T</span>
          </div>
          <div className=\"flex-1\">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder=\"Test the comment functionality...\"
              className=\"w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors\"
              rows={3}
              maxLength={500}
            />
            <div className=\"flex justify-between items-center mt-2\">
              <span className=\"text-xs text-gray-500\">
                {newComment.length}/500
              </span>
              <button
                onClick={handleComment}
                disabled={!newComment.trim() || loading}
                className=\"px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium\"
              >
                {loading ? 'Adding...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className=\"space-y-4\">
        {comments.map((comment) => (
          <div key={comment.id} className=\"flex gap-3 p-4 bg-gray-50 rounded-lg\">
            <div className=\"w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0\">
              <span className=\"text-green-600 font-semibold text-sm\">
                {comment.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className=\"flex-1\">
              <div className=\"flex items-center gap-2 mb-1\">
                <span className=\"font-semibold text-sm text-gray-900\">
                  {comment.username || 'Anonymous'}
                </span>
                <span className=\"text-xs text-gray-500\">
                  {new Date(comment.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className=\"text-sm text-gray-900 mb-2\">{comment.content}</p>
              <button
                onClick={() => handleCommentLike(comment.id)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  comment.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                <span>{comment.likes_count || 0}</span>
              </button>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className=\"text-center py-8 text-gray-500\">
            <MessageCircle className=\"w-12 h-12 mx-auto mb-3 text-gray-300\" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LikeAndCommentTest;
