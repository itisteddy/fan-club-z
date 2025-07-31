import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { 
  Club, 
  CreateClub,
  ClubMember,
  Comment, 
  CreateComment,
  Reaction, 
  CreateReaction,
  PaginationQuery,
  PaginatedResponse
} from '../../../shared/src/types';

export class SocialService {
  private supabase;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
  }

  // ============================================================================
  // CLUBS METHODS
  // ============================================================================

  async getPublicClubs(
    pagination: PaginationQuery,
    filters: { search?: string; category?: string } = {}
  ): Promise<PaginatedResponse<Club>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('clubs')
        .select(`
          *,
          owner:users!clubs_owner_id_fkey(id, username, full_name, avatar_url),
          member_count:club_members(count)
        `, { count: 'exact' })
        .eq('visibility', 'public');

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.category) {
        query = query.contains('tags', [filters.category]);
      }

      // Apply pagination and sorting
      query = query
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching public clubs:', error);
        throw new Error('Failed to fetch clubs');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getPublicClubs:', error);
      throw error;
    }
  }

  async createClub(userId: string, clubData: CreateClub): Promise<Club> {
    try {
      const { data, error } = await this.supabase
        .from('clubs')
        .insert({
          ...clubData,
          owner_id: userId,
          member_count: 1,
        })
        .select(`
          *,
          owner:users!clubs_owner_id_fkey(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        logger.error('Error creating club:', error);
        throw new Error('Failed to create club');
      }

      // Add creator as admin member
      await this.supabase
        .from('club_members')
        .insert({
          club_id: data.id,
          user_id: userId,
          role: 'admin',
        });

      return data;
    } catch (error) {
      logger.error('Error in createClub:', error);
      throw error;
    }
  }

  async getClubById(clubId: string): Promise<Club | null> {
    try {
      const { data, error } = await this.supabase
        .from('clubs')
        .select(`
          *,
          owner:users!clubs_owner_id_fkey(id, username, full_name, avatar_url),
          member_count:club_members(count)
        `)
        .eq('id', clubId)
        .single();

      if (error && error.code === 'PGRST116') {
        return null; // Club not found
      }

      if (error) {
        logger.error('Error fetching club:', error);
        throw new Error('Failed to fetch club');
      }

      return data;
    } catch (error) {
      logger.error('Error in getClubById:', error);
      throw error;
    }
  }

  async joinClub(userId: string, clubId: string): Promise<ClubMember> {
    try {
      // Check if user is already a member
      const { data: existingMember } = await this.supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        throw new Error('Already a member of this club');
      }

      // Check if club exists and is public
      const club = await this.getClubById(clubId);
      if (!club) {
        throw new Error('Club not found');
      }

      if (club.visibility === 'private') {
        throw new Error('Cannot join private club without invitation');
      }

      // Add member
      const { data, error } = await this.supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: userId,
          role: 'member',
        })
        .select(`
          *,
          user:users(id, username, full_name, avatar_url),
          club:clubs(id, name)
        `)
        .single();

      if (error) {
        logger.error('Error joining club:', error);
        throw new Error('Failed to join club');
      }

      // Update member count
      await this.supabase
        .from('clubs')
        .update({ 
          member_count: club.member_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clubId);

      return data;
    } catch (error) {
      logger.error('Error in joinClub:', error);
      throw error;
    }
  }

  async leaveClub(userId: string, clubId: string): Promise<void> {
    try {
      // Check if user is owner
      const club = await this.getClubById(clubId);
      if (!club) {
        throw new Error('Club not found');
      }

      if (club.owner_id === userId) {
        throw new Error('Club owner cannot leave the club');
      }

      // Remove membership
      const { error } = await this.supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error leaving club:', error);
        throw new Error('Failed to leave club');
      }

      // Update member count
      await this.supabase
        .from('clubs')
        .update({ 
          member_count: Math.max(0, club.member_count - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clubId);
    } catch (error) {
      logger.error('Error in leaveClub:', error);
      throw error;
    }
  }

  async getClubMembers(
    clubId: string, 
    pagination: PaginationQuery
  ): Promise<PaginatedResponse<ClubMember>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('club_members')
        .select(`
          *,
          user:users(id, username, full_name, avatar_url, reputation_score)
        `, { count: 'exact' })
        .eq('club_id', clubId)
        .order('role', { ascending: true }) // admins first
        .order('joined_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching club members:', error);
        throw new Error('Failed to fetch club members');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getClubMembers:', error);
      throw error;
    }
  }

  async getClubPredictions(
    clubId: string, 
    pagination: PaginationQuery
  ): Promise<PaginatedResponse<any>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('predictions')
        .select(`
          *,
          creator:users!predictions_creator_id_fkey(id, username, full_name, avatar_url),
          options:prediction_options(*),
          _count:prediction_entries(count)
        `, { count: 'exact' })
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching club predictions:', error);
        throw new Error('Failed to fetch club predictions');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getClubPredictions:', error);
      throw error;
    }
  }

  async getUserClubs(
    userId: string, 
    pagination: PaginationQuery
  ): Promise<PaginatedResponse<Club>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('club_members')
        .select(`
          role,
          joined_at,
          club:clubs(
            *,
            owner:users!clubs_owner_id_fkey(id, username, full_name, avatar_url)
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching user clubs:', error);
        throw new Error('Failed to fetch user clubs');
      }

      const clubs = data?.map(item => ({
        ...item.club,
        user_role: item.role,
        user_joined_at: item.joined_at,
      })) || [];

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: clubs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getUserClubs:', error);
      throw error;
    }
  }

  // ============================================================================
  // COMMENTS METHODS
  // ============================================================================

  async getPredictionComments(
    predictionId: string, 
    pagination: PaginationQuery
  ): Promise<PaginatedResponse<Comment>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('comments')
        .select(`
          *,
          user:users(id, username, full_name, avatar_url),
          replies:comments!parent_comment_id(
            *,
            user:users(id, username, full_name, avatar_url)
          )
        `, { count: 'exact' })
        .eq('prediction_id', predictionId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching prediction comments:', error);
        throw new Error('Failed to fetch comments');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getPredictionComments:', error);
      throw error;
    }
  }

  async createComment(userId: string, commentData: CreateComment): Promise<Comment> {
    try {
      // Verify prediction exists
      const { data: prediction, error: predictionError } = await this.supabase
        .from('predictions')
        .select('id')
        .eq('id', commentData.prediction_id)
        .single();

      if (predictionError || !prediction) {
        throw new Error('Prediction not found');
      }

      // If replying to a comment, verify parent exists
      if (commentData.parent_comment_id) {
        const { data: parentComment, error: parentError } = await this.supabase
          .from('comments')
          .select('id')
          .eq('id', commentData.parent_comment_id)
          .single();

        if (parentError || !parentComment) {
          throw new Error('Parent comment not found');
        }
      }

      const { data, error } = await this.supabase
        .from('comments')
        .insert({
          ...commentData,
          user_id: userId,
        })
        .select(`
          *,
          user:users(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        logger.error('Error creating comment:', error);
        throw new Error('Failed to create comment');
      }

      return data;
    } catch (error) {
      logger.error('Error in createComment:', error);
      throw error;
    }
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<Comment> {
    try {
      const { data, error } = await this.supabase
        .from('comments')
        .update({
          content,
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select(`
          *,
          user:users(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        logger.error('Error updating comment:', error);
        throw new Error('Failed to update comment');
      }

      return data;
    } catch (error) {
      logger.error('Error in updateComment:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error deleting comment:', error);
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      logger.error('Error in deleteComment:', error);
      throw error;
    }
  }

  // ============================================================================
  // REACTIONS METHODS
  // ============================================================================

  async toggleReaction(userId: string, reactionData: CreateReaction): Promise<Reaction | null> {
    try {
      // Check if reaction already exists
      const { data: existingReaction, error: fetchError } = await this.supabase
        .from('reactions')
        .select('*')
        .eq('prediction_id', reactionData.prediction_id)
        .eq('user_id', userId)
        .eq('type', reactionData.type)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Error checking existing reaction:', fetchError);
        throw new Error('Failed to check existing reaction');
      }

      if (existingReaction) {
        // Remove existing reaction
        const { error: deleteError } = await this.supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (deleteError) {
          logger.error('Error removing reaction:', deleteError);
          throw new Error('Failed to remove reaction');
        }

        return null;
      } else {
        // Add new reaction
        const { data, error } = await this.supabase
          .from('reactions')
          .insert({
            ...reactionData,
            user_id: userId,
          })
          .select('*')
          .single();

        if (error) {
          logger.error('Error creating reaction:', error);
          throw new Error('Failed to create reaction');
        }

        return data;
      }
    } catch (error) {
      logger.error('Error in toggleReaction:', error);
      throw error;
    }
  }

  async getPredictionReactions(predictionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('reactions')
        .select(`
          type,
          user:users(id, username, full_name, avatar_url),
          created_at
        `)
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching prediction reactions:', error);
        throw new Error('Failed to fetch reactions');
      }

      // Group reactions by type
      const reactionGroups = (data || []).reduce((acc, reaction) => {
        if (!acc[reaction.type]) {
          acc[reaction.type] = [];
        }
        acc[reaction.type].push(reaction);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate counts
      const reactionCounts = Object.keys(reactionGroups).reduce((acc, type) => {
        acc[type] = reactionGroups[type].length;
        return acc;
      }, {} as Record<string, number>);

      return {
        reactions: reactionGroups,
        counts: reactionCounts,
        total: data?.length || 0,
      };
    } catch (error) {
      logger.error('Error in getPredictionReactions:', error);
      throw error;
    }
  }

  // ============================================================================
  // USER ACTIVITY METHODS
  // ============================================================================

  async getUserActivity(
    userId: string, 
    pagination: PaginationQuery
  ): Promise<PaginatedResponse<any>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      // Get recent comments and reactions
      const [commentsResult, reactionsResult] = await Promise.all([
        this.supabase
          .from('comments')
          .select(`
            *,
            prediction:predictions(id, title, creator_id)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),

        this.supabase
          .from('reactions')
          .select(`
            *,
            prediction:predictions(id, title, creator_id)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      if (commentsResult.error || reactionsResult.error) {
        logger.error('Error fetching user activity:', {
          commentsError: commentsResult.error,
          reactionsError: reactionsResult.error,
        });
        throw new Error('Failed to fetch user activity');
      }

      // Combine and sort activities
      const activities = [
        ...(commentsResult.data || []).map(comment => ({
          ...comment,
          activity_type: 'comment',
        })),
        ...(reactionsResult.data || []).map(reaction => ({
          ...reaction,
          activity_type: 'reaction',
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply pagination to combined results
      const paginatedActivities = activities.slice(offset, offset + limit);
      const total = activities.length;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: paginatedActivities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getUserActivity:', error);
      throw error;
    }
  }

  // ============================================================================
  // LEADERBOARD METHODS
  // ============================================================================

  async getLeaderboard(options: {
    type: 'global' | 'club';
    period: 'weekly' | 'monthly' | 'all_time';
    clubId?: string;
    pagination: PaginationQuery;
  }): Promise<PaginatedResponse<any>> {
    try {
      const { type, period, clubId, pagination } = options;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      // Calculate date filter based on period
      let dateFilter = '';
      if (period === 'weekly') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (period === 'monthly') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = this.supabase
        .from('users')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          reputation_score,
          prediction_entries!inner(
            amount,
            actual_payout,
            status,
            created_at,
            prediction:predictions!inner(club_id)
          )
        `, { count: 'exact' });

      // Apply date filter if specified
      if (dateFilter) {
        query = query.gte('prediction_entries.created_at', dateFilter);
      }

      // Apply club filter if specified
      if (type === 'club' && clubId) {
        query = query.eq('prediction_entries.prediction.club_id', clubId);
      }

      // Only include users with winning predictions
      query = query.eq('prediction_entries.status', 'won');

      const { data, error, count } = await query
        .order('reputation_score', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching leaderboard:', error);
        throw new Error('Failed to fetch leaderboard');
      }

      // Calculate leaderboard statistics
      const leaderboard = (data || []).map((user, index) => {
        const winningEntries = user.prediction_entries.filter(entry => entry.status === 'won');
        const totalWon = winningEntries.reduce((sum, entry) => sum + (entry.actual_payout || 0), 0);
        const totalStaked = user.prediction_entries.reduce((sum, entry) => sum + entry.amount, 0);
        const winRate = user.prediction_entries.length > 0 
          ? (winningEntries.length / user.prediction_entries.length) * 100 
          : 0;

        return {
          rank: offset + index + 1,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            reputation_score: user.reputation_score,
          },
          stats: {
            total_won: totalWon,
            total_staked: totalStaked,
            net_profit: totalWon - totalStaked,
            win_rate: winRate,
            total_predictions: user.prediction_entries.length,
            winning_predictions: winningEntries.length,
          },
        };
      });

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: leaderboard,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in getLeaderboard:', error);
      throw error;
    }
  }
}
