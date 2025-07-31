import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronDown } from 'lucide-react';

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  onSearchChange,
  showFilters = false,
  onToggleFilters,
  placeholder = "Search...",
  className = ""
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search bar - optimized for no re-renders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative"
      >
        <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all duration-200"
        />
      </motion.div>

      {/* Filter button */}
      {onToggleFilters && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleFilters}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white font-medium hover:bg-white/30 transition-all duration-200"
        >
          <Filter size={16} />
          <span>Filters</span>
          <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </motion.button>
      )}
    </div>
  );
};
