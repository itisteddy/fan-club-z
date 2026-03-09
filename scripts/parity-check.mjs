#!/usr/bin/env node
/**
 * Read-only parity check between staging and production.
 *
 * Goal: catch environment/runtime drift before promoting staging -> main.
 * This script does NOT mutate data (GET/HEAD/OPTIONS only).
 */

const STAGING_API_URL = process.env.STAGING_API_URL || 'https://fanclubz-backend-staging.onrender.com';
const PROD_API_URL = process.env.PROD_API_URL || 'https://fan-club-z.onrender.com';
const STAGING_WEB_ORIGIN = process.env.STAGING_WEB_ORIGIN || 'https://fanclubz-staging.vercel.app';
const PROD_WEB_ORIGIN = process.env.PROD_WEB_ORIGIN || 'https://app.fanclubz.app';
const TIMEOUT_MS = Number(process.env.PARITY_TIMEOUT_MS || '15000');
const DUMMY_UUID = '00000000-0000-0000-0000-000000000000';

function statusFamily(status) {
  return Math.floor(status / 100);
}

async function request(url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await res.text().catch(() => '');
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, headers: res.headers, json, text };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      json: null,
      text: '',
      error: e?.message || String(e),
    };
  }
}

function printResult(result) {
  const icon = result.pass ? 'OK' : 'FAIL';
  console.log(`${icon} ${result.name}`);
  console.log(`   staging: ${result.staging.status}${result.staging.error ? ` (${result.staging.error})` : ''}`);
  console.log(`   prod:    ${result.prod.status}${result.prod.error ? ` (${result.prod.error})` : ''}`);
  if (!result.pass && result.reason) {
    console.log(`   reason:  ${result.reason}`);
  }
}

async function probe(name, stageReq, prodReq, validate) {
  const [staging, prod] = await Promise.all([stageReq(), prodReq()]);
  const out = validate(staging, prod);
  return { name, staging, prod, ...out };
}

