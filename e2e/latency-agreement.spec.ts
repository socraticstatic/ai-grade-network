import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The cross-screen walk that found the divergence, run as a test so it cannot
 * silently come back.
 *
 * A region's latency used to be three different numbers depending on which
 * screen you were standing on: `fabricModel()`'s figure on /discover and
 * /naas/connect, the raw seed (and seed x 1.7) on /naas/observe's flow rows,
 * and a hand-typed `~12ms` in the network briefing. us-east-1 read 3ms on
 * Connect and 12ms on its AT&T-controlled flow row one click away.
 *
 * Everything now derives from `CC.regionLatency(regionId)`. This walks the
 * screens a viewer actually moves between and asserts one number — never a
 * pinned one: the expected value is read out of the engine each time.
 *
 * Routes are changed by assigning `location.hash`, not `page.goto`: the engine
 * is in-page state, and a reload between screens would hide exactly the drift
 * this test exists to catch.
 */

interface LatencyPair {
  privateMs: number;
  publicMs: number;
}
interface FabricRegionLite {
  regionId: string;
  name: string;
  cloudName: string;
  path: 'private' | 'public';
  latencyMs: number;
  privateMs: number;
  publicMs: number;
}
interface CCHandle {
  regionLatency(id: string): LatencyPair | null;
  activateOnramp(id: string): boolean;
  fabricModel(): { regions: FabricRegionLite[] };
}
async function goHash(page: Page, hash: string) {
  await page.evaluate(h => { window.location.hash = h; }, hash);
  await page.waitForTimeout(150);
}

const regionLatency = (page: Page, rid: string): Promise<LatencyPair> =>
  page.evaluate(id => (window as unknown as { CC: CCHandle }).CC.regionLatency(id)!, rid);

/** The region's row in the Discover tree, with its cloud expanded when it
 *  is ACTUALLY collapsed. The old version guessed collapse from the row's
 *  visibility 150ms after the hash change — under full-suite CPU load the
 *  tree renders later than that, so the guess read "hidden" for a cloud
 *  that starts expanded (AWS does), and the "expand" click TOGGLED it
 *  closed, unmounting the row for the rest of the test. aria-expanded is
 *  the state itself, read only once the cloud button exists. */
async function discoverRegionRow(
  page: Page,
  cloudName: RegExp | string,
  regionName: string,
): Promise<Locator> {
  await goHash(page, '#/discover');
  const cloud = page
    .getByRole('button', typeof cloudName === 'string' ? { name: cloudName, exact: true } : { name: cloudName })
    .first();
  // The route is lazy-loaded; under full-suite CPU load its chunk can take
  // well past the 5s default to evaluate and render. This wait is for that
  // render — the reveal-stagger animation only fades opacity, which
  // toBeVisible never waits on.
  await expect(cloud).toBeVisible({ timeout: 15000 });
  if ((await cloud.getAttribute('aria-expanded')) !== 'true') await cloud.click();
  const row = page.getByRole('button', { name: regionName, exact: true }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

/** The Latency stat tile on /discover for one region, as rendered. */
async function discoverLatency(page: Page, cloudName: RegExp, regionName: string): Promise<string> {
  const row = await discoverRegionRow(page, cloudName, regionName);
  const text = (await row.innerText()).replace(/\s+/g, ' ');
  const m = /(\d+)ms/.exec(text);
  expect(m, `no latency on the ${regionName} row: "${text}"`).not.toBeNull();
  return m![1];
}

/** Every /naas/observe flow row carried by the named path, and the ms it shows. */
async function observeRowLatencies(page: Page, pathName: string): Promise<string[]> {
  await goHash(page, '#/naas/observe');
  const rows = page.getByTestId('record-row');
  await expect(rows.first()).toBeVisible();
  const all = await rows.allInnerTexts();
  return all
    .filter(t => t.includes(pathName))
    .map(t => /(\d+)ms/.exec(t.replace(/\s+/g, ' '))?.[1] ?? '')
    .filter(Boolean);
}

const fabricRegions = (page: Page): Promise<FabricRegionLite[]> =>
  page.evaluate(() => (window as unknown as { CC: CCHandle }).CC.fabricModel().regions);

/** What the Connect region node renders: the path word and the ms beside it. */
async function connectNode(page: Page, rid: string): Promise<{ path: string; ms: string }> {
  await goHash(page, '#/naas/connect');
  const node = page.getByTestId(`fabric-node-region-${rid}`);
  await expect(node).toBeVisible();
  const text = (await node.innerText()).replace(/\s+/g, ' ');
  const m = /(Private|Public) · (\d+)ms/.exec(text);
  expect(m, `no path/latency pairing on the ${rid} node: "${text}"`).not.toBeNull();
  return { path: m![1], ms: m![2] };
}

test('us-east-1 states one latency on every screen a viewer moves between', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });
  const { privateMs } = await regionLatency(page, 'use1');

  // 1. Connect: the region node and its path card.
  await expect(page.getByTestId('fabric-node-region-use1')).toHaveAttribute('data-path', 'private');
  await page.getByTestId('fabric-node-region-use1').click();
  await expect(page.getByTestId('path-tenanted')).toContainText(`${privateMs}ms`);

  // 2. Discover: the Latency stat tile on the same region.
  expect(await discoverLatency(page, /^AWS/, 'us-east-1'), 'Discover disagrees with Connect')
    .toBe(String(privateMs));

  // 3. Observe: every flow row riding this region's AT&T path.
  const rowMs = await observeRowLatencies(page, 'NetBond · PE-IAD-02');
  expect(rowMs.length, 'no us-east-1 flow rows on the AT&T path').toBeGreaterThan(0);
  for (const ms of rowMs) {
    expect(ms, 'a flow row disagrees with the region tile it came from').toBe(String(privateMs));
  }

  // 4. The briefing quotes that figure and no hand-typed envelope, and says
  //    what the figure measures — so a region's RTT to its on-ramp and a
  //    flow's public-path latency are never read as the same claim.
  const briefing = page.getByTestId('briefing');
  await expect(briefing).toContainText(`${privateMs}ms`);
  await expect(briefing).not.toContainText(/~\s*\d+ms/);
  await expect(briefing).toContainText(/on-ramp/i);
});

