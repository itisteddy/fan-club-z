import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';

export const configRouter = Router();

// In-memory cache for fast config reads
let configCache: Record<string, any> = {};
let configCacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Load all config from database
 */
async function loadConfig(): Promise<Record<string, any>> {
  const now = Date.now();
  if (configCacheTime > 0 && now - configCacheTime < CACHE_TTL) {
    return configCache;
  }

  const { data, error } = await supabase
    .from('app_config')
    .select('key, value, value_type');

  if (error) {
    console.warn('[Config] Failed to load config:', error);
    return configCache; // Return stale cache on error
  }

  const config: Record<string, any> = {};
  for (const row of data || []) {
    config[row.key] = parseConfigValue(row.value, row.value_type);
  }

  configCache = config;
  configCacheTime = now;
  return config;
}

function parseConfigValue(value: string, valueType: string): any {
  switch (valueType) {
    case 'boolean':
      return value === 'true';
    case 'number':
      return Number(value);
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

function stringifyConfigValue(value: any): { value: string; valueType: string } {
  if (typeof value === 'boolean') {
    return { value: String(value), valueType: 'boolean' };
  }
  if (typeof value === 'number') {
    return { value: String(value), valueType: 'number' };
  }
  if (typeof value === 'object') {
    return { value: JSON.stringify(value), valueType: 'json' };
  }
  return { value: String(value), valueType: 'string' };
}

/**
 * GET /api/v2/admin/config
 * Get all config values
 */
configRouter.get('/', async (req, res) => {
  try {
    const config = await loadConfig();
    return res.json({
      config,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Config] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load config',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/config/:key
 * Get a specific config value
 */
configRouter.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const config = await loadConfig();
    
    if (!(key in config)) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Config key '${key}' not found`,
        version: VERSION,
      });
    }

    return res.json({
      key,
      value: config[key],
      version: VERSION,
    });
  } catch (error) {
    console.error('[Config] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load config',
      version: VERSION,
    });
  }
});

const SetConfigSchema = z.object({
  value: z.any(),
  actorId: z.string().uuid(),
});

/**
 * PUT /api/v2/admin/config/:key
 * Set a config value
 */
configRouter.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const parsed = SetConfigSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { value, actorId } = parsed.data;
    const { value: stringValue, valueType } = stringifyConfigValue(value);

    // Upsert config
    const { error } = await supabase
      .from('app_config')
      .upsert({
        key,
        value: stringValue,
        value_type: valueType,
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      }, { onConflict: 'key' });

    if (error) {
      console.error('[Config] Set error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to set config',
        version: VERSION,
      });
    }

    // Invalidate cache
    configCacheTime = 0;

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'config_update',
      targetType: 'config',
      targetId: key,
      meta: {
        newValue: value,
      },
    });

    return res.json({
      success: true,
      key,
      value,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Config] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set config',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/config/maintenance
 * Toggle maintenance mode
 */
configRouter.post('/maintenance', async (req, res) => {
  try {
    const { enabled, message, actorId } = req.body;

    if (typeof enabled !== 'boolean' || !actorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'enabled (boolean) and actorId are required',
        version: VERSION,
      });
    }

    // Set maintenance mode
    await supabase.from('app_config').upsert([
      {
        key: 'maintenance_mode',
        value: String(enabled),
        value_type: 'boolean',
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      },
      {
        key: 'maintenance_message',
        value: message || 'The platform is currently under maintenance. Please check back soon.',
        value_type: 'string',
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      },
    ], { onConflict: 'key' });

    // Invalidate cache
    configCacheTime = 0;

    // Log admin action
    await logAdminAction({
      actorId,
      action: enabled ? 'maintenance_enable' : 'maintenance_disable',
      targetType: 'config',
      targetId: 'maintenance_mode',
      meta: {
        message,
      },
    });

    return res.json({
      success: true,
      maintenanceMode: enabled,
      message: message || null,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Config] Maintenance error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to toggle maintenance mode',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/config/feature-flags
 * Update feature flags
 */
configRouter.post('/feature-flags', async (req, res) => {
  try {
    const { flags, actorId } = req.body;

    if (!flags || typeof flags !== 'object' || !actorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'flags (object) and actorId are required',
        version: VERSION,
      });
    }

    // Get current flags
    const config = await loadConfig();
    const currentFlags = config.feature_flags || {};
    const newFlags = { ...currentFlags, ...flags };

    // Save merged flags
    await supabase.from('app_config').upsert({
      key: 'feature_flags',
      value: JSON.stringify(newFlags),
      value_type: 'json',
      updated_at: new Date().toISOString(),
      updated_by: actorId,
    }, { onConflict: 'key' });

    // Invalidate cache
    configCacheTime = 0;

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'feature_flags_update',
      targetType: 'config',
      targetId: 'feature_flags',
      meta: {
        changes: flags,
      },
    });

    return res.json({
      success: true,
      featureFlags: newFlags,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Config] Feature flags error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update feature flags',
      version: VERSION,
    });
  }
});

// Export config loader for use in middleware
export { loadConfig };

