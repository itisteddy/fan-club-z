import React from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Home, 
  TrendingUp, 
  Plus, 
  Users, 
  Wallet,
  Search,
  ChartLine,
  UserGroup,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { scrollToTop } from '../../utils/scroll';
import { useRequireAuth } from '../../hooks/useRequireAuth';

const navigationItems = [
  {
    id: 'discover',
    label: 'Discover',
    icon: Sparkles,
    path: '/discover',
    requiresAuth: false,
  },
  {
    id: 'predictions',
    label: 'My Bets',
    icon: ChartLine,
    path: '/predictions',
    requiresAuth: true,
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    path: '/wallet',
    requiresAuth: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserGroup,
    path: '/profile',
    requiresAuth: true,
  },
];

export const BottomNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { requireAuth, isAuthenticated } = useRequireAuth();

  const isActive = (path: string) => {
    if (path === '/discover') {
      return location === '/' || location === '/discover';
    }
    return location.startsWith(path);
  };

  const handleNavigation = (item: typeof navigationItems[0]) => {
    if (item.requiresAuth && !isAuthenticated) {
      requireAuth(() => {
        setLocation(item.path);
        scrollToTop({ behavior: 'instant' });
      }, `access-${item.id}`);
      return;
    }
    
    setLocation(item.path);
    scrollToTop({ behavior: 'instant' });
  };

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-subtle border-t border-cool-gray-100 safe-area-pb z-50 shadow-level-2"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.isSpecial) {
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className="relative flex flex-col items-center justify-center p-2 min-w-[60px] group"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.1 * index,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                <motion.div 
                  className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-fab group-hover:shadow-level-3 transition-shadow duration-200"
                  whileHover={{ rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon size={24} className="text-white drop-shadow-sm" />
                </motion.div>
                
                {/* Floating label */}
                <motion.span 
                  className="absolute -top-8 px-2 py-1 bg-cool-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  initial={{ y: 10, opacity: 0 }}
                  whileHover={{ y: 0, opacity: 1 }}
                >
                  {item.label}
                </motion.span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className="relative flex flex-col items-center justify-center p-3 min-w-[60px] group"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                delay: 0.1 * index,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
              <div className="relative">
                <motion.div
                  className={cn(
                    "p-2 rounded-xl transition-all duration-200",
                    active ? "bg-primary-green/10" : "hover:bg-cool-gray-100"
                  )}
                  whileHover={{ scale: 1.1 }}
                >
                  <Icon 
                    size={20} 
                    className={cn(
                      "transition-colors duration-200",
                      active ? "text-primary-green" : "text-cool-gray-600 group-hover:text-cool-gray-900"
                    )} 
                  />
                </motion.div>
                
                {/* Enhanced active indicator */}
                {active && (
                  <>
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-green rounded-full"
                      initial={false}
                      transition={{ type: "spring", duration: 0.4 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-primary-green/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </>
                )}
              </div>
              
              <motion.span 
                className={cn(
                  "text-xs mt-1 transition-all duration-200 font-medium",
                  active ? "text-primary-green font-semibold" : "text-cool-gray-600"
                )}
                animate={{
                  scale: active ? 1.05 : 1,
                  fontWeight: active ? 600 : 500
                }}
              >
                {item.label}
              </motion.span>

              {/* Ripple effect on tap */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary-green/20"
                initial={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 1.2, opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Enhanced separator line with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cool-gray-200 to-transparent" />
    </motion.div>
  );
};
