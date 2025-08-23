import React from 'react';
import Logo from './common/Logo';
import SimpleBottomNavigation from './SimpleBottomNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

const SimpleMainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: '0',
        zIndex: 20,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '60px'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Logo size="md" variant="icon" />
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111827',
              lineHeight: '1'
            }}>
              FAN CLUB Z
            </div>
            <div style={{
              fontSize: '10px',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '500',
              lineHeight: '1'
            }}>
              Predictions Live
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px'
          }}>
            🔍
          </button>
          <button style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            position: 'relative'
          }}>
            🔔
            {/* Notification badge */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%'
            }}></div>
          </button>
          <button style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px'
          }}>
            👤
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        minHeight: 'calc(100vh - 60px)'
      }}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <SimpleBottomNavigation />
    </div>
  );
};

export default SimpleMainLayout;