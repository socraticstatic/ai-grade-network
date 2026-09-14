import { test, expect, type Page } from '@playwright/test';

/* The moment from the stakeholder note: "show the list of discovered
   objects, and allow the user to GROUP these together." The note's own
   example is San Jose, San Francisco and Berkeley into west-branches — and
   until now those three sites existed in the engine, originated real flows,
   and were rendered on no screen at all. This walks the whole thing: find
   them in Discover, pick them, name them, and confirm in Govern that the
   group holds exactly those three.

   Storage is cleared before the first load — no seeded auth, no dismissed
   tour. Whatever a first-time visitor meets, this spec meets too. */

async function firstVisit(page: Page, hash: string) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });

  const btn = page.getByRole('button', {
    name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i,
  });
  while (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Escape').catch(() => {});
}

const THE_THREE = ['San Jose campus', 'San Francisco office', 'Berkeley lab'];

test('the customer sites are on the Discover page at all', async ({ page }) => {
  await firstVisit(page, '/discover');
  const sites = page.getByTestId('discover-sites');
  for (const name of THE_THREE) await expect(sites).toContainText(name);

  // Every seeded premises is shown — counted off the engine, not typed here.
  const seeded = await page.evaluate(
    () => (window as unknown as { CC: { branches: unknown[] } }).CC.branches.length,
  );
  await expect(sites.getByRole('checkbox')).toHaveCount(seeded);

  // Sites are not inside the cloud tree — a branch is a building the
  // customer owns, not a resource any hyperscaler holds.
  await expect(sites.getByText('AWS')).toHaveCount(0);
});

test('picking sites and naming them creates a group with exactly that membership', async ({
  page,
}) => {
  await firstVisit(page, '/discover');

  // nothing selected, no bar
  await expect(page.getByTestId('discover-selection')).toHaveCount(0);

  for (const name of THE_THREE) {
    await page.getByRole('checkbox', { name: `Select ${name}` }).check();
  }

  const bar = page.getByTestId('discover-selection');
  await expect(bar).toContainText('3 selected');
  await expect(bar.getByTestId('selection-kind')).toHaveText('Branch sites');

  // Discover names what it found; it does not change the estate.
  await expect(bar.getByRole('button', { name: /attach|fix|provision/i })).toHaveCount(0);

  await bar.getByRole('button', { name: /^Group these$/i }).click();
  await page.getByLabel('Group name').fill('West branches E2E');

  // the id — not the label — is what policies store, shown BEFORE the commit
  await expect(page.getByTestId('discover-group-id')).toHaveText('west-branches-e2e');
  await expect(page.getByTestId('discover-group-warning')).toContainText(/renaming/i);

  await page.getByRole('button', { name: /^Create group$/i }).click();

  // selection is spent, and the confirmation says the estate is untouched
  await expect(page.getByTestId('discover-selection')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(/Nothing in the estate changed/i);

  /* Now Govern. The expected membership is stated from the SEED — the three
     Bay Area branch ids — and never read back off a number the UI just
     reported. Enter through the stack panel's NaaS band: a bare first()
     on /Govern/i would land on the AI Fabric band, which draws above NaaS. */
  await page.getByTestId('stack-band-naas').getByRole('link', { name: /^Govern\b/ }).click();
  await page.getByRole('button', { name: /^Groups/ }).click();

  const row = page.locator('tbody tr', { hasText: 'West branches E2E' });
  await expect(row).toHaveCount(1);
  for (const name of THE_THREE) await expect(row).toContainText(name);
  await expect(row).toContainText('west-branches-e2e');
  await expect(row).toContainText('Branch sites');
  await expect(row).toContainText('3 branch sites picked by hand');

  // no cloud workload was swept in
  await expect(row).not.toContainText('vpc-west-01');
  await expect(row).not.toContainText('Dallas HQ');

  const resolved = await page.evaluate(() =>
    (
      window as unknown as {
        CC: { resolveGroup: (id: string) => { branchIds: string[]; vpcIds: string[] } };
      }
    ).CC.resolveGroup('west-branches-e2e'),
  );
  expect(resolved.branchIds.slice().sort()).toEqual(['br-bkl', 'br-sfo', 'br-sjc']);
  expect(resolved.vpcIds).toEqual([]);
});
