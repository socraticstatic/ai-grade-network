# Managed VPC/VNET Bringup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy an AT&T-managed gateway VPC/VNET with a vSRX HA pair into an AWS/Azure region through a watchable five-stage lifecycle, entered from Connect or the Discover map, and rendered as a new hop in the attachment chain once live.

**Architecture:** A new engine module (`state-managed.ts`, `orderCircuit` idiom generalized: timers pace, an explicit `advanceManagedVpc` decides) + a pure wizard model + one `DeployManagedVpcWizard` component with a live stage tracker, shared by two doors (Connect `RegionPanel`, Discover `ChainDrawer`) + chain/map integration in the feature-1 modules.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, Tailwind (Flywheel `fw-*`), engine singleton `window.CC`.

## Global Constraints

- Timers pace the demo; they NEVER decide state. All stage mutation lives in `CC.advanceManagedVpc(id)`; tests call it synchronously. No `Date.now`/`Math.random` anywhere.
- Brand: the portal is "AT&T AI-grade network". The string `Cloud Connect` must not appear in any new file — `src/__tests__/rebrand.test.ts` scans and will fail the suite.
- Provider vocabulary: AWS = Managed VPC / TGW attachment / private VIF; Azure = Managed VNET / VNet peering + UDRs / private peering. Provider scope: `aws` and `azure` only.
- Nothing claims what isn't up: the chain hop appears only at stage `live`; a deploying record shows its stage.
- Flywheel palette only; no amber. Dialogs: `role="dialog"`, labeled close, real buttons.
- The att-plumbing→live advance activates the region's serving on-ramp via the existing `CC.activateOnramp` when inactive; no other new mutation touches pre-existing engine state.
- Engine house style in `state-managed.ts`: mirror `state-console.ts` (loose JS-in-TS, `CC._.emit`, module header comment). The typed facade additions go in `src/engine/types.ts`.
- Tests that activate on-ramps restore with `CC.undo()`. Managed records leak only within a test file (vitest gives each file a fresh jsdom `window.CC`) — order tests within a file accordingly; no test-only reset API.
- vSRX seed facts: nodes `vsrx-0` (active) / `vsrx-1` (backup); interfaces `ge-0/0/0` (cloud side), `ge-0/0/1` (AT&T side), `fxp0` (management); tiers `500M`/`1G`/`5G` → "500 Mbps"/"1 Gbps"/"5 Gbps". CIDR `10.255.<seq>.0/24` from a module counter.

---

### Task 1: Engine — state-managed.ts

**Files:**
- Create: `src/engine/state-managed.ts`
- Modify: `src/engine/index.ts` (add `import './state-managed';` after `import './state-routing';`)
- Modify: `src/engine/types.ts` (add `ManagedVpc` types + three members to `CloudControl`)
- Test: `src/engine/state-managed.test.ts`

