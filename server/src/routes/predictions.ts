import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from '../config';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { enrichPredictionWithOddsV2 } from '../utils/enrichPredictionOddsV2';
import { recomputePredictionState } from '../services/predictionMath';
import { emitPredictionUpdate } from '../services/realtime';
import { logAdminAction } from './admin/audit';
import { insertWalletTransaction } from '../db/walletTransactions';
import { createNotification } from '../services/notifications';
import { getSettlementResult } from '../services/settlementResults';
import { assertContentAllowed } from '../services/contentFilter';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import { requireTermsAccepted } from '../middleware/requireTermsAccepted';
import { isCryptoAllowedForClient } from '../middleware/requireCryptoEnabled';
import type { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to enrich prediction with category info (backward compatible)
 * Returns category as both object and string for compatibility
 */
async function enrichPredictionWithCategory(prediction: any): Promise<any> {
  if (!prediction) return prediction;

  // If category_id exists, fetch category info
  if (prediction.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, slug, label, icon')
      .eq('id', prediction.category_id)
      .eq('is_enabled', true)
      .maybeSingle();

    if (category) {
      return {
        ...prediction,
        category: category.slug, // Keep backward compatibility
        categoryObj: {
          id: category.id,
          slug: category.slug,
          label: category.label,
          icon: category.icon,
        },
        categoryId: category.id,
        categoryLabel: category.label,
      };
    }
  }

  // Fallback: if category is a string (legacy), keep it as-is
  if (prediction.category && typeof prediction.category === 'string') {
    return {
      ...prediction,
      category: prediction.category,
      categoryObj: null,
      categoryId: null,
      categoryLabel: prediction.category,
    };
  }

  return prediction;
}

/**
 * Helper to enrich multiple predictions with category info
 */
async function enrichPredictionsWithCategory(predictions: any[]): Promise<any[]> {
  if (!Array.isArray(predictions) || predictions.length === 0) return predictions;

  // Batch fetch all category_ids
  const categoryIds = predictions
    .map((p) => p.category_id)
    .filter((id): id is string => Boolean(id));

  if (categoryIds.length === 0) {
    // No category_ids, return as-is with backward compatibility
    return predictions.map((p) => ({
      ...p,
      category: p.category || 'custom',
      categoryObj: null,
      categoryId: null,
      categoryLabel: p.category || 'Custom',
    }));
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, label, icon')
    .in('id', categoryIds)
    .eq('is_enabled', true);

  const categoryMap = new Map(
    (categories || []).map((cat) => [cat.id, cat])
  );

  return predictions.map((pred) => {
    if (pred.category_id && categoryMap.has(pred.category_id)) {
      const cat = categoryMap.get(pred.category_id)!;
      return {
        ...pred,
        category: cat.slug, // Backward compatibility
        categoryObj: {
          id: cat.id,
          slug: cat.slug,
          label: cat.label,
          icon: cat.icon,
        },
        categoryId: cat.id,
        categoryLabel: cat.label,
      };
    }

    // Fallback for legacy predictions
    return {
      ...pred,
      category: pred.category || 'custom',
      categoryObj: null,
      categoryId: null,
      categoryLabel: pred.category || 'Custom',
    };
  });
}

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

// [PERF] Helper to check conditional GET and return 304 if ETag matches
function checkETag(req: express.Request, res: express.Response, data: unknown): boolean {
  const etag = generateETag(data);
  const ifNoneMatch = req.headers['if-none-match'];
  
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304).end();
    return true;
  }
  
  // [PERF] Set caching headers
  res.setHeader('Cache-Control', 'private, max-age=15');
  res.setHeader('ETag', etag);
  return false;
}

const router = express.Router();

async function resolveAuthenticatedUserId(req: express.Request): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

// Local slugify helper (must match client)
function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET /api/v2/predictions/stats/platform - Get platform-wide statistics
router.get('/stats/platform', async (req, res) => {
  try {
    console.log('📊 Platform stats endpoint called');

    // Get count of active (open) predictions with future deadlines
    const { count: activePredictions, error: countError } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    if (countError) {
      console.error('Error counting active predictions:', countError);
    }

    // Get total volume from active predictions
    const { data: volumeData, error: volumeError } = await supabase
      .from('predictions')
      .select('pool_total')
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    const totalVolume = volumeData?.reduce((sum, p) => sum + (parseFloat(p.pool_total) || 0), 0) || 0;

    if (volumeError) {
      console.error('Error calculating total volume:', volumeError);
    }

    // Get unique user count from prediction entries
    const { data: userData, error: userError } = await supabase
      .from('prediction_entries')
      .select('user_id')
      .eq('status', 'active');

    const uniqueUsers = new Set(userData?.map(entry => entry.user_id) || []).size;

    if (userError) {
      console.error('Error counting unique users:', userError);
    }

    const stats = {
      totalVolume: totalVolume.toFixed(2),
      activePredictions: activePredictions || 0,
      totalUsers: uniqueUsers.toString(),
      rawVolume: totalVolume,
      rawUsers: uniqueUsers
    };

    console.log('✅ Platform stats calculated:', stats);

    return res.json({
      success: true,
      data: stats,
      message: 'Platform stats fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch platform stats',
      version: VERSION
    });
  }
});

// Lightweight resolver: GET /api/v2/predictions/resolve/slug/:slug
// Returns { id } for a given SEO slug, without exposing the full prediction body
router.get('/resolve/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params as { slug: string };
    const candidate = (slug || '').trim().toLowerCase();

    // If a UUID is accidentally passed, return it directly if it exists
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(candidate)) {
      const { data: row, error } = await supabase
        .from('predictions')
        .select('id')
        .eq('id', candidate)
        .maybeSingle();
      if (error || !row) {
        return res.status(404).json({ error: 'not_found', message: 'Prediction not found', version: VERSION });
      }
      return res.json({ id: candidate, version: VERSION });
    }

    // Safety: if someone shares "<slug>-<uuid>" older format, extract the UUID if present
    const maybeUuid = candidate.slice(-36);
    if (uuidRegex.test(maybeUuid)) {
      const { data: row, error } = await supabase
        .from('predictions')
        .select('id')
        .eq('id', maybeUuid)
        .maybeSingle();
      if (row && !error) {
        return res.json({ id: maybeUuid, version: VERSION });
      }
    }

    // Fallback: scan recent predictions and match by computed slug.
    // Note: For our dataset size this is fine. If this grows large, add a persisted slug column or an index.
    const { data: preds, error } = await supabase
      .from('predictions')
      .select('id,title,created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[predictions.resolve.slug] DB error:', error);
      return res.status(500).json({ error: 'db_error', message: 'Failed to resolve slug', version: VERSION });
    }

    const matched = (preds || []).find(p => slugify(p.title) === candidate);
    if (!matched) {
      return res.status(404).json({ error: 'not_found', message: 'Prediction not found for slug', version: VERSION });
    }

    return res.json({ id: matched.id, version: VERSION });
  } catch (err) {
    console.error('[predictions.resolve.slug] Unhandled', err);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to resolve slug', version: VERSION });
  }
});

