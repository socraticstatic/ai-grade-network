# Storefront iteration 2 (Ramesh review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the NaaS storefront prototype to what Ramesh prescribed on 2026-09-09: four launch cards on the landing, a lane for traffic outside the fabric, and one Observe section in the AI Fabric's shape that shows the network layer and the workloads it impacts.

**Architecture:** All work lands in the static prototype repo `socraticstatic/naas-design-scope` (cloned to the session scratchpad at `nds/`). New derivations go in one new pure module, `naas-connections.js`, tested with `node --test`. Markup patches go in `NaaS Storefront.dc.html`; wiring goes in `naas-app.js`. The shell, the `fx-*` grammar, and every page body Ramesh did not mention stay byte-for-byte.

**Tech Stack:** dc-runtime templates (`sc-if`, `sc-for`, `{{ }}`), ES modules, node 24 `node:test`, GitHub Pages via Actions.

**Spec:** `docs/superpowers/specs/2026-09-09-storefront-iteration-2-ramesh-review-design.md` (in `cloud-connect`)

## Global Constraints

- Keep the shell (header, rail, title row, Andi dock) and the `fx-*` filter, card, row, kpi, alert grammar. New panels use `fx-card`, `fx-card-head`, `fx-rows`, `fx-row`, `fx-legend`, `fx-btn`, `fx-kpi`, `fx-alert` only.
- Tiles: Throughput, Utilization, P95 latency, Packet loss. Never "Cost" as a tile label.
- States: Up, Degraded, Saturating. BGP: Established, Flapping. Certainty: "Directly impacted", "Possible impact".
- Patterns, exactly: Stays in the region · Across regions · Across clouds · Out to the internet · Coming in.
- No em dashes anywhere in copy. Connect is the place; attach is the verb.
- After every markup patch: per-section open/close count for `div`, `section`, `span`, `button`, `sc-if`, `sc-for`, and a screenshot of Compose (a later section).
- Never commit `version.js`. Re-apply nothing from `PATCHES.md`; the clone already carries every patch. Add this drop as patch 8 in `PATCHES.md`.

---

### Task 1: Test harness and data fields

**Files:**
- Create: `nds/tests/data.test.mjs`
- Modify: `nds/naas-data.js` (the `REG` helper at line 22 and the estates `partial`, `mature`, `trust`)

**Interfaces:**
- Produces: region objects gain `link` (`'ok'` default or `'degraded'`), `paths` (1 default, 2 for dual attach), `acct` (string or null).

- [ ] **Step 1: Write the failing test**

```js
// nds/tests/data.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';

for (const id of ['partial', 'mature', 'trust']) {
  test(`${id}: exactly one attached region is degraded`, () => {
    const deg = D.ESTATES[id].regionsList.filter(r => r.link === 'degraded');
    assert.equal(deg.length, 1);
    assert.equal(deg[0].priv, true);
  });
  test(`${id}: DX and ER regions carry an account id`, () => {
    for (const r of D.ESTATES[id].regionsList.filter(r => r.priv && (r.ramp === 'DX' || r.ramp === 'ER'))) assert.ok(r.acct, r.region);
  });
}
test('empty estate has no degraded region', () => { assert.equal(D.ESTATES.empty.regionsList.length, 0); });
```

- [ ] **Step 2: Run it, expect failure**

Run: `cd nds && node --test tests/` → FAIL, `deg.length` is 0.

- [ ] **Step 3: Implement**

Change `REG` to accept an options object as the tenth argument:

```js
const REG = (cloud, region, wl, priv, ramp, pub, fab, tags, rel, x) => ({ cloud, region, wl, priv, ramp, pub, fab, tags: tags || [], rel: rel || 'ok', link: (x && x.link) || 'ok', paths: (x && x.paths) || 1, acct: (x && x.acct) || null });
```

Then set fields:
- partial: `eastus` → `{ link: 'degraded', acct: 'sub 7f3a-…-21c4' }`; `us-east-1` → `{ paths: 2 }`.
- mature: `eu-central-1` → `{ link: 'degraded', acct: 'acct 4102-8837-5510', paths: 1 }`; `us-east-1`, `us-central1` → `{ paths: 2 }`; `us-west-2` → `{ acct: 'acct 4102-8837-5510', paths: 2 }`; `eastus`, `westeurope` → `{ acct: 'sub 7f3a-…-21c4' }`.
- trust: `us-east-2` → `{ link: 'degraded', acct: 'acct 6620-1194-3308' }`; `us-east-1`, `eastus` → `{ paths: 2 }`; `eastus` also `acct: 'sub 0c9e-…-88b1'`.

- [ ] **Step 4: Run tests, expect pass.** `node --test tests/`
- [ ] **Step 5: Commit** `git commit -am "data: link, paths and acct on regions for the connections panel"`

---

### Task 2: Connections and impacted workloads (`naas-connections.js`)

**Files:**
- Create: `nds/naas-connections.js`
- Create: `nds/tests/connections.test.mjs`

**Interfaces:**
- Consumes: `est` (estate), `ob` from `A.observe` (uses `ob.utilRows`, `ob.flows`), `inv` from `A.inventory`.
- Produces:
  - `connections(est, ob)` → `{ rows, degraded, total }`. Each row: `{ id, cloud, region, ramp, ports, cap, gbps, avg, pct, state: 'Up'|'Degraded'|'Saturating', bgp: 'Established'|'Flapping', drops: string, inD: string, outD: string, wl, terminated: 'att'|'own', paths, acct, hot: boolean }`. Sorted Degraded, Saturating, Up.
  - `impacted(est, inv, row)` → `{ kind: 'direct'|'possible'|'none', certainty: string, resilience: string, vpcs: [{ name, wl, tags }], downstream: [{ label, vpcs: [{ name, wl }] }], wl }`.
  - `sparkline(seed, n, base, amp)` → SVG path string in a 100 x 24 box.