**Interfaces:**
- Consumes: `CC.onramps`, `CC.regions`, `CC.activateOnramp`, `CC._.emit` (all existing).
- Produces (later tasks rely on these exact names):
  - `CC.managedVpcs: ManagedVpc[]`
  - `CC.deployManagedVpc(opts: { cloudId: string; regionId: string; tier?: '500M'|'1G'|'5G'; cidr?: string }): ManagedVpc | null`
  - `CC.advanceManagedVpc(id: string): ManagedVpc | null`
  - `CC.managedVpcFor(cloudId: string, regionId: string): ManagedVpc | null`
  - `CC.suggestManagedCidr(): string`
  - `ManagedVpc` type in `src/engine/types.ts` exactly as in the spec (stage union `'create'|'vsrx'|'cloud-plumbing'|'att-plumbing'|'live'`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/engine/state-managed.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from './index';
import type { ManagedVpc } from './types';

/* File-order note: vitest gives this FILE its own window.CC, but records
   persist between tests here — each test deploys into a region no earlier
   test used, and on-ramp activations are undone. */

describe('deployManagedVpc', () => {
  it('creates a create-stage record with deterministic CIDR and provider vocabulary', () => {
    const suggested = CC.suggestManagedCidr();
    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'euw1', tier: '1G' })!;
    expect(m.stage).toBe('create');
    expect(m.cidr).toBe(suggested);
    expect(m.name).toBe('att-managed-euw1');
    expect(m.stages.map(s => s.key)).toEqual(['create', 'vsrx', 'cloud-plumbing', 'att-plumbing', 'live']);
    expect(m.stages.every(s => !s.done)).toBe(true);
    expect(m.stages[2].detail).toBe('TGW attachment + route propagation');
    expect(m.vsrx.nodes.map(n => n.role)).toEqual(['active', 'backup']);
    expect(m.vsrx.bgp.every(b => b.state === 'idle')).toBe(true);
    expect(m.vsrx.throughput).toBe('1 Gbps');
  });

  it('uses Azure vocabulary for an Azure region', () => {
    const m = CC.deployManagedVpc({ cloudId: 'azure', regionId: 'uks', tier: '500M' })!;
    expect(m.stages[2].detail).toBe('VNet peering + UDRs');
    expect(m.stages[3].detail).toBe('Private peering + BGP to AT&T');
    expect(m.vsrx.throughput).toBe('500 Mbps');
  });

  it('refuses a second deploy into the same region, unknown regions, and non-AWS/Azure clouds', () => {
    expect(CC.deployManagedVpc({ cloudId: 'aws', regionId: 'euw1' })).toBeNull(); // already deployed above
    expect(CC.deployManagedVpc({ cloudId: 'aws', regionId: 'nope' })).toBeNull();
    expect(CC.deployManagedVpc({ cloudId: 'gcp', regionId: 'usc1' })).toBeNull();
  });

  it('accepts a caller CIDR of the right shape and rejects a malformed one', () => {
    const m = CC.deployManagedVpc({ cloudId: 'azure', regionId: 'wus2', cidr: '10.255.200.0/24' })!;
    expect(m.cidr).toBe('10.255.200.0/24');
    // malformed cidr → falls back to the suggestion, not null (the shape is demo-validated in the wizard)
    const s = CC.suggestManagedCidr();
    const m2 = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'usw2', cidr: 'not-a-cidr' })!;
    expect(m2.cidr).toBe(s);
  });
});

describe('advanceManagedVpc', () => {
  it('four advances land live, flipping nodes, interfaces and BGP in stage order', () => {
    // euw1 record from the first test — still at create
    const m = CC.managedVpcFor('aws', 'euw1')!;
    CC.advanceManagedVpc(m.id);                       // create -> vsrx
    expect(m.stage).toBe('vsrx');
    expect(m.stages[0].done).toBe(true);
    CC.advanceManagedVpc(m.id);                       // vsrx -> cloud-plumbing
    expect(m.vsrx.nodes.every(n => n.state === 'up')).toBe(true);
    expect(m.vsrx.interfaces.find(i => i.name === 'ge-0/0/0')!.state).toBe('up');
    expect(m.vsrx.interfaces.find(i => i.name === 'ge-0/0/1')!.state).toBe('down');
    CC.advanceManagedVpc(m.id);                       // cloud-plumbing -> att-plumbing
    expect(m.vsrx.bgp.find(b => b.peer === 'cloud')!.state).toBe('established');
    expect(m.vsrx.bgp.find(b => b.peer === 'att')!.state).toBe('idle');
    CC.advanceManagedVpc(m.id);                       // att-plumbing -> live
    expect(m.stage).toBe('live');
    expect(m.stages.every(s => s.done)).toBe(true);
    expect(m.vsrx.interfaces.every(i => i.state === 'up')).toBe(true);
    expect(m.vsrx.bgp.every(b => b.state === 'established')).toBe(true);
  });

  it('is idempotent at live', () => {
    const m = CC.managedVpcFor('aws', 'euw1')!;
    const snap = JSON.stringify(m);
    expect(CC.advanceManagedVpc(m.id)).toBe(m);
    expect(JSON.stringify(m)).toBe(snap);
  });

  it('going live activates an inactive serving on-ramp, and no-ops on an active one', () => {
    // usw2 record from the CIDR test — its serving ramp is dx1, seeded inactive
    const m = CC.managedVpcFor('aws', 'usw2')!;
    const dx1 = (CC.onramps as { id: string; active?: boolean }[]).find(o => o.id === 'dx1')!;
    expect(dx1.active).toBeFalsy();
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    expect(m.stage).toBe('live');
    expect(m.onrampId).toBe('dx1');
    expect(dx1.active).toBe(true);
    expect(CC.undo()).toBe(true);                     // restore dx1 for later files… and this one
    expect(dx1.active).toBeFalsy();
    // the euw1 record went live earlier while nb1-serving? euw1 is served by dx1 too (targets) —
    // if this assertion fails because euw1's live already activated dx1, REORDER the tests so the
    // activation test runs on the FIRST record taken live in this file, and take euw1 live after it.
  });
});
```

Note on the ordering comment: check `CC.onramps` seeds — `dx1.targets` covers `aws/usw2`, `aws/euw1`, `gcp/usc1`. Since the euw1 record goes live in an earlier test, dx1 will already be active by the activation test. RESTRUCTURE while writing: make the four-advance lifecycle test use the **usw2** record and the activation assertions part of it, and take the euw1 record live afterward asserting the no-op branch (`dx1` already active → `activateOnramp` not called → still exactly one undo entry, or simply that `dx1.active` stays true and `CC.undo()` after both restores). Keep the final committed test file self-consistent: run it and read the failures honestly rather than forcing this listing verbatim.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/state-managed.test.ts`
Expected: FAIL — `CC.deployManagedVpc is not a function`

