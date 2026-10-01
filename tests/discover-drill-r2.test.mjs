import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, estateFor } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as CF from '../naas-connect-flow.js';
import * as S from '../naas-sites.js';
import { ringHit } from '../naas-drill.js';

// Discover > Estate, the skeptic's second pass (2026-10-01). Each test names the
// failure it pins; the walks are the skeptic's clicks, read from vals.
//
//  1. A site filter recomputed the rollups' metro split on the filtered sites, so
//     Established's AVPN sites read "Texas 83" under Nationwide, a state with none.
//  2. The moves and Andi on a place counted the whole rollup it sits in: Florida,
//     709 sites, offered "Move 1,640 sites to AT&T".
//  3. Set policy started a policy that simulated "40 matched" whatever it came from.
//  4. Attach on a set across clouds opened an order the flow refuses (one cloud).
//  5. p95 opened a path that read another latency.
//  6. A ring's small segments had no legend door and an arc too thin to click.
//  7. The new filter stayed on where nothing showed it, and the tiles beside it
//     counted the whole estate.
//  8. "New in the last the last hour".
//  9. Ask Andi, and a connection panel left open, ran Your clouds past the fold.
// 10. Your sites' regions carried no cost; "Open its finding" opened a snoozed
//     finding about another set.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const ESTATES = ['partial', 'mature', 'trust', 'small'];
const num = (s) => { const m = /\d[\d,]*/.exec(String(s)); return m ? +m[0].replace(/,/g, '') : 0; };
const disc = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's1', scanStep: 4, estPanel: 'glance', ...patch });
const EV = { stopPropagation() {}, detail: 0 };
const copyOf = (s) => { const c = mkC({}); Object.assign(c.state, JSON.parse(JSON.stringify(s))); return c; };
const COUNTS = /^([\d,]+) sites? · ([\d,]+) AT&T · ([\d,]+) non-AT&T/;
const countsOf = (row) => { const m = COUNTS.exec(row.access || ''); return m ? { n: num(m[1]), att: num(m[2]), out: num(m[3]) } : null; };
const sitesV = (view, pf, trail, page = 0, extra = {}) => vals(disc(view, { estPanel: 'sites', placeFilter: pf || null, placeTrail: trail.slice(), placePage: page, ...extra }));
/** Every row of a Your sites list, across its pages. */
function allPlaceRows(view, pf, trail) {
  const v0 = sitesV(view, pf, trail);
  const total = num(String(v0.placePager.label).split(' of ')[1] || v0.placeRows.length);
  const rows = [...v0.placeRows];
  for (let p = 1; rows.length < total && p < 60; p++) rows.push(...sitesV(view, pf, trail, p).placeRows);
  return { v: v0, rows };
}
/** The trail a row's own drill opens. */
function intoOf(view, pf, trail, key, page = 0) {
  const c = disc(view, { estPanel: 'sites', placeFilter: pf || null, placeTrail: trail.slice(), placePage: page });
  const row = vals(c).placeRows.find(r => r.key === key);
  if (!row || !row.canGo) return null;
  row.go(EV);
  return c.state.placeTrail.slice();
}
const siteKeysOf = (view) => {
  const est = estateFor(disc(view).state);
  const bu = vals(disc(view, { estPanel: 'bu' })).buList.filter(b => b.n).map(b => 'bu:' + b.name);
  return ['att', 'outside', 'single', 'mode:ipsec', 'mode:sdwan', ...new Set((est.sites || []).map(x => 'prim:' + ((S.servicesOf(x)[0] || {}).key || 'other'))), ...bu];
};

