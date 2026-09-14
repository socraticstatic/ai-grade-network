# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build five FLYWHEEL-compliant notification components (AlertDialog, WarningDialog, Toast, AnnouncementBanner, ConfirmDialog) plus a `/notifications/showcase` demo page for stakeholder review.

**Architecture:** A new Zustand slice (`inAppNotificationSlice`) holds UI state for active dialogs, toasts, and banner. Components read from and write to this slice. A showcase page at `/notifications/showcase` lets stakeholders trigger each type with realistic NetBond copy. Existing `window.addToast` calls in other components remain working via a backward-compat shim in the new `ToastContainer`.

**Tech Stack:** React 18, TypeScript, Zustand, Framer Motion (already installed), Tailwind CSS with FLYWHEEL tokens, Lucide React icons, Vitest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/store/slices/inAppNotificationSlice.ts` | Zustand slice: state + actions for alerts, warnings, toasts, banner, confirm |
| Modify | `src/store/useStore.ts` | Add `inAppNotificationSlice` to combined store |
| Create | `src/components/common/notifications/SupportID.tsx` | Shared primitive: monospace ID link to mock ticket |
| Create | `src/components/common/notifications/AlertDialog.tsx` | Critical error modal with 5-part content, red left bar |
| Create | `src/components/common/notifications/WarningDialog.tsx` | Warning modal with 5-part content, amber left bar |
| Create | `src/components/common/notifications/Toast.tsx` | Single toast item: left bar, auto-dismiss, pause on hover |
| Create | `src/components/common/notifications/ToastContainer.tsx` | Toast stack manager; replaces `OptimizedToast.tsx` |
| Create | `src/components/common/notifications/AnnouncementBanner.tsx` | Top-of-page strip, light blue tint, dismiss |
| Create | `src/components/common/notifications/ConfirmDialog.tsx` | "Are you sure" modal, standard + destructive variants |
| Create | `src/components/common/notifications/index.ts` | Barrel export |
| Create | `src/components/pages/NotificationsShowcasePage.tsx` | Demo trigger page |
| Modify | `src/App.tsx` | Swap `ToastContainer`, add `AnnouncementBanner`, add showcase route |
| Create | `src/store/slices/inAppNotificationSlice.test.ts` | Unit tests for slice |
| Create | `src/components/common/notifications/SupportID.test.tsx` | Unit tests |
| Create | `src/components/common/notifications/AlertDialog.test.tsx` | Unit tests |
| Create | `src/components/common/notifications/Toast.test.tsx` | Unit tests |
| Create | `src/components/common/notifications/AnnouncementBanner.test.tsx` | Unit tests |
| Create | `src/components/common/notifications/ConfirmDialog.test.tsx` | Unit tests |

---

## Task 1: Zustand slice — inAppNotificationSlice

**Files:**
- Create: `src/store/slices/inAppNotificationSlice.ts`
- Create: `src/store/slices/inAppNotificationSlice.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/store/slices/inAppNotificationSlice.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createInAppNotificationSlice, InAppNotificationSlice } from './inAppNotificationSlice';

const useTestStore = create<InAppNotificationSlice>()((...args) => ({
  ...createInAppNotificationSlice(...args),
}));