- [ ] **Step 3: Implement the module**

```ts
// src/engine/state-managed.ts
/* Managed VPC/VNET lifecycle — an AT&T-managed gateway VPC with a vSRX HA
   pair, deployed into an AWS/Azure region and plumbed toward the cloud and
   toward AT&T in five watchable stages.

   The orderCircuit idiom, generalized: a setTimeout chain PACES the demo,
   but advanceManagedVpc() is the only function that DECIDES state — tests
   drive stages synchronously and never wait on a timer. Going live
   activates the region's serving on-ramp via the existing activateOnramp,
   so the tree, map and fabric all move from the one engine effect they
   already render. */

const CC = (window as unknown as { CC: any }).CC;

const STAGE_KEYS = ['create', 'vsrx', 'cloud-plumbing', 'att-plumbing', 'live'];
const BEAT_MS = 4000;
let mvSeq = 0;

const CIDR_SHAPE = /^10\.255\.\d{1,3}\.0\/24$/;

function stageDefs(cloudId: string) {
  const az = cloudId === 'azure';
  return [
    { key: 'create', label: az ? 'Create VNet' : 'Create VPC', detail: az ? 'VNet + 2 subnets across zones' : 'VPC + 2 subnets across 2 AZs' },
    { key: 'vsrx', label: 'Launch vSRX HA pair', detail: 'vSRX active/backup across zones' },
    { key: 'cloud-plumbing', label: 'Plumb toward cloud', detail: az ? 'VNet peering + UDRs' : 'TGW attachment + route propagation' },
    { key: 'att-plumbing', label: 'Plumb toward AT&T', detail: az ? 'Private peering + BGP to AT&T' : 'Private VIF + BGP to AT&T' },
    { key: 'live', label: 'Validated · live', detail: 'End-to-end path verified' },
  ];
}

/* Same active-first rule as the Discover chain's servingRamp — duplicated
   here because the engine cannot import from the feature layer; the rule is
   the contract. */
function servingRampFor(cloudId: string, regionId: string) {
  const ramps = (CC.onramps || []).filter((o: any) => o.targets.some(([c, r]: [string, string]) => c === cloudId && r === regionId));
  return ramps.find((r: any) => r.active) || ramps[0] || null;
}

CC.managedVpcs = [];
CC.managedVpcFor = function (cloudId: string, regionId: string) {
  return CC.managedVpcs.find((m: any) => m.cloudId === cloudId && m.regionId === regionId) || null;
};
CC.suggestManagedCidr = function () { return `10.255.${mvSeq + 1}.0/24`; };

CC.deployManagedVpc = function ({ cloudId, regionId, tier, cidr }: { cloudId: string; regionId: string; tier?: string; cidr?: string }) {
  if (cloudId !== 'aws' && cloudId !== 'azure') return null;
  if (CC.managedVpcFor(cloudId, regionId)) return null;
  if (!(CC.regions[cloudId] || []).some((r: any) => r.id === regionId)) return null;
  const ramp = servingRampFor(cloudId, regionId);
  const seq = ++mvSeq;
  const az = cloudId === 'azure';
  const t = tier === '500M' || tier === '5G' ? tier : '1G';
  const m = {
    id: 'mv-' + seq,
    cloudId, regionId,
    name: 'att-managed-' + regionId,
    cidr: cidr && CIDR_SHAPE.test(cidr) ? cidr : `10.255.${seq}.0/24`,
    tier: t,
    stage: 'create',
    stages: stageDefs(cloudId).map(s => ({ ...s, done: false })),
    vsrx: {
      nodes: [
        { id: 'vsrx-0', role: 'active', state: 'launching' },
        { id: 'vsrx-1', role: 'backup', state: 'launching' },
      ],
      interfaces: [
        { name: 'ge-0/0/0', toward: az ? 'VNet peering' : 'TGW attachment', state: 'down' },
        { name: 'ge-0/0/1', toward: 'AT&T circuit', state: 'down' },
        { name: 'fxp0', toward: 'management', state: 'down' },
      ],
      bgp: [
        { peer: 'cloud', label: az ? 'vSRX ↔ VNet (over peering)' : 'vSRX ↔ TGW', state: 'idle' },
        { peer: 'att', label: az ? 'vSRX ↔ AT&T (private peering)' : 'vSRX ↔ AT&T (private VIF)', state: 'idle' },
      ],
      throughput: t === '500M' ? '500 Mbps' : t === '5G' ? '5 Gbps' : '1 Gbps',
    },
    onrampId: ramp ? ramp.id : null,
  };
  CC.managedVpcs.push(m);
  CC._.emit({ type: 'policy', label: 'Managed ' + (az ? 'VNET' : 'VPC') + ' deploying · ' + m.name });
  const beat = () => { if (m.stage !== 'live') { CC.advanceManagedVpc(m.id); setTimeout(beat, BEAT_MS); } };
  setTimeout(beat, BEAT_MS);
  return m;
};

CC.advanceManagedVpc = function (id: string) {
  const m = CC.managedVpcs.find((x: any) => x.id === id);
  if (!m || m.stage === 'live') return m || null;
  const next = STAGE_KEYS[STAGE_KEYS.indexOf(m.stage) + 1];
  const mark = (k: string) => { const s = m.stages.find((x: any) => x.key === k); if (s) s.done = true; };
  const ifc = (n: string, st: string) => { const i = m.vsrx.interfaces.find((x: any) => x.name === n); if (i) i.state = st; };
  const bgp = (p: string, st: string) => { const b = m.vsrx.bgp.find((x: any) => x.peer === p); if (b) b.state = st; };
  mark(m.stage);
  if (next === 'cloud-plumbing') { m.vsrx.nodes.forEach((n: any) => { n.state = 'up'; }); ifc('ge-0/0/0', 'up'); ifc('fxp0', 'up'); }
  if (next === 'att-plumbing') { bgp('cloud', 'established'); }
  if (next === 'live') {
    ifc('ge-0/0/1', 'up'); bgp('att', 'established'); mark('live');
    const o = (CC.onramps || []).find((x: any) => x.id === m.onrampId);
    if (o && !o.active) CC.activateOnramp(m.onrampId);
  }
  m.stage = next;
  CC._.emit({ type: 'policy', label: (next === 'live' ? 'Managed VPC live · ' : 'Managed VPC · ' + next + ' · ') + m.name });
  return m;
};
```

