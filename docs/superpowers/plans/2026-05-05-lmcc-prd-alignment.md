# LMCC PRD Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the LMCC demo with the Connection Coordinator API model described in the AT&T AWS LMCC Interconnect PRD — correcting the flow model, removing customer-facing BGP/VIF config, adding Flow 03 (AT&T-first), and fixing data errors.

**Architecture:** Two distinct portal flows (Flow 03: AT&T-first generates key; Flow 04: AWS-first uploads key) both converge at the same 5-stage status progression. All L3 negotiation is automated — the customer configures only location, bandwidth, and AWS account ID. New `LMCCCreateFlow` component handles Flow 03. The existing Kickoff/Onboarding pair is simplified to correctly represent Flow 04.

**Tech Stack:** React 19, TypeScript strict, Tailwind, Zustand, Vite. No new dependencies.

---

## File Map

| File | Action | Change |
|---|---|---|
| `src/types/lmcc.ts` | Modify | Add `ConnectionProvisioningStatus` (5-stage PRD states), `LMCCActivationKey`, `LMCCFlow03Intent` types; remove wrong `LMCCOnboardingConfig` fields |
| `src/data/lmccService.ts` | Modify | Fix GA date (Nov 16), fix GA bandwidth tiers, mark LA as fiber-pending, fix LA DC names |
| `src/components/connection/lmcc/LMCCCreateFlow.tsx` | **Create** | Flow 03: 3-step AT&T-first wizard (location → bandwidth → AWS account ID → generate key) |
| `src/components/connection/lmcc/LMCCKickoffModal.tsx` | Modify | Reframe as Flow 04 key upload — key comes FROM AWS, customer pastes it here |
| `src/components/connection/lmcc/LMCCOnboardingDrawer.tsx` | Modify | Remove BGP/VIF/ASN/MD5/path-preference steps; simplify to status + billing acknowledge |
| `src/components/connection/lmcc/LMCCStatusPanel.tsx` | Modify | Replace demo status states with PRD 5-stage progression display |
| `src/components/connection/lmcc/LMCCWorkflowVisualization.tsx` | Rewrite | Correct dual-flow diagram based on Connection Coordinator API model |

---

## Task 1: Fix type definitions

**Files:**
- Modify: `src/types/lmcc.ts`

- [ ] **Step 1: Add PRD-aligned types and remove wrong ones**

Replace the entire file content with:

```typescript
/**
 * LMCC (Last Mile Cloud Connectivity) Type Definitions
 *
 * Product: AT&T AWS Interconnect — Connection Coordinator API model.
 * Customer makes 3 choices: location, bandwidth, AWS account ID.
 * Everything else (BGP ASN, VLAN, IP subnets, MTU) is negotiated
 * automatically between AT&T and AWS. Customers configure nothing else.
 *
 * Two portal flows:
 *   Flow 03 (AT&T-first): Customer starts here, generates ActivationKey, takes it to AWS.
 *   Flow 04 (AWS-first):  Customer starts at AWS, gets ActivationKey there, uploads it here.
 * Both converge at the same 5-stage status progression.
 */

// --- Metro ---

export type LMCCPhase = 'preview' | 'ga';

export interface LMCCMetro {
  id: string;
  name: string;            // "San Jose, CA" | "Northern Virginia"
  datacenters: string[];   // 2 diverse AWS DX colocation sites per metro
  facilities: string[];    // "Equinix" | "CoreSite"
  phase: LMCCPhase;
  awsRegion: string;
  awsRegionLabel: string;
  available: boolean;      // false = infrastructure not yet ready (e.g. LA fiber pending)
  unavailableReason?: string;
}

// --- ActivationKey ---

export interface LMCCActivationKey {
  raw: string;             // base64-encoded key string
  sharedConnectionUuid: string;
  connectionSizeMbps: number;
  destinationAccountId: string;
  destinationEnvironmentUri: string;
  expiresAt: string;       // ISO timestamp — keys are valid 7 days
  generatedAt: string;
}

// --- Flow 03: Intent (AT&T-first) ---

export interface LMCCFlow03Intent {
  metroId: string;
  bandwidthMbps: number;
  awsAccountId: string;    // must be valid 12-digit AWS account ID
}

// --- Key upload error states (Flow 04) ---

export type LMCCKeyUploadError =
  | 'invalid-format'       // locally: not a valid ActivationKey shape
  | 'not-recognised'       // AWS returned keyValid: false — security event
  | 'already-used'         // key already activated a connection
  | 'expired'              // more than 7 days since generation
  | 'wrong-account';       // AWS account in key ≠ authenticated user's account

// --- Path (one of 4 per LMCC connection) ---

export type BGPState =
  | 'idle'
  | 'connect'
  | 'active'
  | 'open-sent'
  | 'open-confirm'
  | 'established';

export type LMCCPathStatus = 'pending' | 'active' | 'down';

export interface LMCCPath {
  id: string;
  ipeId: string;              // Juniper MX-304 identifier
  datacenter: string;
  awsConnectionId: string;
  vlanId: number;             // AWS-assigned — not customer-configured
  bgpState: BGPState;
  physicalPort: string;
  status: LMCCPathStatus;
}

// --- PRD 5-stage status progression ---
// Applies to BOTH flows once the ActivationKey exchange is complete.

export type ConnectionProvisioningStatus =
  | 'key-generated'       // Flow 03 only: AT&T created pending connection, waiting for AWS
  | 'key-accepted'        // AWS received and validated the key, negotiation starting
  | 'negotiating'         // AT&T and AWS auto-negotiating L3 for all 4 channels
  | 'bgp-forming'         // Parameters agreed, BGP sessions coming up on AT&T hardware
  | 'live';               // Both AT&T and AWS confirmed. Traffic can flow.

// Operational states for an already-live connection
export type LMCCConnectionStatus =
  | ConnectionProvisioningStatus
  | 'degraded'            // 1-3 paths down but service operational
  | 'disconnected';       // All paths down or connection deleted

// --- Contract ---

export type LMCCContractType =
  | 'trial'       // Preview phase only, zero-penalty disconnect
  | 'monthly'
  | 'fixed-12'
  | 'fixed-24'
  | 'fixed-36';

// --- Connection ---

export interface LMCCBilling {
  trigger: 'bgp-established';
  startedAt?: string;
  contractEndDate?: string;
  model: 'fixed-rate' | 'burstable';
}

export interface LMCCBGP {
  partnerASN: number;    // AT&T's ASN (7018) — not customer-configured
  customerASN: number;   // negotiated automatically
  md5Key?: string;       // negotiated automatically
}

export interface LMCCBFD {
  interval: 300;
  multiplier: 3;
}

export interface LMCCConnection {
  id: string;
  awsAccountId: string;
  metro: LMCCMetro;
  status: LMCCConnectionStatus;
  provisioningStatus?: ConnectionProvisioningStatus;
  contractType: LMCCContractType;
  bandwidth: number;       // Mbps — same for all 4 paths
  transport: 'mpls' | 'internet';
  paths: [LMCCPath, LMCCPath, LMCCPath, LMCCPath];
  bgp: LMCCBGP;
  bfd: LMCCBFD;
  billing: LMCCBilling;
  activationKey?: LMCCActivationKey;
  createdAt: string;
  updatedAt: string;
}

// --- Phase capabilities ---

export interface LMCCPhaseConfig {
  phase: LMCCPhase;
  availableMetros: string[];
  bandwidthOptions: number[];
  contractTypes: LMCCContractType[];
  transports: ('mpls' | 'internet')[];
  operations: ('create' | 'read' | 'update' | 'delete')[];
}
```

