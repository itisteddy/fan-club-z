import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { openAuthGate } from '../../auth/authGateAdapter';

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
  isPosting: boolean;
  placeholder?: string;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  isPosting,
  placeholder = "Share your thoughts..."
}) => {
  const [text, setText] = useState('');
  const { user } = useAuthSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isPosting) return;
    
    if (!user) {
      openAuthGate({ intent: 'comment_prediction' });
      return;
    }

    try {
      await onSubmit(text.trim());
      setText('');
    } catch (error) {
      // Error handling done at parent level
    }
  };

  if (!user) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <button
          onClick={() => openAuthGate({ intent: 'comment_prediction' })}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Sign in to comment
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={isPosting}
          rows={3}
          className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={1000}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          {text.length}/1000
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Commenting as {user.user_metadata?.username || user.email}
        </div>
        <button
          type="submit"
          disabled={!text.trim() || isPosting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {isPosting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
};