Then `src/engine/index.ts`: add `import './state-managed';` directly after `import './state-routing';`. Then `src/engine/types.ts`: add the `ManagedVpc` interface (spec shape, exported) and to `CloudControl`: `managedVpcs: ManagedVpc[]; deployManagedVpc(opts: {cloudId: string; regionId: string; tier?: '500M'|'1G'|'5G'; cidr?: string}): ManagedVpc | null; advanceManagedVpc(id: string): ManagedVpc | null; managedVpcFor(cloudId: string, regionId: string): ManagedVpc | null; suggestManagedCidr(): string;`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/state-managed.test.ts` — PASS (restructure ordering per the Step-1 note if the dx1 interplay bites). Then `npx tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/state-managed.ts src/engine/state-managed.test.ts src/engine/index.ts src/engine/types.ts
git commit -m "feat(engine): managed VPC lifecycle — timers pace, advance decides"
```

---

### Task 2: Wizard model — pure logic

**Files:**
- Create: `src/features/connect/managedVpcWizardModel.ts`
- Test: `src/features/connect/managedVpcWizardModel.test.ts`

**Interfaces:**
- Consumes: `CC.regions`, `CC.clouds`, `CC.managedVpcFor`, `CC.suggestManagedCidr` (Task 1).
- Produces:
  - `WIZ_STEPS: ['region', 'tier', 'cidr', 'confirm']`
  - `interface EligibleRegion { cloudId: string; cloudName: string; regionId: string; regionName: string }`
  - `eligibleRegions(cc): EligibleRegion[]` — AWS+Azure regions with no managed VPC in any stage
  - `TIERS: { id: '500M'|'1G'|'5G'; label: string; blurb: string }[]`
  - `validCidr(raw: string): boolean` — `/^10\.255\.\d{1,3}\.0\/24$/` on the trimmed value
  - `confirmCopy(cloudId, regionName, tier, onrampName): string` — provider-vocabulary summary sentence

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/connect/managedVpcWizardModel.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { eligibleRegions, validCidr, confirmCopy, TIERS, WIZ_STEPS } from './managedVpcWizardModel';

describe('managedVpcWizardModel', () => {
  it('offers every AWS/Azure region exactly once and no other clouds', () => {
    const el = eligibleRegions(CC);
    const clouds = new Set(el.map(e => e.cloudId));
    expect([...clouds].sort()).toEqual(['aws', 'azure']);
    const awsCount = (CC.regions['aws'] || []).length;
    const azCount = (CC.regions['azure'] || []).length;
    expect(el.length).toBe(awsCount + azCount);
  });

  it('a deployed region drops out of eligibility', () => {
    CC.deployManagedVpc({ cloudId: 'aws', regionId: 'use1' });
    expect(eligibleRegions(CC).some(e => e.regionId === 'use1')).toBe(false);
  });

  it('validates the managed CIDR shape', () => {
    expect(validCidr('10.255.7.0/24')).toBe(true);
    expect(validCidr(' 10.255.7.0/24 ')).toBe(true);
    expect(validCidr('10.0.0.0/16')).toBe(false);
    expect(validCidr('')).toBe(false);
  });

  it('confirm copy speaks the provider vocabulary', () => {
    expect(confirmCopy('aws', 'Oregon', '1G', 'Direct Connect · Equinix DC2'))
      .toContain('TGW attachment');
    expect(confirmCopy('azure', 'West US 2', '1G', 'ExpressRoute · Equinix CH1'))
      .toContain('VNet peering');
    expect(WIZ_STEPS).toEqual(['region', 'tier', 'cidr', 'confirm']);
    expect(TIERS.map(t => t.id)).toEqual(['500M', '1G', '5G']);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/features/connect/managedVpcWizardModel.test.ts` (module not found).

