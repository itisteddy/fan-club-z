import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Users, 
  TrendingUp, 
  Crown, 
  Star, 
  MapPin, 
  MessageCircle, 
  Calendar,
  Settings,
  ArrowLeft,
  Send,
  Heart,
  Share2,
  MoreHorizontal,
  Filter,
  ChevronDown
} from 'lucide-react';

interface Club {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  isVerified?: boolean;
  isPopular?: boolean;
  image?: string;
  recentActivity: string;
  isJoined?: boolean;
  onlineMembers?: number;
}

interface ClubDiscussion {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  content: string;
  replies: number;
  likes: number;
  timestamp: string;
  isPinned?: boolean;
}

interface ClubPrediction {
  id: string;
  title: string;
  creator: string;
  category: string;
  poolTotal: number;
  participants: number;
  timeRemaining: string;
  options: Array<{
    id: string;
    label: string;
    percentage: number;
    odds: number;
  }>;
}

const ClubsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentView, setCurrentView] = useState('discover'); // discover, clubDetail, discussion, createClub
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState<ClubDiscussion | null>(null);
  const [clubTab, setClubTab] = useState('predictions'); // predictions, discussions, members
  const [newMessage, setNewMessage] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'all', label: 'All Clubs', icon: '🌟' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { id: 'crypto', label: 'Crypto', icon: '₿' },
    { id: 'politics', label: 'Politics', icon: '🏛️' },
    { id: 'tech', label: 'Technology', icon: '💻' },
  ];

  // Mock clubs data with more details
  const clubs: Club[] = [
    {
      id: '1',
      name: 'Premier League Predictors',
      description: 'The ultimate destination for Premier League predictions and analysis. Join thousands of football fans making winning predictions!',
      memberCount: 2547,
      category: 'sports',
      isVerified: true,
      isPopular: true,
      recentActivity: '5 new predictions today',
      isJoined: false,
      onlineMembers: 234
    },
    {
      id: '2',
      name: 'Crypto Bulls',
      description: 'Daily crypto predictions and market analysis from experts and enthusiasts. Bitcoin, Ethereum, and altcoin predictions.',
      memberCount: 1823,
      category: 'crypto',
      isVerified: true,
      recentActivity: 'Bitcoin prediction just closed',
      isJoined: true,
      onlineMembers: 156
    },
    {
      id: '3',
      name: 'Hollywood Insiders',
      description: 'Predict award winners, box office hits, and celebrity news. Oscar predictions, movie grosses, and entertainment gossip.',
      memberCount: 934,
      category: 'entertainment',
      recentActivity: '12 active predictions',
      isJoined: false,
      onlineMembers: 89
    },
    {
      id: '4',
      name: 'Tech Innovators',
      description: 'Predicting the next big thing in technology and startups. AI, blockchain, and emerging tech predictions.',
      memberCount: 1456,
      category: 'tech',
      isPopular: true,
      recentActivity: 'New AI prediction trending',
      isJoined: true,
      onlineMembers: 201
    },
    {
      id: '5',
      name: 'Political Pulse',
      description: 'Elections, policy predictions, and political analysis. Stay informed with crowd-sourced political insights.',
      memberCount: 2103,
      category: 'politics',
      isVerified: true,
      recentActivity: 'Election predictions live',
      isJoined: false,
      onlineMembers: 312
    }
  ];

  // Mock club predictions
  const mockClubPredictions: ClubPrediction[] = [
    {
      id: '1',
      title: 'Will Manchester City win the Premier League this season?',
      creator: 'FootballGuru',
      category: 'sports',
      poolTotal: 5420,
      participants: 89,
      timeRemaining: '2d 15h',
      options: [
        { id: '1', label: 'Yes', percentage: 67, odds: 1.8 },
        { id: '2', label: 'No', percentage: 33, odds: 2.4 }
      ]
    },
    {
      id: '2',
      title: 'Next player to score a hat-trick in Premier League?',
      creator: 'StatsExpert',
      category: 'sports',
      poolTotal: 2180,
      participants: 45,
      timeRemaining: '5d 8h',
      options: [
        { id: '1', label: 'Haaland', percentage: 45, odds: 2.1 },
        { id: '2', label: 'Salah', percentage: 30, odds: 2.8 },
        { id: '3', label: 'Kane', percentage: 25, odds: 3.2 }
      ]
    }
  ];

  // Mock discussions
  const mockDiscussions: ClubDiscussion[] = [
    {
      id: '1',
      title: 'Premier League Title Race Discussion',
      author: 'FootballFanatic',
      authorAvatar: 'FF',
      content: 'What do you think about the current title race? Arsenal looking strong but City have the experience...',
      replies: 23,
      likes: 45,
      timestamp: '2h ago',
      isPinned: true
    },
    {
      id: '2', 
      title: 'January Transfer Window Predictions',
      author: 'TransferGuru',
      authorAvatar: 'TG',
      content: 'Who do you think will be the biggest signing this January? I have a feeling Chelsea will splash the cash again.',
      replies: 18,
      likes: 32,
      timestamp: '4h ago'
    },
    {
      id: '3',
      title: 'Weekend Matches Preview',
      author: 'MatchAnalyst',
      authorAvatar: 'MA',
      content: 'Looking at this weekend\'s fixtures, the City vs Liverpool match is going to be crucial for both teams...',
      replies: 15,
      likes: 28,
      timestamp: '6h ago'
    }
  ];

  const filteredClubs = clubs.filter(club => {
    const matchesCategory = selectedCategory === 'all' || club.category === selectedCategory;
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         club.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const popularClubs = clubs.filter(club => club.isPopular).slice(0, 3);

  const handleJoinClub = async (clubId: string) => {
    try {
      // Find the club
      const clubIndex = clubs.findIndex(c => c.id === clubId);
      if (clubIndex === -1) return;
      
      const club = clubs[clubIndex];
      const wasJoined = club.isJoined;
      
      // Optimistic update
      clubs[clubIndex] = {
        ...club,
        isJoined: !wasJoined,
        memberCount: club.memberCount + (wasJoined ? -1 : 1),
        onlineMembers: club.onlineMembers! + (wasJoined ? -1 : 1)
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show feedback
      if (!wasJoined) {
        // Joined successfully
        console.log(`Joined club: ${club.name}`);
      } else {
        // Left successfully
        console.log(`Left club: ${club.name}`);
      }
    } catch (error) {
      console.error('Failed to update club membership:', error);
      // Revert optimistic update on error
      const clubIndex = clubs.findIndex(c => c.id === clubId);
      if (clubIndex !== -1) {
        const club = clubs[clubIndex];
        clubs[clubIndex] = {
          ...club,
          isJoined: !club.isJoined,
          memberCount: club.memberCount + (club.isJoined ? -1 : 1),
          onlineMembers: club.onlineMembers! + (club.isJoined ? -1 : 1)
        };
      }
    }
  };

  const handleClubClick = (club: Club) => {
    setSelectedClub(club);
    setCurrentView('clubDetail');
  };

  const handleDiscussionClick = (discussion: ClubDiscussion) => {
    setSelectedDiscussion(discussion);
    setCurrentView('discussion');
  };

  const handleBack = () => {
    if (currentView === 'discussion') {
      setCurrentView('clubDetail');
      setSelectedDiscussion(null);
    } else if (currentView === 'clubDetail') {
      setCurrentView('discover');
      setSelectedClub(null);
    } else if (currentView === 'createClub') {
      setCurrentView('discover');
    }
  };

  // Club Discovery View
  const DiscoverView = () => (
    <>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700" />
        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 via-transparent to-blue-600/20" />
        
        {/* Animated background elements */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 px-6 pt-14 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              Prediction Clubs 🎯
            </h1>
            <p className="text-purple-100 text-lg">
              Join communities and predict together
            </p>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/15 backdrop-blur-xl rounded-2xl border border-white/20 p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white">
                  <Users size={16} />
                  <span className="text-sm font-medium">{clubs.reduce((sum, club) => sum + club.memberCount, 0).toLocaleString()} members</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <TrendingUp size={16} />
                  <span className="text-sm font-medium">{clubs.length} active clubs</span>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('createClub')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white font-semibold hover:bg-white/30 transition-all duration-200"
              >
                <Plus size={16} />
                <span>Create Club</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Search and filters */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all duration-200"
              />
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white font-medium hover:bg-white/30 transition-all duration-200"
            >
              <Filter size={16} />
              <span>Filters</span>
              <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-4 bg-white border-b border-gray-200"
          >
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all duration-200 whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-semibold">{category.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="px-6 pb-8">
        {/* Popular Clubs Section */}
        {selectedCategory === 'all' && popularClubs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Star size={20} className="text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900">Popular Clubs</h2>
            </div>
            
            <div className="grid gap-4">
              {popularClubs.map((club, index) => (
                <ClubCard key={club.id} club={club} index={index} onClick={() => handleClubClick(club)} />
              ))}
            </div>
          </motion.section>
        )}

        {/* All Clubs Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCategory === 'all' ? 'All Clubs' : `${categories.find(c => c.id === selectedCategory)?.label}`}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredClubs.length} clubs
            </span>
          </div>

          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredClubs.map((club, index) => (
                <ClubCard key={club.id} club={club} index={index} onClick={() => handleClubClick(club)} />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredClubs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No clubs found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or explore different categories
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('createClub')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25"
              >
                Create Your Own Club
              </motion.button>
            </motion.div>
          )}
        </motion.section>
      </div>
    </>
  );

  // Club Card Component
  const ClubCard = ({ club, index, onClick }: { club: Club; index: number; onClick: () => void }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      layout
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border shadow-lg transition-all duration-300 p-6 ${
        club.isPopular 
          ? 'bg-gradient-to-r from-white via-white to-purple-50/50 border-purple-200/50 shadow-purple-900/5 hover:shadow-xl hover:shadow-purple-900/10'
          : 'bg-white/90 backdrop-blur-sm border-gray-200/50 shadow-gray-900/5 hover:shadow-xl hover:shadow-gray-900/10'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {club.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{club.name}</h3>
              {club.isVerified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Crown size={12} className="text-white" />
                </div>
              )}
              {club.isPopular && (
                <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  Popular
                </div>
              )}
            </div>
            <p className="text-gray-600 text-sm line-clamp-2">{club.description}</p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            handleJoinClub(club.id);
          }}
          className={`ml-4 px-4 py-2 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
            club.isJoined
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30'
          }`}
        >
          {club.isJoined ? 'Joined' : 'Join'}
        </motion.button>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{club.memberCount.toLocaleString()} members</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>{club.onlineMembers} online</span>
          </div>
        </div>
        
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
          {categories.find(c => c.id === club.category)?.label}
        </span>
      </div>
    </motion.div>
  );

  // Club Detail View
  const ClubDetailView = () => {
    if (!selectedClub) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 pt-14 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ArrowLeft size={20} />
            </motion.button>
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedClub.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white">{selectedClub.name}</h1>
                    {selectedClub.isVerified && (
                      <Crown size={16} className="text-yellow-400" />
                    )}
                  </div>
                  <p className="text-purple-100 text-sm">{selectedClub.memberCount.toLocaleString()} members • {selectedClub.onlineMembers} online</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleJoinClub(selectedClub.id)}
              className={`px-4 py-2 font-semibold rounded-xl transition-all duration-200 ${
                selectedClub.isJoined
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-purple-600 hover:bg-gray-100'
              }`}
            >
              {selectedClub.isJoined ? 'Joined' : 'Join Club'}
            </motion.button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
            {['predictions', 'discussions', 'members'].map((tab) => (
              <button
                key={tab}
                onClick={() => setClubTab(tab)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 capitalize ${
                  clubTab === tab
                    ? 'bg-white text-purple-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {clubTab === 'predictions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Club Predictions</h2>
                <button className="text-purple-600 font-medium hover:text-purple-700">
                  Create Prediction
                </button>
              </div>
              
              {mockClubPredictions.map((prediction) => (
                <ClubPredictionCard key={prediction.id} prediction={prediction} />
              ))}
            </div>
          )}

          {clubTab === 'discussions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Discussions</h2>
                <button className="text-purple-600 font-medium hover:text-purple-700">
                  New Discussion
                </button>
              </div>
              
              {mockDiscussions.map((discussion) => (
                <DiscussionCard 
                  key={discussion.id} 
                  discussion={discussion} 
                  onClick={() => handleDiscussionClick(discussion)}
                />
              ))}
            </div>
          )}

          {clubTab === 'members' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Members</h2>
              <div className="text-center py-12">
                <Users size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Member list coming soon!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Club Prediction Card
  const ClubPredictionCard = ({ prediction }: { prediction: ClubPrediction }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-2">{prediction.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>by {prediction.creator}</span>
            <span>₦{prediction.poolTotal.toLocaleString()} pool</span>
            <span>{prediction.participants} participants</span>
          </div>
        </div>
        <span className="text-sm font-medium text-amber-600">{prediction.timeRemaining} left</span>
      </div>

      <div className="space-y-3 mb-4">
        {prediction.options.map((option) => (
          <button
            key={option.id}
            className="w-full p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">{option.label}</span>
              <div className="text-right">
                <div className="font-bold text-gray-900">{option.percentage}%</div>
                <div className="text-xs text-gray-600">{option.odds}x odds</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200">
        Make Prediction
      </button>
    </div>
  );

  // Discussion Card
  const DiscussionCard = ({ discussion, onClick }: { discussion: ClubDiscussion; onClick: () => void }) => (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
          {discussion.authorAvatar}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{discussion.title}</h3>
            {discussion.isPinned && (
              <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-xs">📌</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2">by {discussion.author} • {discussion.timestamp}</p>
          <p className="text-gray-700 mb-3 line-clamp-2">{discussion.content}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <MessageCircle size={14} />
              <span>{discussion.replies} replies</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={14} />
              <span>{discussion.likes} likes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Discussion Detail View
  const DiscussionDetailView = () => {
    if (!selectedDiscussion) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-6 pt-14 pb-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </motion.button>
            <h1 className="text-xl font-bold text-gray-900 flex-1">{selectedDiscussion.title}</h1>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MoreHorizontal size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Discussion Content */}
        <div className="px-6 py-6">
          {/* Original Post */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {selectedDiscussion.authorAvatar}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{selectedDiscussion.author}</h3>
                  <span className="text-sm text-gray-500">{selectedDiscussion.timestamp}</span>
                </div>
                
                <p className="text-gray-700 mb-4">{selectedDiscussion.content}</p>
                
                <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                    <Heart size={18} />
                    <span className="font-medium">{selectedDiscussion.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                    <MessageCircle size={18} />
                    <span className="font-medium">{selectedDiscussion.replies}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                    <Share2 size={18} />
                    <span className="font-medium">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reply Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                U
              </div>
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  rows={3}
                />
                <div className="flex justify-end mt-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!newMessage.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Send size={16} />
                    <span>Reply</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Replies */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Replies ({selectedDiscussion.replies})</h3>
            
            {/* Sample replies */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    U{i}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">User{i}</span>
                      <span className="text-xs text-gray-500">{i}h ago</span>
                    </div>
                    <p className="text-gray-700 text-sm">
                      Great point! I totally agree with your analysis. The stats definitely support this view.
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500">
                        <Heart size={14} />
                        <span>{Math.floor(Math.random() * 10) + 1}</span>
                      </button>
                      <button className="text-xs text-gray-500 hover:text-blue-500">Reply</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Create Club View
  const CreateClubView = () => {
    const [clubForm, setClubForm] = useState({
      name: '',
      description: '',
      category: '',
      visibility: 'public'
    });
    const [isCreating, setIsCreating] = useState(false);
    
    const handleCreateClub = async () => {
      if (!clubForm.name.trim() || !clubForm.description.trim() || !clubForm.category) {
        alert('Please fill in all required fields');
        return;
      }
      
      setIsCreating(true);
      try {
        // Simulate club creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newClub: Club = {
          id: Date.now().toString(),
          name: clubForm.name.trim(),
          description: clubForm.description.trim(),
          category: clubForm.category,
          memberCount: 1,
          isVerified: false,
          isPopular: false,
          recentActivity: 'Just created',
          isJoined: true,
          onlineMembers: 1
        };
        
        // Add to clubs list
        clubs.unshift(newClub);
        
        alert('Club created successfully!');
        
        // Reset form and go back
        setClubForm({ name: '', description: '', category: '', visibility: 'public' });
        setCurrentView('discover');
      } catch (error) {
        console.error('Failed to create club:', error);
        alert('Failed to create club. Please try again.');
      } finally {
        setIsCreating(false);
      }
    };
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 pt-14 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ArrowLeft size={20} />
            </motion.button>
            
            <div>
              <h1 className="text-2xl font-bold text-white">Create New Club</h1>
              <p className="text-green-100">Build your prediction community</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={clubForm.name}
                  onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                  placeholder="Enter club name..."
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-all duration-200"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">{clubForm.name.length}/50 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={clubForm.description}
                  onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                  placeholder="Describe your club and what makes it special..."
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-all duration-200 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{clubForm.description.length}/500 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.slice(1).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setClubForm({ ...clubForm, category: category.id })}
                      className={`p-4 border-2 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                        clubForm.category === category.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-semibold text-gray-900">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Club Visibility
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setClubForm({ ...clubForm, visibility: 'public' })}
                    className={`w-full p-4 border-2 rounded-xl transition-all duration-200 text-left ${
                      clubForm.visibility === 'public'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users size={16} className="text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Public Club</h3>
                        <p className="text-sm text-gray-600">Anyone can discover and join</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setClubForm({ ...clubForm, visibility: 'private' })}
                    className={`w-full p-4 border-2 rounded-xl transition-all duration-200 text-left ${
                      clubForm.visibility === 'private'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Settings size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Private Club</h3>
                        <p className="text-sm text-gray-600">Invitation only or by request</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateClub}
                  disabled={isCreating || !clubForm.name.trim() || !clubForm.description.trim() || !clubForm.category}
                  className={`w-full py-4 font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                    isCreating || !clubForm.name.trim() || !clubForm.description.trim() || !clubForm.category
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30'
                  }`}
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Club...
                    </>
                  ) : (
                    'Create Club'
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {currentView === 'discover' && <DiscoverView />}
      {currentView === 'clubDetail' && <ClubDetailView />}
      {currentView === 'discussion' && <DiscussionDetailView />}
      {currentView === 'createClub' && <CreateClubView />}
    </div>
  );
};

export default ClubsPage;