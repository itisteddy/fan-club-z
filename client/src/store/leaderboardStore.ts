import { create } from 'zustand';
import { apiClient } from '../lib/apiUtils';

export interface LeaderboardEntry {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  total_invested: number;
  total_profit: number;
  total_entries: number;
  won_entries: number;
  predictions_count: number;
  win_rate: number;
  isCurrentUser?: boolean;
}

interface LeaderboardState {
  data: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  activeTab: 'all' | 'weekly' | 'monthly';
  stats: {
    activePredictors: number;
    totalPredictions: number;
    totalWinnings: number;
  };
  
  // Actions
  fetchLeaderboard: (type?: string, limit?: number) => Promise<void>;
  setActiveTab: (tab: 'all' | 'weekly' | 'monthly') => void;
  clearError: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  data: [],
  loading: false,
  error: null,
  activeTab: 'all',
  stats: {
    activePredictors: 0,
    totalPredictions: 0,
    totalWinnings: 0
  },

  fetchLeaderboard: async (type = 'predictions', limit = 50) => {
    set({ loading: true, error: null });
    
    try {
      console.log(`🔄 Fetching leaderboard: type=${type}, limit=${limit}`);
      const response = await apiClient.get(`/api/v2/users/leaderboard?type=${type}&limit=${limit}`);
      
      console.log('📊 Leaderboard API response:', response);
      
      if (response && response.data) {
        // The API returns { data: [...] } so we access response.data.data
        // But if that's undefined, fall back to response.data directly
        const rawData = response.data.data || response.data;
        
        console.log('📊 Raw leaderboard data:', rawData);
        
        if (!Array.isArray(rawData)) {
          console.warn('⚠️ Leaderboard data is not an array:', rawData);
          set({ 
            data: [], 
            loading: false,
            error: 'Invalid leaderboard data format'
          });
          return;
        }
        
        const leaderboardData = rawData.map((entry: LeaderboardEntry) => ({
          ...entry,
          isCurrentUser: false // Will be set by comparing with current user
        }));
        
        // Calculate stats with null safety
        const stats = {
          activePredictors: leaderboardData.length,
          totalPredictions: leaderboardData.reduce((sum: number, entry: LeaderboardEntry) => sum + (entry.predictions_count || 0), 0),
          totalWinnings: leaderboardData.reduce((sum: number, entry: LeaderboardEntry) => sum + (entry.total_profit || 0), 0)
        };
        
        console.log('✅ Leaderboard data processed:', { count: leaderboardData.length, stats });
        
        set({ 
          data: leaderboardData, 
          stats,
          loading: false 
        });
      } else {
        console.warn('⚠️ No leaderboard data in response');
        set({ 
          data: [], 
          loading: false,
          error: 'No leaderboard data available'
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching leaderboard:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to fetch leaderboard data';
      if (error?.response?.status === 404) {
        errorMessage = 'Leaderboard endpoint not found';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Server error while fetching leaderboard';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      set({ 
        loading: false, 
        error: errorMessage,
        data: [] // Ensure we have empty data on error
      });
    }
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  clearError: () => {
    set({ error: null });
  }
}));
