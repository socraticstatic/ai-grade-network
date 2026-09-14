import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The 14-day funnel, walked as a person walks it: the Discover banner in,
 * Setup, measuring with counters that move, the demo clock forward, the
 * report whose figures the portal's own screens state, close, day-15.
 */

test('banner → setup → measure → advance → report → close → day 15', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // In through the front door.
  await expect(page.getByTestId('assessment-banner')).toContainText(/Measure for 14 days/);
  await page.getByTestId('assessment-banner-cta').click();
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'not-started');

  // Start: measuring, day 1, read-only promise on screen.
  await page.getByTestId('assessment-start').click();
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'measuring');
  await expect(page.getByText(/Nothing is blocked or routed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Day 1 of 14/ })).toBeVisible();

  // The counters are live: drive one traced request, the counter moves.
  const counter = page.getByTestId('counter-requestsAnalyzed');
  const before = Number((await counter.innerText()).match(/\d+/)?.[0] ?? '0');
  await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: { promptTrace: (t: string, m: string, p: string) => unknown; _: { emit: (e: { type: string }) => void } };
    }).CC;
    CC.promptTrace('rd-helion', 'helion-70b', 'e2e assessment drive');
    CC._.emit({ type: 'hits' });
  });
  await expect(counter).toContainText(String(before + 1));

  // The demo clock, honestly labelled.
  await expect(page.getByText('Demo control')).toBeVisible();
  await page.getByTestId('assessment-advance').click();
  await expect(page.getByRole('heading', { name: /Day 2 of 14/ })).toBeVisible();
  await page.getByTestId('assessment-skip').click();
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'report');

  // The report states the engine's own figures - compared to a fresh read.
  const recoverable = await page.evaluate(() => {
    const CC = (window as unknown as { CC: { assessmentReport: () => { recoverableMo: number } } }).CC;
    const n = CC.assessmentReport().recoverableMo;
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
  });
  await expect(page.getByTestId('assessment-page')).toContainText(recoverable);

  // Findings expand, and link into the portal screens that state the same
  // numbers - the links live inside the collapsed finding until opened.
  await page.locator('details summary').first().click();
  await expect(page.locator('a[href*="/ai/observe"]').first()).toBeVisible();

  // Close: the trial starts, the portal opens, the funnel remembers.
  await page.getByTestId('assessment-close').click();
  await expect(page).toHaveURL(/#\/discover/);
  await page.goto('/#/assessment', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'closed');
  await expect(page.getByText(/Completed on/)).toBeVisible();
});

test('every funnel state passes an axe scan - the funnel is customer-facing', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/assessment', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assessment-page')).toBeVisible();

  const scan = async (label: string) => {
    const axe = await new AxeBuilder({ page }).include('[data-testid="assessment-page"]').analyze();
    expect(axe.violations.map(v => `${label}: ${v.id} — ${v.description}`)).toEqual([]);
  };

  await scan('setup');
  await page.getByTestId('assessment-start').click();
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'measuring');
  await scan('measuring');
  await page.getByTestId('assessment-skip').click();
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'report');
  await scan('report');
  await page.getByTestId('assessment-close').click();
  await page.goto('/#/assessment', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'closed');
  await scan('closed');
});

test('the banner tracks the stage and the portal never gates', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    const CC = (window as unknown as { CC: { startAssessment: () => boolean; advanceAssessment: (d: number) => boolean } }).CC;
    CC.startAssessment();
    CC.advanceAssessment(6);
  });
  await expect(page.getByTestId('assessment-banner')).toContainText('day 7 of 14');

  // The portal stays fully usable mid-assessment - a path, not a wall.
  await page.goto('/#/ai/observe', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('insights-page')).toBeVisible();
});