// GET /api/v2/predictions - Get all predictions with pagination
router.get('/', async (req, res) => {
  try {
    console.log('📡 Predictions endpoint called - origin:', req.headers.origin);
    console.log('🔧 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    });

    // Auto-close expired predictions before returning fresh list
    const nowIso = new Date().toISOString();
    const { error: closeError } = await supabase
      .from('predictions')
      .update({ status: 'closed', updated_at: nowIso })
      .lte('entry_deadline', nowIso)
      .eq('status', 'open');

    if (closeError && closeError.code !== 'PGRST116') {
      console.warn('[predictions] Failed to auto-close expired predictions:', closeError);
    }
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per request
    const offset = (page - 1) * limit;
    
    // Parse filter parameters
    const category = req.query.category as string;
    const search = req.query.search as string;
    
    console.log(`📊 Pagination: page=${page}, limit=${limit}, offset=${offset}`);
    console.log(`🔍 Filters: category=${category}, search=${search}`);
    
    // Resolve user once for blocklist filtering + settlement results
    const userId = await resolveAuthenticatedUserId(req);

    // Build query with filters - only show active, open predictions
    let query = supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `, { count: 'exact' })
      .eq('status', 'open') // Only show open predictions
      .gt('entry_deadline', new Date().toISOString()) // Only show predictions with future deadlines
      .order('created_at', { ascending: false });
    
    // Apply category filter (support both categoryId and legacy category slug)
    if (category && category !== 'all') {
      // Try to resolve categoryId from slug if it looks like a UUID, use as-is
      // Otherwise, treat as legacy category slug
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(category)) {
        query = query.eq('category_id', category);
      } else {
        // Legacy: filter by category string OR by category_id via slug lookup
        const { data: catBySlug } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .eq('is_enabled', true)
          .maybeSingle();
        
        if (catBySlug) {
          query = query.eq('category_id', catBySlug.id);
        } else {
          // Fallback to legacy category string match
          query = query.eq('category', category);
        }
      }
    }
    
    // Apply search filter
    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Exclude blocked users' predictions (UGC block list) — defensive: if user_blocks table doesn't exist, skip silently
    if (userId) {
      try {
        const { data: blocked, error: blockedErr } = await supabase
          .from('user_blocks')
          .select('blocked_user_id')
          .eq('blocker_id', userId);
        if (!blockedErr) {
          const blockedIds = (blocked || []).map((b: any) => b.blocked_user_id).filter(Boolean);
          if (blockedIds.length > 0) {
            const blockedList = blockedIds.map((id: string) => `'${id}'`).join(',');
            query = query.not('creator_id', 'in', `(${blockedList})`);
          }
        }
      } catch {
        // user_blocks table may not exist yet — skip block filtering
      }
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: predictions, error, count } = await query;

    if (error) {
      console.error('Error fetching predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch predictions',
        version: VERSION,
        details: error.message
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(`✅ Successfully fetched ${predictions?.length || 0} predictions (${count} total)`);

    // Enrich predictions with category info
    const enrichedPredictions = await enrichPredictionsWithCategory(predictions || []);

    // Phase 6A: Add canonical settlement fields if user is authenticated (batch fetch)
    if (userId && enrichedPredictions.length > 0) {
      try {
        // Batch fetch settlement results for all predictions
        const predictionIds = enrichedPredictions.map((p: any) => p.id);
        const { data: allResults } = await supabase
          .from('prediction_settlement_results')
          .select('*')
          .eq('user_id', userId)
          .in('prediction_id', predictionIds);

        const resultsByPrediction = new Map<string, any>();
        (allResults || []).forEach((r: any) => {
          const predId = r.prediction_id;
          // Prefer demo over crypto if both exist
          const existing = resultsByPrediction.get(predId);
          if (!existing || r.provider === 'demo-wallet') {
            resultsByPrediction.set(predId, {
              myStakeTotal: Number(r.stake_total || 0),
              myReturnedTotal: Number(r.returned_total || 0),
              myNet: Number(r.net || 0),
              myStatus: r.status,
              myClaimStatus: r.claim_status,
            });
          }
        });

        // Attach canonical fields to each prediction
        enrichedPredictions.forEach((pred: any) => {
          const result = resultsByPrediction.get(pred.id);
          if (result) {
            Object.assign(pred, result);
          }
        });
      } catch (err) {
        console.error('[predictions] Failed to batch fetch settlement results:', err);
        // Non-fatal: continue without canonical fields
      }
    }

    // [PERF] Prepare response and check ETag for conditional GET
    const response = {
      data: enrichedPredictions,
      message: 'Predictions fetched successfully',
      version: VERSION,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext,
        hasPrev,
        currentCount: enrichedPredictions.length
      }
    };
    
    // [PERF] Check ETag - returns true if 304 was sent
    if (checkETag(req, res, response)) return;
    
    return res.json(response);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch predictions',
      version: VERSION,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// HEAD /api/v2/predictions/:id - Lightweight existence check for UI preflight
router.head('/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { data, error } = await supabase
      .from('predictions')
      .select('id,status')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      return res.status(404).end();
    }
    return res.status(200).end();
  } catch {
    return res.status(500).end();
  }
});

// GET /api/v2/predictions/stats/platform - Get platform statistics
router.get('/stats/platform', async (req, res) => {
  try {
    console.log('📊 Platform stats endpoint called - origin:', req.headers.origin);
    
    // Get total volume from active predictions only (status='open' AND entry_deadline hasn't passed)
    const { data: volumeData, error: volumeError } = await supabase
      .from('predictions')
      .select('pool_total')
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    if (volumeError) {
      console.error('Error fetching volume data:', volumeError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch volume data',
        version: VERSION
      });
    }

    // Get active predictions count (status='open' AND entry_deadline hasn't passed)
    const { count: activeCount, error: countError } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    if (countError) {
      console.error('Error fetching active predictions count:', countError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch active predictions count',
        version: VERSION
      });
    }

    // Get total users count
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('Error fetching user count:', userError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user count',
        version: VERSION
      });
    }

    // Calculate total volume
    const totalVolume = volumeData?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 0;

    const stats = {
      totalVolume: totalVolume.toFixed(2),
      activePredictions: activeCount || 0,
      totalUsers: userCount || 0,
      rawVolume: totalVolume,
      rawUsers: userCount || 0
    };

    console.log('✅ Platform stats calculated:', stats);

    return res.json({
      success: true,
      data: stats,
      message: 'Platform stats fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch platform statistics',
      version: VERSION
    });
  }
});

// GET /api/v2/predictions/trending - Get trending predictions
router.get('/trending', async (req, res) => {
  try {
    console.log('🔥 Trending predictions endpoint called - origin:', req.headers.origin);
    
    // For now, return the same as regular predictions but ordered by activity
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('status', 'open')
      .order('participant_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching trending predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch trending predictions',
        version: VERSION,
        details: error.message
      });
    }

    console.log(`✅ Successfully fetched ${predictions?.length || 0} trending predictions`);

    // Enrich with category info
    const enrichedPredictions = await enrichPredictionsWithCategory(predictions || []);

    return res.json({
      data: enrichedPredictions,
      message: 'Trending predictions endpoint - working',
      version: VERSION
    });
  } catch (error) {
    console.error('Error in trending predictions endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch trending predictions',
      version: VERSION
    });
  }
});

// Statuses that count as "completed" (not active) for the Completed tab
const COMPLETED_STATUSES = ['closed', 'awaiting_settlement', 'settled', 'disputed', 'cancelled', 'refunded', 'ended'] as const;

// GET /api/v2/predictions/completed/:userId - Completed predictions for user (creator OR participant)
router.get('/completed/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    console.log(`📊 Completed predictions endpoint for user: ${userId}`);

    // 1) Creator-owned completed predictions
    const { data: creatorPredictions, error: creatorError } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('creator_id', userId)
      .in('status', [...COMPLETED_STATUSES])
      .order('settled_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(100);

    if (creatorError) {
      console.error('Error fetching creator completed predictions:', creatorError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch completed predictions',
        version: VERSION,
        details: creatorError.message,
      });
    }

    // 2) Participant completed: prediction IDs from entries
    const { data: entries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('prediction_id')
      .eq('user_id', userId);

    if (entriesError) {
      console.error('Error fetching user entries for completed:', entriesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch completed predictions',
        version: VERSION,
        details: entriesError.message,
      });
    }

    const participantPredictionIds = [...new Set((entries || []).map((e: any) => e.prediction_id))];
    let participantPredictions: any[] = [];
    if (participantPredictionIds.length > 0) {
      const { data: partPreds, error: partError } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
          options:prediction_options!prediction_options_prediction_id_fkey(*)
        `)
        .in('id', participantPredictionIds)
        .in('status', [...COMPLETED_STATUSES]);

      if (!partError) participantPredictions = partPreds || [];
    }

    // 3) Merge by id, no duplicates, stable order: settled_at desc nulls last, then updated_at desc
    const byId = new Map<string, any>();
    for (const p of creatorPredictions || []) byId.set(p.id, p);
    for (const p of participantPredictions) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    const merged = Array.from(byId.values()).sort((a, b) => {
      const aTime = a.settled_at ? new Date(a.settled_at).getTime() : 0;
      const bTime = b.settled_at ? new Date(b.settled_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }).slice(0, 50);

    // 4) Batch fetch user's entries for these predictions
    const predictionIds = merged.map((p: any) => p.id);
    const { data: userEntries } = await supabase
      .from('prediction_entries')
      .select(`
        id, prediction_id, option_id, amount, actual_payout, status, provider,
        option:prediction_options(id, label)
      `)
      .eq('user_id', userId)
      .in('prediction_id', predictionIds);

    const entryByPredictionId = new Map<string, any>();
    for (const e of userEntries || []) {
      entryByPredictionId.set(e.prediction_id, e);
    }

    const withMyEntry = merged.map((p: any) => ({
      ...p,
      myEntry: entryByPredictionId.get(p.id) || undefined,
    }));

    const enrichedPredictions = await enrichPredictionsWithCategory(withMyEntry);

    return res.json({
      data: enrichedPredictions,
      message: `Completed predictions for user ${userId}`,
      version: VERSION,
    });
  } catch (error) {
    console.error('Error fetching completed predictions:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch completed predictions',
      version: VERSION,
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

// GET /api/v2/predictions/:id - Get specific prediction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Specific prediction endpoint called for ID: ${id} - origin:`, req.headers.origin);
    
    const { data: prediction, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching prediction ${id}:`, error);
      return res.status(404).json({
        error: 'Not found',
      message: `Prediction ${id} not found`,
        version: VERSION,
        details: error.message
      });
    }
    // If the hidden_at column exists and is set, treat as not found (moderation)
    if (prediction && typeof (prediction as any).hidden_at !== 'undefined' && (prediction as any).hidden_at) {
      return res.status(404).json({
        error: 'Not found',
        message: `Prediction ${id} not found`,
        version: VERSION,
      });
    }

    // Count entries for client (needed for edit UI)
    const { count: entriesCount } = await supabase
      .from('prediction_entries')
      .select('id', { count: 'exact', head: true })
      .eq('prediction_id', id);

    // Enrich with category info
    let enrichedPrediction = await enrichPredictionWithCategory(prediction);
    // Odds V2: add pools (cents), fee bps, reference odds
    enrichedPrediction = enrichPredictionWithOddsV2(enrichedPrediction);

    // Phase 6A: Add canonical settlement fields if user is authenticated
    let canonicalFields: any = {};
    const userId = await resolveAuthenticatedUserId(req);
    if (userId) {
      try {
        // Try demo first, then crypto
        const demoResult = await getSettlementResult(id, userId, 'demo-wallet');
        const cryptoResult = await getSettlementResult(id, userId, 'crypto-base-usdc');
        
        // Prefer demo if exists, otherwise use crypto
        const result = demoResult || cryptoResult;
        if (result) {
          canonicalFields = {
            myStakeTotal: result.stakeTotal,
            myReturnedTotal: result.returnedTotal,
            myNet: result.net,
            myStatus: result.status,
            myClaimStatus: result.claimStatus,
          };
        }
      } catch (err) {
        console.error('[predictions] Failed to fetch settlement result:', err);
        // Non-fatal: continue without canonical fields
      }
    }

    return res.json({
      data: {
        ...enrichedPrediction,
        entriesCount: entriesCount || 0,
        hasEntries: (entriesCount || 0) > 0,
        ...canonicalFields,
      },
      message: 'Prediction fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error(`Error in specific prediction endpoint:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction',
      version: VERSION
    });
  }
});




