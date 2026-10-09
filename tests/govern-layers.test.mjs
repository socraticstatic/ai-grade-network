import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as PC from '../naas-policy-compile.js';

// Govern > Layers (2026-10-09, slice 2 of the policy engine: "we need a robust policy engine per layer"). Every policy
// compiled to each layer's enforcement point: four columns in the path's order, tier bands read top to bottom, rows by
// priority, a default per direction pinned at each foot. A row lights its policy in every column, and the bar above opens it.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const lay = (view = 'partial', extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'layers', ...extra });
const TIER_N = Object.fromEntries(PC.POLICY_TIERS.map(t => [t.key, t.n]));

test('Layers is the second Govern tab, its glyph on disk; it lights on its panel and clears a drill like the others', () => {
  const c = lay('partial', { govDrill: { kind: 'x' }, polFilter: 'enforced' });
  const v = vals(c);
  assert.deepEqual(v.govPanels.map(p => p.label), ['Violations & policies', 'Layers', 'Templates', 'Policy engine', 'Tags']);
  const tab = v.govPanels.find(p => p.key === 'layers');
  assert.equal(tab.on, true); assert.equal(tab.icon, 'grid'); assert.ok(onDisk(tab.icon));
  assert.equal(v.govPanelLayers, true);
  tab.go();
  assert.equal(c.state.govDrill, null); assert.equal(c.state.polFilter, null);
});

test('four columns in the path\'s order, each naming its enforcement points and how it combines', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(lay(view));
    assert.deepEqual(v.layCols.map(c => c.label), ['Site', 'Edge', 'Core', 'Cloud'], view);
    assert.deepEqual(v.layCols.map(c => c.combine), ['First match', 'First match', 'Share, then filter', 'Most specific route']);
    assert.deepEqual(v.layCols.find(c => c.key === 'edge').peps.map(p => p.key), ['netbond', 'vsrx']);
    for (const c of v.layCols) { assert.ok(onDisk(c.icon)); for (const p of c.peps) assert.ok(onDisk(p.icon), p.key); }
  }
});

test('rows read in precedence: bands in tier order, priority rising inside a band, a glyph when the point is not there', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const dir of ['o2p', 'p2o']) {
    const v = vals(lay(view, { layDir: dir }));
    for (const c of v.layCols) {
      const tiers = c.bands.map(b => TIER_N[b.tier]);
      assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b), `${view} ${dir} ${c.key}: bands in tier order`);
      for (const b of c.bands) {
        const ps = b.rows.map(r => +r.prio);
        assert.deepEqual(ps, [...ps].sort((a, b2) => a - b2), `${view} ${c.key} ${b.label}: priority rises`);
        for (const r of b.rows) {
          assert.ok(['Deny', 'Allow', 'Manipulate', 'Advertise', 'Always', 'Pass'].includes(r.verb), r.verb);
          assert.ok(onDisk(r.pepIcon), r.pepIcon); if (r.hasCap) assert.ok(onDisk(r.capIcon), r.capIcon);
          assert.ok(r.title && !/—/.test(r.title + r.text + r.sub), r.key);
        }
      }
    }
  }
  // NetBond's own default sheet sits in the Baseline tier of the Edge column, going out.
  const edge = vals(lay('partial')).layCols.find(c => c.key === 'edge');
  const all = (c) => c.bands.flatMap(b => b.rows);
  const v2 = vals(lay('partial', { layPage: 1 })).layCols.find(c => c.key === 'edge');
  assert.ok([...all(edge), ...all(v2)].some(r => r.sub === 'NetBond default sheet' && r.verb === 'Deny' && r.text === 'Default routes'));
  // Inspection on partial reaches only eu-west-1, which rides the internet: its vSRX row says the point is not on the path.
  const insp = all(edge).find(r => r.sub === 'Internet-facing inspection' && r.text === 'Zone policy and IDP');
  assert.equal(insp.capIcon, 'minus-circle');
});

test('each column ends in its default for the direction shown; a default that would deny is in Audit', () => {
  const out = vals(lay('partial')), back = vals(lay('partial', { layDir: 'p2o' }));
  assert.deepEqual(out.layCols.map(c => `${c.dflt.verb}:${c.dflt.text}`), ['Allow:Your LAN', 'Allow:Permit all routes', 'Allow:Any to any in your VRF', 'Deny:Ingress, unless allowed']);
  assert.equal(out.layCols[3].dflt.audit, true);
  assert.deepEqual(back.layCols.map(c => `${c.dflt.verb}:${c.dflt.text}`), ['Allow:Your LAN', 'Allow:Permit all routes', 'Allow:Any to any in your VRF', 'Allow:Egress']);
  assert.deepEqual(out.layDirs.map(d => [d.label, d.on]), [['Site to cloud', true], ['Cloud to site', false]]);
  out.layDirs[1].go();
});