- [ ] **Step 3: Implement**

```ts
// src/features/connect/managedVpcWizardModel.ts
import type { CloudControl } from '../../engine/types';

/** Pure logic for the Deploy Managed VPC wizard — eligibility, steps, CIDR
 *  shape and confirm copy, kept out of the component (wizardModel precedent). */

export const WIZ_STEPS = ['region', 'tier', 'cidr', 'confirm'] as const;
export type WizStep = (typeof WIZ_STEPS)[number];

export interface EligibleRegion { cloudId: string; cloudName: string; regionId: string; regionName: string }

const MANAGED_CLOUDS = ['aws', 'azure'];

export function eligibleRegions(cc: CloudControl): EligibleRegion[] {
  const out: EligibleRegion[] = [];
  for (const c of (cc.clouds as { id: string; name: string }[]).filter(c => MANAGED_CLOUDS.includes(c.id))) {
    for (const r of (cc.regions[c.id] || []) as { id: string; name: string }[]) {
      if (!cc.managedVpcFor(c.id, r.id)) out.push({ cloudId: c.id, cloudName: c.name, regionId: r.id, regionName: r.name });
    }
  }
  return out;
}

export const TIERS = [
  { id: '500M', label: '500 Mbps', blurb: 'Branch-scale workloads' },
  { id: '1G', label: '1 Gbps', blurb: 'The common enterprise tier' },
  { id: '5G', label: '5 Gbps', blurb: 'Data-heavy east-west traffic' },
] as const;

export function validCidr(raw: string): boolean {
  return /^10\.255\.\d{1,3}\.0\/24$/.test(raw.trim());
}

export function confirmCopy(cloudId: string, regionName: string, tier: string, onrampName: string): string {
  const az = cloudId === 'azure';
  const t = TIERS.find(x => x.id === tier)?.label ?? tier;
  return az
    ? `This deploys a Managed VNET in ${regionName}: vSRX HA pair (${t}), VNet peering + UDRs toward your workloads, private peering + BGP to AT&T over ${onrampName}.`
    : `This deploys a Managed VPC in ${regionName}: vSRX HA pair (${t}), TGW attachment toward your workloads, private VIF + BGP to AT&T over ${onrampName}.`;
}
```

- [ ] **Step 4: Run to verify PASS.**

- [ ] **Step 5: Commit** — `git add src/features/connect/managedVpcWizardModel.*` ; `git commit -m "feat(connect): managed-vpc wizard model — eligibility is derived, never asserted"`

---

### Task 3: DeployManagedVpcWizard — component + live tracker

**Files:**
- Create: `src/features/connect/DeployManagedVpcWizard.tsx`
- Test: `src/features/connect/DeployManagedVpcWizard.test.tsx`

**Interfaces:**
- Consumes: Task 2's model, Task 1's engine API, `useCloudControl`/`useCloudControlActions`, `ProviderLogo { id, size }`.
- Produces: `export function DeployManagedVpcWizard({ lockedRegion, onClose }: { lockedRegion?: { cloudId: string; regionId: string }; onClose: () => void })` — Tasks 4 and 5 mount it.

Component behavior (follow `ProvisionWizard`'s dialog idiom — overlay div, stopPropagation, step dots):
- `lockedRegion` provided → region step is skipped (start at `tier`), the locked region shown as a static header line.
- Steps per the model; CIDR input pre-filled with `cc.suggestManagedCidr()`, Next disabled while `!validCidr(value)`.
- Confirm → `actions.deployManagedVpc({cloudId, regionId, tier, cidr})`; on success the modal body swaps to the tracker (do NOT close).
- Tracker: reads `cc.managedVpcFor(cloudId, regionId)` via `useCloudControl`, lists the five stages with a check (done), a pulse dot (current), or a dim dot (pending); under it the two BGP sessions with their state. Close button always present; copy near it states "Deployment continues in the engine — close anytime."
- If the region already has a managed VPC when opened (both doors race), skip straight to the tracker.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/connect/DeployManagedVpcWizard.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { CC } from '../../engine';
import { DeployManagedVpcWizard } from './DeployManagedVpcWizard';

afterEach(cleanup);

describe('DeployManagedVpcWizard', () => {
  it('locked region: walks tier -> cidr -> confirm and creates the engine record', () => {
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'aws', regionId: 'usw2' }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /1 Gbps/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const cidr = screen.getByLabelText(/CIDR/i) as HTMLInputElement;
    expect(cidr.value).toBe(CC.suggestManagedCidr());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: /Deploy/ }));
    const m = CC.managedVpcFor('aws', 'usw2');
    expect(m).not.toBeNull();
    // tracker replaces the steps — the first stage is listed
    expect(screen.getByText(m!.stages[0].label)).toBeInTheDocument();
  });

  it('tracker reflects engine advances live', () => {
    // record exists from the previous test
    const m = CC.managedVpcFor('aws', 'usw2')!;
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'aws', regionId: 'usw2' }} onClose={() => {}} />);
    act(() => { CC.advanceManagedVpc(m.id); });
    expect(screen.getByTestId(`stage-${m.stages[0].key}`)).toHaveAttribute('data-done', 'true');
  });

  it('an invalid CIDR blocks Next', () => {
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'azure', regionId: 'uks' }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /500 Mbps/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/CIDR/i), { target: { value: '10.0.0.0/8' } });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
```

Cleanup note: this file deploys into `usw2` (goes only to `create` unless advanced) — later drawer/map tests in OTHER files get a fresh CC, so no cross-file leak. Within this file, the third test uses `uks`, untouched by the first two. If `advanceManagedVpc` in test 2 fires an on-ramp activation (it cannot at stage create→vsrx), no undo is needed.

- [ ] **Step 2: FAIL** — module not found.
- [ ] **Step 3: Implement** the component per the behavior block above. Real `<button>`s, `role="dialog"`, `aria-label` per instance ("Deploy managed VPC"), stage rows carry `data-testid={'stage-'+key}` and `data-done={String(done)}`. Palette: fw-* only.
- [ ] **Step 4: PASS** — `npx vitest run src/features/connect/DeployManagedVpcWizard.test.tsx`, then `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat(connect): deploy wizard with a tracker that only reports the engine"`

---

### Task 4: Connect door — RegionPanel managed block

**Files:**
- Modify: `src/features/connect/RegionPanel.tsx`
- Test: `src/features/connect/RegionPanel.managed.test.tsx` (new file)

**Interfaces:**
- Consumes: Task 3's wizard, Task 1's engine API, existing `RegionPanelProps` (`region: FabricRegion`, which carries `cloudId`/`regionId`).
- Produces: UI only.

Behavior: a "Managed VPC" block after the existing attach content —
- No record: one-line blurb ("An AT&T-managed gateway VPC with a vSRX HA pair, plumbed to your workloads and to AT&T.") + "Deploy managed VPC" button → mounts `DeployManagedVpcWizard` with `lockedRegion` (local `useState` open flag). Only for `aws`/`azure` regions — other clouds render nothing.
- Record deploying: current stage label + detail, live off `useCloudControl`.
- Record live: name · tier · "vSRX HA pair · both BGP sessions established" line.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/connect/RegionPanel.managed.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { RegionPanel } from './RegionPanel';

