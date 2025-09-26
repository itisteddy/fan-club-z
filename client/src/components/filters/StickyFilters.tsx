import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FilterPill {
  id: string;
  label: string;
  count?: number;
  color?: 'default' | 'emerald' | 'blue' | 'purple' | 'orange';
}

interface StickyFiltersProps {
  filters: FilterPill[];
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
  className?: string;
  showFilterIcon?: boolean;
}

const StickyFilters: React.FC<StickyFiltersProps> = ({
  filters,
  selectedFilter,
  onFilterChange,
  className,
  showFilterIcon = false
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setShowClearButton(selectedFilter !== 'all' && selectedFilter !== '');
  }, [selectedFilter]);

  const getColorClasses = (color: FilterPill['color'], isSelected: boolean) => {
    const colorMap = {
      default: isSelected 
        ? 'bg-gray-900 text-white border-gray-900' 
        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
      emerald: isSelected
        ? 'bg-emerald-500 text-white border-emerald-500'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      blue: isSelected
        ? 'bg-blue-500 text-white border-blue-500'
        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      purple: isSelected
        ? 'bg-purple-500 text-white border-purple-500'
        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      orange: isSelected
        ? 'bg-orange-500 text-white border-orange-500'
        : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    };
    return colorMap[color || 'default'];
  };

  const handleClearFilters = () => {
    onFilterChange('all');
  };

  return (
    <>
      {/* Intersection Sentinel */}
      <div ref={sentinelRef} className="h-px" />
      
      {/* Sticky Filter Container */}
      <motion.div
        ref={containerRef}
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          isSticky 
            ? "bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm" 
            : "bg-transparent",
          className
        )}
        animate={{
          backgroundColor: isSticky ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0)"
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Filter Icon */}
            {showFilterIcon && (
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                <Filter size={16} className="text-gray-600" />
              </div>
            )}

            {/* Scrollable Filter Pills */}
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 pb-1">
                {filters.map((filter, index) => {
                  const isSelected = selectedFilter === filter.id;
                  
                  return (
                    <motion.button
                      key={filter.id}
                      onClick={() => onFilterChange(filter.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full",
                        "border font-medium text-sm whitespace-nowrap",
                        "transition-all duration-200 focus:outline-none",
                        "focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500",
                        "active:scale-95",
                        getColorClasses(filter.color, isSelected)
                      )}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{filter.label}</span>
                      {filter.count !== undefined && (
                        <motion.span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                            isSelected 
                              ? "bg-white/20 text-white" 
                              : "bg-gray-200 text-gray-600"
                          )}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: (index * 0.05) + 0.1 }}
                        >
                          {filter.count > 99 ? '99+' : filter.count}
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters Button */}
            <AnimatePresence>
              {showClearButton && (
                <motion.button
                  onClick={handleClearFilters}
                  className={cn(
                    "flex items-center justify-center w-8 h-8",
                    "bg-gray-100 hover:bg-gray-200 rounded-lg",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  )}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Clear filters"
                >
                  <X size={16} className="text-gray-600" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default StickyFilters;