// GET /api/v2/predictions/created/:userId - Get user's created predictions
router.get('/created/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    console.log(`📊 User created predictions endpoint called for ID: ${userId} - origin:`, req.headers.origin);

    // Auto-close any expired predictions for this creator before returning results
    const nowIso = new Date().toISOString();
    const { error: closeError } = await supabase
      .from('predictions')
      .update({ status: 'closed', updated_at: nowIso })
      .lte('entry_deadline', nowIso)
      .eq('status', 'open')
      .eq('creator_id', userId);

    if (closeError && closeError.code !== 'PGRST116') {
      console.warn(`[predictions.created] Failed to auto-close expired predictions for user ${userId}:`, closeError);
    }
    
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('creator_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`Error fetching user created predictions for ${userId}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user created predictions',
        version: VERSION,
        details: error.message
      });
    }

    // Enrich with category info
    const enrichedPredictions = await enrichPredictionsWithCategory(predictions || []);

    return res.json({
      data: enrichedPredictions,
      message: `Created predictions for user ${userId}`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching user created predictions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user created predictions',
      version: VERSION,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/v2/predictions - Create new prediction
router.post('/', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    console.log('🎯 Creating new prediction:', req.body);

    const authReq = req as AuthenticatedRequest;
    const currentUserId = authReq.user?.id;
    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }
    
    const {
      title,
      description,
      category, // Legacy: category slug string
      categoryId, // New: category UUID
      type,
      options,
      entryDeadline,
      stakeMin,
      stakeMax,
      settlementMethod,
      isPrivate,
      imageUrl // Stable image URL for the prediction
    } = req.body;

    // Validate required fields
    if (!title || !type || !options || !entryDeadline) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields',
        version: VERSION,
        details: 'Title, type, options, and entryDeadline are required'
      });
    }

    // Phase 5: Basic content filtering (title/description/options)
    try {
      const optionLabels = Array.isArray(options)
        ? options.map((o: any) => (typeof o === 'string' ? o : (o?.label ?? o?.text ?? '')))
        : [];
      assertContentAllowed([
        { label: 'title', value: title },
        { label: 'description', value: description },
        ...optionLabels.map((v: string, idx: number) => ({ label: `option_${idx + 1}`, value: v })),
      ]);
    } catch (e: any) {
      if (e?.code === 'CONTENT_NOT_ALLOWED') {
        return res.status(400).json({
          error: 'content_not_allowed',
          message: 'Your content contains disallowed language. Please revise and try again.',
          field: e?.field,
          version: VERSION,
        });
      }
      throw e;
    }

    // Resolve categoryId (prefer categoryId, fallback to category slug, default to "general")
    let resolvedCategoryId: string | null = null;
    let resolvedCategorySlug: string = 'general';

    if (categoryId) {
      // Validate categoryId exists and is enabled
      const { data: cat } = await supabase
        .from('categories')
        .select('id, slug')
        .eq('id', categoryId)
        .eq('is_enabled', true)
        .maybeSingle();

      if (cat) {
        resolvedCategoryId = cat.id;
        resolvedCategorySlug = cat.slug;
      } else {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid or disabled category',
          version: VERSION,
        });
      }
    } else if (category) {
      // Legacy: resolve category slug to categoryId
      const { data: cat } = await supabase
        .from('categories')
        .select('id, slug')
        .eq('slug', category)
        .eq('is_enabled', true)
        .maybeSingle();

      if (cat) {
        resolvedCategoryId = cat.id;
        resolvedCategorySlug = cat.slug;
      } else {
        // Fallback: use category as slug (backward compatibility)
        resolvedCategorySlug = category;
      }
    } else {
      // Default to "general" category
      const { data: generalCat } = await supabase
        .from('categories')
        .select('id, slug')
        .eq('slug', 'general')
        .eq('is_enabled', true)
        .maybeSingle();

      if (generalCat) {
        resolvedCategoryId = generalCat.id;
        resolvedCategorySlug = 'general';
      }
    }

    // Phase 5: Creator is the authenticated user (from JWT)
    const requestedUserId = currentUserId;
    console.log('🔍 Debug - Creator userId (from auth):', requestedUserId);
    
    // Ensure user exists in public.users (create if missing for referential integrity)
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', requestedUserId)
      .single();
    
    if (userError || !userExists) {
      console.log('🔍 Debug - User not in users table, upserting:', requestedUserId);
      await supabase
        .from('users')
        .upsert(
          { id: requestedUserId, username: null, full_name: null, email: null, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
    }
    
    console.log('🔍 Debug - Final currentUserId:', currentUserId);

    // Optional cover image: validate URL if provided
    let finalImageUrl: string | null = null;
    if (imageUrl != null && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      const url = imageUrl.trim();
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
        finalImageUrl = url;
      }
    }

    // Create prediction in database (bypass RLS with service role)
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .insert({
        creator_id: currentUserId,
        title: title.trim(),
        description: description?.trim() || null,
        category: resolvedCategorySlug, // Keep legacy field for backward compatibility
        category_id: resolvedCategoryId, // New field
        type,
        status: 'open',
        stake_min: stakeMin || 1,
        stake_max: stakeMax || null,
        pool_total: 0,
        entry_deadline: entryDeadline,
        settlement_method: settlementMethod || 'manual',
        is_private: isPrivate || false,
        creator_fee_percentage: 1.0,
        platform_fee_percentage: 2.5,
        odds_model: process.env.FLAG_ODDS_V2 === '1' ? 'pool_v2' : 'legacy',
        tags: [resolvedCategorySlug],
        participant_count: 0,
        likes_count: 0,
        comments_count: 0,
        image_url: finalImageUrl // Optional: creator upload URL or null (random image later)
      })
      .select()
      .single();

    if (predictionError) {
      console.error('Error creating prediction:', predictionError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create prediction',
        version: VERSION,
        details: predictionError.message
      });
    }

    // Create prediction options (and return inserted rows)
    let insertedOptions: any[] = [];
    if (options && options.length > 0) {
      const optionData = options.map((option: any, index: number) => ({
        prediction_id: prediction.id,
        label: String(option.label || '').trim(),
        total_staked: 0,
        current_odds: Number(option.currentOdds) || 2.0,
      }));

      const { data: createdOptions, error: optionsError } = await supabase
        .from('prediction_options')
        .insert(optionData)
        .select('*');

      if (optionsError) {
        console.error('❌ Error creating prediction options:', optionsError);
        // Note: We don't fail here, just log the error
      } else if (Array.isArray(createdOptions)) {
        insertedOptions = createdOptions;
        console.log('✅ Successfully created', createdOptions.length, 'options for prediction:', prediction.id);
      }
    }

    // Fetch the complete prediction with options and creator info
    const { data: completePrediction, error: fetchError } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('id', prediction.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete prediction:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Prediction created but failed to fetch complete data',
        version: VERSION,
        details: fetchError.message
      });
    }

    // Fallback: if joined fetch returned no options but we inserted them, attach inserted options
    if (completePrediction && Array.isArray(completePrediction.options) && completePrediction.options.length === 0 && insertedOptions.length > 0) {
      console.warn('⚠️ Joined fetch returned no options; attaching inserted options directly');
      (completePrediction as any).options = insertedOptions;
    }

    console.log('✅ Prediction created successfully:', completePrediction.id);

    return res.json({
      data: completePrediction,
      message: 'Prediction created successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error in create prediction endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prediction',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v2/predictions/:id/entries - Create prediction entry (place bet)
router.post('/:id/entries', async (req, res) => {
  try {
    const predictionId = req.params.id;
    
    // Check if crypto mode is enabled
    const isCryptoMode = process.env.VITE_FCZ_BASE_BETS === '1' || 
                         process.env.ENABLE_BASE_BETS === '1' ||
                         process.env.FCZ_ENABLE_BASE_BETS === '1';
    
    console.log('🔧 Crypto mode check:', { isCryptoMode, body: req.body });
    
    // Zod validation schema - escrowLockId only required in crypto mode
    const BodySchema = z.object({
      option_id: z.string().uuid('Invalid option_id format'),
      stakeUSD: z.union([
        z.number().positive('stakeUSD must be positive'),
        z.string().transform((val) => {
          const num = Number(val);
          if (isNaN(num) || num <= 0) throw new Error('stakeUSD must be a positive number');
          return num;
        })
      ]).transform(val => typeof val === 'number' ? val : Number(val)).optional(),
      amount: z.number().positive('amount must be positive').optional(),
      user_id: z.string().uuid('Invalid user_id format'),
      escrowLockId: z.string().uuid('Invalid escrowLockId format').optional()
    }).refine(
      (data) => data.stakeUSD !== undefined || data.amount !== undefined,
      { message: 'Either stakeUSD or amount is required' }
    ).transform((data) => ({
      ...data,
      stakeUSD: data.stakeUSD ?? data.amount ?? 0
    }));
    
    // Parse and validate body
    let validatedBody;
    try {
      validatedBody = BodySchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('❌ Validation error:', err.issues);
        console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({
          error: 'invalid_body',
          details: err.issues,
          receivedBody: req.body,
          message: 'Request validation failed',
          version: VERSION
        });
      }
      throw err;
    }
    
    const { option_id, stakeUSD, user_id, escrowLockId } = validatedBody;
    const amount = Number(stakeUSD);
    
    console.log(`🎲 Creating prediction entry for prediction ${predictionId}:`, { 
      option_id, 
      stakeUSD: amount, 
      escrowLockId,
      user_id,
      isCryptoMode
    });
    console.log('📦 Full request body:', JSON.stringify(req.body, null, 2));
    
    // In crypto mode, require escrowLockId and allow only web client
    if (isCryptoMode && escrowLockId) {
      if (!isCryptoAllowedForClient(req)) {
        console.log('[CRYPTO-GATE] Rejected prediction entry: client not allowed for crypto', { client: (req as any).client });
        return res.status(403).json({
          error: 'crypto_disabled_for_client',
          message: 'Crypto is not available for this client',
          version: VERSION
        });
      }
    }
    if (isCryptoMode && !escrowLockId) {
      console.error('❌ Crypto mode requires escrowLockId:', { isCryptoMode, escrowLockId });
      return res.status(400).json({
        error: 'escrowLockId_required',
        message: 'escrowLockId is required when crypto bets are enabled',
        version: VERSION
      });
    }
    
    // Verify prediction exists and is open
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, status, entry_deadline')
      .eq('id', predictionId)
      .single();

    if (predError || !prediction) {
      console.error('❌ Prediction not found:', predictionId);
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    if (prediction.status !== 'open') {
      console.error('❌ Prediction not open:', prediction.status);
      return res.status(400).json({
        error: 'Invalid state',
        message: `Prediction is ${prediction.status}, not open for entries`,
        version: VERSION
      });
    }

    // Verify option exists
    const { data: option, error: optError } = await supabase
      .from('prediction_options')
      .select('id, prediction_id')
      .eq('id', option_id)
      .eq('prediction_id', predictionId)
      .single();

    if (optError || !option) {
      console.error('❌ Option not found:', option_id);
      return res.status(404).json({
        error: 'Not found',
        message: 'Option not found for this prediction',
        version: VERSION
      });
    }

    // CRITICAL FIX: Check if user already has an entry for this prediction
    const { data: existingEntry, error: existingError } = await supabase
      .from('prediction_entries')
      .select('id, amount, option_id, created_at')
      .eq('prediction_id', predictionId)
      .eq('user_id', user_id)
      .single();

    if (existingEntry) {
      console.error('❌ Duplicate entry detected:', { 
        existingEntryId: existingEntry.id,
        userId: user_id,
        predictionId 
      });
      return res.status(409).json({
        error: 'duplicate_entry',
        message: 'You have already placed a bet on this prediction. Each user can only bet once per prediction.',
        existingEntry: {
          id: existingEntry.id,
          amount: existingEntry.amount,
          optionId: existingEntry.option_id,
          createdAt: existingEntry.created_at
        },
        version: VERSION
      });
    }

    // CRYPTO MODE: Load and validate escrow lock with explicit error codes
    let lock = null;
    if (isCryptoMode && escrowLockId) {
      console.log(`🔒 [Crypto Mode] Loading escrow lock: ${escrowLockId}`);
      
      // Load lock - in a real transaction, this would be FOR UPDATE
      // Supabase doesn't support FOR UPDATE directly, so we use a select + update pattern
      const { data: lockData, error: lockError } = await supabase
        .from('escrow_locks')
        .select('*')
        .eq('id', escrowLockId)
        .single(); // Don't filter by user_id here - we'll check it explicitly

      if (lockError || !lockData) {
        console.error('❌ Escrow lock not found:', { escrowLockId, error: lockError });
        return res.status(400).json({
          error: 'lock_not_found',
          message: `Escrow lock ${escrowLockId} not found`,
          version: VERSION
        });
      }

      lock = lockData;

      // Validate user owns the lock
      if (lock.user_id !== user_id) {
        console.error('❌ Lock user mismatch:', { 
          lockUserId: lock.user_id, 
          requestUserId: user_id 
        });
        return res.status(400).json({
          error: 'lock_user_mismatch',
          message: `Lock belongs to different user`,
          version: VERSION
        });
      }

      // Validate lock status - check both 'status' and 'state' columns (migration handles both)
      const lockStatus = lock.status || lock.state;
      if (lockStatus !== 'locked') {
        console.error('❌ Lock is not in locked state:', { escrowLockId, status: lockStatus });
        return res.status(400).json({
          error: 'lock_not_locked',
          message: `Lock status is '${lockStatus}', expected 'locked'`,
          version: VERSION
        });
      }

      // Validate lock prediction matches
      if (lock.prediction_id !== predictionId) {
        console.error('❌ Lock prediction mismatch:', { 
          lockPrediction: lock.prediction_id, 
          requestPrediction: predictionId 
        });
        return res.status(400).json({
          error: 'lock_prediction_mismatch',
          message: `Lock belongs to prediction ${lock.prediction_id}, but request is for ${predictionId}`,
          version: VERSION
        });
      }

      // Validate currency
      const lockCurrency = lock.currency || 'USD';
      if (lockCurrency !== 'USD') {
        console.error('❌ Lock currency mismatch:', { lockCurrency });
        return res.status(400).json({
          error: 'currency_not_usd',
          message: `Lock currency is '${lockCurrency}', expected 'USD'`,
          version: VERSION
        });
      }

      // Validate lock amount is sufficient
      const lockAmount = Number(lock.amount);
      if (lockAmount < amount) {
        console.error('❌ Insufficient lock amount:', { lockAmount, required: amount });
        return res.status(400).json({
          error: 'insufficient_lock_amount',
          message: `Lock amount (${lockAmount}) is less than stake (${amount})`,
          version: VERSION
        });
      }

      console.log(`✅ [Crypto Mode] Lock validated: ${escrowLockId}, amount: ${lockAmount}`);
    }

    // Create prediction entry in database
    const entryData: any = {
      prediction_id: predictionId,
      option_id: option_id,
      user_id: user_id,
      amount: amount,
      status: 'active',
      potential_payout: amount * 2.0, // Simple calculation for now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add crypto fields if in crypto mode
    if (isCryptoMode && escrowLockId) {
      entryData.escrow_lock_id = escrowLockId;
      entryData.provider = 'crypto-base-usdc';
    }

    const { data: entry, error: entryError } = await supabase
      .from('prediction_entries')
      .insert(entryData)
      .select()
      .single();
      
    if (entryError) {
      console.error('Error creating prediction entry:', entryError);
      console.error('Entry error details:', JSON.stringify(entryError, null, 2));
      
      // CRITICAL: Release lock if entry creation fails in crypto mode
      if (isCryptoMode && escrowLockId) {
        console.log(`⚠️ Entry creation failed, releasing lock: ${escrowLockId}`);
        const updateData: any = {};
        if (lock && lock.status !== undefined) {
          updateData.status = 'released';
        } else {
          updateData.state = 'released';
        }
        updateData.released_at = new Date().toISOString();
        
        await supabase
          .from('escrow_locks')
          .update(updateData)
          .eq('id', escrowLockId)
          .then(({ error: releaseError }) => {
            if (releaseError) {
              console.error('❌ Failed to release lock after entry error:', releaseError);
            } else {
              console.log(`✅ Lock released after entry failure: ${escrowLockId}`);
            }
          });
      }
      
      // Check if it's a unique constraint violation (lock already consumed)
      if (entryError.code === '23505' || entryError.message?.includes('unique') || entryError.message?.includes('uniq_lock_consumption')) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Escrow lock has already been consumed. Please refresh and try again.',
          version: VERSION
        });
      }
      
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create prediction entry',
        version: VERSION,
        details: entryError.message
      });
    }
    
    console.log('✅ Prediction entry created successfully:', entry.id);

    // CRYPTO MODE: Mark lock as consumed and create wallet transaction
    if (isCryptoMode && escrowLockId && lock) {
      console.log(`🔒 [Crypto Mode] Marking lock as consumed: ${escrowLockId}`);
      
      // Update lock status to consumed (prefer 'status' column, fallback to 'state')
      const updateData: any = {};
      if (lock.status !== undefined) {
        updateData.status = 'consumed';
      } else {
        updateData.state = 'consumed';
      }
      
      const { error: lockUpdateError } = await supabase
        .from('escrow_locks')
        .update(updateData)
        .eq('id', escrowLockId);

      if (lockUpdateError) {
        console.error('❌ Failed to mark lock as consumed:', lockUpdateError);
        // Entry was created but lock wasn't updated - this is a problem but we continue
        // In a real transaction, this would rollback. For now, log and continue.
        console.warn('⚠️ Lock update failed after entry creation - manual intervention may be needed');
      } else {
        console.log(`✅ [Crypto Mode] Lock marked as consumed: ${escrowLockId}`);
      }

      // Create wallet transaction mirror (debit for bet)
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user_id,
          amount: -amount, // Negative for debit
          currency: 'USD',
          direction: 'debit',
          provider: 'crypto-base-usdc',
          channel: 'escrow_consumed',
          external_ref: escrowLockId,
          meta: {
            entryId: entry.id,
            predictionId: predictionId,
            lockId: escrowLockId
          },
          created_at: new Date().toISOString()
        });

      if (txnError) {
        console.error('⚠️ Failed to create wallet transaction mirror:', txnError);
        // Non-fatal, continue
      } else {
        console.log(`✅ [Crypto Mode] Wallet transaction created for entry: ${entry.id}`);
      }

      // Write event log
      const { error: eventError } = await supabase
        .from('event_log')
        .insert({
          source: 'api',
          kind: 'prediction.entry.created',
          ref: entry.id,
          payload: {
            entryId: entry.id,
            predictionId: predictionId,
            lockId: escrowLockId,
            userId: user_id,
            amount: amount,
            optionId: option_id
          },
          ts: new Date().toISOString()
        });

      if (eventError) {
        console.error('⚠️ Failed to write event log:', eventError);
        // Non-fatal, continue
      } else {
        console.log(`✅ [Crypto Mode] Event log written for entry: ${entry.id}`);
      }
    }

    // 1) Update the selected option's total_staked
    const { data: currentOption, error: readOptError } = await supabase
      .from('prediction_options')
      .select('id,total_staked')
      .eq('id', option_id)
      .single();

    if (readOptError) {
      console.error('Error reading option for update:', readOptError);
    } else {
      const newTotalStaked = (currentOption?.total_staked || 0) + amount;
      console.log('📊 Updating option total_staked:', { 
        currentTotal: currentOption?.total_staked, 
        newAmount: amount, 
        newTotal: newTotalStaked 
      });
      const { error: updateOptError } = await supabase
        .from('prediction_options')
        .update({ total_staked: newTotalStaked, updated_at: new Date().toISOString() as any })
        .eq('id', option_id);
      if (updateOptError) {
        console.error('Error updating option total_staked:', updateOptError);
      } else {
        console.log('✅ Option total_staked updated successfully');
      }
    }

    // 2) Recalculate pool_total from all options
    const { data: allOptions, error: optionsError } = await supabase
      .from('prediction_options')
      .select('id,total_staked')
      .eq('prediction_id', predictionId);

    let poolTotal = 0;
    if (optionsError) {
      console.error('Error fetching options to calculate pool:', optionsError);
    } else {
      poolTotal = (allOptions || []).reduce((sum: number, opt: any) => sum + (opt.total_staked || 0), 0);
    }

    // 3) Recalculate participant_count = number of entries for prediction
    const { count: participantCount, error: countError } = await supabase
      .from('prediction_entries')
      .select('id', { count: 'exact', head: true })
      .eq('prediction_id', predictionId);
    if (countError) {
      console.error('Error counting participants:', countError);
    }

    // 4) Update prediction with new pool_total and participant_count
    const { data: updatedPredictionRow, error: updatePredError } = await supabase
      .from('predictions')
      .update({ 
        pool_total: poolTotal, 
        participant_count: participantCount || 0,
        updated_at: new Date().toISOString() as any
      })
      .eq('id', predictionId)
      .select('*')
      .single();
    if (updatePredError) {
      console.error('Error updating prediction totals:', updatePredError);
    }

    // 5) Recalculate odds for each option: odds = pool_total / option.total_staked (fallback 2.0)
    if (allOptions && allOptions.length > 0) {
      for (const opt of allOptions) {
        const stake = opt.total_staked || 0;
        // If there is stake, use pool_total / option_stake; otherwise default to equal-probability baseline (N options)
        const baseline = allOptions.length > 0 ? allOptions.length : 2; // binary -> 2.0, 3-way -> 3.0, etc.
        const newOdds = stake > 0 && poolTotal > 0 ? Math.max(1.01, poolTotal / stake) : baseline;
        const { error: updateOddsError } = await supabase
          .from('prediction_options')
          .update({ current_odds: newOdds, updated_at: new Date().toISOString() as any })
          .eq('id', opt.id);
        if (updateOddsError) {
          console.error('Error updating option odds:', updateOddsError);
        }
      }
    }

    // 6) Fetch full prediction with creator and options to return
    const { data: fullPrediction, error: fetchUpdatedError } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('id', predictionId)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching full updated prediction:', fetchUpdatedError);
    }

    return res.status(201).json({
      ok: true,
      entryId: entry.id,
      data: {
        entry,
        prediction: fullPrediction || updatedPredictionRow || { id: predictionId, pool_total: poolTotal, participant_count: participantCount || 0 }
      },
      message: 'Prediction entry created successfully',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('❌ Unhandled error in prediction entry creation:', error);
    
    // Handle Zod validation errors (if somehow missed earlier)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'invalid_body',
        details: error.issues,
        message: 'Request validation failed',
        version: VERSION
      });
    }
    
    // Handle database unique constraint violations
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error;
      if (dbError.code === '23505' || dbError.message?.includes('unique') || dbError.message?.includes('uniq_lock_consumption')) {
        return res.status(409).json({
          error: 'lock_already_consumed',
          message: 'Escrow lock has already been consumed',
          version: VERSION
        });
      }
    }
    
    return res.status(500).json({
      error: 'server_error',
      message: 'Internal server error',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v2/predictions/:id - Update prediction
router.put('/:id', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log(`🔄 Updating prediction ${id}:`, updates);

    const authReq = req as AuthenticatedRequest;
    const actorId = authReq.user?.id;
    if (!actorId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
    }

    const { data: existing, error: existingErr } = await supabase
      .from('predictions')
      .select('id, creator_id')
      .eq('id', id)
      .maybeSingle();

    if (existingErr || !existing) {
      return res.status(404).json({ error: 'Not found', message: 'Prediction not found', version: VERSION });
    }

    if (String((existing as any).creator_id) !== actorId) {
      return res.status(403).json({ error: 'forbidden', message: 'Only the creator can update this prediction', version: VERSION });
    }
    
    // Validate allowed fields
    const allowedFields = ['title', 'description', 'is_private', 'entry_deadline', 'image_url'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'Please provide valid fields to update',
        version: VERSION
      });
    }
    
    // Add updated timestamp
    filteredUpdates.updated_at = new Date().toISOString();

    // Phase 5: Basic content filtering on updated fields
    try {
      assertContentAllowed([
        { label: 'title', value: filteredUpdates.title },
        { label: 'description', value: filteredUpdates.description },
      ]);
    } catch (e: any) {
      if (e?.code === 'CONTENT_NOT_ALLOWED') {
        return res.status(400).json({
          error: 'content_not_allowed',
          message: 'Your content contains disallowed language. Please revise and try again.',
          field: e?.field,
          version: VERSION,
        });
      }
      throw e;
    }
    
    const { data: updated, error } = await supabase
      .from('predictions')
      .update(filteredUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating prediction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update prediction',
        version: VERSION,
        details: error.message
      });
    }

    console.log(`✅ Prediction ${id} updated successfully`);
    
    return res.json({
      data: updated,
      message: `Prediction ${id} updated successfully`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error updating prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update prediction',
      version: VERSION
    });
  }
});

