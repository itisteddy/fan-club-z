/**
 * Phase 5: Require that the authenticated user has accepted current Terms/Privacy/Community Guidelines.
 * Must run after requireSupabaseAuth (req.user must be set).
 */

import type { Response, NextFunction } from 'express';
import { hasAcceptedTerms } from '../services/termsAcceptance';
import type { AuthenticatedRequest } from './auth';

export async function requireTermsAccepted(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required' });
  }
  const accepted = await hasAcceptedTerms(userId);
  if (!accepted) {
    return res.status(403).json({
      error: 'terms_required',
      message: 'You must accept the Terms of Service, Privacy Policy, and Community Guidelines to post or use UGC features.',
      code: 'TERMS_NOT_ACCEPTED',
    });
  }
  return next();
}
