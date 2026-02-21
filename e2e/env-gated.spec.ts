import { expect, test } from '@playwright/test';

const hasEnv = Boolean(
  process.env.DATABASE_URL &&
    process.env.NEXTAUTH_URL &&
    process.env.NEXTAUTH_SECRET &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
);

test.describe('env-gated online checks', () => {
  test.skip(!hasEnv, 'Requires DATABASE_URL + NextAuth + Google env vars');

  test('mocked sign-in/session can trigger sync acknowledgement', async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { name: 'E2E', email: 'e2e@example.com' }, expires: '2099-01-01T00:00:00.000Z' })
      });
    });
    await page.route('**/api/sync/daily-scores', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, accepted: 1 }) });
    });
    await page.route('**/api/sync/level-scores', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, accepted: 0 }) });
    });

    await page.goto('/play?fixture=easy-solve&day=2099-01-20');
    await page.getByLabel('tile-1-1').click();
    await page.goto('/stats');
    await page.getByRole('button', { name: 'Sync now' }).click();
    await expect(page.getByText(/Synced/)).toBeVisible();
  });

  test('global leaderboard endpoint returns rows shape', async ({ request }) => {
    const response = await request.get('/api/leaderboard/levels?level=1');
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('leaders');
    if (response.status() === 200) {
      expect(Array.isArray(body.leaders)).toBe(true);
    }
  });
});