- [ ] **Step 1: Write the failing tests**

```js
// nds/tests/connections.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { connections, impacted, sparkline } from '../naas-connections.js';

const est = D.ESTATES.mature;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);

test('one connection per attached region, degraded first', () => {
  const c = connections(est, ob);
  assert.equal(c.total, est.regionsList.filter(r => r.priv).length);
  assert.equal(c.degraded, 1);
  assert.equal(c.rows[0].state, 'Degraded');
  assert.equal(c.rows[0].bgp, 'Flapping');
  assert.equal(c.rows[0].region, 'eu-central-1');
});
test('rows carry purchased capacity and sparklines', () => {
  const r = connections(est, ob).rows[0];
  assert.ok(r.cap >= 10); assert.ok(r.inD.startsWith('M')); assert.ok(r.outD.startsWith('M'));
  assert.ok(r.pct >= 0 && r.pct <= 100);
});
test('customer gateway reads possible impact with the account', () => {
  const r = connections(est, ob).rows.find(x => x.region === 'eu-central-1');
  const i = impacted(est, inv, r);
  assert.equal(i.kind, 'possible');
  assert.match(i.certainty, /Possible impact/);
  assert.match(i.certainty, /4102-8837-5510/);
  assert.ok(i.vpcs.length >= 1);
  assert.match(i.resilience, /Single path/);
});
test('healthy AT&T-terminated connection reads no impact', () => {
  const r = connections(est, ob).rows.find(x => x.region === 'us-east-1');
  const i = impacted(est, inv, r);
  assert.equal(i.kind, 'none');
  assert.ok(i.downstream.length >= 1, 'us-east-1 talks to eastus');
});
test('degraded AT&T-terminated dual path reads direct impact and access holds', () => {
  const est2 = { ...est, regionsList: est.regionsList.map(r => r.region === 'us-east-1' ? { ...r, link: 'degraded' } : r) };
  const ob2 = A.observe(est2, [], inv);
  const r = connections(est2, ob2).rows.find(x => x.region === 'us-east-1');
  const i = impacted(est2, A.inventory(est2), r);
  assert.equal(i.kind, 'direct'); assert.match(i.resilience, /Access holds/);
});
test('sparkline is deterministic', () => { assert.equal(sparkline(7, 24, 50, 20), sparkline(7, 24, 50, 20)); });
test('empty estate yields no rows', () => { const e = D.ESTATES.empty; const c = connections(e, A.observe(e, [], A.inventory(e))); assert.equal(c.rows.length, 0); });
```

- [ ] **Step 2: Run, expect failure** (module not found).

- [ ] **Step 3: Implement `nds/naas-connections.js`**

```js
// naas-connections.js — the network layer on Observe and what it means for
// the workloads behind it. Pure data. Added 2026-09-09 after Ramesh's review:
// "you had five connections of which one is experiencing this problem. Here
// are the workloads that are impacted."
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
const ATT_TERMINATED = new Set(['NetBond', 'EQX', 'hosted']);

/** 24-point utilization line in a 100x24 box, seeded so it never jitters between renders. */
export function sparkline(seed, n = 24, base = 50, amp = 20) {
  const r = rnd(hash(seed) || 1); let v = base;
  const pts = Array.from({ length: n }, (_, i) => { v = Math.max(2, Math.min(98, v + (r() - 0.5) * amp)); return [i / (n - 1) * 100, 24 - v / 100 * 22 - 1]; });
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
}

const ORDER = { Degraded: 0, Saturating: 1, Up: 2 };

/** One row per attached region: what NetBond Advanced's monitor shows, plus purchased capacity. */
export function connections(est, ob) {
  const util = ob.utilRows || [];
  const rows = est.regionsList.filter(r => r.priv).map(r => {
    const u = util.find(x => x.region === r.region) || { gbps: 0, ports: 1, cap: 10, pct: 0 };
    const degraded = r.link === 'degraded';
    const pct = degraded ? Math.max(u.pct, 62) : u.pct;
    const state = degraded ? 'Degraded' : pct >= 80 ? 'Saturating' : 'Up';
    const ramp = r.ramp || 'NetBond';
    return { id: 'cx-' + r.region, cloud: r.cloud, region: r.region, ramp, ports: u.ports, cap: u.cap, gbps: u.gbps, avg: +(u.gbps * 0.82).toFixed(1), pct, state, bgp: degraded ? 'Flapping' : 'Established', drops: degraded ? '0.31%' : state === 'Saturating' ? '0.04%' : '0.00%', inD: sparkline(r.region + ':in', 24, pct, degraded ? 34 : 12), outD: sparkline(r.region + ':out', 24, Math.max(4, pct - 18), degraded ? 30 : 10), wl: r.wl, terminated: ATT_TERMINATED.has(ramp) ? 'att' : 'own', paths: r.paths || 1, acct: r.acct || null, hot: pct >= 80, degraded };
  }).sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.pct - a.pct);
  return { rows, degraded: rows.filter(r => r.degraded).length, total: rows.length };
}

/** What a connection's state means for the workloads behind it, with the honesty the data allows. */
export function impacted(est, inv, row) {
  if (!row) return { kind: 'none', certainty: '', resilience: '', vpcs: [], downstream: [], wl: 0 };
  const reg = inv.flatMap(c => c.regions).find(r => r.region === row.region);
  const vpcs = (reg ? reg.vpcs : []).map(v => ({ name: v.name, wl: v.wl, tags: v.tags.slice(0, 2) }));
  const partners = (est.arcs || []).filter(a => a.from === row.region || a.to === row.region).map(a => a.from === row.region ? a.to : a.from);
  const downstream = partners.map(p => { const pr = est.regionsList.find(r => r.region === p); const pi = inv.flatMap(c => c.regions).find(r => r.region === p); return pr ? { label: `${pr.cloud} ${pr.region}`, vpcs: (pi ? pi.vpcs : []).slice(0, 2).map(v => ({ name: v.name, wl: v.wl })) } : null; }).filter(Boolean);
  const wl = vpcs.reduce((a, v) => a + v.wl, 0);
  if (!row.degraded) return { kind: 'none', certainty: `No impact. ${wl.toLocaleString('en-US')} workloads reach the fabric through this connection at ${row.pct}% utilization.`, resilience: '', vpcs, downstream, wl };
  const direct = row.terminated === 'att';
  const certainty = direct ? 'Directly impacted. AT&T terminates this connection in your VPC.' : `Possible impact. Visibility ends at your gateway. ${row.cloud} ${row.acct || 'account'}.`;
  const resilience = row.paths >= 2 ? `Access holds: a second path carries ${row.gbps} Gbps at ${Math.min(99, row.pct * 2)}% while this one degrades.` : 'Single path. Access to these workloads is lost if this link fails.';
  return { kind: direct ? 'direct' : 'possible', certainty, resilience, vpcs, downstream, wl };
}
```