test('1. a site filter keeps the estate\'s places: every filtered row is its unfiltered row\'s share', () => {
  for (const view of ESTATES) {
    for (const pf of siteKeysOf(view)) {
      const walk = (trail, depth) => {
        const U = allPlaceRows(view, null, trail), F0 = allPlaceRows(view, pf, trail);
        const at = `${view} ${pf} @ ${trail.join(' > ') || 'root'}`;
        for (const r of F0.rows) {
          const u = U.rows.find(x => x.key === r.key);
          assert.ok(u, `${at}: "${r.name}" is not a place the estate has there (${U.rows.map(x => x.name).join(', ')})`);
          const fc = countsOf(r), uc = countsOf(u);
          if (fc && uc) {
            assert.ok(fc.n <= uc.n, `${at} ${r.name}: ${fc.n} sites filtered, ${uc.n} unfiltered`);
            if (pf === 'att') assert.equal(fc.n, uc.att, `${at} ${r.name}: on AT&T reads ${fc.n}, the row's AT&T count is ${uc.att}`);
            if (pf === 'outside') assert.equal(fc.n, uc.out, `${at} ${r.name}: outside AT&T reads ${fc.n}, the row's non-AT&T count is ${uc.out}`);
          }
          if (depth < 2 && fc) { const into = intoOf(view, pf, trail, r.key); if (into && into.length > trail.length) walk(into, depth + 1); }
        }
      };
      walk([], 0);
    }
  }
});

test('1. the skeptic\'s repros: Nationwide\'s AVPN sites, Florida outside AT&T', () => {
  const avpn = allPlaceRows('mature', 'prim:avpn', ['region:Nationwide']).rows.map(r => `${r.name} ${countsOf(r) ? countsOf(r).n : ''}`.trim());
  const all = allPlaceRows('mature', null, ['region:Nationwide']).rows;
  assert.ok(!avpn.some(x => /^Texas/.test(x)), `Nationwide's AVPN sites read ${avpn.join(', ')}`);
  for (const r of all.filter(x => countsOf(x) && /Arizona|Colorado|Georgia|Illinois|Washington/.test(x.name))) assert.ok(avpn.includes(`${r.name} ${countsOf(r).n}`), `${r.name} ${countsOf(r).n} is not under AVPN (${avpn.join(', ')})`);
  const us = allPlaceRows('trust', null, ['region:US East']).rows, fl = us.find(r => r.name === 'Florida');
  const out = allPlaceRows('trust', 'outside', ['region:US East']).rows.find(r => r.name === 'Florida');
  assert.equal(countsOf(out).n, countsOf(fl).out, 'Florida outside AT&T');
  const into = intoOf('trust', null, ['region:US East'], fl.key);
  const c = disc('trust', { estPanel: 'sites', placeTrail: ['region:US East'] });
  vals(c).placeRows.find(r => r.key === fl.key).parts.find(p => p.key === 'out').go(EV);
  const v = vals(c);
  assert.deepEqual(c.state.placeTrail, into);
  assert.equal(v.placeSitesN, countsOf(fl).out, `Florida's ${countsOf(fl).out} non-AT&T landed on "${v.placeLine}"`);
  const unf = vals(disc('trust', { estPanel: 'sites', placeTrail: into }));
  const keys = new Set(unf.placeRows.map(r => r.key));
  assert.ok(v.placeRows.filter(r => !/^more:/.test(r.key)).every(r => keys.has(r.key)), `Florida outside AT&T lists other sites: ${v.placeRows.map(r => r.name).join(', ')} against ${unf.placeRows.map(r => r.name).join(', ')}`);
});

// What a move or Andi says it holds, and what the order it starts carries.
const moveN = (a) => num(a.label);
function orderSitesN(c) {
  const cp = c.state.compose || {};
  if (cp.bulk) return cp.qty || 1;
  return ((cp.prefillSets || {}).sites || []).reduce((a, n) => a + S.countOf(n), 0);
}

