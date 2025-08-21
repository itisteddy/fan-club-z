import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ProfileErrorBoundary } from './ErrorBoundary';
import ProfilePage from '../pages/ProfilePage';
import PageWrapper from './PageWrapper';
import { useAuthStore } from '../store/authStore';

interface ProfileRouteProps {
  // No props needed - we'll extract everything from the URL
}

const ProfileRoute: React.FC<ProfileRouteProps> = () => {
  const [location, navigate] = useLocation();
  const { user: currentUser } = useAuthStore();
  const [userId, setUserId] = useState<string | undefined>();
  const [isValidRoute, setIsValidRoute] = useState(true);

  useEffect(() => {
    // Extract userId from URL path with better error handling
    try {
      const pathParts = location.split('/');
      const profileIndex = pathParts.findIndex(part => part === 'profile');
      
      if (profileIndex !== -1 && pathParts.length > profileIndex + 1) {
        const extractedUserId = pathParts[profileIndex + 1];
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (extractedUserId && extractedUserId.trim() !== '') {
          if (uuidRegex.test(extractedUserId)) {
            console.log('✅ Valid UUID profile route:', extractedUserId);
            setUserId(extractedUserId);
            setIsValidRoute(true);
          } else {
            // Check if it's a username (fallback)
            if (extractedUserId.length > 2 && /^[a-zA-Z0-9_]+$/.test(extractedUserId)) {
              console.log('⚠️ Username-based profile route (deprecated):', extractedUserId);
              setUserId(extractedUserId);
              setIsValidRoute(true);
            } else {
              console.error('❌ Invalid profile route format:', extractedUserId);
              setIsValidRoute(false);
            }
          }
        } else {
          // Empty userId - viewing own profile
          setUserId(undefined);
          setIsValidRoute(true);
        }
      } else if (location === '/profile') {
        // Viewing own profile
        setUserId(undefined);
        setIsValidRoute(true);
      } else {
        console.error('❌ Invalid profile URL structure:', location);
        setIsValidRoute(false);
      }
    } catch (error) {
      console.error('❌ Error parsing profile route:', error);
      setIsValidRoute(false);
    }
  }, [location]);

  const handleNavigateBack = () => {
    // Smart navigation back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  // Handle invalid routes
  if (!isValidRoute) {
    return (
      <PageWrapper title="Profile">
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 pt-12 pb-6">
            <div className="px-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleNavigateBack}
                  className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-white text-2xl font-bold">Profile</h1>
              </div>
            </div>
          </div>

          {/* Error Content */}
          <div className="flex items-center justify-center p-6 mt-8">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-6 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Invalid Profile Link
              </h2>
              
              <p className="text-gray-600 text-sm mb-6">
                The profile link you followed is not valid. Please check the URL and try again.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleNavigateBack}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  Go Back
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <ProfileErrorBoundary>
      <PageWrapper title={userId ? "User Profile" : "My Profile"}>
        <ProfilePage 
          onNavigateBack={handleNavigateBack}
          userId={userId}
        />
      </PageWrapper>
    </ProfileErrorBoundary>
  );
};

export default ProfileRoute;