describe('inAppNotificationSlice', () => {
  beforeEach(() => {
    useTestStore.setState({
      activeAlert: null,
      activeWarning: null,
      activeConfirm: null,
      activeBanner: null,
      toasts: [],
    });
  });

  it('showAlert sets activeAlert', () => {
    const config = {
      title: 'Connection failed',
      reassurance: 'Your changes were saved.',
      reason: 'due to a technical issue on our end.',
      fix: 'Please try connecting again.',
      escalation: 'contact your support team',
      supportId: '1430987843e',
      actionLabel: 'Try Again',
    };
    useTestStore.getState().showAlert(config);
    expect(useTestStore.getState().activeAlert).toEqual(config);
  });

  it('dismissAlert clears activeAlert', () => {
    useTestStore.getState().showAlert({
      title: 'x', reassurance: 'x', reason: 'x', fix: 'x',
      escalation: 'x', supportId: 'abc', actionLabel: 'OK',
    });
    useTestStore.getState().dismissAlert();
    expect(useTestStore.getState().activeAlert).toBeNull();
  });

  it('addToast adds item with unique id', () => {
    useTestStore.getState().addToast({ type: 'info', title: 'Done', message: 'All good', duration: 5000 });
    const toasts = useTestStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBeTruthy();
    expect(toasts[0].type).toBe('info');
  });

  it('addToast caps at 3', () => {
    for (let i = 0; i < 5; i++) {
      useTestStore.getState().addToast({ type: 'info', title: `T${i}`, message: '', duration: 5000 });
    }
    expect(useTestStore.getState().toasts).toHaveLength(3);
  });

  it('removeToast removes by id', () => {
    useTestStore.getState().addToast({ type: 'success', title: 'Done', message: '', duration: 5000 });
    const id = useTestStore.getState().toasts[0].id;
    useTestStore.getState().removeToast(id);
    expect(useTestStore.getState().toasts).toHaveLength(0);
  });

  it('showBanner sets activeBanner', () => {
    useTestStore.getState().showBanner({ title: 'Maintenance', message: 'June 5, 02:00 AM EST' });
    expect(useTestStore.getState().activeBanner?.title).toBe('Maintenance');
  });

  it('dismissBanner clears activeBanner', () => {
    useTestStore.getState().showBanner({ title: 'x', message: 'y' });
    useTestStore.getState().dismissBanner();
    expect(useTestStore.getState().activeBanner).toBeNull();
  });

  it('showConfirm sets activeConfirm', () => {
    const onConfirm = () => {};
    useTestStore.getState().showConfirm({
      title: 'Delete connection?',
      message: 'This cannot be undone.',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm,
    });
    expect(useTestStore.getState().activeConfirm?.variant).toBe('destructive');
  });

  it('dismissConfirm clears activeConfirm', () => {
    useTestStore.getState().showConfirm({
      title: 'x', message: 'y', variant: 'standard', confirmLabel: 'OK', onConfirm: () => {},
    });
    useTestStore.getState().dismissConfirm();
    expect(useTestStore.getState().activeConfirm).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npx vitest run src/store/slices/inAppNotificationSlice.test.ts
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create the slice**

```typescript
// src/store/slices/inAppNotificationSlice.ts
import { StateCreator } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  title: string;
  message: string;
  duration: number | null;
}

export interface AlertConfig {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId: string;
  actionLabel: string;
  onAction?: () => void;
}

export interface WarningConfig {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId?: string;
  actionLabel: string;
  onAction?: () => void;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  variant: 'standard' | 'destructive';
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

export interface BannerConfig {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface InAppNotificationSlice {
  activeAlert: AlertConfig | null;
  activeWarning: WarningConfig | null;
  activeConfirm: ConfirmConfig | null;
  activeBanner: BannerConfig | null;
  toasts: ToastItem[];

  showAlert: (config: AlertConfig) => void;
  dismissAlert: () => void;
  showWarning: (config: WarningConfig) => void;
  dismissWarning: () => void;
  showConfirm: (config: ConfirmConfig) => void;
  dismissConfirm: () => void;
  showBanner: (config: BannerConfig) => void;
  dismissBanner: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 3;

export const createInAppNotificationSlice: StateCreator<InAppNotificationSlice> = (set) => ({
  activeAlert: null,
  activeWarning: null,
  activeConfirm: null,
  activeBanner: null,
  toasts: [],

  showAlert: (config) => set({ activeAlert: config }),
  dismissAlert: () => set({ activeAlert: null }),

  showWarning: (config) => set({ activeWarning: config }),
  dismissWarning: () => set({ activeWarning: null }),

  showConfirm: (config) => set({ activeConfirm: config }),
  dismissConfirm: () => set({ activeConfirm: null }),

  showBanner: (config) => set({ activeBanner: config }),
  dismissBanner: () => set({ activeBanner: null }),

  addToast: (toast) => set((state) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const next = [{ ...toast, id }, ...state.toasts].slice(0, MAX_TOASTS);
    return { toasts: next };
  }),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
});
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npx vitest run src/store/slices/inAppNotificationSlice.test.ts
```
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/inAppNotificationSlice.ts src/store/slices/inAppNotificationSlice.test.ts
git commit -m "feat(notifications): add inAppNotificationSlice"
```

---

## Task 2: Wire slice into useStore

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Add import + type + slice creation**

In `src/store/useStore.ts`, add the import after the last existing slice import:

```typescript
import { createInAppNotificationSlice, InAppNotificationSlice } from './slices/inAppNotificationSlice';
```

Find the combined store type (the line that reads `type AppStore = ...` or the `create<...>` generic) and add `& InAppNotificationSlice` to it.

Then in the `create(...)` call body, add:

```typescript
...createInAppNotificationSlice(...args),
```

alongside the other slice spreads.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to `inAppNotificationSlice`

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat(notifications): wire inAppNotificationSlice into store"
```

---

## Task 3: SupportID component

**Files:**
- Create: `src/components/common/notifications/SupportID.tsx`
- Create: `src/components/common/notifications/SupportID.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/common/notifications/SupportID.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupportID } from './SupportID';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('SupportID', () => {
  it('renders the support ID text', () => {
    wrap(<SupportID id="1430987843e" />);
    expect(screen.getByText(/1430987843e/)).toBeInTheDocument();
  });

  it('renders a link to the correct ticket URL', () => {
    wrap(<SupportID id="abc123" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/support/tickets/abc123');
  });

  it('displays "Support ID:" label', () => {
    wrap(<SupportID id="xyz" />);
    expect(screen.getByText(/Support ID:/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/common/notifications/SupportID.test.tsx
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create the component**

```tsx
// src/components/common/notifications/SupportID.tsx
import { Link } from 'react-router-dom';

interface SupportIDProps {
  id: string;
}

export function SupportID({ id }: SupportIDProps) {
  return (
    <span className="text-figma-sm text-fw-bodyLight">
      Support ID:{' '}
      <Link
        to={`/support/tickets/${id}`}
        className="font-mono text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors"
      >
        {id}
      </Link>
    </span>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/common/notifications/SupportID.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/notifications/SupportID.tsx src/components/common/notifications/SupportID.test.tsx
git commit -m "feat(notifications): add SupportID primitive"
```

---

## Task 4: AlertDialog

**Files:**
- Create: `src/components/common/notifications/AlertDialog.tsx`
- Create: `src/components/common/notifications/AlertDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/common/notifications/AlertDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertDialog } from './AlertDialog';

const defaultProps = {
  title: 'Unable to connect to your account',
  reassurance: 'Your changes were saved,',
  reason: 'but we could not connect to your account due to a technical issue on our end.',
  fix: 'Please try connecting again.',
  escalation: 'contact your support team',
  supportId: '1430987843e',
  actionLabel: 'Try Again',
  onAction: vi.fn(),
  onClose: vi.fn(),
};

const wrap = (props = defaultProps) =>
  render(<MemoryRouter><AlertDialog {...props} /></MemoryRouter>);

describe('AlertDialog', () => {
  it('renders the title', () => {
    wrap();
    expect(screen.getByRole('heading', { name: /Unable to connect/i })).toBeInTheDocument();
  });

  it('renders all five content sections', () => {
    wrap();
    expect(screen.getByText(/Your changes were saved/)).toBeInTheDocument();
    expect(screen.getByText(/technical issue on our end/)).toBeInTheDocument();
    expect(screen.getByText(/Please try connecting again/)).toBeInTheDocument();
    expect(screen.getByText(/contact your support team/)).toBeInTheDocument();
    expect(screen.getByText(/1430987843e/)).toBeInTheDocument();
  });

  it('renders the action button with configurable label', () => {
    wrap();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders the Cancel button', () => {
    wrap();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onAction when primary button clicked', () => {
    const onAction = vi.fn();
    wrap({ ...defaultProps, onAction });
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    wrap({ ...defaultProps, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has alertdialog role', () => {
    wrap();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/common/notifications/AlertDialog.test.tsx
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create the component**

```tsx
// src/components/common/notifications/AlertDialog.tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { SupportID } from './SupportID';

interface AlertDialogProps {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId: string;
  actionLabel: string;
  onAction?: () => void;
  onClose: () => void;
}

export function AlertDialog({
  title,
  reassurance,
  reason,
  fix,
  escalation,
  supportId,
  actionLabel,
  onAction,
  onClose,
}: AlertDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      {/* Overlay — no click-to-dismiss */}
      <div className="fixed inset-0 bg-black/40" />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-fw-base rounded-2xl shadow-xl border-l-4 border-fw-error overflow-hidden"
      >
        <div className="p-6">
          {/* Title row */}
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-fw-error shrink-0 mt-0.5" aria-hidden="true" />
            <h2
              id="alert-title"
              className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]"
            >
              {title}
            </h2>
          </div>

          {/* 5-part body */}
          <div className="text-figma-base text-fw-body space-y-2 mb-6">
            <p>
              {reassurance} {reason}
            </p>
            <p>{fix}</p>
            <p>
              If the issue keeps happening,{' '}
              <a href="/support" className="text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors">
                {escalation}
              </a>
              .
            </p>
          </div>

          {/* Support ID + Buttons */}
          <div className="flex items-center justify-between">
            <SupportID id={supportId} />
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                ref={primaryRef}
                variant="danger"
                size="sm"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
```

> **Note:** The `Button` component at `src/components/common/Button.tsx` does not forward refs by default. If the `ref` prop causes a TypeScript error, that's expected — the ref is used only for focus, so wrap with `autoFocus` on the button inside `Button` instead:
> Replace `ref={primaryRef}` with `autoFocus` as a prop if `Button` doesn't support `forwardRef`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/common/notifications/AlertDialog.test.tsx
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/notifications/AlertDialog.tsx src/components/common/notifications/AlertDialog.test.tsx
git commit -m "feat(notifications): add AlertDialog with 5-part content framework"
```

---

## Task 5: WarningDialog

**Files:**
- Create: `src/components/common/notifications/WarningDialog.tsx`
- Create: `src/components/common/notifications/WarningDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/common/notifications/WarningDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WarningDialog } from './WarningDialog';

const defaultProps = {
  title: 'Active traffic will be interrupted',
  reassurance: 'Your connection settings are intact,',
  reason: 'but editing bandwidth will interrupt active traffic on 3 links.',
  fix: 'Schedule this change during a maintenance window to avoid disruption.',
  escalation: 'contact your support team',
  actionLabel: 'I Understand',
  onAction: vi.fn(),
  onClose: vi.fn(),
};

const wrap = (props = defaultProps) =>
  render(<MemoryRouter><WarningDialog {...props} /></MemoryRouter>);

describe('WarningDialog', () => {
  it('renders the title', () => {
    wrap();
    expect(screen.getByRole('heading', { name: /Active traffic/i })).toBeInTheDocument();
  });

  it('renders body content', () => {
    wrap();
    expect(screen.getByText(/editing bandwidth will interrupt/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule this change/)).toBeInTheDocument();
  });

  it('calls onAction when primary button clicked', () => {
    const onAction = vi.fn();
    wrap({ ...defaultProps, onAction });
    fireEvent.click(screen.getByRole('button', { name: 'I Understand' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    wrap({ ...defaultProps, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has alertdialog role', () => {
    wrap();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('renders optional SupportID when provided', () => {
    wrap({ ...defaultProps, supportId: 'warn-001' });
    expect(screen.getByText(/warn-001/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/common/notifications/WarningDialog.test.tsx
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create the component**

```tsx
// src/components/common/notifications/WarningDialog.tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { SupportID } from './SupportID';

interface WarningDialogProps {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export function WarningDialog({
  title,
  reassurance,
  reason,
  fix,
  escalation,
  supportId,
  actionLabel = 'I Understand',
  onAction,
  onClose,
}: WarningDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/40" />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="warning-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-fw-base rounded-2xl shadow-xl border-l-4 border-fw-warn overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-fw-warn shrink-0 mt-0.5" aria-hidden="true" />
            <h2
              id="warning-title"
              className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]"
            >
              {title}
            </h2>
          </div>

          <div className="text-figma-base text-fw-body space-y-2 mb-6">
            <p>
              {reassurance} {reason}
            </p>
            <p>{fix}</p>
            <p>
              If the issue keeps happening,{' '}
              <a href="/support" className="text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors">
                {escalation}
              </a>
              .
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>{supportId && <SupportID id={supportId} />}</div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                autoFocus
                variant="primary"
                size="sm"
                onClick={onAction}
                className="bg-fw-warn hover:bg-fw-warn/90 border-fw-warn"
              >
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/common/notifications/WarningDialog.test.tsx
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/notifications/WarningDialog.tsx src/components/common/notifications/WarningDialog.test.tsx
git commit -m "feat(notifications): add WarningDialog"
```

---

## Task 6: Toast + ToastContainer

**Files:**
- Create: `src/components/common/notifications/Toast.tsx`
- Create: `src/components/common/notifications/ToastContainer.tsx`
- Create: `src/components/common/notifications/Toast.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/common/notifications/Toast.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast } from './Toast';

const defaultProps = {
  id: 'toast-1',
  type: 'info' as const,
  title: 'Bandwidth updated',
  message: 'Connection speed set to 500 Mbps.',
  duration: 5000,
  onRemove: vi.fn(),
};

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders title and message', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('Bandwidth updated')).toBeInTheDocument();
    expect(screen.getByText(/500 Mbps/)).toBeInTheDocument();
  });

  it('calls onRemove after duration', async () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} duration={3000} onRemove={onRemove} />);
    act(() => vi.advanceTimersByTime(3500));
    expect(onRemove).toHaveBeenCalledWith('toast-1');
  });

  it('does not auto-dismiss when duration is null', () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} duration={null} onRemove={onRemove} />);
    act(() => vi.advanceTimersByTime(30000));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('calls onRemove when X button clicked', () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onRemove).toHaveBeenCalledWith('toast-1');
  });

  it('renders with success type', () => {
    render(<Toast {...defaultProps} type="success" title="Policy applied" message="4 connections updated." />);
    expect(screen.getByText('Policy applied')).toBeInTheDocument();
  });

  it('renders with error type and no auto-dismiss', () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} type="error" duration={null} onRemove={onRemove} />);
    act(() => vi.advanceTimersByTime(60000));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/common/notifications/Toast.test.tsx
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create Toast.tsx**

```tsx
// src/components/common/notifications/Toast.tsx
import { useEffect, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { ToastItem } from '../../../store/slices/inAppNotificationSlice';

interface ToastProps extends ToastItem {
  onRemove: (id: string) => void;
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
};

const borderMap = {
  info: 'border-fw-info',
  success: 'border-fw-success',
  error: 'border-fw-error',
};

const iconColorMap = {
  info: 'text-fw-info',
  success: 'text-fw-success',
  error: 'text-fw-error',
};

const progressColorMap = {
  info: 'bg-fw-info',
  success: 'bg-fw-success',
  error: 'bg-fw-error',
};

export const Toast = memo(function Toast({ id, type, title, message, duration, onRemove }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const hovering = useRef(false);
  const startTime = useRef(Date.now());
  const elapsed = useRef(0);
  const Icon = iconMap[type];

  useEffect(() => {
    if (!duration) return;

    const interval = setInterval(() => {
      if (hovering.current) return;
      elapsed.current = Date.now() - startTime.current;
      const pct = Math.max(0, 100 - (elapsed.current / duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(interval);
        onRemove(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`relative w-80 bg-fw-base rounded-xl shadow-lg border border-fw-secondary border-l-4 ${borderMap[type]} overflow-hidden`}
      onMouseEnter={() => {
        hovering.current = true;
      }}
      onMouseLeave={() => {
        hovering.current = false;
        startTime.current = Date.now() - elapsed.current;
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColorMap[type]}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em]">{title}</p>
          {message && (
            <p className="text-figma-sm text-fw-bodyLight mt-0.5">{message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(id)}
          aria-label="Dismiss notification"
          className="p-0.5 rounded text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {duration && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fw-secondary">
          <div
            className={`h-full ${progressColorMap[type]} opacity-40 transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
});
```

- [ ] **Step 4: Create ToastContainer.tsx**

```tsx
// src/components/common/notifications/ToastContainer.tsx
import { useEffect, memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../../store/useStore';
import { Toast } from './Toast';

export const ToastContainer = memo(function ToastContainer() {
  const { toasts, addToast, removeToast } = useStore();

  // Backward-compat shim — existing call sites use window.addToast
  useEffect(() => {
    window.addToast = (toast: any) => {
      addToast({
        type: toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : 'info',
        title: toast.title,
        message: toast.message ?? '',
        duration: toast.type === 'error' ? null : (toast.duration ?? 5000),
      });
    };
    return () => {
      window.addToast = () => {};
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/components/common/notifications/Toast.test.tsx
```
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/common/notifications/Toast.tsx src/components/common/notifications/ToastContainer.tsx src/components/common/notifications/Toast.test.tsx
git commit -m "feat(notifications): add Toast and ToastContainer"
```

---

## Task 7: AnnouncementBanner

**Files:**
- Create: `src/components/common/notifications/AnnouncementBanner.tsx`
- Create: `src/components/common/notifications/AnnouncementBanner.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/common/notifications/AnnouncementBanner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnouncementBanner } from './AnnouncementBanner';

const defaultProps = {
  title: 'Scheduled Maintenance',
  message: 'June 5, 02:00–06:00 AM EST. Portal is read-only.',
  onDismiss: vi.fn(),
};

describe('AnnouncementBanner', () => {
  it('renders title and message', () => {
    render(<AnnouncementBanner {...defaultProps} />);
    expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument();
    expect(screen.getByText(/Portal is read-only/)).toBeInTheDocument();
  });

  it('calls onDismiss when X clicked', () => {
    const onDismiss = vi.fn();
    render(<AnnouncementBanner {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders optional CTA link', () => {
    render(
      <AnnouncementBanner {...defaultProps} ctaLabel="Learn more" ctaHref="/docs/maintenance" />
    );
    const link = screen.getByRole('link', { name: 'Learn more' });
    expect(link).toHaveAttribute('href', '/docs/maintenance');
  });

  it('does not render CTA when not provided', () => {
    render(<AnnouncementBanner {...defaultProps} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('has banner role', () => {
    render(<AnnouncementBanner {...defaultProps} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/common/notifications/AnnouncementBanner.test.tsx
```

- [ ] **Step 3: Create the component**

```tsx
// src/components/common/notifications/AnnouncementBanner.tsx
import { X, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnnouncementBannerProps {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  onDismiss: () => void;
}

export function AnnouncementBanner({ title, message, ctaLabel, ctaHref, onDismiss }: AnnouncementBannerProps) {
  return (
    <motion.div
      role="banner"
      aria-live="polite"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-[9997] bg-fw-accent border-b border-fw-secondary border-l-4 border-l-fw-info px-4 py-2"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Megaphone className="h-3.5 w-3.5 text-fw-info shrink-0" aria-hidden="true" />
          <span className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em]">
            {title}
          </span>
          <span className="text-figma-xs text-fw-bodyLight tracking-[-0.03em]">{message}</span>
          {ctaLabel && ctaHref && (
            <>
              <span className="text-figma-xs text-fw-bodyLight">&middot;</span>
              <a
                href={ctaHref}
                className="text-figma-xs text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors tracking-[-0.03em]"
              >
                {ctaLabel}
              </a>
            </>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="p-0.5 rounded hover:bg-fw-wash transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5 text-fw-bodyLight" />
        </button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/common/notifications/AnnouncementBanner.test.tsx
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/notifications/AnnouncementBanner.tsx src/components/common/notifications/AnnouncementBanner.test.tsx
git commit -m "feat(notifications): add AnnouncementBanner"
```

---

## Task 8: ConfirmDialog

**Files:**
- Create: `src/components/common/notifications/ConfirmDialog.tsx`
- Create: `src/components/common/notifications/ConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/common/notifications/ConfirmDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

const defaultProps = {
  title: 'Apply policy to all connections?',
  message: 'This will update bandwidth limits on 12 active connections.',
  variant: 'standard' as const,
  confirmLabel: 'Apply',
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Apply policy/i })).toBeInTheDocument();
    expect(screen.getByText(/12 active connections/)).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('confirm-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders destructive variant', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        variant="destructive"
        title="Delete this connection?"
        message="This cannot be undone."
        confirmLabel="Delete"
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('has dialog role', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/common/notifications/ConfirmDialog.test.tsx
```

- [ ] **Step 3: Create the component**

```tsx
// src/components/common/notifications/ConfirmDialog.tsx
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Button } from '../Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  variant?: 'standard' | 'destructive';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  variant = 'standard',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        data-testid="confirm-backdrop"
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm bg-fw-base rounded-2xl shadow-xl p-6"
      >
        <h2
          id="confirm-title"
          className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-2"
        >
          {title}
        </h2>
        <p className="text-figma-base text-fw-body mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            autoFocus
            variant={variant === 'destructive' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/common/notifications/ConfirmDialog.test.tsx
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/notifications/ConfirmDialog.tsx src/components/common/notifications/ConfirmDialog.test.tsx
git commit -m "feat(notifications): add ConfirmDialog"
```

---

## Task 9: Barrel export

**Files:**
- Create: `src/components/common/notifications/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
// src/components/common/notifications/index.ts
export { SupportID } from './SupportID';
export { AlertDialog } from './AlertDialog';
export { WarningDialog } from './WarningDialog';
export { Toast } from './Toast';
export { ToastContainer } from './ToastContainer';
export { AnnouncementBanner } from './AnnouncementBanner';
export { ConfirmDialog } from './ConfirmDialog';
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/common/notifications/index.ts
git commit -m "feat(notifications): add barrel export"
```

---

## Task 10: Wire into App.tsx

**Files:**
- Modify: `src/App.tsx`

Replace the existing `ToastContainer` import and `MaintenanceBanner` with the new components. Also render `AlertDialog`, `WarningDialog`, `AnnouncementBanner`, and `ConfirmDialog` conditionally from store state.

- [ ] **Step 1: Update imports in App.tsx**

Remove:
```typescript
import { ToastContainer } from './components/common/ToastContainer';
import { MaintenanceBanner } from './components/common/MaintenanceBanner';
```

Add:
```typescript
import { ToastContainer, AnnouncementBanner, AlertDialog, WarningDialog, ConfirmDialog } from './components/common/notifications';
import { useStore } from './store/useStore';
```

- [ ] **Step 2: Read store state in App component**

Inside the `App` function body, add (after existing `useStore` destructuring or create a new one):

```typescript
const {
  activeAlert, dismissAlert,
  activeWarning, dismissWarning,
  activeConfirm, dismissConfirm,
  activeBanner, dismissBanner,
} = useStore();
```

- [ ] **Step 3: Replace MaintenanceBanner render, add new renders**

Find the existing `{showMaintenanceBanner && <MaintenanceBanner ... />}` block. Replace it with:

```tsx
{activeBanner && (
  <AnnouncementBanner
    title={activeBanner.title}
    message={activeBanner.message}
    ctaLabel={activeBanner.ctaLabel}
    ctaHref={activeBanner.ctaHref}
    onDismiss={dismissBanner}
  />
)}

{activeAlert && (
  <AlertDialog
    {...activeAlert}
    onAction={() => { activeAlert.onAction?.(); dismissAlert(); }}
    onClose={dismissAlert}
  />
)}

{activeWarning && (
  <WarningDialog
    {...activeWarning}
    onAction={() => { activeWarning.onAction?.(); dismissWarning(); }}
    onClose={dismissWarning}
  />
)}

{activeConfirm && (
  <ConfirmDialog
    {...activeConfirm}
    onConfirm={() => { activeConfirm.onConfirm(); dismissConfirm(); }}
    onClose={dismissConfirm}
  />
)}
```

- [ ] **Step 4: Verify TypeScript and dev server starts**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors

```bash
npm run dev
```
Open `http://localhost:5173` — app should load normally.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(notifications): wire notification components into App"
```

---

## Task 11: NotificationsShowcasePage

**Files:**
- Create: `src/components/pages/NotificationsShowcasePage.tsx`
- Modify: `src/App.tsx` (add lazy import + route)

- [ ] **Step 1: Create the showcase page**

```tsx
// src/components/pages/NotificationsShowcasePage.tsx
import { useStore } from '../../store/useStore';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle, Megaphone, HelpCircle } from 'lucide-react';

interface TriggerCardProps {
  icon: React.ReactNode;
  label: string;
  severity: string;
  severityColor: string;
  description: string;
  onTrigger: () => void;
}

function TriggerCard({ icon, label, severity, severityColor, description, onTrigger }: TriggerCardProps) {
  return (
    <div className="bg-fw-base border border-fw-secondary rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{label}</span>
        </div>
        <span className={`text-figma-xs font-medium uppercase tracking-[0.04em] px-2 py-0.5 rounded-full ${severityColor}`}>
          {severity}
        </span>
      </div>
      <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">{description}</p>
      <button
        onClick={onTrigger}
        className="self-start text-figma-sm font-medium text-fw-link border border-fw-active rounded-full px-4 py-1.5 hover:bg-fw-active/5 transition-colors tracking-[-0.03em]"
      >
        Trigger
      </button>
    </div>
  );
}

export function NotificationsShowcasePage() {
  const { showAlert, showWarning, addToast, showBanner, showConfirm } = useStore();

  const triggers = [
    {
      icon: <AlertCircle className="h-4 w-4 text-fw-error" />,
      label: 'Alert',
      severity: 'Critical',
      severityColor: 'bg-status-error-bg text-status-error-text',
      description: 'Fires when a system action fails and requires user acknowledgement before continuing.',
      onTrigger: () => showAlert({
        title: 'Unable to connect to your account',
        reassurance: 'Your changes were saved,',
        reason: 'but we could not connect to your account due to a technical issue on our end.',
        fix: 'Please try connecting again.',
        escalation: 'contact your support team',
        supportId: '1430987843e',
        actionLabel: 'Try Again',
      }),
    },
    {
      icon: <AlertTriangle className="h-4 w-4 text-fw-warn" />,
      label: 'Warning',
      severity: 'Warning',
      severityColor: 'bg-status-warning-bg text-status-warning-text',
      description: 'Fires when an action will have consequences the user should understand before proceeding.',
      onTrigger: () => showWarning({
        title: 'Active traffic will be interrupted',
        reassurance: 'Your connection settings are intact,',
        reason: 'but editing bandwidth will interrupt active traffic on 3 links.',
        fix: 'Schedule this change during a maintenance window to avoid disruption.',
        escalation: 'contact your support team',
        supportId: 'warn-7f2a1',
        actionLabel: 'I Understand',
      }),
    },
    {
      icon: <Info className="h-4 w-4 text-fw-info" />,
      label: 'Info Toast',
      severity: 'Info',
      severityColor: 'bg-[var(--color-info-bg)] text-fw-info',
      description: 'Non-blocking status update. Auto-dismisses after 5 seconds.',
      onTrigger: () => addToast({
        type: 'info',
        title: 'Bandwidth updated',
        message: 'Connection speed set to 500 Mbps.',
        duration: 5000,
      }),
    },
    {
      icon: <CheckCircle className="h-4 w-4 text-fw-success" />,
      label: 'Success Toast',
      severity: 'Success',
      severityColor: 'bg-status-active-bg text-status-active-text',
      description: 'Confirms a completed action. Auto-dismisses after 4 seconds.',
      onTrigger: () => addToast({
        type: 'success',
        title: 'Group policy applied',
        message: '4 connections updated successfully.',
        duration: 4000,
      }),
    },
    {
      icon: <AlertCircle className="h-4 w-4 text-fw-error" />,
      label: 'Error Toast',
      severity: 'Error',
      severityColor: 'bg-status-error-bg text-status-error-text',
      description: 'Reports a failed action. Persists until manually dismissed.',
      onTrigger: () => addToast({
        type: 'error',
        title: 'Export failed',
        message: 'Could not generate CSV. Please try again.',
        duration: null,
      }),
    },
    {
      icon: <Megaphone className="h-4 w-4 text-fw-info" />,
      label: 'Announcement',
      severity: 'System',
      severityColor: 'bg-fw-accent text-fw-info',
      description: 'System-wide message persisted at the top of the page until dismissed.',
      onTrigger: () => showBanner({
        title: 'Scheduled Maintenance',
        message: 'June 5, 2026 02:00–06:00 AM EST. Portal is read-only.',
        ctaLabel: 'View details',
        ctaHref: '/support',
      }),
    },
    {
      icon: <HelpCircle className="h-4 w-4 text-fw-bodyLight" />,
      label: 'Confirm — Standard',
      severity: 'Neutral',
      severityColor: 'bg-fw-neutral text-fw-bodyLight',
      description: '"Are you sure?" for actions with recoverable consequences.',
      onTrigger: () => showConfirm({
        title: 'Apply policy to all connections?',
        message: 'This will update bandwidth limits on 12 active connections in the EMEA group.',
        variant: 'standard',
        confirmLabel: 'Apply Policy',
        onConfirm: () => addToast({ type: 'success', title: 'Policy applied', message: '12 connections updated.', duration: 4000 }),
      }),
    },
    {
      icon: <HelpCircle className="h-4 w-4 text-fw-error" />,
      label: 'Confirm — Destructive',
      severity: 'Danger',
      severityColor: 'bg-status-error-bg text-status-error-text',
      description: '"Are you sure?" for irreversible actions like deleting or removing.',
      onTrigger: () => showConfirm({
        title: 'Delete this connection?',
        message: 'Azure ITC — San Jose will be permanently removed. Active traffic will be terminated immediately. This cannot be undone.',
        variant: 'destructive',
        confirmLabel: 'Delete Connection',
        onConfirm: () => addToast({ type: 'info', title: 'Connection deleted', message: 'Azure ITC removed.', duration: 5000 }),
      }),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-5 w-5 text-fw-bodyLight" />
          <span className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Design System</span>
        </div>
        <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
          Notification System
        </h1>
        <p className="text-figma-base text-fw-bodyLight mt-1 tracking-[-0.03em]">
          AT&T NetBond Advanced — FLYWHEEL-compliant notification patterns. Trigger each type to preview behavior.
        </p>
      </div>

      {/* Trigger grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {triggers.map((t) => (
          <TriggerCard key={t.label} {...t} />
        ))}
      </div>

      {/* Color legend */}
      <div className="mt-10 pt-6 border-t border-fw-secondary">
        <p className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em] mb-3">Color System</p>
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'Alert / Error Toast', color: 'bg-fw-error', token: 'border-fw-error #c70032' },
            { label: 'Warning', color: 'bg-fw-warn', token: 'border-fw-warn #ea712f' },
            { label: 'Success Toast', color: 'bg-fw-success', token: 'border-fw-success #2d7e24' },
            { label: 'Info Toast / Announcement', color: 'bg-fw-info', token: 'border-fw-info #0074b3' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-sm ${item.color}`} />
              <div>
                <p className="text-figma-xs font-medium text-fw-heading">{item.label}</p>
                <p className="text-figma-xs text-fw-bodyLight font-mono">{item.token}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add lazy import to App.tsx**

Find the block of lazy imports in `src/App.tsx`. Add:

```typescript
const LazyNotificationsShowcasePage = lazy(() =>
  import('./components/pages/NotificationsShowcasePage').then(module => ({
    default: module.NotificationsShowcasePage,
  }))
);
```

- [ ] **Step 3: Add route to App.tsx**

Find the existing `/notifications` route block. Add a new route after it:

```tsx
<Route path="/notifications/showcase" element={
  <AsyncBoundary fallback={<LoadingFallback />}>
    <Suspense fallback={<LoadingFallback />}>
      <LazyNotificationsShowcasePage />
    </Suspense>
  </AsyncBoundary>
} />
```

- [ ] **Step 4: Verify in browser**

Start the dev server:
```bash
npm run dev
```

Navigate to `http://localhost:5173/#/notifications/showcase` (or the appropriate hash route). Confirm:
- Page renders with 8 trigger cards in a responsive grid
- Clicking "Alert" → alert dialog appears with red left bar, all 5 content sections, Support ID, Cancel + Try Again buttons
- Clicking "Warning" → warning dialog with amber bar
- Clicking "Info Toast" → toast slides in from bottom-right with blue left bar
- Clicking "Success Toast" → green toast, auto-dismisses
- Clicking "Error Toast" → red toast, stays until X clicked
- Clicking "Announcement" → blue banner appears at top of page
- Clicking "Confirm — Standard" → confirm dialog, clicking Apply fires success toast
- Clicking "Confirm — Destructive" → confirm dialog with red Delete button

- [ ] **Step 5: Run all notification tests**

```bash
npx vitest run src/components/common/notifications/ src/store/slices/inAppNotificationSlice.test.ts
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/NotificationsShowcasePage.tsx src/App.tsx
git commit -m "feat(notifications): add showcase page at /notifications/showcase"
```

---

## Self-Review

**Spec coverage:**
- [x] Alert — modal, red left bar, 5-part content framework, Support ID, Cancel + action button
- [x] Warning — modal, amber left bar, same structure, Cancel + I Understand
- [x] Informational toast — blue bar, auto-dismiss 5s
- [x] Success toast — green bar, auto-dismiss 4s
- [x] Error toast — red bar, no auto-dismiss
- [x] Announcement banner — top strip, blue tint, dismiss
- [x] Confirm standard — modal, backdrop dismiss, Cancel + primary
- [x] Confirm destructive — red action button
- [x] Support ID — monospace, underlined, links to `/support/tickets/:id`
- [x] Showcase page — 8 trigger cards with realistic NetBond copy
- [x] Color system — left bar only, no tinted backgrounds, FLYWHEEL tokens throughout
- [x] Backward compat — `window.addToast` shim in `ToastContainer`
- [x] ARIA — role="alertdialog", role="status", role="alert", role="banner"

**No placeholders found.**

**Type consistency confirmed** — `ToastItem`, `AlertConfig`, `WarningConfig`, `ConfirmConfig`, `BannerConfig` defined in Task 1 and used consistently in Tasks 4–11.
