import { test, expect, type Page } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The standing-intent lifecycle, walked as a person walks it:
 * declare (watch) → the watch counter counts → enforce → the gate denies →
 * violate → Synchronize → commit → aligned → undo → share round-trip.
 * Every status read is the recipient page's own derivation.
 */

const freeze = (page: Page) =>
  page.evaluate(() => {
    const CC = (window as unknown as {
      CC: { stopHits: () => boolean; agentList: () => { id: string; enabled: boolean }[]; toggleAgent: (id: string) => boolean };
    }).CC;
    CC.stopHits();
    CC.agentList().filter(a => a.enabled).forEach(a => CC.toggleAgent(a.id));
  });

test('declare via Andi phrase → violated thread on Discover → Synchronize → commit → aligned → undo', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  await freeze(page);

  // Empty state first: the band invites the first declaration.
  await expect(page.getByTestId('intent-threads')).toContainText('Nothing declared yet');

  // Declare through Andi: open the panel, type the phrase, confirm the action.
  await page.getByTestId('andi-toggle').click();
  await page.getByTestId('andi-input').fill('keep ai private');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/watch mode/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Declare intent · private inference/i }).click();

  // The thread appears, violated - the seeded estate routes identities publicly.
  const row = page.locator('[data-testid^="intent-row-"]').first();
  await expect(row).toBeVisible();
  const badge = page.locator('[data-testid^="intent-badge-"]').first();
  await expect(badge).toHaveAttribute('data-status', 'violated');

  // Synchronize stages the compiled repair in the twin's tray.
  await page.locator('[data-testid^="intent-sync-"]').first().click();
  await expect(page.getByTestId('design-tray')).toBeVisible();
  await expect(page.getByTestId('proposal-note')).toContainText('Synchronize');

  // Commit; the thread re-derives to aligned.
  await page.getByTestId('design-commit').click();
  await expect(badge).toHaveAttribute('data-status', 'aligned');

  // Undo the committed moves - one step at a time, stopping the moment the
  // reading flips, so the unwind never eats the declaration itself.
  const outcome = await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: { undo: () => boolean; intentList: () => { reading: { status: string } }[] };
    }).CC;
    let n = 0;
    while (n < 6 && CC.intentList().length === 1 && CC.intentList()[0].reading.status === 'aligned') {
      if (!CC.undo()) break;
      n++;
    }
    return { undos: n, intents: CC.intentList().length, status: CC.intentList()[0]?.reading.status };
  });
  expect(outcome.undos).toBeGreaterThan(0);
  expect(outcome.intents, 'the unwind must not eat the declaration').toBe(1);
  await expect(badge).toHaveAttribute('data-status', 'violated');
});

test('watch counts what enforce denies: the cap lifecycle on Insights', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/observe?tab=security', { waitUntil: 'domcontentloaded' });
  await freeze(page);

  // Exhaust the budget, declare a watch-mode cap, drive one more request.
  await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        tokenMeterList: () => { tag: string; pct: number; budget: number }[];
        meterTokens: (tag: string, n: number) => void;
        declareIntent: (k: string, s: object, m: string) => object | null;
        promptTrace: (t: string, m: string, p: string) => { blocked: boolean };
        _: { emit: (e: { type: string }) => void };
      };
    }).CC;
    const meter = () => CC.tokenMeterList().find(m => m.tag === 'rd-helion')!;
    while (meter().pct < 100) CC.meterTokens('rd-helion', meter().budget);
    CC.declareIntent('cap-token-spend', { kind: 'identity', id: 'rd-helion', label: 'rd-helion' }, 'watch');
    CC.promptTrace('rd-helion', 'helion-70b', 'e2e watch drive');
    CC._.emit({ type: 'hits' });
  });

  // The watch counter states what enforce would have denied.
  await expect(page.locator('[data-testid^="watch-note-"]')).toContainText(/would have denied/);

  // Flip to enforce (engine call - the UI toggle lives on Discover/Andi),
  // drive again: the request is DENIED and rows into the log as 403.
  await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        intentList: () => { id: string }[];
        setIntentMode: (id: string, m: string) => boolean;
        promptTrace: (t: string, m: string, p: string) => { blocked: boolean };
        _: { emit: (e: { type: string }) => void };
      };
    }).CC;
    CC.setIntentMode(CC.intentList()[0].id, 'enforce');
    CC.promptTrace('rd-helion', 'helion-70b', 'e2e enforce drive');
    CC._.emit({ type: 'hits' });
  });
  const row = page.locator('[data-testid^="req-row-"]').first();
  await expect(row).toContainText('403');
  await expect(row).toContainText(/token budget exhausted/);
});

test('a declared intent rides the share link and re-derives on arrival', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  await freeze(page);

  const shareUrl = await page.evaluate(() => {
    const CC = (window as unknown as {
      CC: {
        declareIntent: (k: string, s: object, m: string) => object | null;
        shareUrl: () => string;
      };
    }).CC;
    CC.declareIntent('private-inference', { kind: 'estate', id: 'ai', label: 'The token layer' }, 'watch');
    return CC.shareUrl();
  });
  expect(shareUrl).toContain('s=');

  await page.goto(shareUrl, { waitUntil: 'domcontentloaded' });
  const badge = page.locator('[data-testid^="intent-badge-"]').first();
  await expect(badge).toBeVisible();
  // The recipient's OWN derivation, not a carried flag.
  await expect(badge).toHaveAttribute('data-status', 'violated');
});