// PATCH /api/v2/predictions/:id - Edit prediction with safe rules
router.patch('/:id', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    if (!predictionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing prediction id',
        version: VERSION,
      });
    }
    const { title, description, options, closesAt, categoryId, editReason } = req.body;

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }

    console.log(`✏️ Edit prediction ${predictionId} requested by user ${userId}`);

    // Phase 5: Basic content filtering on proposed edits
    try {
      const optionLabels = Array.isArray(options)
        ? options.map((o: any) => (typeof o === 'string' ? o : (o?.label ?? o?.text ?? '')))
        : [];
      assertContentAllowed([
        { label: 'title', value: title },
        { label: 'description', value: description },
        ...optionLabels.map((v: string, idx: number) => ({ label: `option_${idx + 1}`, value: v })),
      ]);
    } catch (e: any) {
      if (e?.code === 'CONTENT_NOT_ALLOWED') {
        return res.status(400).json({
          error: 'content_not_allowed',
          message: 'Your content contains disallowed language. Please revise and try again.',
          field: e?.field,
          version: VERSION,
        });
      }
      throw e;
    }

    // Load prediction with creator info
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, creator_id, status, entry_deadline, title, description, category')
      .eq('id', predictionId)
      .single();

    if (predError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    // Verify creator
    if (prediction.creator_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the creator can edit this prediction',
        version: VERSION,
      });
    }

    // Cannot edit if already settled/complete/voided/cancelled
    const immutableStatuses = ['settled', 'complete', 'voided', 'cancelled'];
    if (immutableStatuses.includes(prediction.status)) {
      return res.status(400).json({
        error: 'invalid_state',
        message: `Cannot edit prediction with status: ${prediction.status}`,
        version: VERSION,
      });
    }

    // Count entries for this prediction
    const { count: entriesCount, error: countError } = await supabase
      .from('prediction_entries')
      .select('id', { count: 'exact', head: true })
      .eq('prediction_id', predictionId);

    if (countError) {
      console.error('[PREDICTIONS] Error counting entries:', countError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to count prediction entries',
        version: VERSION,
      });
    }

    const hasEntries = (entriesCount || 0) > 0;
    const changedFields: string[] = [];
    const updates: any = {};

    // Apply safe edit rules
    if (hasEntries) {
      // If entries exist: ONLY allow extending closesAt (and optionally description)
      if (title !== undefined) {
        return res.status(400).json({
          error: 'edit_blocked',
          message: 'Cannot change title after participants have staked',
          version: VERSION,
        });
      }

      if (options !== undefined) {
        return res.status(400).json({
          error: 'edit_blocked',
          message: 'Cannot change options after participants have staked',
          version: VERSION,
        });
      }

      if (categoryId !== undefined) {
        return res.status(400).json({
          error: 'edit_blocked',
          message: 'Cannot change category after participants have staked',
          version: VERSION,
        });
      }

      // Allow description edit (optional per spec)
      if (description !== undefined) {
        updates.description = description?.trim() || null;
        changedFields.push('description');
      }

      // Allow extending closesAt only
      if (closesAt !== undefined) {
        const newDeadline = new Date(closesAt);
        const oldDeadline = new Date(prediction.entry_deadline);
        
        if (isNaN(newDeadline.getTime())) {
          return res.status(400).json({
            error: 'invalid_date',
            message: 'Invalid closesAt date format',
            version: VERSION,
          });
        }

        if (newDeadline.getTime() <= oldDeadline.getTime()) {
          return res.status(400).json({
            error: 'invalid_extension',
            message: 'Can only extend close time forward when entries exist',
            version: VERSION,
          });
        }

        updates.entry_deadline = newDeadline.toISOString();
        changedFields.push('entry_deadline');
      }
    } else {
      // No entries: allow full edit
      if (title !== undefined) {
        updates.title = title?.trim() || null;
        changedFields.push('title');
      }

      if (description !== undefined) {
        updates.description = description?.trim() || null;
        changedFields.push('description');
      }

      if (categoryId !== undefined) {
        // Validate categoryId exists and is enabled
        const { data: cat } = await supabase
          .from('categories')
          .select('id, slug')
          .eq('id', categoryId)
          .eq('is_enabled', true)
          .maybeSingle();

        if (!cat) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid or disabled category',
            version: VERSION,
          });
        }

        updates.category = cat.slug; // Keep legacy field
        updates.category_id = cat.id; // New field
        changedFields.push('category', 'category_id');
      }

      if (closesAt !== undefined) {
        const newDeadline = new Date(closesAt);
        if (isNaN(newDeadline.getTime())) {
          return res.status(400).json({
            error: 'invalid_date',
            message: 'Invalid closesAt date format',
            version: VERSION,
          });
        }
        updates.entry_deadline = newDeadline.toISOString();
        changedFields.push('entry_deadline');
      }

      // Handle options update (only if no entries)
      if (options !== undefined && Array.isArray(options)) {
        if (options.length < 2) {
          return res.status(400).json({
            error: 'invalid_options',
            message: 'Must have at least 2 options',
            version: VERSION,
          });
        }

        // Validate unique labels (case-insensitive)
        const labels = options.map((o: any) => (o.label || '').toLowerCase().trim()).filter(Boolean);
        const uniqueLabels = new Set(labels);
        if (labels.length !== uniqueLabels.size) {
          return res.status(400).json({
            error: 'duplicate_options',
            message: 'Option labels must be unique',
            version: VERSION,
          });
        }

        // Maintain existing option IDs when provided:
        // - update labels for existing option IDs
        // - delete options removed by the creator
        // - insert new options without an id
        const { data: existingOptions, error: existingError } = await supabase
          .from('prediction_options')
          .select('id')
          .eq('prediction_id', predictionId);

        if (existingError) {
          console.error('[PREDICTIONS] Error loading existing options:', existingError);
          return res.status(500).json({
            error: 'Database error',
            message: 'Failed to load existing options',
            version: VERSION,
          });
        }

        const existingIds = new Set((existingOptions || []).map((o: any) => o.id));
        const incomingIds = new Set(
          (options || [])
            .map((o: any) => o?.id)
            .filter((id: any) => typeof id === 'string' && id.length > 0)
        );

        // Update labels for existing options with ids
        for (const opt of options) {
          const id = opt?.id;
          if (typeof id === 'string' && existingIds.has(id)) {
            const label = String(opt?.label || '').trim();
            const { error: updErr } = await supabase
              .from('prediction_options')
              .update({ label, updated_at: new Date().toISOString() as any })
              .eq('id', id)
              .eq('prediction_id', predictionId);

            if (updErr) {
              console.error('[PREDICTIONS] Error updating option label:', updErr);
              return res.status(500).json({
                error: 'Database error',
                message: 'Failed to update options',
                version: VERSION,
              });
            }
          }
        }

        // Delete options removed by the creator (only within this prediction)
        const idsToDelete = (existingOptions || [])
          .map((o: any) => o.id)
          .filter((id: any) => typeof id === 'string' && !incomingIds.has(id));

        if (idsToDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('prediction_options')
            .delete()
            .in('id', idsToDelete)
            .eq('prediction_id', predictionId);

          if (delErr) {
            console.error('[PREDICTIONS] Error deleting removed options:', delErr);
            return res.status(500).json({
              error: 'Database error',
              message: 'Failed to update options',
              version: VERSION,
            });
          }
        }

        // Insert new options without ids
        const newOptions = (options || []).filter((o: any) => !o?.id);
        if (newOptions.length > 0) {
          const insertPayload = newOptions.map((option: any) => ({
            prediction_id: predictionId,
            label: String(option.label || '').trim(),
            total_staked: 0,
            current_odds: Number(option.currentOdds) || 2.0,
          }));

          const { error: insertError } = await supabase
            .from('prediction_options')
            .insert(insertPayload);

          if (insertError) {
            console.error('[PREDICTIONS] Error inserting new options:', insertError);
            return res.status(500).json({
              error: 'Database error',
              message: 'Failed to update options',
              version: VERSION,
            });
          }
        }

        changedFields.push('options');
      }
    }

    // If no changes, return early
    if (changedFields.length === 0) {
      return res.json({
        data: prediction,
        message: 'No changes to apply',
        version: VERSION,
      });
    }

    // Update prediction
    updates.updated_at = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('predictions')
      .update(updates)
      .eq('id', predictionId)
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .single();

    if (updateError) {
      console.error('[PREDICTIONS] Error updating prediction:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update prediction',
        version: VERSION,
      });
    }

    // Audit log
    await logAdminAction({
      actorId: userId,
      action: 'creator_edit_prediction',
      targetType: 'prediction',
      targetId: predictionId,
      reason: editReason || null,
      meta: {
        changedFields,
        hasEntries,
        entriesCount: entriesCount || 0,
      },
    }).catch((e) => console.error('[PREDICTIONS] Audit log failed:', e));

    // Recompute state if needed
    await recomputePredictionState(predictionId).catch((e) =>
      console.error('[PREDICTIONS] Recompute failed:', e)
    );

    // Emit realtime update
    emitPredictionUpdate({ predictionId, reason: 'edited' });

    // Enrich with category info
    const enrichedPrediction = await enrichPredictionWithCategory(updated);

    console.log(`✅ Prediction ${predictionId} edited by ${userId}:`, changedFields);

    return res.json({
      data: enrichedPrediction,
      message: 'Prediction updated successfully',
      changedFields,
      version: VERSION,
    });
  } catch (error) {
    console.error('[PREDICTIONS] Error editing prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to edit prediction',
      version: VERSION,
    });
  }
});