- [ ] **Step 2: Verify TypeScript sees no errors**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in files that import the old `LMCCOnboardingConfig` type (those get fixed in subsequent tasks). No errors in `lmcc.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/types/lmcc.ts
git commit -m "feat(lmcc): align types with Connection Coordinator API model"
```

---

## Task 2: Fix data layer

**Files:**
- Modify: `src/data/lmccService.ts`

- [ ] **Step 1: Rewrite lmccService.ts with corrected data**

Replace the entire file:

```typescript
/**
 * LMCC Data Layer
 *
 * Source of truth: LMCC Product Notes (AT&T AWS LMCC Interconnect - 04092026.docx)
 *
 * Key facts:
 * - Preview: San Jose only at 1 Gbps. LA requires ~500mi fiber run (not yet installed).
 * - GA: San Jose + Ashburn (LA drops). Bandwidth 1–100 Gbps in spec'd tiers.
 * - GA date: November 16, 2026.
 * - Locations and bandwidth options come from live API — never hardcode in prod.
 */

import {
  LMCCMetro,
  LMCCPhaseConfig,
  LMCCConnection,
  LMCCContractType,
} from '../types/lmcc';

export interface LMCCRegionGroup {
  regionId: string;
  regionLabel: string;
  metros: LMCCMetro[];
}

export function getMetrosGroupedByRegion(metros: LMCCMetro[] = LMCC_METROS): LMCCRegionGroup[] {
  const groups = new Map<string, LMCCRegionGroup>();
  for (const metro of metros) {
    if (!groups.has(metro.awsRegion)) {
      groups.set(metro.awsRegion, { regionId: metro.awsRegion, regionLabel: metro.awsRegionLabel, metros: [] });
    }
    groups.get(metro.awsRegion)!.metros.push(metro);
  }
  return Array.from(groups.values());
}

// --- Metro Definitions ---
// PRD rule: customers see metro names only, never datacenter/colocation names.
// Datacenter names here are AT&T internal references, not shown in selectors.

export const LMCC_METROS: LMCCMetro[] = [
  {
    id: 'metro-sj',
    name: 'San Jose, CA',
    // Preview: Equinix SJ — AT&T and AWS are in the same building, intra-DC cross-connect.
    // GA adds CoreSite SJ after Equinix LA is migrated and decommissioned.
    datacenters: ['Equinix San Jose', 'Equinix San Jose (SV5)'],
    facilities: ['Equinix'],
    phase: 'preview',
    awsRegion: 'us-west-1',
    awsRegionLabel: 'US West (N. California)',
    available: true,
  },
  {
    id: 'metro-la',
    name: 'Los Angeles, CA',
    // Preview: requires ~500mi long-haul fiber run (Grass Valley → El Segundo).
    // Fiber not yet installed. Commercial decision on contract type still pending.
    // This metro is NOT available until fiber installation is confirmed complete.
    datacenters: ['Equinix Los Angeles'],
    facilities: ['Equinix'],
    phase: 'preview',
    awsRegion: 'us-west-1',
    awsRegionLabel: 'US West (N. California)',
    available: false,
    unavailableReason: 'Infrastructure pending — fiber installation in progress',
  },
  {
    id: 'metro-ash',
    // PRD customer display name: "Ashburn, VA" (agreed jointly with AWS)
    name: 'Ashburn, VA',
    datacenters: ['Equinix DC2', 'CoreSite VA1'],
    facilities: ['Equinix', 'CoreSite'],
    phase: 'ga',
    awsRegion: 'us-east-1',
    awsRegionLabel: 'US East (N. Virginia)',
    available: false, // GA only
    unavailableReason: 'Available at GA (November 16, 2026)',
  },
];

// GA metro set: San Jose (with CoreSite added) + Ashburn. LA drops at GA.
export const LMCC_METROS_GA: LMCCMetro[] = [
  {
    id: 'metro-sj',
    name: 'San Jose, CA',
    // GA: Equinix SJ (new certified hardware) + CoreSite SJ (replaces Equinix LA).
    datacenters: ['Equinix San Jose', 'CoreSite San Jose'],
    facilities: ['Equinix', 'CoreSite'],
    phase: 'ga',
    awsRegion: 'us-west-1',
    awsRegionLabel: 'US West (N. California)',
    available: true,
  },
  {
    id: 'metro-ash',
    name: 'Ashburn, VA',
    datacenters: ['Equinix DC2', 'CoreSite VA1'],
    facilities: ['Equinix', 'CoreSite'],
    phase: 'ga',
    awsRegion: 'us-east-1',
    awsRegionLabel: 'US East (N. Virginia)',
    available: true,
  },
];

export const PHASE_DATES = {
  preview: 'June 30, 2026',
  ga: 'November 16, 2026',   // PRD: "targeted for November 16, 2026"
} as const;

// --- Phase Capabilities ---

export const LMCC_PHASES: Record<'preview' | 'ga', LMCCPhaseConfig> = {
  preview: {
    phase: 'preview',
    availableMetros: ['metro-sj'],  // LA not available until fiber confirmed
    bandwidthOptions: [1000],       // Fixed 1 Gbps only at Preview
    contractTypes: ['trial'],
    transports: ['mpls'],
    operations: ['create', 'delete'],
  },
  ga: {
    phase: 'ga',
    availableMetros: ['metro-sj', 'metro-ash'],
    // PRD Section 3: "1, 2, 5, 10, 25, 50, 100 Gbps" at GA
    bandwidthOptions: [1000, 2000, 5000, 10000, 25000, 50000, 100000],
    contractTypes: ['monthly', 'fixed-12', 'fixed-24', 'fixed-36'],
    transports: ['mpls', 'internet'],
    operations: ['create', 'read', 'update', 'delete'],
  },
};

export const CURRENT_PHASE: 'preview' | 'ga' = 'preview';

// --- Helpers ---

export function getAvailableMetros(phase?: 'preview' | 'ga'): LMCCMetro[] {
  const p = phase || CURRENT_PHASE;
  const config = LMCC_PHASES[p];
  const allMetros = p === 'ga' ? LMCC_METROS_GA : LMCC_METROS;
  return allMetros.filter(m => config.availableMetros.includes(m.id) && m.available);
}

export function getAllMetrosForPhase(phase?: 'preview' | 'ga'): LMCCMetro[] {
  const p = phase || CURRENT_PHASE;
  return p === 'ga' ? LMCC_METROS_GA : LMCC_METROS;
}

export function getMetroById(id: string): LMCCMetro | undefined {
  return [...LMCC_METROS, ...LMCC_METROS_GA].find(m => m.id === id);
}

export function getBandwidthOptions(phase?: 'preview' | 'ga'): number[] {
  const p = phase || CURRENT_PHASE;
  return LMCC_PHASES[p].bandwidthOptions;
}

export function getContractTypes(phase?: 'preview' | 'ga'): LMCCContractType[] {
  const p = phase || CURRENT_PHASE;
  return LMCC_PHASES[p].contractTypes;
}

export function formatBandwidth(mbps: number): string {
  if (mbps >= 1000) return `${mbps / 1000} Gbps`;
  return `${mbps} Mbps`;
}

export function getPhaseLabel(phase: 'preview' | 'ga'): string {
  return phase === 'preview' ? `Preview (${PHASE_DATES.preview})` : `GA (${PHASE_DATES.ga})`;
}

export function getPhaseTag(phase: 'preview' | 'ga'): { label: string; className: string } {
  return phase === 'preview'
    ? { label: 'Preview · Jun 2026', className: 'bg-fw-accent text-fw-link' }
    : { label: 'GA · Nov 2026', className: 'bg-fw-successLight text-fw-success' };
}

// Validates AWS account ID format: exactly 12 digits
export function isValidAwsAccountId(id: string): boolean {
  return /^\d{12}$/.test(id.trim());
}

// --- Mock Data ---

export const MOCK_LMCC_CONNECTIONS: LMCCConnection[] = [
  {
    id: 'lmcc-001',
    awsAccountId: '123456789012',
    metro: LMCC_METROS[0], // San Jose
    status: 'live',
    provisioningStatus: 'live',
    contractType: 'trial',
    bandwidth: 1000,
    transport: 'mpls',
    paths: [
      {
        id: 'path-1',
        ipeId: 'MX304-SJ-A',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-abc001',
        vlanId: 1001,
        bgpState: 'established',
        physicalPort: '100GE-0/0/0',
        status: 'active',
      },
      {
        id: 'path-2',
        ipeId: 'MX304-SJ-B',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-abc002',
        vlanId: 1002,
        bgpState: 'established',
        physicalPort: '100GE-0/0/1',
        status: 'active',
      },
      {
        id: 'path-3',
        ipeId: 'MX304-SJ-C',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-abc003',
        vlanId: 1003,
        bgpState: 'established',
        physicalPort: '100GE-0/0/0',
        status: 'active',
      },
      {
        id: 'path-4',
        ipeId: 'MX304-SJ-D',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-abc004',
        vlanId: 1004,
        bgpState: 'established',
        physicalPort: '100GE-0/0/1',
        status: 'active',
      },
    ],
    bgp: {
      partnerASN: 7018,
      customerASN: 65000,
      md5Key: '********',
    },
    bfd: { interval: 300, multiplier: 3 },
    billing: {
      trigger: 'bgp-established',
      startedAt: '2026-07-01T14:30:00Z',
      model: 'fixed-rate',
    },
    createdAt: '2026-07-01T14:00:00Z',
    updatedAt: '2026-07-01T14:30:00Z',
  },
  {
    id: 'lmcc-002',
    awsAccountId: '987654321098',
    metro: LMCC_METROS[0], // San Jose (second demo connection, different account)
    status: 'negotiating',
    provisioningStatus: 'negotiating',
    contractType: 'trial',
    bandwidth: 1000,
    transport: 'mpls',
    paths: [
      {
        id: 'path-5',
        ipeId: 'MX304-SJ-E',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-def001',
        vlanId: 2001,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/2',
        status: 'pending',
      },
      {
        id: 'path-6',
        ipeId: 'MX304-SJ-F',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-def002',
        vlanId: 2002,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/3',
        status: 'pending',
      },
      {
        id: 'path-7',
        ipeId: 'MX304-SJ-G',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-def003',
        vlanId: 2003,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/2',
        status: 'pending',
      },
      {
        id: 'path-8',
        ipeId: 'MX304-SJ-H',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-def004',
        vlanId: 2004,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/3',
        status: 'pending',
      },
    ],
    bgp: {
      partnerASN: 7018,
      customerASN: 65100,
    },
    bfd: { interval: 300, multiplier: 3 },
    billing: {
      trigger: 'bgp-established',
      model: 'fixed-rate',
    },
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
];
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1 | head -60
```

