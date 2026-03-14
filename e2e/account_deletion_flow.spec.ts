import fs from 'node:fs';
import { test, expect, type Page } from 'playwright/test';

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

async function resolveAuth(page: Page, baseURL: string, storagePath: string): Promise<StoredAuth> {
  const raw = fs.readFileSync(storagePath, 'utf8');
  const state = parseJsonSafe(raw) as StorageState | null;
  const entries = state?.origins?.flatMap((o) => o.localStorage || []) || [];
  const fromState = parseAuthFromEntries(entries);
  if (fromState) return fromState;

  await page.goto(`${baseURL}/profile`, { waitUntil: 'networkidle' });
  const runtimeEntries = await page.evaluate(() => {
    const out: Array<{ name: string; value: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value == null) continue;
      out.push({ name: key, value });
    }
    return out;
  });
  const fromRuntime = parseAuthFromEntries(runtimeEntries);
  if (fromRuntime) return fromRuntime;

  throw new Error('Could not resolve authenticated session from storage state/runtime localStorage.');
}

function requiredEnvPresent(): boolean {
  const storagePath = process.env.FCZ_E2E_STORAGE_STATE;
  return Boolean(
    process.env.FCZ_E2E_BASE_URL &&
      process.env.FCZ_E2E_API_BASE &&
      storagePath &&
      fs.existsSync(storagePath) &&
      process.env.FCZ_E2E_ALLOW_ACCOUNT_DELETE === '1' &&
      process.env.FCZ_E2E_DELETE_USER_ID
  );
}

test.describe('Account deletion flow', () => {
  test.skip(
    !requiredEnvPresent(),
    'Missing required env or destructive-flow opt-in (set FCZ_E2E_ALLOW_ACCOUNT_DELETE=1 and FCZ_E2E_DELETE_USER_ID for disposable user)'
  );

  test('authenticated user can complete delete-account confirmation flow and is logged out', async ({ page, baseURL }) => {
    const storagePath = process.env.FCZ_E2E_STORAGE_STATE!;
    const expectedDeleteUserId = String(process.env.FCZ_E2E_DELETE_USER_ID || '').trim();
    const auth = await resolveAuth(page, baseURL!, storagePath);

    if (auth.userId !== expectedDeleteUserId) {
      throw new Error(
        `Refusing destructive run: storageState user (${auth.userId}) != FCZ_E2E_DELETE_USER_ID (${expectedDeleteUserId})`
      );
    }

    await page.goto(`${baseURL}/profile`, { waitUntil: 'networkidle' });

    // If this disposable user was previously deleted, restore first.
    const restoreButton = page.getByRole('button', { name: /^Restore account$/i });
    if (await restoreButton.isVisible().catch(() => false)) {
      await restoreButton.click();
      await expect(page.getByRole('heading', { name: /Account deleted/i })).toHaveCount(0, { timeout: 20_000 });
      const acceptTermsButton = page.getByRole('button', { name: /^I Accept$/i });
      if (await acceptTermsButton.isVisible().catch(() => false)) {
        await acceptTermsButton.click();
        await expect(acceptTermsButton).toHaveCount(0, { timeout: 15_000 });
      }
    }

    const deleteEntryButton = page.getByRole('button', { name: /Delete account/i });
    await expect(deleteEntryButton).toBeVisible({ timeout: 20_000 });

    // Confirmation should be required: action button is absent before opening modal.
    await expect(page.getByRole('button', { name: /^Yes, delete account$/i })).toHaveCount(0);

    await deleteEntryButton.click();
    await expect(page.getByRole('heading', { name: /Delete account\?/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Yes, delete account$/i })).toBeVisible();

    // Verify cancel path closes modal and keeps page stable.
    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page.getByRole('heading', { name: /Delete account\?/i })).toHaveCount(0);

    await deleteEntryButton.click();
    const deleteResponsePromise = page.waitForResponse(
      (res) => /\/api\/(?:v2\/)?users\/me\/delete$/.test(res.url()) && res.request().method() === 'POST',
      { timeout: 20_000 }
    );

    await page.getByRole('button', { name: /^Yes, delete account$/i }).click();
    const deleteResponse = await deleteResponsePromise;
    expect([200, 409]).toContain(deleteResponse.status());

    await page.waitForURL((url) => new URL(url.toString()).pathname === '/', { timeout: 20_000 });

    const authCleared = await page.evaluate(() => {
      const fanclubzRaw = localStorage.getItem('fanclubz-auth-storage');
      const fczRaw = localStorage.getItem('fcz-auth-storage');
      const parse = (raw: string | null) => {
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      };

      const fanclubz = parse(fanclubzRaw);
      const fcz = parse(fczRaw);
      const fanclubzToken = fanclubz?.state?.token;
      const fczToken = fcz?.access_token || fcz?.currentSession?.access_token || fcz?.session?.access_token;
      return !fanclubzToken && !fczToken;
    });

    expect(authCleared).toBeTruthy();
  });
});
