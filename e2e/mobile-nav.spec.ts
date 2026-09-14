import { test, expect, type Page } from '@playwright/test';

/* Below 1280px the horizontal nav (MainNav.tsx) disappears entirely — it's
   `hidden min-[1280px]:flex`. The hamburger next to the logo is the only way
   to reach any section, AI Fabric included, at those widths. It used to
   toggle a vertical-nav overlay (AdaptiveNavigation) that rendered as an
   empty panel clipped to the header's own height — a CSS containing-block
   bug from `<nav>`'s backdrop-blur-md, on top of never being wired to
   anything with real nav items. The fully-built MobileMenu drawer sat
   mounted and unreachable the whole time. This walks what a person hits at
   900x800: no AI Fabric in the bar, hamburger opens the real drawer, and the
   drawer actually gets you there. */

async function firstVisit(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

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
}

test.use({ viewport: { width: 900, height: 800 } });

test('neither domain is reachable from the horizontal nav, but the hamburger drawer gets you to both', async ({
  page,
}) => {
  await firstVisit(page);

  // At 900px the desktop nav block (`hidden min-[1280px]:flex`) never
  // renders — no section is an on-screen link, AI Fabric least of all.
  await expect(page.getByRole('link', { name: 'Connect', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Discover', exact: true })).toHaveCount(0);

  // The drawer is mounted (MobileMenu is always in the tree) but closed.
  await expect(page.getByLabel('Close menu')).not.toBeVisible();

  await page.locator('[data-nav-toggle="true"]').click();

  /* The drawer opened with real navigation in it — not an empty panel. Both
     domains carry the SAME four verb labels, so the drawer has to keep them
     apart: each is a named group, and "Govern" inside the AI Fabric group must
     go somewhere different from "Govern" inside NaaS. A drawer that flattened
     the two would send both to the same screen and pass a naive assertion. */
  const naas = page.getByRole('group', { name: 'NaaS' });
  const ai = page.getByRole('group', { name: 'AI Fabric' });
  await expect(naas).toBeVisible();
  await expect(ai).toBeVisible();
  for (const verb of ['Connect', 'Govern', 'Observe', 'Cost']) {
    await expect(naas.getByRole('button', { name: new RegExp(`^${verb}`) })).toBeVisible();
  }
  // The AI group speaks the gateway vocabulary.
  for (const section of ['Insights', 'Policies', 'Teams & limits', 'Providers', 'Virtual keys']) {
    await expect(ai.getByRole('button', { name: new RegExp(`^${section}`) })).toBeVisible();
  }

  await ai.getByRole('button', { name: /^Policies/ }).click();

  // The route changed — to the AI Fabric's Govern surface, not NaaS's.
  await expect(page).toHaveURL(/#\/ai\/govern/);
  await expect(page.getByRole('heading', { name: /AI Fabric · Govern/i })).toBeVisible();

  // And the drawer closed itself after navigating.
  await expect(page.getByLabel('Close menu')).not.toBeVisible();

  // The other domain's same-named verb is a different screen.
  await page.locator('[data-nav-toggle="true"]').click();
  await page.getByRole('group', { name: 'NaaS' }).getByRole('button', { name: /^Govern/ }).click();
  await expect(page).toHaveURL(/#\/naas\/govern/);
});

test('the drawer panel and backdrop actually fill the viewport, not a clipped strip', async ({
  page,
}) => {
  // Reachability assertions (above, and in the rest of this file) confirm the
  // drawer's contents exist and respond to clicks — but that's exactly what
  // sailed past the real bug once: `<nav>` carries `backdrop-blur-md`, and
  // CSS backdrop-filter establishes a containing block for `position: fixed`
  // descendants. Any fixed-position drawer whose containing block resolves to
  // `<nav>` instead of the viewport renders as a strip clipped to the nav's
  // own ~64px height — fully present in the DOM, fully clickable via
  // Playwright's actionability checks (which don't require visible pixels
  // outside a clipped ancestor the way a human eye would), and totally
  // invisible as a rendered surface. This is the assertion that catches that
  // geometrically, against the actual viewport size rather than a hardcoded
  // pixel value.
  await firstVisit(page);

  await page.locator('[data-nav-toggle="true"]').click();
  await expect(page.getByLabel('Close menu')).toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size unavailable');

  const panel = page
    .getByLabel('Close menu')
    .locator('xpath=ancestor::div[contains(@class,"fixed")][1]');
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.height).toBeGreaterThan(viewport.height * 0.9);

  // Backdrop is the other `fixed inset-0` element the drawer renders — the
  // click-outside-to-close scrim. It must cover the full viewport too, or a
  // 64px containing-block clip would shrink it right alongside the panel.
  const backdrop = page.locator('.fixed.inset-0.bg-black\\/50');
  const backdropBox = await backdrop.boundingBox();
  expect(backdropBox).not.toBeNull();
  expect(backdropBox!.width).toBeGreaterThan(viewport.width * 0.9);
  expect(backdropBox!.height).toBeGreaterThan(viewport.height * 0.9);
});

/* ─────────────────────────────────────────────────────────────────────────
   THE FOLD.

   Below 1280px this drawer is the only route to any of the nine
   destinations, and the NaaS/AI Fabric split doubled what it has to carry.
   Reachable-by-scrolling is not the same as legible: at 900x800 the nav
   scroller measured 525px holding 745px, so the AI Fabric group opened with
   its label and one verb visible and the other three below the fold, on the
   one surface that can reach them.

   These assert geometry, not markup — scrollHeight against clientHeight and
   each destination's own bottom edge against the scroller's. A layout that
   merely LOOKS denser in the source fails them; a layout that fits passes
   whatever shape it takes.

   The companion assertion is the one that stops the cheap fix. Both domains
   carry the identical four verb labels, so "Connect" and "Connect" are two
   different screens with one name. Deleting the per-verb descriptions would
   fit the fold instantly and leave the drawer lying about where each link
   goes, so every verb button must still say something the other domain's
   same-named button does not.
   ───────────────────────────────────────────────────────────────────────── */

interface FoldReading {
  clientHeight: number;
  scrollHeight: number;
  overflow: number;
  scrollerBottom: number;
  groups: { label: string; bottom: number; aboveFold: boolean }[];
  items: { label: string; group: string; text: string; bottom: number; aboveFold: boolean }[];
}

async function readFold(page: Page): Promise<FoldReading> {
  await page.locator('[data-nav-toggle="true"]').click();
  await expect(page.getByLabel('Close menu')).toBeVisible();
  // The drawer springs in; measure after it has settled.
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>('[data-testid="drawer-nav-scroller"]');
    if (!scroller) throw new Error('drawer nav scroller not found');
    const sb = scroller.getBoundingClientRect().bottom;

    const groups = [...scroller.querySelectorAll<HTMLElement>('[role="group"]')].map(g => ({
      label: g.getAttribute('aria-label') ?? '',
      bottom: Math.round(g.getBoundingClientRect().bottom),
      aboveFold: g.getBoundingClientRect().bottom <= sb + 0.5,
    }));

    const items = [...scroller.querySelectorAll<HTMLElement>('button[data-nav-to]')].map(b => {
      const g = b.closest('[role="group"]');
      return {
        label: b.getAttribute('data-nav-label') ?? '',
        group: g?.getAttribute('aria-label') ?? '',
        text: (b.innerText ?? '').replace(/\s+/g, ' ').trim(),
        bottom: Math.round(b.getBoundingClientRect().bottom),
        aboveFold: b.getBoundingClientRect().bottom <= sb + 0.5,
      };
    });

    return {
      clientHeight: scroller.clientHeight,
      scrollHeight: scroller.scrollHeight,
      overflow: scroller.scrollHeight - scroller.clientHeight,
      scrollerBottom: Math.round(sb),
      groups,
      items,
    };
  });
}

/* 375x667 is first, and it is the reason this list is a list.
   The drawer was previously measured at 375x812 / 768x1024 / 900x800 and fit
   all three — while an iPhone SE / 8 (375x667, the shortest phone still in the
   support matrix) gave the scroller 392px for 409px of destinations, putting
   `/ai/observe` and `/ai/cost` 17px below the fold. A fold test that only
   measures the viewports the layout was designed against measures the
   designer, not the layout. 1023x700 is the last width before the desktop bar
   returns at 1280px, i.e. the tallest-content / shortest-viewport corner. */
for (const vp of [
  { width: 375, height: 667 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 900, height: 800 },
  { width: 1023, height: 700 },
]) {
  test.describe(`drawer fold at ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp });

    test('every destination in both domains sits above the fold', async ({ page }) => {
      await firstVisit(page);
      const fold = await readFold(page);

      // Ten destinations: Discover, NaaS's four verbs, and the AI gateway's
      // five (Insights + the Governance group; phase 3 rehomed the interim
      // Connect and Cost). Each layer's Home is its tappable group header,
      // not a counted grid cell. AI items with labels unique in the drawer
      // render compact — no description line.
      expect(fold.items).toHaveLength(12);

      expect(
        fold.overflow,
        `nav scroller is ${fold.clientHeight}px holding ${fold.scrollHeight}px — ${fold.overflow}px below the fold`,
      ).toBeLessThanOrEqual(0);

      const below = fold.items.filter(i => !i.aboveFold);
      expect(
        below.map(i => `${i.group || 'Discover'} · ${i.label}`),
        'destinations reachable only by scrolling',
      ).toEqual([]);

      for (const g of fold.groups) {
        expect(g.aboveFold, `the ${g.label} group runs past the fold`).toBe(true);
      }
    });

    test('no label is ambiguous: twins carry distinct copy, uniques stand alone', async ({ page }) => {
      await firstVisit(page);
      const fold = await readFold(page);

      // Since the AI layer adopted the gateway sections, no label repeats
      // across groups — but the rule this test guards is general: ANY label
      // that appears in two groups must carry copy that tells them apart.
      const byLabel = new Map<string, typeof fold.items>();
      for (const item of fold.items) {
        byLabel.set(item.label, [...(byLabel.get(item.label) ?? []), item]);
      }
      for (const [label, items] of byLabel) {
        if (items.length < 2) continue;
        for (const item of items) {
          expect(
            item.text.replace(label, '').trim().length,
            `${item.group} · ${label} shows nothing but its ambiguous label`,
          ).toBeGreaterThan(0);
        }
        const texts = new Set(items.map(i => i.text));
        expect(texts.size, `"${label}" reads identically in two groups`).toBe(items.length);
      }

      // And the NaaS verbs specifically still say what they act on.
      for (const verb of ['Connect', 'Govern', 'Observe', 'Cost']) {
        const naas = fold.items.find(i => i.label === verb && i.group === 'NaaS');
        expect(naas, `NaaS · ${verb} missing from the drawer`).toBeTruthy();
      }
    });
  });
}
