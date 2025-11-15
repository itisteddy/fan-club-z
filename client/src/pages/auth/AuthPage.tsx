import React from 'react';
import AuthGateModal from '../../components/auth/AuthGateModal';

const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Fan Club Z</h1>
          <p className="text-gray-600">
            Sign in to start making predictions and connecting with other fans.
          </p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-800 mb-4">Ready to get started?</p>
          <p className="text-sm text-gray-500">
            Click anywhere to open the sign-in modal, or it will open automatically when needed.
          </p>
        </div>
      </div>
      
      {/* The AuthGateModal will handle all the authentication UI */}
      <AuthGateModal />
    </div>
  );
};

export default AuthPage;
