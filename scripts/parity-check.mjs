#!/usr/bin/env node
/**
 * Parity check: compare staging vs production API and frontend runtime.
 * Exit non-zero if any check fails. Use as promotion gate before merging staging → main.
 */
const STAGING_WEB = 'https://fanclubz-staging.vercel.app';
const PROD_WEB = 'https://app.fanclubz.app';
const STAGING_API = 'https://fanclubz-backend-staging.onrender.com';
const PROD_API = 'https://fan-club-z.onrender.com';
const TIMEOUT_MS = 15000;

async function request(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    return { ok: r.ok, status: r.status, headers: Object.fromEntries(r.headers), url: r.url };
  } finally {
    clearTimeout(t);
  }
}

async function getBody(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text.slice(0, 8000) };
  } finally {
    clearTimeout(t);
  }
}

async function probe(name, fn) {
  try {
    const result = await fn();
    return { name, ok: result.ok, message: result.message ?? (result.ok ? 'OK' : 'FAIL') };
  } catch (e) {
    return { name, ok: false, message: String(e?.message ?? e) };
  }
}

const checks = [
  probe('Health: staging backend', async () => {
    const r = await request(`${STAGING_API}/health`);
    const ok = r.ok && r.status === 200;
    return { ok, message: ok ? 'OK' : `status=${r.status}` };
  }),
  probe('Health: prod backend', async () => {
    const r = await request(`${PROD_API}/health`);
    const ok = r.ok && r.status === 200;
    return { ok, message: ok ? 'OK' : `status=${r.status}` };
  }),
  probe('Share route: staging returns OG HTML (not SPA)', async () => {
    const { status, body } = await getBody(`${STAGING_WEB}/api/share/prediction?id=test`);
    const hasRoot = body.includes('<div id="root">');
    const hasOg = body.includes('<meta property="og:');
    const ok = status === 200 && hasOg && !hasRoot;
    return { ok, message: ok ? 'OK' : `status=${status} og=${hasOg} root=${hasRoot}` };
  }),
  probe('Share route: prod returns OG HTML (not SPA)', async () => {
    const { status, body } = await getBody(`${PROD_WEB}/api/share/prediction?id=test`);
    const hasRoot = body.includes('<div id="root">');
    const hasOg = body.includes('<meta property="og:');
    const ok = status === 200 && hasOg && !hasRoot;
    return { ok, message: ok ? 'OK' : `status=${status} og=${hasOg} root=${hasRoot}` };
  }),
  probe('CORS preflight: place-bet OPTIONS parity', async () => {
    const [s, p] = await Promise.all([
      request(`${STAGING_API}/api/predictions/test-id/place-bet`, { method: 'OPTIONS' }),
      request(`${PROD_API}/api/predictions/test-id/place-bet`, { method: 'OPTIONS' }),
    ]);
    const sOk = s.status === 204 || s.status === 200;
    const pOk = p.status === 204 || p.status === 200;
    const ok = sOk && pOk;
    return { ok, message: ok ? 'OK' : `staging=${s.status} prod=${p.status}` };
  }),
  probe('Runtime safety: no 5xx on user endpoints', async () => {
    const dummy = '00000000-0000-0000-0000-000000000000';
    const urls = [
      `${STAGING_API}/api/v2/predictions/created/${dummy}`,
      `${PROD_API}/api/v2/predictions/created/${dummy}`,
      `${STAGING_API}/api/v2/prediction-entries/user/${dummy}`,
      `${PROD_API}/api/v2/prediction-entries/user/${dummy}`,
    ];
    const results = await Promise.all(urls.map((u) => request(u)));
    const any5xx = results.some((r) => r.status >= 500);
    return { ok: !any5xx, message: any5xx ? `5xx: ${results.map((r) => r.status).join(',')}` : 'OK' };
  }),
  probe('Settlement merkle route exists (staging)', async () => {
    // POST without auth: expect 401/403, NOT 404. 404 = route missing (deploy drift)
    const r = await request(`${STAGING_API}/api/v2/settlement/manual/merkle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: '00000000-0000-0000-0000-000000000000', winningOptionId: '00000000-0000-0000-0000-000000000001' }),
    });
    const ok = r.status !== 404;
    return { ok, message: ok ? `OK (${r.status})` : `404 - route missing, redeploy Render staging` };
  }),
  probe('Settlement merkle route exists (prod)', async () => {
    const r = await request(`${PROD_API}/api/v2/settlement/manual/merkle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: '00000000-0000-0000-0000-000000000000', winningOptionId: '00000000-0000-0000-0000-000000000001' }),
    });
    const ok = r.status !== 404;
    return { ok, message: ok ? `OK (${r.status})` : `404 - route missing` };
  }),
];

const results = [];
for (const c of checks) {
  results.push(await c);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log('\n=== Parity Check ===');
results.forEach((r) => console.log(r.ok ? '✅' : '❌', r.name, '-', r.message));
console.log(`\n${passed}/${results.length} passed`);
if (failed.length) {
  console.error('Failed:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
