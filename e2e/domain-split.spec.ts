import { test, expect } from '@playwright/test';
import { seedAuth, openLayerVerb } from '../tests/e2e/helpers';

/**
 * The NaaS / AI Fabric split, walked as a person walks it.
 *
 * Three things this pins that nothing else does:
 *
 *  1. Every retired path still lands somewhere real. Shared links, bookmarks
 *     and the archived deployment all point at the flat verb routes; a
 *     redirect that silently 404s is a dead link in someone else's document.
 *  2. `/naas/<verb>` and `/ai/<verb>` are genuinely different screens. Two
 *     routes rendering the same page would pass every "does it render" check
 *     while making the whole split cosmetic.
 *  3. No AI screen is blank. Each names the block that moved onto it.
 */

const LEGACY: { from: string; to: RegExp }[] = [
  { from: '/connect', to: /#\/naas\/connect/ },
  { from: '/govern', to: /#\/naas\/govern/ },
  { from: '/observe', to: /#\/naas\/observe/ },
  { from: '/cost', to: /#\/naas\/cost/ },
  // The single AI Fabric page led with the token-policy table, which is what
  // /ai/govern carries — so that is where the retired path lands.
  { from: '/ai-fabric', to: /#\/ai\/home/ },
];

for (const legacy of LEGACY) {
  test(`legacy ${legacy.from} redirects into its domain`, async ({ page }) => {
    await seedAuth(page);
    await page.goto(`/#${legacy.from}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(legacy.to);
    // …and the destination actually rendered, rather than redirecting into a
    // blank route.
    await expect(page.locator('#main-content').getByRole('heading').first()).toBeVisible();
  });
}

/* The retired verb paths carried query state — Govern's `?tab=`, Connect's
   `?from=discover`, the share-link payload. A redirect that drops the search
   turns every shared deep link into a shallow one. */
test('a legacy deep link keeps its query across the redirect', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/govern?tab=groups', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/naas\/govern\?tab=groups/);
  // The tab the query asked for is the one that opened.
  await expect(page.getByRole('button', { name: /^Groups/ })).toBeVisible();
});

test('the two domains are different screens, not the same page twice', async ({ page }) => {
  await seedAuth(page);

  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-fabric-node]').first()).toBeVisible();
  await expect(page.locator('#main-content').getByText('Model catalog')).toHaveCount(0);

  await page.goto('/#/ai/connect', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-content').getByText('Model catalog')).toBeVisible();
  await expect(page.locator('[data-fabric-node]')).toHaveCount(0);

  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-content').getByText('Token policies')).toHaveCount(0);

  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-content').getByText('Token policies')).toBeVisible();
});

/* The AI Fabric's four screens, each holding the block that moved onto it.
   "Do not ship a blank route" is the rule; this is the assertion for it. */
test('every AI Fabric verb renders the block that moved onto it', async ({ page }) => {
  await seedAuth(page);

  const expected: [string, RegExp][] = [
    ['/ai/providers', /Model catalog/],
    ['/ai/govern', /Token policies/],
    ['/ai/observe', /Traffic flow/],
    ['/ai/teams', /Token budgets/],
  ];

  for (const [route, block] of expected) {
    await page.goto(`/#${route}`, { waitUntil: 'domcontentloaded' });
    const main = page.locator('#main-content');
    // The verb screens head "AI Fabric · <verb>"; the gateway pages
    // (Providers, Teams & limits) head with their own names.
    await expect(main.getByRole('heading').first()).toBeVisible();
    await expect(main.getByText(block).first()).toBeVisible();
  }
});

// Mirrors aiSpend.ts's fmtTokens — Govern's policy table renders budgets
// through it (metric audit row 87); Cost's per-identity table below still
// prints the raw digit count, so only this table's assertion needs it.
function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/* Govern sets the ceilings; Cost meters against them. The two screens must
   state the SAME budget for the same identity — and Govern lists policies Cost
   does not meter, which is the discrepancy a viewer notices first. Budgets do
   not tick, so this is stable to assert across two page loads. */
test('AI Fabric states the same budgets on Govern and on Cost', async ({ page }) => {
  await seedAuth(page);

  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });
  const policies = await page.evaluate(() =>
    (window as unknown as {
      CC: { tokenPolicyList: () => { tag: string; budget: number }[] };
    }).CC.tokenPolicyList().map(p => ({ tag: p.tag, budget: p.budget })),
  );
  expect(policies.length).toBeGreaterThan(0);
  // Scoped to the policies table: the Agents table on the same screen names
  // the same tags in its App column, and a bare row lookup matches both.
  const policyTable = page.locator('[data-tour="aifabric-policies"]');
  for (const p of policies) {
    await expect(
      policyTable.getByRole('row').filter({ hasText: p.tag }),
    ).toContainText(fmtTokens(p.budget));
  }

  await page.goto('/#/ai/teams', { waitUntil: 'domcontentloaded' });
  const metered = await page.evaluate(() =>
    (window as unknown as { CC: { tokenMeterList: () => { tag: string }[] } }).CC
      .tokenMeterList()
      .map(m => m.tag),
  );

  for (const p of policies) {
    if (metered.includes(p.tag)) {
      // Metered here — same ceiling as Govern, to the digit.
      await expect(
        page.getByRole('row').filter({ hasText: p.tag }),
      ).toContainText(p.budget.toLocaleString());
    } else {
      // Not metered — the screen must SAY so rather than leave the reader to
      // notice that Cost totals fewer budgets than Govern lists.
      await expect(page.locator('#main-content')).toContainText(p.tag);
      await expect(
        page.getByText(/scopes? a group rather than a metered identity/i),
      ).toBeVisible();
    }
  }
});

/* The Cost screen states token spend; the Observe screen states the same
   figure in its Cost KPI tile. Two screens, one derivation.
 *
 * ## Freezing the estate, correctly
 *
 * TWO independent things move the token meters, and an earlier version of this
 * comment claimed one of them was all of them:
 *
 *   1. `state-rules` `tickHits` — a 3s interval carrying `_.tickTokens`.
 *      `CC.stopHits()` stops it. This is the one that was stopped.
 *   2. `state-console` `agentTick` — a SEPARATE 7s interval. Its promptTrace ->
 *      meterTokens path meters regardless of endpoint readiness, and
 *      `stopHits()` has no effect on it whatsoever.
 *
 * So the estate was never frozen; the spec passed (60/60 under
 * `--repeat-each=6`) because both screens now read the meters live, not
 * because nothing was moving. (2) has its own handle now — `CC.stopAgents()`,
 * lifecycle only, leaving the agent roster as a viewer would find it. Both are
 * stopped below, so a failure here means the two screens genuinely disagree
 * rather than that a timer fired mid-assertion. */
test('AI Fabric states the same token spend on Cost and on Observe', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  const metering = await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        stopHits: () => boolean;
        stopAgents: () => boolean;
        activateOnramp: (id: string) => void;
        _: { tickTokens: (rng: () => number) => boolean };
        tokenMeterList: () => { today: number }[];
      };
    }).CC;
    CC.stopHits();    // the 3s hit ticker
    CC.stopAgents();  // the 7s agent ticker
    // Lighting nb2 makes shared-services meter. The rng is a constant, not
    // Math.random, so the volume is the same on every run.
    CC.activateOnramp('nb2');
    CC._.tickTokens(() => 0.5);
    return CC.tokenMeterList().some(m => m.today > 0);
  });
  expect(metering, 'the estate must actually be metering for this to mean anything').toBe(true);


  // The budgets block lives on Teams & limits (Govern group) since the fold.
  await page.getByLabel('Main navigation').getByRole('tab', { name: 'AI Fabric', exact: true }).click();
  await page.getByTestId('left-rail').getByRole('link', { name: 'Teams & limits', exact: true }).click();
  const costTile = page.getByTestId('ai-cost-totals').filter({ hasText: 'Spend today' });
  await expect(costTile).toBeVisible();
  const onCostScreen = (await costTile.innerText()).match(/\$[\d.]+k?/)?.[0];
  expect(onCostScreen, 'no spend figure on the Cost screen').toBeTruthy();
  expect(onCostScreen).not.toBe('$0.00');

  await openLayerVerb(page, 'AI Fabric', 'Observe');
  const kpi = page.getByTestId('kpi-cost');
  await expect(kpi).toBeVisible();
  const onObserveScreen = (await kpi.innerText()).match(/\$[\d.]+k?/)?.[0];

  expect(onObserveScreen).toBe(onCostScreen);
});

