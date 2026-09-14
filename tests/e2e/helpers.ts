import type { Page } from '@playwright/test';

const AUTH_VALUE = JSON.stringify({ email: 'test@att.com' });

export async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    // Auth
    // Dismiss product tour
    localStorage.setItem('tour-main-app-completed', 'true');
    localStorage.setItem('product-tour-completed', 'true');
    // Skip NetBond Max demo modal
    localStorage.setItem('e2e-skip-demo-modal', 'true');
  });
}

export async function gotoUsers(page: Page) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
}

export async function gotoManage(page: Page) {
  await page.goto('/#/manage', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
}

export async function gotoCreate(page: Page) {
  await page.goto('/#/create', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
}

export async function gotoConnectionDetail(page: Page, id: string) {
  await page.goto(`/#/connections/${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
}

export async function switchRole(page: Page, role: 'user' | 'admin' | 'super-admin') {
  await page.evaluate((r) => (window as any).__setRole(r), role);
  await page.waitForTimeout(400);
}

/**
 * Layer-first nav: pick the layer up top, then the verb in the left rail.
 * Layers are the top tabs; the lifecycle verbs live in the persistent left
 * rail, Home first. This is how a pointer user reaches a verb.
 */
export async function openLayerVerb(
  page: Page,
  layer: 'NaaS' | 'AI Fabric',
  verb: 'Home' | 'Connect' | 'Govern' | 'Observe' | 'Cost',
) {
  // The AI rail's four verb GROUPS nest the gateway nouns; clicking a verb
  // means clicking that stage's lead item. Cost leads with Savings.
  const label =
    layer === 'AI Fabric'
      ? ({
          Observe: 'Insights',
          Govern: 'Policies',
          Connect: 'Providers',
          Cost: 'Savings',
        } as Record<string, string>)[verb] ?? verb
      : verb;
  await page.getByLabel('Main navigation').getByRole('tab', { name: layer, exact: true }).click();
  await page.getByTestId('left-rail').getByRole('link', { name: label, exact: true }).click();
}
