import React from 'react';
import { motion } from 'framer-motion';
import { Home, TrendingUp, Plus, Users, Wallet } from 'lucide-react';

interface BottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab = 'discover', 
  onTabChange 
}) => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Home },
    { id: 'predictions', label: 'My Bets', icon: TrendingUp },
    { id: 'create', label: 'Create', icon: Plus, isCreate: true },
    { id: 'clubs', label: 'Clubs', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
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
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
      }}
    >
      <nav style={{ padding: '0 1rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-around',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            if (tab.isCreate) {
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
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '4px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}>
                    <Icon size={20} style={{ color: 'white' }} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {tab.label}
                  </span>
                </motion.button>
              );
            }

            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
                  transition: 'background-color 0.2s'
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
              >
                {/* Icon container for better centering */}
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
                    transition: 'all 0.2s',
                    color: isActive ? '#10b981' : '#6b7280',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} />
                  </div>
                  
                  {/* Active indicator - positioned relative to icon container */}
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
                        backgroundColor: '#10b981',
                        borderRadius: '50%',
                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
                      }}
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all 0.2s',
                  color: isActive ? '#10b981' : '#6b7280',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default BottomNavigation;