test('2. a place\'s moves and Andi hold the place\'s sites, not the whole rollup it sits in', () => {
  for (const view of ESTATES) {
    for (const pf of [null, 'outside', 'att', 'single']) {
      const walk = (trail, depth, parentCounts) => {
        const v = sitesV(view, pf, trail);
        const at = `${view} ${pf || 'all'} @ ${trail.join(' > ') || 'root'}`;
        const andi = v.placeActs.find(a => a.key === 'andi');
        if (andi) { const c = copyOf(disc(view, { estPanel: 'sites', placeFilter: pf, placeTrail: trail.slice() }).state); vals(c).placeActs.find(a => a.key === 'andi').go(EV);
          assert.equal(num(c.state.andiScope.lead.split(': ')[1]), v.placeSitesN, `${at}: Andi reads "${c.state.andiScope.lead}", the list holds ${v.placeSitesN}`); }
        for (const a of v.placeActs.filter(x => x.key === 'move' || x.key === 'backup')) {
          if (a.key === 'move' && parentCounts && pf !== 'att') assert.equal(moveN(a), pf === 'outside' ? v.placeSitesN : parentCounts.out, `${at}: "${a.label}" against the place's ${parentCounts.out} non-AT&T`);
          const c = disc(view, { estPanel: 'sites', placeFilter: pf, placeTrail: trail.slice() }); vals(c).placeActs.find(x => x.key === a.key).go(EV);
          assert.equal(c.state.screen, 's4', `${at} ${a.label}`);
          if (a.key === 'move') assert.equal(orderSitesN(c), moveN(a), `${at}: "${a.label}" ordered ${orderSitesN(c)} sites`);
          assert.ok(!/1,640|4,054/.test(c.state.compose.note || '') || /1,640|4,054/.test(a.label), `${at}: the note "${c.state.compose.note}" names the whole rollup`);
        }
        if (depth >= 3) return;
        for (const r of v.placeRows.slice(0, 4)) { const cc = countsOf(r); const into = intoOf(view, pf, trail, r.key); if (into && into.length > trail.length) walk(into, depth + 1, cc); }
      };
      walk([], 0, null);
    }
  }
  // The skeptic's: Bank scale Florida is 709 sites outside AT&T; Established Arizona 33 on AT&T.
  const fl = sitesV('trust', null, ['region:US East', 'state:FL']);
  assert.equal(fl.placeActs.find(a => a.key === 'move').label, 'Move 709 sites to AT&T');
  const c = disc('trust', { estPanel: 'sites', placeTrail: ['region:US East', 'state:FL'] }); vals(c).placeActs.find(a => a.key === 'move').go(EV);
  assert.match(c.state.compose.note, /Florida/); assert.match(c.state.compose.note, /709 sites/); assert.equal(c.state.compose.qty, 709);
  const az = disc('mature', { estPanel: 'sites', placeTrail: ['region:Nationwide', 'state:AZ'] }); vals(az).placeActs.find(a => a.key === 'andi').go(EV);
  assert.match(az.state.andiScope.lead, /^Arizona: 33 sites, 33 on AT&T/);
});

/** Every landing Discover offers with its moves: the cloud and site sets the figures open. */
function landings(view) {
  const out = [];
  const add = (where, patch) => out.push({ where, patch: { estPanel: 'clouds', ...patch } });
  add('all regions', { cloudFilter: { unit: 'region' } });
  add('private regions', { cloudFilter: { unit: 'region', state: 'priv' } });
  add('regions on the internet', { cloudFilter: { unit: 'region', state: 'pub' } });
  add('all workloads', { cloudFilter: { unit: 'workload' } });
  add('exposed workloads', { cloudFilter: { unit: 'workload', state: 'exposed' } });
  add('workloads on AT&T', { cloudFilter: { unit: 'workload', state: 'att' } });
  add('workloads on the internet', { cloudFilter: { unit: 'workload', state: 'internet' } });
  add('attached VPCs', { cloudFilter: { unit: 'vpc', state: 'attached' } });
  add('all apps', { cloudFilter: { unit: 'app' } });
  add('new', { newOnly: true });
  for (const a of vals(disc(view)).appAll) add(`tag ${a.name}`, { cloudFilter: { unit: 'workload', tag: a.name } });
  for (const cl of [...new Set((estateFor(disc(view).state).regionsList || []).map(r => r.cloud))]) add(`cloud ${cl}`, { cloudTrailE: ['cloud:' + cl] });
  const r0 = (estateFor(disc(view).state).regionsList || [])[0];
  if (r0) add(`region ${r0.region}`, { cloudTrailE: ['cloud:' + r0.cloud, 'region:' + r0.region] });
  for (const pf of siteKeysOf(view)) out.push({ where: `sites ${pf}`, patch: { estPanel: 'sites', placeFilter: pf } });
  out.push({ where: 'all sites', patch: { estPanel: 'sites' } });
  return out;
}

