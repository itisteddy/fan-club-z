import { Router, Response } from 'express';
import { 
  CreatePredictionSchema,
  UpdatePredictionSchema,
  CreatePredictionEntrySchema,
  PredictionQuerySchema,
  PaginationQuerySchema,
} from '@fanclubz/shared';
import { AuthenticatedRequest, authenticate, optionalAuth } from '../middleware/auth';
import { validationMiddleware, asyncHandler } from '../middleware/error';
import { createPredictionRateLimit, authenticatedRateLimit } from '../middleware/rate-limit';
import { AuthUtils } from '../utils/auth';
import { ApiUtils, calculateOdds, calculatePotentialPayout, isValidDeadline, validateStakeRange } from '../utils/api';
import { db, supabase } from '../config/database';
import logger from '../utils/logger';

const router = Router();

// Get all predictions (with optional auth for personalized results)
router.get(
  '/',
  optionalAuth,
  validationMiddleware(PredictionQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = req.query as any;
    const pagination = { page: filters.page, limit: filters.limit };

    const result = await db.predictions.findMany(filters, pagination);

    return ApiUtils.success(res, result.data, undefined, 200);
  })
);

// Get trending predictions
router.get(
  '/trending',
  optionalAuth,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10 } = req.query as any;
    
    const filters = {
      status: 'open',
      sort: 'pool_total',
      order: 'desc',
    };
    
    const result = await db.predictions.findMany(filters, { page, limit });

    return ApiUtils.success(res, result.data);
  })
);

// Get prediction by ID
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const prediction = await db.predictions.findById(id);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    return ApiUtils.success(res, prediction);
  })
);

// Create new prediction
router.post(
  '/',
  authenticate,
  createPredictionRateLimit,
  validationMiddleware(CreatePredictionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const predictionData = req.body;

    // Validate deadline
    if (!isValidDeadline(predictionData.entry_deadline)) {
      return ApiUtils.error(res, 'Entry deadline must be at least 30 minutes from now', 400);
    }

    // Validate stake range
    if (!validateStakeRange(predictionData.stake_min, predictionData.stake_max)) {
      return ApiUtils.error(res, 'Invalid stake range', 400);
    }

    // Check if club exists (if club_id provided)
    if (predictionData.club_id) {
      try {
        await db.clubs.findById(predictionData.club_id);
      } catch (error) {
        return ApiUtils.error(res, 'Club not found', 404);
      }
    }

    // Hash password if private prediction
    let passwordHash = null;
    if (predictionData.is_private && predictionData.password) {
      passwordHash = await AuthUtils.hashPassword(predictionData.password);
    }

    // Create prediction
    const prediction = await db.predictions.create({
      id: AuthUtils.generateSecureId(),
      creator_id: userId,
      title: predictionData.title,
      description: predictionData.description,
      category: predictionData.category,
      type: predictionData.type,
      status: 'pending', // Will be updated to 'open' after options are created
      stake_min: predictionData.stake_min,
      stake_max: predictionData.stake_max,
      pool_total: 0,
      entry_deadline: predictionData.entry_deadline,
      settlement_method: predictionData.settlement_method,
      is_private: predictionData.is_private || false,
      password_hash: passwordHash,
      creator_fee_percentage: predictionData.creator_fee_percentage || 0,
      platform_fee_percentage: 2.5, // Default platform fee
      club_id: predictionData.club_id || null,
      image_url: predictionData.image_url || null,
      tags: predictionData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create prediction options
    const optionPromises = predictionData.options.map((option: any) => 
      supabase
        .from('prediction_options')
        .insert({
          id: AuthUtils.generateSecureId(),
          prediction_id: prediction.id,
          label: option.label,
          total_staked: 0,
          current_odds: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
    );

    await Promise.all(optionPromises);

    // Update prediction status to 'open'
    await db.predictions.update(prediction.id, { status: 'open' });

    // Fetch the complete prediction with options
    const completePrediction = await db.predictions.findById(prediction.id);

    logger.info('Prediction created', { 
      predictionId: prediction.id, 
      creatorId: userId,
      title: prediction.title 
    });

    return ApiUtils.success(res, completePrediction, 'Prediction created successfully', 201);
  })
);

// Update prediction
router.put(
  '/:id',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(UpdatePredictionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // Get existing prediction
    const prediction = await db.predictions.findById(id);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    // Check if user is the creator
    if (prediction.creator_id !== userId) {
      return ApiUtils.error(res, 'Only the creator can update this prediction', 403);
    }

    // Check if prediction can be updated (only pending or open predictions)
    if (!['pending', 'open'].includes(prediction.status)) {
      return ApiUtils.error(res, 'Cannot update prediction in current status', 400);
    }

    // Validate deadline if being updated
    if (updates.entry_deadline && !isValidDeadline(updates.entry_deadline)) {
      return ApiUtils.error(res, 'Entry deadline must be at least 30 minutes from now', 400);
    }

    // Update prediction
    const updatedPrediction = await db.predictions.update(id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    logger.info('Prediction updated', { 
      predictionId: id, 
      creatorId: userId,
      updates: Object.keys(updates)
    });

    return ApiUtils.success(res, updatedPrediction, 'Prediction updated successfully');
  })
);

// Close prediction early
router.patch(
  '/:id/close',
  authenticate,
  authenticatedRateLimit,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get existing prediction
    const prediction = await db.predictions.findById(id);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    // Check if user is the creator
    if (prediction.creator_id !== userId) {
      return ApiUtils.error(res, 'Only the creator can close this prediction', 403);
    }

    // Check if prediction can be closed (only open predictions)
    if (prediction.status !== 'open') {
      return ApiUtils.error(res, 'Prediction is not open for closing', 400);
    }

    // Update prediction status to closed
    const updatedPrediction = await db.predictions.update(id, {
      status: 'closed',
      updated_at: new Date().toISOString()
    });

    logger.info('Prediction closed early', { 
      predictionId: id, 
      creatorId: userId
    });

    return ApiUtils.success(res, updatedPrediction, 'Prediction closed successfully');
  })
);

// Close prediction endpoint
router.post(
  '/:id/close',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get the prediction
    const prediction = await db.predictions.findById(id);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    // Check if user is the creator
    if (prediction.creator_id !== userId) {
      return ApiUtils.error(res, 'Only the creator can close this prediction', 403);
    }

    // Check if prediction is already closed
    if (prediction.status !== 'open') {
      return ApiUtils.error(res, 'Prediction is already closed', 400);
    }

    // Update prediction status to closed
    const { data: updatedPrediction, error } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ApiUtils.success(res, updatedPrediction, 'Prediction closed successfully');
  })
);

