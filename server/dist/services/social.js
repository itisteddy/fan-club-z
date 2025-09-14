"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class SocialService {
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceRoleKey);
    }
    // ============================================================================
    // CLUBS METHODS
    // ============================================================================
    async getPublicClubs(pagination, filters = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
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
                logger_1.default.error('Error fetching public clubs:', error);
                throw new Error('Failed to fetch clubs');
            }
            const total = count || 0;
            const totalPages = Math.ceil(total / limit);
            return {
                data: data || [],
                pagination: {
                    page: page || 1,
                    limit: limit || 10,
                    total,
                    totalPages,
                    hasNext: (page || 1) < totalPages,
                    hasPrev: (page || 1) > 1,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getPublicClubs:', error);
            throw error;
        }
    }
    async createClub(userId, clubData) {
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
                logger_1.default.error('Error creating club:', error);
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
        }
        catch (error) {
            logger_1.default.error('Error in createClub:', error);
            throw error;
        }
    }
    async getClubById(clubId) {
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
                logger_1.default.error('Error fetching club:', error);
                throw new Error('Failed to fetch club');
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in getClubById:', error);
            throw error;
        }
    }
    async joinClub(userId, clubId) {
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
                logger_1.default.error('Error joining club:', error);
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
        }
        catch (error) {
            logger_1.default.error('Error in joinClub:', error);
            throw error;
        }
    }
    async leaveClub(userId, clubId) {
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
                logger_1.default.error('Error leaving club:', error);
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
        }
        catch (error) {
            logger_1.default.error('Error in leaveClub:', error);
            throw error;
        }
    }
    async getClubMembers(clubId, pagination) {
        try {
            const { page = 1, limit = 20 } = pagination;
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
                logger_1.default.error('Error fetching club members:', error);
                throw new Error('Failed to fetch club members');
            }
            const total = count || 0;
            const totalPages = Math.ceil(total / limit);
            return {
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
        }
        catch (error) {
            logger_1.default.error('Error in getClubMembers:', error);
            throw error;
        }
    }
    async getClubPredictions(clubId, pagination) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;
            const { data, error, count } = await this.supabase
                .from('predictions')
                .select(`
          *,
          creator:users!predictions_creator_id_fkey(id, username, full_name, avatar_url),
          options:prediction_options!prediction_options_prediction_id_fkey(*),
          _count:prediction_entries(count)
        `, { count: 'exact' })
                .eq('club_id', clubId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                logger_1.default.error('Error fetching club predictions:', error);
                throw new Error('Failed to fetch club predictions');
            }
            const total = count || 0;
            const totalPages = Math.ceil(total / limit);
            return {
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
        }
        catch (error) {
            logger_1.default.error('Error in getClubPredictions:', error);
            throw error;
        }
    }
    async getUserClubs(userId, pagination) {
        try {
            const { page = 1, limit = 20 } = pagination;
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
                logger_1.default.error('Error fetching user clubs:', error);
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
                data: [], // Clubs removed for 2.0.77
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getUserClubs:', error);
            throw error;
        }
    }
    // ============================================================================
    // COMMENTS METHODS (ENHANCED WITH WEBSOCKET & MODERATION)
    // ============================================================================
    async getPredictionComments(predictionId, pagination, userId) {
        try {
            const { page = 1, limit = 20 } = pagination;
            logger_1.default.info(`Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);
            // Use the custom function for efficient nested comment retrieval
            const { data, error } = await this.supabase
                .rpc('get_prediction_comments', {
                pred_id: predictionId,
                page_limit: limit,
                page_offset: (page - 1) * limit
            });
            if (error) {
                logger_1.default.error('Error fetching prediction comments with RPC:', error);
                // Fallback to manual query if RPC fails
                return await this.getPredictionCommentsManual(predictionId, pagination, userId);
            }
            // Get total count for pagination
            const { count } = await this.supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('prediction_id', predictionId)
                .is('parent_comment_id', null);
            const total = count || 0;
            const totalPages = Math.ceil(total / limit);
            // Transform data to match expected format
            const transformedData = (data || []).map((comment) => ({
                id: comment.id,
                prediction_id: comment.prediction_id,
                user_id: comment.user_id,
                parent_comment_id: comment.parent_comment_id,
                content: comment.content,
                likes_count: comment.likes_count || 0,
                replies_count: comment.replies_count || 0,
                is_edited: comment.is_edited || false,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                user: {
                    id: comment.user_id,
                    username: comment.username,
                    full_name: comment.full_name,
                    avatar_url: comment.avatar_url,
                    is_verified: comment.is_verified || false,
                },
                is_liked_by_user: comment.is_liked_by_user || false,
                is_owned_by_user: comment.is_owned_by_user || false,
                is_liked: comment.is_liked_by_user || false,
                is_own: comment.is_owned_by_user || false,
                replies: Array.isArray(comment.replies) ? comment.replies : [],
            }));
            logger_1.default.info(`Successfully fetched ${transformedData.length} comments`);
            return {
                data: transformedData,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getPredictionComments:', error);
            throw error;
        }
    }
    // Fallback manual method
    async getPredictionCommentsManual(predictionId, pagination, userId) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;
            // Get top-level comments with user info
            const { data: topLevelComments, error: topError, count } = await this.supabase
                .from('comments')
                .select(`
          *,
          user:users(id, username, full_name, avatar_url, is_verified)
        `, { count: 'exact' })
                .eq('prediction_id', predictionId)
                .is('parent_comment_id', null)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (topError) {
                logger_1.default.error('Error fetching top-level comments:', topError);
                throw new Error('Failed to fetch comments');
            }
            if (!topLevelComments || topLevelComments.length === 0) {
                logger_1.default.info('No comments found for prediction');
                return {
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false,
                    },
                };
            }
            // Get replies for all top-level comments
            const commentIds = topLevelComments.map(c => c.id);
            const { data: replies, error: repliesError } = await this.supabase
                .from('comments')
                .select(`
          *,
          user:users(id, username, full_name, avatar_url, is_verified)
        `)
                .in('parent_comment_id', commentIds)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });
            if (repliesError) {
                logger_1.default.error('Error fetching replies:', repliesError);
            }
            // Get like status for current user if provided
            let userLikes = [];
            if (userId) {
                const { data: likes, error: likesError } = await this.supabase
                    .from('comment_likes')
                    .select('comment_id')
                    .eq('user_id', userId)
                    .in('comment_id', [
                    ...commentIds,
                    ...(replies || []).map(r => r.id)
                ]);
                if (!likesError && likes) {
                    userLikes = likes;
                }
            }
            const likedCommentIds = new Set(userLikes.map(l => l.comment_id));
            // Combine comments with replies
            const commentsWithReplies = topLevelComments.map(comment => {
                const commentReplies = (replies || [])
                    .filter(reply => reply.parent_comment_id === comment.id)
                    .map(reply => ({
                    ...reply,
                    is_liked_by_user: likedCommentIds.has(reply.id),
                    is_owned_by_user: reply.user_id === userId,
                    is_liked: likedCommentIds.has(reply.id),
                    is_own: reply.user_id === userId,
                }));
                return {
                    ...comment,
                    is_liked_by_user: likedCommentIds.has(comment.id),
                    is_owned_by_user: comment.user_id === userId,
                    is_liked: likedCommentIds.has(comment.id),
                    is_own: comment.user_id === userId,
                    replies: commentReplies,
                };
            });
            const total = count || 0;
            const totalPages = Math.ceil(total / limit);
            logger_1.default.info(`Successfully fetched ${commentsWithReplies.length} comments with manual method`);
            return {
                data: commentsWithReplies,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getPredictionCommentsManual:', error);
            throw error;
        }
    }
    async createComment(userId, commentData) {
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
                    .eq('is_deleted', false)
                    .single();
                if (parentError || !parentComment) {
                    throw new Error('Parent comment not found');
                }
            }
            // Insert the comment
            const { data, error } = await this.supabase
                .from('comments')
                .insert({
                prediction_id: commentData.prediction_id,
                user_id: userId,
                parent_comment_id: commentData.parent_comment_id || null,
                content: commentData.content.trim(),
            })
                .select(`
          *,
          user:users(id, username, full_name, avatar_url, is_verified)
        `)
                .single();
            if (error) {
                logger_1.default.error('Error creating comment:', error);
                throw new Error('Failed to create comment');
            }
            const enhancedComment = {
                ...data,
                is_liked_by_user: false,
                is_owned_by_user: true,
                is_liked: false,
                is_own: true,
                replies: [],
            };
            logger_1.default.info(`Comment created successfully: ${data.id}`);
            // TODO: Send WebSocket notification to prediction subscribers
            // await this.sendCommentNotification(commentData.prediction_id, enhancedComment);
            return enhancedComment;
        }
        catch (error) {
            logger_1.default.error('Error in createComment:', error);
            throw error;
        }
    }
    async updateComment(commentId, userId, content) {
        try {
            const { data, error } = await this.supabase
                .from('comments')
                .update({
                content: content.trim(),
                is_edited: true,
                updated_at: new Date().toISOString(),
            })
                .eq('id', commentId)
                .eq('user_id', userId)
                .eq('is_deleted', false)
                .select(`
          *,
          user:users(id, username, full_name, avatar_url, is_verified)
        `)
                .single();
            if (error) {
                logger_1.default.error('Error updating comment:', error);
                throw new Error('Failed to update comment');
            }
            const enhancedComment = {
                ...data,
                is_liked_by_user: false, // TODO: Check actual like status
                is_owned_by_user: true,
                is_liked: false,
                is_own: true,
                replies: [],
            };
            logger_1.default.info(`Comment updated successfully: ${commentId}`);
            return enhancedComment;
        }
        catch (error) {
            logger_1.default.error('Error in updateComment:', error);
            throw error;
        }
    }
    async deleteComment(commentId, userId) {
        try {
            // Soft delete by marking as deleted instead of removing
            const { error } = await this.supabase
                .from('comments')
                .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                content: '[deleted]', // Replace content for privacy
            })
                .eq('id', commentId)
                .eq('user_id', userId);
            if (error) {
                logger_1.default.error('Error deleting comment:', error);
                throw new Error('Failed to delete comment');
            }
            logger_1.default.info(`Comment soft deleted successfully: ${commentId}`);
        }
        catch (error) {
            logger_1.default.error('Error in deleteComment:', error);
            throw error;
        }
    }
    async toggleCommentLike(userId, commentId) {
        try {
            // Check if like already exists
            const { data: existingLike, error: fetchError } = await this.supabase
                .from('comment_likes')
                .select('*')
                .eq('comment_id', commentId)
                .eq('user_id', userId)
                .single();
            if (fetchError && fetchError.code !== 'PGRST116') {
                logger_1.default.error('Error checking existing comment like:', fetchError);
                throw new Error('Failed to check existing like');
            }
            if (existingLike) {
                // Remove existing like
                const { error: deleteError } = await this.supabase
                    .from('comment_likes')
                    .delete()
                    .eq('id', existingLike.id);
                if (deleteError) {
                    logger_1.default.error('Error removing comment like:', deleteError);
                    throw new Error('Failed to remove like');
                }
                logger_1.default.info(`Comment like removed: ${commentId} by ${userId}`);
            }
            else {
                // Add new like
                const { error: insertError } = await this.supabase
                    .from('comment_likes')
                    .insert({
                    comment_id: commentId,
                    user_id: userId,
                    type: 'like',
                });
                if (insertError) {
                    logger_1.default.error('Error creating comment like:', insertError);
                    throw new Error('Failed to create like');
                }
                logger_1.default.info(`Comment like added: ${commentId} by ${userId}`);
            }
        }
        catch (error) {
            logger_1.default.error('Error in toggleCommentLike:', error);
            throw error;
        }
    }
    // New method for comment moderation
    async reportComment(commentId, reporterId, reason, description) {
        try {
            const { error } = await this.supabase
                .from('comment_reports')
                .insert({
                comment_id: commentId,
                reporter_id: reporterId,
                reason,
                description,
            });
            if (error) {
                logger_1.default.error('Error reporting comment:', error);
                throw new Error('Failed to report comment');
            }
            logger_1.default.info(`Comment reported: ${commentId} by ${reporterId} for ${reason}`);
        }
        catch (error) {
            logger_1.default.error('Error in reportComment:', error);
            throw error;
        }
    }
    // ============================================================================
    // REACTIONS METHODS
    // ============================================================================
    async toggleReaction(userId, reactionData) {
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
                logger_1.default.error('Error checking existing reaction:', fetchError);
                throw new Error('Failed to check existing reaction');
            }
            if (existingReaction) {
                // Remove existing reaction
                const { error: deleteError } = await this.supabase
                    .from('reactions')
                    .delete()
                    .eq('id', existingReaction.id);
                if (deleteError) {
                    logger_1.default.error('Error removing reaction:', deleteError);
                    throw new Error('Failed to remove reaction');
                }
                return null;
            }
            else {
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
                    logger_1.default.error('Error creating reaction:', error);
                    throw new Error('Failed to create reaction');
                }
                return data;
            }
        }
        catch (error) {
            logger_1.default.error('Error in toggleReaction:', error);
            throw error;
        }
    }
    async getPredictionReactions(predictionId) {
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
                logger_1.default.error('Error fetching prediction reactions:', error);
                throw new Error('Failed to fetch reactions');
            }
            // Group reactions by type
            const reactionGroups = (data || []).reduce((acc, reaction) => {
                if (!acc[reaction.type]) {
                    acc[reaction.type] = [];
                }
                acc[reaction.type]?.push(reaction);
                return acc;
            }, {});
            // Calculate counts
            const reactionCounts = Object.keys(reactionGroups).reduce((acc, type) => {
                acc[type] = reactionGroups[type]?.length || 0;
                return acc;
            }, {});
            return {
                reactions: reactionGroups,
                counts: reactionCounts,
                total: data?.length || 0,
            };
        }
        catch (error) {
            logger_1.default.error('Error in getPredictionReactions:', error);
            throw error;
        }
    }
    // ============================================================================
    // USER ACTIVITY METHODS
    // ============================================================================
    async getUserActivity(userId, pagination) {
        try {
            const { page = 1, limit = 20 } = pagination;
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
                    .eq('is_deleted', false)
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
                logger_1.default.error('Error fetching user activity:', {
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
        }
        catch (error) {
            logger_1.default.error('Error in getUserActivity:', error);
            throw error;
        }
    }
    // ============================================================================
    // LEADERBOARD METHODS
    // ============================================================================
    async getLeaderboard(options) {
        try {
            const { type, period, clubId, pagination } = options;
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;
            // Calculate date filter based on period
            let dateFilter = '';
            if (period === 'weekly') {
                dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            }
            else if (period === 'monthly') {
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
                logger_1.default.error('Error fetching leaderboard:', error);
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
        }
        catch (error) {
            logger_1.default.error('Error in getLeaderboard:', error);
            throw error;
        }
    }
}
exports.SocialService = SocialService;
