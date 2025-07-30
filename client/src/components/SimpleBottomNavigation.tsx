import React from 'react';

const SimpleBottomNavigation: React.FC = () => {
  const [currentPath, setCurrentPath] = React.useState('/');

  const navItems = [
    { id: 'discover', label: 'Discover', path: '/', icon: '🏠' },
    { id: 'predictions', label: 'Predictions', path: '/predictions', icon: '📊' },
    { id: 'create', label: 'Create', path: '/create', icon: '➕', isSpecial: true },
    { id: 'clubs', label: 'Clubs', path: '/clubs', icon: '👥' },
    { id: 'wallet', label: 'Wallet', path: '/wallet', icon: '💰' },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid #e5e7eb',
      padding: '8px 16px',
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)'
    }}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setCurrentPath(item.path);
            // In a real app, this would use navigation
            console.log(`Navigating to ${item.path}`);
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px',
            borderRadius: item.isSpecial ? '50%' : '12px',
            border: 'none',
            background: item.isSpecial 
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: item.isSpecial ? '48px' : '44px',
            minHeight: item.isSpecial ? '48px' : '44px',
            color: item.isSpecial 
              ? 'white' 
              : currentPath === item.path 
                ? '#22c55e' 
                : '#6b7280',
            boxShadow: item.isSpecial 
              ? '0 4px 12px rgba(34, 197, 94, 0.3)'
              : 'none'
          }}
          onMouseOver={(e) => {
            if (item.isSpecial) {
              e.currentTarget.style.transform = 'translateY(-2px)';
            } else {
              e.currentTarget.style.background = '#f3f4f6';
            }
          }}
          onMouseOut={(e) => {
            if (item.isSpecial) {
              e.currentTarget.style.transform = 'translateY(0px)';
            } else {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <div style={{
            fontSize: item.isSpecial ? '20px' : '18px',
            lineHeight: '1'
          }}>
            {item.icon}
          </div>
          {!item.isSpecial && (
            <span style={{
              fontSize: '10px',
              fontWeight: '500',
              lineHeight: '1'
            }}>
              {item.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default SimpleBottomNavigation;