import { Request, Response, NextFunction } from 'express';
import { loadConfig } from '../routes/admin/config';

/**
 * Middleware to check maintenance mode
 * Blocks all non-admin requests when maintenance mode is enabled
 */
export async function checkMaintenanceMode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip maintenance check for admin routes and health checks
    if (
      req.path.startsWith('/api/v2/admin') ||
      req.path === '/health' ||
      req.path === '/' ||
      req.headers['x-admin-key'] // Admin API key bypasses maintenance
    ) {
      return next();
    }

    const config = await loadConfig();
    const maintenanceMode = config.maintenance_mode === true;

    if (maintenanceMode) {
      const message = config.maintenance_message || 'The platform is currently under maintenance. Please check back soon.';
      
      res.status(503).json({
        error: 'Service Unavailable',
        message,
        maintenance: true,
        version: process.env.VERSION || 'unknown',
      });
      return;
    }

    next();
  } catch (error) {
    // On error, allow request through (fail open)
    console.error('[Maintenance] Error checking maintenance mode:', error);
    next();
  }
}
