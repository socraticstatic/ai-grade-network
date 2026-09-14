# VNF Catalog + Size Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder VNF template catalog with the 9 real vendor types from the product spec, and add a size-tier picker (XS/S/M/L/XL) with compute specs and monthly pricing to the Create VNF form.

**Architecture:** Three changes layered in order of dependency — (1) extend the `VNF` and `VNFTemplate` types, (2) build and test the `VNFSizePicker` component in isolation, (3) wire both into `VNFModal` by updating the template catalog data and adding the size picker to the config form with a price summary in the footer.

**Tech Stack:** React 18, TypeScript, Tailwind (design tokens via `fw-*` classes), Vitest + React Testing Library, Lucide icons.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/types/vnf.ts` | Add `VNFSize` type + `VNFSizeTier` interface; add `size?` field to `VNF` |
| Create | `src/components/connection/vnf/VNFSizePicker.tsx` | Pill selector + spec strip display |
| Create | `src/components/connection/vnf/VNFSizePicker.test.tsx` | Component unit tests |
| Modify | `src/components/connection/modals/VNFModal.tsx` | Replace `VNF_TEMPLATES`, add size state, render `VNFSizePicker`, update footer |

---

## Task 1: Add `VNFSize` type and size tier data to types

**Files:**
- Modify: `src/types/vnf.ts`

- [ ] **Step 1: Add `VNFSize` type and `VNFSizeTier` interface to `src/types/vnf.ts`**

Add immediately after the closing brace of `VNFInterface` (before end of file):

```typescript
export type VNFSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface VNFSizeTier {
  id: VNFSize;
  label: string;
  vcpuRange: string;
  ramRange: string;
  storageRange: string;
  monthlyPrice: number;
}

export const VNF_SIZE_TIERS: VNFSizeTier[] = [
  { id: 'xs', label: 'XS', vcpuRange: '1–2',  ramRange: '2–4 GB',   storageRange: '20–50 GB',   monthlyPrice: 250  },
  { id: 's',  label: 'S',  vcpuRange: '2–4',  ramRange: '4–8 GB',   storageRange: '50–100 GB',  monthlyPrice: 375  },
  { id: 'm',  label: 'M',  vcpuRange: '4–8',  ramRange: '8–16 GB',  storageRange: '100–200 GB', monthlyPrice: 560  },
  { id: 'l',  label: 'L',  vcpuRange: '8–16', ramRange: '16–32 GB', storageRange: '200–300 GB', monthlyPrice: 875  },
  { id: 'xl', label: 'XL', vcpuRange: '16–32',ramRange: '32–64 GB', storageRange: '300–500 GB', monthlyPrice: 1250 },
];
```

- [ ] **Step 2: Add `size` field to the `VNF` interface**

In `src/types/vnf.ts`, locate the `VNF` interface and add `size` after `throughput`:

```typescript
  throughput?: string;
  size?: VNFSize;          // <-- add this line
  licenseExpiry?: string;
```

- [ ] **Step 3: Remove `pricing` from `VNFTemplate`**

In `src/types/vnf.ts`, find `VNFTemplate` and delete the `pricing` block — pricing is now size-driven, not template-driven:

```typescript
// REMOVE these lines from VNFTemplate:
  pricing?: {
    monthly: number;
    annually: number;
  };
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add src/types/vnf.ts
git commit -m "feat(vnf): add VNFSize type, VNF_SIZE_TIERS constant, size field on VNF"
```

---

## Task 2: Build `VNFSizePicker` component (TDD)

**Files:**
- Create: `src/components/connection/vnf/VNFSizePicker.tsx`
- Create: `src/components/connection/vnf/VNFSizePicker.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/connection/vnf/VNFSizePicker.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { VNFSizePicker } from './VNFSizePicker';

