import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useBetStore } from '../store/betStore';
import { useWalletStore } from '../store/walletStore';

const BetDetailPage: React.FC = () => {
  const [, params] = useRoute('/bet/:id');
  const { bets } = useBetStore();
  const { balance } = useWalletStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [newComment, setNewComment] = useState('');

  const bet = bets.find(b => b.id === params?.id);

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
  const mockComments = [
    {
      id: '1',
      author: 'Sarah',
      time: '7/4/2025, 10:20:00 AM',
      content: 'I think Bitcoin will definitely hit $100K! The fundamentals are strong.',
      avatar: 'S'
    },
    {
      id: '2', 
      author: 'Mike',
      time: '7/4/2025, 9:45:00 AM',
      content: 'Not so sure... the market is very volatile. Could go either way.',
      avatar: 'M'
    }
  ];

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

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    // Add comment logic would go here
    setNewComment('');
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
                {index === 0 ? '15,000' : '8,500'}
              </div>
              <div className="prediction-option-amount">
                ${index === 0 ? '15,000' : '8,500'}
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

      {/* Comments Section - exactly as reference */}
      <div className="comments-section">
        <div className="comments-header">
          <h3 className="comments-title">
            💬 Comments
          </h3>
        </div>

        <div className="comments-list">
          {mockComments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <div className="comment-avatar">{comment.avatar}</div>
                <div className="comment-author">{comment.author}</div>
                <div className="comment-time">{comment.time}</div>
              </div>
              <div className="comment-content">{comment.content}</div>
            </div>
          ))}
        </div>

        {/* Add Comment Input */}
        <div className="comment-input-section">
          <div className="comment-input-group">
            <input
              type="text"
              placeholder="Add a comment..."
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button 
              className="comment-send-btn"
              onClick={handleSendComment}
            >
              <span>➤</span>
            </button>
          </div>
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