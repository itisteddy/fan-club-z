import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'wouter';

const AuthCallbackPage: React.FC = () => {
  const { handleOAuthCallback, isAuthenticated, loading } = useAuthStore();
  const [, navigate] = useLocation();
  const [callbackProcessed, setCallbackProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processCallback = async () => {
      if (callbackProcessed) return;
      
      try {
        console.log('🔄 Processing OAuth callback...');
        setCallbackProcessed(true);
        await handleOAuthCallback();
        
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          if (isMounted) {
            console.log('✅ OAuth callback processed, redirecting to app...');
            navigate('/');
          }
        }, 1000);
        
      } catch (error: any) {
        console.error('❌ OAuth callback processing failed:', error);
        if (isMounted) {
          setError(error.message || 'Authentication failed');
          // Redirect to auth page on error after a delay
          setTimeout(() => {
            window.location.href = '/auth?error=oauth_failed';
          }, 3000);
        }
      }
    };

    // Small delay to ensure the URL hash is processed
    const timer = setTimeout(processCallback, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [handleOAuthCallback, callbackProcessed, navigate]);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('✅ User already authenticated, redirecting...');
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  // Show error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 30%, #ecfdf5 70%, #f0fdfa 100%)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%',
          border: '1px solid #fee2e2'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          
          <h2 style={{
            margin: '0 0 12px 0',
            color: '#111827',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            Authentication Failed
          </h2>
          
          <p style={{
            margin: '0 0 24px 0',
            color: '#6b7280',
            fontSize: '16px'
          }}>
            {error}
          </p>
          
          <p style={{
            margin: '0',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            Redirecting to login page in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 30%, #ecfdf5 70%, #f0fdfa 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '50%',
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'spin 2s linear infinite'
        }}>
          <span style={{ fontSize: '24px', color: 'white' }}>Z</span>
        </div>
        
        <h2 style={{
          margin: '0 0 12px 0',
          color: '#111827',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Completing Sign In...
        </h2>
        
        <p style={{
          margin: '0 0 24px 0',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Please wait while we finish setting up your account.
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px'
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
              }}
            />
          ))}
        </div>
        
        <div style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          Processed: {callbackProcessed ? 'Yes' : 'No'} | 
          Authenticated: {isAuthenticated ? 'Yes' : 'No'} | 
          Loading: {loading ? 'Yes' : 'No'}
        </div>
      </div>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};

export default AuthCallbackPage;