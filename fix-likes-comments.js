#!/usr/bin/env node

/**
 * Quick fix for likes and comments functionality
 * This script creates a simple working API for testing
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// In-memory storage for demonstration
let likesStorage = {};
let commentsStorage = {};
let predictionLikes = {};

// Initialize with some mock data
const mockComments = {
  'prediction-1': [
    {
      id: 'comment-1',
      content: 'This is a great prediction! I think it will definitely happen.',
      user_id: 'user1',
      username: 'CryptoFan',
      avatar_url: null,
      is_verified: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      is_liked: false,
      is_own: false,
      likes_count: 5,
      replies_count: 0,
      depth: 0,
      replies: []
    }
  ]
};

// Initialize storage
commentsStorage = { ...mockComments };

console.log('🚀 Starting likes and comments API fix...');

// PREDICTION LIKES ENDPOINTS
app.post('/api/v2/predictions/:predictionId/like', (req, res) => {
  const { predictionId } = req.params;
  
  if (!predictionLikes[predictionId]) {
    predictionLikes[predictionId] = {
      count: Math.floor(Math.random() * 20) + 5,
      liked: false
    };
  }
  
  const currentState = predictionLikes[predictionId];
  currentState.liked = !currentState.liked;
  currentState.count += currentState.liked ? 1 : -1;
  
  console.log(`❤️  Prediction ${predictionId} like toggled: ${currentState.liked}, count: ${currentState.count}`);
  
  res.json({
    success: true,
    liked: currentState.liked,
    likes_count: currentState.count,
    message: currentState.liked ? 'Prediction liked!' : 'Prediction unliked!'
  });
});

app.get('/api/v2/predictions/:predictionId/likes', (req, res) => {
  const { predictionId } = req.params;
  
  if (!predictionLikes[predictionId]) {
    predictionLikes[predictionId] = {
      count: Math.floor(Math.random() * 20) + 5,
      liked: false
    };
  }
  
  res.json({
    success: true,
    ...predictionLikes[predictionId]
  });
});

// COMMENT ENDPOINTS
app.get('/api/v2/predictions/:predictionId/comments', (req, res) => {
  const { predictionId } = req.params;
  const comments = commentsStorage[predictionId] || [];
  
  console.log(`💬 Fetching comments for prediction ${predictionId}: ${comments.length} comments`);
  
  res.json({
    success: true,
    comments,
    total: comments.length,
    message: 'Comments fetched successfully'
  });
});

app.post('/api/v2/predictions/:predictionId/comments', (req, res) => {
  const { predictionId } = req.params;
  const { content, parent_comment_id } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Comment content is required'
    });
  }
  
  const newComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: content.trim(),
    user_id: 'current-user',
    username: 'You',
    avatar_url: null,
    is_verified: false,
    parent_comment_id: parent_comment_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_liked: false,
    is_own: true,
    likes_count: 0,
    replies_count: 0,
    depth: parent_comment_id ? 1 : 0,
    replies: []
  };
  
  if (!commentsStorage[predictionId]) {
    commentsStorage[predictionId] = [];
  }
  
  if (parent_comment_id) {
    // Add as reply
    const parentComment = findCommentById(commentsStorage[predictionId], parent_comment_id);
    if (parentComment) {
      if (!parentComment.replies) {
        parentComment.replies = [];
      }
      parentComment.replies.push(newComment);
      parentComment.replies_count = parentComment.replies.length;
    }
  } else {
    // Add as top-level comment
    commentsStorage[predictionId].unshift(newComment);
  }
  
  console.log(`💬 Comment added to prediction ${predictionId}: "${content}"`);
  
  res.status(201).json(newComment);
});

// COMMENT LIKES
app.post('/api/v2/comments/:commentId/like', (req, res) => {
  const { commentId } = req.params;
  
  if (!likesStorage[commentId]) {
    likesStorage[commentId] = {
      count: Math.floor(Math.random() * 10) + 1,
      liked: false
    };
  }
  
  const currentState = likesStorage[commentId];
  currentState.liked = !currentState.liked;
  currentState.count += currentState.liked ? 1 : -1;
  
  console.log(`❤️  Comment ${commentId} like toggled: ${currentState.liked}, count: ${currentState.count}`);
  
  res.json({
    success: true,
    liked: currentState.liked,
    likes_count: currentState.count,
    message: currentState.liked ? 'Comment liked!' : 'Comment unliked!'
  });
});

// Helper function to find comment by ID
function findCommentById(comments, commentId) {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment;
    }
    if (comment.replies) {
      const found = findCommentById(comment.replies, commentId);
      if (found) return found;
    }
  }
  return null;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Likes & Comments API is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/v2/predictions/:predictionId/like',
      'GET /api/v2/predictions/:predictionId/likes', 
      'GET /api/v2/predictions/:predictionId/comments',
      'POST /api/v2/predictions/:predictionId/comments',
      'POST /api/v2/comments/:commentId/like'
    ]
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    predictionLikes,
    commentsStorage,
    likesStorage
  });
});

// Catch-all for debugging
app.all('*', (req, res) => {
  console.log(`❌ Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    message: 'Check available endpoints at /api/health'
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Likes & Comments API running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Debug endpoint: http://localhost:${PORT}/api/debug`);
  console.log('');
  console.log('Available endpoints:');
  console.log('- POST /api/v2/predictions/:predictionId/like');
  console.log('- GET /api/v2/predictions/:predictionId/likes');
  console.log('- GET /api/v2/predictions/:predictionId/comments');
  console.log('- POST /api/v2/predictions/:predictionId/comments');
  console.log('- POST /api/v2/comments/:commentId/like');
});
