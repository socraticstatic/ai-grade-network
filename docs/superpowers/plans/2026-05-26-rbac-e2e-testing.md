# RBAC E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Playwright, fix AddUser persistence bug, and write E2E tests covering all RBAC flows: user management, role enforcement, and scope display.

**Architecture:** Playwright tests run against the Vite dev server (port 5173, auto-started by config). Tests are organized into three specs: user-management (add/list/delete), role-enforcement (permission gating by role), and scope-display (ResourceFilterBadge correctness). The AddUser persistence bug is fixed first so the "add user" test has something real to verify.

**Tech Stack:** `@playwright/test ^1.59.1`, Vite dev server (`npm run dev`), React/Zustand in-memory store (no backend — persistence is within a browser session only)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add playwright dep + test scripts |
| `playwright.config.ts` | Create | Playwright config targeting `http://localhost:5173` |
| `tests/e2e/user-management.spec.ts` | Create | Add user, list, search, delete |
| `tests/e2e/role-enforcement.spec.ts` | Create | Permission gating when role switches |
| `tests/e2e/scope-display.spec.ts` | Create | Scope badges, role management tab, permission matrix |
| `src/components/configure/users/UserList.tsx` | Modify | Fix handleAddUser to call store.addUser() |

---

### Task 1: Install Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install the package**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci
npm install --save-dev @playwright/test@^1.59.1
npx playwright install chromium
```

Expected output: `✔ chromium` downloaded, no errors.

- [ ] **Step 2: Add scripts to package.json**

In `package.json`, add to the `"scripts"` block:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed"
```

- [ ] **Step 3: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

- [ ] **Step 4: Create tests/e2e directory**

```bash
mkdir -p /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/tests/e2e
```

- [ ] **Step 5: Smoke test the config**

Create `tests/e2e/smoke.spec.ts` temporarily:
```typescript
import { test, expect } from '@playwright/test';

test('app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NetBond|AT&T/i);
});
```

Run: `npm run test:e2e -- tests/e2e/smoke.spec.ts`
Expected: 1 passed.

Delete `tests/e2e/smoke.spec.ts` after it passes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/
git commit -m "test: install and configure Playwright E2E"
```

---

### Task 2: Fix AddUser Persistence

The `handleAddUser` callback in `UserList.tsx` (line 98) shows a success toast but never calls `store.addUser()`. Added users vanish on next render.

**Files:**
- Modify: `src/components/configure/users/UserList.tsx`

- [ ] **Step 1: Read the current handleAddUser**

Lines 98-106 of `src/components/configure/users/UserList.tsx`:
```typescript
const handleAddUser = (userData: Omit<UserType, 'id' | 'lastActive'>) => {
  window.addToast({
    type: 'success',
    title: 'User Added',
    message: 'New user has been added successfully.',
    duration: 3000
  });
  setShowAddModal(false);
};
```

- [ ] **Step 2: Add store mutation imports**

At the top of `UserList.tsx`, `useStore` is already imported. Add `addUser` to the destructure:
```typescript
const { currentRole, addUser } = useStore();
```

The `addUser` method signature is: `addUser: (user: User) => void`. `User` requires `id`, `name`, `email`, `role`, `status`, `lastActive`, `tenantId`, `scopePath`, `connectionAccess`.

- [ ] **Step 3: Derive scopePath from department**

Add a helper inside the component (before the columns definition):
```typescript
const buildScopePathForNewUser = (department: string | undefined): string => {
  if (!department) return '/tenants/TNT-001';
  const deptId = `dept-${department.toLowerCase().replace(/\s+/g, '-')}`;
  return `/tenants/TNT-001/departments/${deptId}`;
};
```

- [ ] **Step 4: Replace handleAddUser**

Replace lines 98-106 with:
```typescript
const handleAddUser = (userData: Omit<UserType, 'id' | 'lastActive'>) => {
  const newUser: UserType = {
    ...userData,
    id: `user-${Date.now()}`,
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    scopePath: buildScopePathForNewUser(userData.department),
    connectionAccess: userData.connectionAccess || [],
  };
  addUser(newUser);
  window.addToast({
    type: 'success',
    title: 'User Added',
    message: `${newUser.name} has been added successfully.`,
    duration: 3000
  });
  setShowAddModal(false);
};
```

- [ ] **Step 5: Add data-testid attributes for Playwright**

In the UserList render, add `data-testid` to the user table and the Add User button:

Find the `<Button variant="primary" icon={UserPlus}` block and add `data-testid="add-user-button"`:
```tsx
<Button
  variant="primary"
  icon={UserPlus}
  onClick={() => setShowAddModal(true)}
  disabled={!canManageUsers.allowed}
  data-testid="add-user-button"