// Delete prediction
router.delete(
  '/:id',
  authenticate,
  authenticatedRateLimit,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get existing prediction
    const prediction = await db.predictions.findById(id);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    // Check if user is the creator
    if (prediction.creator_id !== userId) {
      return ApiUtils.error(res, 'Only the creator can delete this prediction', 403);
    }

    // Check if prediction can be deleted (only pending predictions with no participants)
    if (prediction.status !== 'pending' && prediction.participant_count > 0) {
      return ApiUtils.error(res, 'Cannot delete prediction with participants or after it has started', 400);
    }

    // Check if there are any entries
    const { data: entries } = await supabase
      .from('prediction_entries')
      .select('id')
      .eq('prediction_id', id);

    if (entries && entries.length > 0) {
      return ApiUtils.error(res, 'Cannot delete prediction with existing entries', 400);
    }

    // Delete prediction options first
    await supabase
      .from('prediction_options')
      .delete()
      .eq('prediction_id', id);

    // Delete the prediction
    await supabase
      .from('predictions')
      .delete()
      .eq('id', id);

    logger.info('Prediction deleted', { 
      predictionId: id, 
      creatorId: userId
    });

    return ApiUtils.success(res, null, 'Prediction deleted successfully');
  })
);

// Place prediction entry
router.post(
  '/:id/entries',
  authenticate,
  authenticatedRateLimit,
  validationMiddleware(CreatePredictionEntrySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: predictionId } = req.params;
    const userId = req.user!.id;
    const { option_id, amount } = req.body;

    // Get prediction with options
    const prediction = await db.predictions.findById(predictionId);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    // Check if prediction is open for entries
    if (prediction.status !== 'open') {
      return ApiUtils.error(res, 'Prediction is not open for entries', 400);
    }

    // Check if deadline has passed
    if (new Date(prediction.entry_deadline) <= new Date()) {
      return ApiUtils.error(res, 'Entry deadline has passed', 400);
    }

    // Validate stake amount
    if (amount < prediction.stake_min) {
      return ApiUtils.error(res, `Minimum stake is ${prediction.stake_min}`, 400);
    }

    if (prediction.stake_max && amount > prediction.stake_max) {
      return ApiUtils.error(res, `Maximum stake is ${prediction.stake_max}`, 400);
    }

    // Check if option exists
    const option = prediction.options?.find((opt: any) => opt.id === option_id);
    if (!option) {
      return ApiUtils.error(res, 'Prediction option not found', 404);
    }

    // Check if user already has an entry for this option
    const { data: existingEntry } = await supabase
      .from('prediction_entries')
      .select('id')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .eq('option_id', option_id)
      .single();

    if (existingEntry) {
      return ApiUtils.error(res, 'You already have an entry for this option', 409);
    }

    // Check user's wallet balance (default to USD currency)
    const wallet = await db.wallets.findByUserId(userId, 'USD');
    if (!wallet || wallet.available_balance < amount) {
      return ApiUtils.error(res, 'Insufficient wallet balance', 400);
    }

    // Calculate potential payout
    const currentOdds = calculateOdds(prediction.pool_total + amount, option.total_staked + amount);
    const potentialPayout = calculatePotentialPayout(amount, currentOdds);

    // Create prediction entry
    const entry = await supabase
      .from('prediction_entries')
      .insert({
        id: AuthUtils.generateSecureId(),
        prediction_id: predictionId,
        user_id: userId,
        option_id: option_id,
        amount: amount,
        potential_payout: potentialPayout,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (entry.error) {
      throw entry.error;
    }

    // Update wallet balance (lock funds)
    await db.wallets.updateBalance(userId, 'USD', -amount, amount);

    // Create transaction record
    await db.transactions.create({
      id: AuthUtils.generateSecureId(),
      user_id: userId,
      type: 'prediction_lock',
      currency: 'USD',
      amount: amount, // Use positive amount for transaction record
      status: 'completed',
      description: `Locked funds for prediction: ${prediction.title}`,
      related_prediction_entry_id: entry.data.id,
      created_at: new Date().toISOString(),
    });

    // Update option total staked and odds
    const newTotalStaked = option.total_staked + amount;
    const newPoolTotal = prediction.pool_total + amount;
    const newOdds = calculateOdds(newPoolTotal, newTotalStaked);

    // Update the specific option
    const { error: optionUpdateError } = await supabase
      .from('prediction_options')
      .update({
        total_staked: newTotalStaked,
        current_odds: newOdds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', option_id);

    if (optionUpdateError) {
      throw optionUpdateError;
    }

    // Update prediction pool total and participant count
    const { error: predictionUpdateError } = await supabase
      .from('predictions')
      .update({
        pool_total: newPoolTotal,
        participant_count: prediction.participant_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', predictionId);

    if (predictionUpdateError) {
      throw predictionUpdateError;
    }

    // Recalculate odds for all options based on the new pool total
    const allOptions = prediction.options || [];
    for (const opt of allOptions) {
      if (opt.id !== option_id) {
        const updatedOdds = calculateOdds(newPoolTotal, opt.total_staked);
        await supabase
          .from('prediction_options')
          .update({
            current_odds: updatedOdds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', opt.id);
      }
    }

    // Get the updated prediction with all options
    const updatedPrediction = await db.predictions.findById(predictionId);
    
    logger.info('Prediction entry created', { 
      entryId: entry.data.id,
      predictionId,
      userId,
      amount,
      optionId: option_id
    });

    return ApiUtils.success(res, {
      entry: entry.data,
      prediction: updatedPrediction,
    }, 'Prediction entry created successfully', 201);
  })
);

// Get prediction entries (participants)
router.get(
  '/:id/entries',
  optionalAuth,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: predictionId } = req.params;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    // Get prediction entries with user details
    const { data: entries, error, count } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        user:users!user_id(id, username, full_name, avatar_url),
        option:prediction_options(id, label)
      `, { count: 'exact' })
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const transformedEntries = (entries || []).map((entry: any) => ({
      id: entry.id,
      username: entry.user?.username || entry.user?.full_name || 'Anonymous',
      avatar_url: entry.user?.avatar_url,
      amount: entry.amount,
      option: entry.option?.label || 'Unknown',
      joinedAt: entry.created_at,
      timeAgo: getTimeAgo(entry.created_at)
    }));

    const pagination = ApiUtils.generatePaginationResponse(transformedEntries, count || 0, page, limit);

    return ApiUtils.success(res, pagination);
  })
);

// Get prediction activity (for individual prediction)
router.get(
  '/:id/activity',
  optionalAuth,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: predictionId } = req.params;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    // Get prediction entries for this specific prediction
    const { data: entries, error, count } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        user:users!user_id(username, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const transformedActivity = (entries || []).map((entry: any) => {
      const username = entry.user?.username || entry.user?.full_name || 'Anonymous';
      return {
        id: entry.id,
        type: entry.amount >= 200 ? 'prediction_placed' : 'participant_joined',
        description: entry.amount >= 200 
          ? `${username} placed a large prediction` 
          : `${username} joined the prediction`,
        amount: entry.amount,
        timestamp: entry.created_at,
        timeAgo: getTimeAgo(entry.created_at)
      };
    });

    const pagination = ApiUtils.generatePaginationResponse(transformedActivity, count || 0, page, limit);

    return ApiUtils.success(res, pagination);
  })
);

// Get prediction participants/entries (for individual prediction)
router.get(
  '/:id/entries',
  optionalAuth,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: predictionId } = req.params;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    // Get prediction entries for this specific prediction
    const { data: entries, error, count } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        user:users!user_id(username, full_name, avatar_url),
        option:prediction_options(id, label)
      `, { count: 'exact' })
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const transformedEntries = (entries || []).map((entry: any) => ({
      id: entry.id,
      user_id: entry.user_id,
      username: entry.user?.username || entry.user?.full_name || 'Anonymous',
      avatar_url: entry.user?.avatar_url,
      amount: entry.amount,
      option_id: entry.option_id,
      option_label: entry.option?.label,
      created_at: entry.created_at,
      timeAgo: getTimeAgo(entry.created_at)
    }));

    const pagination = ApiUtils.generatePaginationResponse(transformedEntries, count || 0, page, limit);

    return ApiUtils.success(res, pagination);
  })
);

// Get user's prediction entries
router.get(
  '/entries/me',
  authenticate,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        prediction:predictions(
          id,
          title,
          status,
          entry_deadline,
          creator:users!creator_id(username, avatar_url)
        ),
        option:prediction_options(id, label)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const pagination = ApiUtils.generatePaginationResponse(data, count || 0, page, limit);

    return ApiUtils.success(res, pagination);
  })
);

