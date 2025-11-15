import { Router } from 'express';
import { placeBetRouter } from './predictions/placeBet';

// Thin wrapper to expose the same idempotent bet placement routes under /api/v2/bets
const router = Router();

// This provides POST /api/v2/bets/:predictionId/place-bet with identical behavior
router.use('/', placeBetRouter);

export default router;
