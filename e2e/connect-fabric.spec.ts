import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('Connect is one cloud fabric: select a region, provision it, it joins the fabric', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  // The fabric hero renders with region nodes.
  const hero = page.getByTestId('fabric-hero');
  await expect(hero).toBeVisible();

  // us-west-2 starts public (unattached) — its edge encodes public.
  const usw2Edge = page.locator('[data-fabric-edge][data-region-id="usw2"]').first();
  await expect(usw2Edge).toHaveAttribute('data-path', 'public');

  // Click the region node → its panel opens with a Provision action.
  await page.getByTestId('fabric-node-region-usw2').click();
  const provision = page.getByTestId('open-provision-wizard');
  await expect(provision).toBeVisible();
  await provision.click();

  // Walk the wizard: attach type → on-ramp → resiliency → confirm.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole('button', { name: /^Next$/i }).click();
  }
  await dialog.getByTestId('provision-confirm').click();

  // The region flips to connected/private on the fabric.
  await expect(page.locator('[data-fabric-edge][data-region-id="usw2"]').first())
    .toHaveAttribute('data-path', 'private');
  await expect(page.getByTestId('fabric-node-region-usw2')).toHaveAttribute('data-path', 'private');

  // The steerable Paths table is NOT on Connect — it lives on Observe.
  await expect(page.getByText('Flows & paths')).toHaveCount(0);
});

test('the steerable Paths table lives on Observe, not Connect', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Flows & paths')).toBeVisible();
});

test('a selected region shows both connectivity paths with engine-derived latency', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('fabric-node-region-use1').click();

  await expect(page.getByTestId('path-managed-direct')).toBeVisible();
  await expect(page.getByTestId('path-tenanted')).toBeVisible();

  // The latency on the card is fabricModel()'s — the same figure, in the same
  // format, as the panel's Performance tile a few lines above — never the raw
  // `region.lat` seed.
  const shape = await page.evaluate(() =>
    (window as never as {
      CC: { fabricModel(): { regions: { cloudId: string; regionId: string; latencyMs: number }[] } };
    }).CC.fabricModel().regions.find(r => r.cloudId === 'aws' && r.regionId === 'use1')!,
  );
  // us-east-1 is reached only by the tenanted on-ramp, and the region's figure
  // is that on-ramp's RTT. It renders on the card that carries the path…
  await expect(page.getByTestId('path-tenanted')).toContainText(`${shape.latencyMs}ms`);
  // …and NOT on the card that has just said the path does not reach this region.
  await expect(page.getByTestId('path-managed-direct')).toHaveAttribute('data-availability', 'none');
  await expect(page.getByTestId('path-managed-direct')).not.toContainText(`${shape.latencyMs}ms`);
  await expect(page.getByTestId('path-managed-direct')).not.toContainText('Latency');
});

test('the path cards state availability honestly: live only where an on-ramp is active', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  // us-east-1 is carried by the one active on-ramp (NetBond), and by nothing else.
  await page.getByTestId('fabric-node-region-use1').click();
  await expect(page.getByTestId('path-tenanted')).toHaveAttribute('data-availability', 'live');
  await expect(page.getByTestId('path-tenanted')).toContainText('Live here');
  await expect(page.getByTestId('path-managed-direct')).toHaveAttribute('data-availability', 'none');
  await expect(page.getByTestId('path-managed-direct')).toContainText('Not available here');

  // UK South's only on-ramp is inactive — provisionable, not green "Available".
  await page.getByTestId('fabric-node-region-uks').click();
  await expect(page.getByTestId('path-managed-direct')).toHaveAttribute('data-availability', 'provisionable');
  await expect(page.getByTestId('path-managed-direct')).toContainText('Provisionable here');
  await expect(page.getByTestId('path-tenanted')).toContainText('Not available here');

  // Nothing on this surface claims a partner fabric or an L3 hand-off.
  await expect(page.getByTestId('path-managed-direct')).not.toContainText(/Equinix Fabric/i);
  await expect(page.getByTestId('path-managed-direct')).not.toContainText(/\bL3\b/);
});
