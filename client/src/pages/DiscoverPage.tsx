import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Heart, MessageCircle, Share2, Clock } from 'lucide-react';
import { usePredictionsStore } from '../stores/predictionsStore';
import { useAuthStore } from '../stores/authStore';

// Modern Mobile Header
const MobileHeader: React.FC<{ user: any; stats: any }> = ({ user, stats }) => (
  <div className="bg-white border-b border-gray-100">
    {/* Status bar spacer */}
    <div className="h-11" />
    
    {/* Header content */}
    <div className="px-4 pb-4">
      {/* Welcome text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="text-gray-600">
          Ready to make some winning predictions?
        </p>
      </motion.div>

      {/* Live stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold uppercase tracking-wide">
            Live Market
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              ₦{stats.totalVolume.toLocaleString()}
            </div>
            <div className="text-green-100 text-xs font-medium uppercase tracking-wide">
              Total Volume
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              {stats.activePredictions}
            </div>
            <div className="text-green-100 text-xs font-medium uppercase tracking-wide">
              Active
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              ₦{stats.todayVolume.toLocaleString()}
            </div>
            <div className="text-green-100 text-xs font-medium uppercase tracking-wide">
              Today
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search predictions, categories..."
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </motion.div>
    </div>
  </div>
);

// Category filters
const CategoryFilters: React.FC<{ selectedCategory: string; onSelect: (category: string) => void }> = ({ 
  selectedCategory, 
  onSelect 
}) => {
  const categories = [
    { id: 'all', label: 'All', gradient: 'from-gray-500 to-gray-600' },
    { id: 'sports', label: 'Sports', gradient: 'from-blue-500 to-blue-600' },
    { id: 'politics', label: 'Politics', gradient: 'from-purple-500 to-purple-600' },
    { id: 'entertainment', label: 'Entertainment', gradient: 'from-pink-500 to-pink-600' },
    { id: 'crypto', label: 'Crypto', gradient: 'from-orange-500 to-orange-600' },
    { id: 'tech', label: 'Tech', gradient: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(category.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${
              selectedCategory === category.id
                ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Modern prediction card
const PredictionCard: React.FC<{ prediction: any; index: number }> = ({ prediction, index }) => {
  if (!prediction || !prediction.options || prediction.options.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-gray-100"
    >
      {/* Card header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-sm">FC</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">Fan Club Z</div>
          <div className="text-sm text-gray-500">2h ago</div>
        </div>
        <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
          {prediction.category || 'general'}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
          {prediction.title || 'Untitled Prediction'}
        </h3>
        
        {prediction.description && (
          <p className="text-gray-600 text-sm leading-relaxed">
            {prediction.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between py-3 border-t border-b border-gray-100 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-lg font-bold text-gray-900">
              ₦{(prediction.poolTotal || 0).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {prediction.participantCount || 0} predictors
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-orange-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">5h left</span>
        </div>
      </div>

      {/* Prediction options */}
      <div className="space-y-3 mb-4">
        {prediction.options.slice(0, 2).map((option: any, optionIndex: number) => {
          const totalStaked = option.totalStaked || 0;
          const poolTotal = prediction.poolTotal || 1;
          const percentage = poolTotal > 0 ? Math.min((totalStaked / poolTotal * 100), 100) : 50;
          const odds = totalStaked > 0 ? (poolTotal / totalStaked).toFixed(2) : '2.00';
          
          return (
            <motion.button
              key={option.id || optionIndex}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    optionIndex === 0 ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <span className="font-semibold text-gray-900">
                    {option.label || `Option ${optionIndex + 1}`}
                  </span>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {Math.round(percentage)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {odds}x odds
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(percentage, 2)}%` }}
                  transition={{ duration: 0.8, delay: optionIndex * 0.1 }}
                  className={`h-full rounded-full ${
                    optionIndex === 0 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Engagement */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
            <Heart className="w-5 h-5" />
            <span className="text-sm font-semibold">24</span>
          </button>
          
          <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">12</span>
          </button>
          
          <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/25"
        >
          Predict Now
        </motion.button>
      </div>
    </motion.div>
  );
};

const DiscoverPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { predictions } = usePredictionsStore();
  const { user } = useAuthStore();

  const stats = {
    totalVolume: 2547892,
    activePredictions: 1247,
    todayVolume: 89234,
  };

  const filteredPredictions = (predictions || []).filter(prediction => {
    if (!prediction) return false;
    const matchesCategory = selectedCategory === 'all' || 
      (prediction.category && prediction.category.toLowerCase() === selectedCategory);
    return matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <MobileHeader user={user} stats={stats} />

      {/* Category filters */}
      <CategoryFilters 
        selectedCategory={selectedCategory} 
        onSelect={setSelectedCategory} 
      />

      {/* Content */}
      <div className="py-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {selectedCategory === 'all' ? 'All Predictions' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Predictions`}
          </h2>
          <p className="text-gray-600">
            {filteredPredictions.length} predictions available
          </p>
        </motion.div>

        {/* Predictions list */}
        <div className="pb-6">
          <AnimatePresence mode="wait">
            {filteredPredictions.map((prediction, index) => (
              <PredictionCard
                key={prediction?.id || index}
                prediction={prediction}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredPredictions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-4"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No predictions found</h3>
            <p className="text-gray-600">
              Try adjusting your search or category filter
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;