// PATCH /api/v2/predictions/:id/cover-image - Creator-only: set or update cover image URL
router.patch('/:id/cover-image', requireSupabaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required', version: VERSION });
    }

    const { coverImageUrl } = req.body;
    if (!coverImageUrl || typeof coverImageUrl !== 'string' || coverImageUrl.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'coverImageUrl is required',
        version: VERSION
      });
    }
    const url = coverImageUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'coverImageUrl must be a valid URL or path',
        version: VERSION
      });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('predictions')
      .select('id, creator_id, image_url')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Prediction not found', version: VERSION });
    }
    if (String((existing as any).creator_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the creator can update the cover image', version: VERSION });
    }

    const { error } = await supabase
      .from('predictions')
      .update({ image_url: url, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[PREDICTIONS] Error updating cover image:', error);
      return res.status(500).json({ error: 'Database error', message: 'Failed to update cover image', version: VERSION });
    }

    return res.json({
      ok: true,
      predictionId: id,
      coverImageUrl: url,
      version: VERSION
    });
  } catch (error) {
    console.error('[PREDICTIONS] Cover image update error:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to update cover image', version: VERSION });
  }
});

// PATCH /api/v2/predictions/:id/image - Set stable image URL (only if not already set; used by random-image flow)
router.patch('/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'imageUrl is required',
        version: VERSION
      });
    }

    // Only set image if not already set (prevents changing)
    const { data: existing } = await supabase
      .from('predictions')
      .select('id, image_url')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // If image already set, return success without updating
    if (existing.image_url) {
      return res.json({
        success: true,
        message: 'Image already set',
        imageUrl: existing.image_url,
        version: VERSION
      });
    }

    // Set the image URL
    const { error } = await supabase
      .from('predictions')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[PREDICTIONS] Error setting image:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to set image',
        version: VERSION
      });
    }

    console.log(`[PREDICTIONS] ✅ Image set for prediction ${id}: ${imageUrl.slice(0, 50)}...`);
    
    return res.json({
      success: true,
      message: 'Image set successfully',
      imageUrl,
      version: VERSION
    });
  } catch (error) {
    console.error('[PREDICTIONS] Error setting image:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to set image',
      version: VERSION
    });
  }
});

