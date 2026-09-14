import { test, expect, type Page } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The payoff beat: enforcing a rule must SHOW what moved.
 *
 * Every expected figure here is read straight off `window.CC` — once before
 * the click and once after — and compared to what the panel printed. Reading
 * the numbers back out of the DOM would only prove the panel agrees with
 * itself; taking them from the engine proves it agrees with Govern, Observe
 * and Cost, which read the same calls.
 */

const PANEL = '[data-testid="govern-enforced-delta"]';

async function firstMove(page: Page) {
  await seedAuth(page);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('tour-main-app-completed', 'true');
    localStorage.setItem('product-tour-completed', 'true');
    localStorage.setItem('e2e-skip-demo-modal', 'true');
  });
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('table tbody tr').first()).toBeVisible();
}

/** The three Govern-native figures, read from the same calls the rest of the
 *  screen reads them from. Deliberately re-expressed here rather than
 *  imported, so a change to the component cannot quietly change the oracle. */
async function readState(page: Page) {
  return page.evaluate(() => {
    const CC = (window as unknown as { CC: any }).CC;
    return {
      posture: CC.posture(),
      violations: CC.violations().length,
      enforced: CC.ruleList().filter((r: any) => CC.ruleEnforced(r)).length,
      total: CC.ruleList().length,
    };
  });
}

/** Enforce through the row's overflow menu — the path a viewer actually takes. */
async function enforceViaMenu(page: Page, ruleName: string) {
  const row = page.locator('table tbody tr').filter({ hasText: ruleName }).first();
  await row.getByRole('button', { name: /more options/i }).click();
  await page.getByRole('menu').getByRole('button', { name: /^Enforce$/ }).click();
}

test('enforcing from the overflow menu shows the delta the engine actually produced', async ({
  page,
}) => {
  await firstMove(page);

  // Nothing has been acted on yet, so there is nothing to report — but the
  // live region itself is already mounted, EMPTY. A region inserted only at
  // announcement time is commonly not announced at all; this emptiness is
  // the fix, not an accident.
  await expect(page.locator(PANEL)).toHaveCount(1);
  await expect(page.locator(PANEL)).toBeEmpty();

  const target = await page.evaluate(() => {
    const CC = (window as unknown as { CC: any }).CC;
    const r = CC.ruleList().find((x: any) => !CC.ruleEnforced(x));
    return { id: r.id, name: r.name };
  });

  const before = await readState(page);
  await enforceViaMenu(page, target.name);

  const panel = page.locator(PANEL);
  await expect(panel).toBeVisible();
  const after = await readState(page);

  // The rule that was acted on is named — a delta with no subject is a toast.
  await expect(panel).toContainText(target.name);

  // Rules enforced always moves by exactly one, so this row always renders.
  expect(after.enforced).toBe(before.enforced + 1);
  await expect(page.locator('[data-testid="govern-enforced-rules"]')).toHaveText(
    `${before.enforced} → ${after.enforced}`,
  );

  // Violations and posture are claimed ONLY when they genuinely moved.
  if (after.violations !== before.violations) {
    await expect(page.locator('[data-testid="govern-enforced-violations"]')).toHaveText(
      `${before.violations} → ${after.violations}`,
    );
  } else {
    await expect(page.locator('[data-testid="govern-enforced-violations"]')).toHaveCount(0);
  }
  if (after.posture !== before.posture) {
    await expect(page.locator('[data-testid="govern-enforced-posture"]')).toHaveText(
      `${before.posture} → ${after.posture}`,
    );
  } else {
    await expect(page.locator('[data-testid="govern-enforced-posture"]')).toHaveCount(0);
  }

  // Never print a figure against itself. This is the "60 → 60" bug.
  await expect(panel).not.toContainText(`${before.posture} → ${before.posture}`);
  await expect(panel).not.toContainText(`${before.violations} → ${before.violations}`);

  await expect(panel).toHaveAttribute('aria-live', 'polite');
});

