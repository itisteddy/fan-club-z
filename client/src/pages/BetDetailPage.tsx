import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useBetStore } from '../store/betStore';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import CommentSystem from '../components/CommentSystem';
import { useCommentsForPrediction } from '../store/unifiedCommentStore';

const BetDetailPage: React.FC = () => {
  const [, params] = useRoute('/bet/:id');
  const { bets } = useBetStore();
  const { balance } = useWalletStore();
  const { user } = useAuthStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

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

  // Real data would come from API - for now empty until backend provides this data
  const topBettors = [];

  const handlePlaceBet = () => {
    if (!selectedOption || !stakeAmount) return;
    
    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    
    // Reset form
    setSelectedOption(null);
    setStakeAmount('');
  };

  return (
    <div className="page-container">
      {/* Bet Header */}
      <div className="prediction-card">
        <div className="prediction-header">
          <div className="prediction-avatar">
            {bet.creator?.avatar_url ? (
              <img
                src={bet.creator.avatar_url}
                alt={bet.creator.username || 'Creator'}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = (bet.creator?.username?.slice(0, 1) || 'A').toUpperCase();
                  }
                }}
              />
            ) : (
              (bet.creator?.username?.slice(0, 1) || 'A').toUpperCase()
            )}
          </div>
          <div className="prediction-creator-info">
            <div className="prediction-creator-name">By @{bet.creator?.username || 'creator'}</div>
            <div className="prediction-timestamp">{bet.status.toUpperCase()}</div>
          </div>
          <div className="prediction-category">{bet.category?.toUpperCase() || 'GENERAL'}</div>
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

      {/* Comments Section */}
      <div className="comments-section">
        <CommentSystem predictionId={bet.id} />
      </div>

      {/* Top Bettors Section - from reference */}
      <div className="comments-section">
        <div className="comments-header">
          <h3 className="comments-title">
            👑 Top Bettors
          </h3>
        </div>
        <div className="comments-list">
          {topBettors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No participants yet. Be the first to place a prediction!</p>
            </div>
          ) : (
            topBettors.map((bettor, index) => (
              <div key={index} className="comment-item">
                <div className="comment-header">
                  <div className="comment-avatar">{bettor.avatar}</div>
                  <div className="comment-author">{bettor.name}</div>
                  <div className="comment-time">{bettor.amount}</div>
                </div>
              </div>
            ))
          )}
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