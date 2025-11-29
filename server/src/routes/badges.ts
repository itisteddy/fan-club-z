/**
 * OG Badges System Routes
 * 
 * Handles badge assignment, lookup, and admin operations
 * Feature flag: BADGES_OG_ENABLE=1
 */

import express from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = express.Router();

// Environment config
const BADGES_OG_ENABLE = process.env.BADGES_OG_ENABLE === '1';
const BADGES_OG_COUNTS = (process.env.BADGES_OG_COUNTS || '25,100,500').split(',').map(n => parseInt(n, 10));

// Parse counts with defaults
const [GOLD_COUNT = 25, SILVER_COUNT = 100, BRONZE_COUNT = 500] = BADGES_OG_COUNTS;

// Valid badge tiers
const VALID_TIERS = ['gold', 'silver', 'bronze'] as const;
type BadgeTier = typeof VALID_TIERS[number];

// Helper: Check if feature is enabled
const checkFeatureEnabled = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (!BADGES_OG_ENABLE) {
    res.status(404).json({
      error: 'Feature disabled',
      message: 'OG badges system is not enabled',
      version: VERSION
    });
    return;
  }
  next();
};

// Helper: Check admin access
const checkAdminAccess = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  
  if (adminKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin key required',
      version: VERSION
    });
    return;
  }
  next();
};

/**
 * GET /api/badges/og/summary
 * Get summary of OG badge distribution (admin/dev only)
 */
router.get('/api/badges/og/summary', checkFeatureEnabled, checkAdminAccess, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('og_badge_summary')
      .select('*');
    
    if (error) throw error;
    
    // Calculate remaining slots
    const byTier: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      byTier[row.tier] = row;
    });
    
    const summary = {
      gold: {
        holders: byTier.gold?.holders || 0,
        capacity: GOLD_COUNT,
        remaining: GOLD_COUNT - (byTier.gold?.holders || 0)
      },
      silver: {
        holders: byTier.silver?.holders || 0,
        capacity: SILVER_COUNT,
        remaining: SILVER_COUNT - (byTier.silver?.holders || 0)
      },
      bronze: {
        holders: byTier.bronze?.holders || 0,
        capacity: BRONZE_COUNT,
        remaining: BRONZE_COUNT - (byTier.bronze?.holders || 0)
      }
    };
    
    return res.json({
      data: summary,
      message: 'OG badge summary fetched',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Badges] Summary error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch badge summary',
      version: VERSION
    });
  }
});

/**
 * POST /api/badges/og/backfill
 * Run the OG badge backfill (assigns badges to earliest users)
 */
router.post('/api/badges/og/backfill', checkFeatureEnabled, checkAdminAccess, async (req, res) => {
  const { 
    goldCount = GOLD_COUNT, 
    silverCount = SILVER_COUNT, 
    bronzeCount = BRONZE_COUNT,
    reason = 'backfill:created_at'
  } = req.body;
  
  try {
    // Call the backfill function
    const { data, error } = await supabase.rpc('backfill_og_badges', {
      gold_count: goldCount,
      silver_count: silverCount,
      bronze_count: bronzeCount,
      p_reason: reason
    });
    
    if (error) throw error;
    
    // Transform results
    const results: Record<string, { assigned: number; skipped: number }> = {};
    (data || []).forEach((row: any) => {
      results[row.tier] = {
        assigned: row.assigned_count,
        skipped: row.skipped_count
      };
    });
    
    console.log('[Badges] Backfill completed:', results);
    
    return res.json({
      data: results,
      message: 'OG badge backfill completed',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Badges] Backfill error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to run backfill',
      version: VERSION
    });
  }
});

/**
 * POST /api/badges/og/assign
 * Manually assign an OG badge to a user
 */
router.post('/api/badges/og/assign', checkFeatureEnabled, checkAdminAccess, async (req, res) => {
  const { userId, tier, reason = 'manual' } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'userId is required',
      version: VERSION
    });
  }
  
  if (!tier || !VALID_TIERS.includes(tier)) {
    return res.status(400).json({
      error: 'Bad request',
      message: `tier must be one of: ${VALID_TIERS.join(', ')}`,
      version: VERSION
    });
  }
  
  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, og_badge')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        version: VERSION
      });
    }
    
    // Warn if overwriting
    if (user.og_badge) {
      console.warn(`[Badges] Overwriting existing badge ${user.og_badge} -> ${tier} for user ${userId}`);
    }
    
    // Assign badge
    const { error: updateError } = await supabase
      .from('users')
      .update({
        og_badge: tier,
        og_badge_assigned_at: new Date().toISOString(),
        og_badge_reason: reason
      })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    console.log(`[Badges] Assigned ${tier} badge to user ${userId}`);
    
    return res.json({
      data: { userId, tier, previousTier: user.og_badge },
      message: `OG ${tier} badge assigned successfully`,
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Badges] Assign error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to assign badge',
      version: VERSION
    });
  }
});

/**
 * POST /api/badges/og/remove
 * Remove an OG badge from a user
 */
router.post('/api/badges/og/remove', checkFeatureEnabled, checkAdminAccess, async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'userId is required',
      version: VERSION
    });
  }
  
  try {
    // Check if user exists and has a badge
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, og_badge')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        version: VERSION
      });
    }
    
    if (!user.og_badge) {
      return res.json({
        data: { userId, removed: false },
        message: 'User does not have an OG badge',
        version: VERSION
      });
    }
    
    // Remove badge
    const { error: updateError } = await supabase
      .from('users')
      .update({
        og_badge: null,
        og_badge_assigned_at: null,
        og_badge_reason: null
      })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    console.log(`[Badges] Removed ${user.og_badge} badge from user ${userId}`);
    
    return res.json({
      data: { userId, removed: true, previousTier: user.og_badge },
      message: 'OG badge removed successfully',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Badges] Remove error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to remove badge',
      version: VERSION
    });
  }
});

/**
 * GET /api/badges/og/user/:userId
 * Get a user's OG badge (public endpoint)
 */
router.get('/api/badges/og/user/:userId', checkFeatureEnabled, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, og_badge, og_badge_assigned_at')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        version: VERSION
      });
    }
    
    return res.json({
      data: {
        userId: user.id,
        tier: user.og_badge,
        assignedAt: user.og_badge_assigned_at
      },
      message: 'User badge fetched',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Badges] User badge error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch user badge',
      version: VERSION
    });
  }
});

export default router;