test('3. Set policy carries its set: Simulate matches the count the landing reads', () => {
  for (const view of ESTATES) {
    for (const L of landings(view)) {
      const c = disc(view, L.patch), v = vals(c);
      const acts = L.patch.estPanel === 'clouds' ? v.cloudActs : v.placeActs;
      const pol = acts.find(a => a.key === 'policy');
      if (!pol) continue;
      // A filtered list is the set; a cloud or a region with no filter is its workloads, the
      // figure its row reads ("NetBond · 89 workloads"), as a region policy has always matched.
      const n = L.patch.estPanel === 'sites' ? v.placeSitesN : v.hasCloudFilter ? v.cloudListN
        : vals(disc(view, { ...L.patch, cloudFilter: { unit: 'workload' } })).cloudListN;
      pol.go(EV);
      const before = (c.state.customPolicies || []).length;
      vals(c).aSimulate();
      const p = c.state.customPolicies[before];
      assert.ok(p, `${view} ${L.where}: Simulate made no policy`);
      assert.equal(p.matched, n, `${view} ${L.where}: Simulate reads ${p.matched} matched, the landing ${n}`);
      assert.ok(p.viol >= 0 && p.viol <= p.matched, `${view} ${L.where}: ${p.viol} violations of ${p.matched}`);
    }
  }
});

test('4. Attach starts an order the flow can take: one cloud an order, named on the button', () => {
  const check = (view, where, c, label) => {
    assert.equal(c.state.screen, 's4', `${view} ${where}`);
    const est = estateFor(c.state);
    const f = CF.flowOf(c.state.compose, est);
    assert.equal(CF.blockOf('provider', f), '', `${view} ${where} "${label}": ${CF.blockOf('provider', f)}`);
    const clouds = CF.cloudsOf(f);
    assert.equal(clouds.length, 1, `${view} ${where}: ${clouds.join(', ')}`);
    const n = f.regions.length;
    assert.ok(n === 1 ? label.includes(f.regions[0].split(' ').pop()) : label.includes(`${n} ${clouds[0]} regions`), `${view} ${where}: "${label}" does not say what the order holds (${f.regions.join(', ')})`);
  };
  for (const view of ESTATES) {
    for (const L of landings(view).filter(x => x.patch.estPanel === 'clouds')) {
      const v = vals(disc(view, L.patch)), a = v.cloudActs.find(x => x.key === 'attach');
      if (!a) continue;
      const c = disc(view, L.patch); vals(c).cloudActs.find(x => x.key === 'attach').go(EV);
      check(view, L.where, c, a.label);
    }
    for (const g of vals(disc(view)).glanceGaps.filter(x => /^Attach/.test(x.cta))) {
      const c = disc(view); vals(c).glanceGaps.find(x => x.key === g.key).go(EV);
      check(view, `gap ${g.title}`, c, g.cta);
    }
  }
  // Growing's five public regions span AWS, Azure and GCP: the first order is one cloud's, and the rest wait their turn.
  const v = vals(disc('partial', { estPanel: 'clouds', cloudFilter: { unit: 'region', state: 'pub' } }));
  const c = disc('partial', { estPanel: 'clouds', cloudFilter: { unit: 'region', state: 'pub' } }); vals(c).cloudActs.find(x => x.key === 'attach').go(EV);
  assert.match(c.state.compose.note, /then|next/i, `the note "${c.state.compose.note}" does not say the other clouds come next`);
  assert.ok(v.cloudSetPub.length === 5);
});

