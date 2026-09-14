import { test, expect, type Page } from '@playwright/test';

/* Groups were complete in the engine and invisible in the product:
   CC.groupList() in a console was the only way to see one, and there was no
   way at all to make a third. This walks what a person can now do —
   open Govern, read what each group resolves to right now, and create one.

   Storage is cleared before the first load: no seeded auth, no dismissed
   tour, no replayed share link. Whatever a first-time visitor meets, this
   spec meets too. */

async function firstVisit(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });

  // A genuine first visit may open the product tour / demo modal. Close
  // whichever is present rather than pre-seeding flags to hide them.
  const btn = page.getByRole('button', {
    name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i,
  });
  while (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Escape').catch(() => {});

  await page.getByRole('button', { name: /^Groups/ }).click();
}

/** The resolved count as the SCREEN states it, parsed back out of the DOM —
 *  never taken from the engine and compared to itself. */
async function resolvedCount(page: Page, label: string): Promise<number> {
  const row = page.locator('tbody tr', { hasText: label });
  await expect(row).toHaveCount(1);
  const text = (await row.textContent()) ?? '';
  // No trailing \b: adjacent cells concatenate in textContent ("3
  // objectsSan Jose campus"), so "objects" is not followed by a boundary.
  const m = /(\d+)\s+object/.exec(text);
  expect(m, `no resolved count rendered for ${label}`).not.toBeNull();
  return Number(m![1]);
}

test('both seeded groups are visible, with what they resolve to right now', async ({ page }) => {
  await firstVisit(page);

  /* The expected counts are stated from the SEED, independently of the UI:
     west-branches lists three literal branch members (San Jose, San
     Francisco, Berkeley); west-workloads is a Region:west predicate, which
     the estate satisfies with six VPCs. */
  expect(await resolvedCount(page, 'West branches')).toBe(3);
  expect(await resolvedCount(page, 'West workloads')).toBe(6);

  const branchRow = page.locator('tbody tr', { hasText: 'West branches' });
  const workloadRow = page.locator('tbody tr', { hasText: 'West workloads' });

  // NAMED, not merely counted — a count is not something intent can be
  // checked against.
  await expect(branchRow).toContainText('San Jose campus');
  await expect(workloadRow).toContainText('vpc-west-01');

  // the id a policy stores is on screen, and it is not the label
  await expect(branchRow).toContainText('west-branches');

  // the definition reads as language, not as the engine's data structure
  await expect(workloadRow).toContainText('anything where Region is west');
  await expect(branchRow).toContainText('3 branch sites picked by hand');
  for (const row of [branchRow, workloadRow]) {
    const text = (await row.textContent()) ?? '';
    expect(text).not.toContain('cloudTag');
    expect(text).not.toContain('[object Object]');
    expect(text).not.toContain('undefined');
  }

  // the tab badge is a live derivation, not a hardcoded 2
  const engineGroups = await page.evaluate(
    () => (window as unknown as { CC: { groupList: () => unknown[] } }).CC.groupList().length,
  );
  await expect(page.getByRole('button', { name: /^Groups/ })).toContainText(String(engineGroups));
});

/* A governance tag is a cloud-workload concept — branches carry cloudTags
   but no `tags` array — so a governanceTag rule on a branch-site group can
   never resolve to anything. The form must refuse it at the point of
   choice, not let someone discover it later as a silent zero. */