async function main() {
  console.log('Parity check');
  console.log(`  staging api: ${STAGING_API_URL}`);
  console.log(`  prod api:    ${PROD_API_URL}`);
  console.log(`  staging web: ${STAGING_WEB_ORIGIN}`);
  console.log(`  prod web:    ${PROD_WEB_ORIGIN}`);
  console.log('');

  const checks = [
    probe(
      'Health endpoint contract',
      () => request(`${STAGING_API_URL}/health`, { method: 'GET', headers: { Accept: 'application/json' } }),
      () => request(`${PROD_API_URL}/health`, { method: 'GET', headers: { Accept: 'application/json' } }),
      (s, p) => {
        if (s.status !== 200 || p.status !== 200) {
          return { pass: false, reason: 'Expected both /health endpoints to return 200.' };
        }
        const sVersion = String(s.json?.version || '');
        const pVersion = String(p.json?.version || '');
        if (!sVersion || !pVersion) {
          return { pass: false, reason: 'Missing version field in one /health response.' };
        }
        return { pass: true };
      }
    ),
    probe(
      'CORS preflight: created predictions',
      () =>
        request(`${STAGING_API_URL}/api/v2/predictions/created/${DUMMY_UUID}`, {
          method: 'OPTIONS',
          headers: {
            Origin: STAGING_WEB_ORIGIN,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        }),
      () =>
        request(`${PROD_API_URL}/api/v2/predictions/created/${DUMMY_UUID}`, {
          method: 'OPTIONS',
          headers: {
            Origin: PROD_WEB_ORIGIN,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        }),
      (s, p) => {
        const sOrigin = s.headers.get('access-control-allow-origin');
        const pOrigin = p.headers.get('access-control-allow-origin');
        const goodStatus = (r) => r.status === 200 || r.status === 204;
        if (!goodStatus(s) || !goodStatus(p)) {
          return { pass: false, reason: 'Preflight status mismatch (expected 200/204 for both).' };
        }
        if (sOrigin !== STAGING_WEB_ORIGIN || pOrigin !== PROD_WEB_ORIGIN) {
          return { pass: false, reason: 'Access-Control-Allow-Origin mismatch.' };
        }
        return { pass: true };
      }
    ),
    probe(
      'CORS preflight: prediction entries',
      () =>
        request(`${STAGING_API_URL}/api/v2/prediction-entries/user/${DUMMY_UUID}`, {
          method: 'OPTIONS',
          headers: {
            Origin: STAGING_WEB_ORIGIN,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        }),
      () =>
        request(`${PROD_API_URL}/api/v2/prediction-entries/user/${DUMMY_UUID}`, {
          method: 'OPTIONS',
          headers: {
            Origin: PROD_WEB_ORIGIN,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        }),
      (s, p) => {
        const sOrigin = s.headers.get('access-control-allow-origin');
        const pOrigin = p.headers.get('access-control-allow-origin');
        const goodStatus = (r) => r.status === 200 || r.status === 204;
        if (!goodStatus(s) || !goodStatus(p)) {
          return { pass: false, reason: 'Preflight status mismatch (expected 200/204 for both).' };
        }
        if (sOrigin !== STAGING_WEB_ORIGIN || pOrigin !== PROD_WEB_ORIGIN) {
          return { pass: false, reason: 'Access-Control-Allow-Origin mismatch.' };
        }
        return { pass: true };
      }
    ),
    probe(
      'Runtime safety: created predictions endpoint does not 5xx',
      () =>
        request(`${STAGING_API_URL}/api/v2/predictions/created/${DUMMY_UUID}`, {
          method: 'GET',
          headers: { Accept: 'application/json', Origin: STAGING_WEB_ORIGIN },
        }),
      () =>
        request(`${PROD_API_URL}/api/v2/predictions/created/${DUMMY_UUID}`, {
          method: 'GET',
          headers: { Accept: 'application/json', Origin: PROD_WEB_ORIGIN },
        }),
      (s, p) => {
        if (statusFamily(s.status) === 5 || statusFamily(p.status) === 5) {
          return { pass: false, reason: 'At least one environment returns 5xx for created predictions probe.' };
        }
        return { pass: true };
      }
    ),
    probe(
      'Runtime safety: prediction entries endpoint does not 5xx',
      () =>
        request(`${STAGING_API_URL}/api/v2/prediction-entries/user/${DUMMY_UUID}`, {
          method: 'GET',
          headers: { Accept: 'application/json', Origin: STAGING_WEB_ORIGIN },
        }),
      () =>
        request(`${PROD_API_URL}/api/v2/prediction-entries/user/${DUMMY_UUID}`, {
          method: 'GET',
          headers: { Accept: 'application/json', Origin: PROD_WEB_ORIGIN },
        }),
      (s, p) => {
        if (statusFamily(s.status) === 5 || statusFamily(p.status) === 5) {
          return { pass: false, reason: 'At least one environment returns 5xx for prediction-entries probe.' };
        }
        return { pass: true };
      }
    ),
    probe(
      'Status parity class: place-bet route exists',
      () =>
        request(`${STAGING_API_URL}/api/predictions/${DUMMY_UUID}/place-bet`, {
          method: 'OPTIONS',
          headers: {
            Origin: STAGING_WEB_ORIGIN,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        }),
      () =>
        request(`${PROD_API_URL}/api/predictions/${DUMMY_UUID}/place-bet`, {
          method: 'OPTIONS',
          headers: {
            Origin: PROD_WEB_ORIGIN,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        }),
      (s, p) => {
        const sFam = statusFamily(s.status);
        const pFam = statusFamily(p.status);
        if (sFam !== pFam) {
          return { pass: false, reason: 'Different response family for place-bet OPTIONS probe.' };
        }
        return { pass: true };
      }
    ),
  ];

  const results = await Promise.all(checks);
  for (const r of results) printResult(r);

  const failed = results.filter((r) => !r.pass);
  console.log('');
  if (failed.length > 0) {
    console.log(`Parity check failed (${failed.length}/${results.length} checks).`);
    process.exit(1);
  }
  console.log(`Parity check passed (${results.length}/${results.length} checks).`);
}

main().catch((e) => {
  console.error('Parity check crashed:', e);
  process.exit(1);
});

