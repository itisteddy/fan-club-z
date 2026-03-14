import fs from 'node:fs';
import { expect, test, type BrowserContext, type Page } from 'playwright/test';

type StoredAuth = {
  userId: string;
  token: string;
};

type StorageState = {
  origins?: Array<{
    origin: string;
    localStorage?: Array<{ name: string; value: string }>;
  }>;
};

type KeyValue = { name: string; value: string };

function parseJsonSafe(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseAuthFromEntries(entries: KeyValue[]): StoredAuth | null {
  for (const entry of entries) {
    if (entry.name === 'fanclubz-auth-storage') {
      const parsed = parseJsonSafe(entry.value);
      const token = parsed?.state?.token;
      const userId = parsed?.state?.user?.id;
      if (typeof token === 'string' && token.trim() && typeof userId === 'string' && userId.trim()) {
        return { userId: userId.trim(), token: token.trim() };
      }
    }

    if (entry.name === 'fcz-auth-storage' || (entry.name.startsWith('sb-') && entry.name.endsWith('-auth-token'))) {
      const parsed = parseJsonSafe(entry.value);
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        (Array.isArray(parsed) ? parsed[0]?.access_token : undefined);
      const userId =
        parsed?.user?.id ||
        parsed?.currentSession?.user?.id ||
        parsed?.session?.user?.id ||
        (Array.isArray(parsed) ? parsed[0]?.user?.id : undefined);
      if (typeof token === 'string' && token.trim() && typeof userId === 'string' && userId.trim()) {
        return { userId: userId.trim(), token: token.trim() };
      }
    }
  }

  return null;
}

function loadAuthFromStorageState(storagePath: string): StoredAuth {
  const raw = fs.readFileSync(storagePath, 'utf8');
  const state = parseJsonSafe(raw) as StorageState | null;
  const entries = state?.origins?.flatMap((o) => o.localStorage || []) || [];
  const parsed = parseAuthFromEntries(entries);
  if (!parsed) throw new Error(`No authenticated auth payload found in storage state: ${storagePath}`);
  return parsed;
}

async function assertAdminCapable(apiBase: string, auth: StoredAuth): Promise<boolean> {
  const res = await fetch(`${apiBase}/api/v2/admin/audit?limit=1&actorId=${encodeURIComponent(auth.userId)}`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  return res.ok;
}

async function createAndClosePrediction(
  apiBase: string,
  auth: StoredAuth,
  prefix: string
): Promise<{ id: string; optionId: string; title: string }> {
  const title = `${prefix} ${Date.now()}`;
  const entryDeadline = new Date(Date.now() + 90 * 60 * 1000).toISOString();

  const createRes = await fetch(`${apiBase}/api/v2/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description: `${prefix} fixture`,
      type: 'binary',
      options: [{ label: 'Yes' }, { label: 'No' }],
      entryDeadline,
      settlementMethod: 'manual',
      category: 'general',
    }),
  });
  if (!createRes.ok) throw new Error(`Create prediction failed (${createRes.status}): ${await createRes.text()}`);
  const created = await createRes.json();
  const prediction = created?.data;
  if (!prediction?.id || !Array.isArray(prediction.options) || prediction.options.length < 2) {
    throw new Error('Invalid create response for prediction fixture');
  }

  const closeRes = await fetch(`${apiBase}/api/v2/predictions/${prediction.id}/close`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!closeRes.ok) throw new Error(`Close prediction failed (${closeRes.status}): ${await closeRes.text()}`);

  return { id: prediction.id, optionId: prediction.options[0].id, title };
}

async function openContextPage(
  browser: any,
  storageStatePath: string,
  opts?: { adminKey?: string }
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: storageStatePath });
  if (opts?.adminKey) {
    await context.addInitScript((key: string) => {
      window.localStorage.setItem('fcz_admin_key', key);
    }, opts.adminKey);
  }
  const page = await context.newPage();
  return { context, page };
}

const baseURL = process.env.FCZ_E2E_BASE_URL;
const apiBase = process.env.FCZ_E2E_API_BASE;
const adminStorageState = process.env.FCZ_E2E_ADMIN_STORAGE_STATE;
const nonAdminStorageState = process.env.FCZ_E2E_NONADMIN_STORAGE_STATE || process.env.FCZ_E2E_STORAGE_STATE;
const adminKey = process.env.FCZ_E2E_ADMIN_KEY;

test.describe('Admin settlement browser E2E', () => {
  test('admin settlement happy path', async ({ browser }) => {
    test.skip(!baseURL || !apiBase || !adminStorageState || !fs.existsSync(adminStorageState),
      'Missing FCZ_E2E_BASE_URL / FCZ_E2E_API_BASE / FCZ_E2E_ADMIN_STORAGE_STATE');
    test.skip(!adminKey, 'Missing FCZ_E2E_ADMIN_KEY (required for admin UI key-gate)');

    const adminAuth = loadAuthFromStorageState(adminStorageState!);
    const isAdmin = await assertAdminCapable(apiBase!, adminAuth);
    test.skip(!isAdmin, `Configured admin storage-state user is not admin-capable: ${adminAuth.userId}`);

    const fixture = await createAndClosePrediction(apiBase!, adminAuth, 'E2E admin settle');

    const { context, page } = await openContextPage(browser, adminStorageState!, { adminKey: adminKey! });
    try {
      const observedAdminCalls: Array<{ status: number; method: string; url: string }> = [];
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const detailResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v2/admin/predictions/${fixture.id}`) &&
          res.request().method() === 'GET',
        { timeout: 30_000 }
      ).catch(() => null);
      page.on('pageerror', (err) => pageErrors.push(String(err?.message || err).slice(0, 300)));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
      });
      page.on('response', (res) => {
        const url = res.url();
        if (url.includes('/api/v2/admin/')) {
          observedAdminCalls.push({
            status: res.status(),
            method: res.request().method(),
            url,
          });
        }
      });
      await page.goto(`${baseURL}/admin/predictions/${fixture.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const detailRes = await detailResponsePromise;
      if (!detailRes) {
        throw new Error(
          `No admin prediction detail request observed. currentUrl=${page.url()} ` +
            `adminCalls=${JSON.stringify(observedAdminCalls.slice(0, 10))} ` +
            `pageErrors=${JSON.stringify(pageErrors.slice(0, 5))} ` +
            `consoleErrors=${JSON.stringify(consoleErrors.slice(0, 5))}`
        );
      }
      const detailBody = await detailRes.text().catch(() => '');
      if (!detailRes.ok()) {
        throw new Error(
          `Admin prediction detail fetch failed (${detailRes.status()}): ${detailBody.slice(0, 300)}`
        );
      }

      await expect(page).toHaveURL(new RegExp(`/admin/predictions/${fixture.id}`), { timeout: 20_000 });

      const settleHeading = page.getByRole('heading', { name: /Settle Prediction/i });
      if (!(await settleHeading.isVisible().catch(() => false))) {
        const headings = (await page.locator('h1,h2,h3').allTextContents())
          .map((s) => s.trim())
          .filter(Boolean);
        const hasNotFound = (await page.getByText(/Prediction not found/i).count()) > 0;
        const hasAccessDenied = (await page.getByRole('heading', { name: /Access Denied|Admin Access Required/i }).count()) > 0;
        throw new Error(
          `Settle section missing after successful detail fetch. URL=${page.url()} headings=${JSON.stringify(headings)} ` +
            `hasNotFound=${hasNotFound} hasAccessDenied=${hasAccessDenied} detailSnippet=${detailBody.slice(0, 220)}`
        );
      }
      await expect(settleHeading).toBeVisible({ timeout: 20_000 });

      const settleButton = page.getByRole('button', { name: /^Settle:/i }).first();
      await expect(settleButton).toBeVisible();
      await settleButton.click();

      await expect(page.getByRole('heading', { name: /Confirm settlement/i })).toBeVisible({ timeout: 10_000 });
      const settleResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v2/admin/predictions/${fixture.id}/settle`) &&
          res.request().method() === 'POST',
        { timeout: 20_000 }
      );
      await page.getByRole('button', { name: /^Settle prediction$/i }).click();
      const settleResponse = await settleResponsePromise;
      expect(settleResponse.ok()).toBeTruthy();

      await expect(page.getByRole('heading', { name: /Confirm settlement/i })).toHaveCount(0, { timeout: 20_000 });
      await expect(page.getByRole('heading', { name: /Prediction not found/i })).toHaveCount(0);

      const detailVerifyRes = await context.request.get(
        `${apiBase}/api/v2/admin/predictions/${fixture.id}?actorId=${encodeURIComponent(adminAuth.userId)}`,
        {
          headers: {
            'x-admin-key': adminKey!,
          },
        }
      );
      expect(detailVerifyRes.ok()).toBeTruthy();
      const detailVerifyJson = await detailVerifyRes.json();
      const prediction = detailVerifyJson?.prediction || {};
      expect(
        Boolean(prediction?.winningOptionId) ||
          String(prediction?.status || '').toLowerCase() === 'settled' ||
          String(prediction?.status || '').toLowerCase() === 'closed'
      ).toBeTruthy();

      await page.goto(`${baseURL}/admin/predictions/${fixture.id}`, { waitUntil: 'networkidle' });
      await expect(page.getByText(fixture.title)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('heading', { name: /Prediction not found/i })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('admin settlement forbidden path for non-admin session', async ({ browser }) => {
    test.skip(!baseURL || !apiBase || !nonAdminStorageState || !fs.existsSync(nonAdminStorageState),
      'Missing FCZ_E2E_BASE_URL / FCZ_E2E_API_BASE / FCZ_E2E_NONADMIN_STORAGE_STATE (or FCZ_E2E_STORAGE_STATE)');

    const nonAdminAuth = loadAuthFromStorageState(nonAdminStorageState!);
    const bogusPredictionId = '00000000-0000-0000-0000-000000000000';
    const bogusOptionId = '11111111-1111-1111-1111-111111111111';

    const { context, page } = await openContextPage(browser, nonAdminStorageState!);
    try {
      await page.goto(`${baseURL}/admin/settlements`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: /Admin Access Required|Access Denied/i })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('button', { name: /^Settle prediction$/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Settle:/i })).toHaveCount(0);

      const forbiddenRes = await context.request.post(
        `${apiBase}/api/v2/admin/predictions/${bogusPredictionId}/settle?actorId=${encodeURIComponent(nonAdminAuth.userId)}`,
        {
          data: { winningOptionId: bogusOptionId, actorId: nonAdminAuth.userId },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect([401, 403]).toContain(forbiddenRes.status());

      const forbiddenResWithBearer = await fetch(`${apiBase}/api/v2/admin/predictions/${bogusPredictionId}/settle?actorId=${encodeURIComponent(nonAdminAuth.userId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${nonAdminAuth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winningOptionId: bogusOptionId, actorId: nonAdminAuth.userId }),
      });
      expect([401, 403]).toContain(forbiddenResWithBearer.status);
    } finally {
      await context.close();
    }
  });
});
