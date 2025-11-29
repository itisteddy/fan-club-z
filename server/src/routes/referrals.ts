/**
 * Referral System Routes
 * 
 * Handles referral link clicks, attribution, and leaderboard
 * Feature flag: REFERRAL_ENABLE=1
 */

import express from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = express.Router();

// Environment config
const REFERRAL_ENABLE = process.env.REFERRAL_ENABLE === '1';
const MAX_SIGNUPS_PER_IP_DAY = parseInt(process.env.REFERRAL_MAX_SIGNUPS_PER_IP_DAY || '10', 10);
const MAX_SIGNUPS_PER_DEVICE_DAY = parseInt(process.env.REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY || '5', 10);

// Helper: Check if feature is enabled
const checkFeatureEnabled = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!REFERRAL_ENABLE) {
    return res.status(404).json({
      error: 'Feature disabled',
      message: 'Referral system is not enabled',
      version: VERSION
    });
  }
  next();
};

// Helper: Get client info
const getClientInfo = (req: express.Request) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
             req.socket.remoteAddress || 
             null;
  const ua = req.headers['user-agent'] || null;
  const deviceFingerprint = req.headers['x-device-fingerprint'] as string || null;
  
  return { ip, ua, deviceFingerprint };
};

// Helper: Parse UTM parameters
const parseUtmParams = (query: any) => {
  return {
    source: query.utm_source || null,
    medium: query.utm_medium || null,
    campaign: query.utm_campaign || null,
    term: query.utm_term || null,
    content: query.utm_content || null
  };
};

/**
 * GET /r/:code
 * Handle referral link clicks - log click and redirect to app
 */
