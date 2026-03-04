#!/usr/bin/env tsx
/**
 * Staging smoke test: GET /health and GET /health/deep.
 * Fails fast with clear output when staging is miswired (wrong env, missing tables, DB unreachable).
 *
 * Usage (from repo root):
 *   STAGING_API_URL=https://fanclubz-backend-staging.onrender.com pnpm exec tsx scripts/staging-smoke-test.ts
 *   # or from server/: npm run staging-smoke-test (if script added)
 *
 * Exit 0 = all checks passed; non-zero = fail (do not promote).
 */

const STAGING_API_URL = process.env.STAGING_API_URL || 'https://fanclubz-backend-staging.onrender.com';
const TIMEOUT_MS = 20000;

async function fetchJson<T = unknown>(url: string): Promise<{ status: number; data: T; requestId?: string }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  const requestId = res.headers.get('x-request-id') ?? undefined;
  return { status: res.status, data, requestId };
}

async function main() {
  console.log(`Staging smoke test → ${STAGING_API_URL}\n`);

  let failed = false;

  // 1. GET /health
  process.stdout.write('  GET /health ... ');
  try {
    const { status, data } = await fetchJson<{ ok?: boolean; env?: string; service?: string }>(`${STAGING_API_URL}/health`);
    if (status !== 200) {
      console.log(`FAIL (HTTP ${status})`);
      failed = true;
    } else {
      const env = (data as any).env;
      if (env !== 'staging') {
        console.log(`FAIL (expected env=staging, got env=${JSON.stringify(env)})`);
        failed = true;
      } else {
        console.log('OK');
      }
    }
  } catch (e: any) {
    console.log(`FAIL (${e?.message || e})`);
    failed = true;
  }

  // 2. GET /health/deep
  process.stdout.write('  GET /health/deep ... ');
  try {
    const { status, data, requestId } = await fetchJson<{
      ok?: boolean;
      env?: string;
      db?: { ok: boolean; error: string | null };
      checks?: Array<{ name: string; ok: boolean; error: string | null }>;
    }>(`${STAGING_API_URL}/health/deep`);

    if (status !== 200 && status !== 503) {
      console.log(`FAIL (HTTP ${status})${requestId ? ` [requestId=${requestId}]` : ''}`);
      failed = true;
    } else {
      const body = data as any;
      if (!body.ok) {
        console.log('FAIL');
        failed = true;
        if (body.db && !body.db.ok) {
          console.log(`    db.error: ${body.db.error ?? 'unknown'}`);
        }
        const failedChecks = (body.checks || []).filter((c: any) => !c.ok);
        if (failedChecks.length > 0) {
          console.log('    Failed checks:');
          failedChecks.forEach((c: any) => console.log(`      - ${c.name}: ${c.error ?? 'unknown'}`));
        }
        if (requestId) console.log(`    requestId: ${requestId}`);
      } else {
        console.log('OK');
      }
    }
  } catch (e: any) {
    console.log(`FAIL (${e?.message || e})`);
    failed = true;
  }

  // 3. Optional: public predictions endpoint
  process.stdout.write('  GET /api/v2/predictions?limit=1 ... ');
  try {
    const { status } = await fetchJson(`${STAGING_API_URL}/api/v2/predictions?limit=1`);
    if (status === 200) console.log('OK');
    else console.log(`WARN (HTTP ${status})`);
  } catch (e: any) {
    console.log(`WARN (${e?.message || e})`);
  }

  console.log('');
  if (failed) {
    console.log('Smoke test failed. Fix staging (env, DB, migrations) before promoting to main.');
    process.exit(1);
  }
  console.log('Smoke test passed.');
  process.exit(0);
}

main();
