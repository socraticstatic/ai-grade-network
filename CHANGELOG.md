# Changelog

All notable changes to NetBond Advanced are documented here. Entries are grouped by date, newest first.

---

## 2026-05-07

### LMCC — Bible delta corrections (commit `8e9a2dc`)

Full Bible vs demo audit performed. Four deltas found and corrected.

**`src/data/lmccService.ts`**
- GA `bandwidthOptions` reverted to Design Brief tiers: `[1000, 2000, 5000, 10000, 25000, 50000, 100000]` Mbps (1/2/5/10/25/50/100 Gbps). A prior session had removed 25G/50G/100G based on external AWS technical research, which is subordinate to the Design Brief as design authority. Sub-Gbps tiers (50/100/200/300/400/500 Mbps) that were added at the same time were also removed — the Bible explicitly eliminates sub-Gbps at GA.
- BFD `interval` corrected from `100` to `300` ms in both `MOCK_LMCC_CONNECTIONS`. Previous value gave 300ms detection (100 × 3); Bible specifies 900ms detection (300 × 3).

**`src/components/pages/AWSWorkflowPage.tsx`**
- FlowB wizard step 2 bandwidth summary label replaced hardcoded ternary (`config.bandwidth === 1000 ? '1 Gbps' : '10 Gbps'`) with `GA_BANDWIDTHS.find(b => b.mbps === config.bandwidth)?.label` lookup. Now renders correctly for all seven GA tiers.

**`src/components/pages/SecondaryAssets.tsx`**
- Timeout error banner: replaced `style={{ borderTopWidth: '2px', borderTopColor: '#ea712f' }}` with Tailwind classes `border-t-2 border-t-fw-warn`.
- Timeout Clock icon: replaced `style={{ color: '#ea712f' }}` with `className="... text-fw-warn"`.
- Both changes bring the timeout state into Flywheel token compliance, matching the other two error banners.

**Verified in preview:** BFD Failover panel shows `3×300ms = 900ms`; bandwidth selector shows 1 Gbps (enabled) + 2/5/10/25/50/100 Gbps (disabled, "Available at GA"); sub-Gbps options absent.

---

### ConnectionTabs icon replacement (same session, prior commit)

**`src/components/connection/tabs/ConnectionTabs.tsx`**
- Replaced all Lucide React icon JSX in the `TABS` array with `AttIcon` component calls. The file was broken: Lucide imports had been removed in a prior session but the JSX referencing them remained, causing a TypeScript compile error.
- Icon mapping: `high-meter` (Overview), `cloudRouter` (Cloud Routers), `cable` (Links), `check-shield` (VNFs), `checklist` (Policies), `apis` (API), `person-group` (Access), `bill` (Billing), `download` (Versions), `grid` (Logs).

---

### Docs / config

**`.claude/launch.json`**
- Port corrected from `5179` (stale worktree) to `5173` (main project dev server). Prior value caused preview server to serve worktree content instead of the main project.

**`LMCC.md`**
- Port reference corrected: 5179 → 5173.
- Worktree fast-forward instructions updated to reflect current state (no active worktrees as of May 2026).

**`README.md`**
- Added "NetBond Advanced Max — LMCC" section covering: architecture, phase table, two flows, status progression, demo vs product component map, and authoritative source hierarchy.

---

## Authority Hierarchy (reference)

When content sources conflict, this order governs:

1. **Design Brief** (04/21/2026) — design authority. Controls copy, UX, phase capabilities.
2. **PRD** (04/09/2026) — engineering authority. Controls API contracts, error codes, billing triggers.
3. **Bible** (`project_lmcc_bible.md`) — synthesized working reference. Must be read before any content change.
4. **External sources** (AWS docs, industry specs) — informational only. Subordinate to all above.
