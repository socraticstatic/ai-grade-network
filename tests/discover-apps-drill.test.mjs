import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Discover's apps, every figure a door (the skeptic, 2026-10-01). The apps table's pci row
// printed "58" workloads and "6" exposed, and the whole row was one button, "Open pci's
// records", that opened Observe Logs: Micah's "why does exposed when i click on it go to
// logs?" still held. The Apps ring's legend ("finance 68") was not a button, and its door
// "Tags ›" opened a page that counted another way. Now each count opens exactly the set it
// counts, on Govern > Tags (the one page that lists a tag's workloads), with a way back; only
// the traffic figure opens Logs. A count of things never lands on Logs.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.history === 'undefined') globalThis.history = { replaceState: () => {} };
if (typeof globalThis.location === 'undefined') globalThis.location = { pathname: '/', search: '', hash: '' };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CTOR = HTML.split('\n').find(l => l.includes('constructor(p) { super(p); this.state = {')) || '';

const NOW = '2026-10-05T14:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small'];
const glance = (view) => mkC({ view, estateParam: null, screen: 's1', discoverView: 'estate', estPanel: 'glance', scanStep: 4, nowIso: NOW });
const num = (x) => +String(x).replace(/[^\d]/g, '');
const fresh = (c, snap) => { for (const k of Object.keys(c.state)) if (!(k in snap)) delete c.state[k]; Object.assign(c.state, snap); };

/** The drill a door opened: on Govern > Tags, naming its figure, listing exactly that many. */
function landsOn(c, n, why) {
  const s = c.state, v = vals(c);
  assert.ok(!(s.tab === 'observe' && s.obPage === 'logs'), `${why}: a count landed on Logs`);
  assert.equal(s.screen, 's3', why); assert.equal(s.tab, 'govern', why);
  assert.equal(v.govDrillOn, true, `${why}: no drill opened`);
  assert.equal(v.govDrillN, n, `${why}: shows ${n}, the drill counts ${v.govDrillN}`);
  assert.ok(v.govDrillLine.includes(n.toLocaleString('en-US')), `${why}: the drill says "${v.govDrillLine}"`);
  const total = v.govDrillPager.many ? num(v.govDrillPager.label.split(' of ')[1]) : v.govDrillRows.length;
  assert.equal(total, n, `${why}: the drill lists ${total}`);
  assert.equal(v.govFromOn, true, `${why}: no way back to Discover`);
  return v;
}

test('state: the way back to Discover lives in defaults() and the markup constructor alike', () => {
  assert.ok('govFrom' in defaults());
  assert.ok(CTOR.includes(' govFrom: '), 'govFrom missing from the markup constructor');
});

test('the apps table: workloads, exposed, where it runs and on AT&T each open exactly their set; traffic opens Logs', () => {
  let n = 0;
  for (const view of ESTATES) {
    const c = glance(view), snap = { ...c.state };
    for (const a of vals(c).appAll) {
      fresh(c, snap); vals(c).appAll.find(x => x.key === a.key).wlGo();
      landsOn(c, a.wl, `${view} ${a.key} workloads`);
      if (a.exposed) { fresh(c, snap); vals(c).appAll.find(x => x.key === a.key).exposedGo(); landsOn(c, a.exposed, `${view} ${a.key} exposed`); }
      else assert.equal(a.hasExposedGo, false, `${view} ${a.key}: "None" is a button`);
      fresh(c, snap); vals(c).appAll.find(x => x.key === a.key).runsGo();
      const runs = landsOn(c, a.regionsN, `${view} ${a.key} runs in`);
      assert.equal(runs.govDrillUnit, 'region');
      if (a.onAttN) { fresh(c, snap); vals(c).appAll.find(x => x.key === a.key).onAttGo();
        const on = landsOn(c, a.onAttN, `${view} ${a.key} on AT&T`);
        assert.ok(on.govDrillLine.includes(a.onAttF), `${view} ${a.key}: "${a.onAttF}" lands on "${on.govDrillLine}"`); }
      else assert.equal(a.hasOnAttGo, false, `${view} ${a.key}: "0%" is a button`);
      // Traffic is a traffic figure: its records, on Logs, filtered to the tag.
      fresh(c, snap); vals(c).appAll.find(x => x.key === a.key).gbpsGo();
      assert.equal(c.state.obPage, 'logs'); assert.equal(c.state.logQ, a.key);
      n++;
    }
  }
  assert.ok(n >= 15, `${n} apps walked`);
});

test('the PCI row: 58 opens the 58 PCI workloads and 6 the 6 exposed, as Govern > Tags > pci does', () => {
  const c = glance('partial'), snap = { ...c.state };
  const pci = vals(c).appAll.find(a => a.key === 'pci');
  assert.equal(pci.wl, 58); assert.equal(pci.exposed, 6);
  pci.exposedGo();
  const v = vals(c);
  assert.deepEqual(v.govDrillCrumbs.map(x => x.label), ['Tags', 'pci', '6 workloads']);
  const g = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'tags', nowIso: NOW, scanStep: 4 });
  vals(g).govFigs.find(f => f.key === 'g-tag-pci-exposed').go();
  assert.deepEqual(vals(c).govDrillRows.map(r => r.key), vals(g).govDrillRows.map(r => r.key), 'not the set Govern > Tags > pci opens');
  // And back to Discover's apps, where it came from.
  vals(c).govFromGo();
  assert.equal(c.state.screen, 's1'); assert.equal(c.state.estPanel, 'glance');
  fresh(c, snap);
});