// DELETE /api/v2/predictions/:id - Delete prediction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Delete prediction requested for: ${id} - origin:`, req.headers.origin);
    // Soft delete: mark status as cancelled so it no longer appears in Discover
    const { data: updated, error } = await supabase
      .from('predictions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error('Error soft-deleting prediction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to delete prediction',
        version: VERSION,
        details: error.message
      });
    }

    // Persistence guard: verify the row now has status cancelled
    const { data: verifyRow, error: verifyError } = await supabase
      .from('predictions')
      .select('id, status')
      .eq('id', id)
      .single();
    if (verifyError) {
      console.error('Verification read failed after delete:', verifyError);
    } else {
      console.log('✅ Delete persisted check:', verifyRow);
    }

    return res.json({
      success: true,
      data: updated,
      message: `Prediction ${id} deleted`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error deleting prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete prediction'
    });
  }
});

// Alias: GET /api/v2/predictions/user/:id -> same as users/:id/predictions
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 [Alias] User predictions endpoint called for ID: ${id} - origin:`, req.headers.origin);
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('creator_id', id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`Error fetching user predictions (alias) for ${id}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user predictions',
        version: VERSION,
        details: error.message
      });
    }

    return res.json({
      data: predictions || [],
      message: 'User predictions fetched successfully (alias)',
      version: VERSION,
    });
  } catch (error) {
    console.error('Error in alias user predictions endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user predictions',
      version: VERSION,
    });
  }
});

