#!/usr/bin/env node
/**
 * Parity check: compare staging vs production.
 * Fetches /health, /health/deep, /debug/config from both backends.
 * Exit non-zero on FAIL. Use as promotion gate before merging staging → main.
 *
 * Usage:
 *   node scripts/parity-check.mjs
 *   PROD_BACKEND_URL=https://... STAGING_BACKEND_URL=https://... node scripts/parity-check.mjs
 */
const PROD_BACKEND_URL =
  process.env.PROD_BACKEND_URL || 'https://fan-club-z.onrender.com';
const STAGING_BACKEND_URL =
  process.env.STAGING_BACKEND_URL || 'https://fanclubz-backend-staging.onrender.com';
const TIMEOUT_MS = 20000;

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text.slice(0, 500) };
    }
    return { ok: r.ok, status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

const fails = [];
const warns = [];

async function run() {
  console.log('\n=== Staging ↔ Prod Parity Check ===\n');
  console.log(`Prod:    ${PROD_BACKEND_URL}`);
  console.log(`Staging: ${STAGING_BACKEND_URL}\n`);

  const [prodHealth, stagingHealth, prodDeep, stagingDeep, prodConfig, stagingConfig] =
    await Promise.all([
      fetchJson(`${PROD_BACKEND_URL}/health`),
      fetchJson(`${STAGING_BACKEND_URL}/health`),
      fetchJson(`${PROD_BACKEND_URL}/health/deep`),
      fetchJson(`${STAGING_BACKEND_URL}/health/deep`),
      fetchJson(`${PROD_BACKEND_URL}/debug/config`),
      fetchJson(`${STAGING_BACKEND_URL}/debug/config`),
    ]);

  // 1) Basic health
  if (!prodHealth.ok || prodHealth.status !== 200) {
    fails.push(`Prod /health: ${prodHealth.status} (expected 200)`);
  } else {
    console.log('✅ Prod /health OK');
  }
  if (!stagingHealth.ok || stagingHealth.status !== 200) {
    fails.push(`Staging /health: ${stagingHealth.status} (expected 200)`);
  } else {
    console.log('✅ Staging /health OK');
  }

  // 2) gitSha mismatch (FAIL if staging != prod when both report)
  const prodSha = prodHealth.body?.gitSha;
  const stagingSha = stagingHealth.body?.gitSha;
  if (prodSha && stagingSha && prodSha !== stagingSha) {
    fails.push(`gitSha mismatch: prod=${prodSha?.slice(0, 7)} staging=${stagingSha?.slice(0, 7)}`);
  } else if (prodSha && stagingSha) {
    console.log(`✅ gitSha match: ${prodSha?.slice(0, 7)}`);
  }

  // 3) DB connectivity (404 = endpoint not deployed yet, warn not fail)
  const prodDeep404 = prodDeep.status === 404;
  const prodDbOk = prodDeep.body?.db?.ok;
  const stagingDbOk = stagingDeep.body?.db?.ok;
  if (prodDeep404) {
    warns.push('Prod /health/deep not available (404) - deploy parity tooling to prod');
  } else if (!prodDbOk) {
    fails.push(`Prod DB: ${prodDeep.body?.db?.error || 'not ok'}`);
  } else {
    console.log('✅ Prod DB connectivity OK');
  }
  if (!stagingDbOk) {
    fails.push(`Staging DB: ${stagingDeep.body?.db?.error || 'not ok'}`);
  } else {
    console.log('✅ Staging DB connectivity OK');
  }

  // 4) Missing tables in staging
  const prodChecks = prodDeep.body?.checks || [];
  const stagingChecks = stagingDeep.body?.checks || [];
  const stagingFailed = stagingChecks.filter((c) => !c.ok);
  if (stagingFailed.length > 0) {
    fails.push(`Staging missing/broken tables: ${stagingFailed.map((c) => c.name).join(', ')}`);
    stagingFailed.forEach((c) => console.log(`   ❌ ${c.name}: ${c.error}`));
  } else if (stagingChecks.length > 0) {
    console.log('✅ Staging required tables OK');
  }

  // 5) CORS allowlist mismatch (WARN, skip if prod doesn't have /debug/config yet)
  const prodConfig404 = prodConfig.status === 404;
  const prodCorsCount = prodConfig.body?.corsAllowlistCount ?? 0;
  const stagingCorsCount = stagingConfig.body?.corsAllowlistCount ?? 0;
  if (!prodConfig404 && prodCorsCount !== stagingCorsCount) {
    warns.push(`CORS allowlist count: prod=${prodCorsCount} staging=${stagingCorsCount}`);
  }
  const prodCorsSample = JSON.stringify(prodConfig.body?.corsAllowlistSample || []);
  const stagingCorsSample = JSON.stringify(stagingConfig.body?.corsAllowlistSample || []);
  if (!prodConfig404 && prodCorsSample !== stagingCorsSample) {
    warns.push(`CORS sample differs: prod=${prodCorsSample} staging=${stagingCorsSample}`);
  }

  // 6) Supabase host mismatch (WARN - different projects expected)
  const prodSupabase = prodConfig.body?.supabaseUrlHost;
  const stagingSupabase = stagingConfig.body?.supabaseUrlHost;
  if (prodSupabase && stagingSupabase && prodSupabase === stagingSupabase) {
    warns.push('Supabase host same for prod and staging (expected different projects)');
  }

  // 7) Debug config host summaries (when both have it)
  if (!prodConfig404 && stagingConfig.body) {
    const p = prodConfig.body;
    const s = stagingConfig.body;
    console.log('\n--- Config diff (prod vs staging) ---');
    console.log('  gitSha:        ', (p.gitSha || '?').slice(0, 7), 'vs', (s.gitSha || '?').slice(0, 7));
    console.log('  dbHost:        ', p.dbHost || '?', 'vs', s.dbHost || '?');
    console.log('  supabaseHost:  ', p.supabaseUrlHost || '?', 'vs', s.supabaseUrlHost || '?');
    console.log('  apiHost:       ', p.apiHost || '?', 'vs', s.apiHost || '?');
    console.log('  corsCount:     ', p.corsAllowlistCount ?? '?', 'vs', s.corsAllowlistCount ?? '?');
  } else if (stagingConfig.body) {
    console.log('\n--- Staging config (prod has no /debug/config) ---');
    const s = stagingConfig.body;
    console.log('  gitSha:', (s.gitSha || '?').slice(0, 7), '| dbHost:', s.dbHost || '?', '| supabaseHost:', s.supabaseUrlHost || '?', '| corsCount:', s.corsAllowlistCount ?? '?');
  }

  // Summary
  console.log('\n--- Summary ---');
  if (warns.length) {
    warns.forEach((w) => console.log('⚠️  WARN:', w));
  }
  if (fails.length) {
    fails.forEach((f) => console.log('❌ FAIL:', f));
    console.log(`\n${fails.length} failure(s), ${warns.length} warning(s)`);
    process.exit(1);
  }
  console.log(`\n✅ All checks passed (${warns.length} warning(s))`);
}

run().catch((e) => {
  console.error('Parity check error:', e?.message || e);
  process.exit(1);
});
