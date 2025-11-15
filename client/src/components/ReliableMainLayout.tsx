import React from 'react';
// import ReliableBottomNavigation from './ReliableBottomNavigation'; // Module not found - commented out

interface ReliableMainLayoutProps {
  children: React.ReactNode;
}

const ReliableMainLayout: React.FC<ReliableMainLayoutProps> = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative'
    }}>
      {/* Main Content */}
      <main style={{
        paddingBottom: '80px' // Space for bottom navigation
      }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {/* <ReliableBottomNavigation /> */} {/* Module not found - commented out */}
    </div>
  );
};

export default ReliableMainLayout;