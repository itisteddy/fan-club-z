"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const rate_limit_1 = require("../middleware/rate-limit");
const auth_2 = require("../utils/auth");
const api_1 = require("../utils/api");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const CreateClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(1000),
    category: zod_1.z.enum(['sports', 'crypto', 'entertainment', 'politics', 'tech', 'custom']),
    visibility: zod_1.z.enum(['public', 'private']).default('public'),
    image_url: zod_1.z.string().url().optional(),
});
const UpdateClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().min(1).max(1000).optional(),
    category: zod_1.z.enum(['sports', 'crypto', 'entertainment', 'politics', 'tech', 'custom']).optional(),
    visibility: zod_1.z.enum(['public', 'private']).optional(),
    image_url: zod_1.z.string().url().optional(),
});
const JoinClubSchema = zod_1.z.object({
    password: zod_1.z.string().optional(),
});
const CreateDiscussionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    content: zod_1.z.string().min(1).max(5000),
    is_pinned: zod_1.z.boolean().default(false),
});
const CreateDiscussionCommentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(2000),
    parent_comment_id: zod_1.z.string().uuid().optional(),
});
// Get all clubs
router.get('/', auth_1.optionalAuth, (0, error_1.asyncHandler)(async (req, res) => {
    const { category, search, visibility = 'public', page = 1, limit = 20, } = req.query;
    const offset = (page - 1) * limit;
    let query = database_1.supabase
        .from('clubs')
        .select(`
        *,
        owner:users!owner_id(username, avatar_url)
      `, { count: 'exact' })
        .eq('visibility', visibility);
    // Apply filters
    if (category && category !== 'all') {
        query = query.eq('category', category);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%, description.ilike.%${search}%`);
    }
    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        throw error;
    }
    // For each club, check if the user is a member and get member count
    const enrichedData = await Promise.all((data || []).map(async (club) => {
        // Get member count
        const { count: memberCount } = await database_1.supabase
            .from('club_members')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', club.id);
        // Check if user is a member (for authenticated users)
        let isMember = false;
        let memberRole = null;
        if (req.user) {
            const { data: membership } = await database_1.supabase
                .from('club_members')
                .select('role')
                .eq('club_id', club.id)
                .eq('user_id', req.user.id)
                .single();
            if (membership) {
                isMember = true;
                memberRole = membership.role;
            }
        }
        return {
            ...club,
            memberCount: memberCount || 0,
            isMember,
            memberRole,
        };
    }));
    const pagination = api_1.ApiUtils.generatePaginationResponse(enrichedData, count || 0, page, limit);
    return api_1.ApiUtils.success(res, pagination);
}));
// Get club by ID
router.get('/:id', auth_1.optionalAuth, (0, error_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    let query = database_1.supabase
        .from('clubs')
        .select(`
        *,
        owner:users!owner_id(username, avatar_url)
      `)
        .eq('id', id)
        .single();
    const { data: club, error } = await query;
    if (error || !club) {
        return api_1.ApiUtils.error(res, 'Club not found', 404);
    }
    // Get member count
    const { count: memberCount } = await database_1.supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', id);
    // Check if user is a member (for authenticated users)
    let isMember = false;
    let memberRole = null;
    if (userId) {
        const { data: membership } = await database_1.supabase
            .from('club_members')
            .select('role')
            .eq('club_id', id)
            .eq('user_id', userId)
            .single();
        if (membership) {
            isMember = true;
            memberRole = membership.role;
        }
    }
    // Check access permissions for private clubs
    if (club.visibility === 'private' && !isMember && club.owner_id !== userId) {
        return api_1.ApiUtils.error(res, 'Access denied to private club', 403);
    }
    const response = {
        ...club,
        memberCount: memberCount || 0,
        isMember,
        memberRole,
    };
    return api_1.ApiUtils.success(res, response);
}));
// Create new club
router.post('/', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.validationMiddleware)(CreateClubSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const clubData = req.body;
    // Check if user has reached club creation limit (e.g., 5 clubs)
    const { count } = await database_1.supabase
        .from('clubs')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);
    if (count && count >= 5) {
        return api_1.ApiUtils.error(res, 'You have reached the maximum number of clubs (5)', 400);
    }
    // Create club
    const { data: club, error } = await database_1.supabase
        .from('clubs')
        .insert({
        id: auth_2.AuthUtils.generateSecureId(),
        owner_id: userId,
        name: clubData.name,
        description: clubData.description,
        category: clubData.category,
        visibility: clubData.visibility,
        image_url: clubData.image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw error;
    }
    // Add creator as admin member
    await database_1.supabase
        .from('club_members')
        .insert({
        club_id: club.id,
        user_id: userId,
        role: 'admin',
        joined_at: new Date().toISOString(),
    });
    logger_1.default.info('Club created', {
        clubId: club.id,
        ownerId: userId,
        name: club.name
    });
    return api_1.ApiUtils.success(res, club, 'Club created successfully', 201);
}));
// Update club
router.put('/:id', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.validationMiddleware)(UpdateClubSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;
    // Get club and check permissions
    const { data: club, error: clubError } = await database_1.supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single();
    if (clubError || !club) {
        return api_1.ApiUtils.error(res, 'Club not found', 404);
    }
    // Check if user is owner or admin
    const { data: membership } = await database_1.supabase
        .from('club_members')
        .select('role')
        .eq('club_id', id)
        .eq('user_id', userId)
        .single();
    if (club.owner_id !== userId && (!membership || membership.role !== 'admin')) {
        return api_1.ApiUtils.error(res, 'Insufficient permissions to update club', 403);
    }
    // Update club
    const { data: updatedClub, error } = await database_1.supabase
        .from('clubs')
        .update({
        ...updates,
        updated_at: new Date().toISOString(),
    })
        .eq('id', id)
        .select()
        .single();
    if (error) {
        throw error;
    }
    logger_1.default.info('Club updated', {
        clubId: id,
        userId,
        updates: Object.keys(updates)
    });
    return api_1.ApiUtils.success(res, updatedClub, 'Club updated successfully');
}));
// Join club
router.post('/:id/join', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.validationMiddleware)(JoinClubSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const { id: clubId } = req.params;
    const userId = req.user.id;
    const { password } = req.body;
    console.log('Join club endpoint hit:', { clubId, userId });
    // Get club
    const { data: club, error: clubError } = await database_1.supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();
    if (clubError || !club) {
        console.log('Club not found:', { clubId, error: clubError });
        return api_1.ApiUtils.error(res, 'Club not found', 404);
    }
    console.log('Club found:', { club: club.name, visibility: club.visibility });
    // Check if already a member
    const { data: existingMember } = await database_1.supabase
        .from('club_members')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();
    if (existingMember) {
        console.log('User already a member:', { clubId, userId });
        return api_1.ApiUtils.error(res, 'Already a member of this club', 409);
    }
    // Check access for private clubs
    if (club.visibility === 'private') {
        // For now, private clubs require invitation (password check could be added)
        console.log('Private club access denied:', { clubId, userId });
        return api_1.ApiUtils.error(res, 'This is a private club. Invitation required.', 403);
    }
    // Add member
    const { data: newMember, error } = await database_1.supabase
        .from('club_members')
        .insert({
        club_id: clubId,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        console.log('Error adding member:', { error, clubId, userId });
        throw error;
    }
    console.log('User successfully joined club:', { clubId, userId, member: newMember });
    logger_1.default.info('User joined club', { clubId, userId });
    return api_1.ApiUtils.success(res, {
        message: 'Successfully joined club',
        member: newMember
    });
}));
// Leave club
router.post('/:id/leave', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.asyncHandler)(async (req, res) => {
    const { id: clubId } = req.params;
    const userId = req.user.id;
    // Check if user is a member
    const { data: membership, error: memberError } = await database_1.supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();
    if (memberError || !membership) {
        return api_1.ApiUtils.error(res, 'Not a member of this club', 404);
    }
    // Check if user is the owner
    const { data: club } = await database_1.supabase
        .from('clubs')
        .select('owner_id')
        .eq('id', clubId)
        .single();
    if (club?.owner_id === userId) {
        return api_1.ApiUtils.error(res, 'Club owners cannot leave their own club', 400);
    }
    // Remove membership
    const { error } = await database_1.supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);
    if (error) {
        throw error;
    }
    logger_1.default.info('User left club', { clubId, userId });
    return api_1.ApiUtils.success(res, { message: 'Successfully left club' });
}));
// Get club members
router.get('/:id/members', auth_1.authenticateToken, // Members list requires authentication
(0, error_1.asyncHandler)(async (req, res) => {
    const { id: clubId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    // Check if user is a member or owner
    const { data: membership } = await database_1.supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();
    const { data: club } = await database_1.supabase
        .from('clubs')
        .select('owner_id, visibility')
        .eq('id', clubId)
        .single();
    if (!club) {
        return api_1.ApiUtils.error(res, 'Club not found', 404);
    }
    if (club.visibility === 'private' && !membership && club.owner_id !== userId) {
        return api_1.ApiUtils.error(res, 'Access denied', 403);
    }
    // Get members
    const { data, error, count } = await database_1.supabase
        .from('club_members')
        .select(`
        *,
        user:users(id, username, avatar_url, created_at)
      `, { count: 'exact' })
        .eq('club_id', clubId)
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        throw error;
    }
    const pagination = api_1.ApiUtils.generatePaginationResponse(data, count || 0, page, limit);
    return api_1.ApiUtils.success(res, pagination);
}));
// Get club predictions
router.get('/:id/predictions', auth_1.optionalAuth, (0, error_1.asyncHandler)(async (req, res) => {
    const { id: clubId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { data, error, count } = await database_1.supabase
        .from('predictions')
        .select(`
        *,
        creator:users!creator_id(username, avatar_url),
        options:prediction_options(*)
      `, { count: 'exact' })
        .eq('club_id', clubId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        throw error;
    }
    const pagination = api_1.ApiUtils.generatePaginationResponse(data, count || 0, page, limit);
    return api_1.ApiUtils.success(res, pagination);
}));
// Create club discussion
router.post('/:id/discussions', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.validationMiddleware)(CreateDiscussionSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const { id: clubId } = req.params;
    const userId = req.user.id;
    const discussionData = req.body;
    // Check if user is a member
    const { data: membership } = await database_1.supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();
    if (!membership) {
        return api_1.ApiUtils.error(res, 'Must be a club member to create discussions', 403);
    }
    // Create discussion
    const { data: discussion, error } = await database_1.supabase
        .from('club_discussions')
        .insert({
        id: auth_2.AuthUtils.generateSecureId(),
        club_id: clubId,
        user_id: userId,
        title: discussionData.title,
        content: discussionData.content,
        is_pinned: discussionData.is_pinned && (membership.role === 'admin'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw error;
    }
    return api_1.ApiUtils.success(res, discussion, 'Discussion created successfully', 201);
}));
// Get club discussions
router.get('/:id/discussions', auth_1.optionalAuth, (0, error_1.asyncHandler)(async (req, res) => {
    const { id: clubId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { data, error, count } = await database_1.supabase
        .from('club_discussions')
        .select(`
        *,
        author:users!user_id(username, avatar_url)
      `, { count: 'exact' })
        .eq('club_id', clubId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        throw error;
    }
    // Get comment count for each discussion
    const discussionsWithComments = await Promise.all((data || []).map(async (discussion) => {
        const { count: commentCount } = await database_1.supabase
            .from('club_discussion_comments')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', discussion.id);
        return {
            ...discussion,
            commentCount: commentCount || 0,
        };
    }));
    const pagination = api_1.ApiUtils.generatePaginationResponse(discussionsWithComments, count || 0, page, limit);
    return api_1.ApiUtils.success(res, pagination);
}));
// Add discussion comment
router.post('/:clubId/discussions/:discussionId/comments', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.validationMiddleware)(CreateDiscussionCommentSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const { clubId, discussionId } = req.params;
    const userId = req.user.id;
    const commentData = req.body;
    // Check if user is a member
    const { data: membership } = await database_1.supabase
        .from('club_members')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();
    if (!membership) {
        return api_1.ApiUtils.error(res, 'Must be a club member to comment', 403);
    }
    // Verify discussion exists
    const { data: discussion } = await database_1.supabase
        .from('club_discussions')
        .select('id')
        .eq('id', discussionId)
        .eq('club_id', clubId)
        .single();
    if (!discussion) {
        return api_1.ApiUtils.error(res, 'Discussion not found', 404);
    }
    // Create comment
    const { data: comment, error } = await database_1.supabase
        .from('club_discussion_comments')
        .insert({
        id: auth_2.AuthUtils.generateSecureId(),
        discussion_id: discussionId,
        user_id: userId,
        content: commentData.content,
        parent_comment_id: commentData.parent_comment_id,
        created_at: new Date().toISOString(),
    })
        .select(`
        *,
        author:users!user_id(username, avatar_url)
      `)
        .single();
    if (error) {
        throw error;
    }
    return api_1.ApiUtils.success(res, comment, 'Comment added successfully', 201);
}));
// Remove club member (admin only)
router.delete('/:clubId/members/:userId', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.asyncHandler)(async (req, res) => {
    const { clubId, userId } = req.params;
    const requestingUserId = req.user.id;
    // Check if requesting user is owner or admin
    const { data: club } = await database_1.supabase
        .from('clubs')
        .select('owner_id')
        .eq('id', clubId)
        .single();
    if (!club) {
        return api_1.ApiUtils.error(res, 'Club not found', 404);
    }
    const { data: requestingMembership } = await database_1.supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', requestingUserId)
        .single();
    if (club.owner_id !== requestingUserId && (!requestingMembership || requestingMembership.role !== 'admin')) {
        return api_1.ApiUtils.error(res, 'Insufficient permissions', 403);
    }
    // Cannot remove the owner
    if (club.owner_id === userId) {
        return api_1.ApiUtils.error(res, 'Cannot remove club owner', 400);
    }
    // Remove the member
    const { error } = await database_1.supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);
    if (error) {
        throw error;
    }
    logger_1.default.info('Member removed from club', { clubId, userId, removedBy: requestingUserId });
    return api_1.ApiUtils.success(res, { message: 'Member removed successfully' });
}));
// Update member role (admin only)
router.put('/:clubId/members/:userId/role', auth_1.authenticateToken, rate_limit_1.authenticatedRateLimit, (0, error_1.validationMiddleware)(zod_1.z.object({ role: zod_1.z.enum(['member', 'admin']) })), (0, error_1.asyncHandler)(async (req, res) => {
    const { clubId, userId } = req.params;
    const { role } = req.body;
    const requestingUserId = req.user.id;
    // Check if requesting user is owner or admin
    const { data: club } = await database_1.supabase
        .from('clubs')
        .select('owner_id')
        .eq('id', clubId)
        .single();
    if (!club) {
        return api_1.ApiUtils.error(res, 'Club not found', 404);
    }
    const { data: requestingMembership } = await database_1.supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', requestingUserId)
        .single();
    if (club.owner_id !== requestingUserId && (!requestingMembership || requestingMembership.role !== 'admin')) {
        return api_1.ApiUtils.error(res, 'Insufficient permissions', 403);
    }
    // Cannot change role of the owner
    if (club.owner_id === userId) {
        return api_1.ApiUtils.error(res, 'Cannot change owner role', 400);
    }
    // Update the member role
    const { error } = await database_1.supabase
        .from('club_members')
        .update({ role })
        .eq('club_id', clubId)
        .eq('user_id', userId);
    if (error) {
        throw error;
    }
    logger_1.default.info('Member role updated', { clubId, userId, newRole: role, updatedBy: requestingUserId });
    return api_1.ApiUtils.success(res, { message: 'Member role updated successfully' });
}));
exports.default = router;
