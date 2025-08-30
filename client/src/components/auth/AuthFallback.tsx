import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'wouter';

interface AuthFallbackProps {
  error?: string;
  onRetry?: () => void;
}

export const AuthFallback: React.FC<AuthFallbackProps> = ({ error, onRetry }) => {
  const { loginWithOAuth, loading } = useAuthStore();
  const [, navigate] = useLocation();
  const [retryAttempts, setRetryAttempts] = useState(0);

  const handleGoogleRetry = async () => {
    try {
      setRetryAttempts(prev => prev + 1);
      await loginWithOAuth('google');
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const handleClearAndRetry = () => {
    // Clear potentially corrupted storage
    localStorage.removeItem('fanclubz-auth-storage');
    
    // Clear Supabase auth storage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Reload to start fresh
    window.location.href = '/auth';
  };

  const handleManualAuth = () => {
    navigate('/auth/manual');
  };

  const getErrorMessage = (error?: string) => {
    if (!error) return 'Authentication failed unexpectedly.';
    
    if (error.includes('access_denied')) {
      return 'Access was denied. You may have cancelled the sign-in process or denied permissions.';
    }
    
    if (error.includes('popup_closed')) {
      return 'Sign-in window was closed. Please try again and complete the sign-in process.';
    }
    
    if (error.includes('network')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    if (error.includes('session')) {
      return 'Session could not be established. This might be a temporary issue.';
    }
    
    return error;
  };

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '480px',
        width: '100%',
        border: '1px solid #fee2e2'
      }}>
        {/* Error Icon */}
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
          borderRadius: '50%',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>

        {/* Title */}
        <h2 style={{
          margin: '0 0 16px 0',
          color: '#dc2626',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Sign In Failed
        </h2>

        {/* Error Message */}
        <p style={{
          margin: '0 0 24px 0',
          color: '#6b7280',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          {getErrorMessage(error)}
        </p>

        {/* Retry Information */}
        {retryAttempts > 0 && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#92400e'
          }}>
            Retry attempt {retryAttempts}/3. If problems persist, try clearing storage.
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {/* Primary Retry */}
          <button
            onClick={onRetry || handleGoogleRetry}
            disabled={loading || retryAttempts >= 3}
            style={{
              padding: '12px 24px',
              background: retryAttempts >= 3 ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: retryAttempts >= 3 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {retryAttempts >= 3 ? 'Max Retries Reached' : 'Try Again'}
          </button>

          {/* Clear Storage and Retry */}
          <button
            onClick={handleClearAndRetry}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Clear Storage & Start Fresh
          </button>

          {/* Manual Email Login */}
          <button
            onClick={handleManualAuth}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#4b5563',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Use Email Instead
          </button>
        </div>

        {/* Help Section */}
        <div style={{
          borderTop: '1px solid #f3f4f6',
          paddingTop: '20px',
          textAlign: 'left'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Common Solutions:
          </h4>
          <ul style={{
            margin: 0,
            padding: '0 0 0 20px',
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            <li>Try signing in using a different browser or incognito mode</li>
            <li>Check that popups are allowed for this site</li>
            <li>Clear your browser's cache and cookies</li>
            <li>Disable ad blockers or privacy extensions temporarily</li>
          </ul>
        </div>

        {/* Continue Browsing */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Continue browsing without signing in
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};