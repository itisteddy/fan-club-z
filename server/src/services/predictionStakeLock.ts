import { ensureDbPool } from '../utils/dbPool';

export class PredictionStakeLockError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type PredictionStakeLockHandle = {
  release: (commit?: boolean) => Promise<void>;
};

/**
 * Cooperative app-level mutex for stake mutations.
 *
 * Uses pg advisory xact locks on the prediction id so stake submits against the same market
 * are serialized across app requests that opt into this lock.
 *
 * This is not a full SQL transaction for all Supabase writes, but it meaningfully narrows
 * the race window without a high-risk route rewrite immediately before release.
 */
export async function beginPredictionStakeLock(predictionId: string): Promise<PredictionStakeLockHandle> {
  const pool = await ensureDbPool();
  if (!pool) {
    throw new PredictionStakeLockError(
      'DB_LOCK_UNAVAILABLE',
      'Database transaction pool is unavailable for stake locking',
      503
    );
  }

  const client = await pool.connect();
  let done = false;
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
      ['stake_prediction', String(predictionId)]
    );

    return {
      release: async (commit = true) => {
        if (done) return;
        done = true;
        try {
          await client.query(commit ? 'COMMIT' : 'ROLLBACK');
        } finally {
          client.release();
        }
      },
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    client.release();
    throw error;
  }
}

