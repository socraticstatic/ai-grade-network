# The Wizard Draws the Picture (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both spine wizards (ProvisionWizard, DeployManagedVpcWizard) draw a live left-to-right diagram as the user answers: each answer places or thickens an element, so the conversation and the visualization are the same artifact.

**Architecture:** One shared `WizardCanvas` — a pure geometry module (`wizardCanvas.ts`) plus a presentational SVG component (`WizardCanvas.tsx`) in `src/features/connect/`, built on the VizKit palette. Each wizard derives a `WizardCanvasSpec` from its existing step/answer state; the canvas renders ghosts (dashed slate) for unanswered questions and solid cobalt for answered ones, dual lines for resiliency, stroke width for bandwidth tier.

**Tech Stack:** React 18 + TypeScript, hand-rolled SVG on VizKit (`VIZ_HEX`), Vitest + @testing-library/react, Playwright (existing e2e infra: gate-mode webServer on :5199, `seedAuth()` helper).

**Ground truth (verified this session):**
- Both wizards are already one-question-per-step: ProvisionWizard (`src/features/connect/ProvisionWizard.tsx`, steps Attach type → On-ramp / PoP → Resiliency → Confirm) and DeployManagedVpcWizard (`src/features/connect/DeployManagedVpcWizard.tsx`, steps [Region] → Tier → CIDR → Confirm). The missing piece is the picture, not the flow.
- The spec's "other wizard modes demoted" is already satisfied: `/create` redirects to `/discover` (App.tsx), and the top-nav Create menu routes to `/naas/connect` and `/ai/providers` (`CreateMenu.tsx:14-15`). No task needed.
- e2e pattern to follow: `e2e/connect-fabric.spec.ts` (seedAuth → `/#/naas/connect` → `fabric-node-region-usw2` → `open-provision-wizard` → walk dialog → `provision-confirm` → region flips `data-path="private"`).

## Global Constraints

- Left is ingress, right is egress. The canvas axis is: on-ramp/site (left) → AT&T Fabric band (center) → region (right).
- Pure, deterministic geometry; no clocks/RNG. Palette from `VIZ_HEX` only (`src/components/viz/kit`); cobalt = answered/on-fabric, slate = pending/public, dual = double line (the FabricHero `translate(0,-2.4)` idiom).
- NO horizontal scrolls: the canvas svg uses `viewBox` + `width="100%"`, no min-width, no `overflow-x-auto` (guard test `src/__tests__/no-horizontal-scroll.test.ts` scans these dirs).
- New UI copy: no em dashes, no unexpanded acronyms (vocabulary guard runs over these dirs), savings-first framing.
- Existing test contracts survive: `provision-confirm`, `stage-${key}`/`data-done`, `open-provision-wizard`, dialog step flow (`Next` × N then confirm). Existing suites stay green.
- All test commands `npx vitest run <path>`; e2e via `npx playwright test e2e/wizard-canvas.spec.ts` (needs port 5199 free).
- Commits follow repo style, ending with trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: WizardCanvas — pure geometry + component

**Files:**
- Create: `src/features/connect/wizardCanvas.ts`
- Create: `src/features/connect/WizardCanvas.tsx`
- Test: `src/features/connect/wizardCanvas.test.ts`, `src/features/connect/WizardCanvas.test.tsx`

**Interfaces:**
- Consumes: `VIZ_HEX` from `../../components/viz/kit`.
- Produces:
  - `export type RibbonThickness = 'thin' | 'medium' | 'thick';`
  - `export interface WizardCanvasSpec { left: { label: string; sub?: string } | null; right: { label: string; sub?: string } | null; edgeLabel?: string; thickness: RibbonThickness; dual: boolean; edgeAnswered: boolean; leftAnswered: boolean; rightAnswered: boolean; }`
  - `export function computeWizardCanvas(spec: WizardCanvasSpec): WizardCanvasGeometry` where `WizardCanvasGeometry = { viewW: number; viewH: number; leftNode: Box; band: Box; rightNode: Box; leftEdge: string; rightEdge: string; strokeWidth: number }` and `Box = { x: number; y: number; w: number; h: number }`.
  - `export function WizardCanvas({ spec }: { spec: WizardCanvasSpec })` rendering `<svg data-testid="wizard-canvas">` with `<g data-testid="wc-left" data-answered>`, `<g data-testid="wc-right" data-answered>`, `<path data-testid="wc-edge-left" data-answered>`, `<path data-testid="wc-edge-right" data-answered data-dual>`.

