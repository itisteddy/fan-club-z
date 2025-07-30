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
import { db } from '../config/database';
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
      db.supabase
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
    const updatedPrediction = await db.predictions.update(id, updates);

    logger.info('Prediction updated', { 
      predictionId: id, 
      creatorId: userId,
      updates: Object.keys(updates)
    });

    return ApiUtils.success(res, updatedPrediction, 'Prediction updated successfully');
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
    const { data: existingEntry } = await db.supabase
      .from('prediction_entries')
      .select('id')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .eq('option_id', option_id)
      .single();

    if (existingEntry) {
      return ApiUtils.error(res, 'You already have an entry for this option', 409);
    }

    // Check user's wallet balance
    const wallet = await db.wallets.findByUserId(userId);
    if (!wallet || wallet.available_balance < amount) {
      return ApiUtils.error(res, 'Insufficient wallet balance', 400);
    }

    // Calculate potential payout
    const currentOdds = calculateOdds(prediction.pool_total + amount, option.total_staked + amount);
    const potentialPayout = calculatePotentialPayout(amount, currentOdds);

    // Create prediction entry
    const entry = await db.supabase
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
    await db.wallets.updateBalance(userId, 'NGN', -amount, amount);

    // Create transaction record
    await db.transactions.create({
      id: AuthUtils.generateSecureId(),
      user_id: userId,
      type: 'prediction_lock',
      currency: 'NGN',
      amount: -amount,
      status: 'completed',
      description: `Locked funds for prediction: ${prediction.title}`,
      related_prediction_entry_id: entry.data.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Update option total staked and odds
    const newTotalStaked = option.total_staked + amount;
    const newOdds = calculateOdds(prediction.pool_total + amount, newTotalStaked);

    await db.supabase
      .from('prediction_options')
      .update({
        total_staked: newTotalStaked,
        current_odds: newOdds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', option_id);

    // Update prediction pool total
    await db.predictions.update(predictionId, {
      pool_total: prediction.pool_total + amount,
    });

    // Recalculate odds for all options
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

// Get user's prediction entries
router.get(
  '/entries/me',
  authenticate,
  validationMiddleware(PaginationQuerySchema, 'query'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query as any;
    const offset = (page - 1) * limit;

    const { data, error, count } = await db.supabase
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

export default router;
