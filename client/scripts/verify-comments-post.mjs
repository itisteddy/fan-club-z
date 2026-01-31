/**
 * Minimal comment POST verifier (web/native parity)
 *
 * Usage:
 *   FCZ_API_BASE="https://fan-club-z.onrender.com" \
 *   FCZ_TOKEN="SUPABASE_ACCESS_TOKEN" \
 *   FCZ_PREDICTION_ID="..." \
 *   FCZ_COMMENT="hello from script" \
 *   node client/scripts/verify-comments-post.mjs
 *
 * Notes:
 * - This uses the ONE canonical endpoint:
 *     POST /api/v2/social/predictions/:predictionId/comments
 * - Never prints the token value.
 */
const apiBase = (process.env.FCZ_API_BASE || '').trim();
const token = (process.env.FCZ_TOKEN || '').trim();
const predictionId = (process.env.FCZ_PREDICTION_ID || '').trim();
const comment = (process.env.FCZ_COMMENT || '').trim();

function die(msg) {
  console.error(`[verify-comments-post] ${msg}`);
  process.exit(1);
}

if (!apiBase) die('Missing FCZ_API_BASE');
if (!token) die('Missing FCZ_TOKEN');
if (!predictionId) die('Missing FCZ_PREDICTION_ID');
if (!comment) die('Missing FCZ_COMMENT');

const base = apiBase.replace(/\/+$/, '');
const url = `${base}/api/v2/social/predictions/${encodeURIComponent(predictionId)}/comments`;

console.log('[verify-comments-post] POST', url);
console.log('[verify-comments-post] auth header attached:', true);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({ content: comment }),
});

const contentType = res.headers.get('content-type') || '';
const isJson = contentType.includes('application/json');
const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

console.log('[verify-comments-post] status:', res.status);

if (res.status === 401) {
  console.error('[verify-comments-post] FAIL: 401 Session expired / Authorization required');
  console.error('[verify-comments-post] response:', data);
  process.exit(2);
}

if (res.status === 404) {
  console.error('[verify-comments-post] FAIL: 404 Server endpoint not found (no fallback attempted)');
  console.error('[verify-comments-post] response:', data);
  process.exit(3);
}

if (!res.ok) {
  console.error(`[verify-comments-post] FAIL: HTTP ${res.status}`);
  console.error('[verify-comments-post] response:', data);
  process.exit(4);
}

console.log('[verify-comments-post] PASS: comment created');
console.log('[verify-comments-post] response:', data);
