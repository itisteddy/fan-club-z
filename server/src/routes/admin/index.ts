import { Router } from 'express';
import { auditRouter, requireAdmin, logAdminAction } from './audit';
import { usersRouter } from './users';
import { walletsRouter } from './wallets';
import { predictionsRouter } from './predictions';
import { moderationRouter } from './moderation';
import { configRouter } from './config';
import { settlementsRouter } from './settlements';
import { supportRouter } from './support';
import { overviewRouter } from './overview';
import { categoriesRouter } from './categories';

export const adminRouter = Router();

// All admin routes require admin auth
adminRouter.use(requireAdmin);

// Mount sub-routers
adminRouter.use('/audit', auditRouter);
adminRouter.use('/overview', overviewRouter);
adminRouter.use('/users', usersRouter);
adminRouter.use('/wallets', walletsRouter);
adminRouter.use('/predictions', predictionsRouter);
adminRouter.use('/moderation', moderationRouter);
adminRouter.use('/config', configRouter);
adminRouter.use('/settlements', settlementsRouter);
adminRouter.use('/support', supportRouter);
adminRouter.use('/categories', categoriesRouter);

// Export helpers for use in other admin routes
export { requireAdmin, logAdminAction };