test('a governance-tag rule on a branch-site group cannot be committed', async ({ page }) => {
  await firstVisit(page);

  const before = await page.evaluate(
    () => (window as unknown as { CC: { groupList: () => unknown[] } }).CC.groupList().length,
  );

  await page.getByRole('button', { name: /^New group$/i }).click();
  await page.getByLabel('Group name').fill('Impossible sites');
  await page.getByLabel('This group contains').selectOption('site');
  await page.getByRole('button', { name: /^Add a tag rule$/i }).click();
  await page.getByLabel('Tag source').selectOption('governanceTag');
  await page.getByLabel('Tag value').fill('pci');

  const warning = page.getByRole('alert');
  await expect(warning).toContainText(/branch site carries no governance tag/i);
  await expect(warning).toContainText(/never resolve/i);

  const createBtn = page.getByRole('button', { name: /^Create group$/i });
  await expect(createBtn).toBeDisabled();

  // A disabled button ignores clicks natively; assert the outcome against
  // the engine — the thing that actually matters — not the attribute.
  await createBtn.click({ force: true }).catch(() => {});
  const after = await page.evaluate(
    () => (window as unknown as { CC: { groupList: () => unknown[] } }).CC.groupList().length,
  );
  expect(after).toBe(before);

  // switching to cloud workloads makes the same rule satisfiable
  await page.getByLabel('This group contains').selectOption('workload');
  await expect(warning).not.toBeVisible();
  await expect(createBtn).toBeEnabled();
});

// --- MUTATING: creates a group. Ordered last. ---
test('a person can create a group and see what it resolves to', async ({ page }) => {
  await firstVisit(page);

  await page.getByRole('button', { name: /^New group$/i }).click();

  await page.getByLabel('Group name').fill('Central sites');

  /* The id is shown BEFORE the commit, because the id — not the label — is
     what every policy stores, and renaming later will not rewrite them. */
  await expect(page.getByTestId('group-id-preview')).toHaveText('central-sites');
  await expect(page.getByTestId('group-id-warning')).toContainText(/renaming/i);

  // kind is chosen, never defaulted: it decides which estate the rule is
  // evaluated against.
  await expect(page.getByRole('button', { name: /^Create group$/i })).toBeDisabled();
  await page.getByLabel('This group contains').selectOption('site');
  await expect(page.getByTestId('group-kind-scope')).toContainText(/branch sites only/i);

  await page.getByRole('button', { name: /^Add a tag rule$/i }).click();
  await page.getByLabel('Tag key').selectOption('Region');
  await page.getByLabel('Tag value').fill('central');

  /* Expected membership, stated from the SEED and not from the UI: the only
     branches carrying Region=central are Dallas HQ and Chicago branch. No
     VPC carries Region=central at all, and this is a site group besides. */
  const preview = page.getByTestId('group-preview');
  await expect(preview).toContainText('Dallas HQ');
  await expect(preview).toContainText('Chicago branch');
  await expect(preview).toContainText('2 objects right now');
  await expect(preview).not.toContainText('vpc-west-01');

  await page.getByRole('button', { name: /^Create group$/i }).click();

  // it is in the list, resolving to what it should, with no reload
  expect(await resolvedCount(page, 'Central sites')).toBe(2);
  const row = page.locator('tbody tr', { hasText: 'Central sites' });
  await expect(row).toContainText('Dallas HQ');
  await expect(row).toContainText('Chicago branch');
  await expect(row).toContainText('central-sites');
  await expect(row).toContainText('anything where Region is central');
  await expect(row).toContainText('Branch sites');

  // the engine holds the id, label and kind the form showed
  const created = await page.evaluate(() =>
    (
      window as unknown as {
        CC: { groupList: () => { id: string; label: string; kind: string }[] };
      }
    ).CC.groupList().find(g => g.id === 'central-sites'),
  );
  expect(created).toBeTruthy();
  expect(created!.label).toBe('Central sites');
  expect(created!.kind).toBe('site');

  // and resolution is exactly the two central branches
  const resolved = await page.evaluate(() =>
    (
      window as unknown as {
        CC: { resolveGroup: (id: string) => { branchIds: string[]; vpcIds: string[] } };
      }
    ).CC.resolveGroup('central-sites'),
  );
  expect(resolved.branchIds.slice().sort()).toEqual(['br-chi', 'br-dal']);
  expect(resolved.vpcIds).toEqual([]);

  // the tab badge moved with it
  await expect(page.getByRole('button', { name: /^Groups/ })).toContainText('3');
});
