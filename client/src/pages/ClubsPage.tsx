import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlacePredictionModal } from '../components/predictions/PlacePredictionModal';
import DiscussionDetailPage from './DiscussionDetailPage';
import CreatePredictionPage from './CreatePredictionPage';
import CreateClubPage from './CreateClubPage';
import { ClubDetailPage } from './ClubDetailPage';
import { useClubStore } from '../store/clubStore';
import { useAuthStore } from '../store/authStore';
import { scrollToTop } from '../utils/scroll';
import { usePullToRefresh } from '../utils/pullToRefresh';
import type { Prediction } from '../../shared/src/schemas';
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
  ChevronDown,
  User
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

interface ClubsPageProps {
  onNavigateToCreate?: () => void;
}

// Simplified Mobile Header (following DiscoverPage pattern)
const MobileHeader: React.FC<{ 
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateClub: () => void;
  clubCount: number;
  memberCount: number;
}> = ({ searchQuery, onSearchChange, onCreateClub, clubCount, memberCount }) => (
  <div className="bg-white border-b border-gray-100">
    {/* Status bar spacer */}
    <div className="h-11" />
    
    {/* Header content */}
    <div className="px-4 pb-4">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Prediction Clubs 🎯
          </h1>
          <p className="text-gray-600">
            Join communities and predict together
          </p>
        </div>
        <button 
          onClick={onCreateClub}
          className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <Plus size={20} className="text-white" />
        </button>
      </motion.div>

      {/* Live stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold uppercase tracking-wide">
            Live Clubs
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              {memberCount.toLocaleString()}
            </div>
            <div className="text-purple-100 text-xs font-medium uppercase tracking-wide">
              Members
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              {clubCount}
            </div>
            <div className="text-purple-100 text-xs font-medium uppercase tracking-wide">
              Active Clubs
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              Online
            </div>
            <div className="text-purple-100 text-xs font-medium uppercase tracking-wide">
              Now
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search bar - simplified like DiscoverPage */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search clubs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </motion.div>
    </div>
  </div>
);

// Simplified Category Filters (following DiscoverPage pattern)
const CategoryFilters: React.FC<{ selectedCategory: string; onSelect: (category: string) => void }> = ({ 
  selectedCategory, 
  onSelect 
}) => {
  const categories = [
    { id: 'all', label: 'All', gradient: 'from-gray-500 to-gray-600' },
    { id: 'sports', label: 'Sports', gradient: 'from-blue-500 to-blue-600' },
    { id: 'entertainment', label: 'Entertainment', gradient: 'from-pink-500 to-pink-600' },
    { id: 'crypto', label: 'Crypto', gradient: 'from-orange-500 to-orange-600' },
    { id: 'politics', label: 'Politics', gradient: 'from-purple-500 to-purple-600' },
    { id: 'tech', label: 'Technology', gradient: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="category-filters-container category-filters-flex">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(category.id)}
            className={`category-pill px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center h-10 ${
              selectedCategory === category.id
                ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="leading-none">{category.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Simplified Club Card (following DiscoverPage pattern)
const ClubCard: React.FC<{ 
  club: Club; 
  index: number;
  onJoin: (clubId: string) => void;
  onClick: (club: Club) => void;
}> = ({ club, index, onJoin, onClick }) => {
  
  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin(club.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={() => onClick(club)}
      className="bg-white rounded-xl p-4 mx-4 mb-4 shadow-sm border border-gray-100 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {club.name.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{club.name}</h3>
            {club.isVerified && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown size={12} className="text-white" />
              </div>
            )}
            {club.isPopular && (
              <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex-shrink-0">
                Popular
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{club.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between py-2 border-t border-b border-gray-100 mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span className="text-sm text-gray-600">{club.memberCount.toLocaleString()} members</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">{club.onlineMembers} online</span>
          </div>
        </div>
        
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
          {club.category}
        </span>
      </div>

      {/* Join Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{club.recentActivity}</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleJoinClick}
          className={`px-4 py-2 font-semibold rounded-xl transition-all duration-200 text-sm ${
            club.isJoined
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {club.isJoined ? 'Joined' : 'Join'}
        </motion.button>
      </div>
    </motion.div>
  );
};

      createdAt: new Date(),
      updatedAt: new Date(),
      owner: {
        username: 'Club Owner',
        avatarUrl: undefined
      },
      isMember: clubData.isJoined || false,
      memberRole: clubData.isJoined ? 'member' as const : null,
      activePredictions: 0,
      stats: {
        totalPredictions: 0,
        correctPredictions: 0,
        totalWinnings: 0,
        topMembers: 0
      }
    };
    
    setCurrentClub(extendedClub);
  }, [clubData, setCurrentClub]);
  
  // Create a custom ClubDetailPage that handles navigation properly
  return (
    <div className="min-h-screen bg-background">
      {/* Custom Header with working back button */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-subtle border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-body-md font-semibold text-foreground">Club Details</h1>
          <div className="w-10" />
        </div>
      </header>
      
      {/* Rest of club detail content - hide header to prevent duplicate */}
      <ClubDetailPage hideHeader={true} />
    </div>
  );
};