/* THE WIDENED WALK.
 *
 * The two tests either side of this one follow ONE region along the AT&T path,
 * which is the only path where the two screens had ever been compared. Every
 * region a demo is about to attach is on the PUBLIC path, and there the two
 * screens were never compared at all: Connect rendered `Public · 54ms` — the
 * word public, the number the fabric RTT — while /naas/observe rendered 92ms
 * under a Path column reading "Public internet". Eight of nine regions
 * disagreed, and a hover card put the Connect figure beside a "View in Observe
 * →" link straight to the other one.
 *
 * So this walks ALL NINE, on whichever path each is on, and compares the
 * screens rather than asserting each against a different engine field. */
test('every region states one figure across Connect, Discover and Observe — on the path it is on', async ({
  page,
}) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  const regions = await fabricRegions(page);
  expect(regions.length, 'the estate must carry regions').toBeGreaterThan(0);
  expect(regions.some(r => r.path === 'public'), 'no public region to walk').toBe(true);
  expect(regions.some(r => r.path === 'private'), 'no private region to walk').toBe(true);

  for (const region of regions) {
    const expected = region.path === 'private' ? region.privateMs : region.publicMs;

    // 1. Connect's node: the WORD and the NUMBER describe one path.
    const node = await connectNode(page, region.regionId);
    expect(node.path, `${region.name}: node path word`).toBe(
      region.path === 'private' ? 'Private' : 'Public',
    );
    expect(
      node.ms,
      `${region.name}: Connect pairs "${node.path}" with the other path's figure`,
    ).toBe(String(expected));

    // 2. Discover's tile: same number, and its label names the same path.
    const row = await discoverRegionRow(page, region.cloudName, region.name);
    const tile = (await row.innerText()).replace(/\s+/g, ' ');
    const m = /(\d+)ms LATENCY · (FABRIC|PUBLIC)/i.exec(tile);
    expect(m, `${region.name}: no labelled latency tile on Discover: "${tile}"`).not.toBeNull();
    expect(m![1], `${region.name}: Discover disagrees with Connect`).toBe(String(expected));
    expect(m![2].toLowerCase(), `${region.name}: Discover's tile names the wrong path`).toBe(
      region.path === 'private' ? 'fabric' : 'public',
    );
  }

  /* 3. Observe: every flow row's figure is one its own region states. The
     table names the region only through its path, so this compares the SET —
     a row showing a number no region carries fails, which is exactly what the
     old public rows did (region seed x 1.7, off the fabric geometry). */
  await goHash(page, '#/naas/observe');
  const rows = page.getByTestId('record-row');
  await expect(rows.first()).toBeVisible();
  // Cloud-to-cloud rows measure a PAIR, not a region, so they are excluded
  // here and covered by `src/engine/latencyVocabulary.test.ts`.
  const appShown = (await rows.allInnerTexts())
    .filter(t => !t.includes('↔'))
    .map(t => /(\d+)ms/.exec(t.replace(/\s+/g, ' '))?.[1] ?? '');
  expect(appShown.length, 'no app flow rows on Observe').toBeGreaterThan(0);
  expect(appShown.every(Boolean), 'a flow row shows no latency at all').toBe(true);

  const derivable = new Set(regions.flatMap(r => [String(r.privateMs), String(r.publicMs)]));
  for (const ms of appShown) {
    expect(derivable.has(ms), `a flow row shows ${ms}ms, which no region on any path states`).toBe(
      true,
    );
  }
});