// Get user's created predictions
router.get(
  '/created/me',
  authenticate,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query as any;

    const result = await db.predictions.findMany(
      { creator_id: userId },
      { page, limit }
    );

    return ApiUtils.success(res, result);
  })
);

// Helper function to calculate time ago
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diffInMs / (1000 * 60));
  const hours = Math.floor(diffInMs / (1000 * 60 * 60));
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
}

export default router;

// Close prediction endpoint
router.post(
  '/:id/close',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get the prediction
    const prediction = await db.predictions.findById(id);
    
    if (!prediction) {
      return ApiUtils.error(res, 'Prediction not found', 404);
    }

    // Check if user is the creator
    if (prediction.creator_id !== userId) {
      return ApiUtils.error(res, 'Only the creator can close this prediction', 403);
    }

    // Check if prediction is already closed
    if (prediction.status !== 'open') {
      return ApiUtils.error(res, 'Prediction is already closed', 400);
    }

    // Update prediction status to closed
    const { data: updatedPrediction, error } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ApiUtils.success(res, updatedPrediction, 'Prediction closed successfully');
  })
);

// Get platform statistics
router.get(
  '/stats/platform',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get total volume from prediction entries
      const { data: volumeData, error: volumeError } = await supabase
        .from('prediction_entries')
        .select('amount')
        .eq('status', 'active');

      if (volumeError) {
        throw volumeError;
      }

      const totalVolume = volumeData?.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) || 0;

      // Get active predictions count
      const { data: activePredictions, error: activeError } = await supabase
        .from('predictions')
        .select('id', { count: 'exact' })
        .eq('status', 'open');

      if (activeError) {
        throw activeError;
      }

      const activeCount = activePredictions?.length || 0;

      // Get total users count
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      if (usersError) {
        throw usersError;
      }

      const totalUsers = users?.length || 0;

      // Format volume for display
      const formatVolume = (amount: number) => {
        if (amount >= 1000000) {
          return `${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
          return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
      };

      const stats = {
        totalVolume: formatVolume(totalVolume),
        activePredictions: activeCount,
        totalUsers: formatVolume(totalUsers),
        rawVolume: totalVolume,
        rawUsers: totalUsers
      };

      return ApiUtils.success(res, stats);
    } catch (error) {
      logger.error('Error fetching platform stats:', error);
      return ApiUtils.error(res, 'Failed to fetch platform statistics', 500);
    }
  })
);