- [ ] **Step 1: Write the failing geometry test**

```ts
// src/features/connect/wizardCanvas.test.ts
import { describe, it, expect } from 'vitest';
import { computeWizardCanvas, type WizardCanvasSpec } from './wizardCanvas';

const spec = (over: Partial<WizardCanvasSpec> = {}): WizardCanvasSpec => ({
  left: { label: 'Equinix DC2', sub: 'Direct Connect' },
  right: { label: 'us-west-2', sub: 'AWS' },
  thickness: 'medium',
  dual: false,
  edgeAnswered: true,
  leftAnswered: true,
  rightAnswered: true,
  ...over,
});

describe('computeWizardCanvas', () => {
  it('lays the three stations left to right on one axis', () => {
    const g = computeWizardCanvas(spec());
    expect(g.leftNode.x).toBeLessThan(g.band.x);
    expect(g.band.x + g.band.w).toBeLessThan(g.rightNode.x);
    expect(g.viewW).toBe(460);
    expect(g.viewH).toBe(120);
  });
  it('edges connect node edge to band edge', () => {
    const g = computeWizardCanvas(spec());
    expect(g.leftEdge.startsWith(`M ${g.leftNode.x + g.leftNode.w}`)).toBe(true);
    expect(g.rightEdge.startsWith(`M ${g.band.x + g.band.w}`)).toBe(true);
  });
  it('thickness maps thin/medium/thick to 1.5/2.5/4', () => {
    expect(computeWizardCanvas(spec({ thickness: 'thin' })).strokeWidth).toBe(1.5);
    expect(computeWizardCanvas(spec({ thickness: 'medium' })).strokeWidth).toBe(2.5);
    expect(computeWizardCanvas(spec({ thickness: 'thick' })).strokeWidth).toBe(4);
  });
  it('is deterministic', () => {
    expect(computeWizardCanvas(spec())).toEqual(computeWizardCanvas(spec()));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/connect/wizardCanvas.test.ts`
Expected: FAIL - cannot resolve `./wizardCanvas`.

- [ ] **Step 3: Implement the geometry module**

```ts
// src/features/connect/wizardCanvas.ts
/** The wizard's live picture, as pure geometry: on-ramp → fabric → region
 *  on one left-to-right axis. Deterministic; the component renders it. */
export type RibbonThickness = 'thin' | 'medium' | 'thick';

export interface WizardCanvasSpec {
  left: { label: string; sub?: string } | null;
  right: { label: string; sub?: string } | null;
  edgeLabel?: string;
  thickness: RibbonThickness;
  dual: boolean;
  /** The connection itself is answered (attach type chosen): both edges solidify. */
  edgeAnswered: boolean;
  leftAnswered: boolean;
  rightAnswered: boolean;
}

interface Box { x: number; y: number; w: number; h: number }

export interface WizardCanvasGeometry {
  viewW: number;
  viewH: number;
  leftNode: Box;
  band: Box;
  rightNode: Box;
  leftEdge: string;
  rightEdge: string;
  strokeWidth: number;
}

const VIEW_W = 460;
const VIEW_H = 120;
const NODE_W = 128;
const NODE_H = 44;
const BAND_W = 72;
const MID_Y = VIEW_H / 2;

const STROKE: Record<RibbonThickness, number> = { thin: 1.5, medium: 2.5, thick: 4 };

export function computeWizardCanvas(spec: WizardCanvasSpec): WizardCanvasGeometry {
  const leftNode: Box = { x: 8, y: MID_Y - NODE_H / 2, w: NODE_W, h: NODE_H };
  const band: Box = { x: (VIEW_W - BAND_W) / 2, y: 14, w: BAND_W, h: VIEW_H - 28 };
  const rightNode: Box = { x: VIEW_W - NODE_W - 8, y: MID_Y - NODE_H / 2, w: NODE_W, h: NODE_H };
  const curve = (x0: number, x1: number) =>
    `M ${x0} ${MID_Y} C ${x0 + 24} ${MID_Y}, ${x1 - 24} ${MID_Y}, ${x1} ${MID_Y}`;
  return {
    viewW: VIEW_W,
    viewH: VIEW_H,
    leftNode,
    band,
    rightNode,
    leftEdge: curve(leftNode.x + leftNode.w, band.x),
    rightEdge: curve(band.x + band.w, rightNode.x),
    strokeWidth: STROKE[spec.thickness],
  };
}
```

