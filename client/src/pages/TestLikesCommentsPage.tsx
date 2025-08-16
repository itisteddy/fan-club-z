import React from 'react';
import { Toaster } from 'react-hot-toast';
import LikeAndCommentTest from '../components/LikeAndCommentTest';

const TestLikesCommentsPage: React.FC = () => {
  return (
    <div className=\"min-h-screen bg-gray-50 p-6\">
      <Toaster position=\"top-right\" />
      
      {/* Header */}
      <div className=\"bg-white rounded-2xl p-8 mb-6 text-center shadow-sm border border-gray-100\">
        <h1 className=\"text-3xl font-bold text-gray-900 mb-4\">
          🧪 Likes & Comments API Test
        </h1>
        <p className=\"text-gray-600 max-w-2xl mx-auto\">
          This page tests the like and comment functionality for predictions. 
          Open your browser's developer console to see API calls and responses.
        </p>
      </div>

      {/* API Status */}
      <div className=\"bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100\">
        <h2 className=\"text-xl font-semibold text-gray-900 mb-4\">API Endpoints Being Tested</h2>
        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
          <div className=\"p-4 bg-green-50 rounded-lg border border-green-200\">
            <h3 className=\"font-semibold text-green-800 mb-2\">Prediction Likes</h3>
            <ul className=\"text-sm text-green-700 space-y-1\">
              <li>• POST /api/v2/predictions/:id/like</li>
              <li>• GET /api/v2/predictions/:id/likes</li>
            </ul>
          </div>
          <div className=\"p-4 bg-blue-50 rounded-lg border border-blue-200\">
            <h3 className=\"font-semibold text-blue-800 mb-2\">Comments</h3>
            <ul className=\"text-sm text-blue-700 space-y-1\">
              <li>• GET /api/v2/predictions/:id/comments</li>
              <li>• POST /api/v2/predictions/:id/comments</li>
              <li>• POST /api/v2/comments/:id/like</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test Components */}
      <div className=\"space-y-6\">
        <LikeAndCommentTest
          predictionId=\"d7d1ac22-de45-4931-8ea8-611bfa5e9649\"
          title=\"Will Nigeria's inflation rate drop below 10% by end of 2025?\"
        />
        
        <LikeAndCommentTest
          predictionId=\"test-prediction-2\"
          title=\"Will Bitcoin reach $100,000 by December 2025?\"
        />
        
        <LikeAndCommentTest
          predictionId=\"test-prediction-3\"
          title=\"Will Taylor Swift release a new album in 2025?\"
        />
      </div>

      {/* Instructions */}
      <div className=\"bg-yellow-50 rounded-2xl p-6 mt-8 border border-yellow-200\">
        <h2 className=\"text-xl font-semibold text-yellow-800 mb-4\">
          ✨ How to Test
        </h2>
        <ol className=\"text-yellow-700 space-y-2\">
          <li>1. Click the heart icons to test prediction likes</li>
          <li>2. Add comments to test comment creation</li>
          <li>3. Click heart icons on comments to test comment likes</li>
          <li>4. Check browser console for API request/response logs</li>
          <li>5. Watch for toast notifications confirming actions</li>
        </ol>
      </div>
    </div>
  );
};

export default TestLikesCommentsPage;
