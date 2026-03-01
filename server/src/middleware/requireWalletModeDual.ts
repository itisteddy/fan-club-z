import { Request, Response, NextFunction } from 'express';
import { VERSION } from '@fanclubz/shared';
import { config } from '../config';

export function isZaurumOnlyMode(): boolean {
  return config.features.walletMode === 'zaurum_only';
}

export function requireWalletModeDual(req: Request, res: Response, next: NextFunction): void {
  if (!isZaurumOnlyMode()) {
    next();
    return;
  }

  res.status(410).json({
    error: 'crypto_disabled_zaurum_only',
    message: 'Crypto features are disabled in the current wallet mode.',
    version: VERSION,
  });
}
