import { Router } from 'express';
import { VERSION } from '@fanclubz/shared';
import { runLegacyCryptoSnapshot } from '../../services/legacyCryptoSnapshot';
import { getFallbackAdminActorId, logAdminAction } from './audit';

export const systemAdminRouter = Router();

systemAdminRouter.post('/crypto-archive-snapshot', async (req, res) => {
  try {
    const snapshotVersionRaw = (req.body as any)?.snapshotVersion;
    const snapshotVersion =
      typeof snapshotVersionRaw === 'string' && snapshotVersionRaw.trim().length > 0
        ? snapshotVersionRaw.trim().slice(0, 128)
        : `zaurum-cutover-${new Date().toISOString()}`;

    const result = await runLegacyCryptoSnapshot(snapshotVersion);

    const actorId = getFallbackAdminActorId() || 'admin-system';

    await logAdminAction({
      actorId,
      action: 'legacy_crypto_snapshot_run',
      targetType: 'legacy_crypto',
      targetId: snapshotVersion,
      meta: { inserted: result.inserted },
    });

    return res.json({ ok: true, ...result, version: VERSION });
  } catch (error: any) {
    console.error('[Admin][System] crypto snapshot failed', error);
    return res.status(500).json({
      ok: false,
      error: 'SNAPSHOT_FAILED',
      message: error?.message || 'Failed to create crypto archive snapshot',
      version: VERSION,
    });
  }
});
