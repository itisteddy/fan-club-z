import React, { useEffect, useCallback } from 'react';
import { useCommentsForPrediction } from '../../store/unifiedCommentStore';
import { useAuthStore } from '../../store/authStore';
import { openAuthGate } from '../../auth/authGateAdapter';
import { INTENT_MAP } from '../../auth/authIntents';
import CommentsHeader from './CommentsHeader';
import CommentList from './CommentList';
import CommentComposer from './CommentComposer';
import SignedOutGateCard from '../auth/SignedOutGateCard';
import { qaLog } from '../../utils/devQa';

interface CommentsSectionProps {
  predictionId: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ predictionId }) => {
  const { isAuthenticated } = useAuthStore();
  // Removed old useAuthAdapter usage
  
  const {
    comments,
    commentCount,
    status,
    fetchComments,
    loadMore,
    hasMore,
    setHighlighted,
  } = useCommentsForPrediction(predictionId);

  // Handle hash-based deep linking to specific comments
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const commentMatch = hash.match(/^#comment-(.+)$/);
      
      if (commentMatch) {
        const commentId = commentMatch[1];
        qaLog(`Deep linking to comment: ${commentId}`);
        
        // Set highlighted comment
        setHighlighted(commentId);
        
        // Scroll to comment after a brief delay
        setTimeout(() => {
          const commentElement = document.getElementById(`comment-${commentId}`);
          if (commentElement) {
            commentElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 300);
      }
    };

    // Handle initial hash on mount
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [setHighlighted]);

  // Fetch comments on mount if needed
  useEffect(() => {
    if (predictionId && status === 'idle') {
      fetchComments();
    }
  }, [predictionId, status, fetchComments]);

  const handleAuthGateOpen = useCallback(() => {
    openAuthGate({ 
      intent: 'comment_prediction',
      payload: { predictionId }
    });
  }, [predictionId]);

  const handleComposerFocus = useCallback(() => {
    if (!isAuthenticated) {
      handleAuthGateOpen();
    }
  }, [isAuthenticated, handleAuthGateOpen]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && status !== 'paginating') {
      loadMore();
    }
  }, [hasMore, status, loadMore]);

  if (!predictionId?.trim()) {
    qaLog('CommentsSection: No predictionId provided');
    return null;
  }

  return (
    <div 
      className="comments-section" 
      role="region" 
      aria-label="Comments"
    >
      <CommentsHeader count={commentCount} />
      
      <CommentList
        items={comments}
        status={status}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        predictionId={predictionId}
      />

      {isAuthenticated ? (
        <CommentComposer predictionId={predictionId} />
      ) : (
        <div className="p-4">
          <SignedOutGateCard
            title={INTENT_MAP.comment_prediction.title}
            body={INTENT_MAP.comment_prediction.description}
            primaryLabel="Sign In"
            onPrimary={handleAuthGateOpen}
          />
        </div>
      )}
    </div>
  );
};

export default CommentsSection;