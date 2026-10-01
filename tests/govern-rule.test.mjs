import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import * as A from '../naas-addendum.js';
import * as D from '../naas-data.js';
import * as GV from '../naas-govern.js';
import { mkC } from './harness.mjs';

// Govern's one rule (w2-govern, 2026-09-30). The PCI counts disagreed across the
// product: Discover's apps table said 58 PCI workloads with 6 exposed, Govern >
// Tags said 89, the PCI policy 89 matched and 10 violations, the finding 10, and
// Established's policy 0 while its own inventory held exposed PCI workloads.
//
// One rule now, in naas-govern.js, read by every page:
//   - a tag policy matches the workloads that carry the tag, each its own (Govern > Tags and
//     Discover's apps table alike, 2026-10-01; it read the VPCs' tags before);
//   - a path policy (private path, no direct internet path, inline inspection) is broken
//     by a workload that reaches the internet directly: its VPC has no private path to
//     AT&T, or it has a public address with its own route out (Discover's "exposed");
//   - a latency SLO is broken by a workload whose region runs above it;
//   - a site policy counts sites, and is broken by a site outside the AT&T network;
//   - anything the estate has no source for reads "Not yet measured".
// The apps table, Govern > Tags and every tag policy count a workload by its own tag.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const NOW = '2026-10-05T14:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const n = (x) => +String(x).replace(/[^\d.]/g, '');
const at = (view, patch = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', nowIso: NOW, scanStep: 4, ...patch }));
const discover = (view) => vals(mkC({ view, estateParam: null, screen: 's1', discoverView: 'estate', estPanel: 'glance', scanStep: 4, nowIso: NOW }));

test('one rule for a PCI violation: the apps table, Govern > Tags, the PCI policy and the PCI finding agree on every estate', () => {
  let seen = 0;
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    const app = (discover(view).appAll || []).find(a => a.key === 'pci');
    const tag = at(view, { govPanel: 'tags' }).drawerTags.find(t => t.key === 'pci');
    const pol = at(view).polRows.find(p => p.match === 'tag PCI');
    const f = est.findings.find(x => x.kind === 'pci');
    if (!app) { assert.ok(!tag, `${view}: Tags lists pci, the apps table does not`); assert.ok(!f, `${view}: a PCI finding with no PCI workloads`); continue; }
    seen++;
    assert.ok(tag, `${view}: the apps table lists pci, Govern > Tags does not`);
    assert.ok(pol, `${view}: no PCI policy row`);
    assert.equal(tag.wl, app.wl, `${view}: Tags counts ${tag.wl} pci workloads, the apps table ${app.wl}`);
    assert.equal(pol.matched, app.wl, `${view}: the PCI policy matches ${pol.matched}, the apps table counts ${app.wl}`);
    assert.equal(tag.exposedN, app.exposed, `${view}: Tags says ${tag.exposedN} pci workloads exposed, the apps table ${app.exposed}`);
    assert.equal(pol.viol, app.exposed, `${view}: the PCI policy counts ${pol.viol} violations, the apps table ${app.exposed} exposed`);
    if (!app.exposed) { assert.ok(!f, `${view}: a PCI finding with nothing exposed`); continue; }
    assert.ok(f, `${view}: ${app.exposed} PCI workloads exposed and no PCI finding`);
    const m = /^([\d,]+) PCI-tagged workloads? reach(?:es)? the internet directly$/.exec(f.head);
    assert.ok(m, `${view}: "${f.head}"`);
    assert.equal(n(m[1]), app.exposed, `${view}: the finding counts ${m[1]}`);
    const ev = /^([\d,]+) of ([\d,]+) PCI-tagged workloads in (.+) have a public address and a default route to an internet gateway\.$/.exec(f.ev);
    assert.ok(ev, `${view}: "${f.ev}"`);
    assert.equal(n(ev[1]), app.exposed, `${view}: the evidence counts ${ev[1]}`);
    assert.equal(n(ev[2]), app.wl, `${view}: the evidence's whole is ${ev[2]}, the apps table's ${app.wl}`);
    // The regions it names are the ones the exposed PCI workloads sit in.
    const where = GV.policySets(est, A.inventory(est), pol).viol.map(r => r.region);
    for (const r of new Set(where)) assert.ok(ev[3].includes(r), `${view}: the evidence names ${ev[3]}, not ${r}`);
  }
  assert.equal(seen, 3, 'Growing, Established and Bank scale carry PCI');
});

