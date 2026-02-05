/**
 * Client identification middleware: reads X-FCZ-Client and sets req.client.
 * Used for crypto testnet gating (web-only) and request logging.
 */

import { Request, Response, NextFunction } from 'express';

const ALLOWED = ['web', 'ios', 'android', 'admin'] as const;
export type ClientId = (typeof ALLOWED)[number] | 'unknown';

declare global {
  namespace Express {
    interface Request {
      client?: ClientId;
    }
  }
}

export function clientIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const raw = (req.headers['x-fcz-client'] as string)?.trim()?.toLowerCase();
  if (raw && ALLOWED.includes(raw as any)) {
    req.client = raw as ClientId;
  } else {
    req.client = 'unknown';
  }
  next();
}