/* Agreeing on a frozen estate is the easy half. The real complaint was that a
   viewer crosses between these two screens WHILE the meters move, and each
   screen had frozen at its own mount instant — so Observe stated 753k/$1.57
   and Cost, opened a moment later, stated 779k/$1.62 for the same estate.
 *
 * Both estate tickers are stopped, then the meters are moved by hand under a
 * MOUNTED Observe screen. If that screen re-renders, it is reading the engine
 * live rather than its mount snapshot, and the two screens cannot drift apart.
 * Deterministic: an explicit token count, no rng, no wall clock. */
test('the AI money screens track the meters instead of freezing at mount', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  const attachedTag = await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        stopHits: () => boolean;
        stopAgents: () => boolean;
        activateOnramp: (id: string) => void;
        _: { tickTokens: (rng: () => number) => boolean };
        tokenMeterList: () => { tag: string; ready: boolean }[];
      };
    }).CC;
    CC.stopHits();
    CC.stopAgents();
    CC.activateOnramp('nb2');
    CC._.tickTokens(() => 0.5);
    return CC.tokenMeterList().find(m => m.ready)?.tag ?? null;
  });
  expect(attachedTag, 'nothing is attached, so nothing can be metered live').toBeTruthy();

  await openLayerVerb(page, 'AI Fabric', 'Observe');

  const kpi = page.getByTestId('kpi-cost');
  await expect(kpi).toBeVisible();
  const before = (await kpi.innerText()).match(/\$[\d.]+k?/)?.[0];
  expect(before).toBeTruthy();

  // Exactly what a tick does: mutate the meters, then emit `hits`.
  await page.evaluate(tag => {
    const CC = (window as unknown as {
      CC: {
        meterTokens: (tag: string, n: number) => void;
        _: { emit: (e: { type: string }) => void };
      };
    }).CC;
    CC.meterTokens(tag as string, 200_000);
    CC._.emit({ type: 'hits' });
  }, attachedTag);

  await expect(kpi, 'the Observe screen froze at its mount instant').not.toHaveText(
    new RegExp(before!.replace(/[$.]/g, '\\$&')),
  );
  const after = (await kpi.innerText()).match(/\$[\d.]+k?/)?.[0];

  // The budgets block lives on Teams & limits (Govern group) since the fold.
  await page.getByLabel('Main navigation').getByRole('tab', { name: 'AI Fabric', exact: true }).click();
  await page.getByTestId('left-rail').getByRole('link', { name: 'Teams & limits', exact: true }).click();
  const costTile = page.getByTestId('ai-cost-totals').filter({ hasText: 'Spend today' });
  await expect(costTile).toBeVisible();
  const onCostScreen = (await costTile.innerText()).match(/\$[\d.]+k?/)?.[0];

  expect(onCostScreen, 'Cost must state what Observe was showing a moment ago').toBe(after);
});

