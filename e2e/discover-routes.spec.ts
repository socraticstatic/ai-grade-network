import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* Rows 35-36 of the phase-0 metric audit: the Routes and Gateways tiles
   this file used to guard were cut outright, not relocated — they were
   already folded behind the estate-breakdown disclosure and still failed
   every test ("routes" ambiguous between BGP routes and route tables, a
   gateway not a first-class object anywhere else in the product). Their
   engine source (`counts().routes` / `.gateways`, src/engine/state.ts) has
   no other consumer and is left in place, orphaned. */
test('Discover does not render Routes or Gateways tiles anywhere on the page', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('estate-breakdown').locator('summary').click();

  await expect(page.getByText('Routes', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Gateways', { exact: true })).toHaveCount(0);
});

/* Task B — Discover reads in three parts: network, cloud, AI workflows.
   Each section must actually be on screen, and a figure inside the network
   section must still agree with the live engine — never a pinned number. */
test('Discover reads in three domains', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  // The three sections fold behind a disclosure now — open it once so
  // each section is actually on screen, not merely present in the DOM.
  await page.getByTestId('estate-breakdown').locator('summary').click();

  /* The heading and the blurb ARE the deliverable — the section wrappers on
     their own satisfy the testids while saying nothing at all. Assert both
     are on screen, with real text, per section. */
  const headings: Record<string, string> = {
    network: 'Network',
    cloud: 'Cloud',
    ai: 'AI workflows',
  };
  for (const [key, heading] of Object.entries(headings)) {
    const section = page.getByTestId(`estate-${key}`);
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    const blurb = section.locator('p').first();
    await expect(blurb).toBeVisible();
    expect(((await blurb.textContent()) ?? '').trim().length).toBeGreaterThan(30);
  }
});

/* The On-ramps tile used to read `onramps.length` — 4 — beside a sentence
   about "the paths already under your control", while only one circuit was
   active and two were seeded "unused capacity" / "not yet provisioned". It
   now reads the engine's own `active / available` idiom, and it MOVES when
   the estate does. */
test('the on-ramps tile reads active over available, and moves when a circuit is activated', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  type Ramps = {
    CC: { activeOnramps(): number; onramps: unknown[]; activateOnramp(id: string): boolean };
  };
  const before = await page.evaluate(() => {
    const cc = (window as unknown as Ramps).CC;
    return { active: cc.activeOnramps(), total: cc.onramps.length };
  });
  expect(before.active).toBeLessThan(before.total); // the finding this tile now states honestly

  const network = page.getByTestId('estate-network');
  const label = network.locator('div').filter({ hasText: /^Active on-ramps$/ });
  await expect(label).toHaveCount(1);
  await expect(label.locator('..')).toContainText(`${before.active} / ${before.total}`);

  await page.evaluate(() => (window as unknown as Ramps).CC.activateOnramp('dx1'));

  await expect(label.locator('..')).toContainText(`${before.active + 1} / ${before.total}`);
});
