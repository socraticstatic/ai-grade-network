import { test, expect } from '@playwright/test';
import { seedAuth, gotoCreate } from './helpers';

// ---------------------------------------------------------------------------
// Connection Hub information architecture
//   Hub-01: a Hub detail renders a SEPARATE table per connection type, each with
//           type-specific columns (the heterogeneous-Hub IA).
//   Hub-02: the Create wizard can ADD a new connection into an existing Hub, and
//           that connection then appears in the Hub's grouped tables.
// The showcase Hub `hub-showcase` is seeded with 3 VPN to Cloud + 2 Cloud to Cloud.
// ---------------------------------------------------------------------------

test.describe('Connection Hub grouping', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // Open the showcase Hub detail and click its Connections tab.
  async function openShowcaseConnections(page: import('@playwright/test').Page) {
    await page.goto('/#/hubs/hub-showcase', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const connTab = page.getByRole('button', { name: /^connections$/i })
      .or(page.locator('button,[role=tab]').filter({ hasText: /^connections$/i }))
      .first();
    await connTab.click();
    await page.waitForTimeout(400);
  }

  test('Hub-01: Hub detail renders a separate table per connection type with disparate columns', async ({ page }) => {
    await openShowcaseConnections(page);

    // Two type groups, each its own labelled section.
    const c2c = page.locator('section[aria-label="Cloud to Cloud"]');
    const vpn = page.locator('section[aria-label="VPN to Cloud"]');
    await expect(c2c).toBeVisible();
    await expect(vpn).toBeVisible();

    // Disparate columns: C2C has Endpoints + Encryption; VPN has Tunnel + Peer IP.
    await expect(c2c.locator('th', { hasText: /endpoints/i })).toBeVisible();
    await expect(c2c.locator('th', { hasText: /encryption/i })).toBeVisible();
    await expect(vpn.locator('th', { hasText: /tunnel/i })).toBeVisible();
    await expect(vpn.locator('th', { hasText: /peer ip/i })).toBeVisible();

    // VPN table must NOT carry the C2C-only Endpoints column, proving the columns
    // are type-specific rather than a shared superset.
    await expect(vpn.locator('th', { hasText: /endpoints/i })).toHaveCount(0);

    // Row counts match the seeded composition (2 C2C, 3 VPN).
    await expect(c2c.locator('tbody tr')).toHaveCount(2);
    await expect(vpn.locator('tbody tr')).toHaveCount(3);

    // Composition chips summarise the mix.
    await expect(page.getByText(/5 connections across 2 types/i)).toBeVisible();
  });

  test('Hub-03: the global Connections tab groups by type with a Hub column and a row drawer', async ({ page }) => {
    await page.goto('/#/manage', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    // Switch to the flat "Connections" tab (not "Connection Hubs").
    await page.locator('button').filter({ hasText: /^Connections\s*\d/ }).first().click();
    await page.waitForTimeout(800);

    // Same per-type grouping as hubs, but spanning ALL hubs — with a Hub column.
    const vpn = page.locator('section[aria-label="VPN to Cloud"]');
    const c2c = page.locator('section[aria-label="Cloud to Cloud"]');
    await expect(vpn).toBeVisible();
    await expect(c2c).toBeVisible();
    await expect(vpn.locator('th', { hasText: /^Hub$/i })).toBeVisible();
    await expect(vpn.locator('th', { hasText: /tunnel/i })).toBeVisible();
    await expect(c2c.locator('th', { hasText: /endpoints/i })).toBeVisible();

    // Row click opens the right-hand drawer (not a full-page navigation).
    await vpn.locator('tbody tr').first().click();
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/shared objects/i)).toBeVisible(); // insight section present
    await expect(page).toHaveURL(/\/#\/manage/i); // stayed on the tab, did not navigate away
  });

  test('Hub-04: selecting rows reveals bulk actions; each group has sort, export and a row menu', async ({ page }) => {
    await page.goto('/#/hubs/hub-showcase', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^connections$/i }).or(page.locator('button,[role=tab]').filter({ hasText: /^connections$/i })).first().click();
    await page.waitForTimeout(500);

    const vpn = page.locator('section[aria-label="VPN to Cloud"]');
    // Sortable headers (buttons with aria-sort).
    await expect(vpn.locator('th button[aria-sort]').first()).toBeVisible();
    // Per-group export.
    await expect(vpn.getByRole('button', { name: /export/i })).toBeVisible();
    // Per-row overflow menu + selection checkboxes.
    await expect(vpn.locator('tbody tr').first().locator('button').last()).toBeVisible();

    // Selecting a row reveals the bulk action bar.
    await vpn.locator('tbody input[type="checkbox"]').first().check();
    const bar = page.locator('div').filter({ hasText: /\d+ selected/ }).filter({ has: page.getByRole('button', { name: /^activate$/i }) }).last();
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('button', { name: /^activate$/i })).toBeVisible();
    await expect(bar.getByRole('button', { name: /^delete$/i })).toBeVisible();
    await expect(bar.getByRole('button', { name: /clear/i })).toBeVisible();
  });

  test('Hub-02: wizard adds a new connection into an existing Hub and it appears in the right group', async ({ page }) => {
    await gotoCreate(page);

    // Mode: Guided Setup.
    await page.locator('button').filter({ hasText: /guided setup/i }).first().click();
    await page.waitForTimeout(600);

    const uniqueName = `Attach Test ${Date.now()}`;

    // Connection type: Internet to Cloud. Selecting a type auto-advances to Provider.
    // (Naming is optional and lives only on the Review step now — filled below.)
    await page.locator('button').filter({ hasText: /internet to cloud/i }).first().click();
    await page.waitForTimeout(400);

    // Drive every remaining step until the Review step (identified by the Hub
    // parenting selector). Each iteration: advance when possible, otherwise make the
    // step's required selection based on its heading.
    const addToExisting = page.getByRole('button', { name: /add to an existing hub/i });
    for (let i = 0; i < 16; i++) {
      if (await addToExisting.isVisible().catch(() => false)) break;

      const next = page.getByRole('button', { name: /^next$/i });
      if ((await next.count()) > 0 && (await next.isEnabled().catch(() => false))) {
        await next.click();
        await page.waitForTimeout(400);
        continue;
      }

      // Next disabled → step needs a selection. Dispatch on the step heading.
      const heading = (await page.locator('main h3').allInnerTexts().catch(() => [])).join(' ');
      if (/provider/i.test(heading)) {
        await page.getByRole('button', { name: /^AWS$/ }).first().click().catch(() => {});
      } else if (/resiliency/i.test(heading)) {
        await page.getByRole('button', { name: /^Standard/ }).first().click().catch(() => {});
      } else if (/location/i.test(heading)) {
        // Location options are buttons labelled with a facility + region, e.g.
        // "Ashburn, VA (Equinix DC1-DC15) us-east-1, us-east-2".
        await page.getByRole('button', { name: /\((Equinix|CoreSite|Cologix|CyrusOne|Pittock|EdgeConneX)/ })
          .first().click().catch(() => {});
      } else {
        // Unknown step that still blocks: click the first plausible option card.
        await page.locator('main button').filter({
          hasNotText: /next|back|cancel|save draft|toggle|minimize|advance|apply recommendation|send message|help|pay as you go/i,
        }).first().click().catch(() => {});
      }
      await page.waitForTimeout(350);
    }

    await expect(addToExisting).toBeVisible({ timeout: 8000 });

    // Naming is optional and only on the Review step, pre-defaulted from the choices.
    const nameField = page.getByLabel(/connection name/i);
    await expect(nameField).toBeVisible();
    expect(await nameField.getAttribute('placeholder')).toBeTruthy(); // convention default
    await nameField.fill(uniqueName);

    // Choose "Add to an existing Hub" and select the showcase Hub by its option value.
    await addToExisting.click();
    const hubSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: /Enterprise Multi-Cloud Hub/i }),
    });
    const hubValue = await hubSelect
      .locator('option', { hasText: /Enterprise Multi-Cloud Hub/i })
      .first()
      .getAttribute('value');
    expect(hubValue).toBeTruthy();
    await hubSelect.selectOption(hubValue!);

    // Submit.
    await page.getByRole('button', { name: /create connection/i }).click();
    await page.waitForTimeout(1500);

    // Verify in the persistence layer (Zustand → localStorage 'appState'): the new
    // connection exists, is parented to the showcase Hub, and the Hub now lists it.
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('appState-v3') || '{}'));
    const conn = (state.connections || []).find((c: any) => c.name === uniqueName);
    expect(conn, 'new connection should be persisted').toBeTruthy();
    expect(conn.hubIds, 'connection should be parented to the showcase Hub').toContain('hub-showcase');
    const hub = (state.hubs || []).find((g: any) => g.id === 'hub-showcase');
    expect(hub, 'showcase Hub should exist').toBeTruthy();
    expect(hub.connectionIds, 'showcase Hub should now list the new connection').toContain(conn.id);

    // And it surfaces in the UI: a new "Internet to Cloud" group appears in the Hub.
    await openShowcaseConnections(page);
    await expect(page.locator('section[aria-label="Internet to Cloud"]')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(uniqueName)).toBeVisible();
  });
});