// One rule for every tag, not PCI alone (skeptic, 2026-10-01): Discover's Apps ring read "8 apps,
// finance 68" and its door "Tags ›" opened Govern > Tags reading "9 tags, finance · 3 VPCs · 99
// workloads" (prod 28 against 102, ai 27 against 41, shared-services 30 against 242, gpu absent
// against 27). A workload carries one tag, its own: the apps table, Tags and every tag policy count it.
test('one rule for every tag: Govern > Tags and every tag policy count what Discover\'s apps table counts, on every estate', () => {
  for (const view of ESTATES) {
    const apps = discover(view).appAll || [];
    const tags = [];
    for (let p = 0; p < 20; p++) { const v = at(view, { govPanel: 'tags', tagPage: p }); tags.push(...v.drawerTags); if (!v.tagPager.many || tags.length >= n(v.tagPager.label.split(' of ')[1])) break; }
    assert.deepEqual(tags.map(t => t.key).sort(), apps.map(a => a.key).sort(), `${view}: Tags lists ${tags.map(t => t.key)}, the apps table ${apps.map(a => a.key)}`);
    for (const a of apps) {
      const t = tags.find(x => x.key === a.key);
      assert.equal(t.wl, a.wl, `${view} ${a.key}: Tags counts ${t.wl} workloads, the apps table ${a.wl}`);
      assert.equal(t.exposedN, a.exposed, `${view} ${a.key}: Tags says ${t.exposedN} exposed, the apps table ${a.exposed}`);
    }
    for (const p of at(view).polRows.filter(x => /^tag /i.test(x.match) && !/remotesite/i.test(x.match))) {
      const a = apps.find(x => x.key === GV.tagKey(p.match.slice(4)));
      assert.equal(p.matched, a ? a.wl : 0, `${view} ${p.name}: matches ${p.matched}, the apps table counts ${a ? a.wl : 0} ${p.match.slice(4)}`);
    }
  }
});

// A starting point or an authoring card over a tag no workload carries matches nothing, anywhere.
test('every template and every authoring card names a tag some estate\'s workloads carry', () => {
  const carried = new Set(ESTATES.flatMap(view => (discover(view).appAll || []).map(a => a.key)));
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', nowIso: NOW, authoring: { match: null, scope: 'any cloud', req: [] } });
  const cards = vals(c).aMatch.map(x => x.label).filter(m => /^tag /i.test(m));
  const tpls = at('partial', { govPanel: 'templates' }).examplePolicies.map(e => e.m).filter(m => /^tag /i.test(m) && !/remotesite/i.test(m));
  for (const m of [...cards, ...tpls]) assert.ok(carried.has(GV.tagKey(m.slice(4))), `"${m}" names a tag no workload carries`);
});

// The skeptic, 2026-10-01: with landed 'eu-west-1' (what Go live sets after an eu-west-1 order) Growing's
// policy row read "Internet-facing inspection · 31 workloads · 6 violations" and the totals moved, but the
// finding still read "31 internet-facing workloads have no inspection in path", a figure registered at 31
// over a drill of 6. A finding's head and evidence count by the rule, off the estate as it stands.
test('a finding counts by the rule as the estate stands: a region gone live moves its head with the policy', () => {
  let seen = 0;
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const landed of [null, ...D.ESTATES[view].regionsList.map(r => r.region)]) {
      const v = at(view, { landed });
      for (const f of v.governFindings) {
        const fig = (v.govFigs || []).find(g => g.key === 'g-find-' + f.kind);
        if (!fig) continue;
        const pol = v.polRows.find(p => p.match === { pci: 'tag PCI', uninspected: 'tag Internet-facing' }[f.kind]);
        assert.equal(n(f.head), fig.n, `${view} landed ${landed}: "${f.head}"`);
        if (pol) assert.equal(fig.n, pol.viol, `${view} landed ${landed}: "${f.head}" over a policy of ${pol.viol} violations`);
        if (pol) assert.ok(String(f.ev).includes(fig.n.toLocaleString('en-US')), `${view} landed ${landed}: the evidence "${f.ev}" does not count ${fig.n}`);
        seen++;
      }
      // Nothing left to count, no finding: a PCI finding stands only over PCI violations.
      const pci = v.polRows.find(p => p.match === 'tag PCI');
      if (pci && !pci.viol) assert.ok(!v.governFindings.some(f => f.kind === 'pci'), `${view} landed ${landed}: a PCI finding over none`);
    }
  }
  assert.ok(seen >= 20, `${seen} findings read`);
  // The skeptic's case.
  const g = at('partial', { landed: 'eu-west-1' });
  const un = g.governFindings.find(f => f.kind === 'uninspected');
  assert.equal(n(un.head), g.polRows.find(p => p.name === 'Internet-facing inspection').viol);
});

