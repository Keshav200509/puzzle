import { expect, test } from '@playwright/test';

test.describe('core guest e2e', () => {
  test('guest can open /play, make a move, restart, and stay interactive', async ({ page }) => {
    await page.goto('/play?fixture=easy-solve&day=2099-01-10');
    await expect(page.getByText('Daily Puzzle')).toBeVisible();

    const movesValue = page.locator('.hud-grid > div').first().locator('strong');
    await expect(movesValue).toHaveText('0');

    await page.getByLabel('tile-3-1').click();
    await expect(movesValue).toHaveText('1');

    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(movesValue).toHaveText('0');
    await page.getByLabel('tile-3-1').click();
    await expect(movesValue).toHaveText('1');
  });

  test('solve flow with easy fixture updates stats', async ({ page }) => {
    await page.goto('/play?fixture=easy-solve&day=2099-01-11');
    await page.getByLabel('tile-1-1').click();
    await expect(page.getByText('Puzzle Cleared!')).toBeVisible();
    await page.goto('/stats');

    await expect(page.getByText('Best Runs')).toBeVisible();
    await expect(page.getByText('2099-01-11')).toBeVisible();
  });

  test('/stats renders heatmap and last-7-days safely', async ({ page }) => {
    await page.goto('/stats');
    await expect(page.getByText('Heatmap')).toBeVisible();
    await expect(page.getByText('Last 7 Days')).toBeVisible();
    await expect(page.locator('.heatmap-cell').first()).toBeVisible();
  });

  test('offline restore keeps progress after reload', async ({ page }) => {
    await page.goto('/play?fixture=easy-solve&day=2099-01-12');
    const movesValue = page.locator('.hud-grid > div').first().locator('strong');

    await page.getByLabel('tile-3-1').click();
    await expect(movesValue).toHaveText('1');

    await page.reload();
    await expect(movesValue).toHaveText('1');
  });
});
