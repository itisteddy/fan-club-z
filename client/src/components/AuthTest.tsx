import React from 'react';
import { useAuthStore } from '../store/authStore';

const AuthTest: React.FC = () => {
  const { user, isAuthenticated, loginWithOAuth, logout, loading } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div style={{
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        margin: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>Test OAuth Authentication</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => loginWithOAuth('google')}
            disabled={loading}
            style={{
              padding: '12px 16px',
              background: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Loading...' : 'Test Google Login'}
          </button>
          <button
            onClick={() => loginWithOAuth('apple')}
            disabled={loading}
            style={{
              padding: '12px 16px',
              background: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Loading...' : 'Test Apple Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '12px',
      margin: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>Authenticated User</h3>
      
      <div style={{ marginBottom: '16px' }}>
        {user?.avatar && (
          <img 
            src={user.avatar} 
            alt="Avatar" 
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              marginBottom: '12px'
            }}
          />
        )}
        <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
          <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Provider:</strong> {user?.provider}</p>
          <p><strong>ID:</strong> {user?.id}</p>
        </div>
      </div>
      
      <button
        onClick={logout}
        disabled={loading}
        style={{
          padding: '12px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
};

export default AuthTest;