/* ------------------------------------------------------------------ *
 * The seams a per-screen review cannot see.
 *
 * Both of these were shipped green: every unit test on /ai/cost passed
 * against /ai/cost, and every unit test on /discover passed against
 * /discover. The defect only existed BETWEEN them — a sentence on one
 * screen denied by the screen its own link points at.
 *
 * Walked as a viewer walks it: apply the tour's Connect and Govern beats,
 * read Cost, follow its link, read what is actually there.
 * ------------------------------------------------------------------ */

/** The tour's Connect + Govern beats, plus both estate tickers stopped so a
 *  timer cannot fire between two assertions about one estate. */
async function afterConnectAndGovernBeats(page: import('@playwright/test').Page) {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  return page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        stopHits: () => boolean;
        stopAgents: () => boolean;
        activateOnramp: (id: string) => boolean;
        enforceAny: (id: string) => boolean;
        modelCatalog: () => { ready: boolean }[];
        tokenMeterList: () => { ready: boolean }[];
      };
    }).CC;
    CC.stopHits();
    CC.stopAgents();
    CC.activateOnramp('nb2');   // cloudConnectTour.ts:162 — the Connect beat
    CC.enforceAny('pol-insp');  // cloudConnectTour.ts:175 — the Govern beat
    return {
      catalogReady: CC.modelCatalog().filter(m => m.ready).length,
      catalogTotal: CC.modelCatalog().length,
      meterReady: CC.tokenMeterList().filter(m => m.ready).length,
      identities: CC.tokenMeterList().length,
    };
  });
}