// Bank scale's segmentation finding read "centralus: 210 workloads, 84 Finance-tagged, one route table",
// a number nothing lists (the rule finds 116 finance-tagged there, the apps table's count).
test('the segmentation finding\'s evidence counts what the inventory lists', () => {
  const est = D.ESTATES.trust, inv = A.inventory(est);
  const f = at('trust').governFindings.find(x => x.kind === 'unsegmented');
  const reg = inv.flatMap(cl => cl.regions).find(r => r.region === 'centralus');
  const fin = GV.tagSet(inv, 'finance').workloads.filter(r => r.region === 'centralus').length;
  assert.equal(fin, 116);
  const m = /^centralus: ([\d,]+) workloads in (\d+) VNets on one Virtual WAN hub, ([\d,]+) of them finance-tagged\.$/.exec(f.ev);
  assert.ok(m, `"${f.ev}"`);
  assert.equal(n(m[1]), reg.wl); assert.equal(+m[2], reg.vpcs.length); assert.equal(n(m[3]), fin);
});

test('the rule: what a policy matches and what breaks it', () => {
  const est = D.ESTATES.partial, inv = A.inventory(est);
  // A path policy: a workload in a VPC with no private path breaks it, and so does an exposed one on AT&T.
  const eu = GV.policySets(est, inv, { match: 'region eu-*', req: 'Private path required' });
  assert.equal(eu.unit, 'workload');
  // `eu-*` is an area, named each cloud's own way: Azure's westeurope and GCP's europe-west1 are in it.
  assert.deepEqual([...new Set(eu.matched.map(r => r.region))], ['eu-west-1', 'westeurope', 'europe-west1']);
  assert.equal(eu.viol.length, eu.matched.length, 'every EU region rides the public internet, so every EU workload breaks it');
  const pci = GV.policySets(est, inv, { match: 'tag PCI', req: 'Private path required' });
  assert.ok(pci.matched.every(r => r.vpc.priv), 'the PCI VPCs are on AT&T');
  assert.deepEqual(pci.viol.map(r => r.w.id), pci.matched.filter(r => r.w.exposed).map(r => r.w.id), 'on AT&T, only the exposed break it');
  // A latency SLO is broken where the region runs above it.
  const gpu = GV.policySets(est, inv, { match: 'tag AI', req: 'Latency SLO 15 ms' });
  assert.ok(gpu.viol.length > 0, 'us-central1 runs above 15 ms');
  assert.ok(gpu.viol.every(r => r.latency > 15) && gpu.matched.filter(r => r.latency > 15).length === gpu.viol.length);
  // A site policy counts sites, rollups at their own count.
  const remote = GV.policySets(D.ESTATES.trust, A.inventory(D.ESTATES.trust), { match: 'tag RemoteSite', req: 'No direct internet path' });
  assert.equal(remote.unit, 'site');
  assert.equal(GV.count(remote.matched, 'site'), 4030);
  assert.equal(GV.count(remote.viol, 'site'), 2850, 'East and Central reach the clouds outside AT&T');
  // No source: a business unit nobody made, a rule the estate cannot measure.
  assert.equal(GV.policyFigures(est, inv, { match: 'remote-site Finance', req: 'Segment intra-tag only' }).matched, null);
  assert.equal(GV.policyFigures(est, inv, { match: 'tag PCI', req: 'Segment intra-tag only' }).viol, null);
  // A business unit the customer made is measured.
  const tags = { 'Charlotte branch': 'Finance', 'Phoenix branch': 'Finance' };
  assert.deepEqual(GV.policyFigures(est, inv, { match: 'remote-site Finance', req: 'Private path required' }, { siteTags: tags }), { unit: 'site', matched: 2, viol: 2 });
});