router.get('/r/:code', checkFeatureEnabled, async (req, res) => {
  const { code } = req.params;
  const landingPath = (req.query.next as string) || '/';
  const { ip, ua, deviceFingerprint } = getClientInfo(req);
  const utm = parseUtmParams(req.query);
  
  try {
    // Validate referral code exists
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id, referral_code')
      .eq('referral_code', code)
      .single();
    
    if (referrerError || !referrer) {
      console.warn(`[Referral] Invalid referral code: ${code}`);
      // Still redirect, just don't set cookie
      return res.redirect(302, landingPath);
    }
    
    // Log the click
    await supabase
      .from('referral_clicks')
      .insert({
        ref_code: code,
        ip,
        ua,
        device_fingerprint: deviceFingerprint,
        landing_path: landingPath,
        utm
      });
    
    // Set referral cookie (90 days)
    res.cookie('ref_code', code, {
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      httpOnly: false, // Allow JS access for client-side attribution
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    console.log(`[Referral] Click logged for code: ${code}, redirecting to: ${landingPath}`);
    
    // Redirect with UTM params preserved
    const redirectUrl = new URL(landingPath, `${req.protocol}://${req.get('host')}`);
    if (utm.source) redirectUrl.searchParams.set('utm_source', utm.source);
    if (utm.medium) redirectUrl.searchParams.set('utm_medium', utm.medium);
    if (utm.campaign) redirectUrl.searchParams.set('utm_campaign', utm.campaign);
    
    return res.redirect(302, redirectUrl.pathname + redirectUrl.search);
    
  } catch (error: any) {
    console.error('[Referral] Error handling click:', error);
    // Fail gracefully - redirect anyway
    return res.redirect(302, landingPath);
  }
});

/**
 * POST /api/referrals/attribute
 * Attribute a referral to a user (called on first sign-in)
 */
router.post('/api/referrals/attribute', checkFeatureEnabled, async (req, res) => {
  const { userId, refCode } = req.body;
  const { ip, deviceFingerprint } = getClientInfo(req);
  
  if (!userId || !refCode) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'userId and refCode are required',
      version: VERSION
    });
  }
  
  try {
    // Check if user already has a referrer
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, referred_by')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        version: VERSION
      });
    }
    
    // Already attributed
    if (user.referred_by) {
      return res.json({
        data: { attributed: false, reason: 'already_attributed' },
        message: 'User already has a referrer',
        version: VERSION
      });
    }
    
    // Find referrer by code
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id, referral_code')
      .eq('referral_code', refCode)
      .single();
    
    if (referrerError || !referrer) {
      return res.json({
        data: { attributed: false, reason: 'invalid_code' },
        message: 'Invalid referral code',
        version: VERSION
      });
    }
    
    // Prevent self-referral
    if (referrer.id === userId) {
      return res.json({
        data: { attributed: false, reason: 'self_referral' },
        message: 'Cannot refer yourself',
        version: VERSION
      });
    }
    
    // Anti-abuse checks
    const flags: any = {};
    
    // Check device fingerprint abuse
    if (deviceFingerprint) {
      const { count } = await supabase
        .from('referral_attributions')
        .select('*', { count: 'exact', head: true })
        .eq('device_fingerprint', deviceFingerprint)
        .gte('attributed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if ((count || 0) >= MAX_SIGNUPS_PER_DEVICE_DAY) {
        flags.suspicious = true;
        flags.reason = 'device_limit_exceeded';
      }
    }
    
    // Check IP abuse
    if (ip) {
      const { count } = await supabase
        .from('referral_attributions')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('attributed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if ((count || 0) >= MAX_SIGNUPS_PER_IP_DAY) {
        flags.suspicious = true;
        flags.reason = flags.reason ? `${flags.reason},ip_limit_exceeded` : 'ip_limit_exceeded';
      }
    }
    
    // Skip attribution if suspicious (but don't block signup)
    if (flags.suspicious) {
      console.warn(`[Referral] Suspicious attribution blocked for user ${userId}: ${flags.reason}`);
      return res.json({
        data: { attributed: false, reason: 'abuse_detected' },
        message: 'Attribution blocked due to suspicious activity',
        version: VERSION
      });
    }
    
    // Create attribution
    const { error: attrError } = await supabase
      .from('referral_attributions')
      .insert({
        referrer_user_id: referrer.id,
        referee_user_id: userId,
        ref_code: refCode,
        ip,
        device_fingerprint: deviceFingerprint,
        flags
      });
    
    if (attrError) {
      // Unique constraint violation means already attributed
      if (attrError.code === '23505') {
        return res.json({
          data: { attributed: false, reason: 'already_attributed' },
          message: 'User already attributed',
          version: VERSION
        });
      }
      throw attrError;
    }
    
    // Update user's referred_by
    await supabase
      .from('users')
      .update({ 
        referred_by: referrer.id,
        first_login_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    // Mark the click as converted (if we can find it)
    await supabase
      .from('referral_clicks')
      .update({ 
        converted: true, 
        converted_user_id: userId 
      })
      .eq('ref_code', refCode)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1);
    
    console.log(`[Referral] Attribution successful: ${userId} -> ${referrer.id} (code: ${refCode})`);
    
    return res.json({
      data: { attributed: true, referrerId: referrer.id },
      message: 'Referral attributed successfully',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Referral] Attribution error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to attribute referral',
      version: VERSION
    });
  }
});

/**
 * POST /api/referrals/log-login
 * Log a user login (for active referral tracking)
 */
router.post('/api/referrals/log-login', checkFeatureEnabled, async (req, res) => {
  const { userId, source = 'web' } = req.body;
  const { ip, deviceFingerprint } = getClientInfo(req);
  
  if (!userId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'userId is required',
      version: VERSION
    });
  }
  
  try {
    // Log the login
    await supabase
      .from('auth_logins')
      .insert({
        user_id: userId,
        ip,
        device_fingerprint: deviceFingerprint,
        login_source: source
      });
    
    // Update user's last_login_at
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
    
    return res.json({
      data: { logged: true },
      message: 'Login logged',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Referral] Login log error:', error);
    // Don't fail the login if this fails
    return res.json({
      data: { logged: false },
      message: 'Failed to log login (non-blocking)',
      version: VERSION
    });
  }
});

/**
 * GET /api/leaderboard/referrals
 * Get referral leaderboard
 */
