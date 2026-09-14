import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('AI Fabric prompt trace denies classified->external, NetOps live incident threads the loop and Act restores', async ({ page }) => {
  await seedAuth(page);

  // --- AI Fabric · Observe: classified tag -> external model is DENIED at the
  // token layer. The prompt trace used to sit behind a "Trace" tab on the one
  // AI Fabric page; the domain split put it on the AI Fabric's own Observe
  // screen, rendered directly with no tab in front of it. ---
  await page.goto('/#/ai/observe?tab=security', { waitUntil: 'domcontentloaded' }); // the prompt trace lives on the Security tab since the Insights rebuild

  // component defaults to classified-helion tag + gpt-class (external) model —
  // just run the trace with the defaults.
  await page.getByRole('button', { name: 'Trace', exact: true }).last().click();

  await expect(page.getByText(/denied/i).first()).toBeVisible();

  // --- NetOps: four capability panels + loop stages render in steady state ---
  await page.goto('/#/netops', { waitUntil: 'domcontentloaded' });

  for (const label of ['Network Topology', 'Anomaly Detection', 'Drift Detection', 'AI-Assisted Troubleshooting']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  for (const stage of ['Observe', 'Diagnose', 'Recommend', 'Act']) {
    await expect(page.getByText(stage, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText(/closed loop · steady/i)).toBeVisible();

  // --- Inject a live incident directly on the engine (window.CC), same
  // mutation the canonical repro uses, then drive the loop's Act button ---
  await page.evaluate(() => {
    const CC = (window as any).CC;
    if (!CC.onramps.find((o: any) => o.id === 'nb2')?.active) CC.activateOnramp('nb2');
    CC.simulateFailure('nb2');
  });

  await expect(page.getByText(/live signal in the loop/i)).toBeVisible();
  const actButton = page.getByRole('button', { name: /restore|act/i });
  await expect(actButton).toBeVisible();

  await actButton.click();

  // Act clears the incident in the engine -> loop returns to steady, Act button gone
  await expect(page.getByText(/closed loop · steady/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /restore|act/i })).toHaveCount(0);
});
