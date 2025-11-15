import React from 'react';
// import ModernBottomNavigation from './ModernBottomNavigation'; // Module not found - commented out

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
      {/* <ModernBottomNavigation /> */} {/* Module not found - commented out */}
    </div>
  );
};

export default ModernMainLayout;