/**
 * traveller.spec.ts — a traveller's day in the real browser (demo data): log in, open a trip and
 * ask TripWise about it, then check the Toli's money.
 */
import { expect, test } from '@playwright/test';

/** Log in as the demo traveller. */
async function logIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@tripwise.app');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/passport');
}

test('a traveller asks TripWise about a trip and checks the Toli’s money', async ({ page }) => {
  await logIn(page);

  // The Kerala trip (the demo login survives a page load).
  await page.goto('/trips/it_seed_kerala');
  await expect(page.getByRole('heading', { name: /Kerala/ }).first()).toBeVisible();

  // Ask TripWise a suggested question.
  const ask = page.getByRole('region', { name: 'Ask TripWise' });
  await ask.getByRole('button', { name: 'What’s worth seeing near our stops?' }).click();
  await expect(ask.getByRole('article', { name: 'TripWise' })).toContainText('Kerala Backwaters');
  await expect(ask.getByText('19 of 20 questions left today')).toBeVisible();

  // The Kerala Toli's Lekha: who owes whom.
  await page.goto('/tolis/t_seed_kerala?tab=lekha');
  await expect(page.getByRole('list', { name: 'Balances' })).toContainText('Raj Roy gets back ₹2,250');
});
