/**
 * Crypto testnet gate: 403 unless CRYPTO_MODE matches and client is in CRYPTO_ALLOWED_CLIENTS.
 * Optional: allow only when Origin is CRYPTO_ALLOWED_ORIGIN (extra safety).
 */

import { Request, Response, NextFunction } from 'express';
import { VERSION } from '@fanclubz/shared';
import { config } from '../config';

type CryptoModeGate = 'testnet' | 'mainnet';

export function requireCryptoEnabled(mode: CryptoModeGate) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cryptoMode = config.crypto.mode;
    const allowedClients = config.crypto.allowedClients;
    const client = (req as any).client || 'unknown';

    if (cryptoMode === 'off') {
      console.log(`[CRYPTO-GATE] Rejected: CRYPTO_MODE=off (client=${client})`);
      res.status(403).json({
        error: 'crypto_disabled_for_client',
        message: 'Crypto is not enabled for this environment',
        version: VERSION,
      });
      return;
    }

    if (cryptoMode !== mode) {
      console.log(`[CRYPTO-GATE] Rejected: mode mismatch want=${mode} config=${cryptoMode} (client=${client})`);
      res.status(403).json({
        error: 'crypto_disabled_for_client',
        message: `Crypto ${mode} is not enabled`,
        version: VERSION,
      });
      return;
    }

    if (!allowedClients.includes(client)) {
      console.log(`[CRYPTO-GATE] Rejected: client=${client} not in allowed=${allowedClients.join(',')}`);
      res.status(403).json({
        error: 'crypto_disabled_for_client',
        message: 'Crypto is not available for this client',
        version: VERSION,
      });
      return;
    }

    const origin = req.headers.origin;
    if (origin && config.crypto.allowedOrigin && origin !== config.crypto.allowedOrigin) {
      console.log(`[CRYPTO-GATE] Rejected: origin=${origin} not allowed (client=${client})`);
      res.status(403).json({
        error: 'crypto_disabled_for_client',
        message: 'Crypto is not available for this origin',
        version: VERSION,
      });
      return;
    }

    next();
  };
}

/**
 * Helper for use inside route handlers (e.g. shared route that has both demo and crypto path).
 * Returns true if current request is allowed to use crypto testnet.
 */
export function isCryptoAllowedForClient(req: Request): boolean {
  const cryptoMode = config.crypto.mode;
  const allowedClients = config.crypto.allowedClients;
  const client = (req as any).client || 'unknown';
  if (cryptoMode !== 'testnet' && cryptoMode !== 'mainnet') return false;
  if (!allowedClients.includes(client)) return false;
  const origin = req.headers.origin;
  if (origin && config.crypto.allowedOrigin && origin !== config.crypto.allowedOrigin) return false;
  return true;
}