test('a row lights its policy in every column; the bar names it and opens its row in Violations & policies', () => {
  const c = lay('partial');
  let v = vals(c);
  const pci = v.layCols[0].bands.flatMap(b => b.rows).find(r => r.sub === 'PCI private path');
  pci.go();
  v = vals(c);
  assert.equal(v.layHasLit, true); assert.equal(v.layLitName, 'PCI private path'); assert.equal(v.layLitWhere, 'Estate · 10');
  const lit = v.layCols.map(col => col.bands.flatMap(b => b.rows).filter(r => r.lit).length);
  assert.deepEqual(lit, [1, 1, 1, 0], 'its site, edge and core rows going out (its cloud row runs the other way)');
  assert.ok(v.layCols.flatMap(col => col.bands.flatMap(b => b.rows)).filter(r => !r.lit).every(r => r.dim));
  v.layLitOpen();
  assert.equal(c.state.govPanel, 'policies'); assert.equal(c.state.polOpen, 'PCI private path'); assert.equal(c.state.layLit, null);
  // Clicking the lit row again, or the clear button, puts the light out.
  c.setState({ govPanel: 'layers' }); vals(c).layCols[0].bands.flatMap(b => b.rows).find(r => r.sub === 'PCI private path').go();
  vals(c).layLitClear(); assert.equal(vals(c).layHasLit, false);
  // The Policy engine's door to NetBond's baseline row lands Layers going out, on the page that holds it, lit.
  const e = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'engine', layDir: 'p2o' });
  vals(e).engPushed.find(r => r.by === 'NetBond default sheet').byGo();
  const lv = vals(e);
  assert.equal(e.state.govPanel, 'layers'); assert.equal(e.state.layDir, 'o2p');
  assert.equal(lv.layCols.find(x => x.key === 'edge').bands.flatMap(b => b.rows).filter(r => r.lit).length, 1, 'the baseline row is on the page shown, lit');
});

test('the columns page together within a fixed slot, and the head counts in glyphs', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const c = lay(view), v = vals(c);
    for (const col of v.layCols) assert.ok(col.bands.flatMap(b => b.rows).length <= 7, `${view} ${col.key}`);
    if (v.layPager.many) { v.layPager.next(); assert.equal(c.state.layPage, 1); }
    for (const h of v.layHeadChips) { assert.ok(onDisk(h.icon), h.icon); assert.ok(h.title); assert.notEqual(h.t, '0'); }
  }
  // The head counts the direction shown: partial's asserted rows (customer route tables) all run cloud to site.
  assert.deepEqual(vals(lay('partial')).layHeadChips.map(h => h.key), ['rows', 'unenf', 'dead', 'staged']);
  assert.deepEqual(vals(lay('partial', { layDir: 'p2o' })).layHeadChips.map(h => h.key), ['rows', 'assert', 'dead', 'staged']);
  for (const view of ['small', 'empty', 'lastmile']) for (const layDir of ['o2p', 'p2o']) for (const h of vals(lay(view, { layDir })).layHeadChips) assert.notEqual(h.t, '0', `${view} ${layDir} ${h.key}`);
  // Page 2 leaves a column whose rows are on page 1 blank, not "No rows this way".
  const p2 = vals(lay('partial', { layPage: 1 }));
  assert.equal(p2.layPage, 1);
  assert.ok(p2.layCols.every(c => !c.empty), 'every partial column has rows going out');
  // The direction switch starts its direction on page one.
  const c = lay('partial', { layPage: 1 }); vals(c).layDirs[1].go();
  assert.deepEqual([c.state.layDir, c.state.layPage], ['p2o', 0]);
});

test('small and empty estates render their defaults with nothing to light', () => {
  for (const view of ['small', 'empty']) {
    const v = vals(lay(view));
    assert.equal(v.layCols.length, 4); assert.equal(v.layHasLit, false);
    for (const c of v.layCols) assert.ok(c.dflt.text, `${view} ${c.key}`);
  }
});

test('the markup: the panel before Tags, its loops outside any table, svg or select, its state in both constructors', () => {
  const a = HTML.indexOf('<sc-if value="{{ govPanelLayers }}"'), b = HTML.indexOf('<!-- Tags, a Govern tab', a);
  assert.ok(a > 0 && b > a, 'Layers sits before Tags');
  const blk = HTML.slice(a, b);
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
  for (const k of ['layCols', 'lc.bands', 'lb.rows', 'layHeadChips', 'layDirs', 'lc.peps']) assert.match(blk, new RegExp(`<sc-for list="\\{\\{ ${k.replace('.', '\\.')} \\}\\}"`), k);
  assert.match(blk, /<button class="fw-row pick lay-row" aria-pressed="\{\{ lr\.lit \}\}"/);
  assert.match(blk, /<div class="fw-row lay-dflt"/);
  assert.match(blk, /role="tablist" aria-label="Direction"/);
  assert.match(HTML, /layDir: 'o2p', layLit: null, layPage: 0/);
});
