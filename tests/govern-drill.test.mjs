import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The drill rule on Govern (Micah, 2026-09-30: "it all should be drillable";
// "'private path for 5 sites' those kinds of things should be clickable"; "why
// does exposed when i click on it go to logs? that's confusing"). Every figure
// Govern prints registers in govFigs with the number it shows and where it
// lands. Each is clicked from a fresh page on every estate, and the list it
// lands on must name its filter and count exactly that number. A count of
// things never lands on Logs. A drill row opens the thing itself on Discover,
// with a way back to the drill.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.history === 'undefined') globalThis.history = { replaceState: () => {} };
if (typeof globalThis.location === 'undefined') globalThis.location = { pathname: '/', search: '', hash: '' };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CTOR = HTML.split('\n').find(l => l.includes('constructor(p) { super(p); this.state = {')) || '';

const NOW = '2026-10-05T14:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const PANELS = ['policies', 'tags', 'templates'];
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', nowIso: NOW, scanStep: 4, ...patch });
const num = (x) => +String(x).replace(/[^\d.]/g, '');
const total = (pager, shown) => (pager && /of ([\d,]+)/.test(pager.label) ? num(pager.label.match(/of ([\d,]+)/)[1]) : shown);

// Every page of a paged list, read by turning its pages.
function allPages(c, list, pageKey, pager) {
  const out = [];
  for (let p = 0; p < 500; p++) {
    c.state[pageKey] = p;
    const v = vals(c);
    out.push(...v[list]);
    if (!v[pager].many || out.length >= total(v[pager], out.length)) break;
  }
  c.state[pageKey] = 0;
  return out;
}

/** Where a click landed, and how many things the list there counts. */
function landed(c, fig) {
  const s = c.state, v = vals(c), why = `${fig.key} landed on ${s.screen}/${s.tab}/${s.obPage || ''}`;
  assert.ok(!(s.tab === 'observe' && s.obPage === 'logs'), `${fig.key}: a count landed on Logs`);
  assert.equal(s.screen, 's3', why); assert.equal(s.tab, 'govern', why);
  if (fig.lands === 'drill') {
    assert.equal(v.govDrillOn, true, `${fig.key}: no drill opened`);
    assert.ok(v.govDrillLine.includes(fig.n.toLocaleString('en-US')), `${fig.key}: the drill says "${v.govDrillLine}", not ${fig.n}`);
    assert.equal(v.govDrillCrumbs.at(-1).label.split(' ')[0], fig.n.toLocaleString('en-US'), `${fig.key}: the trail ends "${v.govDrillCrumbs.at(-1).label}"`);
    // Sites count at their rollup size (a short list, read whole); everything else one a row, so the pager's total is the count.
    const n = v.govDrillUnit === 'site' ? allPages(c, 'govDrillRows', 'govDrillPage', 'govDrillPager').reduce((a, r) => a + (/^[\d,]+ sites$/.test(r.where) ? num(r.where) : 1), 0)
      : total(v.govDrillPager, v.govDrillRows.length);
    assert.equal(n, v.govDrillN, `${fig.key}: the drill counts ${v.govDrillN} and lists ${n}`);
    return v.govDrillN;
  }
  const [kind, f] = fig.lands.split(':');
  if (kind === 'polFilter') {
    assert.equal(s.polFilter, f, why); assert.equal(v.polFilterOn, true, `${fig.key}: the list does not name its filter`);
    assert.ok(v.polFilterLabel.includes(fig.n.toLocaleString('en-US')), `${fig.key}: "${v.polFilterLabel}"`);
    const rows = allPages(c, 'polRows', 'polPage', 'polPager');
    return f === 'viol' ? rows.reduce((a, p) => a + (p.viol || 0), 0) : rows.length;
  }
  if (kind === 'tagFilter') {
    assert.equal(v.govPanelTags, true, why);
    if (f === 'bare') { assert.equal(v.tagFilterOn, true, `${fig.key}: the list does not name its filter`); assert.ok(v.tagFilterLabel.includes(String(fig.n)), v.tagFilterLabel); }
    else assert.equal(v.tagFilterOn, false, why);
    return allPages(c, 'drawerTags', 'tagPage', 'tagPager').length;
  }
  throw new Error(`${fig.key}: unknown landing ${fig.lands}`);
}

/** Every figure on every Govern tab, on every estate, clicked from a fresh page. One render per
 *  tab; each click starts from the state that render saw (its handlers read that state object, so
 *  it is put back between clicks). */
function walk() {
  const seen = [];
  for (const view of ESTATES) {
    for (const panel of PANELS) {
      const c = at(view, { govPanel: panel }), snap = { ...c.state };
      for (const fig of vals(c).govFigs || []) {
        for (const k of Object.keys(c.state)) if (!(k in snap)) delete c.state[k];
        Object.assign(c.state, snap);
        fig.go();
        assert.equal(landed(c, fig), fig.n, `${view} ${panel} ${fig.key}: shows ${fig.n}, lands on a different count`);
        seen.push(`${view}:${panel}:${fig.key}`);
      }
    }
  }
  return seen;
}

test('state: the drill keys live in defaults() and the markup constructor alike', () => {
  const d = defaults();
  for (const k of ['govDrill', 'govDrillPage', 'polFilter', 'tagFilter', 'govBack', 'optShow']) {
    assert.ok(k in d, `${k} missing from defaults()`);
    assert.ok(CTOR.includes(` ${k}: `), `${k} missing from the markup constructor`);
  }
});

test('Govern: every figure it prints lands on a list that names it and counts exactly that figure', () => {
  const seen = walk();
  for (const k of [
    'partial:policies:g-verdict-enforced', 'partial:policies:g-verdict-finding', 'partial:policies:g-viol-total',
    'partial:policies:g-find-ipsec', 'partial:policies:g-find-pci', 'partial:policies:g-find-uninspected',
    'partial:policies:g-pol-PCI private path-matched', 'partial:policies:g-pol-PCI private path-viol', 'partial:policies:g-pol-EU residency-viol',
    'partial:tags:g-tags-all', 'partial:tags:g-tags-bare', 'partial:tags:g-tag-pci-vpcs', 'partial:tags:g-tag-pci-wl', 'partial:tags:g-tag-pci-regions',
    'partial:tags:g-tag-pci-clouds', 'partial:tags:g-tag-pci-exposed', 'partial:tags:g-tag-shared-services-public',
    'partial:templates:g-tpl-pci', 'partial:templates:g-tpl-remote', 'partial:templates:g-tpl-inet',
    'small:policies:g-verdict-unenforced', 'mature:policies:g-verdict-finding', 'trust:policies:g-pol-Remote sites, no direct internet-viol',
  ]) assert.ok(seen.includes(k), `${k} is not wired`);
});

test('a drill row opens the thing itself on Discover, and Back to Govern reopens the drill', () => {
  // A workload: its subnet on Your clouds.
  const c = at('partial');
  vals(c).govFigs.find(f => f.key === 'g-find-pci').go();
  const d = c.state.govDrill;
  const row = vals(c).govDrillRows[0];
  row.go();
  assert.equal(c.state.screen, 's1'); assert.equal(c.state.estPanel, 'clouds');
  assert.match(c.state.cloudTrailE.at(-1), /^sn:/, 'a workload opens its subnet');
  const on = vals(c);
  assert.ok(on.cloudRows.some(r => r.key === row.key), 'the subnet lists the workload');
  assert.equal(on.govBackOn, true);
  on.govBackGo();
  assert.equal(c.state.tab, 'govern'); assert.deepEqual(c.state.govDrill, d);
  assert.equal(vals(c).govDrillOn, true);
  // A site: its place on Your sites.
  const c2 = at('partial');
  vals(c2).govFigs.find(f => f.key === 'g-find-ipsec').go();
  const site = vals(c2).govDrillRows[0];
  site.go();
  assert.equal(c2.state.estPanel, 'sites');
  assert.equal(c2.state.placeTrail.at(-1), 'site:' + site.key);
  assert.equal(vals(c2).govBackOn, true);
  // Anywhere else, the way back is gone: it belongs to the trip it came with.
  vals(c2).rail.find(r => r.key === 'Home').go();
  assert.equal(c2.state.govBack, null);
  assert.equal(vals(c2).govBackOn, false);
});

test('See what is breaking it opens the set its violations count, with the move that closes it; Discover marks what it lands on', () => {
  const c = at('partial');
  const pci = vals(c).polRows.find(p => p.name === 'PCI private path');
  pci.actGo();
  const v = vals(c);
  assert.equal(c.state.tab, 'govern', 'it left for the map');
  assert.equal(v.govDrillOn, true); assert.equal(v.govDrillN, pci.viol);
  assert.equal(v.hasGovDrillAct, true);
  assert.equal(v.govDrillAct.label, 'Hosted VPC in us-east-1 with the policy enforced');
  const first = v.govDrillRows[0];
  first.go();
  const row = vals(c).cloudRows.find(r => r.key === first.key);
  // Discover's own word and amber for an exposed workload; its rows read w.public, which no workload carries.
  assert.equal(row.dot, 'var(--warning)');
  assert.match(row.sub, /exposed/);
});

test('a tab, the rail or a door from elsewhere opens Govern with no drill or filter left over', () => {
  const c = at('partial');
  vals(c).govFigs.find(f => f.key === 'g-pol-PCI private path-viol').go();
  assert.equal(vals(c).govDrillOn, true);
  vals(c).govPanels.find(g => g.key === 'tags').go();
  vals(c).govPanels.find(g => g.key === 'policies').go();
  assert.equal(vals(c).govDrillOn, false);
  vals(c).govFigs.find(f => f.key === 'g-verdict-enforced').go();
  assert.equal(vals(c).polFilterOn, true);
  vals(c).rail.find(r => r.key === 'Govern').go();
  assert.equal(vals(c).polFilterOn, false);
  // Another estate is another set: the estate switch leaves no drill behind.
  vals(c).govFigs.find(f => f.key === 'g-pol-EU residency-viol').go();
  vals(c).setView({ target: { value: 'mature' } });
  assert.equal(c.state.govDrill, null);
  assert.equal(vals(c).govDrillOn, false);
});

test('the markup binds every figure as a button and the drill as a paged list', () => {
  const gov = HTML.slice(HTML.indexOf('<!-- Govern -->'), HTML.indexOf('<!-- Observe -->'));
  for (const b of ['{{ vp.go }}', '{{ hp.go }}', '{{ polViolGo }}', '{{ p.matchedGo }}', '{{ p.violGo }}', '{{ tsb.go }}', '{{ dt.expo.go }}', '{{ dt.expoWl.go }}', '{{ tsp.go }}', '{{ e.figGo }}', '{{ gd.go }}', '{{ clearPolFilter }}', '{{ clearTagFilter }}'])
    assert.ok(HTML.includes(`onClick="${b}"`), `${b} is not a button`);
  assert.match(gov, /<sc-for list="\{\{ govDrillRows \}\}"/);
  assert.match(gov, /<sc-if value="\{\{ govDrillOn \}\}"/);
  assert.ok(gov.includes('{{ govDrillPager.label }}'), 'the drill does not page');
  assert.ok(gov.includes('{{ govDrillLine }}'), 'the drill does not name its filter');
  for (const g of ['govListPolicies', 'govListTags', 'govListTemplates']) assert.match(gov, new RegExp(`<sc-if value="\\{\\{ ${g} \\}\\}"`));
  // The way back sits on the two Discover lists a drill row opens.
  assert.equal((HTML.match(/onClick="\{\{ govBackGo \}\}"/g) || []).length, 2);
});

// Cost > Optimize: each row's figure opens exactly its set, in place.
test('Optimize: each row\'s figure opens its row to every part, and the parts add up to the figure', () => {
  let n = 0;
  for (const view of ESTATES) {
    const c = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'optimize', nowIso: NOW });
    for (const r of vals(c).optRows.filter(x => x.figureF)) {
      assert.equal(r.hasFigGo, true, `${view} ${r.key}: "${r.figureF}" is not a button`);
      r.figGo();
      assert.equal(c.state.optShow, r.key, `${view} ${r.key}`);
      assert.equal(c.state.tab, 'cost'); assert.equal(c.state.costPanel, 'optimize');
      const open = vals(c).optRows.find(x => x.key === r.key);
      assert.equal(open.lineRows.length, open.lines.length, `${view} ${r.key}: the opened row still hides parts`);
      const sum = open.lineRows.reduce((a, l) => a + l.partN, 0);
      const want = r.key === 'capacity' && !r.resize ? open.lines.length : r.figure;
      assert.equal(sum, want, `${view} ${r.key}: "${r.figureF}" opens parts that add to ${sum}`);
      assert.ok(open.lineRows.every(l => l.partF), `${view} ${r.key}: a part has no figure`);
      c.state.optShow = null; n++;
    }
  }
  assert.ok(n >= 9, `${n} figures checked`);
  assert.ok(HTML.includes('onClick="{{ o.figGo }}"'), 'the Optimize figure is not a button');
});