- [ ] **Step 4: Run geometry test to verify it passes**

Run: `npx vitest run src/features/connect/wizardCanvas.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing component test, then the component**

```tsx
// src/features/connect/WizardCanvas.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WizardCanvas } from './WizardCanvas';
import type { WizardCanvasSpec } from './wizardCanvas';

const base: WizardCanvasSpec = {
  left: { label: 'Equinix DC2', sub: 'Direct Connect' },
  right: { label: 'us-west-2', sub: 'AWS' },
  edgeLabel: 'Dedicated',
  thickness: 'medium',
  dual: false,
  edgeAnswered: false,
  leftAnswered: true,
  rightAnswered: false,
};

describe('WizardCanvas', () => {
  it('renders answered elements solid and unanswered as ghosts', () => {
    render(<WizardCanvas spec={base} />);
    expect(screen.getByTestId('wc-left')).toHaveAttribute('data-answered', 'true');
    expect(screen.getByTestId('wc-right')).toHaveAttribute('data-answered', 'false');
    // both edges track edgeAnswered - the connection question, not the stations
    expect(screen.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'false');
    expect(screen.getByTestId('wc-edge-right')).toHaveAttribute('data-answered', 'false');
  });
  it('a null station renders its ghost placeholder text', () => {
    render(<WizardCanvas spec={{ ...base, right: null }} />);
    expect(screen.getByTestId('wc-right').textContent).toContain('Not chosen yet');
  });
  it('dual renders the double-line edge', () => {
    render(<WizardCanvas spec={{ ...base, dual: true }} />);
    expect(screen.getByTestId('wc-edge-right')).toHaveAttribute('data-dual', 'true');
  });
  it('shows the edge label and the station labels', () => {
    render(<WizardCanvas spec={base} />);
    expect(screen.getByText('Dedicated')).toBeInTheDocument();
    expect(screen.getByText('Equinix DC2')).toBeInTheDocument();
    expect(screen.getByText('us-west-2')).toBeInTheDocument();
  });
});
```

```tsx
// src/features/connect/WizardCanvas.tsx
import { useMemo } from 'react';
import { VIZ_HEX } from '../../components/viz/kit';
import { computeWizardCanvas, type WizardCanvasSpec } from './wizardCanvas';

/** The wizard's live picture: every answer places or thickens an element.
 *  Answered = solid cobalt; pending = dashed slate ghost; dual = double
 *  line (the FabricHero idiom). Scales to its container - never scrolls. */
