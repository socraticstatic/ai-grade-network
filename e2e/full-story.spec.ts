import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * Full-story walk: Discover plus both domains' verbs, in order, with one real
 * engine-backed state change asserted per section — plus the cross-cutting
 * Tour and ⌘K affordances. This is the single spec that proves the whole
 * rebuild hangs together, not just each section in isolation.
 *
 * Discover is a read view of the unified estate (no mutating control lives
 * there); Connect carries the Attach action (on-ramp panel); the Steer action
 * lives on Observe, where the Paths table now mounts.
 */
test('walks both domains with real state changes, plus Tour and ⌘K', async ({ page }) => {
  await seedAuth(page);

  // --- Discover: the unified inventory renders real estate — lenses, rows, path state ---
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Cloud Connect/);
  const mainNav = page.getByLabel('Main navigation');
  // Layers across the top: Discover, then a tab per layer. The lifecycle
  // verbs live in the left rail once you are in a layer.
  await expect(mainNav.getByRole('tab', { name: 'Discover', exact: true })).toBeVisible();
  for (const layer of ['NaaS', 'AI Fabric']) {
    await expect(mainNav.getByRole('tab', { name: layer, exact: true })).toBeVisible();
  }
  await mainNav.getByRole('tab', { name: 'NaaS', exact: true }).click();
  const rail = page.getByTestId('left-rail');
  for (const item of ['Home', 'Connect', 'Govern', 'Observe', 'Cost']) {
    await expect(rail.getByRole('link', { name: item, exact: true })).toBeVisible();
  }
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  // The rebuilt Discover tree exposes Expand/Collapse controls and a real cloud
  // row (AWS) — the old All/Network/AI lens chips were removed in the rebuild.
  for (const ctrl of ['Expand all', 'Collapse all']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${ctrl}$`, 'i') })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'AWS' })).toBeVisible();
  await expect(page.getByText(/via the AT&T fabric|public internet/i).first()).toBeVisible();

  // --- Connect: provisioning a region joins it to the fabric (public → private) ---
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });
  const targetEdge = page.locator('[data-fabric-edge][data-region-id="usw2"]').first();
  await expect(targetEdge).toHaveAttribute('data-path', 'public');
  await page.getByTestId('fabric-node-region-usw2').click();
  await page.getByTestId('open-provision-wizard').click();
  const provDialog = page.getByRole('dialog');
  for (let i = 0; i < 3; i++) {
    await provDialog.getByRole('button', { name: /^Next$/i }).click();
  }
  await provDialog.getByTestId('provision-confirm').click();
  await expect(targetEdge).toHaveAttribute('data-path', 'private');

  // --- Observe: Steer (on the relocated Paths table) flips a control badge ---
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });
  const controlledBadge = page.getByText(/AT&T-controlled/i);
  const controlledBefore = await controlledBadge.count();
  const steerButton = page.getByRole('button', { name: /^Steer$/i }).first();
  await expect(steerButton).toBeVisible();
  await steerButton.click();
  await expect
    .poll(async () => controlledBadge.count())
    .toBeGreaterThan(controlledBefore);

  // --- Govern: Enforce flips a rule status badge ---
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  const enforcedBadge = page.getByText(/^Enforced$/i);
  const enforcedBefore = await enforcedBadge.count();
  // Row actions live in the overflow menu (kebab), not as inline buttons.
  const moreOptions = page.getByRole('button', { name: /more options/i }).first();
  await expect(moreOptions).toBeVisible();
  await moreOptions.click();
  await page.getByRole('menu').getByRole('button', { name: /^Enforce$/i }).click();
  await expect
    .poll(async () => enforcedBadge.count())
    .toBeGreaterThan(enforcedBefore);

  // --- Observe: the network observability shell renders live KPIs ---
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Network Observability' })).toBeVisible();
  await expect(page.getByTestId('kpi-tile').first()).toBeVisible();

  // --- AI Fabric · Observe: classified -> external model is DENIED ---
  await page.goto('/#/ai/observe?tab=security', { waitUntil: 'domcontentloaded' }); // the prompt trace lives on the Security tab since the Insights rebuild
  await page.getByRole('button', { name: 'Trace', exact: true }).last().click();
  await expect(page.getByText(/denied/i).first()).toBeVisible();

  // --- Cost: the real cost screen renders its hero (Task 3 owns deeper coverage) ---
  await page.goto('/#/naas/cost', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Cost' })).toBeVisible();

  // --- Tour: the Tour button opens the guided tour ---
  await page.getByRole('button', { name: /Start guided tour/i }).click();
  await expect(page.getByText('Discover the estate')).toBeVisible();
  await page.getByRole('button', { name: 'Close tour' }).click();
  await expect(page.getByText('Discover the estate')).toHaveCount(0);

  // --- ⌘K: the command palette opens over the current page ---
  await page.keyboard.press('Meta+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
});
