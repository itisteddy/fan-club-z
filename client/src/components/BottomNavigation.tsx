import React from 'react';
import { motion } from 'framer-motion';
import { Home, TrendingUp, User, Wallet, Plus } from 'lucide-react';

interface BottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showFAB?: boolean;
  onFABClick?: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab = 'discover', 
  onTabChange,
  showFAB = false,
  onFABClick
}) => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Home },
    { id: 'bets', label: 'My Bets', icon: TrendingUp },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleTabClick = (tabId: string) => {
    // Scroll to top when navigating to any tab
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: '1000',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        paddingTop: '0.5rem',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
      }}
    >
      <nav style={{ padding: '0 1rem', position: 'relative' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-around',
          maxWidth: '400px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 4px',
                  minWidth: '0',
                  flex: '1',
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                data-tour-id={`tab-${tab.id}`}
              >
                {/* Icon container */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '6px',
                  marginTop: '2px',
                  width: '24px',
                  height: '24px'
                }}>
                  <div style={{
                    transition: 'all 0.2s ease',
                    color: isActive ? '#22c55e' : '#6b7280',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} />
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '4px',
                        height: '4px',
                        backgroundColor: '#22c55e',
                        borderRadius: '50%',
                        boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)'
                      }}
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all 0.2s ease',
                  color: isActive ? '#22c55e' : '#6b7280',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Floating Action Button - Only show on Discover page */}
        {showFAB && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onFABClick}
            data-tour-id="create-fab"
            style={{
              position: 'fixed',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              right: '16px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001
            }}
          >
            <Plus size={24} style={{ color: 'white' }} />
          </motion.button>
        )}
      </nav>
    </div>
  );
};

export default BottomNavigation;
