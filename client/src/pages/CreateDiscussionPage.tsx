import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Check, 
  MessageSquare, 
  Hash,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scrollToTop } from '../utils/scroll';
import { useClubStore } from '../store/clubStore';

interface CreateDiscussionPageProps {
  clubId: string;
  clubName: string;
  onNavigateBack?: () => void;
}

const CreateDiscussionPage: React.FC<CreateDiscussionPageProps> = ({ 
  clubId, 
  clubName, 
  onNavigateBack 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { createDiscussion } = useClubStore();

  // Scroll to top when component mounts
  React.useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  const handleBack = useCallback(() => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  }, [onNavigateBack]);

  const validateForm = useCallback(() => {
    if (!title.trim()) {
      toast.error('Please enter a discussion title');
      return false;
    }
    if (title.trim().length < 5) {
      toast.error('Title must be at least 5 characters long');
      return false;
    }
    if (!content.trim()) {
      toast.error('Please enter discussion content');
      return false;
    }
    if (content.trim().length < 20) {
      toast.error('Content must be at least 20 characters long');
      return false;
    }
    return true;
  }, [title, content]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log('Creating discussion with data:', {
        clubId,
        title: title.trim(),
        content: content.trim()
      });

      const createdDiscussion = await createDiscussion(
        clubId,
        title.trim(),
        content.trim()
      );
      
      if (createdDiscussion) {
        console.log('Discussion created successfully:', createdDiscussion);
        toast.success('🎉 Discussion created successfully!');
        setSubmitSuccess(true);
        
        // Navigate back after success
        setTimeout(() => {
          // Reset form
          setTitle('');
          setContent('');
          setSubmitSuccess(false);
          setIsSubmitting(false);
          
          // Navigate back
          if (onNavigateBack) {
            onNavigateBack();
          }
        }, 2000);
      } else {
        throw new Error('Failed to create discussion');
      }
    } catch (error) {
      console.error('Failed to create discussion:', error);
      toast.error('Failed to create discussion. Please try again.');
      setIsSubmitting(false);
    }
  }, [clubId, title, content, validateForm, onNavigateBack, createDiscussion]);

  // Success View
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center max-w-md w-full"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Discussion Created!</h2>
          <p className="text-gray-600 mb-6">
            Your discussion "{title}" has been successfully created in {clubName}.
          </p>
          <div className="text-sm text-green-600 font-medium">Redirecting back...</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Start Discussion</h1>
          <div className="w-10" />
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Create New Discussion</h2>
          <p className="text-purple-100 text-sm">Share your thoughts with {clubName} members</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 relative z-20"
        >
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discussion Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter discussion title..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
              />
              <div className="text-sm text-gray-500 mt-2">
                {title.length}/100 characters
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discussion Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, questions, or insights with the club members..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                maxLength={2000}
              />
              <div className="text-sm text-gray-500 mt-2">
                {content.length}/2000 characters
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Discussion Guidelines
              </h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Keep discussions relevant to the club's topic</li>
                <li>• Be respectful and constructive</li>
                <li>• Share insights and ask thoughtful questions</li>
                <li>• Avoid spam or promotional content</li>
              </ul>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Discussion...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Create Discussion
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateDiscussionPage; 