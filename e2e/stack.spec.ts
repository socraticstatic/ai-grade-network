import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* The layer-first IA, walked end to end as a person walks it:
   in through the Discover stack, across a layer with the left rail, up to
   another layer with the top tabs, and out to the concept deck. */

test('Discover stack → layer rail → top-tab layer switch', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // The stack panel draws every stratum, elevation order, vision bands inert.
  const panel = page.getByTestId('stack-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('stack-band-ai')).toBeVisible();
  await expect(panel.getByTestId('stack-band-transport')).toBeVisible();
  // Transport is a vision stratum: media named, nothing to click.
  await expect(panel.getByTestId('stack-band-transport').getByRole('link')).toHaveCount(0);

  // Enter the network layer through its Connect verb.
  await panel.getByTestId('stack-band-naas').getByRole('link', { name: /^Connect\b/ }).click();
  await expect(page).toHaveURL(/#\/naas\/connect/);

  // Cross the layer with the left rail: NaaS Connect → Cost.
  const rail = page.getByTestId('left-rail');
  await expect(rail).toBeVisible();
  await rail.getByRole('link', { name: 'Cost', exact: true }).click();
  await expect(page).toHaveURL(/#\/naas\/cost/);

  // Switch layers up top: the AI Fabric tab lands on its Home.
  await page.getByLabel('Main navigation').getByRole('tab', { name: 'AI Fabric', exact: true }).click();
  await expect(page).toHaveURL(/#\/ai\/home/);
  // And the rail is now the AI gateway's — its Home item, unambiguous by
  // testid ("AI Fabric" appears as both the rail header and the home item).
  await expect(page.getByTestId('left-rail').getByTestId('rail-home'))
    .toHaveAttribute('href', '#/ai/home');
});

test('the concept deck explains the table and links only into live rows', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/stack', { waitUntil: 'domcontentloaded' });

  // The cover states the rule.
  await expect(page.getByText('Enter through the layer.')).toBeVisible();

  // The deck is standalone — no app bar on a document.
  await expect(page.getByLabel('Main navigation')).toHaveCount(0);

  // Every in-app link on the deck points at a route that exists.
  const LIVE = new Set([
    ...['connect', 'govern', 'observe', 'cost'].flatMap(v => [`#/ai/${v}`, `#/naas/${v}`]),
    '#/discover',
    // The standing-intents section links the threads; the front-door card
    // links the 14-day funnel. Both are live routes (App.tsx).
    '#/assessment',
  ]);
  const hrefs = await page.locator('a[href^="#/"]').evaluateAll(as =>
    as.map(a => a.getAttribute('href')),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(LIVE.has(href!), `deck links to a route that does not exist: ${href}`).toBe(true);
  }
});