test('a rule that moves nothing but the enforcement count says so instead of padding zeros', async ({
  page,
}) => {
  await firstMove(page);

  // Drive the estate to the point where the remaining rules clear nothing —
  // the same "step 7 of 8" position the recommendation band has its own copy
  // for. Whatever is left moves neither violations nor posture.
  const target = await page.evaluate(() => {
    const CC = (window as unknown as { CC: any }).CC;
    const clears = (r: any) => {
      const open = CC.violations().length;
      if (r.fix) {
        const p = CC.previewFix(r.fix);
        if (p) return open - p.violations;
      }
      return CC.violations().filter((v: any) => v.policy === r.id).length;
    };
    let guard = 0;
    for (;;) {
      const left = CC.ruleList().filter((r: any) => !CC.ruleEnforced(r));
      const best = left.slice().sort((a: any, b: any) => clears(b) - clears(a))[0];
      if (!best || clears(best) === 0 || guard++ > 20) {
        return best ? { id: best.id, name: best.name } : null;
      }
      CC.enforceAny(best.id);
    }
  });
  expect(target).not.toBeNull();

  const before = await readState(page);
  await enforceViaMenu(page, target!.name);
  const panel = page.locator(PANEL);
  await expect(panel).toBeVisible();
  const after = await readState(page);

  // Sanity: we really are testing the degenerate case.
  expect(after.violations).toBe(before.violations);
  expect(after.posture).toBe(before.posture);

  // No zero-delta rows, no "X → X", and no red — an unmoved figure is not a
  // violation.
  await expect(page.locator('[data-testid="govern-enforced-violations"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="govern-enforced-posture"]')).toHaveCount(0);
  await expect(panel).not.toContainText(`${before.posture} → ${before.posture}`);
  await expect(panel).not.toContainText(/[+-]0\b/);

  // ...and it says so out loud rather than falling silent.
  const held = page.locator('[data-testid="govern-enforced-held"]');
  await expect(held).toBeVisible();
  await expect(held).toContainText(`${before.posture}`);
  await expect(held).toContainText(`${before.violations}`);
});

test('the consequence panel does not animate under prefers-reduced-motion', async ({ page }) => {
  // Asserted on COMPUTED style, not on the class list. `important: true` in
  // tailwind.config.js means a bare `[animation:...]` utility emits
  // `!important` from a class selector and beats the global
  // `prefers-reduced-motion` block's `!important` longhand on `*` — so a
  // class-list assertion would have passed while the panel kept animating.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await firstMove(page);

  const target = await page.evaluate(() => {
    const CC = (window as unknown as { CC: any }).CC;
    const r = CC.ruleList().find((x: any) => !CC.ruleEnforced(x));
    return { name: r.name };
  });
  await enforceViaMenu(page, target.name);

  const panel = page.locator(PANEL);
  await expect(panel).toBeVisible();
  // The reveal animation rides on the panel's inner content div (the live
  // region wrapper itself never animates — it must never remount or move).
  const animation = await panel
    .locator(':scope > div')
    .evaluate(el => getComputedStyle(el).animationName);
  expect(animation).toBe('none');

  // Still fully readable — reduced motion removes the arrival, not the content.
  await expect(page.locator('[data-testid="govern-enforced-rules"]')).toBeVisible();
});

test('the recommendation band produces the same consequence as the row menu', async ({ page }) => {
  await firstMove(page);

  const named = page.locator('[data-testid="govern-next-move-rule"]');
  await expect(named).toBeVisible();
  const ruleName = (await named.textContent())!.trim();

  const before = await readState(page);
  await page.getByRole('button', { name: /enforce this rule/i }).click();

  const panel = page.locator(PANEL);
  await expect(panel).toBeVisible();
  const after = await readState(page);

  await expect(panel).toContainText(ruleName);
  await expect(page.locator('[data-testid="govern-enforced-rules"]')).toHaveText(
    `${before.enforced} → ${after.enforced}`,
  );
  if (after.violations !== before.violations) {
    await expect(page.locator('[data-testid="govern-enforced-violations"]')).toHaveText(
      `${before.violations} → ${after.violations}`,
    );
  }
});
