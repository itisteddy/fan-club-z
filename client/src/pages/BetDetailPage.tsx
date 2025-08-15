import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useBetStore } from '../store/betStore';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { useComments, useCreateComment } from '../hooks/useComments';
import { formatDate, generateInitials } from '@fanclubz/shared';

const BetDetailPage: React.FC = () => {
  const [, params] = useRoute('/bet/:id');
  const { bets } = useBetStore();
  const { balance } = useWalletStore();
  const { user } = useAuthStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const bet = bets.find(b => b.id === params?.id);
  
  // Fetch comments for this prediction
  const { 
    data: commentsData, 
    isLoading: commentsLoading, 
    error: commentsError 
  } = useComments(params?.id || '', 1, 20);
  
  // Create comment mutation
  const createCommentMutation = useCreateComment();

  if (!bet) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">Bet Not Found</h3>
          <p className="empty-state-message">
            The bet you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Mock data for display - exactly as shown in reference
  const mockTopBettors = [
    { name: 'Alice', amount: '$1,000', avatar: 'A' }
  ];

  const handlePlaceBet = () => {
    if (!selectedOption || !stakeAmount) return;
    
    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    
    // Reset form
    setSelectedOption(null);
    setStakeAmount('');
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;
    
    if (!user) {
      // TODO: Show login modal or redirect
      console.warn('User must be logged in to comment');
      return;
    }

    setIsSubmittingComment(true);
    
    try {
      await createCommentMutation.mutateAsync({
        prediction_id: bet.id,
        content: newComment.trim(),
      });
      
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  return (
    <div className="page-container">
      {/* Bet Header - from reference */}
      <div className="prediction-card">
        <div className="prediction-header">
          <div className="prediction-avatar">A</div>
          <div className="prediction-creator-info">
            <div className="prediction-creator-name">By @alexj</div>
            <div className="prediction-timestamp">OPEN</div>
          </div>
          <div className="prediction-category">CRYPTO</div>
        </div>

        <div className="prediction-content">
          <h1 className="prediction-title">{bet.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--cool-gray-600)', marginBottom: '16px' }}>
            Do you think: Will Bitcoin reach $100K by December 31st, 2025?
          </p>
        </div>
      </div>

      {/* Place Your Bet Section - exactly as reference */}
      <div className="stake-section">
        <h2 className="stake-title">Place Your Bet</h2>
        
        <div className="prediction-options">
          {bet.options.map((option, index) => (
            <div
              key={option.id}
              className={`prediction-option ${selectedOption === option.id ? 'selected' : ''}`}
              onClick={() => setSelectedOption(option.id)}
            >
              <div className="prediction-option-label">
                {option.label}
              </div>
              <div className="prediction-option-value">
                {(index === 0 ? 15000 : 8500).toLocaleString('en-US')}
              </div>
              <div className="prediction-option-amount">
                ${(index === 0 ? 15000 : 8500).toLocaleString('en-US')}
              </div>
            </div>
          ))}
        </div>

        <div className="stake-input-group">
          <input
            type="number"
            placeholder="Enter stake ($)"
            className="stake-input"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
          />
        </div>

        <button 
          className="btn btn-primary btn-full"
          onClick={handlePlaceBet}
          disabled={!selectedOption || !stakeAmount}
        >
          Place Bet
        </button>
      </div>

      {/* Comments Section - Using Real Data */}
      <div className="comments-section">
        <div className="comments-header">
          <h3 className="comments-title">
            💬 Comments
          </h3>
          {commentsData && (
            <span className="comments-count">
              {commentsData.pagination.total}
            </span>
          )}
        </div>

        {/* Add Comment Input */}
        <div className="comment-input-section">
          <div className="comment-input-group">
            <div className="comment-avatar">
              {user ? generateInitials(user.full_name || user.username) : 'U'}
            </div>
            <textarea
              placeholder="Add a comment..."
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSubmittingComment}
              rows={1}
              style={{ 
                resize: 'none',
                minHeight: '40px',
                maxHeight: '120px',
                overflow: 'auto'
              }}
            />
            <button 
              className="comment-send-btn"
              onClick={handleSendComment}
              disabled={!newComment.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <span>⏳</span>
              ) : (
                <span>➤</span>
              )}
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="comments-list">
          {commentsLoading && (
            <div className="comment-item">
              <div className="comment-content" style={{ color: '#6b7280' }}>
                Loading comments...
              </div>
            </div>
          )}

          {commentsError && (
            <div className="comment-item">
              <div className="comment-content" style={{ color: '#ef4444' }}>
                Failed to load comments. Using demo data.
              </div>
            </div>
          )}

          {commentsData?.data?.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <div className="comment-avatar">
                  {comment.user ? 
                    generateInitials(comment.user.full_name || comment.user.username) : 
                    'U'
                  }
                </div>
                <div className="comment-author">
                  {comment.user?.full_name || comment.user?.username || 'Anonymous'}
                </div>
                <div className="comment-time">
                  {formatDate(comment.created_at)}
                </div>
                {comment.is_edited && (
                  <div className="comment-edited">
                    (edited)
                  </div>
                )}
              </div>
              <div className="comment-content">{comment.content}</div>
              
              {/* Comment Actions */}
              <div className="comment-actions">
                <button className="comment-action-btn" onClick={() => {}}>
                  <span>👍</span>
                  <span>Like</span>
                </button>
                <button className="comment-action-btn" onClick={() => {}}>
                  <span>💬</span>
                  <span>Reply</span>
                </button>
              </div>
            </div>
          ))}

          {commentsData?.data?.length === 0 && !commentsLoading && (
            <div className="empty-state">
              <div className="empty-state-message">
                No comments yet. Be the first to share your thoughts!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Bettors Section - from reference */}
      <div className="comments-section">
        <div className="comments-header">
          <h3 className="comments-title">
            👑 Top
          </h3>
        </div>
        <div className="comments-list">
          {mockTopBettors.map((bettor, index) => (
            <div key={index} className="comment-item">
              <div className="comment-header">
                <div className="comment-avatar">{bettor.avatar}</div>
                <div className="comment-author">{bettor.name}</div>
                <div className="comment-time">{bettor.amount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="success-toast">
          Bet placed successfully! 
          <button 
            onClick={() => setShowSuccessToast(false)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              marginLeft: '8px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default BetDetailPage;