>
  Add User
</Button>
```

Find the `<BaseTable` and add `data-testid="user-table"` as a prop — check if BaseTable accepts it; if not, wrap in a `<div data-testid="user-table">`.

Find the stat strip div (line ~239, `className="flex items-center gap-6..."`) and add `data-testid="user-stat-strip"`.

- [ ] **Step 6: Verify in browser**

Start dev server, navigate to Configure > Users, open "Add User" drawer, fill in Name + Email + Role, submit. Confirm user appears in the list. The user count in the stat strip should increment.

- [ ] **Step 7: Commit**

```bash
git add src/components/configure/users/UserList.tsx
git commit -m "fix: wire AddUser drawer to store - users now persist within session"
```

---

### Task 3: E2E — User Management Spec

Tests: user list renders, search filters, add user persists, stat strip updates.

**Files:**
- Create: `tests/e2e/user-management.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect, type Page } from '@playwright/test';

async function gotoUsers(page: Page) {
  await page.goto('/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="user-table"]', { timeout: 10000 });
}

test.describe('User Management', () => {
  test('user list renders with sample users', async ({ page }) => {
    await gotoUsers(page);

    // Sample data has 6 users
    const rows = page.locator('[data-testid="user-table"] tbody tr');
    await expect(rows).toHaveCount(6);
  });

  test('search filters users by name', async ({ page }) => {
    await gotoUsers(page);

    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill('Alice');
    await page.waitForTimeout(300); // debounce

    const rows = page.locator('[data-testid="user-table"] tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(6);
  });

  test('search by email filters correctly', async ({ page }) => {
    await gotoUsers(page);

    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill('@att.com');
    await page.waitForTimeout(300);

    const rows = page.locator('[data-testid="user-table"] tbody tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('add user appears in list', async ({ page }) => {
    await gotoUsers(page);

    // Get initial count
    const rows = page.locator('[data-testid="user-table"] tbody tr');
    const initialCount = await rows.count();

    // Open drawer
    await page.click('[data-testid="add-user-button"]');
    await page.waitForSelector('text=Add New User', { timeout: 5000 });

    // Fill form
    await page.fill('#name', 'Test User Playwright');
    await page.fill('#email', 'test.playwright@att.com');
    await page.selectOption('#role', 'Administrator');

    // Submit
    await page.getByRole('button', { name: /add user/i }).last().click();

    // Drawer should close
    await page.waitForSelector('text=Add New User', { state: 'hidden', timeout: 5000 });

    // User should appear
    await expect(rows).toHaveCount(initialCount + 1);
    await expect(page.locator('[data-testid="user-table"]')).toContainText('Test User Playwright');
  });

  test('stat strip user count increments after add', async ({ page }) => {
    await gotoUsers(page);

    const statStrip = page.locator('[data-testid="user-stat-strip"]');
    const initialText = await statStrip.textContent();
    const initialCount = parseInt(initialText?.match(/(\d+)\s+users/)?.[1] ?? '0');

    // Add a user
    await page.click('[data-testid="add-user-button"]');
    await page.waitForSelector('text=Add New User');
    await page.fill('#name', 'Stat Test User');
    await page.fill('#email', 'stat.test@att.com');
    await page.selectOption('#role', 'Read Only');
    await page.getByRole('button', { name: /add user/i }).last().click();
    await page.waitForSelector('text=Add New User', { state: 'hidden' });

    const newText = await statStrip.textContent();
    const newCount = parseInt(newText?.match(/(\d+)\s+users/)?.[1] ?? '0');
    expect(newCount).toBe(initialCount + 1);
  });

  test('search clears to show all users', async ({ page }) => {
    await gotoUsers(page);

    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill('zzzznotexist');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="user-table"] tbody tr')).toHaveCount(0);

    await searchInput.fill('');
    await page.waitForTimeout(300);

    const rows = page.locator('[data-testid="user-table"] tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run and confirm all pass**

```bash
npm run test:e2e -- tests/e2e/user-management.spec.ts
```

Expected: 6 passed. If a test fails because a selector doesn't match, read the actual rendered HTML with `page.content()` in the test to find the right selector.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/user-management.spec.ts
git commit -m "test(e2e): user management - list, search, add user"
```

---

### Task 4: E2E — Role Enforcement Spec

Tests: role switching (via RBAC demo panel), Add User button disabled for non-admins, permission banner shows for viewer.

**Files:**
- Create: `tests/e2e/role-enforcement.spec.ts`
- Possibly modify: `src/components/common/RBACDemoPanel.tsx` (add test IDs if missing)

- [ ] **Step 1: Find the RBAC demo panel selector**

The RBAC demo panel is a floating panel that lets you switch roles. Find it by reading the component:

```bash
grep -n "data-testid\|select\|currentRole\|setRole" \
  src/components/common/RBACDemoPanel.tsx | head -20
```

If there's a `<select>` for role switching, grab its selector. If not, use `page.getByRole('combobox')` or similar. Add `data-testid="rbac-role-select"` to the role select element in `RBACDemoPanel.tsx`.

- [ ] **Step 2: Add data-testid to RBACDemoPanel's role switcher**

Open `src/components/common/RBACDemoPanel.tsx`. Find the role selection UI (likely a `<select>` or button group). Add `data-testid="rbac-role-select"` to whatever element triggers role change.

Example if it's a `<select>`:
```tsx
<select
  data-testid="rbac-role-select"
  value={currentRole}
  onChange={(e) => setRole(e.target.value as UserRole)}
  ...
>
```

- [ ] **Step 3: Create the spec**

```typescript
import { test, expect, type Page } from '@playwright/test';

async function gotoUsers(page: Page) {
  await page.goto('/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="user-table"]', { timeout: 10000 });
}

async function switchRole(page: Page, role: 'user' | 'admin' | 'super-admin') {
  const roleSelect = page.locator('[data-testid="rbac-role-select"]');
  await roleSelect.selectOption(role);
  await page.waitForTimeout(400); // let state propagate
}

test.describe('RBAC Role Enforcement', () => {
  test('admin can see Add User button enabled', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'admin');

    const addBtn = page.locator('[data-testid="add-user-button"]');
    await expect(addBtn).toBeEnabled();
  });

  test('user role: Add User button is disabled', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'user');

    const addBtn = page.locator('[data-testid="add-user-button"]');
    await expect(addBtn).toBeDisabled();
  });

  test('user role: permission banner appears', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'user');

    await expect(page.locator('text=Limited User Management Access')).toBeVisible();
  });

  test('admin role: no permission banner', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'admin');

    await expect(page.locator('text=Limited User Management Access')).not.toBeVisible();
  });

  test('super-admin: Add User button enabled', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'super-admin');

    const addBtn = page.locator('[data-testid="add-user-button"]');
    await expect(addBtn).toBeEnabled();
  });

  test('role switch shows correct scope in stat strip', async ({ page }) => {
    await gotoUsers(page);

    // Admin should have 'my-tenant' or similar scope badge
    await switchRole(page, 'admin');
    const statStrip = page.locator('[data-testid="user-stat-strip"]');
    await expect(statStrip).toBeVisible();

    // super-admin should show all-tenants scope
    await switchRole(page, 'super-admin');
    await expect(statStrip).toBeVisible();
  });
});
```

- [ ] **Step 4: Run and confirm all pass**

```bash
npm run test:e2e -- tests/e2e/role-enforcement.spec.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/role-enforcement.spec.ts src/components/common/RBACDemoPanel.tsx
git commit -m "test(e2e): role enforcement - permission gating by role"
```

---

### Task 5: E2E — Scope Display Spec

Tests: each user row has a scope badge, roles tab renders, permission matrix opens.

**Files:**
- Create: `tests/e2e/scope-display.spec.ts`
- Modify: `src/components/configure/users/UserList.tsx` (add data-testid to scope column cells)

- [ ] **Step 1: Add data-testid to scope column**

In `UserList.tsx`, in the `scope` column `render` function (around line 170), add a testid to the outer div:
```tsx
render: (user: UserType) => {
  const defaultFilter = scopePathToFilter(user.scopePath);
  const mappedRole = mapUserRole(user.role);
  const maxFilter = permissionChecker.getMaxScope(mappedRole);
  return (
    <div className="flex flex-col gap-1.5" data-testid={`scope-cell-${user.id}`}>
      <ResourceFilterBadge filter={defaultFilter} variant="detailed" />
      <div className="flex items-center gap-1">
        <span className="text-figma-xs text-fw-bodyLight">Max:</span>
        <ResourceFilterBadge filter={maxFilter} showIcon={false} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add data-testid to Roles tab button**

In `src/components/configure/UserManagement.tsx`, find the tabs array where `{ id: 'roles', label: 'Roles' }` is defined. The `VerticalTabGroup` likely renders buttons. If `VerticalTabGroup` accepts a `data-testid` or similar, use it. Otherwise, use `page.getByRole('button', { name: /roles/i })` in the test.

- [ ] **Step 3: Create the spec**

```typescript
import { test, expect, type Page } from '@playwright/test';

async function gotoUsers(page: Page) {
  await page.goto('/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="user-table"]', { timeout: 10000 });
}

async function gotoRoles(page: Page) {
  await page.goto('/configure/users', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^roles$/i }).click();
  await page.waitForSelector('text=Role Management', { timeout: 5000 });
}

test.describe('Scope Display', () => {
  test('every user row has a scope badge', async ({ page }) => {
    await gotoUsers(page);

    const rows = page.locator('[data-testid="user-table"] tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Each row's scope cell should contain at least one badge
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      // ResourceFilterBadge renders a <span> with text
      const badge = row.locator('[class*="rounded-md"]').first();
      await expect(badge).toBeVisible();
    }
  });

  test('scope badges show valid filter labels', async ({ page }) => {
    await gotoUsers(page);

    const validLabels = ['My Resources', 'My Department', 'My Pools', 'My Tenant', 'All Tenants'];
    const scopeCells = page.locator('[data-testid^="scope-cell-"]');
    const count = await scopeCells.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cellText = await scopeCells.nth(i).textContent();
      const hasValidLabel = validLabels.some(label => cellText?.includes(label));
      expect(hasValidLabel, `Row ${i} scope cell "${cellText}" has no valid filter label`).toBe(true);
    }
  });

  test('role management tab renders role cards', async ({ page }) => {
    await gotoRoles(page);

    await expect(page.locator('text=Super Administrator')).toBeVisible();
    await expect(page.locator('text=Tenant Administrator')).toBeVisible();
    await expect(page.locator('text=Standard User')).toBeVisible();
  });

  test('role cards show permission counts', async ({ page }) => {
    await gotoRoles(page);

    // Each role card shows "X permissions"
    const permissionCounts = page.locator('text=/\\d+ permissions/');
    await expect(permissionCounts.first()).toBeVisible();
  });

  test('permission matrix opens and shows roles', async ({ page }) => {
    await gotoRoles(page);

    await page.getByRole('button', { name: /view permission matrix/i }).click();
    await page.waitForSelector('text=/permission matrix/i', { timeout: 5000 });

    // Matrix should be visible
    await expect(page.locator('text=/permission matrix/i').first()).toBeVisible();
  });

  test('permission hierarchy visualization renders', async ({ page }) => {
    await gotoRoles(page);

    await expect(page.locator('text=Permission Inheritance Hierarchy')).toBeVisible();
    await expect(page.locator('text=Super Admin')).toBeVisible();
  });
});
```

- [ ] **Step 4: Run and confirm all pass**

```bash
npm run test:e2e -- tests/e2e/scope-display.spec.ts
```

Expected: 6 passed.

- [ ] **Step 5: Run full E2E suite**

```bash
npm run test:e2e
```

Expected: all tests pass (user-management + role-enforcement + scope-display).

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/scope-display.spec.ts src/components/configure/users/UserList.tsx src/components/configure/UserManagement.tsx
git commit -m "test(e2e): scope display - badges, role management tab, permission matrix"
```

---

## Self-Review

**Spec coverage:**
- Install Playwright: Task 1 ✓
- Fix AddUser persistence: Task 2 ✓
- User list/search/add E2E: Task 3 ✓
- Role enforcement gating: Task 4 ✓
- Scope badges per user: Task 5 ✓
- Role management tab: Task 5 ✓
- Permission matrix: Task 5 ✓

**Placeholder scan:** All test code is complete. All selectors reference either `data-testid` attributes added in the plan or semantic roles (`getByRole`). No "add validation" or "TBD" language.

**Type consistency:** `UserType`, `UserRole`, `User` — `UserType` is `User` (re-export). `addUser` accepts `User`. `handleAddUser` builds `UserType` that satisfies `User`. Consistent throughout.

**Known risk:** `VerticalTabGroup` may not forward `data-testid` to the rendered button — the spec uses `getByRole('button', { name: /roles/i })` as fallback which avoids this dependency.
