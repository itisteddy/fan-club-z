import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = Router();

/**
 * Helper to resolve authenticated user ID from request
 */
async function resolveAuthenticatedUserId(req: any): Promise<string | null> {
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

/**
 * GET /api/v2/notifications
 * Get user's notifications (paged, newest first)
 * Query params:
 * - limit: number (default 20, max 100)
 * - cursor: string (created_at ISO timestamp or id for pagination)
 */
router.get('/', async (req, res) => {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const cursor = (req.query.cursor as string) || null;

    // Build query
    let query = supabase
      .from('notifications')
      .select('id, type, title, body, href, metadata, read_at, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    // Apply cursor if provided (pagination)
    if (cursor) {
      // Try parsing as ISO timestamp first
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query = query.lt('created_at', cursor);
      } else {
        // Fallback: use as ID (less precise but works)
        query = query.lt('id', cursor);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Notifications] Fetch error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch notifications',
        version: VERSION,
      });
    }

    const items = (data || []).slice(0, limit); // Remove the extra item
    const hasMore = (data || []).length > limit;
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor = hasMore && lastItem ? lastItem.created_at : undefined;

    // Count unread notifications
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    return res.json({
      items: items.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        metadata: n.metadata || {},
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
      unreadCount: unreadCount || 0,
      nextCursor,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notifications',
      version: VERSION,
    });
  }
});

const MarkReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * POST /api/v2/notifications/mark-read
 * Mark one or more notifications as read
 * Body: { ids: string[] }
 */
router.post('/mark-read', async (req, res) => {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }

    const parsed = MarkReadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { ids } = parsed.data;

    // Update read_at for notifications that belong to this user
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', ids)
      .is('read_at', null); // Only update unread notifications

    if (error) {
      console.error('[Notifications] Mark read error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark notifications as read',
        version: VERSION,
      });
    }

    return res.json({
      success: true,
      marked: ids.length,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark notifications as read',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/notifications/mark-all-read
 * Mark all unread notifications as read for the authenticated user
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        version: VERSION,
      });
    }

    // Update all unread notifications for this user
    // First get count, then update
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('[Notifications] Mark all read error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark all notifications as read',
        version: VERSION,
      });
    }

    return res.json({
      success: true,
      marked: unreadCount || 0,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark all notifications as read',
      version: VERSION,
    });
  }
});

export default router;
