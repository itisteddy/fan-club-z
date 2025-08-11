import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 Processing auth callback...');
        
        // Get the URL fragment and search params
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          return;
        }

        if (data.session) {
          console.log('✅ Email verified successfully!');
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          
          // Reinitialize auth to update state
          await initializeAuth();
          
          // Redirect to main app after successful verification
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          console.log('⚠️ No active session found');
          setStatus('error');
          setMessage('No active session found. Please try logging in again.');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      } catch (error: any) {
        console.error('Auth callback exception:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [initializeAuth]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f9fafb',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        {/* Logo */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px',
          boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
        }}>
          <span style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            Z
          </span>
        </div>

        {/* Status Content */}
        {status === 'loading' && (
          <div>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #22c55e',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '10px'
            }}>
              Verifying your email...
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Please wait while we confirm your email address.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '10px'
            }}>
              Email Verified!
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              {message}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="m21 21-9-9-9 9"/>
                <path d="m3 3 9 9 9-9"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '10px'
            }}>
              Verification Failed
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: '1.5',
              marginBottom: '20px'
            }}>
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Go to App
            </button>
          </div>
        )}

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
