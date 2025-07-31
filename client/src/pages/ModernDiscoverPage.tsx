import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Search, 
  TrendingUp, 
  Plus, 
  Filter, 
  Star, 
  Users, 
  DollarSign, 
  Clock, 
  Heart, 
  MessageCircle, 
  Share2,
  Bell,
  Activity,
  Target,
  Award,
  Zap,
  ChevronRight,
  BarChart3,
  Calendar
} from 'lucide-react';

// Mock data
const mockUser = { firstName: 'Alex' };
const mockPredictions = [
  {
    id: '1',
    title: 'Will Bitcoin reach $100k by end of 2025?',
    description: 'With recent market trends and institutional adoption, will Bitcoin break the $100k barrier?',
    category: 'crypto',
    creatorName: 'CryptoExpert',
    entryDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    options: [
      { id: 'yes', label: 'Yes', totalStaked: 45000, percentage: 64 },
      { id: 'no', label: 'No', totalStaked: 25000, percentage: 36 }
    ],
    poolTotal: 70000,
    participants: ['user1', 'user2', 'user3'],
    likes: 24,
    comments: 8
  },
  {
    id: '2', 
    title: 'Who will win the 2025 Champions League?',
    description: 'The most prestigious tournament in club football - predict the winner!',
    category: 'sports',
    creatorName: 'FootballFan',
    entryDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    options: [
      { id: 'real', label: 'Real Madrid', totalStaked: 32000, percentage: 43 },
      { id: 'city', label: 'Man City', totalStaked: 28000, percentage: 37 },
      { id: 'bayern', label: 'Bayern Munich', totalStaked: 15000, percentage: 20 }
    ],
    poolTotal: 75000,
    participants: ['user1', 'user4', 'user5'],
    likes: 18,
    comments: 12
  }
];

const ModernDiscoverPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Enhanced filter categories with proper icons
  const categories = [
    { 
      id: 'all', 
      label: 'All', 
      icon: Star, 
      count: mockPredictions.length,
      gradient: 'from-purple-400 to-pink-400'
    },
    { 
      id: 'sports', 
      label: 'Sports', 
      icon: Target, 
      count: mockPredictions.filter(p => p.category === 'sports').length,
      gradient: 'from-orange-400 to-red-400'
    },
    { 
      id: 'crypto', 
      label: 'Crypto', 
      icon: BarChart3, 
      count: mockPredictions.filter(p => p.category === 'crypto').length,
      gradient: 'from-yellow-400 to-orange-400'
    },
    { 
      id: 'pop_culture', 
      label: 'Pop Culture', 
      icon: Award, 
      count: mockPredictions.filter(p => p.category === 'pop_culture').length,
      gradient: 'from-pink-400 to-purple-400'
    },
    { 
      id: 'politics', 
      label: 'Politics', 
      icon: Calendar, 
      count: mockPredictions.filter(p => p.category === 'politics').length,
      gradient: 'from-blue-400 to-indigo-400'
    },
  ];

  // Filter predictions
  const filteredPredictions = mockPredictions.filter(prediction => {
    const matchesSearch = prediction.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prediction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeFilter === 'all' || prediction.category === activeFilter;
    return matchesSearch && matchesCategory;
  });

  // Featured prediction (highest pool)
  const featuredPrediction = mockPredictions.length > 0 
    ? mockPredictions.reduce((prev, current) => 
        ((prev?.poolTotal || 0) > (current?.poolTotal || 0)) ? prev : current
      )
    : null;

  // Live statistics
  const totalPredictions = mockPredictions.length;
  const totalVolume = mockPredictions.reduce((sum, p) => sum + (p.poolTotal || 0), 0);
  const activePredictors = new Set(mockPredictions.flatMap(p => p.participants || [])).size;

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const PredictionCard: React.FC<{ prediction: any }> = ({ prediction }) => (
    <motion.div 
      className="prediction-card group"
      onClick={() => setLocation(`/prediction/${prediction.id}`)}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="prediction-card-header">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-neutral-700">
              {prediction.creatorName}
            </div>
            <div className="text-xs text-neutral-500 capitalize">
              {prediction.category.replace('_', ' ')}
            </div>
          </div>
        </div>
        <motion.div 
          className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-200"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
          <Activity className="w-3 h-3 inline mr-1" />
          LIVE
        </motion.div>
      </div>

      <div className="prediction-card-content">
        <h3 className="prediction-card-title">
          {prediction.title}
        </h3>
        <p className="prediction-card-description">
          {prediction.description}
        </p>

        {/* Prediction Options */}
        <div className="grid grid-2 gap-3 mb-4">
          {prediction.options.map((option: any, index: number) => {
            const isWinning = index === 0; // First option as winning for demo
            return (
              <motion.div
                key={option.id}
                className={`
                  p-4 rounded-xl border-2 transition-all cursor-pointer
                  ${isWinning 
                    ? 'bg-primary-50 border-primary-200 hover:bg-primary-100' 
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${isWinning ? 'text-primary-700' : 'text-neutral-700'}`}>
                    {option.label}
                  </span>
                  <span className={`text-lg font-bold ${isWinning ? 'text-primary-600' : 'text-neutral-600'}`}>
                    {option.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${isWinning ? 'bg-primary-500' : 'bg-neutral-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${option.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="engagement-bar">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-neutral-600">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold">₦{(prediction.poolTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-neutral-600">
              <Users className="w-4 h-4" />
              <span>{prediction.participants?.length || 0} predictors</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-neutral-600">
              <Clock className="w-4 h-4" />
              <span>5 days left</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="engagement-item">
              <Heart className="engagement-icon" />
              <span className="engagement-count">{prediction.likes}</span>
            </button>
            <button className="engagement-item">
              <MessageCircle className="engagement-icon" />
              <span className="engagement-count">{prediction.comments}</span>
            </button>
            <button className="engagement-item">
              <Share2 className="engagement-icon" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Enhanced Welcome Section */}
      <div className="content-section">
        <motion.div 
          className="flex-between mb-6"
          variants={itemVariants}
        >
          <div className="flex-1">
            <h1 className="text-display-md text-neutral-900 mb-2 font-bold leading-tight">
              Welcome back, {mockUser?.firstName || 'Predictor'}! 
              <motion.span
                className="inline-block ml-2"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
              >
                <Zap className="w-8 h-8 text-primary-500 inline" />
              </motion.span>
            </h1>
            <p className="text-md text-neutral-500 leading-relaxed">
              Discover trending predictions and join the conversation
            </p>
          </div>
          
          {/* Live indicator */}
          <motion.div 
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-2 rounded-full shadow-sm"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-2 h-2 bg-white rounded-full"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-semibold">Live</span>
          </motion.div>
        </motion.div>

        {/* Enhanced Live Statistics Dashboard */}
        <motion.div 
          className="grid-3 mb-8"
          variants={itemVariants}
        >
          <motion.div 
            className="card text-center hover-lift cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-center mb-3">
              <motion.div 
                className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex-center shadow-md"
                whileHover={{ rotate: 5, boxShadow: "0 8px 25px -5px rgba(16, 185, 129, 0.3)" }}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </motion.div>
            </div>
            <motion.div 
              className="text-2xl font-bold text-emerald-600 mb-1"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              {totalPredictions}
            </motion.div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
              Active Predictions
            </div>
          </motion.div>
          
          <motion.div 
            className="card text-center hover-lift cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-center mb-3">
              <motion.div 
                className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex-center shadow-md"
                whileHover={{ rotate: -5, boxShadow: "0 8px 25px -5px rgba(147, 51, 234, 0.3)" }}
              >
                <DollarSign className="w-6 h-6 text-white" />
              </motion.div>
            </div>
            <motion.div 
              className="text-2xl font-bold text-purple-600 mb-1"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              ₦{(totalVolume / 1000).toFixed(0)}K
            </motion.div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
              Total Volume
            </div>
          </motion.div>
          
          <motion.div 
            className="card text-center hover-lift cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-center mb-3">
              <motion.div 
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex-center shadow-md"
                whileHover={{ rotate: 5, boxShadow: "0 8px 25px -5px rgba(59, 130, 246, 0.3)" }}
              >
                <Users className="w-6 h-6 text-white" />
              </motion.div>
            </div>
            <motion.div 
              className="text-2xl font-bold text-blue-600 mb-1"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
            >
              {activePredictors}
            </motion.div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
              Active Predictors
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced Search Section */}
      <div className="content-section">
        <motion.div 
          className="form-group"
          variants={itemVariants}
        >
          <div className="relative">
            <motion.input
              type="text"
              placeholder="Search predictions, topics, or creators..."
              className="form-input pl-12 pr-12 text-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              whileFocus={{ 
                scale: 1.01,
                boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.08)"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
            <Search className="absolute left-4 top-4 w-5 h-5 text-neutral-400" />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  className="absolute right-4 top-4 w-5 h-5 text-neutral-400 hover:text-neutral-600 rounded-full flex-center"
                  onClick={() => setSearchQuery('')}
                  initial={{ opacity: 0, scale: 0, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0, rotate: 90 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Filter Categories */}
      <div className="content-section">
        <motion.div 
          className="flex items-center gap-3 mb-4"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-semibold text-neutral-700">Categories</span>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-4 h-4 text-primary-500" />
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide"
          variants={itemVariants}
        >
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <motion.button
                key={category.id}
                onClick={() => setActiveFilter(category.id)}
                className={`
                  flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 min-w-max group
                  ${activeFilter === category.id 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-primary-md' 
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:shadow-md'
                  }
                `}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <IconComponent className="w-4 h-4" />
                <span className="font-semibold whitespace-nowrap">{category.label}</span>
                {category.count > 0 && (
                  <motion.span 
                    className={`
                      px-2 py-1 text-xs rounded-full font-bold min-w-[20px] text-center
                      ${activeFilter === category.id 
                        ? 'bg-white/20 text-white' 
                        : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200'
                      }
                    `}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {category.count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Enhanced Featured Section */}
      {!searchQuery && activeFilter === 'all' && featuredPrediction && (
        <motion.div 
          className="content-section"
          variants={itemVariants}
        >
          <div className="flex-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Featured Prediction
            </h2>
            <motion.div 
              className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-200"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <Activity className="w-3 h-3 inline mr-1" />
              HOT
            </motion.div>
          </div>
          
          <motion.div 
            className="relative bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white cursor-pointer overflow-hidden shadow-primary-lg"
            onClick={() => setLocation(`/prediction/${featuredPrediction.id}`)}
            whileHover={{ 
              scale: 1.01, 
              y: -2,
              boxShadow: "0 25px 50px -12px rgba(34, 197, 94, 0.25)"
            }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-20 h-20 border border-white rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 border border-white rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white rounded-full"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex-between mb-4">
                <div className="flex-1">
                  <motion.h3 
                    className="text-xl font-bold mb-2 flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Zap className="w-5 h-5" />
                    Today's Hottest
                  </motion.h3>
                  <motion.p 
                    className="text-lg font-semibold opacity-95 mb-3 line-clamp-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {featuredPrediction.title}
                  </motion.p>
                  <motion.div 
                    className="flex items-center gap-4 text-sm opacity-90"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">₦{(featuredPrediction.poolTotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{featuredPrediction.participants?.length || 0} predictors</span>
                    </div>
                  </motion.div>
                </div>
                <motion.div 
                  className="bg-white/15 backdrop-blur-sm rounded-full p-3"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <TrendingUp className="w-6 h-6" />
                </motion.div>
              </div>
              
              <div className="flex-between">
                <span className="text-sm font-medium opacity-90">Tap to predict</span>
                <motion.div 
                  className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5"
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                >
                  <span className="text-sm font-semibold">View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Enhanced Predictions List */}
      <AnimatePresence mode="wait">
        {filteredPredictions.length > 0 ? (
          <motion.div 
            className="content-section"
            variants={itemVariants}
            key="predictions-list"
          >
            <div className="flex-between mb-6">
              <h2 className="text-xl font-bold text-neutral-900">
                {activeFilter === 'all' ? 'All Predictions' : categories.find(c => c.id === activeFilter)?.label}
                <span className="ml-2 text-sm text-neutral-500 font-medium">
                  ({filteredPredictions.length})
                </span>
              </h2>
              <motion.button 
                className="text-primary-600 font-semibold text-sm hover:text-primary-700 transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="space-y-6">
              {filteredPredictions.map((prediction, index) => (
                <motion.div 
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                  layout
                >
                  <PredictionCard prediction={prediction} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Enhanced Empty State */
          <motion.div 
            className="content-section"
            variants={itemVariants}
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="empty-state">
              <motion.div 
                className="empty-state-icon"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Target className="w-16 h-16 text-neutral-400 mx-auto" />
              </motion.div>
              <h3 className="empty-state-title">
                {searchQuery ? 'No matching predictions' : 'No predictions yet'}
              </h3>
              <p className="empty-state-message mb-6">
                {searchQuery 
                  ? `No predictions match "${searchQuery}". Try a different search term or explore other categories.`
                  : 'Be the first to create a prediction and start the conversation!'
                }
              </p>
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <motion.button 
                  className="btn btn-primary flex items-center justify-center gap-2"
                  onClick={() => setLocation('/create')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5" />
                  Create Prediction
                </motion.button>
                {searchQuery && (
                  <motion.button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilter('all');
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Clear Search
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacing for navigation */}
      <div className="h-6"></div>
    </motion.div>
  );
};

export default ModernDiscoverPage;