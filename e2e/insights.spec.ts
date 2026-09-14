import { test, expect, type Page } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The Insights screen (/ai/observe), walked as a person walks it: the KPI
 * strip, the sankey, the request log filling on the agent cadence, the
 * Savings tab's levers flipping REAL engine state, and the two redirects
 * that keep the folded routes alive.
 *
 * Determinism: tests that count requests drive `CC.promptTrace` directly -
 * the same call the 7s agent tick makes - rather than waiting for the timer.
 */

const trace = (page: Page) =>
  page.evaluate(() => {
    const CC = (window as unknown as {
      CC: { promptTrace: (tag: string, model: string, prompt: string) => unknown };
    }).CC;
    CC.promptTrace('rd-helion', 'helion-70b', 'e2e insights walk');
  });

test('boots to the anatomy: four KPI cards, the sankey, the request log', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe', { waitUntil: 'domcontentloaded' });

  // The deep dive leads the page: the verdict sentence is up before the raw
  // log disclosure is ever opened.
  await expect(page.getByTestId('requests-verdict')).toBeVisible();

  for (const key of ['tokens', 'cost', 'ttft', 'blocked']) {
    await expect(page.getByTestId(`kpi-${key}`)).toBeVisible();
  }
  // Row 80 of the phase-0 metric audit: the Requests KPI card cut — the
  // deep dive's own verdict sentence above already states this count.
  await expect(page.getByTestId('kpi-requests')).not.toBeVisible();
  await expect(page.getByTestId('sankey')).toBeVisible();
  // One ribbon per metered identity - the seeded estate has three.
  expect(await page.locator('[data-testid^="sankey-ribbon-"]').count()).toBeGreaterThanOrEqual(3);

  // The raw log is a disclosure now, not the page default - open it once
  // to reach the table.
  await page.getByTestId('raw-log').locator('summary').click();
  await expect(page.getByTestId('requests-table')).toBeVisible();
});

/* Row 80: the Requests KPI card is gone, so this now tracks the same count
   through the deep dive's own verdict sentence ("N requests today: …"),
   which is where the audit's demote sends it. */
test('a driven request rows in and moves the request count the deep dive states', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe', { waitUntil: 'domcontentloaded' });

  const verdict = page.getByTestId('requests-verdict');
  await expect(verdict).toBeVisible();
  const before = Number((await verdict.innerText()).match(/^(\d+) requests today/)?.[1] ?? '0');

  // The row this test reads back lives in the raw log disclosure - open it
  // once, up front, so the row is actually reachable after the trace.
  await page.getByTestId('raw-log').locator('summary').click();

  await trace(page);
  await page.evaluate(() =>
    (window as unknown as { CC: { _: { emit: (e: { type: string }) => void } } }).CC._
      .emit({ type: 'hits' }),
  );

  await expect(verdict).toContainText(`${before + 1} requests today`);
  const row = page.locator('[data-testid^="req-row-"]').first();
  await expect(row).toContainText('rd-helion');
  await expect(row).toContainText('200');
});

test('clicking a sankey ribbon names the path; clicking again clears it', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe', { waitUntil: 'domcontentloaded' });

  const ribbon = page.locator('[data-testid="sankey-ribbon-rd-helion"]');
  await ribbon.click();
  await expect(ribbon).toHaveAttribute('aria-pressed', 'true');
  const tooltip = page.getByTestId('sankey-tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('rd-helion');
  await expect(tooltip).toContainText(/CoreWeave/);

  // Second click clears the selection; the tooltip may linger while the
  // pointer still hovers the ribbon, so move it off before asserting.
  await ribbon.click();
  await expect(ribbon).toHaveAttribute('aria-pressed', 'false');
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
});

test('filters narrow the log, chips appear, Clear all restores', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe', { waitUntil: 'domcontentloaded' });

  // Two identities in the log so the filter has something to exclude. Open
  // the raw log disclosure, then wait for the screen to be up before driving
  // the engine, and assert through the auto-retrying matcher rather than a
  // raw count - the render lands on the emit, not synchronously with it.
  await page.getByTestId('raw-log').locator('summary').click();
  await expect(page.getByTestId('requests-table')).toBeVisible();
  await trace(page);
  await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: { promptTrace: (t: string, m: string, p: string) => unknown; _: { emit: (e: { type: string }) => void } };
    }).CC;
    CC.promptTrace('classified-helion', 'gpt-class', 'e2e denial');
    CC._.emit({ type: 'hits' });
  });

  const rows = page.locator('[data-testid^="req-row-"]');
  await expect(rows.nth(1)).toBeVisible();
  const all = await rows.count();

  await page.getByTestId('req-filter-identity').selectOption('rd-helion');
  await expect(page.getByTestId('req-chip-identity')).toBeVisible();
  expect(await rows.count()).toBeLessThan(all);

  await page.getByTestId('req-clear-all').click();
  await expect(page.getByTestId('req-chip-identity')).toHaveCount(0);
  expect(await rows.count()).toBe(all);
});

test('the Savings lever flips REAL engine state, rides the share link, and undoes', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe?tab=savings', { waitUntil: 'domcontentloaded' });

  const footer = page.getByTestId('cost-footer-caching');
  await expect(footer).toContainText('Caching disabled');

  await page.getByTestId('cost-flag-caching').click();
  await expect(footer).toContainText(/caching is on/i);

  // Engine state, not component state: the lever travels in the share
  // payload (shareUrl carries the current hash, so the link reopens this tab).
  const shareUrl = await page.evaluate(() =>
    (window as unknown as { CC: { shareUrl: () => string } }).CC.shareUrl(),
  );
  expect(shareUrl, 'the flipped lever must make the payload non-empty').toContain('s=');

  // It reverses under the same Undo as every other commitment.
  await page.evaluate(() => (window as unknown as { CC: { undo: () => boolean } }).CC.undo());
  await expect(footer).toContainText('Caching disabled');

  // And a recipient opening the link gets an engine with the lever flipped.
  await page.goto(shareUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('cost-footer-caching')).toContainText(/caching is on/i);
});

test('the folded routes still land: /ai/cost opens the Savings tab, /ai/connect opens Providers', async ({ page }) => {
  await seedAuth(page);

  await page.goto('/#/ai/cost', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/ai\/observe\?tab=savings/);
  await expect(page.getByTestId('savings-tab')).toBeVisible();

  await page.goto('/#/ai/connect', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/ai\/providers/);
  await expect(page.getByText('Model catalog')).toBeVisible();
});

test('tabs write the URL, so a Savings deep link is shareable', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('tab-savings').click();
  await expect(page).toHaveURL(/tab=savings/);
  await expect(page.getByTestId('savings-tab')).toBeVisible();

  await page.getByTestId('tab-security').click();
  await expect(page).toHaveURL(/tab=security/);
  await expect(page.getByText('Prompt trace')).toBeVisible();

  await page.getByTestId('tab-performance').click();
  await expect(page).not.toHaveURL(/tab=/);
  await expect(page.getByTestId('sankey')).toBeVisible();
});
