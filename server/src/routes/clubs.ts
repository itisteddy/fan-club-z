import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticate, optionalAuth } from '../middleware/auth';
import { validationMiddleware, asyncHandler } from '../middleware/error';
import { authenticatedRateLimit } from '../middleware/rate-limit';
import { AuthUtils } from '../utils/auth';
import { ApiUtils } from '../utils/api';
import { db } from '../config/database';
import logger from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const CreateClubSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  category: z.enum(['sports', 'crypto', 'entertainment', 'politics', 'tech', 'custom']),
  visibility: z.enum(['public', 'private']).default('public'),
  image_url: z.string().url().optional(),
});

const UpdateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  category: z.enum(['sports', 'crypto', 'entertainment', 'politics', 'tech', 'custom']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  image_url: z.string().url().optional(),
});

const JoinClubSchema = z.object({
  password: z.string().optional(),
});

const CreateDiscussionSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  is_pinned: z.boolean().default(false),
});

const CreateDiscussionCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_comment_id: z.string().uuid().optional(),
});

// Get all clubs
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      category,
      search,
      visibility = 'public',
      page = 1,
      limit = 20,
    } = req.query as any;

    const offset = (page - 1) * limit;
    let query = db.supabase
      .from('clubs')
      .select(`
        *,
        owner:users!owner_id(username, avatar_url),
        member_count:club_members(count),
        is_member:club_members!inner(user_id)
      `, { count: 'exact' })
      .eq('visibility', visibility);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%, description.ilike.%${search}%`);
    }

    // Check membership status for authenticated users
    if (req.user) {
      query = query.eq('club_members.user_id', req.user.id);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const pagination = ApiUtils.generatePaginationResponse(data, count || 0, page, limit);
    return ApiUtils.success(res, pagination);
  })
);

// Get club by ID
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    let query = db.supabase
      .from('clubs')
      .select(`
        *,
        owner:users!owner_id(username, avatar_url),
        member_count:club_members(count)
      `)
      .eq('id', id)
      .single();

    const { data: club, error } = await query;

    if (error || !club) {
      return ApiUtils.error(res, 'Club not found', 404);
    }

    // Check if user is a member (for authenticated users)
    let isMember = false;
    let memberRole = null;
    
    if (userId) {
      const { data: membership } = await db.supabase
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
      return ApiUtils.error(res, 'Access denied to private club', 403);
    }

    const response = {
      ...club,
      is_member: isMember,
      member_role: memberRole,
    };

    return ApiUtils.success(res, response);
  })
);

// Create new club
router.post(
  '/',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(CreateClubSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const clubData = req.body;

    // Check if user has reached club creation limit (e.g., 5 clubs)
    const { count } = await db.supabase
      .from('clubs')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (count && count >= 5) {
      return ApiUtils.error(res, 'You have reached the maximum number of clubs (5)', 400);
    }

    // Create club
    const { data: club, error } = await db.supabase
      .from('clubs')
      .insert({
        id: AuthUtils.generateSecureId(),
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
    await db.supabase
      .from('club_members')
      .insert({
        club_id: club.id,
        user_id: userId,
        role: 'admin',
        joined_at: new Date().toISOString(),
      });

    logger.info('Club created', { 
      clubId: club.id, 
      ownerId: userId,
      name: club.name 
    });

    return ApiUtils.success(res, club, 'Club created successfully', 201);
  })
);

// Update club
router.put(
  '/:id',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(UpdateClubSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // Get club and check permissions
    const { data: club, error: clubError } = await db.supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single();

    if (clubError || !club) {
      return ApiUtils.error(res, 'Club not found', 404);
    }

    // Check if user is owner or admin
    const { data: membership } = await db.supabase
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', userId)
      .single();

    if (club.owner_id !== userId && (!membership || membership.role !== 'admin')) {
      return ApiUtils.error(res, 'Insufficient permissions to update club', 403);
    }

    // Update club
    const { data: updatedClub, error } = await db.supabase
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

    logger.info('Club updated', { 
      clubId: id, 
      userId,
      updates: Object.keys(updates)
    });

    return ApiUtils.success(res, updatedClub, 'Club updated successfully');
  })
);

// Join club
router.post(
  '/:id/join',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(JoinClubSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: clubId } = req.params;
    const userId = req.user!.id;
    const { password } = req.body;

    // Get club
    const { data: club, error: clubError } = await db.supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      return ApiUtils.error(res, 'Club not found', 404);
    }

    // Check if already a member
    const { data: existingMember } = await db.supabase
      .from('club_members')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return ApiUtils.error(res, 'Already a member of this club', 409);
    }

    // Check access for private clubs
    if (club.visibility === 'private') {
      // For now, private clubs require invitation (password check could be added)
      return ApiUtils.error(res, 'This is a private club. Invitation required.', 403);
    }

    // Add member
    const { error } = await db.supabase
      .from('club_members')
      .insert({
        club_id: clubId,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    logger.info('User joined club', { clubId, userId });

    return ApiUtils.success(res, { message: 'Successfully joined club' });
  })
);

// Leave club
router.post(
  '/:id/leave',
  authenticate,
  authenticatedRateLimit,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: clubId } = req.params;
    const userId = req.user!.id;

    // Check if user is a member
    const { data: membership, error: memberError } = await db.supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return ApiUtils.error(res, 'Not a member of this club', 404);
    }

    // Check if user is the owner
    const { data: club } = await db.supabase
      .from('clubs')
      .select('owner_id')
      .eq('id', clubId)
      .single();

    if (club?.owner_id === userId) {
      return ApiUtils.error(res, 'Club owners cannot leave their own club', 400);
    }

    // Remove membership
    const { error } = await db.supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    logger.info('User left club', { clubId, userId });

    return ApiUtils.success(res, { message: 'Successfully left club' });
  })
);

// Get club members
router.get(
  '/:id/members',
  authenticate, // Members list requires authentication
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: clubId } = req.params;
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    // Check if user is a member or owner
    const { data: membership } = await db.supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    const { data: club } = await db.supabase
      .from('clubs')
      .select('owner_id, visibility')
      .eq('id', clubId)
      .single();

    if (!club) {
      return ApiUtils.error(res, 'Club not found', 404);
    }

    if (club.visibility === 'private' && !membership && club.owner_id !== userId) {
      return ApiUtils.error(res, 'Access denied', 403);
    }

    // Get members
    const { data, error, count } = await db.supabase
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

    const pagination = ApiUtils.generatePaginationResponse(data, count || 0, page, limit);
    return ApiUtils.success(res, pagination);
  })
);

// Get club predictions
router.get(
  '/:id/predictions',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: clubId } = req.params;
    const { page = 1, limit = 10 } = req.query as any;

    const result = await db.predictions.findMany(
      { club_id: clubId, status: 'open' },
      { page, limit }
    );

    return ApiUtils.success(res, result);
  })
);

// Create club discussion
router.post(
  '/:id/discussions',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(CreateDiscussionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: clubId } = req.params;
    const userId = req.user!.id;
    const discussionData = req.body;

    // Check if user is a member
    const { data: membership } = await db.supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return ApiUtils.error(res, 'Must be a club member to create discussions', 403);
    }

    // Create discussion
    const { data: discussion, error } = await db.supabase
      .from('club_discussions')
      .insert({
        id: AuthUtils.generateSecureId(),
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

    return ApiUtils.success(res, discussion, 'Discussion created successfully', 201);
  })
);

// Get club discussions
router.get(
  '/:id/discussions',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: clubId } = req.params;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    const { data, error, count } = await db.supabase
      .from('club_discussions')
      .select(`
        *,
        author:users!user_id(username, avatar_url),
        comment_count:club_discussion_comments(count)
      `, { count: 'exact' })
      .eq('club_id', clubId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const pagination = ApiUtils.generatePaginationResponse(data, count || 0, page, limit);
    return ApiUtils.success(res, pagination);
  })
);

// Add discussion comment
router.post(
  '/:clubId/discussions/:discussionId/comments',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(CreateDiscussionCommentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clubId, discussionId } = req.params;
    const userId = req.user!.id;
    const commentData = req.body;

    // Check if user is a member
    const { data: membership } = await db.supabase
      .from('club_members')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return ApiUtils.error(res, 'Must be a club member to comment', 403);
    }

    // Verify discussion exists
    const { data: discussion } = await db.supabase
      .from('club_discussions')
      .select('id')
      .eq('id', discussionId)
      .eq('club_id', clubId)
      .single();

    if (!discussion) {
      return ApiUtils.error(res, 'Discussion not found', 404);
    }

    // Create comment
    const { data: comment, error } = await db.supabase
      .from('club_discussion_comments')
      .insert({
        id: AuthUtils.generateSecureId(),
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

    return ApiUtils.success(res, comment, 'Comment added successfully', 201);
  })
);

export default router;