test('5. p95 opens the workloads whose path sets it, and the landing reads the same latency', () => {
  for (const view of ESTATES) {
    const est = estateFor(disc(view).state);
    for (const a of vals(disc(view)).appAll) {
      const c = disc(view); vals(c).appAll.find(x => x.key === a.key).p95Go(EV);
      const v = vals(c), where = `${view} ${a.name} p95 ${a.p95F}`;
      assert.equal(c.state.screen, 's1', where); assert.ok(v.estPanelClouds, `${where}: not on Your clouds`);
      assert.ok(String(v.cloudLine).includes(a.p95F), `${where}: the landing reads "${v.cloudLine}"`);
      const f = c.state.cloudFilter;
      assert.equal(f.tag, a.name, where);
      for (const rg of f.regions) { const r = est.regionsList.find(x => x.region === rg); assert.equal(`${r.priv ? r.fab : r.pub} ms`, a.p95F, `${where}: ${rg} is not the path at ${a.p95F}`); }
      assert.ok(v.cloudListN > 0 && v.cloudActs.length >= 1, where);
    }
  }
});

test('6. every segment of a ring has a legend door the keyboard reaches, and an arc wide enough to click', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    for (const g of v.glanceRings) {
      const where = `${view} ${g.key} ring`;
      assert.ok(g.legend.length <= 4, `${where}: ${g.legend.length} legend rows`);
      assert.deepEqual(g.legend.map(l => l.key), g.segs.map(s => s.key), `${where}: a segment has no legend entry`);
      for (const sg of g.segs) {
        assert.ok(sg.to - sg.from >= 2.5 - 1e-9, `${where} ${sg.label}: an arc of ${(sg.to - sg.from).toFixed(2)}% is too thin to click`);
        const mid = (sg.from + sg.to) / 2 / 100 * 2 * Math.PI, rad = 35;
        assert.equal(ringHit(g.segs, Math.sin(mid) * rad, -Math.cos(mid) * rad, 42, 29), g.segs.indexOf(sg), `${where}: the middle of ${sg.label}'s arc opens another segment`);
      }
      // The legend adds up to what the ring counts: the centre, or for Apps their workloads.
      const whole = g.key === 'apps' ? num(v.glanceRings.find(x => x.key === 'workloads').centre) : num(g.centre);
      assert.equal(g.legend.reduce((a, l) => a + num(l.n), 0), whole, `${where}: the legend does not add up to ${whole}`);
      for (const lg of g.legend) assert.ok(!/…|\.\.\./.test(lg.label), `${where}: ${lg.label}`);
    }
  }
  // Established's seven services: the three smallest open together, and the landing counts them.
  const v = vals(disc('mature'));
  const sites = v.glanceRings.find(g => g.key === 'sites');
  const other = sites.legend[sites.legend.length - 1];
  const c = disc('mature'); vals(c).glanceRings.find(g => g.key === 'sites').legend.find(l => l.key === other.key).go(EV);
  assert.equal(vals(c).placeSitesN, num(other.n), `"${other.label} ${other.n}" opened ${vals(c).placeSitesN}`);
});

test('7. the new filter lives on Your clouds and Your sites, and the tiles beside it count what is new', () => {
  for (const view of ESTATES) {
    const v0 = vals(disc(view));
    if (!v0.newStrip.hasNew) continue;
    const c = disc(view);
    vals(c).newStrip.go(EV);
    assert.equal(c.state.newOnly, true, view);
    // At a glance shows everything, so the filter is off there and the pill says so.
    vals(c).estPanels.find(p => p.key === 'glance').go(EV);
    assert.equal(c.state.newOnly, false, `${view}: At a glance kept the new filter`);
    assert.ok(!/showing only/.test(vals(c).newStrip.pill), `${view}: the pill reads "${vals(c).newStrip.pill}" over everything`);
    // From At a glance the pill opens the new things again; it never only turns the filter off.
    vals(c).newStrip.go(EV);
    assert.equal(c.state.newOnly, true, `${view}: the pill on At a glance did not open what is new`);
    // The tiles under the filter count the set they sit over, and each opens it.
    const cc = disc(view, { estPanel: 'clouds', newOnly: true });
    const vc = vals(cc), all = vals(disc(view, { estPanel: 'clouds' }));
    for (const t of vc.cloudTiles) {
      const u = all.cloudTiles.find(x => x.key === t.key);
      assert.ok(num(t.v) <= num(u.v), `${view} new: tile ${t.l} reads ${t.v} against ${u.v} unfiltered`);
      if (!t.can) continue;
      const c3 = disc(view, { estPanel: 'clouds', newOnly: true }); vals(c3).cloudTiles.find(x => x.key === t.key).go(EV);
      assert.equal(vals(c3).cloudListN, num(t.v), `${view} new: tile ${t.l} ${t.v} opened ${vals(c3).cloudListN}`);
    }
    // Established's 53 new sit in a few of its clouds' VPCs (Bank scale's 225 new workloads touch every one).
    if (view === 'mature') assert.ok(vc.cloudTiles.some(t => num(t.v) < num(all.cloudTiles.find(x => x.key === t.key).v)), `${view}: the tiles beside "${vc.cloudLine}" count the whole estate`);
  }
  // Under any filter the tiles count the set, and open it.
  for (const view of ESTATES) for (const cf of [{ unit: 'workload', state: 'exposed' }, { unit: 'workload', tag: 'pci' }, { unit: 'region', state: 'priv' }]) {
    const mk = () => disc(view, { estPanel: 'clouds', cloudFilter: cf });
    const v = vals(mk());
    for (const t of v.cloudTiles.filter(x => x.can)) {
      const c = mk(); vals(c).cloudTiles.find(x => x.key === t.key).go(EV);
      const vt = vals(c);
      assert.equal(vt.cloudListN, num(t.v), `${view} exposed: tile ${t.l} ${t.v}`);
      // Where it lands, the same tile counts the same set ("Clouds of exposed workloads" reads its clouds).
      const same = vt.cloudTiles.find(x => x.key === t.key);
      if (same && t.key !== 'Apps') assert.equal(num(same.v), vt.cloudListN, `${view} ${vt.cloudFilterLabel}: tile ${same.l} reads ${same.v} beside ${vt.cloudListN}`);
    }
    for (const m of v.cloudMix.filter(x => x.can)) { const c = mk(); vals(c).cloudMix.find(x => x.key === m.key).go(EV); assert.equal(vals(c).cloudListN, m.n, `${view} exposed: mix ${m.label} ${m.n}`); }
  }
});

const rail = (c, label) => { const it = vals(c).railGroups.flatMap(g => g.items || []).find(r => r.label === label); assert.ok(it, `no rail item ${label}`); it.go(EV); };

test('7. leaving Estate, for another page or for Sources, clears the new filter; coming back reads everything', () => {
  for (const view of ESTATES) {
    for (const away of ['NaaS', 'Sources']) {
      const c = disc(view, { estPanel: 'clouds', newOnly: true });
      if (!vals(c).newStrip.hasNew) continue;
      assert.match(vals(c).newStrip.pill, /showing only/, view);
      rail(c, away); rail(c, 'Estate');
      assert.equal(c.state.screen, 's1', `${view} ${away}`);
      assert.equal(!!c.state.newOnly, false, `${view}: back from ${away}, Estate is still new-filtered`);
      assert.ok(!/showing only/.test(vals(c).newStrip.pill), `${view}: back from ${away}, the pill reads "${vals(c).newStrip.pill}"`);
    }
  }
});

