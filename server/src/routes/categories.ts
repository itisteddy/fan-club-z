import express from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = express.Router();

/**
 * GET /api/v2/categories
 * Returns all enabled categories sorted by sort_order
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, label, icon, sort_order')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[categories] Error fetching categories:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch categories',
        version: VERSION,
      });
    }

    return res.json({
      success: true,
      data: (data || []).map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        label: cat.label,
        icon: cat.icon,
        sortOrder: cat.sort_order,
      })),
      version: VERSION,
    });
  } catch (error) {
    console.error('[categories] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch categories',
      version: VERSION,
    });
  }
});

export default router;
