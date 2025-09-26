import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, TrendingUp, Trophy, User, Wallet, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavigationTab {
  id: string;
  label: string;
  icon: typeof Home;
  badge?: number;
  path: string;
}

interface StableBottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showFAB?: boolean;
  onFABClick?: () => void;
  className?: string;
}

const StableBottomNavigation: React.FC<StableBottomNavigationProps> = ({ 
  activeTab = 'discover', 
  onTabChange,
  showFAB = false,
  onFABClick,
  className
}) => {
  const tabs: NavigationTab[] = [
    { id: 'discover', label: 'Discover', icon: Home, path: '/' },
    { id: 'bets', label: 'My Bets', icon: TrendingUp, path: '/bets', badge: 0 },
    { id: 'leaderboard', label: 'Rankings', icon: Trophy, path: '/leaderboard' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/wallet' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ];

  const handleTabClick = useCallback((tabId: string) => {
    // Scroll to top when navigating to any tab
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (onTabChange) {
      onTabChange(tabId);
    }
  }, [onTabChange]);

  const formatBadgeCount = (count: number) => {
    if (count > 99) return '99+';
    return count.toString();
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[9999]",
          "bg-white/95 backdrop-blur-xl border-t border-gray-200",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.12)]",
          className
        )}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)',
          paddingTop: '0.75rem',
          // Ensure proper clearance on all devices
          minHeight: 'calc(4rem + env(safe-area-inset-bottom))'
        }}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <nav className="px-4">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasBadge = tab.badge !== undefined && tab.badge > 0;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center",
                    "p-2 min-w-0 flex-1 rounded-xl transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
                    "active:scale-95"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`nav-tab-${tab.id}`}
                  aria-label={`Navigate to ${tab.label}`}
                  role="tab"
                  aria-selected={isActive}
                >
                  {/* Icon Container */}
                  <div className="relative mb-1">
                    <motion.div
                      className={cn(
                        "flex items-center justify-center w-6 h-6",
                        "transition-colors duration-200"
                      )}
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        color: isActive ? '#10b981' : '#6b7280'
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Icon 
                        size={20} 
                        strokeWidth={isActive ? 2.5 : 2}
                        className="drop-shadow-sm" 
                      />
                    </motion.div>
                    
                    {/* Badge */}
                    <AnimatePresence>
                      {hasBadge && (
                        <motion.div
                          className={cn(
                            "absolute -top-1 -right-1",
                            "bg-red-500 text-white text-xs font-semibold",
                            "rounded-full min-w-[18px] h-[18px]",
                            "flex items-center justify-center",
                            "shadow-sm border-2 border-white"
                          )}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          {formatBadgeCount(tab.badge!)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Active Indicator */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute -top-1 left-1/2 w-1 h-1 bg-emerald-500 rounded-full shadow-sm"
                          layoutId="activeTabIndicator"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          style={{ transform: 'translateX(-50%)' }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Label */}
                  <motion.span
                    className={cn(
                      "text-xs font-medium text-center leading-tight",
                      "transition-colors duration-200"
                    )}
                    animate={{
                      color: isActive ? '#10b981' : '#6b7280',
                      fontWeight: isActive ? 600 : 500
                    }}
                  >
                    {tab.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>
        </nav>
      </motion.div>

      {/* Floating Action Button */}
      <AnimatePresence>
        {showFAB && (
          <motion.button
            className={cn(
              "fixed z-[10000] w-14 h-14 rounded-full",
              "bg-gradient-to-br from-emerald-500 to-emerald-600",
              "shadow-lg shadow-emerald-500/25",
              "flex items-center justify-center",
              "focus:outline-none focus:ring-4 focus:ring-emerald-500/20",
              "active:scale-95 hover:shadow-xl hover:shadow-emerald-500/30",
              "transition-shadow duration-200"
            )}
            style={{
              bottom: 'calc(5rem + env(safe-area-inset-bottom))',
              right: '1rem'
            }}
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFABClick}
            data-testid="create-fab"
            aria-label="Create new prediction"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Plus size={24} className="text-white drop-shadow-sm" strokeWidth={2.5} />
            
            {/* Pulse animation for emphasis */}
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-400 opacity-0"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0, 0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default StableBottomNavigation;
