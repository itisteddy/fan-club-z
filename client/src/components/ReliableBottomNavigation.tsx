import React from 'react';

const ReliableBottomNavigation: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('discover');

  const navItems = [
    { id: 'discover', label: 'Discover', icon: '🏠', path: '/' },
    { id: 'predictions', label: 'Predictions', icon: '📊', path: '/predictions' },
    { id: 'create', label: 'Create', icon: '➕', path: '/create', isSpecial: true },
    { id: 'clubs', label: 'Clubs', icon: '👥', path: '/clubs' },
    { id: 'wallet', label: 'Wallet', icon: '💰', path: '/wallet' },
  ];

  const navigationStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid #e5e7eb',
    padding: '8px 16px',
    paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)'
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    maxWidth: '600px',
    margin: '0 auto'
  };

  return (
    <div style={navigationStyle}>
      <div style={containerStyle}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)';
                }}
              >
                {item.icon}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '60px',
                color: isActive ? '#22c55e' : '#9ca3af'
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{
                fontSize: '20px',
                lineHeight: '1',
                marginBottom: '2px'
              }}>
                {item.icon}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: '500',
                lineHeight: '1'
              }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%'
                }}></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReliableBottomNavigation;