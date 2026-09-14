# LMCC Restructure: VNF to Connection Product

## What Changed

The AT&T product brief confirms LMCC (Last Mile Cloud Connectivity) is NOT a VNF. It is AT&T's automated maximum resiliency interconnect product for AWS. LMCC IS the connection. It orchestrates 4 hosted connections across 4 IPEs (Juniper MX-304) in 2 diverse datacenters within 1 metro. The customer never configures it manually - AT&T's backend automation handles everything after the customer selects Maximum Resiliency + Metro + AT&T as partner in the AWS Console.

## Current State (All Wrong)

- `src/types/lmcc.ts` - Models LMCC as a VNF config with manual site/bandwidth/TAO selection
- `src/types/vnf.ts` - Includes `'lmcc'` in VNFType union
- `src/data/lmccService.ts` - Mock service with 15 metro sites, treats LMCC as configurable
- `src/components/connection/lmcc/LMCCConfigDrawer.tsx` - 4-step manual config wizard (WRONG)
- `src/components/connection/lmcc/SiteSelectionPanel.tsx` - Manual site selection (WRONG)
- `src/components/connection/lmcc/BandwidthAllocationPanel.tsx` - Manual bandwidth per site (WRONG)
- `src/components/connection/lmcc/TAOConfigurationPanel.tsx` - Manual TAO config (WRONG)
- `src/components/connection/lmcc/LMCCConfigSummary.tsx` - Config review (WRONG)
- `src/components/connection/lmcc/LMCCWorkflowVisualization.tsx` - Workflow diagram (KEEP - update to match product brief's 12-step flow)
- `src/components/connection/modals/VNFModal.tsx` - Has LMCC template and drawer integration
- `src/components/connection/ConnectionDetails.tsx` - Mock VNF entry vnf-3 as LMCC
- `src/components/connection/vnf/VNFTable.tsx` - LMCC badges

## Phase 1: New LMCC Types (replace src/types/lmcc.ts)

Rewrite `src/types/lmcc.ts` to model LMCC as a connection-level product:

```
LMCCConnection {
  id: string
  awsAccountId: string
  metro: LMCCMetro  // San Jose, LA, Ashburn
  status: 'pending-acceptance' | 'provisioning' | 'active' | 'degraded' | 'disconnected'
  contractType: 'trial' | 'monthly' | 'fixed-12' | 'fixed-24' | 'fixed-36'
  bandwidth: number  // Mbps - single value, same for all 4 paths
  paths: LMCCPath[4]  // Always exactly 4
  bgp: { partnerASN, customerASN, md5Key }
  bfd: { interval: 100, multiplier: 3 }  // 3x100ms for sub-second failover
  billing: { trigger: 'bgp-established', startedAt?, contractEndDate? }
  createdAt, updatedAt
}

LMCCPath {
  id: string
  ipeId: string  // Juniper MX-304 identifier
  datacenter: string  // e.g. "Equinix SV1"
  awsConnectionId: string  // AWS Direct Connect connection ID
  vlanId: number  // AWS-assigned
  bgpState: 'idle' | 'connect' | 'active' | 'open-sent' | 'open-confirm' | 'established'
  physicalPort: string  // 100G port identifier
  status: 'pending' | 'active' | 'down'
}

LMCCMetro {
  id: string
  name: string  // "San Jose, CA" | "Los Angeles, CA" | "Ashburn, VA"
  datacenters: string[]  // 2 per metro
  facilities: string[]  // "Equinix" | "CoreSite"
  phase: 'preview' | 'ga'
}
```

## Phase 2: Remove LMCC from VNF System

1. **src/types/vnf.ts** - Remove `'lmcc'` from VNFType union
2. **src/components/connection/modals/VNFModal.tsx** - Remove:
   - LMCCConfigDrawer import
   - LMCCConfiguration type import
   - `case 'lmcc'` in getTypeName
   - LMCC template from VNF_TEMPLATES
   - LMCC config state and drawer integration
   - LMCC Configuration section in UI
3. **src/components/connection/ConnectionDetails.tsx** - Remove vnf-3 (Enterprise LMCC) from mock VNFs
4. **src/components/connection/vnf/VNFTable.tsx** - Remove LMCC-specific badges and styling

## Phase 3: Delete Obsolete LMCC Components

Delete these files (all model LMCC as manual VNF config):
- `src/components/connection/lmcc/LMCCConfigDrawer.tsx`
- `src/components/connection/lmcc/SiteSelectionPanel.tsx`
- `src/components/connection/lmcc/BandwidthAllocationPanel.tsx`
- `src/components/connection/lmcc/TAOConfigurationPanel.tsx`
- `src/components/connection/lmcc/LMCCConfigSummary.tsx`

Keep and update:
- `src/components/connection/lmcc/LMCCWorkflowVisualization.tsx` - Update to match product brief's 12-step flow

## Phase 4: New LMCC Data Layer

Replace `src/data/lmccService.ts` with data matching product brief:

- Available metros (Preview: San Jose + LA. GA: + Ashburn)
- Fixed bandwidth options per phase (Preview: 1 Gbps only. GA: 50 Mbps to 100 Gbps)
- Contract terms per phase (Preview: trial only. GA: M2M, 12, 24, 36 month)
- Transport: Preview MPLS only, GA adds Internet
- Mock LMCCConnection instances for demo

## Phase 5: LMCC Status Component

New `src/components/connection/lmcc/LMCCStatusPanel.tsx`:
- 4-path health diagram (4 boxes, each showing IPE + datacenter + BGP state + VLAN)
- Metro label at top
- Contract info (type, end date, bandwidth)
- Speed change workflow note: "AWS does not support dynamic speed change. To change: provision 4 new at new speed, customer accepts, delete 4 legacy."
- Billing status (BGP trigger, start/stop times)

## Phase 6: Update AWSPartnerZone for LMCC

`src/components/marketplace/AWSPartnerZone.tsx` becomes the LMCC management surface:

Current "Pending AWS Connections" section -> "LMCC Connections" section showing:
- Active LMCC connections with 4-path status
- Pending connections awaiting customer acceptance in AWS Console
- Metro, bandwidth, contract type, BGP health per connection
- Link to view full details (navigates to connection detail)

Update the "Getting Started" flow to match product brief's customer flow:
1. Go to AWS Console -> Direct Connect -> Create Connection
2. Select Maximum Resiliency + Metro
3. Choose AT&T as Direct Connect Partner
4. AT&T auto-provisions 4 hosted connections
5. 4 "Pending" connections appear in AWS Console
6. Customer clicks Accept on each
7. BGP establishes, billing starts
8. Connection appears in NetBond portal as "Active"

## Phase 7: Wizard Flow for AWS Max

When user selects AWS + Maximum resiliency in the wizard:

Option A (redirect): Show message "Maximum Resiliency for AWS uses AT&T LMCC. This is initiated from the AWS Console, not the NetBond wizard." with button to AWSPartnerZone.

Option B (inline): Show metro selection (not individual locations), single bandwidth choice, explain that 4 connections will be auto-provisioned. Preview phase: only San Jose + LA metros, fixed 1 Gbps, trial contract.

Recommend Option A for Preview, Option B for GA.

## Phase 8: Connection Card for LMCC

On the connections list, LMCC connections show:
- "Maximum Resiliency" badge
- "LMCC" badge
- 4/4 paths active (or degraded count)
- Metro name
- Contract type
- Single bandwidth value

## Files Summary

| File | Action |
|------|--------|
| `src/types/lmcc.ts` | Rewrite - connection product types |
| `src/types/vnf.ts` | Edit - remove 'lmcc' from union |
| `src/data/lmccService.ts` | Rewrite - metro/bandwidth/contract data |
| `src/components/connection/lmcc/LMCCConfigDrawer.tsx` | DELETE |
| `src/components/connection/lmcc/SiteSelectionPanel.tsx` | DELETE |
| `src/components/connection/lmcc/BandwidthAllocationPanel.tsx` | DELETE |
| `src/components/connection/lmcc/TAOConfigurationPanel.tsx` | DELETE |
| `src/components/connection/lmcc/LMCCConfigSummary.tsx` | DELETE |
| `src/components/connection/lmcc/LMCCWorkflowVisualization.tsx` | Update - match product brief |
| `src/components/connection/lmcc/LMCCStatusPanel.tsx` | NEW - 4-path health display |
| `src/components/connection/modals/VNFModal.tsx` | Edit - remove all LMCC refs |
| `src/components/connection/ConnectionDetails.tsx` | Edit - remove LMCC mock VNF, add LMCC connection tab |
| `src/components/connection/vnf/VNFTable.tsx` | Edit - remove LMCC badges |
| `src/components/marketplace/AWSPartnerZone.tsx` | Edit - add LMCC management |
| `src/components/wizard/screens/ResiliencySelection.tsx` | Edit - AWS Max redirects to LMCC |

## Verification

1. `npx tsc --noEmit` passes
2. `npx vite build` succeeds
3. No import references to deleted files
4. No 'lmcc' in VNFType
5. LMCC appears as connection product, not VNF
6. AWSPartnerZone shows LMCC connections with 4-path status
7. Wizard AWS + Max explains LMCC redirect