test('the data says what the rule counts: every policy\'s matched and violations, on every estate', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view], inv = A.inventory(est);
    for (const p of est.policies || []) {
      const f = GV.policyFigures(est, inv, p);
      assert.equal(p.matched, f.matched, `${view} ${p.name}: the data says ${p.matched} matched, the rule ${f.matched}`);
      assert.equal(p.viol, f.viol, `${view} ${p.name}: the data says ${p.viol} violations, the rule ${f.viol}`);
    }
  }
});

test('a policy authored here counts by the same rule, never a share of its matches', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', nowIso: NOW, authoring: { match: 'tag GPU', scope: 'any cloud', req: ['Private path required'] } });
  vals(c).aSimulate();
  const mine = c.state.customPolicies.at(-1);
  const f = GV.policyFigures(D.ESTATES.partial, A.inventory(D.ESTATES.partial), mine);
  assert.equal(mine.matched, f.matched);
  assert.equal(mine.viol, f.viol);
});

test('Govern\'s headline figures equal what its pages list, and the home\'s door prints its figure on the landing', () => {
  for (const view of ESTATES) {
    const all = (v) => { const out = []; for (let p = 0; ; p++) { const w = at(view, { polPage: p }); out.push(...w.polRows); if (!w.polPager.many || (p + 1) * w.polPageSize >= n(w.polPager.label.split(' of ')[1])) break; } return out; };
    const v = at(view), rows = all(v);
    const enforced = rows.filter(p => p.state === 'enforced').length;
    const m = /^(\d+) polic(?:y|ies) enforced\./.exec(v.governVerdict);
    if (view !== 'empty') { assert.ok(m, `${view}: "${v.governVerdict}"`); assert.equal(+m[1], enforced, `${view}: the head says ${m[1]} enforced, the list holds ${enforced}`); }
    const sum = rows.reduce((a, p) => a + (p.viol || 0), 0);
    assert.equal(v.polViolLine, sum ? `${sum.toLocaleString('en-US')} policy ${sum === 1 ? 'violation' : 'violations'}` : 'No policy violations', view);
    if (view === 'empty') continue;
    const home = vals(mkC({ view, estateParam: null, screen: 's0', persona: 'security', nowIso: NOW }));
    const part = home.homeTake.parts.find(p => /polic(y|ies)? violations?|No policy violations/.test(p.t));
    assert.ok(part, `${view}: the Security card names no violations`);
    const c = mkC({ view, estateParam: null, screen: 's0', persona: 'security', nowIso: NOW });
    const door = vals(c).homeTake.parts.find(p => p.t === part.t);
    if (!door.off) {
      door.go();
      const landed = vals(c);
      assert.equal(c.state.tab, 'govern', view);
      assert.ok(String(landed.polViolLine).startsWith(part.t.split(' ')[0]), `${view}: the home says "${part.t}", the landing "${landed.polViolLine}"`);
    }
  }
});

// A tag no workload carries matches none, in words, as "no violations" reads beside it (2026-10-01).
test('a policy over a tag no workload carries reads "no workloads", not a zero', () => {
  const gpu = at('partial').polRows.find(p => p.match === 'tag GPU');
  assert.equal(gpu.matchedLabel, 'no workloads');
  assert.equal(gpu.hasMatchedGo, false);
});

test('a figure with no source says so', () => {
  const v = at('partial');
  const fin = v.polRows.find(p => p.name === 'Finance segmentation');
  assert.equal(fin.matchedLabel, 'Not yet measured');
  assert.equal(fin.hasMatchedGo, false);
  assert.equal(fin.hasViolGo, false);
});