test('8. a window\'s words read once: never "the last the last hour"', () => {
  for (const view of ESTATES) {
    for (const w of ['1h', '24h', '7d', '30d']) {
      for (const patch of [{ estPanel: 'clouds', newOnly: true }, { estPanel: 'sites', newOnly: true }, { estPanel: 'glance' }]) {
        const c = disc(view, { obWindow: w, ...patch });
        const v = vals(c);
        const words = [v.newStrip.pill, v.newStrip.title, v.newStrip.text, v.cloudFilterLabel, v.placeFilterLabel, ...(v.cloudActs || []).map(a => a.label), ...(v.placeActs || []).map(a => a.label)].join(' | ');
        assert.ok(!/the last the last|in the last the/.test(words), `${view} ${w}: ${words}`);
        for (const a of [...(v.cloudActs || []), ...(v.placeActs || [])].filter(x => x.key === 'andi')) { const c2 = copyOf(c.state); const v2 = vals(c2); [...v2.cloudActs, ...v2.placeActs].find(x => x.key === 'andi' && x.label === a.label).go(EV);
          assert.ok(!/the last the last/.test(`${c2.state.andiScope.label} ${c2.state.andiScope.lead}`), `${view} ${w}: Andi reads "${c2.state.andiScope.label}"`); }
      }
    }
  }
});

test('9. Andi open on Estate gives up a row, and Discover never opens under a connection panel', () => {
  for (const view of ESTATES) {
    const plain = vals(disc(view, { estPanel: 'clouds', cloudFilter: { unit: 'workload' } }));
    const v = vals(disc(view, { estPanel: 'clouds', cloudFilter: { unit: 'workload' }, andiOpen: true }));
    assert.equal(v.cloudPageSize, plain.cloudPageSize - 1, `${view}: Your clouds keeps ${v.cloudPageSize} rows beside Andi`);
    assert.ok(v.cloudRows.length <= v.cloudPageSize, view);
  }
  // A connection's bandwidth opens Capacity with its panel; the rail back to Estate closes it.
  const c = disc('partial', { estPanel: 'clouds', cloudTrailE: ['cloud:AWS'] });
  const row = vals(c).cloudRows.find(r => r.bwParts.some(p => p.can));
  row.bwParts.find(p => p.can).go(EV);
  assert.ok(vals(c).hasPanelOverlay, 'the bandwidth door opened no panel');
  rail(c, 'Estate');
  assert.equal(c.state.screen, 's1');
  assert.equal(vals(c).hasPanelOverlay, false, 'Discover opened under the connection panel');
});

test('10. Your sites\' regions carry their month of access, the figure Cost > By region shows', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view, { estPanel: 'sites' }));
    let priced = 0;
    for (const row of v.placeRows) {
      if (!row.hasCost) continue;
      priced++;
      if (!row.costCan) continue;
      const c = disc(view, { estPanel: 'sites' }); vals(c).placeRows.find(r => r.key === row.key).costGo(EV);
      const vc = vals(c);
      assert.equal(c.state.tab, 'cost', `${view} ${row.name}`); assert.equal(c.state.costBy, 'region', `${view} ${row.name}`);
      assert.equal(num(vc.legTiles.find(t => t.key === 'access').v), num(row.costF), `${view} ${row.name}: ${row.costF} here, ${vc.legTiles.find(t => t.key === 'access').v} on Cost`);
    }
    assert.ok(priced > 0, `${view}: no region on Your sites carries a cost`);
  }
});

test('10. "Open its finding" opens an open finding about the set, never a snoozed one about another', () => {
  for (const view of ESTATES) {
    for (const L of landings(view)) {
      const c = disc(view, L.patch), v = vals(c);
      const a = (L.patch.estPanel === 'clouds' ? v.cloudActs : v.placeActs).find(x => x.key === 'finding');
      if (!a) continue;
      a.go(EV);
      const f = vals(c).findAll.find(x => x.key === c.state.fdKey);
      assert.ok(f, `${view} ${L.where}: ${c.state.fdKey}`);
      assert.ok(!/snooz|resolv|dismiss/i.test(`${f.stateLabel || ''} ${f.state || ''} ${f.lifeLabel || ''}`), `${view} ${L.where}: opened a ${f.stateLabel || f.state} finding`);
    }
  }
  const v = vals(disc('partial', { estPanel: 'clouds', cloudFilter: { unit: 'workload', state: 'exposed' } }));
  assert.ok(!v.cloudActs.some(a => a.key === 'finding'), `Growing's 54 exposed workloads offer "${v.cloudActs.map(a => a.label).join(', ')}": the uninspected finding is 7 workloads in eu-west-1, and snoozed`);
});