Expected: errors only in the four LMCC component files that still reference old types. Zero errors in service/types files.

- [ ] **Step 3: Commit**

```bash
git add src/data/lmccService.ts
git commit -m "fix(lmcc): correct metros, GA date, bandwidth tiers, LA fiber status"
```

---

## Task 3: Build Flow 03 — Create Intent & Generate Key (AT&T-first)

**Files:**
- Create: `src/components/connection/lmcc/LMCCCreateFlow.tsx`

This is the entirely-missing AT&T-first path. Customer selects location (API-driven), bandwidth (API-driven), enters 12-digit AWS account ID, confirms, and gets an ActivationKey to carry to AWS.

- [ ] **Step 1: Create the component**

```typescript
// src/components/connection/lmcc/LMCCCreateFlow.tsx
import { useState } from 'react';
import { Copy, Check, ArrowRight, MapPin, Zap, Hash, AlertCircle, ExternalLink, Key } from 'lucide-react';
import { Button } from '../../common/Button';
import {
  LMCCFlow03Intent,
  LMCCActivationKey,
  LMCCMetro,
} from '../../../types/lmcc';
import {
  getAvailableMetros,
  getBandwidthOptions,
  formatBandwidth,
  isValidAwsAccountId,
  CURRENT_PHASE,
} from '../../../data/lmccService';

interface LMCCCreateFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyGenerated?: (key: LMCCActivationKey) => void;
}

type Step = 'location' | 'bandwidth' | 'account' | 'confirm' | 'key-ready';

function generateMockKey(intent: LMCCFlow03Intent): LMCCActivationKey {
  const uuid = `lmcc-${Math.random().toString(36).slice(2, 10)}`;
  const raw = btoa(JSON.stringify({
    sharedConnectionUuid: uuid,
    connectionSizeMbps: intent.bandwidthMbps,
    destinationAccountId: intent.awsAccountId,
    destinationEnvironmentUri: `att://environments/${intent.metroId}`,
    version: 1,
  }));
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    raw,
    sharedConnectionUuid: uuid,
    connectionSizeMbps: intent.bandwidthMbps,
    destinationAccountId: intent.awsAccountId,
    destinationEnvironmentUri: `att://environments/${intent.metroId}`,
    expiresAt: expires.toISOString(),
    generatedAt: now.toISOString(),
  };
}

