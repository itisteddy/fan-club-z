import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BottomNavigation from './BottomNavigation';
import { NotificationCenter } from './notifications/NotificationCenter';
import { NotificationBell } from './notifications/NotificationComponents';
import { ToastContainer } from './notifications/ToastNotification';
import { useNotificationStore } from '../store/notificationStore';

interface MainLayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
  showNotificationBell?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  hideNavigation = false, 
  showNotificationBell = true 
}) => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Sophisticated background pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      {/* Notification Bell - Top Right */}
      {showNotificationBell && (
        <div className="fixed top-4 right-4 z-[9000]">
          <NotificationBell
            onClick={() => setIsNotificationCenterOpen(true)}
          />
        </div>
      )}

      {/* Main content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative z-10 ${!hideNavigation ? 'pb-20' : ''} min-h-screen`}
      >
        {children}
      </motion.main>

      {/* Bottom Navigation */}
      {!hideNavigation && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <BottomNavigation />
        </motion.div>
      )}

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    </div>
  );
};

export default MainLayout;