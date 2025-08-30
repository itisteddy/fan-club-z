import { apiClient } from '../lib/apiUtils';
import { toast } from 'react-hot-toast';

// Types for social features
export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  totalPredictions: number;
  winRate: number;
  totalEarnings: number;
  isFollowing: boolean;
  isVerified: boolean;
  badges: string[];
}

export interface ActivityItem {
  id: string;
  type: 'prediction_created' | 'prediction_won' | 'comment_added' | 'like_received' | 'followed_user' | 'achievement_earned';
  userId: string;
  username: string;
  userAvatar?: string;
  timestamp: string;
  content: string;
  metadata?: {
    predictionId?: string;
    predictionTitle?: string;
    commentId?: string;
    achievementName?: string;
    amount?: number;
  };
}

export interface PerformanceMetrics {
  totalPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  pendingPredictions: number;
  winRate: number;
  totalInvested: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  averageReturn: number;
  bestCategory: string;
  worstCategory: string;
  longestStreak: number;
  currentStreak: number;
}

export interface CategoryPerformance {
  category: string;
  predictions: number;
  correct: number;
  winRate: number;
  totalInvested: number;
  totalWon: number;
  netProfit: number;
}

export interface ReportData {
  contentType: 'prediction' | 'comment' | 'user';
  contentId: string;
  reason: string;
  description?: string;
  evidence?: string;
}

// Social API Service
export const socialApiService = {
  // User Follow/Unfollow
  async toggleFollow(userId: string, isFollowing: boolean): Promise<boolean> {
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = method === 'POST' 
        ? await apiClient.post(`/users/${userId}/follow`, {})
        : await apiClient.delete(`/users/${userId}/follow`);

      if (response.ok) {
        return !isFollowing; // Return new follow state
      } else {
        throw new Error('Failed to update follow status');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
      throw error;
    }
  },

  // Get Community Users
  async getCommunityUsers(params: {
    tab: 'trending' | 'recent' | 'top';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserProfile[]> {
    try {
      const queryParams = new URLSearchParams({
        tab: params.tab,
        limit: (params.limit || 20).toString(),
        offset: (params.offset || 0).toString()
      });

      if (params.search) {
        queryParams.append('search', params.search);
      }

      const response = await apiClient.get(`/community/users?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      } else {
        throw new Error('Failed to fetch community users');
      }
    } catch (error) {
      console.error('Error fetching community users:', error);
      // Return empty array - endpoint not implemented yet
      return [];
    }
  },

  // Get Activity Feed
  async getActivityFeed(params: {
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<ActivityItem[]> {
    try {
      const queryParams = new URLSearchParams({
        limit: (params.limit || 10).toString(),
        offset: (params.offset || 0).toString()
      });

      if (params.userId) {
        queryParams.append('userId', params.userId);
      }

      const response = await apiClient.get(`/activities?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.activities || [];
      } else {
        throw new Error('Failed to fetch activity feed');
      }
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      // Return empty array - endpoint not implemented yet
      return [];
    }
  },

  // Get Performance Analytics
  async getPerformanceMetrics(params: {
    userId: string;
    timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  }): Promise<{
    metrics: PerformanceMetrics;
    categoryPerformance: CategoryPerformance[];
  }> {
    try {
      const queryParams = new URLSearchParams({
        timeRange: params.timeRange
      });

      const response = await apiClient.get(`/users/${params.userId}/performance?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          metrics: data.metrics,
          categoryPerformance: data.categoryPerformance || []
        };
      } else {
        throw new Error('Failed to fetch performance metrics');
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      // Return empty data - endpoint not implemented yet
      return {
        metrics: {
          totalPredictions: 0,
          correctPredictions: 0,
          incorrectPredictions: 0,
          pendingPredictions: 0,
          winRate: 0,
          totalInvested: 0,
          totalWon: 0,
          totalLost: 0,
          netProfit: 0,
          averageReturn: 0,
          bestCategory: '',
          worstCategory: '',
          longestStreak: 0,
          currentStreak: 0
        },
        categoryPerformance: []
      };
    }
  },

  // Submit Report
  async submitReport(reportData: ReportData): Promise<boolean> {
    try {
      const response = await apiClient.post('/reports', reportData);

      if (response.ok) {
        toast.success('Report submitted successfully');
        return true;
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
      throw error;
    }
  },

  // Get Community Stats
  async getCommunityStats(): Promise<{
    totalUsers: number;
    activePredictions: number;
    totalVolume: string;
    averageWinRate: number;
  }> {
    try {
      const response = await apiClient.get('/community/stats');
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to fetch community stats');
      }
    } catch (error) {
      console.error('Error fetching community stats:', error);
      // Return empty stats if API fails
      return {
        totalUsers: 0,
        activePredictions: 0,
        totalVolume: '0',
        averageWinRate: 0
      };
    }
  }
};
