import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';

export const supportRouter = Router();

/**
 * GET /api/v2/admin/support/user/:userId/timeline
 * Comprehensive timeline of all user activity for support investigations
 */
supportRouter.get('/user/:userId/timeline', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(200, Number(req.query.limit) || 100);
    const types = (req.query.types as string)?.split(',') || ['all'];

    // Fetch all relevant data in parallel
    const [
      { data: profile },
      { data: walletTx },
      { data: entries },
      { data: predictions },
      { data: comments },
      { data: escrowLocks },
      { data: referrals },
    ] = await Promise.all([
      // User profile
      supabase
        .from('users')
        .select('id, username, full_name, email, created_at, is_banned, is_verified, avatar_url')
        .eq('id', userId)
        .maybeSingle(),
      // Wallet transactions
      supabase
        .from('wallet_transactions')
        .select('id, created_at, type, direction, channel, provider, amount, currency, status, description, prediction_id, tx_hash')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      // Prediction entries
      supabase
        .from('prediction_entries')
        .select('id, created_at, prediction_id, option_id, amount, provider, status, predictions!inner(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      // Created predictions
      supabase
        .from('predictions')
        .select('id, created_at, title, status, end_date, winning_option_id')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      // Comments
      supabase
        .from('comments')
        .select('id, created_at, content, prediction_id, predictions!inner(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      // Escrow locks
      supabase
        .from('escrow_locks')
        .select('id, created_at, amount, status, prediction_id, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      // Referrals (user as referrer)
      supabase
        .from('referrals')
        .select('id, created_at, referred_user_id, status')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        version: VERSION,
      });
    }

    // Build unified timeline
    const timeline: Array<{
      id: string;
      timestamp: string;
      type: string;
      category: string;
      title: string;
      description: string;
      amount?: number;
      status?: string;
      meta?: Record<string, unknown>;
    }> = [];

    // Add wallet transactions
    if (types.includes('all') || types.includes('wallet')) {
      for (const tx of walletTx || []) {
        timeline.push({
          id: `wallet-${tx.id}`,
          timestamp: tx.created_at,
          type: tx.type,
          category: 'wallet',
          title: `${tx.direction === 'credit' ? 'Received' : 'Sent'} ${tx.channel}`,
          description: tx.description || `${tx.channel} via ${tx.provider}`,
          amount: tx.direction === 'credit' ? Number(tx.amount) : -Number(tx.amount),
          status: tx.status,
          meta: {
            provider: tx.provider,
            channel: tx.channel,
            predictionId: tx.prediction_id,
            txHash: tx.tx_hash,
          },
        });
      }
    }

    // Add prediction entries (bets)
    if (types.includes('all') || types.includes('bets')) {
      for (const entry of entries || []) {
        const prediction = (entry as any).predictions;
        timeline.push({
          id: `entry-${entry.id}`,
          timestamp: entry.created_at,
          type: 'bet_placed',
          category: 'bets',
          title: 'Placed Bet',
          description: prediction?.title || 'Unknown prediction',
          amount: -Number(entry.amount),
          status: entry.status,
          meta: {
            predictionId: entry.prediction_id,
            optionId: entry.option_id,
            provider: entry.provider,
          },
        });
      }
    }

    // Add created predictions
    if (types.includes('all') || types.includes('predictions')) {
      for (const pred of predictions || []) {
        timeline.push({
          id: `pred-${pred.id}`,
          timestamp: pred.created_at,
          type: 'prediction_created',
          category: 'predictions',
          title: 'Created Prediction',
          description: pred.title,
          status: pred.status,
          meta: {
            predictionId: pred.id,
            endDate: pred.end_date,
            winningOptionId: pred.winning_option_id,
          },
        });
      }
    }

    // Add comments
    if (types.includes('all') || types.includes('comments')) {
      for (const comment of comments || []) {
        const prediction = (comment as any).predictions;
        timeline.push({
          id: `comment-${comment.id}`,
          timestamp: comment.created_at,
          type: 'comment',
          category: 'comments',
          title: 'Commented',
          description: `"${(comment.content || '').slice(0, 100)}${(comment.content || '').length > 100 ? '...' : ''}"`,
          meta: {
            predictionId: comment.prediction_id,
            predictionTitle: prediction?.title,
          },
        });
      }
    }

    // Add escrow locks
    if (types.includes('all') || types.includes('escrow')) {
      for (const lock of escrowLocks || []) {
        timeline.push({
          id: `escrow-${lock.id}`,
          timestamp: lock.created_at,
          type: 'escrow_lock',
          category: 'escrow',
          title: 'Escrow Lock',
          description: `Locked $${Number(lock.amount).toFixed(2)} for prediction`,
          amount: Number(lock.amount),
          status: lock.status,
          meta: {
            predictionId: lock.prediction_id,
            expiresAt: lock.expires_at,
          },
        });
      }
    }

    // Add referrals
    if (types.includes('all') || types.includes('referrals')) {
      for (const ref of referrals || []) {
        timeline.push({
          id: `ref-${ref.id}`,
          timestamp: ref.created_at,
          type: 'referral',
          category: 'referrals',
          title: 'Referral',
          description: `Referred user ${ref.referred_user_id.slice(0, 8)}...`,
          status: ref.status,
          meta: {
            referredUserId: ref.referred_user_id,
          },
        });
      }
    }

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate summary stats
    const stats = {
      totalDeposits: (walletTx || [])
        .filter(t => t.direction === 'credit' && t.channel === 'deposit')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalWithdrawals: (walletTx || [])
        .filter(t => t.direction === 'debit' && t.channel === 'withdraw')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalBets: (entries || []).length,
      totalBetAmount: (entries || []).reduce((sum, e) => sum + Number(e.amount), 0),
      predictionsCreated: (predictions || []).length,
      commentsCount: (comments || []).length,
      referralsCount: (referrals || []).length,
      accountAge: profile.created_at 
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) 
        : 0,
    };

    return res.json({
      user: {
        id: profile.id,
        username: profile.username,
        fullName: profile.full_name,
        email: profile.email,
        createdAt: profile.created_at,
        isBanned: profile.is_banned,
        isVerified: profile.is_verified,
        avatarUrl: profile.avatar_url,
      },
      stats,
      timeline: timeline.slice(0, limit),
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Support] Timeline error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user timeline',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/support/prediction/:predictionId/investigation
 * Comprehensive prediction investigation view
 */
supportRouter.get('/prediction/:predictionId/investigation', async (req, res) => {
  try {
    const { predictionId } = req.params;

    // Fetch all relevant data
    const [
      { data: prediction },
      { data: options },
      { data: entries },
      { data: comments },
      { data: settlement },
      { data: job },
      { data: walletTx },
    ] = await Promise.all([
      supabase
        .from('predictions')
        .select(`
          *,
          users!predictions_creator_id_fkey(id, username, full_name, email, is_banned, is_verified)
        `)
        .eq('id', predictionId)
        .maybeSingle(),
      supabase
        .from('prediction_options')
        .select('*')
        .eq('prediction_id', predictionId),
      supabase
        .from('prediction_entries')
        .select('*, users!prediction_entries_user_id_fkey(username, full_name)')
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('comments')
        .select('*, users!comments_user_id_fkey(username, full_name)')
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('bet_settlements')
        .select('*')
        .eq('bet_id', predictionId)
        .maybeSingle(),
      supabase
        .from('settlement_finalize_jobs')
        .select('*')
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false }),
    ]);

    if (!prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    // Calculate statistics
    const entryStats = {
      total: (entries || []).length,
      uniqueUsers: new Set((entries || []).map(e => e.user_id)).size,
      totalStake: (entries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0),
      byOption: {} as Record<string, { count: number; stake: number; users: string[] }>,
      byProvider: {} as Record<string, { count: number; stake: number }>,
      byStatus: {} as Record<string, number>,
    };

    for (const entry of entries || []) {
      // By option
      if (!entryStats.byOption[entry.option_id]) {
        entryStats.byOption[entry.option_id] = { count: 0, stake: 0, users: [] };
      }
      entryStats.byOption[entry.option_id].count++;
      entryStats.byOption[entry.option_id].stake += Number(entry.amount || 0);
      if (!entryStats.byOption[entry.option_id].users.includes(entry.user_id)) {
        entryStats.byOption[entry.option_id].users.push(entry.user_id);
      }

      // By provider
      const provider = entry.provider || 'unknown';
      if (!entryStats.byProvider[provider]) {
        entryStats.byProvider[provider] = { count: 0, stake: 0 };
      }
      entryStats.byProvider[provider].count++;
      entryStats.byProvider[provider].stake += Number(entry.amount || 0);

      // By status
      entryStats.byStatus[entry.status] = (entryStats.byStatus[entry.status] || 0) + 1;
    }

    // Payout stats
    const payoutStats = {
      total: (walletTx || []).filter(t => t.channel === 'payout').length,
      totalAmount: (walletTx || [])
        .filter(t => t.channel === 'payout')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
      creatorFees: (walletTx || [])
        .filter(t => t.channel === 'creator_fee')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
      platformFees: (walletTx || [])
        .filter(t => t.channel === 'platform_fee')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    };

    return res.json({
      prediction: {
        id: prediction.id,
        title: prediction.title,
        description: prediction.description,
        status: prediction.status,
        createdAt: prediction.created_at,
        endDate: prediction.end_date,
        resolutionDate: prediction.resolution_date,
        winningOptionId: prediction.winning_option_id,
        platformFee: prediction.platform_fee_percentage,
        creatorFee: prediction.creator_fee_percentage,
      },
      creator: prediction.profiles ? {
        id: (prediction.profiles as any).id,
        username: (prediction.profiles as any).username,
        fullName: (prediction.profiles as any).full_name,
        email: (prediction.profiles as any).email,
        isBanned: (prediction.profiles as any).is_banned,
        isVerified: (prediction.profiles as any).is_verified,
      } : null,
      options: (options || []).map(o => ({
        ...o,
        stats: entryStats.byOption[o.id] || { count: 0, stake: 0, users: [] },
      })),
      entryStats,
      payoutStats,
      entries: (entries || []).slice(0, 100).map(e => ({
        id: e.id,
        userId: e.user_id,
        username: (e as any).profiles?.username,
        optionId: e.option_id,
        amount: e.amount,
        provider: e.provider,
        status: e.status,
        createdAt: e.created_at,
      })),
      comments: (comments || []).map(c => ({
        id: c.id,
        userId: c.user_id,
        username: (c as any).profiles?.username,
        content: c.content,
        createdAt: c.created_at,
      })),
      settlement: settlement || null,
      job: job || null,
      transactions: walletTx || [],
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Support] Investigation error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch investigation data',
      version: VERSION,
    });
  }
});

const AddNoteSchema = z.object({
  actorId: z.string().uuid(),
  note: z.string().min(1).max(2000),
  category: z.enum(['general', 'issue', 'resolution', 'warning']).default('general'),
});

/**
 * POST /api/v2/admin/support/user/:userId/notes
 * Add a support note to a user's record
 */
supportRouter.post('/user/:userId/notes', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = AddNoteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId, note, category } = parsed.data;

    // Insert note
    const { data: created, error } = await supabase
      .from('support_notes')
      .insert({
        user_id: userId,
        author_id: actorId,
        note,
        category,
      })
      .select('id, created_at')
      .single();

    if (error) {
      // Table might not exist
      console.warn('[Admin/Support] Note insert error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add note (table may not exist)',
        version: VERSION,
      });
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'support_note_added',
      targetType: 'user',
      targetId: userId,
      meta: { noteId: created.id, category },
    });

    return res.json({
      success: true,
      noteId: created.id,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Support] Add note error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add note',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/support/user/:userId/notes
 * Get support notes for a user
 */
supportRouter.get('/user/:userId/notes', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: notes, error } = await supabase
      .from('support_notes')
      .select('id, note, category, created_at, author_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist
      return res.json({ notes: [], version: VERSION });
    }

    return res.json({
      notes: notes || [],
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Support] Get notes error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notes',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/support/search
 * Global search across users, predictions, transactions
 */
supportRouter.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query must be at least 2 characters',
        version: VERSION,
      });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    const isEmail = q.includes('@');
    const isTxHash = /^0x[0-9a-f]{64}$/i.test(q);

    const results: {
      users: any[];
      predictions: any[];
      transactions: any[];
    } = {
      users: [],
      predictions: [],
      transactions: [],
    };

    // Search users
    if (isUuid) {
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, email')
        .eq('id', q)
        .limit(1);
      results.users = data || [];
    } else if (isEmail) {
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, email')
        .ilike('email', `%${q}%`)
        .limit(10);
      results.users = data || [];
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, email')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(10);
      results.users = data || [];
    }

    // Search predictions
    if (isUuid) {
      const { data } = await supabase
        .from('predictions')
        .select('id, title, status, created_at')
        .eq('id', q)
        .limit(1);
      results.predictions = data || [];
    } else {
      const { data } = await supabase
        .from('predictions')
        .select('id, title, status, created_at')
        .ilike('title', `%${q}%`)
        .limit(10);
      results.predictions = data || [];
    }

    // Search transactions by tx_hash
    if (isTxHash) {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, channel, provider, status, created_at, tx_hash')
        .eq('tx_hash', q)
        .limit(10);
      results.transactions = data || [];
    }

    return res.json({
      query: q,
      results,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Support] Search error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Search failed',
      version: VERSION,
    });
  }
});

