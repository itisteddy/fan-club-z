import React from 'react';
import ModernBottomNavigation from './ModernBottomNavigation';

interface ModernMainLayoutProps {
  children: React.ReactNode;
}

const ModernMainLayout: React.FC<ModernMainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <ModernBottomNavigation />
    </div>
  );
};

export default ModernMainLayout;