import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FABAwareContainerProps {
  children: React.ReactNode;
  showFAB?: boolean;
  onFABClick?: () => void;
  fabLabel?: string;
  fabIcon?: React.ReactNode;
  fabVariant?: 'default' | 'glow' | 'minimal';
  className?: string;
}

const FABAwareContainer: React.FC<FABAwareContainerProps> = ({
  children,
  showFAB = false,
  onFABClick,
  fabLabel = 'Create',
  fabIcon = <Plus size={24} />,
  fabVariant = 'default',
  className
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [fabPressed, setFabPressed] = useState(false);

  useEffect(() => {
    if (!showFAB) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showFAB]);

  const getFABStyles = () => {
    const baseClasses = cn(
      "fixed z-[10000] w-14 h-14 rounded-full",
      "flex items-center justify-center",
      "shadow-lg transition-all duration-300",
      "focus:outline-none focus:ring-4 focus:ring-offset-2",
      "active:scale-90 select-none"
    );

    switch (fabVariant) {
      case 'glow':
        return cn(
          baseClasses,
          "bg-gradient-to-r from-emerald-500 to-teal-500",
          "text-white shadow-emerald-500/30",
          "hover:shadow-xl hover:shadow-emerald-500/40",
          "focus:ring-emerald-500/20",
          isScrolled && "shadow-2xl shadow-emerald-500/50"
        );
      
      case 'minimal':
        return cn(
          baseClasses,
          "bg-white text-gray-700 border border-gray-200",
          "shadow-sm hover:shadow-md",
          "focus:ring-gray-500/20",
          "hover:border-gray-300"
        );
      
      default:
        return cn(
          baseClasses,
          "bg-emerald-500 text-white",
          "shadow-emerald-500/25 hover:shadow-emerald-500/40",
          "hover:bg-emerald-600 focus:ring-emerald-500/20"
        );
    }
  };

  const getFABPosition = () => ({
    bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
    right: '1rem',
    transform: isScrolled ? 'translateY(-8px)' : 'translateY(0)'
  });

  return (
    <div className={cn("relative", className)}>
      {children}
      
      {/* Floating Action Button */}
      <AnimatePresence>
        {showFAB && (
          <motion.button
            className={getFABStyles()}
            style={getFABPosition()}
            onClick={onFABClick}
            onMouseDown={() => setFabPressed(true)}
            onMouseUp={() => setFabPressed(false)}
            onMouseLeave={() => setFabPressed(false)}
            initial={{ 
              scale: 0, 
              opacity: 0, 
              rotate: -180 
            }}
            animate={{ 
              scale: fabPressed ? 0.9 : 1, 
              opacity: 1, 
              rotate: 0 
            }}
            exit={{ 
              scale: 0, 
              opacity: 0, 
              rotate: 180 
            }}
            whileHover={{ 
              scale: 1.05,
              y: -2
            }}
            whileTap={{ 
              scale: 0.95 
            }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20 
            }}
            aria-label={fabLabel}
            data-testid="fab-button"
          >
            {/* Icon */}
            <motion.div
              animate={{ 
                rotate: fabPressed ? 45 : 0 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25 
              }}
            >
              {fabIcon}
            </motion.div>

            {/* Glow Effect for glow variant */}
            {fabVariant === 'glow' && (
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
            )}

            {/* Ripple effect on tap */}
            {fabPressed && (
              <motion.div
                className="absolute inset-0 rounded-full bg-white opacity-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* FAB Tooltip (appears on hover for accessibility) */}
      <AnimatePresence>
        {showFAB && (
          <motion.div
            className={cn(
              "fixed z-[9999] px-3 py-1.5 bg-gray-900 text-white text-sm",
              "rounded-lg pointer-events-none opacity-0",
              "transition-opacity duration-200"
            )}
            style={{
              bottom: 'calc(8rem + env(safe-area-inset-bottom))',
              right: '1.5rem',
              transform: 'translateX(50%)'
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {fabLabel}
            {/* Tooltip Arrow */}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '4px solid #1f2937'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FABAwareContainer;