// POST /api/v2/predictions/:id/cancel - Cancel prediction with refunds
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    const { reason } = req.body;

    const tokenUserId = await resolveAuthenticatedUserId(req);
    const userId = tokenUserId || req.body.userId || req.body.creatorId;

    // Require auth in production
    if (process.env.NODE_ENV === 'production' && !tokenUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID required',
        version: VERSION,
      });
    }

    console.log(`🚫 Cancel prediction ${predictionId} requested by user ${userId}`);

    // Cancel + refund in a single DB transaction (idempotent)
    const { data: cancelResult, error: cancelError } = await supabase.rpc('cancel_prediction_with_refunds', {
      p_prediction_id: String(predictionId),
      p_actor_id: userId,
      p_reason: typeof reason === 'string' ? reason.trim() : null,
    });

    if (cancelError) {
      console.error('[PREDICTIONS] cancel_prediction_with_refunds error:', cancelError);
      const code = (cancelError as any)?.code;
      const message = (cancelError as any)?.message || 'Failed to cancel prediction';

      if (code === 'P0002') {
        return res.status(404).json({ error: 'not_found', message: 'Prediction not found', version: VERSION });
      }
      if (code === '42501') {
        return res.status(403).json({ error: 'forbidden', message: 'Only the creator can cancel this prediction', version: VERSION });
      }
      if (code === 'P0001') {
        return res.status(409).json({ error: 'invalid_state', message, version: VERSION });
      }
      return res.status(500).json({ error: 'internal_error', message, version: VERSION });
    }

    // Fetch updated prediction for UI refresh
    const { data: updatedPrediction } = await supabase
      .from('predictions')
      .select('id,status,cancelled_at,cancel_reason,updated_at')
      .eq('id', predictionId)
      .maybeSingle();

    return res.json({
      data: {
        prediction: updatedPrediction ?? { id: predictionId, status: 'cancelled' },
        result: cancelResult,
      },
      message: (cancelResult as any)?.alreadyCancelled ? 'Prediction already cancelled' : 'Prediction cancelled',
      version: VERSION,
    });
  } catch (error) {
    console.error('[PREDICTIONS] Error cancelling prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to cancel prediction',
      version: VERSION,
    });
  }
});

