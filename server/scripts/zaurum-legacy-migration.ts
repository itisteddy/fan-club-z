#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.staging') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MIGRATION_VERSION = 'zaurum_migration_v1';
const CONVERSION_DIVISOR = 10;
const CAP_ZAURUM = 250;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    limit: Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0) || null,
    userIds: (args.find((a) => a.startsWith('--user-ids='))?.split('=')[1] || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

function round8(value: number): number {
  return Math.round((Number(value) || 0) * 1e8) / 1e8;
}

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const dbUrl =
    process.env.MIGRATION_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('DATABASE URL missing (MIGRATION_DATABASE_URL/SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL)');
  }

  const args = parseArgs();
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const where: string[] = ["currency = 'DEMO_USD'"];
    const params: any[] = [];
    if (args.userIds.length > 0) {
      params.push(args.userIds);
      where.push(`user_id = ANY($${params.length}::uuid[])`);
    }

    const limitSql = args.limit ? `LIMIT ${Math.max(1, args.limit)}` : '';
    const sql = `
      SELECT
        user_id,
        currency,
        available_balance,
        reserved_balance,
        demo_credits_balance,
        claim_zaurum_balance,
        won_zaurum_balance,
        creator_fee_zaurum_balance,
        legacy_migrated_zaurum_balance,
        legacy_migration_version
      FROM wallets
      WHERE ${where.join(' AND ')}
      ORDER BY user_id
      ${limitSql}
    `;
    const rows = (await client.query(sql, params)).rows;

    const report = rows.map((row) => {
      const alreadyMigrated = String(row.legacy_migration_version || '') === MIGRATION_VERSION;
      const legacyDemo = Math.max(0, toNum(row.demo_credits_balance ?? row.available_balance));
      const convertedUncapped = round8(legacyDemo / CONVERSION_DIVISOR);
      const convertedCapped = round8(Math.min(convertedUncapped, CAP_ZAURUM));
      const trimmed = round8(convertedUncapped - convertedCapped);
      return {
        userId: row.user_id,
        alreadyMigrated,
        legacyDemoCredits: legacyDemo,
        convertedUncapped,
        convertedCapped,
        trimmed,
      };
    });

    const summary = {
      totalUsersScanned: report.length,
      alreadyMigrated: report.filter((r) => r.alreadyMigrated).length,
      pendingMigration: report.filter((r) => !r.alreadyMigrated).length,
      totalLegacyDemoCreditsPending: round8(
        report.filter((r) => !r.alreadyMigrated).reduce((sum, r) => sum + r.legacyDemoCredits, 0)
      ),
      totalConvertedUncappedPending: round8(
        report.filter((r) => !r.alreadyMigrated).reduce((sum, r) => sum + r.convertedUncapped, 0)
      ),
      totalConvertedCappedPending: round8(
        report.filter((r) => !r.alreadyMigrated).reduce((sum, r) => sum + r.convertedCapped, 0)
      ),
      totalTrimmedPending: round8(
        report.filter((r) => !r.alreadyMigrated).reduce((sum, r) => sum + r.trimmed, 0)
      ),
    };

    if (!args.apply) {
      console.log(
        JSON.stringify(
          {
            mode: 'dry-run',
            conversion: `${CONVERSION_DIVISOR}:1`,
            capZaurum: CAP_ZAURUM,
            migrationVersion: MIGRATION_VERSION,
            summary,
            sample: report.slice(0, 50),
          },
          null,
          2
        )
      );
      return;
    }

    const applied: Array<{ userId: string; credited: number; alreadyMigrated: boolean }> = [];
    for (const row of report) {
      if (row.alreadyMigrated) {
        applied.push({ userId: row.userId, credited: 0, alreadyMigrated: true });
        continue;
      }

      await client.query('BEGIN');
      try {
        const lock = await client.query(
          `SELECT
             available_balance,
             demo_credits_balance,
             legacy_migrated_zaurum_balance,
             legacy_migration_version
           FROM wallets
           WHERE user_id = $1 AND currency = 'DEMO_USD'
           FOR UPDATE`,
          [row.userId]
        );
        const wallet = lock.rows[0];
        if (!wallet) {
          await client.query('ROLLBACK');
          continue;
        }
        const already = String(wallet.legacy_migration_version || '') === MIGRATION_VERSION;
        if (already) {
          await client.query('ROLLBACK');
          applied.push({ userId: row.userId, credited: 0, alreadyMigrated: true });
          continue;
        }

        const prevAvail = toNum(wallet.available_balance);
        const prevDemo = toNum(wallet.demo_credits_balance ?? wallet.available_balance);
        const prevMigrated = toNum(wallet.legacy_migrated_zaurum_balance);

        const nextAvail = round8(prevAvail + row.convertedCapped);
        const nextDemo = round8(prevDemo + row.convertedCapped);
        const nextMigrated = round8(prevMigrated + row.convertedCapped);

        await client.query(
          `UPDATE wallets
           SET
             available_balance = $2,
             demo_credits_balance = $3,
             legacy_migrated_zaurum_balance = $4,
             legacy_migration_version = $5,
             legacy_migration_completed_at = NOW(),
             legacy_migration_demo_credits = $6,
             legacy_migration_uncapped_zaurum = $7,
             legacy_migration_cap_zaurum = $8,
             updated_at = NOW()
           WHERE user_id = $1 AND currency = 'DEMO_USD'`,
          [
            row.userId,
            nextAvail,
            nextDemo,
            nextMigrated,
            MIGRATION_VERSION,
            row.legacyDemoCredits,
            row.convertedUncapped,
            CAP_ZAURUM,
          ]
        );

        await client.query(
          `INSERT INTO wallet_transactions (
             user_id, direction, type, channel, provider, amount, currency, status, external_ref, source_bucket, description, meta, created_at
           ) VALUES (
             $1, 'credit', 'deposit', 'fiat', 'demo-wallet', $2, 'DEMO_USD', 'completed', $3, 'legacy_migrated_zaurum', $4, $5::jsonb, NOW()
           )
           ON CONFLICT (provider, external_ref) DO NOTHING`,
          [
            row.userId,
            row.convertedCapped,
            `zaurum_legacy_migration:${MIGRATION_VERSION}:${row.userId}`,
            'Legacy Zaurum migration credit',
            JSON.stringify({
              kind: 'legacy_migration',
              source_bucket: 'legacy_migrated_zaurum',
              migration_version: MIGRATION_VERSION,
              conversion_divisor: CONVERSION_DIVISOR,
              cap_zaurum: CAP_ZAURUM,
              legacy_demo_credits: row.legacyDemoCredits,
              converted_uncapped: row.convertedUncapped,
              converted_capped: row.convertedCapped,
              trimmed: row.trimmed,
            }),
          ]
        );

        await client.query('COMMIT');
        applied.push({ userId: row.userId, credited: row.convertedCapped, alreadyMigrated: false });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          migrationVersion: MIGRATION_VERSION,
          conversion: `${CONVERSION_DIVISOR}:1`,
          capZaurum: CAP_ZAURUM,
          summary: {
            scanned: report.length,
            appliedCount: applied.filter((a) => !a.alreadyMigrated).length,
            alreadyMigratedCount: applied.filter((a) => a.alreadyMigrated).length,
            totalCredited: round8(applied.reduce((sum, row) => sum + row.credited, 0)),
          },
          applied: applied.slice(0, 100),
        },
        null,
        2
      )
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[zaurum-legacy-migration] failed', error);
  process.exit(1);
});