const ClubsPage: React.FC<ClubsPageProps> = ({ onNavigateToCreate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentView, setCurrentView] = useState('discover');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  
  const { clubs, fetchClubs, loading } = useClubStore();

  // Scroll to top when component mounts
  React.useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  // Fetch clubs on component mount and when category/search changes
  React.useEffect(() => {
    fetchClubs({ 
      category: selectedCategory, 
      search: searchQuery 
    });
  }, [fetchClubs, selectedCategory, searchQuery]);

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('Pull to refresh triggered');
    await fetchClubs({ 
      category: selectedCategory, 
      search: searchQuery 
    });
  }, [fetchClubs, selectedCategory, searchQuery]);

  usePullToRefresh(handleRefresh, {
    threshold: 80,
    disabled: loading || currentView !== 'discover'
  });

  // Simple filtered clubs (following DiscoverPage pattern)
  const filteredClubs = useMemo(() => {
    return clubs.filter(club => {
      // Category filter
      const matchesCategory = selectedCategory === 'all' || club.category === selectedCategory;
      
      // Search filter
      const matchesSearch = !searchQuery || 
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [clubs, selectedCategory, searchQuery]);

  const totalMembers = useMemo(() => 
    clubs.reduce((sum, club) => sum + club.memberCount, 0), 
    [clubs]
  );

  // Simple stable handlers (following DiscoverPage pattern)
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const { joinClub, leaveClub } = useClubStore();
  
  const handleJoinClub = useCallback(async (clubId: string) => {
    console.log('Attempting to join club:', clubId);
    try {
      const success = await joinClub(clubId);
      if (success) {
        console.log('Successfully joined club:', clubId);
        // Refresh clubs list to get updated data
        fetchClubs();
      } else {
        console.log('Failed to join club:', clubId);
      }
    } catch (error) {
      console.error('Error joining club:', error);
    }
  }, [joinClub, fetchClubs]);

  const handleClubClick = useCallback((club: Club) => {
    console.log('Navigating to club:', club.name);
    setSelectedClub(club);
    setCurrentView('clubDetail');
  }, []);

  const handleBackToClubs = useCallback(() => {
    console.log('Navigating back to clubs list');
    setCurrentView('discover');
    setSelectedClub(null);
  }, []);

  const handleCreateClub = useCallback(() => {
    setCurrentView('createClub');
  }, []);

  // Main discovery view
  if (currentView === 'discover') {
    return (
      <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <MobileHeader 
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onCreateClub={handleCreateClub}
          clubCount={clubs.length}
          memberCount={totalMembers}
        />

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
              {selectedCategory === 'all' ? 'All Clubs' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Clubs`}
              {searchQuery && ` - "${searchQuery}"`}
            </h2>
            <p className="text-gray-600">
              {filteredClubs.length} clubs available
            </p>
          </motion.div>

          {/* Clubs list */}
          <div className="pb-6">
            <AnimatePresence initial={false}>
              {filteredClubs.map((club, index) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  index={index}
                  onJoin={handleJoinClub}
                  onClick={handleClubClick}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {filteredClubs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 px-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchQuery ? 'No clubs found' : 'No clubs available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms or category filter'
                  : 'Try adjusting your category filter or create your own club'
                }
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateClub}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg"
              >
                Create Your Own Club
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Handle club detail view
  if (currentView === 'clubDetail' && selectedClub) {
    // Create a specialized version of ClubDetailPage with the club data
    return (
      <ClubDetailPageWithData 
        clubData={selectedClub} 
        onBack={handleBackToClubs}
      />
    );
  }

  // Handle create club view
  if (currentView === 'createClub') {
    return (
      <CreateClubPage 
        onNavigateBack={() => setCurrentView('discover')}
      />
    );
  }

  // Fallback for other views
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentView('discover')}
          className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl"
        >
          Back to Clubs
        </motion.button>
      </div>
    </div>
  );
};

// Export a modified ClubsPage that sets up the route context
export default ClubsPage;