router.get('/api/leaderboard/referrals', checkFeatureEnabled, async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
  const period = (req.query.period as string) || 'all'; // all, 30d, 7d
  
  try {
    // Try materialized view first (fast)
    let query = supabase
      .from('referral_stats_mv')
      .select('*');
    
    // Sort by appropriate active count based on period
    if (period === '30d') {
      query = query.order('active_logins_30d', { ascending: false });
    } else {
      query = query.order('active_logins_all', { ascending: false });
    }
    
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) {
      // Fallback to direct query if MV doesn't exist
      console.warn('[Referral] MV query failed, using fallback:', error.message);
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          referral_code,
          og_badge
        `)
        .not('referral_code', 'is', null)
        .limit(limit);
      
      if (fallbackError) throw fallbackError;
      
      // Basic stats (without MV optimization)
      const items = await Promise.all((fallbackData || []).map(async (user: any) => {
        const { count: signups } = await supabase
          .from('referral_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_user_id', user.id);
        
        return {
          userId: user.id,
          username: user.username,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          ogBadge: user.og_badge,
          activeReferrals: signups || 0,
          totalSignups: signups || 0,
          totalClicks: 0
        };
      }));
      
      // Sort by active referrals
      items.sort((a, b) => b.activeReferrals - a.activeReferrals);
      
      return res.json({
        data: {
          items: items.slice(0, limit),
          updatedAt: new Date().toISOString()
        },
        message: 'Referral leaderboard fetched (fallback)',
        version: VERSION
      });
    }
    
    // Transform MV data to API format
    const items = (data || []).map((row: any) => ({
      userId: row.referrer_user_id,
      username: row.username,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      ogBadge: row.og_badge,
      activeReferrals: period === '30d' ? row.active_logins_30d : row.active_logins_all,
      totalSignups: row.total_signups,
      totalClicks: row.total_clicks,
      conversionRate: row.conversion_rate
    }));
    
    return res.json({
      data: {
        items,
        updatedAt: data?.[0]?.last_updated || new Date().toISOString()
      },
      message: 'Referral leaderboard fetched',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Referral] Leaderboard error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch leaderboard',
      version: VERSION
    });
  }
});

/**
 * GET /api/referrals/my-stats
 * Get current user's referral statistics
 */
router.get('/api/referrals/my-stats', checkFeatureEnabled, async (req, res) => {
  // This would normally use auth middleware to get userId
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'userId is required',
      version: VERSION
    });
  }
  
  try {
    // Get user's referral code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, referral_code')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        version: VERSION
      });
    }
    
    // Get stats
    const { count: totalSignups } = await supabase
      .from('referral_attributions')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_user_id', userId);
    
    const { count: totalClicks } = await supabase
      .from('referral_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('ref_code', user.referral_code);
    
    // Count active referrals (referees who have logged in)
    const { data: activeData } = await supabase
      .from('referral_attributions')
      .select(`
        referee_user_id,
        referee:users!referee_user_id(last_login_at)
      `)
      .eq('referrer_user_id', userId);
    
    const activeReferrals = (activeData || []).filter(
      (r: any) => r.referee?.last_login_at != null
    ).length;
    
    return res.json({
      data: {
        referralCode: user.referral_code,
        referralLink: `https://app.fanclubz.app/r/${user.referral_code}`,
        totalSignups: totalSignups || 0,
        totalClicks: totalClicks || 0,
        activeReferrals,
        conversionRate: totalClicks ? Math.round(((totalSignups || 0) / totalClicks) * 100) : 0
      },
      message: 'Referral stats fetched',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Referral] My stats error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch stats',
      version: VERSION
    });
  }
});

/**
 * POST /api/admin/referrals/refresh-stats
 * Refresh the materialized view (admin only)
 */
router.post('/api/admin/referrals/refresh-stats', checkFeatureEnabled, async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin key required',
      version: VERSION
    });
  }
  
  try {
    // Call the refresh function
    const { error } = await supabase.rpc('refresh_referral_stats');
    
    if (error) throw error;
    
    return res.json({
      data: { refreshed: true },
      message: 'Referral stats refreshed',
      version: VERSION
    });
    
  } catch (error: any) {
    console.error('[Referral] Refresh stats error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to refresh stats',
      version: VERSION
    });
  }
});

export default router;
