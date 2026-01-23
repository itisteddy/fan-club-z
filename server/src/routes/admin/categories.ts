import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';

export const categoriesRouter = Router();

/**
 * GET /api/v2/admin/categories
 * Returns all categories including disabled (for admin management)
 */
categoriesRouter.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, label, icon, sort_order, is_enabled, created_at')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[admin/categories] Error fetching categories:', error);
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
        isEnabled: cat.is_enabled,
        createdAt: cat.created_at,
      })),
      version: VERSION,
    });
  } catch (error) {
    console.error('[admin/categories] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch categories',
      version: VERSION,
    });
  }
});

const CreateCategorySchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Slug must be lowercase alphanumeric with underscores'),
  label: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * POST /api/v2/admin/categories
 * Create a new category
 */
categoriesRouter.post('/', async (req, res) => {
  try {
    const parsed = CreateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid category data',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { slug, label, icon, sortOrder, isEnabled } = parsed.data;

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Category with this slug already exists',
        version: VERSION,
      });
    }

    // Get max sort_order to set default
    const { data: maxSort } = await supabase
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const finalSortOrder = sortOrder ?? ((maxSort?.sort_order ?? -1) + 1);

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        slug: slug.toLowerCase(),
        label,
        icon: icon || null,
        sort_order: finalSortOrder,
        is_enabled: isEnabled ?? true,
      })
      .select('id, slug, label, icon, sort_order, is_enabled, created_at')
      .single();

    if (error) {
      console.error('[admin/categories] Error creating category:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create category',
        version: VERSION,
      });
    }

    // Audit log
    await logAdminAction({
      actorId: (req as any).actorId || 'system',
      action: 'admin_category_create',
      targetType: 'category',
      targetId: newCategory.id,
      meta: { slug, label, icon, sortOrder: finalSortOrder, isEnabled: isEnabled ?? true },
    }).catch((e) => console.error('[admin/categories] Audit log failed:', e));

    return res.status(201).json({
      success: true,
      data: {
        id: newCategory.id,
        slug: newCategory.slug,
        label: newCategory.label,
        icon: newCategory.icon,
        sortOrder: newCategory.sort_order,
        isEnabled: newCategory.is_enabled,
        createdAt: newCategory.created_at,
      },
      version: VERSION,
    });
  } catch (error) {
    console.error('[admin/categories] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create category',
      version: VERSION,
    });
  }
});

const UpdateCategorySchema = z.object({
  label: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * PATCH /api/v2/admin/categories/:id
 * Update category (idempotent)
 */
categoriesRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = UpdateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid update data',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const updates: any = {};
    if (parsed.data.label !== undefined) updates.label = parsed.data.label;
    if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon || null;
    if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;
    if (parsed.data.isEnabled !== undefined) updates.is_enabled = parsed.data.isEnabled;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update',
        version: VERSION,
      });
    }

    const { data: updated, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select('id, slug, label, icon, sort_order, is_enabled, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Category not found',
          version: VERSION,
        });
      }
      console.error('[admin/categories] Error updating category:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update category',
        version: VERSION,
      });
    }

    // Audit log
    await logAdminAction({
      actorId: (req as any).actorId || 'system',
      action: 'admin_category_update',
      targetType: 'category',
      targetId: id,
      meta: { updates: parsed.data },
    }).catch((e) => console.error('[admin/categories] Audit log failed:', e));

    return res.json({
      success: true,
      data: {
        id: updated.id,
        slug: updated.slug,
        label: updated.label,
        icon: updated.icon,
        sortOrder: updated.sort_order,
        isEnabled: updated.is_enabled,
        createdAt: updated.created_at,
      },
      version: VERSION,
    });
  } catch (error) {
    console.error('[admin/categories] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update category',
      version: VERSION,
    });
  }
});