afterEach(cleanup);

const renderPanel = () => {
  const model = CC.fabricModel();
  const region = model.regions.find(r => r.regionId === 'use1')!;
  return render(
    <MemoryRouter>
      <RegionPanel region={region} model={model} onProvision={() => {}} onProvisioned={() => {}} />
    </MemoryRouter>,
  );
};

describe('RegionPanel managed-vpc block', () => {
  it('offers the deploy door when the region has no managed VPC', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /deploy managed vpc/i })).toBeInTheDocument();
  });

  it('shows the current stage while deploying', () => {
    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'use1' })!;
    renderPanel();
    expect(screen.queryByRole('button', { name: /deploy managed vpc/i })).toBeNull();
    expect(screen.getByText(m.stages[0].label)).toBeInTheDocument();
  });

  it('states the live summary once live', () => {
    const m = CC.managedVpcFor('aws', 'use1')!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    renderPanel();
    expect(screen.getByText('att-managed-use1')).toBeInTheDocument();
    expect(screen.getByText(/BGP sessions established/i)).toBeInTheDocument();
    // use1's ramp nb1 is already active — going live activated nothing, no undo needed
  });
});
```
- [ ] **Step 2: FAIL** (no managed block yet).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: PASS** + run the whole existing connect suite: `npx vitest run src/features/connect/` — pre-existing tests stay green.
- [ ] **Step 5: Commit** — `git commit -m "feat(connect): the region panel's managed-vpc door"`

---

### Task 5: Discover integration — chain hop, drawer detail + door, map shield

**Files:**
- Modify: `src/features/discover/attachmentModel.ts` (chain hop + `managedVpc` field; map model `managedVpc` flag)
- Modify: `src/features/discover/ChainDrawer.tsx` (render the hop detail; deploy door)
- Modify: `src/features/discover/AttachmentMap.tsx` (shield marker; host the wizard for the drawer door)
- Test: `src/features/discover/attachmentModel.managed.test.ts`, `src/features/discover/ChainDrawer.managed.test.tsx` (new files)

**Interfaces:**
- Consumes: Task 1 engine API, Task 3 wizard.
- Produces:
  - `AttachmentChain` gains `managedVpc: ManagedVpc | null` (null unless live) and, when live, `gateways` gains a final hop `{ id: m.id, name: m.name, type: 'AT&T managed VPC · vSRX HA pair' }` (Azure: `'AT&T managed VNET · vSRX HA pair'`).
  - `buildAttachmentMapModel` region entries gain `managedVpc: boolean` (true only when live).
  - `ChainDrawer` gains optional prop `onDeployManagedVpc?: (cloudId: string, regionId: string) => void` — the deploy door renders only when the callback is provided AND the region has NO record in any stage.

- [ ] **Step 1: Failing tests**

```ts
// src/features/discover/attachmentModel.managed.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { attachmentChain, buildAttachmentMapModel } from './attachmentModel';

describe('attachmentChain × managed VPC', () => {
  it('no hop and null field before live; hop + field once live', () => {
    const before = attachmentChain(CC, 'aws', 'use1', 'vpcprod')!;
    expect(before.managedVpc).toBeNull();
    expect(before.gateways.some(g => /managed/i.test(g.type))).toBe(false);

    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'use1' })!;
    const deploying = attachmentChain(CC, 'aws', 'use1', 'vpcprod')!;
    expect(deploying.managedVpc).toBeNull();          // nothing claims what isn't up

    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    const after = attachmentChain(CC, 'aws', 'use1', 'vpcprod')!;
    expect(after.managedVpc?.id).toBe(m.id);
    const hop = after.gateways[after.gateways.length - 1];
    expect(hop.name).toBe('att-managed-use1');
    expect(hop.type).toBe('AT&T managed VPC · vSRX HA pair');
  });

  it('the map model flags only live managed regions', () => {
    const model = buildAttachmentMapModel(CC);
    const use1 = model.groups.find(g => g.cloudId === 'aws')!.regions.find(r => r.region.id === 'use1')!;
    const usw2 = model.groups.find(g => g.cloudId === 'aws')!.regions.find(r => r.region.id === 'usw2')!;
    expect(use1.managedVpc).toBe(true);               // taken live above (same file)
    expect(usw2.managedVpc).toBe(false);
  });
});
```

```tsx
// src/features/discover/ChainDrawer.managed.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CC } from '../../engine';
import { ChainDrawer } from './ChainDrawer';