- [ ] **Step 4: Run tests, expect pass.**
- [ ] **Step 5: Commit** `git add naas-connections.js tests && git commit -m "observe: connections and impacted-workloads derivations"`

---

### Task 3: Pattern cards and destination resolution (same module)

**Files:**
- Modify: `nds/naas-connections.js` (append)
- Modify: `nds/tests/connections.test.mjs` (append)

**Interfaces:**
- Consumes: `ob.flows` rows `{ id, name, from, to, kind, gbps, controlled, latency, region }`; `P.allSites(est)`, `P.gbps(est, site, region)` from `naas-paths.js`; `R.endpointsFor(w, cloud)` from `naas-round2.js`.
- Produces:
  - `patterns(est, ob, inv)` → array of five `{ key, title, sub, rows: [{ key, name, sub, v, w, fill, priv }], legend: [{ label, fill }], total }` in the fixed order `region, regions, clouds, internet, inbound`.
  - `resolveDest(inv, ip)` → `{ name, sub } | null`.

- [ ] **Step 1: Tests**

```js
import { patterns, resolveDest } from '../naas-connections.js';
import * as P from '../naas-paths.js';
test('five patterns in the fixed order, each with rows', () => {
  const p = patterns(est, ob, inv);
  assert.deepEqual(p.map(x => x.key), ['region', 'regions', 'clouds', 'internet', 'inbound']);
  assert.deepEqual(p.map(x => x.title), ['Stays in the region', 'Across regions', 'Across clouds', 'Out to the internet', 'Coming in']);
  for (const x of p) assert.ok(x.rows.length >= 1, x.key);
});
test('a private workload ip resolves to its resource name', () => {
  const w = inv[0].regions[0].vpcs[0].subnets.find(s => !s.pub).workloads[0];
  const hit = resolveDest(inv, w.ip);
  assert.ok(hit); assert.match(hit.name, new RegExp(w.name));
});
test('an unknown ip stays unresolved', () => { assert.equal(resolveDest(inv, '203.0.113.9'), null); });
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement (append to `naas-connections.js`)**

```js
import * as P from './naas-paths.js';
const FAB = '#0057b8', PUB = '#8a949c';
const bar = (rows, key = 'gbps') => { const m = Math.max(0.001, ...rows.map(r => r[key])); return rows.map(r => ({ ...r, w: Math.round(r[key] / m * 100) + '%' })); };
const G = (n) => n.toFixed(1) + ' Gbps';