test('the Apps ring: each legend entry, the centre and the door open what they count', () => {
  for (const view of ESTATES) {
    const c = glance(view), snap = { ...c.state };
    const ring = vals(c).glanceRings.find(r => r.key === 'apps');
    for (const lg of ring.legend) {
      fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'apps').legend.find(x => x.key === lg.key).go();
      landsOn(c, num(lg.n), `${view} legend ${lg.label}`);
    }
    // "8 apps" and "Tags ›" open Tags, where the same apps are listed as tags.
    for (const door of ['centreGo', 'go']) {
      fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'apps')[door]();
      const v = vals(c);
      assert.equal(c.state.tab, 'govern'); assert.equal(v.govPanelTags, true, `${view} ${door}`);
      assert.match(v.tagSubParts[0].text, new RegExp(`^${num(ring.centre)} tags?$`), `${view} ${door}: "${ring.centre} ${ring.centreSub}" lands on "${v.tagSubParts[0].text}"`);
    }
    // "N workloads exposed" opens the N.
    const m = /^([\d,]+) workloads? exposed$/.exec(ring.head);
    if (m && num(m[1])) { fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'apps').headGo(); landsOn(c, num(m[1]), `${view} ${ring.head}`); }
  }
});

// The Workloads ring counts every workload by where its region rides; the Clouds ring a cloud's regions.
test('the Workloads ring and the Clouds legend open what they count', () => {
  for (const view of ESTATES) {
    const c = glance(view), snap = { ...c.state };
    const wr = vals(c).glanceRings.find(r => r.key === 'workloads');
    for (const lg of wr.legend.filter(x => num(x.n) > 0)) {
      fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'workloads').legend.find(x => x.key === lg.key).go();
      landsOn(c, num(lg.n), `${view} Workloads ${lg.label}`);
    }
    fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'workloads').centreGo(); landsOn(c, num(wr.centre), `${view} Workloads centre`);
    const m = /^([\d,]+) on the internet$/.exec(wr.head);
    if (m) { fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'workloads').headGo(); landsOn(c, num(m[1]), `${view} ${wr.head}`); }
    // A cloud's regions, one step down Your clouds.
    const cr = vals(c).glanceRings.find(r => r.key === 'clouds');
    for (const lg of cr.legend) {
      fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'clouds').legend.find(x => x.key === lg.key).go();
      const v = vals(c);
      assert.equal(c.state.estPanel, 'clouds'); assert.deepEqual(c.state.cloudTrailE, ['cloud:' + lg.label]);
      assert.equal(v.cloudRows.length, num(lg.n), `${view} ${lg.label}: the legend says ${lg.n} regions, Your clouds lists ${v.cloudRows.length}`);
    }
  }
});

// The Sites ring's legend counts sites by their first mile: each opens Your sites on that access, in place.
test('the Sites legend opens Your sites on that first mile, at its count', () => {
  for (const view of ESTATES) {
    const c = glance(view), snap = { ...c.state };
    for (const lg of vals(c).glanceRings.find(r => r.key === 'sites').legend) {
      fresh(c, snap); vals(c).glanceRings.find(r => r.key === 'sites').legend.find(x => x.key === lg.key).go();
      const v = vals(c);
      assert.equal(c.state.screen, 's1'); assert.equal(c.state.estPanel, 'sites', `${view} ${lg.label}`);
      assert.equal(v.placeCrumbs.at(-1).label, lg.label, `${view}: the trail ends "${v.placeCrumbs.at(-1).label}", not ${lg.label}`);
      assert.match(v.placeLine, new RegExp(`· ${lg.n} sites?$`), `${view} ${lg.label} ${lg.n}: lands on "${v.placeLine}"`);
    }
    // "25 sites" opens Your sites at the top, every region, the same 25.
    const ring = vals(c).glanceRings.find(r => r.key === 'sites');
    fresh(c, snap); ring.centreGo();
    assert.equal(c.state.estPanel, 'sites'); assert.deepEqual(c.state.placeTrail, []);
    assert.match(vals(c).placeLine, new RegExp(`· ${ring.centre} sites?$`), view);
  }
});

test('the markup: the apps row is no longer one button to the records; each figure is', () => {
  assert.ok(!HTML.includes('onClick="{{ ap.go }}"'), 'the row still opens the records');
  assert.equal((HTML.match(/title="Open \{\{ ap\.name \}\}'s records"/g) || []).length, 1, 'only Traffic opens the records');
  assert.match(HTML, /<button class="gv-fig" onClick="\{\{ ap\.gbpsGo \}\}" title="Open \{\{ ap\.name \}\}'s records">/);
  for (const b of ['{{ ap.wlGo }}', '{{ ap.exposedGo }}', '{{ ap.runsGo }}', '{{ ap.onAttGo }}', '{{ ap.gbpsGo }}', '{{ lg.go }}', '{{ gr.centreGo }}', '{{ gr.headGo }}', '{{ govFromGo }}'])
    assert.ok(HTML.includes(`onClick="${b}"`), `${b} is not a button`);
});
