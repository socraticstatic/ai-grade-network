import { test, expect, type Page } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * Reduced motion must actually reduce motion, app-wide.
 *
 * The defect this file exists to catch: tailwind.config.js sets
 * `important: true`, so every `animate-*` utility emits
 * `animation: … !important` from a CLASS selector. The global
 * `prefers-reduced-motion: reduce` block in index.css zeroes
 * `animation-duration` with `!important` on the UNIVERSAL selector — and
 * when both declarations are important, class specificity wins. Result:
 * every `animate-pulse` / `animate-spin` in the app kept animating for
 * exactly the users who asked it not to.
 *
 * Everything here is asserted on COMPUTED style, not class lists, because
 * the bug is a cascade bug — the classes were always "right".
 *
 * The probe element is injected into the live app's DOM so the assertions
 * run against the real compiled stylesheet (the one Tailwind emitted from
 * this config), not a component that may or may not be on screen in a given
 * app state. The control test below proves the utility really is in the
 * bundle and really animates when motion is allowed — so the reduce tests
 * cannot pass vacuously.
 */

async function loadApp(page: Page) {
  await seedAuth(page);
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('table tbody tr').first()).toBeVisible();
}

/** Injects a probe carrying `cls` and returns its computed animation facts. */
async function probeAnimation(page: Page, cls: string) {
  return page.evaluate(clsName => {
    const el = document.createElement('div');
    el.className = clsName;
    el.textContent = 'probe';
    document.body.appendChild(el);
    const s = getComputedStyle(el);
    const facts = {
      name: s.animationName,
      durationSeconds: parseFloat(s.animationDuration),
      iterationCount: s.animationIterationCount,
    };
    el.remove();
    return facts;
  }, cls);
}

/** Suppressed = the animation cannot produce perceptible motion: either it
 *  is gone entirely, or it runs once in a fraction of a millisecond. */
function expectSuppressed(facts: { name: string; durationSeconds: number; iterationCount: string }) {
  if (facts.name === 'none') return;
  expect(facts.durationSeconds).toBeLessThanOrEqual(0.001);
  expect(facts.iterationCount).toBe('1');
}

test('control: animate-pulse really animates when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadApp(page);
  const facts = await probeAnimation(page, 'animate-pulse');
  // Tailwind's pulse: 2s, infinite. If this fails the reduce tests below
  // would be meaningless — the utility would not be in the bundle at all.
  expect(facts.name).not.toBe('none');
  expect(facts.durationSeconds).toBeGreaterThan(1);
  expect(facts.iterationCount).toBe('infinite');
});

test('animate-pulse is suppressed under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadApp(page);
  expectSuppressed(await probeAnimation(page, 'animate-pulse'));
});

test('animate-spin is suppressed under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadApp(page);
  expectSuppressed(await probeAnimation(page, 'animate-spin'));
});

test('a real on-screen animate-pulse element is suppressed under reduce', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadApp(page);
  // StatusBadge and Skeleton both use bare `animate-pulse`; rather than
  // depending on one screen state, assert over every animate-pulse element
  // currently in the document — and if none is on screen, the injected-probe
  // test above already covered the cascade.
  const facts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="animate-pulse"]')).map(el => {
      const s = getComputedStyle(el);
      return {
        name: s.animationName,
        durationSeconds: parseFloat(s.animationDuration),
        iterationCount: s.animationIterationCount,
      };
    });
  });
  for (const f of facts) {
    if (f.name === 'none') continue;
    expect(f.durationSeconds).toBeLessThanOrEqual(0.001);
    expect(f.iterationCount).toBe('1');
  }
});

test('the motion-safe reveal sites still animate when motion is allowed', async ({ page }) => {
  // The three already-correct sites gate through motion-safe:/matchMedia.
  // This guards the fix from overcorrecting: under NO-PREFERENCE the fix
  // must change nothing, or the payoff reveal dies with the bug.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadApp(page);
  const target = await page.evaluate(() => {
    const CC = (window as unknown as { CC: any }).CC;
    const r = CC.ruleList().find((x: any) => !CC.ruleEnforced(x));
    return { name: r.name };
  });
  const row = page.locator('table tbody tr').filter({ hasText: target.name }).first();
  await row.getByRole('button', { name: /more options/i }).click();
  await page.getByRole('menu').getByRole('button', { name: /^Enforce$/ }).click();
  const animated = page.locator('[data-testid="govern-enforced-delta"] [class*="cc-reveal"]')
    .or(page.locator('[class*="cc-reveal"]'));
  await expect(animated.first()).toBeVisible();
  const name = await animated.first().evaluate(el => getComputedStyle(el).animationName);
  expect(name).toContain('cc-reveal');
});