/** The five patterns most cloud conversations center on (Ramesh, 19:04). Each row is a door into Logs. */
export function patterns(est, ob, inv) {
  const rs = est.regionsList, flows = ob.flows || [];
  const legend = [{ label: 'On the fabric', fill: FAB }, { label: 'Public internet', fill: PUB }];
  // 1. Stays in the region: east-west inside the region, sized from its workloads.
  const region = bar(rs.map(r => ({ key: r.region, name: `${r.cloud} ${r.region}`, sub: `${r.wl.toLocaleString('en-US')} workloads · between VPCs`, gbps: +(r.wl * 0.14 * 0.6).toFixed(1), priv: r.priv, fill: r.priv ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  // 2. Across regions: object storage reads that leave the region.
  const regions = bar(flows.filter(f => f.to === 'object storage').map(f => ({ key: f.id, name: `${f.from} → object storage`, sub: `${f.region} · ${f.controlled ? 'on the fabric' : 'public internet'} · ${f.latency} ms`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  // 3. Across clouds: every cloud-to-cloud flow.
  const clouds = bar(flows.filter(f => f.kind !== 'App').map(f => ({ key: f.id, name: f.name, sub: `${f.controlled ? 'on the fabric' : 'public internet'} · ${f.latency} ms`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  // 4. Out to the internet: public-internet and AI-endpoint flows by source group.
  const internet = bar(flows.filter(f => f.kind === 'App' && f.to !== 'object storage').map(f => ({ key: f.id, name: f.name, sub: `${f.region} · ${f.controlled ? 'AT&T egress' : 'hyperscaler exit'} · $${f.perGb.toFixed(2)}/GB`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  // 5. Coming in: the sites that send the most toward the clouds.
  const sites = P.allSites(est);
  const inbound = bar(sites.map(st => ({ key: st.id || st.name, name: st.name, sub: `${st.access || 'Access'} · ${st.priv ? 'private first mile' : 'public first mile'}`, gbps: +rs.reduce((a, r) => a + P.gbps(est, st, r), 0).toFixed(2), priv: !!st.priv, fill: st.priv ? FAB : PUB })).filter(x => x.gbps > 0).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: r.gbps >= 1 ? G(r.gbps) : Math.round(r.gbps * 1000) + ' Mbps' }));
  const mk = (key, title, rows, subWord) => ({ key, title, rows, legend, total: rows.reduce((a, r) => a + r.gbps, 0), sub: rows.length ? `${rows.filter(r => r.priv).length} of ${rows.length} ${subWord} on the fabric` : 'Nothing in this window' });
  return [mk('region', 'Stays in the region', region, 'regions'), mk('regions', 'Across regions', regions, 'flows'), mk('clouds', 'Across clouds', clouds, 'paths'), mk('internet', 'Out to the internet', internet, 'flows'), mk('inbound', 'Coming in', inbound, 'sites')];
}

/** Private ip → resource name through the discovery tree; public stays null (Santosh, 19:51). */
export function resolveDest(inv, ip) {
  for (const c of inv) for (const r of c.regions) for (const v of r.vpcs) for (const s of v.subnets) for (const w of s.workloads || []) if (w.ip === ip) return { name: `${w.tag || v.name}/${w.name}`, sub: `${ip} · ${w.type} · ${r.region}` };
  return null;
}
```

- [ ] **Step 4: Run tests, expect pass.** `node --test tests/`
- [ ] **Step 5: Commit** `git commit -am "observe: five pattern cards and private destination resolution"`

---

### Task 4: Hero lane for traffic outside the fabric

**Files:**
- Modify: `nds/naas-logic.js` `heroLayout` (lines 7 to 52)
- Modify: `nds/NaaS Storefront.dc.html` lines 307 (band rect), 311 to 312 (strata rect and foreignObject), plus a new lane group after the strata loop
- Create: `nds/tests/hero.test.mjs`

**Interfaces:**
- Produces: `heroLayout(...)` returns `lane: { x, y, w, h }`; every edge gains `viaLane: boolean`; `bandH` is 300; `strata[i].h` is 75.

- [ ] **Step 1: Test**

```js
import test from 'node:test'; import assert from 'node:assert/strict';
import { heroLayout } from '../naas-logic.js';
const est = { stage: 'partial', sites: [{ name: 'A', priv: true }, { name: 'B', priv: false }], regionsList: [{ cloud: 'AWS', region: 'us-east-1', wl: 10, priv: true, tags: [] }, { cloud: 'AWS', region: 'us-west-2', wl: 5, priv: false, tags: [] }], arcs: [], regionsExtra: 0 };
test('band shrinks and a lane sits beneath it', () => {
  const L = heroLayout(est, {});
  assert.equal(L.bandH, 300); assert.deepEqual(L.lane, { x: 560, y: 340, w: 240, h: 76 });
  assert.equal(L.strata[3].y + L.strata[3].h, 324);
});
test('public edges enter and leave through the lane; private edges use the band', () => {
  const L = heroLayout(est, {});
  const pubIn = L.edges.find(e => e.id === 'in1'), privIn = L.edges.find(e => e.id === 'in0');
  assert.equal(pubIn.viaLane, true); assert.ok(pubIn.y2 >= 340 && pubIn.y2 <= 416);
  assert.equal(privIn.viaLane, false); assert.ok(privIn.y2 <= 324);
  const pubOut = L.edges.find(e => e.kind === 'egress' && !e.priv), inet = L.edges.find(e => e.internet);
  assert.ok(pubOut.viaLane && pubOut.y1 >= 340); assert.ok(inet.y1 >= 340);
});
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement in `heroLayout`**

Replace the constants line and the three edge pushes:

```js
const W = 1392, H = 440, bandX = 560, bandW = 240, bandY = 24, bandH = 300, strataH = bandH / 4;
const lane = { x: bandX, y: bandY + bandH + 16, w: bandW, h: 76 };
const out = { W, H, bandX, bandW, bandY, bandH, lane, sites: [], groups: [], regions: [], workloads: [], edges: [], arcs: [], internet: null, strata: [], ghost: false };
const clampBand = (y) => Math.round(Math.min(bandY + bandH - 24, Math.max(bandY + 24, y)));
const clampLane = (y) => Math.round(Math.min(lane.y + lane.h - 14, Math.max(lane.y + 14, y)));
```

Ingress: `const viaLane = !s.priv && !s.ghost; out.edges.push({ id: 'in' + i, kind: 'ingress', priv: !!s.priv, ghost: !!s.ghost, viaLane, x1: 204, y1: y + 18, x2: bandX, y2: viaLane ? clampLane(y + 18) : clampBand(y + 18), site: s });`

Egress: `const viaLane = !r.priv && !r.ghost; out.edges.push({ id: 'eg' + out.regions.length, kind: 'egress', priv: !!r.priv, ghost: !!r.ghost, viaLane, x1: bandX + bandW, y1: viaLane ? clampLane(ry + 14) : Math.round(Math.min(bandY + bandH - 40, Math.max(bandY + 24, ry + 14))), x2: 980, y2: ry + 14, chip: r.ramp, shield: ..., region: r, dur: ... });`

Internet: `out.edges.push({ id: 'inet', kind: 'internet', priv: false, ghost: empty, viaLane: true, x1: bandX + bandW, y1: lane.y + lane.h - 14, x2: 980, y2: out.internet.y + 14, internet: true });`

Markup (`NaaS Storefront.dc.html`): band rect `height="392"` → `height="300"`; strata rect and foreignObject `height="86"` → `height="64"`; in `naas-app.js` `strataMeta` set `ry: L.strata[i].y + 5`. After the `<!-- band -->` group's closing `</g>` add:

```html
  <!-- outside the fabric: third party, internet -->
  <g aria-label="Outside the AT&T fabric">
    <rect x="560" y="340" width="240" height="76" rx="12" fill="var(--bg-wash)" style="stroke:var(--border-secondary)"></rect>
    <foreignObject x="560" y="340" width="240" height="76" style="pointer-events:none"><div style="height:100%;box-sizing:border-box;padding:14px 16px;display:flex;flex-direction:column;justify-content:center;gap:2px;font-family:inherit"><div style="font-size:13px;line-height:18px;font-weight:700;color:var(--text-heading)">Outside the AT&amp;T fabric</div><div style="font-size:11px;line-height:16px;color:var(--text-light)">third party · internet · no path control</div></div></foreignObject>
  </g>
```

Check the strata card's inner div (line 313 onward) still fits 64px: reduce its padding to `8px 12px` if the third line clips at 1440.

- [ ] **Step 4: Tests pass; browser check.** Open `NaaS Storefront.dc.html` at 1440 light and dark; public edges (dashed) must enter the lane, private edges the band. Tag-balance scan. Screenshot Compose.
- [ ] **Step 5: Commit** `git commit -am "hero: a lane for traffic outside the AT&T fabric"`

---

### Task 5: Landing launch cards

**Files:**
- Modify: `nds/naas-connections.js` (append `launchCards`)
- Modify: `nds/tests/connections.test.mjs` (append)
- Modify: `nds/naas-app.js` `rollup` (lines 120 to 128) and the `rollup` output
- Modify: `nds/NaaS Storefront.dc.html` line 840 (`aria-label="Success metrics"` → `"Launch points"`, `hint-placeholder-count="4"`) and the tile: add `aria-current="{{ r.primary }}"` and `style="...border-color:{{ r.border }}"`

**Interfaces:**
- Produces: `launchCards({ est, ob, conns, totalSave, violations, isEmpty })` → four `{ key, label, value, sub, primary, bar }` in order connect, observe, govern, cost.

- [ ] **Step 1: Test**

```js
import { launchCards } from '../naas-connections.js';
test('four launch cards; Observe primary on a live estate, Connect on an empty one', () => {
  const c = launchCards({ est, ob, conns: connections(est, ob), totalSave: 12000, violations: 52, isEmpty: false });
  assert.deepEqual(c.map(x => x.key), ['connect', 'observe', 'govern', 'cost']);
  assert.equal(c.find(x => x.primary).key, 'observe');
  assert.match(c[1].value, /1 of \d+ connections/); assert.match(c[1].sub, /degraded/);
  const e = launchCards({ est: D.ESTATES.empty, ob: A.observe(D.ESTATES.empty, [], []), conns: { rows: [], degraded: 0, total: 0 }, totalSave: 0, violations: 0, isEmpty: true });
  assert.equal(e.find(x => x.primary).key, 'connect'); assert.equal(e[0].value, 'Nothing connected yet');
});
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement**

```js
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
/** The four launch-off points (Ramesh, 23:09). New customers start at Connect; everyone else at Observe. */
export function launchCards({ est, ob, conns, totalSave, violations, isEmpty }) {
  const rs = est.regionsList, pub = rs.filter(r => !r.priv).length;
  const degRow = conns.rows.find(r => r.degraded);
  return [
    { key: 'connect', label: 'Connect', value: isEmpty ? 'Nothing connected yet' : `${pub} of ${rs.length} regions`, sub: isEmpty ? 'Start here' : pub ? 'still ride the public internet' : 'every region on the fabric', bar: isEmpty ? null : Math.round((rs.length - pub) / (rs.length || 1) * 100) },
    { key: 'observe', label: 'Observe', value: isEmpty ? 'No telemetry yet' : `${conns.degraded} of ${conns.total} connections`, sub: isEmpty ? 'starts with the first attach' : degRow ? `degraded · ${degRow.wl.toLocaleString('en-US')} workloads impacted` : `healthy · ${(ob.fab || 0).toFixed(1)} Gbps on the fabric`, bar: null },
    { key: 'govern', label: 'Govern', value: isEmpty ? 'No policies yet' : violations.toLocaleString('en-US'), sub: isEmpty ? 'three starting points' : `policy violations across ${(est.policies || []).length} policies`, bar: null },
    { key: 'cost', label: 'Cost', value: isEmpty ? 'No egress seen yet' : totalSave ? money(totalSave) + '/mo' : money(ob.savingsMo || 0) + '/mo', sub: isEmpty ? 'priced after the scan' : totalSave ? `on the table across ${est.findings.filter(f => f.priced).length} findings` : 'already saved on the fabric', bar: null },
  ].map(c => ({ ...c, primary: isEmpty ? c.key === 'connect' : c.key === 'observe' }));
}
```

Wire in `naas-app.js`: after `hp` is computed and `ob` exists, `const conns = X.connections(est0, ob);` (import `* as X from './naas-connections.js'`); replace the `rollup` array with `X.launchCards({ est, ob, conns, totalSave, violations: policies.reduce((a, p) => a + p.viol, 0), isEmpty })` (note `policies` is computed later in the function; compute `violationsN` from `layerPolicies(s, est, obScope)` plus `s.customPolicies` before use) and keep the `.map(r => ({ ...r, hasSub, barVis, ... }))` decoration, adding `go` per key: connect → `go('s3', { layer: 'cloud', tab: 'connect' })`, observe → `go('s3', { layer: 'cloud', tab: 'observe', obPage: 'perf' })`, govern → `go('s3', { layer: 'cloud', tab: 'govern' })`, cost → `go('s3', { layer: 'cloud', tab: 'cost' })`; and `border: r.primary ? 'var(--cta)' : 'var(--border-secondary)'`.

- [ ] **Step 4: Tests pass; browser check** on `?view=empty`, `?view=partial`, live. Landing shows four tiles; Observe tile carries the cobalt border on live, Connect on empty.
- [ ] **Step 5: Commit** `git commit -am "landing: four launch cards replace the success-metrics strip"`

---

### Task 6: Rail Observe group and page state

**Files:**
- Modify: `nds/naas-app.js` `shellVals` rail groups (lines 820 to 830) and `pageTitle` (line 840)

- [ ] **Step 1: Change the NaaS Observe group**

```js
{ key: 'observe', hasTitle: true, title: 'Observe', items: [
  item('Performance & Reliability', 'high-meter', () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obPage: 'perf', obTab: 'flow' }); }, onS3('cloud', 'observe') && (s.obPage || 'perf') === 'perf' && obTabNow !== logsTab),
  item('Cost', 'bill', go('s3', { layer: 'cloud', tab: 'cost' }), onS3('cloud', 'cost')),
  item('Security & Governance', 'check-shield', () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obPage: 'sec', obTab: 'flow' }); }, onS3('cloud', 'observe') && s.obPage === 'sec'),
] },
```

Deep dive Logs item: also `set({ obPage: 'perf', obTab: logsTab })`. Page title for the observe tab: `obTabNow === logsTab ? 'Logs' : s.obPage === 'sec' ? 'Security & Governance' : 'Performance & Reliability'`.

- [ ] **Step 2: Browser check**: rail shows three Observe items; each highlights on click; title row follows.
- [ ] **Step 3: Commit** `git commit -am "rail: NaaS Observe mirrors the AI Fabric group"`

---

### Task 7: Observe section rebuilt in the AI Fabric's shape

**Files:**
- Modify: `nds/NaaS Storefront.dc.html` the `netObserve` block (lines 1086 to 1231)
- Modify: `nds/naas-app.js` `addendumVals` (add `obPage`, `conns`, `impact`, `patternCards`, `logs*` outputs) and the four-tile KPI cut

**Interfaces:**
- Consumes: `X.connections`, `X.impacted`, `X.patterns`, `X.resolveDest`.
- Produces template values: `obIsPerf`, `obIsSec`, `obIsLogs`, `obTiles` (4), `connRows`, `connHead`, `connSub`, `obConn` (selected id), `impact` (`{ kind, certainty, resilience, vpcs, downstream, wl, isNone, isHit, hasDown }`), `patternCards` (5, each `{ title, sub, rows, legend, goLogs }`), `logPattern`, `logChips` (6), `records` (existing), `secFindings` (governFindings), `audit` (policies rows).

- [ ] **Step 1: Vals.** In `addendumVals`:

```js
const obPage = s.obPage || 'perf';
const conns = X.connections(est0, ob);
const obConn = s.obConn && conns.rows.some(r => r.id === s.obConn) ? s.obConn : (conns.rows[0] || {}).id;
const connRows = conns.rows.map(r => ({ ...r, key: r.id, label: `${r.cloud} ${r.region}`, sub: `${r.ramp} · ${r.ports} × 10 Gbps purchased`, pctF: r.pct + '%', curAvg: `cur ${r.gbps} · avg ${r.avg} Gbps`, on: r.id === obConn, stateColor: r.state === 'Degraded' ? 'var(--warning)' : r.state === 'Saturating' ? 'var(--warning)' : 'var(--success)', lineColor: r.degraded ? '#ff8500' : '#009fdb', select: () => set({ obConn: r.id }), doorLabel: r.hot ? 'Add a port' : '', hasDoor: r.hot, go: composeFor(go, est0.regionsList.find(x => x.region === r.region) || {}) }));
const impact0 = X.impacted(est0, inv, conns.rows.find(r => r.id === obConn));
const impact = { ...impact0, isNone: impact0.kind === 'none', isHit: impact0.kind !== 'none', hasDown: impact0.downstream.length > 0, vpcs: impact0.vpcs.map(v => ({ ...v, key: v.name, wlF: v.wl.toLocaleString('en-US') + ' workloads', tagsF: v.tags.join(' · ') })), downstream: impact0.downstream.map(d => ({ ...d, key: d.label, vpcsF: d.vpcs.map(v => v.name).join(', ') })), tone: impact0.kind === 'direct' ? 'var(--error)' : impact0.kind === 'possible' ? 'var(--warning)' : 'var(--success)', openLogs: () => set({ obTab: 'control', obScope: 'cloud:' + ((conns.rows.find(r => r.id === obConn) || {}).cloud || 'AWS') }), askAndi: () => set({ andiScope: { kind: 'region', id: (conns.rows.find(r => r.id === obConn) || {}).region, label: (connRows.find(r => r.on) || {}).label }, andiOpen: true }) };
const logPattern = s.logPattern || 'all';
const patternCards = X.patterns(est0, ob, inv).map(p => ({ ...p, key: p.key, rows: p.rows.map(r => ({ ...r, key: r.key, go: () => set({ obTab: 'control', logPattern: p.key }) })), legend: p.legend.map(l => ({ ...l, key: l.label })), goLogs: () => set({ obTab: 'control', logPattern: p.key }) }));
const logChips = [{ key: 'all', label: 'All' }, ...patternCards.map(p => ({ key: p.key, label: p.title }))].map(ch => ({ ...ch, on: ch.key === logPattern, go: () => set({ logPattern: ch.key }) }));
const obTiles = ob.kpis.filter(k => ['thr', 'util', 'p95', 'loss'].includes(k.key)).sort((a, b) => ['thr', 'util', 'p95', 'loss'].indexOf(a.key) - ['thr', 'util', 'p95', 'loss'].indexOf(b.key)).map(k => ({ ...k, hasUnit: !!k.u }));
```

Records: map each record's `dst` through `X.resolveDest(inv, ip)` when it looks like an ip (`/^\d+\.\d+\.\d+\.\d+$/`), rendering `dstName` and `dstSub`; otherwise `dstName: r.dst, dstSub: r.path === 'public' ? 'unresolved · public' : ''`. Add `X.connections`'s degraded row to the front of `obStrip` text: `${row.cloud} ${row.region} is degraded on ${row.ramp}: BGP flapping, ${row.drops} drops, ${row.wl} workloads behind it.`

Output keys: `obIsPerf: obPage === 'perf' && obTab !== 'control', obIsSec: obPage === 'sec' && obTab !== 'control', obIsLogs: obTab === 'control', obTiles, connRows, connHead: \`${conns.total} connections\`, connSub: conns.degraded ? \`${conns.degraded} degraded · ${conns.rows.filter(r => r.state === 'Saturating').length} saturating\` : 'all up', hasConns: conns.rows.length > 0, impact, patternCards, logChips, logPattern`.

- [ ] **Step 2: Markup.** Replace the whole `netObserve` block. Skeleton (styles follow the existing block's inline values; every class is an existing `fx-*`):

```html
<sc-if value="{{ netObserve }}" hint-placeholder-val="{{ true }}">
<div style="display:grid;gap:24px">
  <sc-if value="{{ obIsPerf }}" hint-placeholder-val="{{ true }}">
    <!-- scope row: unchanged from today (fx-filters + live dot) -->
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
      <sc-for list="{{ obTiles }}" as="k" hint-placeholder-count="4"><div class="fx-kpi sm"><span class="lab">{{ k.l }}</span><span class="val">{{ k.v }}<sc-if value="{{ k.hasUnit }}" hint-placeholder-val="{{ false }}"><small>{{ k.u }}</small></sc-if></span><span class="sub">{{ k.e }}</span></div></sc-for>
    </div>
    <!-- Act on it strip: unchanged -->
    <div style="display:grid;grid-template-columns:minmax(0,3fr) minmax(280px,2fr);gap:16px;align-items:start">
      <div class="fx-card" aria-label="Connections">
        <div class="fx-card-head"><div><h3 class="fx-card-title">Connections</h3><div class="fx-card-sub">{{ connHead }} · {{ connSub }}</div></div></div>
        <div class="fx-rows">
          <sc-for list="{{ connRows }}" as="u" hint-placeholder-count="4">
            <div class="fx-row door" role="button" tabindex="0" aria-pressed="{{ u.on }}" onClick="{{ u.select }}" style="grid-template-columns:minmax(150px,32%) minmax(0,1fr) 120px 96px">
              <span class="lbl"><b>{{ u.label }}</b><small>{{ u.sub }}</small></span>
              <svg viewBox="0 0 100 24" preserveAspectRatio="none" width="100%" height="28" aria-label="Utilization in and out"><path d="{{ u.inD }}" fill="none" stroke="{{ u.lineColor }}" stroke-width="1.5" vector-effect="non-scaling-stroke"></path><path d="{{ u.outD }}" fill="none" stroke="{{ u.lineColor }}" stroke-width="1" opacity=".45" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"></path></svg>
              <span class="val">{{ u.pctF }}<small>{{ u.curAvg }}</small></span>
              <span style="display:grid;gap:2px;font-size:11px;line-height:14px"><span style="display:inline-flex;align-items:center;gap:6px;color:var(--text-heading);font-weight:500"><i style="width:8px;height:8px;border-radius:9999px;background:{{ u.stateColor }};display:inline-block"></i>{{ u.state }}</span><span style="color:var(--text-light)">BGP {{ u.bgp }} · {{ u.drops }} drops</span></span>
            </div>
          </sc-for>
        </div>
        <div class="fx-legend"><span><i style="display:inline-block;width:14px;height:2px;background:#009fdb;vertical-align:middle;margin-right:4px"></i>In</span><span><i style="display:inline-block;width:14px;height:0;border-top:2px dotted #009fdb;vertical-align:middle;margin-right:4px"></i>Out</span><span>Click a connection to see what it carries</span></div>
      </div>
      <div class="fx-card" aria-label="Impacted workloads">
        <div class="fx-card-head"><div><h3 class="fx-card-title">Impacted workloads</h3><div class="fx-card-sub">{{ connSelectedLabel }}</div></div></div>
        <div style="border-left:3px solid {{ impact.tone }};padding:2px 0 2px 12px;display:grid;gap:4px"><div style="font-size:14px;line-height:20px;font-weight:500;color:var(--text-heading);text-wrap:pretty">{{ impact.certainty }}</div><sc-if value="{{ impact.isHit }}" hint-placeholder-val="{{ true }}"><div style="font-size:12px;line-height:16px;color:var(--text-light);text-wrap:pretty">{{ impact.resilience }}</div></sc-if></div>
        <div class="fx-rows"><sc-for list="{{ impact.vpcs }}" as="v" hint-placeholder-count="3"><div class="fx-row" style="grid-template-columns:minmax(0,1fr) auto"><span class="lbl"><b>{{ v.name }}</b><small>{{ v.tagsF }}</small></span><span class="val">{{ v.wlF }}</span></div></sc-for></div>
        <sc-if value="{{ impact.hasDown }}" hint-placeholder-val="{{ true }}"><div style="display:grid;gap:6px"><div style="font-size:11px;line-height:16px;letter-spacing:.06em;text-transform:uppercase;font-weight:500;color:var(--text-disabled)">These talk to</div><sc-for list="{{ impact.downstream }}" as="d" hint-placeholder-count="1"><div style="font-size:13px;line-height:18px;color:var(--text-body)"><b style="color:var(--text-heading);font-weight:500">{{ d.label }}</b> · {{ d.vpcsF }}</div></sc-for></div></sc-if>
        <div style="display:flex;gap:8px"><button class="fx-btn" onClick="{{ impact.openLogs }}">Open Logs</button><button class="fx-btn" onClick="{{ impact.askAndi }}">Ask Andi</button></div>
      </div>
    </div>
    <!-- Traffic flow: the Sankey block as it exists today, minus the tablist; heading "Traffic flow" with the sub-verdict -->
    <div style="display:grid;gap:12px">
      <h3 style="margin:0;font-size:16px;line-height:24px;font-weight:500;color:var(--text-heading)">Patterns</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
        <sc-for list="{{ patternCards }}" as="p" hint-placeholder-count="5">
          <div class="fx-card sm" aria-label="{{ p.title }}">
            <div class="fx-card-head"><div><h3 class="fx-card-title">{{ p.title }}</h3><div class="fx-card-sub">{{ p.sub }}</div></div><button class="fx-btn" onClick="{{ p.goLogs }}">Logs</button></div>
            <div class="fx-rows"><sc-for list="{{ p.rows }}" as="r" hint-placeholder-count="4"><div class="fx-row door" role="button" tabindex="0" onClick="{{ r.go }}"><span class="lbl"><b title="{{ r.name }}">{{ r.name }}</b><small>{{ r.sub }}</small></span><span class="bar"><span style="width:{{ r.w }};background:{{ r.fill }}"></span></span><span class="val">{{ r.v }}</span></div></sc-for></div>
            <div class="fx-legend"><sc-for list="{{ p.legend }}" as="l" hint-placeholder-count="2"><span><i style="background:{{ l.fill }}"></i>{{ l.label }}</span></sc-for></div>
          </div>
        </sc-for>
      </div>
    </div>
  </sc-if>
  <sc-if value="{{ obIsSec }}" hint-placeholder-val="{{ false }}">
    <!-- governFindings cards as on the Govern tab, then: -->
    <div class="fx-card" aria-label="Policy audit"><div class="fx-card-head"><div><h3 class="fx-card-title">Policy audit</h3><div class="fx-card-sub">{{ governVerdict }}</div></div><button class="fx-btn" onClick="{{ goGovern }}">Open Policies</button></div>
      <div class="fx-rows"><sc-for list="{{ polRows }}" as="p" hint-placeholder-count="4"><div class="fx-row" style="grid-template-columns:minmax(0,1fr) 120px 120px 100px"><span class="lbl"><b>{{ p.name }}</b><small>{{ p.sent.match }} · {{ p.sent.req }}</small></span><span class="val">{{ p.matchedLabel }}</span><span class="val" style="color:{{ p.violColor }}">{{ p.violLabel }}</span><span style="font-size:12px;color:var(--text-light)"><i style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:{{ p.dot }};margin-right:6px"></i>{{ p.state }}</span></div></sc-for></div>
    </div>
  </sc-if>
  <sc-if value="{{ obIsLogs }}" hint-placeholder-val="{{ false }}">
    <div class="fx-filters"><span class="fx-label">Pattern</span><div class="fx-chips"><sc-for list="{{ logChips }}" as="ch" hint-placeholder-count="6"><button class="fx-chip" aria-pressed="{{ ch.on }}" onClick="{{ ch.go }}">{{ ch.label }}</button></sc-for></div><span class="fx-spacer"></span><label class="fx-filter"><span class="fx-label">Group by</span><select class="fx-select" value="{{ groupBy }}" onChange="{{ setGroupBy }}"><option value="None">None</option><option value="Source">Source</option><option value="Destination">Destination</option><option value="Path">Path</option><option value="Action">Action</option></select></label></div>
    <!-- the existing .dt records table, with the Destination cell now <div>{{ r.dstName }}</div><div small>{{ r.dstSub }}</div> -->
  </sc-if>
  <sc-if value="{{ isEmpty }}" hint-placeholder-val="{{ false }}"><div>No telemetry yet. It starts with the first attach.</div></sc-if>
</div>
</sc-if>
```

Removed: the seven-tab `role="tablist"`, the trend band, Anomalies, Utilization by connection, the six insight cards, Flows and paths, Event stream. `polRows`, `governVerdict`, `groupBy`, `records` already exist in the vals.

- [ ] **Step 3: Tag balance scan** for the Observe section and screenshot Compose.
- [ ] **Step 4: Browser check** at 1440 light and dark on live, partial, empty, meridian: four tiles; Connections with eu-central-1 first and Degraded; clicking us-east-1 switches the Impacted panel to "No impact"; five pattern cards; a Logs door lands on the Logs page with the chip pressed; Security & Governance shows the audit; zero console errors.
- [ ] **Step 5: Commit** `git commit -am "observe: one section in the AI Fabric's shape; connections, impacted workloads, five patterns, logs"`

---

### Task 8: Degraded link on the hero and in health

**Files:**
- Modify: `nds/naas-round2.js` `health` (lines 44 to 58)

- [ ] **Step 1:** `regionHealth[r.region] = r.rel === 'warn' || r.link === 'degraded' ? 'amber' : ...`; incidents add `...rs.filter(r => r.link === 'degraded').map(r => ({ region: r.region, cloud: r.cloud, text: \`${r.cloud} ${r.region} · BGP flapping on ${r.ramp || 'NetBond'} · ${r.drops || '0.31%'} drops · 22 min\` }))`.
- [ ] **Step 2: Browser check**: the eu-central-1 edge on the hero carries the amber sleeve; the incident line above the hero lists it; clicking it opens Observe.
- [ ] **Step 3: Commit** `git commit -am "health: a degraded attached link is amber everywhere"`

---

### Task 9: Patch notes, deploy, verify

**Files:**
- Modify: `nds/PATCHES.md` (append section 8)
- Modify (cloud-connect): memory `naas-design-scope-repo.md` (last replaced line), `_memory.md` in the vault

- [ ] **Step 1: PATCHES.md section 8** listing: data fields, `naas-connections.js`, hero lane, launch cards, rail group, Observe rebuild, health. Note the tests: `node --test tests/`.
- [ ] **Step 2:** `node --test tests/` green. `git push origin main`. Wait for the Pages workflow (`gh run watch`).
- [ ] **Step 3:** Live check at https://socraticstatic.github.io/naas-design-scope/ at 1440 and 1728, light and dark; screenshots of the landing, Observe, and Logs saved to the scratchpad and sent to Micah.
- [ ] **Step 4:** Update the memory pointer and the vault `_memory.md`.
