import { getApiUrl } from '@/config';

type Primitive = string | number | undefined;

export function buildAdminUrl(
  path: string,
  actorId: string,
  params?: Record<string, Primitive>
): string {
  const base = getApiUrl();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(path.startsWith('http') ? path : `${base}${path}`, origin);

  // Preserve existing query params (from path) and add/override with params + actorId.
  url.searchParams.set('actorId', actorId);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseJsonOrText<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  const txt = await res.text().catch(() => '');
  return ({ message: txt } as unknown) as T;
}

export async function adminGet<T>(
  path: string,
  actorId: string,
  params?: Record<string, Primitive>
): Promise<T> {
  const url = buildAdminUrl(path, actorId, params);
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    const err: any = await parseJsonOrText(res);
    throw new Error(err?.message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function adminPost<T>(
  path: string,
  actorId: string,
  body?: Record<string, any>
): Promise<T> {
  // Preserve query params if they exist in path, and include actorId in both query+body for consistency.
  const url = buildAdminUrl(path, actorId);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(body?.adminKey ? { 'X-Admin-Key': String(body.adminKey) } : {}),
    },
    body: JSON.stringify({ ...(body || {}), actorId }),
  });
  if (!res.ok) {
    const err: any = await parseJsonOrText(res);
    throw new Error(err?.message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function adminPut<T>(
  path: string,
  actorId: string,
  body?: Record<string, any>
): Promise<T> {
  const url = buildAdminUrl(path, actorId);
  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...(body || {}), actorId }),
  });
  if (!res.ok) {
    const err: any = await parseJsonOrText(res);
    throw new Error(err?.message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}