// POST /api/v2/predictions/:id/close - Close prediction
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔒 Closing prediction:', id);

    const { data: existingPrediction, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching prediction before close:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to load prediction before close',
        version: VERSION
      });
    }

    if (!existingPrediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    if (existingPrediction.status !== 'open') {
      return res.status(400).json({
        error: 'invalid_state',
        message: `Prediction is already ${existingPrediction.status}`,
        version: VERSION
      });
    }

    // Update prediction status to 'closed' in database
    const { data: updatedPrediction, error } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Database error closing prediction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to close prediction in database'
      });
    }

    if (!updatedPrediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found'
      });
    }

    console.log('✅ Prediction closed successfully:', updatedPrediction.id);

    const recomputed = await recomputePredictionState(id);
    const payload = recomputed.prediction || updatedPrediction;

    try {
      emitPredictionUpdate({ predictionId: id, reason: 'closed' });
    } catch (emitErr) {
      console.warn('⚠️ Failed to emit prediction update after close:', emitErr);
    }

    return res.json({
      data: payload,
      message: `Prediction ${id} closed successfully`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error closing prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to close prediction'
    });
  }
});

// GET /api/v2/predictions/:id/activity - Get prediction activity
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching activity for prediction: ${id}`);
    
    // Get recent prediction entries (bets placed)
    const { data: entries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select(`
        id,
        amount,
        created_at,
        option:prediction_options(id, label),
        user:users(id, username, full_name, avatar_url)
      `)
      .eq('prediction_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (entriesError) {
      console.error('Error fetching prediction entries for activity:', entriesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction activity',
        version: VERSION,
        details: entriesError.message
      });
    }

    // Transform entries into activity items
    const activities = (entries || []).map(entry => {
      const user = Array.isArray(entry.user) ? entry.user[0] : entry.user;
      const option = Array.isArray(entry.option) ? entry.option[0] : entry.option;
      
      return {
        id: entry.id,
        type: 'bet_placed',
        user: {
          id: user?.id || entry.id,
          username: user?.username || user?.full_name || 'Anonymous',
          avatar_url: user?.avatar_url
        },
        amount: entry.amount,
        option: option?.label || 'Unknown',
        timestamp: entry.created_at,
        timeAgo: getTimeAgo(entry.created_at),
        description: `Placed $${entry.amount} on "${option?.label || 'Unknown'}"`
      };
    });

    console.log(`✅ Found ${activities.length} activity items for prediction ${id}`);
    
    return res.json({
      data: activities,
      message: `Activity for prediction ${id}`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching prediction activity:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction activity',
      version: VERSION
    });
  }
});

// Helper function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

// GET /api/v2/predictions/:id/participants - Get prediction participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching participants for prediction: ${id}`);
    
    const { data: entries, error } = await supabase
      .from('prediction_entries')
      .select(`
        id,
        amount,
        created_at,
        option:prediction_options(id, label),
        user:users(id, username, full_name, avatar_url)
      `)
      .eq('prediction_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prediction participants:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction participants',
        version: VERSION,
        details: error.message
      });
    }

    // Transform the data to match the expected format
    const participants = (entries || []).map(entry => {
      const user = Array.isArray(entry.user) ? entry.user[0] : entry.user;
      const option = Array.isArray(entry.option) ? entry.option[0] : entry.option;
      
      return {
        id: user?.id || entry.id,
        username: user?.username || user?.full_name || 'Anonymous',
        avatar_url: user?.avatar_url,
        amount: entry.amount,
        option: option?.label || 'Unknown',
        joinedAt: entry.created_at,
        timeAgo: new Date(entry.created_at).toLocaleDateString()
      };
    });

    console.log(`✅ Found ${participants.length} participants for prediction ${id}`);
    
    return res.json({
      data: participants,
      message: `Participants for prediction ${id}`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching prediction participants:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction participants',
      version: VERSION
    });
  }
});

export default router;