export function LMCCCreateFlow({ isOpen, onClose, onKeyGenerated }: LMCCCreateFlowProps) {
  const [step, setStep] = useState<Step>('location');
  const [intent, setIntent] = useState<Partial<LMCCFlow03Intent>>({});
  const [generatedKey, setGeneratedKey] = useState<LMCCActivationKey | null>(null);
  const [copied, setCopied] = useState(false);

  const availableMetros = getAvailableMetros(CURRENT_PHASE);
  const bandwidthOptions = getBandwidthOptions(CURRENT_PHASE);
  const selectedMetro = availableMetros.find(m => m.id === intent.metroId);

  if (!isOpen) return null;

  function handleConfirm() {
    if (!intent.metroId || !intent.bandwidthMbps || !intent.awsAccountId) return;
    const key = generateMockKey(intent as LMCCFlow03Intent);
    setGeneratedKey(key);
    setStep('key-ready');
    onKeyGenerated?.(key);
  }

  function handleCopy() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setStep('location');
    setIntent({});
    setGeneratedKey(null);
    onClose();
  }

  const STEPS: Step[] = ['location', 'bandwidth', 'account', 'confirm'];
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={handleClose}>
      <div className="bg-fw-base rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 bg-fw-wash border-b border-fw-secondary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fw-primary/10 border border-fw-primary/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-fw-primary" />
            </div>
            <div>
              <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">New AWS Connection</h2>
              <p className="text-figma-xs text-fw-bodyLight">AT&T NetBond Advanced Max — Connection Coordinator</p>
            </div>
          </div>

          {/* Step progress — only show during wizard, not key-ready */}
          {step !== 'key-ready' && (
            <div className="flex items-center gap-1 mt-4">
              {(['location', 'bandwidth', 'account', 'confirm'] as Step[]).map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-fw-primary' : 'bg-fw-secondary'}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step: Location */}
        {step === 'location' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-base font-semibold text-fw-heading">Select Location</h3>
              <span className="text-figma-xs text-fw-bodyLight">(from live API)</span>
            </div>
            <p className="text-figma-xs text-fw-body">
              Choose the metro where your AWS connection will be established. AT&T infrastructure at this location connects directly to AWS.
            </p>
            <div className="space-y-2">
              {availableMetros.map(metro => (
                <button
                  key={metro.id}
                  onClick={() => setIntent(prev => ({ ...prev, metroId: metro.id }))}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                    intent.metroId === metro.id
                      ? 'border-fw-active bg-fw-accent'
                      : 'border-fw-secondary hover:border-fw-active/50 bg-fw-base'
                  }`}
                >
                  <p className="text-figma-sm font-semibold text-fw-heading">{metro.name}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">{metro.awsRegionLabel} · {metro.facilities.join(' & ')}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Bandwidth */}
        {step === 'bandwidth' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-base font-semibold text-fw-heading">Select Bandwidth</h3>
              <span className="text-figma-xs text-fw-bodyLight">(from live API)</span>
            </div>
            <p className="text-figma-xs text-fw-body">
              Bandwidth applies to all 4 connection paths. AT&T provisions 4 independent paths at this bandwidth for maximum resiliency.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {bandwidthOptions.map(mbps => (
                <button
                  key={mbps}
                  onClick={() => setIntent(prev => ({ ...prev, bandwidthMbps: mbps }))}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    intent.bandwidthMbps === mbps
                      ? 'border-fw-active bg-fw-accent'
                      : 'border-fw-secondary hover:border-fw-active/50 bg-fw-base'
                  }`}
                >
                  <p className="text-figma-lg font-bold text-fw-heading">{formatBandwidth(mbps)}</p>
                  <p className="text-figma-xs text-fw-bodyLight">per path × 4</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: AWS Account ID */}
        {step === 'account' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-base font-semibold text-fw-heading">AWS Account ID</h3>
            </div>
            <p className="text-figma-xs text-fw-body">
              Enter the 12-digit AWS account ID for the account this connection will serve. Find it in AWS Console → Account settings.
            </p>
            <div>
              <label className="block text-figma-xs font-medium text-fw-body mb-1.5">AWS Account ID</label>
              <input
                type="text"
                value={intent.awsAccountId || ''}
                onChange={e => setIntent(prev => ({ ...prev, awsAccountId: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                placeholder="123456789012"
                maxLength={12}
                className={`w-full h-10 px-3 rounded-lg border text-figma-base font-mono focus:outline-none ${
                  intent.awsAccountId && !isValidAwsAccountId(intent.awsAccountId ?? '')
                    ? 'border-fw-error bg-fw-errorLight focus:border-fw-error'
                    : 'border-fw-secondary focus:border-fw-active'
                }`}
              />
              {intent.awsAccountId && !isValidAwsAccountId(intent.awsAccountId) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-fw-error" />
                  <p className="text-figma-xs text-fw-error">Must be exactly 12 digits</p>
                </div>
              )}
              {intent.awsAccountId && isValidAwsAccountId(intent.awsAccountId) && (
                <p className="text-figma-xs text-fw-success mt-1.5">Valid AWS account ID</p>
              )}
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="px-6 py-5 space-y-4">
            <h3 className="text-figma-base font-semibold text-fw-heading">Confirm & Generate Key</h3>
            <p className="text-figma-xs text-fw-body">
              Review your selections. On confirm, AT&T creates a pending connection record and generates your ActivationKey. This action is non-reversible — the connection record is created immediately.
            </p>
            <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary space-y-2.5 text-figma-xs">
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Location</span>
                <span className="font-semibold text-fw-heading">{selectedMetro?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Bandwidth (per path × 4)</span>
                <span className="font-semibold text-fw-heading">{formatBandwidth(intent.bandwidthMbps ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">AWS Account ID</span>
                <span className="font-semibold text-fw-heading font-mono">{intent.awsAccountId}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-fw-accent border border-fw-active/20">
              <AlertCircle className="h-4 w-4 text-fw-link shrink-0 mt-0.5" />
              <p className="text-figma-xs text-fw-body">
                After generating your key, take it to the AWS portal and submit it there. The key is valid for 7 days. AT&T will wait — nothing else happens until AWS picks up the key.
              </p>
            </div>
          </div>
        )}

        {/* Step: Key Ready */}
        {step === 'key-ready' && generatedKey && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-fw-successLight flex items-center justify-center">
                <Check className="w-4 h-4 text-fw-success" />
              </div>
              <h3 className="text-figma-base font-semibold text-fw-heading">Key Generated — Take to AWS</h3>
            </div>

            <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary space-y-3">
              <div>
                <p className="text-figma-xs font-medium text-fw-body mb-1.5">Your ActivationKey</p>
                <div className="flex items-start gap-2">
                  <code className="flex-1 text-[10px] font-mono text-fw-heading bg-fw-base border border-fw-secondary rounded-lg p-2 break-all leading-relaxed">
                    {generatedKey.raw}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 p-2 rounded-lg border transition-all ${
                      copied ? 'border-fw-success bg-fw-successLight text-fw-success' : 'border-fw-secondary hover:border-fw-active text-fw-bodyLight hover:text-fw-heading'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-figma-xs">
                <div><span className="text-fw-bodyLight">Expires</span><p className="font-medium text-fw-heading">{new Date(generatedKey.expiresAt).toLocaleDateString()} (7 days)</p></div>
                <div><span className="text-fw-bodyLight">Connection ID</span><p className="font-medium text-fw-heading font-mono">{generatedKey.sharedConnectionUuid}</p></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-fw-accent border border-fw-active/20 space-y-2">
              <p className="text-figma-xs font-semibold text-fw-heading">Next step: take this key to AWS</p>
              <ol className="text-figma-xs text-fw-body space-y-1 list-decimal list-inside">
                <li>Copy the key above</li>
                <li>Go to AWS Console → Direct Connect</li>
                <li>Select AT&T as your connection provider</li>
                <li>Paste the key when prompted</li>
              </ol>
            </div>

            <a
              href="https://console.aws.amazon.com/directconnect/v2/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-fw-active text-white rounded-xl hover:bg-fw-linkHover transition-colors font-medium text-figma-xs"
            >
              Open AWS Direct Connect Console
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
          {step === 'key-ready' ? (
            <div className="w-full flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>Done — Track Status</Button>
            </div>
          ) : (
            <>
              <button onClick={stepIndex > 0 ? () => setStep(STEPS[stepIndex - 1]) : handleClose}
                className="text-figma-base font-medium text-fw-bodyLight hover:text-fw-body">
                {stepIndex === 0 ? 'Cancel' : 'Back'}
              </button>
              {step === 'confirm' ? (
                <Button variant="primary" size="sm" onClick={handleConfirm}>
                  <Key className="w-4 h-4 mr-1" />
                  Generate Key
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setStep(STEPS[stepIndex + 1])}
                  disabled={
                    (step === 'location' && !intent.metroId) ||
                    (step === 'bandwidth' && !intent.bandwidthMbps) ||
                    (step === 'account' && !isValidAwsAccountId(intent.awsAccountId ?? ''))
                  }
                >
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1 | grep "LMCCCreateFlow" | head -20
```

Expected: zero errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/connection/lmcc/LMCCCreateFlow.tsx
git commit -m "feat(lmcc): add Flow 03 — Create Intent & Generate Key (AT&T-first path)"
```

---

## Task 4: Fix Flow 04 — LMCCKickoffModal

**Files:**
- Modify: `src/components/connection/lmcc/LMCCKickoffModal.tsx`

The modal must represent the AWS-first path correctly: customer arrived with a key FROM AWS and is pasting it here. Remove the "AT&T has provisioned your 4 hosted connections" framing. Remove the "accept in AWS Console" step.

- [ ] **Step 1: Rewrite LMCCKickoffModal.tsx**

```typescript
import { useState } from 'react';
import { ArrowRight, Key, AlertCircle, Check, ExternalLink } from 'lucide-react';
import { Button } from '../../common/Button';
import { LMCCKeyUploadError } from '../../../types/lmcc';

interface LMCCKickoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSetup: (activationKey: string) => void;
}

// Minimal validation: a real ActivationKey is base64 JSON with known fields.
// This checks format only — full validation happens via AWS API call.
function validateKeyFormat(raw: string): 'valid' | 'invalid-format' {
  if (!raw.trim() || raw.trim().length < 20) return 'invalid-format';
  try {
    const decoded = JSON.parse(atob(raw.trim()));
    if (!decoded.sharedConnectionUuid || !decoded.connectionSizeMbps) return 'invalid-format';
    return 'valid';
  } catch {
    // Not valid base64 or not parseable JSON — invalid format
    return 'invalid-format';
  }
}

const ERROR_MESSAGES: Record<LMCCKeyUploadError, { title: string; body: string; action?: string }> = {
  'invalid-format': {
    title: 'Invalid key format',
    body: 'Check that you copied the complete key from AWS. The key should start with "ey" — it is base64-encoded.',
  },
  'not-recognised': {
    title: 'Key not recognised by AWS',
    body: 'AWS could not validate this key. It may have been cancelled. Return to the AWS portal and generate a new key.',
    action: 'Open AWS Direct Connect',
  },
  'already-used': {
    title: 'Key already used',
    body: 'This key has already activated a connection. Check your connection list — it may already be live.',
    action: 'View connections',
  },
  'expired': {
    title: 'Key expired',
    body: 'ActivationKeys are valid for 7 days. Return to the AWS portal and generate a new key.',
    action: 'Open AWS Direct Connect',
  },
  'wrong-account': {
    title: 'Account mismatch',
    body: 'This key was generated for a different AWS account. Confirm you are signed in with the correct account, or generate a new key.',
  },
};

export function LMCCKickoffModal({ isOpen, onClose, onStartSetup }: LMCCKickoffModalProps) {
  const [activationKey, setActivationKey] = useState('');
  const [keyError, setKeyError] = useState<LMCCKeyUploadError | null>(null);
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'error'>('idle');

  if (!isOpen) return null;

  function handleKeyChange(value: string) {
    setActivationKey(value);
    setKeyError(null);
    if (!value.trim()) { setValidationState('idle'); return; }
    const result = validateKeyFormat(value.trim());
    if (result === 'valid') {
      setValidationState('valid');
    } else {
      setValidationState('idle'); // only show error on submit attempt
    }
  }

  function handleSubmit() {
    const result = validateKeyFormat(activationKey.trim());
    if (result !== 'valid') {
      setKeyError('invalid-format');
      setValidationState('error');
      return;
    }
    // In production: call AWS ConfirmActivationKey here.
    // For demo: accept and proceed.
    onStartSetup(activationKey.trim());
  }

  const errorInfo = keyError ? ERROR_MESSAGES[keyError] : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-fw-base rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 bg-fw-wash border-b border-fw-secondary">
          <div className="flex items-center gap-3">
            <div className="w-12 h-8 rounded-lg bg-fw-base border border-fw-secondary flex items-center justify-center p-1">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Upload Activation Key</h2>
              <p className="text-figma-xs text-fw-bodyLight">AWS Direct Connect — Maximum Resiliency</p>
            </div>
          </div>
        </div>

        {/* Context */}
        <div className="px-6 py-4 border-b border-fw-secondary">
          <p className="text-figma-sm text-fw-body">
            You started from the AWS portal and received an ActivationKey. Paste it here — AT&T will validate it with AWS and begin provisioning automatically.
          </p>
          <a
            href="https://console.aws.amazon.com/directconnect/v2/home"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-figma-xs text-fw-link hover:text-fw-linkHover"
          >
            Don't have a key yet? Go to AWS Direct Connect
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Key upload */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-figma-xs font-medium text-fw-body mb-1.5">
              ActivationKey from AWS
            </label>
            <div className="relative">
              <textarea
                value={activationKey}
                onChange={e => handleKeyChange(e.target.value)}
                placeholder="Paste your key here — it starts with 'ey...'"
                rows={3}
                className={`w-full px-3 py-2.5 rounded-lg border text-figma-xs font-mono focus:outline-none resize-none ${
                  validationState === 'error'
                    ? 'border-fw-error bg-fw-errorLight focus:border-fw-error'
                    : validationState === 'valid'
                    ? 'border-fw-success focus:border-fw-success'
                    : 'border-fw-secondary focus:border-fw-active'
                }`}
              />
              {validationState === 'valid' && (
                <Check className="absolute right-3 top-3 h-4 w-4 text-fw-success" />
              )}
            </div>
          </div>

          {/* Error state */}
          {errorInfo && (
            <div className="p-3 rounded-lg bg-fw-errorLight border border-fw-error/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-fw-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-figma-xs font-semibold text-fw-error">{errorInfo.title}</p>
                  <p className="text-figma-xs text-fw-error/80 mt-0.5">{errorInfo.body}</p>
                  {errorInfo.action && (
                    <a
                      href="https://console.aws.amazon.com/directconnect/v2/home"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-figma-xs text-fw-error font-medium hover:underline"
                    >
                      {errorInfo.action} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="p-3 rounded-lg bg-fw-accent border border-fw-active/20">
            <p className="text-figma-xs font-semibold text-fw-heading mb-1.5">What happens after you submit</p>
            <ol className="text-figma-xs text-fw-body space-y-1 list-decimal list-inside">
              <li>AT&T validates your key with AWS</li>
              <li>AT&T and AWS automatically negotiate connection parameters</li>
              <li>BGP sessions come up across all 4 paths</li>
              <li>You receive an email + portal notification when live</li>
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
          <button onClick={onClose} className="text-figma-base font-medium text-fw-bodyLight hover:text-fw-body">
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!activationKey.trim()}
          >
            <Key className="w-4 h-4 mr-1" />
            Upload Key & Activate
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1 | grep "LMCCKickoffModal" | head -10
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/connection/lmcc/LMCCKickoffModal.tsx
git commit -m "fix(lmcc): reframe kickoff modal as Flow 04 key upload — key from AWS, not AT&T"
```

---

## Task 5: Fix OnboardingDrawer — remove customer BGP config

**Files:**
- Modify: `src/components/connection/lmcc/LMCCOnboardingDrawer.tsx`

The drawer currently asks customers to configure BGP ASN, VIF type, MD5 key, and path preference. Per PRD: "AT&T and AWS are automatically agreeing the L3 configuration for all 4 channels. Customer does nothing." Remove those steps. Replace with: status display + billing acknowledgment.

- [ ] **Step 1: Rewrite LMCCOnboardingDrawer.tsx**

```typescript
import { useState } from 'react';
import { CheckCircle2, Clock, Activity, DollarSign, Shield } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { LMCCConnection, ConnectionProvisioningStatus } from '../../../types/lmcc';
import { formatBandwidth } from '../../../data/lmccService';

interface LMCCOnboardingDrawerProps {
  connection: LMCCConnection;
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const PROVISIONING_STAGES: { status: ConnectionProvisioningStatus; label: string; description: string }[] = [
  {
    status: 'key-accepted',
    label: 'Key Accepted',
    description: 'AWS received and validated your key. Negotiation starting.',
  },
  {
    status: 'negotiating',
    label: 'Negotiating Parameters',
    description: 'AT&T and AWS are automatically configuring all 4 channels. No action needed.',
  },
  {
    status: 'bgp-forming',
    label: 'BGP Forming',
    description: 'Technical parameters agreed. BGP sessions coming up on AT&T hardware.',
  },
  {
    status: 'live',
    label: 'Live',
    description: 'Both AT&T and AWS confirmed. Traffic can flow.',
  },
];

const STATUS_ORDER: ConnectionProvisioningStatus[] = [
  'key-generated', 'key-accepted', 'negotiating', 'bgp-forming', 'live',
];

function getStageIndex(status: ConnectionProvisioningStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export function LMCCOnboardingDrawer({
  connection, isOpen, onClose, onActivate,
}: LMCCOnboardingDrawerProps) {
  const [billingAcknowledged, setBillingAcknowledged] = useState(false);

  const currentStatus = connection.provisioningStatus ?? 'key-accepted';
  const currentIndex = getStageIndex(currentStatus);
  const isLive = currentStatus === 'live';

  const perPathCost = 1249;
  const monthlyCost = perPathCost * 4;

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title="Connection Setup" width="lg">
      <div className="space-y-6">

        {/* AWS branding */}
        <div className="flex items-center gap-3 pb-3 border-b border-fw-secondary">
          <div className="w-10 h-7 rounded-lg bg-fw-base border border-fw-secondary flex items-center justify-center p-1">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-figma-base font-semibold text-fw-heading">AWS Direct Connect — Maximum Resiliency</p>
            <p className="text-figma-xs text-fw-bodyLight">AT&T NetBond Advanced Max · {connection.metro.name}</p>
          </div>
        </div>

        {/* Connection summary */}
        <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-fw-link" />
            <span className="text-figma-sm font-semibold text-fw-heading">Connection Details</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-figma-xs">
            <div><span className="text-fw-bodyLight">AWS Account</span><p className="font-medium text-fw-heading font-mono">{connection.awsAccountId}</p></div>
            <div><span className="text-fw-bodyLight">Metro</span><p className="font-medium text-fw-heading">{connection.metro.name}</p></div>
            <div><span className="text-fw-bodyLight">Bandwidth</span><p className="font-medium text-fw-heading">{formatBandwidth(connection.bandwidth)} × 4 paths</p></div>
            <div><span className="text-fw-bodyLight">Transport</span><p className="font-medium text-fw-heading">{connection.transport.toUpperCase()}</p></div>
          </div>
        </div>

        {/* 5-stage status progression */}
        <div>
          <p className="text-figma-xs font-semibold text-fw-heading mb-3">Provisioning Status</p>
          <div className="space-y-2">
            {PROVISIONING_STAGES.map((stage) => {
              const stageIndex = getStageIndex(stage.status);
              const isDone = stageIndex < currentIndex || isLive;
              const isActive = stage.status === currentStatus && !isLive;

              return (
                <div
                  key={stage.status}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isDone ? 'border-fw-success/30 bg-fw-successLight/20' :
                    isActive ? 'border-fw-active/30 bg-fw-accent' :
                    'border-fw-secondary'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-fw-success" />
                    ) : isActive ? (
                      <Clock className="h-4 w-4 text-fw-link animate-pulse" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-fw-secondary" />
                    )}
                  </div>
                  <div>
                    <p className={`text-figma-xs font-semibold ${isDone ? 'text-fw-success' : isActive ? 'text-fw-link' : 'text-fw-bodyLight'}`}>
                      {stage.label}
                    </p>
                    <p className="text-figma-xs text-fw-bodyLight mt-0.5">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing */}
        <div className="p-4 rounded-xl border-2 border-fw-active/30 bg-fw-accent">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-fw-link" />
            <span className="text-figma-base font-semibold text-fw-heading">Billing</span>
          </div>
          <div className="space-y-1.5 text-figma-xs">
            <div className="flex justify-between">
              <span className="text-fw-bodyLight">{formatBandwidth(connection.bandwidth)} × 4 paths</span>
              <span className="font-medium text-fw-heading">${monthlyCost.toLocaleString()}.00/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fw-bodyLight">MPLS Transport</span>
              <span className="font-medium text-fw-heading">Included</span>
            </div>
            <div className="pt-2 border-t border-fw-active/20 flex justify-between">
              <span className="font-semibold text-fw-heading">Estimated Monthly</span>
              <span className="font-bold text-fw-link">${monthlyCost.toLocaleString()}.00</span>
            </div>
          </div>
          <p className="text-figma-xs text-fw-bodyLight mt-2">
            Billing starts when BGP reaches Established across all 4 paths. Estimated pricing — contact AT&T sales for final rates.
          </p>
        </div>

        {/* Billing acknowledgment */}
        <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-fw-secondary hover:border-fw-active/50 cursor-pointer">
          <input
            type="checkbox"
            checked={billingAcknowledged}
            onChange={e => setBillingAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-fw-secondary text-fw-link focus:ring-fw-active"
          />
          <p className="text-figma-xs text-fw-body">
            I understand that billing begins when BGP sessions establish across all 4 paths. Preview phase uses fixed-rate billing. GA (November 16, 2026) transitions to 95th percentile burstable billing.
          </p>
        </label>

        {/* CTA */}
        <div className="pt-2 border-t border-fw-secondary flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onActivate}
            disabled={!billingAcknowledged}
          >
            <Activity className="w-4 h-4 mr-1" />
            {isLive ? 'View Live Connection' : 'Acknowledge & Track'}
          </Button>
        </div>
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1 | grep "LMCCOnboardingDrawer" | head -10
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/connection/lmcc/LMCCOnboardingDrawer.tsx
git commit -m "fix(lmcc): remove customer BGP/VIF config — L3 is fully automated per PRD"
```

---

## Task 6: Fix StatusPanel — 5-stage progression display

**Files:**
- Modify: `src/components/connection/lmcc/LMCCStatusPanel.tsx`

Update the status badge and header to use the PRD's 5-stage status labels. Keep the 4-path health diagram intact.

- [ ] **Step 1: Update status badge and provisioning display**

Replace only the `getConnectionStatusBadge` function and the status header area. Keep the 4-path grid and BGP summary unchanged.

In `LMCCStatusPanel.tsx`, replace lines 36–56 (the `getConnectionStatusBadge` function):

```typescript
function getConnectionStatusBadge(status: LMCCConnection['status']) {
  const map: Record<LMCCConnection['status'], { label: string; className: string }> = {
    'key-generated':  { label: 'Key Generated',         className: 'bg-fw-accent text-fw-link' },
    'key-accepted':   { label: 'Key Accepted',           className: 'bg-fw-accent text-fw-link' },
    'negotiating':    { label: 'Negotiating Parameters', className: 'bg-fw-accent text-fw-link animate-pulse' },
    'bgp-forming':    { label: 'BGP Forming',            className: 'bg-fw-accent text-fw-link animate-pulse' },
    'live':           { label: 'Live',                   className: 'bg-fw-successLight text-fw-success' },
    'degraded':       { label: 'Degraded',               className: 'bg-fw-errorLight text-fw-error' },
    'disconnected':   { label: 'Disconnected',           className: 'bg-fw-errorLight text-fw-error' },
  };
  const { label, className } = map[status] ?? { label: status, className: 'bg-fw-secondary text-fw-bodyLight' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1 | grep "LMCCStatusPanel" | head -10
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/connection/lmcc/LMCCStatusPanel.tsx
git commit -m "fix(lmcc): map status panel to PRD 5-stage provisioning progression"
```

---

## Task 7: Rebuild WorkflowVisualization

**Files:**
- Modify: `src/components/connection/lmcc/LMCCWorkflowVisualization.tsx`

Rebuild to show the correct dual-flow diagram based on the Connection Coordinator API model. Two tabs: Flow 03 (AT&T-first) and Flow 04 (AWS-first). Both converge at the same status screen. Fix all broken state variable references.

- [ ] **Step 1: Rewrite LMCCWorkflowVisualization.tsx**

```typescript
import { useState } from 'react';
import { Key, ArrowRight, CheckCircle, Clock, Cloud, Building2, Zap, ArrowDown } from 'lucide-react';

type Flow = '03' | '04';

interface FlowStep {
  id: string;
  actor: 'customer' | 'att' | 'aws' | 'both';
  location: 'att-portal' | 'aws-portal' | 'backend';
  title: string;
  description: string;
  isConvergence?: boolean;
}

const FLOW_03_STEPS: FlowStep[] = [
  {
    id: 'f03-1',
    actor: 'customer',
    location: 'att-portal',
    title: 'Select location, bandwidth, AWS account ID',
    description: 'Three choices. Everything else is automated.',
  },
  {
    id: 'f03-2',
    actor: 'att',
    location: 'backend',
    title: 'AT&T creates pending connection record',
    description: 'Generates ActivationKey (base64, valid 7 days). No provisioning yet.',
  },
  {
    id: 'f03-3',
    actor: 'customer',
    location: 'att-portal',
    title: 'Customer receives ActivationKey',
    description: 'Copy-to-clipboard. Instruction: take this key to AWS portal.',
  },
  {
    id: 'f03-4',
    actor: 'customer',
    location: 'aws-portal',
    title: 'Customer pastes key at AWS portal',
    description: 'Portal swivel — manual step. Automated in Post-GA (Epic 8).',
  },
  {
    id: 'f03-5',
    actor: 'aws',
    location: 'backend',
    title: 'AWS calls ConfirmActivationKey on AT&T',
    description: 'AT&T confirms key valid. Validity check only — not a provisioning trigger.',
  },
  {
    id: 'f03-6',
    actor: 'aws',
    location: 'backend',
    title: 'AWS drives negotiation (Active Provider)',
    description: 'AWS calls CreateConnection → GenerateFeatureGuidance → CreateFeature ×4. AT&T responds automatically.',
    isConvergence: true,
  },
];

const FLOW_04_STEPS: FlowStep[] = [
  {
    id: 'f04-1',
    actor: 'customer',
    location: 'aws-portal',
    title: 'Customer creates connection at AWS portal',
    description: 'Receives ActivationKey from AWS.',
  },
  {
    id: 'f04-2',
    actor: 'customer',
    location: 'att-portal',
    title: 'Customer pastes key at AT&T NetBond portal',
    description: 'Portal swivel — manual step. Automated in Post-GA (Epic 8).',
  },
  {
    id: 'f04-3',
    actor: 'att',
    location: 'backend',
    title: 'AT&T calls ConfirmActivationKey on AWS',
    description: 'AT&T verifies key is real and unused. A keyValid: false result is a security event.',
  },
  {
    id: 'f04-4',
    actor: 'att',
    location: 'backend',
    title: 'AT&T drives negotiation (Active Provider)',
    description: 'AT&T calls CreateConnection → GenerateFeatureGuidance → CreateFeature ×4 on AWS. (Or defers to AWS via deferProvisioning.)',
    isConvergence: true,
  },
];

const SHARED_STEPS: FlowStep[] = [
  {
    id: 'shared-1',
    actor: 'both',
    location: 'backend',
    title: 'Feature negotiation: L3 auto-configured',
    description: 'BGP ASN, VLAN IDs, IP subnets, MTU agreed automatically across all 4 channels. Customer does nothing.',
  },
  {
    id: 'shared-2',
    actor: 'both',
    location: 'backend',
    title: 'BGP sessions form on all 4 paths',
    description: 'Both providers provision hardware independently. NotifyConnectionStatus sent and received.',
  },
  {
    id: 'shared-3',
    actor: 'customer',
    location: 'att-portal',
    title: 'Connection Live — billing starts',
    description: 'Email + portal notification sent. Billing trigger: BGP Established. Connection visible in portal.',
  },
];

const ACTOR_COLORS: Record<FlowStep['actor'], string> = {
  customer: 'bg-fw-accent border-fw-active/40 text-fw-link',
  att:      'bg-fw-wash border-fw-secondary text-fw-body',
  aws:      'bg-orange-50 border-orange-200 text-orange-700',
  both:     'bg-fw-successLight border-fw-success/30 text-fw-success',
};

const ACTOR_LABELS: Record<FlowStep['actor'], string> = {
  customer: 'Customer action',
  att:      'AT&T (automated)',
  aws:      'AWS (automated)',
  both:     'Both providers',
};

const LOCATION_ICONS: Record<FlowStep['location'], React.ComponentType<{ className?: string }>> = {
  'att-portal': Building2,
  'aws-portal': Cloud,
  'backend':    Zap,
};

function StepCard({ step }: { step: FlowStep }) {
  const Icon = LOCATION_ICONS[step.location];
  return (
    <div className={`p-3 rounded-xl border ${ACTOR_COLORS[step.actor]} ${step.isConvergence ? 'ring-2 ring-fw-success/40' : ''}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
        <div>
          <p className="text-figma-xs font-semibold leading-tight">{step.title}</p>
          <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{step.description}</p>
        </div>
      </div>
      <p className="text-[9px] mt-1.5 opacity-50 font-medium uppercase tracking-wide">{ACTOR_LABELS[step.actor]}</p>
    </div>
  );
}

export default function LMCCWorkflowVisualization() {
  const [activeFlow, setActiveFlow] = useState<Flow>('03');

  const flowSteps = activeFlow === '03' ? FLOW_03_STEPS : FLOW_04_STEPS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-fw-secondary pb-4">
        <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.02em]">Connection Coordinator API — Two Entry Flows</h2>
        <p className="text-figma-sm text-fw-bodyLight mt-1">
          Both flows use the same portal. They differ in who generates the ActivationKey. Both converge at the same automated provisioning engine.
        </p>
      </div>

      {/* Flow selector */}
      <div className="flex gap-2">
        {(['03', '04'] as Flow[]).map(flow => (
          <button
            key={flow}
            onClick={() => setActiveFlow(flow)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
              activeFlow === flow
                ? 'border-fw-active bg-fw-accent'
                : 'border-fw-secondary hover:border-fw-active/40'
            }`}
          >
            <p className="text-figma-xs font-bold text-fw-heading">
              {flow === '03' ? 'Flow 03 — AT&T First' : 'Flow 04 — AWS First'}
            </p>
            <p className="text-[10px] text-fw-bodyLight mt-0.5">
              {flow === '03'
                ? 'Start at NetBond → generate key → take to AWS'
                : 'Start at AWS → receive key → upload at NetBond'}
            </p>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ACTOR_LABELS).map(([actor, label]) => (
          <span key={actor} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-medium ${ACTOR_COLORS[actor as FlowStep['actor']]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Flow-specific steps */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wide">
          {activeFlow === '03' ? 'AT&T-First Entry Path' : 'AWS-First Entry Path'}
        </p>
        {flowSteps.map((step, i) => (
          <div key={step.id}>
            <StepCard step={step} />
            {i < flowSteps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-3.5 w-3.5 text-fw-bodyLight opacity-40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Convergence divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-fw-success/30" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-fw-successLight border border-fw-success/30 rounded-full">
          <CheckCircle className="h-3.5 w-3.5 text-fw-success" />
          <span className="text-[10px] font-semibold text-fw-success">Flows converge — same engine from here</span>
        </div>
        <div className="flex-1 h-px bg-fw-success/30" />
      </div>

      {/* Shared steps */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wide">Both Flows — Automated from this point</p>
        {SHARED_STEPS.map((step, i) => (
          <div key={step.id}>
            <StepCard step={step} />
            {i < SHARED_STEPS.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-3.5 w-3.5 text-fw-bodyLight opacity-40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Key notes */}
      <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary space-y-2">
        <p className="text-figma-xs font-semibold text-fw-heading">Key architectural notes</p>
        <ul className="space-y-1.5 text-figma-xs text-fw-body">
          <li className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Customer configures nothing beyond 3 choices.</strong> BGP ASN, VLAN IDs, IP subnets, and MTU are negotiated automatically by AT&T and AWS.</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Active Provider</strong> = the provider that receives the key and drives negotiation. In Flow 03, AWS is Active. In Flow 04, AT&T is Active (or defers via deferProvisioning).</span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Portal swivel eliminated at Post-GA</strong> (Epic 8). Preview and GA require manual key transfer between portals.</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Locations and bandwidth come from live API.</strong> No hardcoded values. When GA infrastructure goes live, new options appear automatically.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript — full clean pass**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npx tsc --noEmit 2>&1
```

Expected: zero errors across all LMCC files.

- [ ] **Step 3: Build check**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/jolly-cori-cbd301 && npm run build 2>&1 | tail -20
```

Expected: successful build, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/connection/lmcc/LMCCWorkflowVisualization.tsx
git commit -m "feat(lmcc): rebuild workflow visualization — correct dual-flow Connection Coordinator API model"
```

---

## Self-Review

**Spec coverage check:**

| PRD Requirement | Task |
|---|---|
| Flow 03: AT&T-first, 3-choice wizard, generate ActivationKey | Task 3 |
| Flow 04: AWS-first, key upload, correct key direction | Task 4 |
| No customer BGP/VIF/ASN config — fully automated | Task 5 |
| PRD 5-stage status: key-generated → key-accepted → negotiating → bgp-forming → live | Tasks 5, 6 |
| LA marked as fiber-pending, not available | Task 2 |
| GA date: November 16 | Task 2 |
| GA bandwidth tiers: 1/2/5/10/25/50/100 Gbps | Task 2 |
| Correct LA datacenter names (Equinix Los Angeles only) | Task 2 |
| ActivationKey direction: comes FROM AWS in Flow 04 | Task 4 |
| Error states for key upload (5 cases) | Task 4 (modal includes them) |
| Workflow visualization: correct Connection Coordinator API model | Task 7 |
| Fix broken state variable refs in WorkflowVisualization | Task 7 |

**Gaps not addressed in this plan (future work):**
- Privilege check gate component (PRD Section 4)
- Empty state for first-time users (PRD Section 7)
- Connection list / dashboard (PRD Section 7)
- Delete confirmation (PRD Section 7)
- Loading/skeleton states (PRD Section 7)
- Update bandwidth flow at GA (PRD Section 7 / Epic 7)

**Placeholder scan:** None found. All code is complete and non-speculative.

**Type consistency:** `LMCCConnection['status']` now includes `ConnectionProvisioningStatus` via union type. `getConnectionStatusBadge` in Task 6 covers all 7 states. `LMCCCreateFlow` uses `LMCCFlow03Intent` and `LMCCActivationKey` from Task 1. `LMCCKickoffModal` uses `LMCCKeyUploadError` from Task 1. `LMCCOnboardingDrawer` uses `ConnectionProvisioningStatus` from Task 1.
