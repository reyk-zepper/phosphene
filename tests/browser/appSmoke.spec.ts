import { expect, test } from '@playwright/test';

test('serves the Node Observer app shell without browser runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('./?mode=observer');
  await expect(page).toHaveTitle(/Phosphene/);
  await expect(page.getByText('Node Observer', { exact: true })).toBeVisible();
  await expect(page.locator('select[aria-label="Select AI node trace"]')).toBeVisible();
  await expect(page.getByText('No live telemetry', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Published AI Node Snapshot', { exact: true })).toBeVisible();
  await expect(page.getByText('AI Node Live Adapter', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('No raw live telemetry', { exact: true })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(runtimeErrors).toEqual([]);
});

test('serves the landing route as a built Vite page', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('./landing/');
  await expect(page).toHaveTitle(/Phosphene/);
  await expect(page.getByRole('heading', { name: /Phosphene/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open the app/i })).toBeVisible();
  await expect(page.getByText('No raw live telemetry claim', { exact: true })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(runtimeErrors).toEqual([]);
});
