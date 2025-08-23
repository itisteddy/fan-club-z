import React from 'react';
import { motion } from 'framer-motion';
import { Home, BarChart3, Plus, Users, Wallet } from 'lucide-react';

const ModernBottomNavigation: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('discover');

  const navItems = [
    {
      id: 'discover',
      label: 'Discover',
      icon: Home,
      path: '/',
    },
    {
      id: 'predictions',
      label: 'Predictions',
      icon: BarChart3,
      path: '/predictions',
    },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      path: '/create',
      isSpecial: true,
    },
    {
      id: 'clubs',
      label: 'Clubs',
      icon: Users,
      path: '/clubs',
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      path: '/wallet',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-200"></div>
      
      {/* Navigation content */}
      <div className="relative px-4 pt-2" style={{ paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom))` }}>
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            if (item.isSpecial) {
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="relative p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/25"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </motion.button>
              );
            }

            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-center p-2 min-w-[60px]"
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="relative mb-1">
                  <Icon 
                    className={`w-6 h-6 transition-colors duration-200 ${
                      isActive 
                        ? 'text-teal-600' 
                        : 'text-gray-400'
                    }`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 w-1 h-1 bg-teal-600 rounded-full"
                      initial={{ scale: 0, x: '-50%' }}
                      animate={{ scale: 1, x: '-50%' }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </div>
                
                <span 
                  className={`text-xs font-medium transition-colors duration-200 ${
                    isActive 
                      ? 'text-teal-600' 
                      : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModernBottomNavigation;