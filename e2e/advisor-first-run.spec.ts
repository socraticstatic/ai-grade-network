import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * Task 7 — the advisor's first-run walk, end to end. Same URL idiom as
 * meridian-estate.spec.ts: the query goes BEFORE the hash
 * (`/?estate=meridian#/discover`), never after — the hash router would
 * otherwise swallow `?estate=meridian` into the fragment and
 * estateProfile.ts's boot-time `resolveProfile` would never see it.
 *
 * Aug 11: every profile is boot-seeded advisor-done (the first-run takeover
 * was reverted — the advisor is opt-in). The walk now enters via the direct
 * advisor URL, which always renders regardless of flags.
 */
const MERIDIAN_URL = '/?estate=meridian#/discover/advisor';
const ACME_URL = '/?estate=acme#/discover';

// arn:aws:iam::<12 digits>:role/<name> — the one shape wizardModel's
// validateCredential accepts for the 'arn' credKind (aws).
const VALID_AWS_ARN = 'arn:aws:iam::123456789012:role/CloudConnectDiscovery';

test('meridian first-run: observe -> intake -> scan -> ready -> accept tier 1 -> /assessment -> back to /discover shows the tree', async ({
  page,
}) => {
  await seedAuth(page);
  await page.goto(MERIDIAN_URL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/discover\/advisor$/);

  // observe: the head-start card states AT&T's pre-scan view of the estate.
  const headStart = page.getByTestId('advisor-headstart');
  await expect(headStart).toBeVisible();
  await expect(headStart).toContainText('4,183');
  await page.getByTestId('advisor-observe-cta').click();

  // intake: pick a provider, the wizard-shaped ARN field appears, type a
  // shape-valid credential, submit.
  const intake = page.getByTestId('advisor-intake');
  await expect(intake).toBeVisible();
  // ProviderLogo renders an <img alt="AWS">, so the button's accessible
  // name is "AWS AWS" (image alt + label span) — match non-exact.
  await intake.getByRole('button', { name: 'AWS' }).click();
  await page.getByLabel('IAM role ARN').fill(VALID_AWS_ARN);
  const submit = page.getByTestId('advisor-intake-submit');
  await expect(submit).toBeEnabled();
  await submit.click();

  // scanning: the skeleton renders, the status chip narrates progress.
  await expect(page.getByTestId('advisor-scan-skeleton')).toBeVisible();
  await expect(page.getByTestId('advisor-status-chip')).toHaveText('Analyzing your estate…');

  // ready: the scan timer paces at 620ms/step off a small precomputed
  // region list — a generous ceiling well above worst-case CI pacing.
  await expect(page.getByTestId('advisor-status-chip')).toHaveText('Recommendations ready', { timeout: 20000 });
  await expect(page.getByTestId('advisor-headline')).toBeVisible();
  await expect(page.getByTestId('advisor-headline')).toContainText(/save \$/i);

  // All four grounded findings are live under meridian (advisorModel.test.ts
  // pins this: all four kinds present, fixed order, count > 0).
  await expect(page.getByTestId('finding-card-untracked-ai')).toBeVisible();
  await expect(page.getByTestId('finding-card-unattached-regions')).toBeVisible();
  await expect(page.getByTestId('finding-card-egress-bleed')).toBeVisible();
  await expect(page.getByTestId('finding-card-exposed-spof')).toBeVisible();

  // Open the flagship (untracked-ai) finding's ladder and accept tier 1 —
  // the good-framed "14-day assessment" tier, routed to /assessment.
  // Tiers render in full view now - no disclosure toggle between the
  // executive and the offers.
  await expect(page.getByTestId('finding-tier-untracked-ai-assessment')).toBeVisible();
  await page.getByTestId('finding-tier-untracked-ai-assessment').click();

  await expect(page).toHaveURL(/#\/assessment$/);
  await expect(page.getByTestId('assessment-page')).toBeVisible();

  // Back to /discover: the tree renders - the advisor never hijacks it.
  await page.goto('/?estate=meridian#/discover', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/discover$/);
  await expect(page.getByTestId('discover-sites')).toBeVisible();
});

test('meridian skip path: "Skip to the estate" reaches the tree, and a direct revisit stays there', async ({ page }) => {
  await seedAuth(page);
  await page.goto(MERIDIAN_URL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/discover\/advisor$/);

  await page.getByTestId('advisor-skip').click();

  await expect(page).toHaveURL(/#\/discover$/);
  await expect(page.getByTestId('discover-sites')).toBeVisible();

  // /discover itself renders the tree - the advisor never hijacks it.
  await page.goto('/?estate=meridian#/discover', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/discover$/);
  await expect(page.getByTestId('discover-sites')).toBeVisible();
});

test('acme: /discover never redirects to the advisor — boot-seeded done, six site rows render immediately', async ({
  page,
}) => {
  await seedAuth(page);
  await page.goto(ACME_URL, { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/#\/discover$/);
  await expect(page.getByTestId('site-row')).toHaveCount(6);
});