test('the hover card that links into Observe states both figures, each labelled', async ({
  page,
}) => {
  /* This card carries "View in Observe →". It used to show one unlabelled
     number — the fabric RTT — and the screen it linked to showed the public
     one: 40ms here, 68ms one click away. Both figures now render, each said
     for what it is, because the gap between them is the argument for
     attaching the region. */
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  const regions = await fabricRegions(page);
  const pub = regions.find(r => r.path === 'public')!;
  expect(pub, 'no public region to hover').toBeTruthy();

  await page.getByTestId(`fabric-node-region-${pub.regionId}`).hover();
  const card = page.getByTestId(`fabric-hover-${pub.regionId}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText(`${pub.publicMs}ms`);
  await expect(card).toContainText(`${pub.privateMs}ms`);
  await expect(card).toContainText(/public today/i);
  await expect(card).toContainText(/on the fabric/i);
  await expect(card.getByRole('link', { name: /View in Observe/ })).toBeVisible();

  // An attached region has one path, so it states one figure.
  const priv = regions.find(r => r.path === 'private')!;
  await page.getByTestId(`fabric-node-region-${priv.regionId}`).hover();
  const privCard = page.getByTestId(`fabric-hover-${priv.regionId}`);
  await expect(privCard).toBeVisible();
  await expect(privCard).toContainText(`${priv.privateMs}ms`);
  await expect(privCard).not.toContainText(/public today/i);
});

test('attaching a region moves every screen to the same new number', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  // us-west-2 starts on public transit; dx1 is the on-ramp that reaches it.
  const before = await regionLatency(page, 'usw2');

  /* Before the attach, all three screens must already agree ON THE PUBLIC
     FIGURE. This step used to assert only that Observe showed `publicMs`,
     leaving the screen a viewer comes FROM unchecked — and Connect was showing
     `privateMs` under the word "Public" the whole time. Comparing the screens,
     not each against its own engine field, is the point. */
  const nodeBefore = await connectNode(page, 'usw2');
  expect(nodeBefore.path, 'us-west-2 should start on the public path').toBe('Public');
  expect(nodeBefore.ms, 'Connect states the fabric figure under the word "Public"').toBe(
    String(before.publicMs),
  );
  expect(await discoverLatency(page, /^AWS/, 'us-west-2'), 'Discover disagrees with Connect').toBe(
    String(before.publicMs),
  );
  const publicRows = await observeRowLatencies(page, 'Public internet');
  expect(publicRows, 'Observe disagrees with Connect and Discover').toContain(
    String(before.publicMs),
  );
  expect(before.publicMs, 'the two figures must differ, or this proves nothing').not.toBe(
    before.privateMs,
  );

  await goHash(page, '#/naas/connect');
  await page.evaluate(() => (window as unknown as { CC: CCHandle }).CC.activateOnramp('dx1'));

  await expect(page.getByTestId('fabric-node-region-usw2')).toHaveAttribute('data-path', 'private');
  const after = await regionLatency(page, 'usw2');
  expect(after.privateMs, 'attaching must move the figure').not.toBe(before.publicMs);

  await page.getByTestId('fabric-node-region-usw2').click();
  await expect(page.getByTestId('path-managed-direct')).toContainText(`${after.privateMs}ms`);

  expect(await discoverLatency(page, /^AWS/, 'us-west-2')).toBe(String(after.privateMs));

  const rowMs = await observeRowLatencies(page, 'Direct Connect · Equinix DC2');
  expect(rowMs.length, 'no us-west-2 flow rows on the newly-attached path').toBeGreaterThan(0);
  for (const ms of rowMs) {
    expect(ms, 'a flow row kept its old figure after the region attached').toBe(String(after.privateMs));
  }
});