describe('VNFSizePicker', () => {
  it('renders all five size labels', () => {
    render(<VNFSizePicker value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'XS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'XL' })).toBeInTheDocument();
  });

  it('calls onChange with the correct size id when a tier is clicked', () => {
    const onChange = vi.fn();
    render(<VNFSizePicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    expect(onChange).toHaveBeenCalledWith('m');
  });

  it('shows spec strip with vCPU, RAM, storage, and price for the selected tier', () => {
    render(<VNFSizePicker value="m" onChange={vi.fn()} />);
    expect(screen.getByText(/4–8 vCPU/)).toBeInTheDocument();
    expect(screen.getByText(/8–16 GB RAM/)).toBeInTheDocument();
    expect(screen.getByText(/100–200 GB/)).toBeInTheDocument();
    expect(screen.getByText(/\$560\/mo/)).toBeInTheDocument();
  });

  it('does not show spec strip when no size is selected', () => {
    render(<VNFSizePicker value={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/vCPU/)).not.toBeInTheDocument();
  });

  it('marks the selected tier button with aria-pressed true', () => {
    render(<VNFSizePicker value="l" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'L' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx vitest run src/components/connection/vnf/VNFSizePicker.test.tsx 2>&1 | tail -20
```

Expected: FAIL — `VNFSizePicker` not found.

- [ ] **Step 3: Implement `VNFSizePicker`**

Create `src/components/connection/vnf/VNFSizePicker.tsx`:

```typescript
import { VNFSize, VNF_SIZE_TIERS } from '../../../types/vnf';

interface VNFSizePickerProps {
  value: VNFSize | null;
  onChange: (size: VNFSize) => void;
}

export function VNFSizePicker({ value, onChange }: VNFSizePickerProps) {
  const selected = value ? VNF_SIZE_TIERS.find(t => t.id === value) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {VNF_SIZE_TIERS.map(tier => (
          <button
            key={tier.id}
            type="button"
            aria-pressed={value === tier.id}
            onClick={() => onChange(tier.id)}
            className={`
              flex-1 py-2 rounded-lg border text-figma-base font-medium transition-colors
              ${value === tier.id
                ? 'border-fw-active bg-fw-accent text-fw-linkHover ring-2 ring-fw-active/30'
                : 'border-fw-secondary text-fw-heading hover:border-fw-active hover:bg-fw-wash'
              }
            `}
          >
            {tier.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex items-center justify-between px-4 py-3 bg-fw-wash border border-fw-secondary rounded-lg text-figma-sm text-fw-body">
          <span>{selected.vcpuRange} vCPU</span>
          <span className="text-fw-bodyLight">·</span>
          <span>{selected.ramRange} RAM</span>
          <span className="text-fw-bodyLight">·</span>
          <span>{selected.storageRange} storage</span>
          <span className="ml-auto font-semibold text-fw-heading">${selected.monthlyPrice}/mo</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx vitest run src/components/connection/vnf/VNFSizePicker.test.tsx 2>&1 | tail -20
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/connection/vnf/VNFSizePicker.tsx src/components/connection/vnf/VNFSizePicker.test.tsx
git commit -m "feat(vnf): add VNFSizePicker component with spec strip and price display"
```

---

## Task 3: Update `VNFModal` — replace template catalog + wire size picker

**Files:**
- Modify: `src/components/connection/modals/VNFModal.tsx`

- [ ] **Step 1: Replace `VNF_TEMPLATES` constant**

In `VNFModal.tsx`, find `const VNF_TEMPLATES: VNFTemplate[] = [` and replace the entire array with:

```typescript
import { Shield, Globe, Network, Router, ServerCog } from 'lucide-react';
// (Router may not exist in lucide-react — use Network as fallback for router type)
```

Replace the `VNF_TEMPLATES` array (lines 34–140):

```typescript
const VNF_TEMPLATES: VNFTemplate[] = [
  {
    id: 'template-velocloud-sdwan',
    name: 'VeloCloud SD-WAN',
    description: 'Cloud-delivered SD-WAN for optimized application performance across sites',
    type: 'sdwan',
    vendor: 'VMware',
    model: 'VeloCloud',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'WAN2', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP'],
    },
    icon: Globe,
    recommendedUseCase: 'Multi-site connectivity, bandwidth optimization',
    licenseRequired: true,
  },
  {
    id: 'template-cisco-sdwan',
    name: 'Cisco SD-WAN',
    description: 'Enterprise SD-WAN built on Viptela for secure, scalable branch connectivity',
    type: 'sdwan',
    vendor: 'Cisco',
    model: 'Viptela',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
    },
    icon: Globe,
    recommendedUseCase: 'Branch office, secure cloud on-ramp',
    licenseRequired: true,
  },
  {
    id: 'template-hpe-sdwan',
    name: 'HPE EdgeConnect SD-WAN',
    description: 'Application-aware SD-WAN with built-in WAN optimization',
    type: 'sdwan',
    vendor: 'HPE',
    model: 'EdgeConnect',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP'],
    },
    icon: Globe,
    recommendedUseCase: 'WAN optimization, hybrid cloud access',
    licenseRequired: true,
  },
  {
    id: 'template-palo-alto-fw',
    name: 'Palo Alto FW',
    description: 'Next-generation firewall with advanced threat prevention',
    type: 'firewall',
    vendor: 'Palo Alto Networks',
    model: 'VM-Series',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
        { name: 'MGMT', type: 'management', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
      highAvailability: true,
    },
    icon: Shield,
    recommendedUseCase: 'Perimeter security, secure cloud access',
    licenseRequired: true,
  },
  {
    id: 'template-fortinet-fw',
    name: 'Fortinet FW',
    description: 'High-performance virtual firewall with integrated security fabric',
    type: 'firewall',
    vendor: 'Fortinet',
    model: 'FortiGate-VM',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'port1', type: 'wan', status: 'up' },
        { name: 'port2', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
    },
    icon: Shield,
    recommendedUseCase: 'Network security, threat intelligence',
    licenseRequired: true,
  },
  {
    id: 'template-cisco-vrouter',
    name: 'Cisco vRouter',
    description: 'Virtual router for flexible enterprise routing and multi-cloud connectivity',
    type: 'router',
    vendor: 'Cisco',
    model: 'CSR 1000v',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'GigabitEthernet0/0', type: 'wan', status: 'up' },
        { name: 'GigabitEthernet0/1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF', 'EIGRP'],
    },
    icon: Network,
    recommendedUseCase: 'Enterprise routing, branch connectivity',
    licenseRequired: true,
  },
  {
    id: 'template-juniper-srvx',
    name: 'Juniper sRVX',
    description: 'Virtualized SRX-series firewall and router with advanced routing',
    type: 'router',
    vendor: 'Juniper',
    model: 'SRX Series',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'ge-0/0/0', type: 'wan', status: 'up' },
        { name: 'ge-0/0/1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
    },
    icon: Network,
    recommendedUseCase: 'Carrier-grade routing, security services',
    licenseRequired: true,
  },
  {
    id: 'template-f5-bigip',
    name: 'F5 BIG-IP PE',
    description: 'Advanced load balancer and application delivery controller',
    type: 'load_balancer',
    vendor: 'F5',
    model: 'BIG-IP',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'mgmt', type: 'management', status: 'up' },
        { name: 'external', type: 'wan', status: 'up' },
        { name: 'internal', type: 'lan', status: 'up' },
      ],
    },
    icon: ServerCog,
    recommendedUseCase: 'Application delivery, SSL offload, load balancing',
    licenseRequired: true,
  },
  {
    id: 'template-ubuntu',
    name: 'Ubuntu (Custom)',
    description: 'Bring your own image — Ubuntu Server base for custom network functions',
    type: 'custom',
    vendor: 'Canonical',
    model: 'Ubuntu Server',
    throughput: 'Size-dependent',
    defaultConfiguration: {},
    icon: ServerCog,
    recommendedUseCase: 'Custom network functions, specialized appliances',
    licenseRequired: false,
  },
];
```

- [ ] **Step 2: Add size state to VNFModal**

In `VNFModal.tsx`, find the block starting `// Template selection` (around line 189) and add size state next to it:

```typescript
  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(!isEditMode);

  // Size selection
  const [selectedSize, setSelectedSize] = useState<VNFSize | null>(null);
```

Also add `VNFSize` to the imports from `../../../types/vnf`:

```typescript
import { VNF, VNFType, VNFInterface, VNFTemplate, VNFSize } from '../../../types/vnf';
```

- [ ] **Step 3: Reset size in `resetForm()`**

Find `resetForm()` and add `setSelectedSize(null)` at the end:

```typescript
  const resetForm = () => {
    setName('');
    setType('custom');
    setVendor('');
    setModel('');
    setVersion('');
    setStatus('inactive');
    setThroughput('');
    setLicenseExpiry('');
    setDescription('');
    setInterfaces([]);
    setHighAvailability(false);
    setManagementIP('');
    setRoutingProtocols([]);
    setSelectedTemplate('');
    setLinkIds([]);
    setSelectedSize(null);   // <-- add this
  };
```

Also populate size in edit mode — find the `useEffect` that sets form fields from `vnf` and add after `setLinkIds(vnf.linkIds || [])`:

```typescript
      setLinkIds(vnf.linkIds || []);
      setSelectedSize((vnf as any).size ?? null);  // <-- add this
```

- [ ] **Step 4: Include size in submitted VNF data**

Find `handleSubmit` and the `vnfData` object. Add `size` alongside `throughput`:

```typescript
      throughput: throughput || undefined,
      size: selectedSize ?? undefined,
```

- [ ] **Step 5: Add `VNFSizePicker` to the config form**

In `VNFModal.tsx`, add the import at the top:

```typescript
import { VNFSizePicker } from '../vnf/VNFSizePicker';
```

In the config form JSX (inside `{/* Basic VNF Information */}` section), find the `<div className="col-span-2">` containing the `Connections` field and insert the size picker **before** it:

```tsx
                  {/* VNF Size */}
                  <div className="col-span-2">
                    <FormField
                      label="VNF Size"
                      required
                      helpText="Determines compute resources and monthly cost"
                    >
                      <VNFSizePicker value={selectedSize} onChange={setSelectedSize} />
                    </FormField>
                  </div>
```

- [ ] **Step 6: Update the drawer footer with price summary**

Find `drawerFooter` (around line 478) and replace it:

```tsx
  const selectedSizeTier = selectedSize
    ? VNF_SIZE_TIERS.find(t => t.id === selectedSize) ?? null
    : null;

  const drawerFooter = (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={handleBack}>
        {showTemplates ? 'Cancel' : 'Back'}
      </Button>

      {!showTemplates && selectedSizeTier && (
        <span className="text-figma-base text-fw-bodyLight">
          <span className="font-semibold text-fw-heading">${selectedSizeTier.monthlyPrice.toLocaleString()}</span>/mo
        </span>
      )}

      {!showTemplates && (
        <Button variant="primary" type="submit" form="vnf-form">
          {isEditMode ? 'Update VNF' : 'Create VNF'}
        </Button>
      )}
    </div>
  );
```

Also add `VNF_SIZE_TIERS` to the import from `../../../types/vnf`:

```typescript
import { VNF, VNFType, VNFInterface, VNFTemplate, VNFSize, VNF_SIZE_TIERS } from '../../../types/vnf';
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero new errors.

- [ ] **Step 8: Run all VNF tests**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx vitest run src/components/connection/vnf/ 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/connection/modals/VNFModal.tsx
git commit -m "feat(vnf): update catalog to 9 vendor templates, add VNFSizePicker to Create VNF form"
```

---

## Task 4: Smoke-test in the browser

- [ ] **Step 1: Start the dev server if not running**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npm run dev
```

- [ ] **Step 2: Navigate to the VNF form**

1. Open `http://localhost:5173`
2. Go to Manage → click "Multi-Cloud Production" (Azure/Cloud to Cloud — not an AWS connection)
3. Click the VNFs tab
4. Click "Add Network Function"

- [ ] **Step 3: Verify template picker**

Confirm the template grid shows exactly 9 items:
- VeloCloud SD-WAN, Cisco SD-WAN, HPE EdgeConnect SD-WAN
- Palo Alto FW, Fortinet FW
- Cisco vRouter, Juniper sRVX
- F5 BIG-IP PE, Ubuntu (Custom)

- [ ] **Step 4: Verify size picker in config form**

1. Click any template
2. Confirm the config form appears with a "VNF Size" field showing XS/S/M/L/XL pills
3. Click "M" — confirm spec strip appears: "4–8 vCPU · 8–16 GB RAM · 100–200 GB storage · $560/mo"
4. Confirm footer shows "$560/mo" between Back and Create VNF

- [ ] **Step 5: Commit if anything was adjusted**

```bash
git add -p
git commit -m "fix(vnf): <describe any adjustments from smoke test>"
```

---

## Self-Review

**Spec coverage:**
- ✅ 9 VNF types from catalog — all mapped to existing `VNFType` values
- ✅ XS/S/M/L/XL sizes with vCPU, RAM, Storage ranges
- ✅ Monthly pricing per tier
- ✅ Price visible in form footer when size is selected
- ✅ `VNFSize` persisted on the `VNF` object

**Gaps noted (not in scope, flag for follow-up):**
- "Ubuntu" as a base OS type is architecturally different from the others. This plan treats it as `type: 'custom'` — acceptable short-term but may need a separate "BYOI" (bring your own image) flow.
- Size is not validated as required in `validateForm()`. If size should block submission, add `if (!selectedSize) newErrors.size = 'Size is required'` to the validate function in `VNFModal.tsx`.
- Deleted connections still show in the Connections picker — pre-existing bug, out of scope here.

**Placeholder scan:** None found.

**Type consistency:** `VNFSize` used consistently across types file, VNFSizePicker props, and VNFModal state. `VNF_SIZE_TIERS` imported in both VNFSizePicker and VNFModal from the same source.
