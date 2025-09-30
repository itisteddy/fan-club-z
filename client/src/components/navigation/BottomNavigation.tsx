import React from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Sparkles,
  ChartLine,
  PlusCircle,
  Trophy,
  User
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { scrollToTop } from '../../utils/scroll';

const navigationItems = [
  {
    id: 'discover',
    label: 'Discover',
    icon: Sparkles,
    path: '/discover',
    tourAttr: 'nav-discover',
  },
  {
    id: 'mybets',
    label: 'My Bets',
    icon: ChartLine,
    path: '/mybets',
    tourAttr: 'nav-wallet',
  },
  {
    id: 'create',
    label: 'Create',
    icon: PlusCircle,
    path: '/create',
    isSpecial: true,
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
    path: '/leaderboard',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    path: '/profile',
    tourAttr: 'nav-profile',
  },
];

export const BottomNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === '/discover') {
      return location === '/' || location === '/discover';
    }
    return location.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    // Always scroll to top when navigating (UI/UX best practice)
    scrollToTop({ behavior: 'instant' });
  };

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 z-50 shadow-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
                onClick={() => handleNavigation(item.path)}
                className="relative flex flex-col items-center justify-center p-2 min-w-[60px] group"
                data-tour={item.tourAttr}
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
                  className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200"
                  whileHover={{ rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon size={24} className="text-white drop-shadow-sm" />
                </motion.div>
                
                {/* Floating label */}
                <motion.span 
                  className="absolute -top-8 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
              onClick={() => handleNavigation(item.path)}
              className="relative flex flex-col items-center justify-center p-3 min-w-[60px] group"
              data-tour={item.tourAttr}
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
                    active ? "bg-emerald-50" : "hover:bg-gray-100"
                  )}
                  whileHover={{ scale: 1.1 }}
                >
                  <Icon 
                    size={20} 
                    className={cn(
                      "transition-colors duration-200",
                      active ? "text-emerald-600" : "text-gray-600 group-hover:text-gray-900"
                    )} 
                  />
                </motion.div>
                
                {/* Enhanced active indicator */}
                {active && (
                  <>
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full"
                      initial={false}
                      transition={{ type: "spring", duration: 0.4 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-emerald-600/30"
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
                  active ? "text-emerald-600 font-semibold" : "text-gray-600"
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
                className="absolute inset-0 rounded-xl bg-emerald-600/20"
                initial={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 1.2, opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Enhanced separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </motion.div>
  );
};

export default BottomNavigation;