afterEach(cleanup);

describe('ChainDrawer × managed VPC', () => {
  it('offers the deploy door only when a callback is given and no record exists', () => {
    const calls: string[] = [];
    render(<ChainDrawer selection={{ kind: 'workload', cloudId: 'aws', regionId: 'usw2', vpcId: 'vpcwest' }}
      onClose={() => {}} onDeployManagedVpc={(c, r) => calls.push(`${c}/${r}`)} />);
    fireEvent.click(screen.getByRole('button', { name: /deploy managed vpc/i }));
    expect(calls).toEqual(['aws/usw2']);
  });

  it('renders vSRX detail once live, and hides the door', () => {
    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'usw2' })!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    render(<ChainDrawer selection={{ kind: 'workload', cloudId: 'aws', regionId: 'usw2', vpcId: 'vpcwest' }}
      onClose={() => {}} onDeployManagedVpc={() => {}} />);
    expect(screen.getByText('att-managed-usw2')).toBeInTheDocument();
    expect(screen.getByText(/vsrx-0/)).toBeInTheDocument();
    expect(screen.getAllByText(/established/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: /deploy managed vpc/i })).toBeNull();
    CC.undo();                                        // usw2 live activated dx1 — restore
  });
});
```

Check the actual usw2 VPC ids in the seeds before committing (`vpcwest` is an assumption — read `src/engine/state.ts` and use a real id). Note the live advance in the second test activates dx1 → the drawer for `vpcwest` may now show an attached chain; the assertions above don't depend on attach state.

- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement:**
  - `attachmentModel.ts`: in `attachmentChain`, after gateways are built: `const mv = (cc as any).managedVpcFor?.(cloudId, regionId) ?? null; const live = mv && mv.stage === 'live' ? mv : null; if (live) gateways.push({ id: live.id, name: live.name, type: (cloudId === 'azure' ? 'AT&T managed VNET' : 'AT&T managed VPC') + ' · vSRX HA pair' });` and add `managedVpc: live` to the returned object (extend the `AttachmentChain` interface with `managedVpc: ManagedVpc | null`, importing the type from `../../engine/types`). In `buildAttachmentMapModel`, add `managedVpc: !!(live per region)` to region entries using the same stage-live predicate.
  - `ChainDrawer.tsx`: workload branch — when `chain.managedVpc` is set, render a detail block under the managed hop: nodes (`vsrx-0 · active · up`), interfaces (`ge-0/0/0 → TGW attachment · up`), BGP rows with state chips (fw-success when established), throughput. When no record exists for the region (`!cc.managedVpcFor(...)` — any stage) AND `onDeployManagedVpc` is provided, render a secondary button `Deploy managed VPC in <region>` (style: bordered, not the cobalt primary — the attach CTA keeps primacy).
  - `AttachmentMap.tsx`: pass `onDeployManagedVpc={(cloudId, regionId) => setDeploy({cloudId, regionId})}` to `ChainDrawer`; render `{deploy && <DeployManagedVpcWizard lockedRegion={deploy} onClose={() => setDeploy(null)} />}`. Shield marker: for region-label rows whose model entry has `managedVpc`, render a small `ShieldCheck` (lucide) beside the region label text in cobalt (`foreignObject` not needed — plain SVG `<g>` with the icon as a styled span in the existing label `foreignObject`/text; simplest: append ` · vSRX` styled cobalt to the region label text and a `<title>` for hover: implementer's choice, but it must be visually distinct and add zero interactivity).
- [ ] **Step 4: PASS both new files** + `npx vitest run src/features/discover/` all green.
- [ ] **Step 5: Commit** — `git commit -m "feat(discover): the chain carries the managed hop — once it has earned live"`

---

### Task 6: Full verification

- [ ] **Step 1:** `npx vitest run` — full suite green.
- [ ] **Step 2:** `npm run build` — tsc + vite clean.
- [ ] **Step 3 (orchestrating session, not a subagent):** browser walkthrough — from Connect: deploy into us-west-2, watch the five beats land in the tracker, confirm dx1 lights and the tree/map agree; from the Discover map: open a us-west-2 workload, read the vSRX hop detail; open an eligible region's drawer and confirm the deploy door opens the wizard region-locked. Evidence via DOM reads (screenshot pipeline permitting).
