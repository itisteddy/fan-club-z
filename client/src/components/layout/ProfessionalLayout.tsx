import React from 'react';
import { motion } from 'framer-motion';

interface ProfessionalLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl', 
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none'
};

export const ProfessionalLayout: React.FC<ProfessionalLayoutProps> = ({
  children,
  sidebar,
  header,
  maxWidth = 'xl',
  className = ''
}) => {
  return (
    <div className={`min-h-screen fc-body ${className}`}>
      {/* Header */}
      {header && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200"
        >
          <div className={`fc-container ${maxWidthClasses[maxWidth]}`}>
            {header}
          </div>
        </motion.header>
      )}

      {/* Main Content Area */}
      <main className={`fc-container ${maxWidthClasses[maxWidth]} py-6 md:py-8`}>
        <div className={sidebar ? 'grid grid-cols-1 lg:grid-cols-4 gap-8' : ''}>
          {/* Sidebar */}
          {sidebar && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 space-y-6">
                {sidebar}
              </div>
            </motion.aside>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sidebar ? 0.2 : 0.1 }}
            className={sidebar ? 'lg:col-span-3' : 'w-full'}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalLayout;