test('AI Cost never sends a viewer to a Connect screen with nothing to attach', async ({ page }) => {
  const state = await afterConnectAndGovernBeats(page);

  // The fixture has to BE the disagreement state: every model attached, and
  // readiness still lagging behind it. Otherwise this proves nothing.
  expect(state.catalogReady, 'every model endpoint is attached').toBe(state.catalogTotal);
  expect(state.meterReady, 'while meter-readiness still lags').toBeLessThan(state.identities);

  // The budgets block lives on Teams & limits (Govern group) since the fold.
  await page.getByLabel('Main navigation').getByRole('tab', { name: 'AI Fabric', exact: true }).click();
  await page.getByTestId('left-rail').getByRole('link', { name: 'Teams & limits', exact: true }).click();

  const summary = page.getByText(/route to a model endpoint/);
  await expect(summary).toBeVisible();
  await expect(summary).toContainText(`All ${state.identities} route to a model endpoint`);
  // The claim, and the link that used to lead to the screen denying it.
  await expect(page.getByText(/leave over the public internet/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Attach them in AI Fabric/ })).toHaveCount(0);

  // And the screen it would have sent them to says there is nothing to do.
  await openLayerVerb(page, 'AI Fabric', 'Connect');
  await expect(
    page.getByText(`${state.catalogReady} / ${state.catalogTotal} governed & ready`),
  ).toBeVisible();
});

test('Discover does not call the AI security gap closed while NaaS Observe still lists public AI flows', async ({ page }) => {
  await afterConnectAndGovernBeats(page);

  const flows = await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        aiExposed: () => number;
        routeFlows: () => { label: string; gbps: number; dst?: string; current: { attControlled: boolean } }[];
      };
    }).CC;
    const publicAi = CC.routeFlows().filter(r => r.dst === 'ai-endpoints' && !r.current.attControlled);
    return {
      aiExposed: CC.aiExposed(),
      labels: publicAi.map(r => r.label),
      gbps: Math.round(publicAi.reduce((s, r) => s + r.gbps, 0) * 10) / 10,
    };
  });

  // The endpoint count is zero — which is exactly what made the old sentence
  // claim the gap was closed — while the flow table is not empty.
  expect(flows.aiExposed).toBe(0);
  expect(flows.labels.length, 'public AI flows must remain, or this proves nothing').toBeGreaterThan(0);

  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  // The AI section folds behind a disclosure now — open it once so it's
  // actually on screen, not merely present in the DOM.
  await page.getByTestId('estate-breakdown').locator('summary').click();
  const ai = page.getByTestId('estate-ai');
  await expect(ai).toBeVisible();
  await expect(ai).not.toContainText('closed');
  await expect(ai, 'the blurb states the figure the flow table sums to').toContainText(
    `${flows.gbps} Gbps`,
  );

  // Follow the taxonomy link Discover's AI section now carries.
  await expect(page.getByTestId('estate-cta-ai')).toHaveAttribute('href', /#\/ai\/providers$/);

  // And the flows the sentence points at are on NaaS · Observe, by name.
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });
  for (const label of flows.labels) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
});
