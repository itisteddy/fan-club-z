import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { usePredictionStore } from '../store/predictionStore';
import { useWalletStore } from '../store/walletStore';

const PredictionDetailPage: React.FC = () => {
  const [, params] = useRoute('/prediction/:id');
  const { predictions } = usePredictionStore();
  const { balance } = useWalletStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [newComment, setNewComment] = useState('');

  const prediction = predictions.find(p => p.id === params?.id);

  if (!prediction) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">Prediction Not Found</h3>
          <p className="empty-state-message">
            The prediction you're looking for doesn't exist or has been removed.
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

  const mockTopPredictors = [
    { name: 'Alice', amount: '$1,000', avatar: 'A' }
  ];

  const handleMakePrediction = () => {
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
      {/* Prediction Header - from reference */}
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
          <h1 className="prediction-title">{prediction.title}</h1>
          <p style={{ fontSize: '14px', color: 'var(--cool-gray-600)', marginBottom: '16px' }}>
            Do you think: Will Bitcoin reach $100K by December 31st, 2025?
          </p>
        </div>
      </div>

      {/* Make Your Prediction Section - exactly as reference */}
      <div className="stake-section">
        <h2 className="stake-title">Make Your Prediction</h2>
        
        <div className="prediction-options">
          {prediction.options.map((option, index) => (
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
          onClick={handleMakePrediction}
          disabled={!selectedOption || !stakeAmount}
        >
          Make Prediction
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

      {/* Top Predictors Section - from reference */}
      <div className="comments-section">
        <div className="comments-header">
          <h3 className="comments-title">
            👑 Top
          </h3>
        </div>
        <div className="comments-list">
          {mockTopPredictors.map((predictor, index) => (
            <div key={index} className="comment-item">
              <div className="comment-header">
                <div className="comment-avatar">{predictor.avatar}</div>
                <div className="comment-author">{predictor.name}</div>
                <div className="comment-time">{predictor.amount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="success-toast">
          Prediction made successfully! 
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

export default PredictionDetailPage;