export function WizardCanvas({ spec }: { spec: WizardCanvasSpec }) {
  const g = useMemo(() => computeWizardCanvas(spec), [spec]);

  const edgeStroke = (answered: boolean) => ({
    stroke: answered ? VIZ_HEX.cobalt : VIZ_HEX.slate,
    strokeDasharray: answered ? undefined : '5 5',
  });

  const node = (
    box: { x: number; y: number; w: number; h: number },
    station: { label: string; sub?: string } | null,
    answered: boolean,
    testid: string,
    ghostText: string,
  ) => (
    <g data-testid={testid} data-answered={String(answered)}>
      <rect
        x={box.x} y={box.y} width={box.w} height={box.h} rx={10}
        fill={answered ? VIZ_HEX.wash : 'none'}
        stroke={answered ? VIZ_HEX.cobalt : VIZ_HEX.slate}
        strokeWidth={1.2}
        strokeDasharray={answered ? undefined : '4 4'}
      />
      {station ? (
        <>
          <text x={box.x + box.w / 2} y={box.y + 19} textAnchor="middle" fill={VIZ_HEX.ink} className="text-[11px] font-semibold">
            {station.label}
          </text>
          {station.sub && (
            <text x={box.x + box.w / 2} y={box.y + 33} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[9px]">
              {station.sub}
            </text>
          )}
        </>
      ) : (
        <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 3} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[10px]">
          {ghostText}
        </text>
      )}
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${g.viewW} ${g.viewH}`}
      width="100%"
      role="img"
      aria-label="The connection this wizard is building, drawn as you answer"
      data-testid="wizard-canvas"
    >
      <rect x={g.band.x} y={g.band.y} width={g.band.w} height={g.band.h} rx={12} fill={VIZ_HEX.band} stroke={VIZ_HEX.bandStroke} strokeWidth={1.2} />
      <text x={g.band.x + g.band.w / 2} y={g.viewH / 2 - 4} textAnchor="middle" fill={VIZ_HEX.cobalt} className="text-[10px] font-semibold">
        AT&amp;T
      </text>
      <text x={g.band.x + g.band.w / 2} y={g.viewH / 2 + 8} textAnchor="middle" fill={VIZ_HEX.cobalt} className="text-[10px] font-semibold">
        Fabric
      </text>

      <path data-testid="wc-edge-left" data-answered={String(spec.edgeAnswered)} d={g.leftEdge} fill="none" strokeWidth={g.strokeWidth} strokeLinecap="round" {...edgeStroke(spec.edgeAnswered)} />
      {spec.dual && (
        <path d={g.rightEdge} fill="none" strokeWidth={g.strokeWidth} strokeLinecap="round" transform="translate(0,-2.4)" {...edgeStroke(spec.edgeAnswered)} />
      )}
      <path data-testid="wc-edge-right" data-answered={String(spec.edgeAnswered)} data-dual={String(spec.dual)} d={g.rightEdge} fill="none" strokeWidth={g.strokeWidth} strokeLinecap="round" {...edgeStroke(spec.edgeAnswered)} />
      {spec.edgeLabel && (
        <text x={(g.band.x + g.band.w + g.rightNode.x) / 2} y={g.viewH / 2 - 10} textAnchor="middle" fill={VIZ_HEX.slateInk} stroke={VIZ_HEX.wash} strokeWidth={3} paintOrder="stroke" className="text-[9px] font-medium">
          {spec.edgeLabel}
        </text>
      )}

      {node(g.leftNode, spec.left, spec.leftAnswered, 'wc-left', 'Not chosen yet')}
      {node(g.rightNode, spec.right, spec.rightAnswered, 'wc-right', 'Not chosen yet')}
    </svg>
  );
}
```

- [ ] **Step 6: Run both test files**

Run: `npx vitest run src/features/connect/wizardCanvas.test.ts src/features/connect/WizardCanvas.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/connect/wizardCanvas.ts src/features/connect/WizardCanvas.tsx src/features/connect/wizardCanvas.test.ts src/features/connect/WizardCanvas.test.tsx
git commit -m "feat(connect): WizardCanvas - the wizard's answers drawn as one left-to-right picture"
```

---

### Task 2: ProvisionWizard draws as you answer

**Files:**
- Modify: `src/features/connect/ProvisionWizard.tsx` (add canvas above the step body; derive the spec from existing state)
- Test: `src/features/connect/ProvisionWizard.test.tsx` (append)

**Interfaces:**
- Consumes: `WizardCanvas` + `WizardCanvasSpec` (Task 1). Existing state in ProvisionWizard: `step` (0-3), `attachType`/`attach` (ATTACH_TYPES entry with `.label`), `onrampChoices` (model onramps reaching the region), `onrampId`, `resilient`, `region` (FabricRegion with `.name`, `.cloudName`).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Append to `src/features/connect/ProvisionWizard.test.tsx`, following that file's existing render arrangement (it renders `<ProvisionWizard region=... model=... />` with the seeded engine model; reuse its setup verbatim):

```tsx
  it('draws the picture as answers land: ghosts first, then solid, dual doubles the line', async () => {
    // reuse this file's existing render helper/arrangement
    expect(screen.getByTestId('wizard-canvas')).toBeInTheDocument();
    // the region is known from mount - right station is drawn and answered
    expect(screen.getByTestId('wc-right')).toHaveAttribute('data-answered', 'true');
    // attach type question not yet passed - left edge pending
    expect(screen.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'false');
    // pass attach type, then on-ramp
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByTestId('wc-left')).toHaveAttribute('data-answered', 'true');
    // choose Dual on the resiliency step, advance - edge doubles
    fireEvent.click(screen.getByRole('button', { name: /Dual · resilient/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByTestId('wc-edge-right')).toHaveAttribute('data-dual', 'true');
  });
```

(Use the file's existing event idiom — `fireEvent` or `userEvent` — and its existing imports.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/connect/ProvisionWizard.test.tsx`
Expected: FAIL - no `wizard-canvas` testid.

- [ ] **Step 3: Wire the canvas in**

In `ProvisionWizard.tsx`, import `{ WizardCanvas } from './WizardCanvas';` and `type { WizardCanvasSpec } from './wizardCanvas';`. Above the step-body `<div className="px-5 py-4 min-h-[172px]">`, insert a canvas strip; derive the spec from existing state (place this const above the `return`):

```tsx
  // The picture the answers are building. A question is "answered" once the
  // user moves past its step; the current step's live selection previews as
  // a ghost until then. The region is known from mount.
  const chosenOnramp = onrampChoices.find(o => o.id === onrampId);
  const canvasSpec: WizardCanvasSpec = {
    left: chosenOnramp
      ? { label: chosenOnramp.name, sub: chosenOnramp.site }
      : { label: 'Nearest fabric PoP' },
    right: { label: region.name, sub: region.cloudName },
    edgeLabel: step > 0 ? attach.label : undefined,
    thickness: 'medium',
    dual: resilient && step > 2,
    edgeAnswered: step > 0,
    leftAnswered: step > 1,
    rightAnswered: true,
  };
```

Then render, directly after the step rail `</ol>`:

```tsx
        <div className="px-5 pt-3">
          <WizardCanvas spec={canvasSpec} />
        </div>
```

- [ ] **Step 4: Run the wizard suite**

Run: `npx vitest run src/features/connect/ProvisionWizard.test.tsx src/features/connect`
Expected: PASS (pre-existing tests unchanged; the canvas is additive).

- [ ] **Step 5: Commit**

```bash
git add src/features/connect/ProvisionWizard.tsx src/features/connect/ProvisionWizard.test.tsx
git commit -m "feat(connect): the provision wizard draws its answers - on-ramp, fabric, region, dual"
```

---

### Task 3: DeployManagedVpcWizard draws as you answer

**Files:**
- Modify: `src/features/connect/DeployManagedVpcWizard.tsx` (canvas above the step body in the QUESTION phase only — the bring-up phase already has StationTrack)
- Test: `src/features/connect/DeployManagedVpcWizard.test.tsx` (append)

**Interfaces:**
- Consumes: `WizardCanvas`/`WizardCanvasSpec` (Task 1). Existing wizard state (see `DeployManagedVpcWizard.tsx:52-75`): `step`, `steps` (`WIZ_STEPS` filtered: `['region'?, 'tier', 'cidr', 'confirm']`), `current` (the active step id), the selected region/tier/cidr state vars, and `managedVpcWizardModel.ts` helpers. The tier value is one of 500 Mbps / 1 Gbps / 5 Gbps.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Append to `src/features/connect/DeployManagedVpcWizard.test.tsx`, reusing that file's existing render arrangement:

```tsx
  it('draws the managed VPC as answers land: tier thickens the ribbon, CIDR labels the region', () => {
    // reuse this file's existing render/step-walk helpers
    expect(screen.getByTestId('wizard-canvas')).toBeInTheDocument();
    // pick the 5 Gbps tier, advance - the edge thickens to the thick stroke
    fireEvent.click(screen.getByRole('button', { name: /5 Gbps/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    expect(Number(screen.getByTestId('wc-edge-right').getAttribute('stroke-width'))).toBe(4);
    // the CIDR step previews the workload block on the region station
    expect(screen.getByTestId('wc-right').textContent).toMatch(/10\./);
  });
```

Adapt selector details to the file's existing idiom (it already walks steps in its tests); the two assertions that must hold verbatim are the stroke-width numeric check and the CIDR-in-station check.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/connect/DeployManagedVpcWizard.test.tsx`
Expected: FAIL - no `wizard-canvas` testid.

- [ ] **Step 3: Wire the canvas in**

In `DeployManagedVpcWizard.tsx`, import `{ WizardCanvas } from './WizardCanvas';` and `type { WizardCanvasSpec, RibbonThickness } from './wizardCanvas';`. Above the question-phase step body (NOT in the bring-up/record phase), derive:

```tsx
  const TIER_THICKNESS: Record<string, RibbonThickness> = {
    '500 Mbps': 'thin',
    '1 Gbps': 'medium',
    '5 Gbps': 'thick',
  };
  // Identifiers below reference the wizard's existing state: the selected
  // region object (name + cloud), the selected tier label, the cidr string,
  // and the steps array. Adapt names to the file's actual variables and
  // report any renames in your report.
  const canvasSpec: WizardCanvasSpec = {
    left: { label: 'AT&T on-ramp', sub: onrampName ?? undefined },
    right: selectedRegion
      ? { label: regionName, sub: cidr || cloudName }
      : null,
    edgeLabel: 'Managed vSRX pair',
    thickness: TIER_THICKNESS[tierLabel] ?? 'medium',
    dual: true,
    edgeAnswered: steps.indexOf('tier') < step,
    leftAnswered: true,
    rightAnswered: steps.indexOf('tier') < step,
  };
```

Render `<div className="px-5 pt-3"><WizardCanvas spec={canvasSpec} /></div>` directly after the wizard's step rail, question phase only. (The vSRX HA pair is always dual — `dual: true` states that fact from the start.)

- [ ] **Step 4: Run the suites + guards**

Run: `npx vitest run src/features/connect src/__tests__/no-horizontal-scroll.test.ts src/__tests__/vocabulary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/connect/DeployManagedVpcWizard.tsx src/features/connect/DeployManagedVpcWizard.test.tsx
git commit -m "feat(connect): the managed VPC wizard draws its answers - tier thickens the wire"
```

---

### Task 4: End-to-end — the guided flow to a drawn diagram

**Files:**
- Create: `e2e/wizard-canvas.spec.ts`

**Interfaces:**
- Consumes: everything above; the existing e2e helpers (`tests/e2e/helpers` → `seedAuth`), the connect-fabric spec's walk pattern.

- [ ] **Step 1: Write the spec**

```ts
// e2e/wizard-canvas.spec.ts
import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('the provision wizard draws the connection while you answer, then the fabric inherits it', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('fabric-node-region-usw2').click();
  await page.getByTestId('open-provision-wizard').click();

  const dialog = page.getByRole('dialog');
  const canvas = dialog.getByTestId('wizard-canvas');
  await expect(canvas).toBeVisible();

  // The region is known - the right station is already answered.
  await expect(dialog.getByTestId('wc-right')).toHaveAttribute('data-answered', 'true');
  // The attach question is still open - the left edge is a ghost.
  await expect(dialog.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'false');

  // Answer attach type, then on-ramp: the picture solidifies left to right.
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'true');
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByTestId('wc-left')).toHaveAttribute('data-answered', 'true');

  // Choose dual resiliency: the wire doubles.
  await dialog.getByRole('button', { name: /Dual · resilient/ }).click();
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByTestId('wc-edge-right')).toHaveAttribute('data-dual', 'true');

  // Confirm: the wizard's picture becomes the fabric's reality.
  await dialog.getByTestId('provision-confirm').click();
  await expect(page.locator('[data-fabric-edge][data-region-id="usw2"]').first())
    .toHaveAttribute('data-path', 'private');
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/wizard-canvas.spec.ts` (port 5199 must be free; the config starts its own gate-mode server).
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/wizard-canvas.spec.ts
git commit -m "test(e2e): the guided flow ends in a drawn diagram - and the fabric inherits it"
```

---

### Task 5: Full-suite verification and visual check

**Files:** none; verification only.

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 2: Dev-server walkthrough (gate mode)**

In the browser: open `/#/naas/connect`, click a public region (usw2), open Provision, and watch the canvas: region pre-drawn, edges ghost → solid as answers land, dual doubling on resiliency, confirm flips the fabric edge. Then open Deploy managed VPC on another public region and confirm the tier answer visibly thickens the wire and the CIDR lands on the region station. Screenshot both wizards mid-flow. Confirm no horizontal scrollbar inside either dialog.

- [ ] **Step 3: Commit any straggler fixes**

```bash
git add -A src e2e
git commit -m "fix(connect): wizard canvas fixes from browser verification"
```

(Skip if clean.)
