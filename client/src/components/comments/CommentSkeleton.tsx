import React from 'react';

interface CommentSkeletonProps {
  count?: number;
}

const CommentSkeleton: React.FC<CommentSkeletonProps> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="comment-skeleton">
          <div className="comment-skeleton-avatar" />
          <div className="comment-skeleton-content">
            <div className="comment-skeleton-header">
              <div className="comment-skeleton-username" />
              <div className="comment-skeleton-timestamp" />
            </div>
            <div className="comment-skeleton-text" />
            <div className="comment-skeleton-text" />
            <div className="comment-skeleton-text" />
          </div>
        </div>
      ))}
    </>
  );
};

export default CommentSkeleton;