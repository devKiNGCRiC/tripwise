/**
 * admin.spec.ts — an admin in the real browser (demo data): the overview, blocking a traveller,
 * and the audit log showing it.
 */
import { expect, test } from '@playwright/test';

test('an admin blocks a traveller and the log shows it', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@tripwise.app');
  await page.getByLabel('Password', { exact: true }).fill('admin12345');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  // The admin link in the navbar opens the overview.
  await page.getByRole('link', { name: 'Admin' }).first().click();
  await expect(page.getByRole('region', { name: 'Overview' })).toContainText('Travellers');

  // Find Meera and block her.
  await page.getByRole('link', { name: 'Travellers' }).click();
  await page.getByLabel('Search travellers').fill('meera');
  const row = page.getByRole('row', { name: /Meera Iyer/ });
  await row.getByRole('button', { name: 'Block Meera Iyer' }).click();
  await expect(row.getByText('Blocked')).toBeVisible();

  // The audit log says who did it.
  await page.getByRole('link', { name: 'Log' }).click();
  await expect(page.getByText(/Aditi Admin · block · Meera Iyer/)).toBeVisible();
});
