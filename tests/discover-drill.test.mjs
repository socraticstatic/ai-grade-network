import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// THE DRILL RULE on Discover > Estate (Micah, 2026-09-30): "the small pills beside
// discover, for example, should be clickable"; "it would be good to click on pie
// charts - it all should be drillable"; "why does exposed when i click on it go to
// logs? that's confusing"; "'private path for 5 sites' those kinds of things should
// be clickable"; "discover estate should be more drillable"; "on all of the at a
// glance drills, what's the point? actions may help"; "discover - estate -
// integrate costs".
//
// Every figure on Discover > Estate is a door that opens exactly the things it
// counts, and the list it lands on counts the same number. Sites land on Your sites
// by place (never flat); clouds, regions, VPCs, workloads and apps on Your clouds;
// a count of things never lands on Logs. Every landing carries the one or two
// moves its set calls for, each starting the real flow with the set in it. Each
// cloud, region and site row carries what it costs a month, the number Cost shows.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

const ESTATES = ['partial', 'mature', 'trust', 'small'];
// The first number a figure reads ("10 new · 30 days" is 10, "$51,000" is 51000).
const num = (s) => { const m = /\d[\d,]*/.exec(String(s)); return m ? +m[0].replace(/,/g, '') : 0; };
const disc = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's1', scanStep: 4, estPanel: 'glance', ...patch });
const EV = { stopPropagation() {}, detail: 0 };

/** Open a door on a fresh copy of the state it was read from, and read where it lands. */
function land(mk, pick) {
  const c = mk();
  const door = pick(vals(c));
  assert.equal(typeof door, 'function', 'the figure has no door');
  door(EV);
  const v = vals(c), s = c.state;
  const at = s.screen !== 's1' ? s.screen : v.estPanelClouds ? 'clouds' : v.estPanelSites ? 'sites' : v.estPanelGlance ? 'glance' : v.estPanelBu ? 'bu' : '?';
  return { c, at, s, v, n: at === 'clouds' ? v.cloudListN : at === 'sites' ? v.placeSitesN : null };
}
const logsCheck = (r, what) => assert.ok(!(r.s.screen === 's3' && r.s.tab === 'observe' && r.s.obPage === 'logs'), `${what}: a count of things landed on Logs`);
function expectList(r, tab, n, what) {
  logsCheck(r, what);
  assert.equal(r.at, tab, `${what}: landed on ${r.at}, not ${tab}`);
  assert.equal(r.n, n, `${what}: the list counts ${r.n}, the figure reads ${n}`);
  const line = tab === 'clouds' ? r.v.cloudLine : r.v.placeLine;
  assert.ok(String(line).includes(n.toLocaleString('en-US')), `${what}: the list's line "${line}" does not say ${n}`);
}

/** Every landing carries its moves: one or two, each starting the real flow with the set in it. */
function expectActs(r, what) {
  const acts = r.at === 'clouds' ? r.v.cloudActs : r.v.placeActs;
  assert.ok(Array.isArray(acts) && acts.length >= 1 && acts.length <= 2, `${what}: ${acts ? acts.length : 'no'} moves on the landing`);
  for (const a of acts) {
    assert.ok(a.label && typeof a.go === 'function', `${what}: a move with no label or door`);
    const c = mkC({}); Object.assign(c.state, JSON.parse(JSON.stringify(r.s)));
    const v0 = vals(c), a0 = (r.at === 'clouds' ? v0.cloudActs : v0.placeActs).find(x => x.key === a.key);
    a0.go(EV);
    const s = c.state, where = `${what} > ${a.label}`;
    if (a.key === 'attach') {
      assert.equal(s.screen, 's4', where);
      const sets = s.compose && s.compose.prefillSets;
      assert.ok(sets && sets.regions.length, `${where}: the order carries no regions`);
      assert.deepEqual([...sets.regions].sort(), [...r.v.cloudSetPub].sort(), `${where}: the order is not the set's public regions`);
    } else if (a.key === 'move' || a.key === 'backup') {
      assert.equal(s.screen, 's4', where);
      const sets = s.compose && s.compose.prefillSets;
      assert.ok(sets && sets.sites.length, `${where}: the order carries no sites`);
      assert.deepEqual([...sets.sites].sort(), [...(a.key === 'move' ? r.v.placeSetOutside : r.v.placeSetSingles)].sort(), `${where}: the order is not the set's sites`);
    } else if (a.key === 'policy') {
      assert.equal(s.screen, 's3', where); assert.equal(s.tab, 'govern', where);
      assert.ok(s.authoring && s.authoring.match && s.authoring.req.length, `${where}: no policy started`);
    } else if (a.key === 'finding') {
      assert.ok(s.fdKey && vals(c).findAll.some(f => f.key === s.fdKey), `${where}: ${s.fdKey} is not a finding`);
    } else if (a.key === 'andi') {
      assert.equal(s.andiOpen, true, where);
      assert.equal(s.andiScope.kind, 'set', where);
      assert.ok(s.andiScope.label, where);
      assert.ok(s.andiScope.lead && vals(c).andiLead === s.andiScope.lead, `${where}: Andi does not read the set ("${vals(c).andiLead}")`);
    } else assert.fail(`${where}: an unknown move ${a.key}`);
  }
}

test('the title pills: each opens exactly the set it counts, with its moves', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    const want = { s: 'sites', c: 'clouds', r: 'clouds', w: 'clouds', a: 'clouds', e: 'clouds' };
    assert.deepEqual(v.invStats.map(k => k.key), Object.keys(want), view);
    for (const k of v.invStats) {
      const n = num(k.v);
      if (!n) { assert.equal(k.can, false, `${view} ${k.key}: a zero is not a door`); continue; }
      assert.equal(k.can, true, `${view} ${k.key}`);
      const r = land(() => disc(view), x => x.invStats.find(y => y.key === k.key).go);
      expectList(r, want[k.key], n, `${view} pill ${k.v} ${k.l}`);
      if (['r', 'w', 'a', 'e'].includes(k.key)) assert.ok(r.v.hasCloudFilter && r.v.cloudFilterLabel, `${view} ${k.key}: the landing does not name its filter`);
      expectActs(r, `${view} pill ${k.l}`);
    }
  }
});

test('the new pill filters Your clouds and Your sites to what is new, and the two add up to it', () => {
  for (const view of ESTATES) {
    const v0 = vals(disc(view));
    if (!v0.newStrip.hasNew) continue;
    const n = num(v0.newStrip.pill);
    const r = land(() => disc(view), x => x.newStrip.go);
    assert.equal(r.s.newOnly, true, view);
    assert.ok(['clouds', 'sites'].includes(r.at), `${view}: the new pill landed on ${r.at}`);
    assert.equal(r.v.cloudNewN + r.v.siteNewN, n, `${view}: ${r.v.cloudNewN} new in Your clouds and ${r.v.siteNewN} in Your sites is not ${n}`);
    const again = (patch) => { Object.assign(r.s, patch); return vals({ state: r.s, setState: (p) => Object.assign(r.s, typeof p === 'function' ? p(r.s) : p) }); };
    const vc = again({ estPanel: 'clouds' });
    assert.equal(vc.cloudListN, vc.cloudNewN, `${view}: Your clouds counts ${vc.cloudListN} under the new filter, not the ${vc.cloudNewN} new things`);
    assert.ok(vc.hasCloudFilter && /^New in the last/.test(vc.cloudFilterLabel), `${view}: Your clouds does not name the new filter`);
    const vs = again({ estPanel: 'sites' });
    assert.equal(vs.placeSitesN, vs.siteNewN, `${view}: Your sites lists ${vs.placeSitesN} sites under the new filter, not the ${vs.siteNewN} new ones`);
    if (vs.siteNewN) assert.ok(vs.hasPlaceFilter && /New in the last/.test(vs.placeFilterLabel), `${view}: Your sites does not name the new filter`);
    expectActs({ ...r, at: 'clouds', v: vc }, `${view} new in Your clouds`);
    vs.newStrip.go(EV);
    assert.equal(r.s.newOnly, false, `${view}: the pill does not turn the filter off`);
  }
});

test('the four rings: the centre, the head, every legend entry and every segment open their set', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    const tabOf = { sites: 'sites', clouds: 'clouds', workloads: 'clouds', apps: 'clouds' };
    for (const g of v.glanceRings) {
      const where = `${view} ${g.key} ring`;
      const rc = land(() => disc(view), x => x.glanceRings.find(y => y.key === g.key).centreGo);
      expectList(rc, tabOf[g.key], num(g.centre), `${where} centre ${g.centre}`);
      expectActs(rc, `${where} centre`);
      if (num(g.head)) {
        assert.equal(g.headCan, true, `${where}: "${g.head}" is not a door`);
        const rh = land(() => disc(view), x => x.glanceRings.find(y => y.key === g.key).headGo);
        expectList(rh, tabOf[g.key], num(g.head), `${where} head ${g.head}`);
        expectActs(rh, `${where} head`);
      }
      for (const lg of g.legend) {
        assert.equal(lg.can, true, `${where} ${lg.label}`);
        const rl = land(() => disc(view), x => x.glanceRings.find(y => y.key === g.key).legend.find(y => y.key === lg.key).go);
        expectList(rl, tabOf[g.key], num(lg.n), `${where} legend ${lg.label} ${lg.n}`);
      }
      // Every segment of the ring, including the ones the legend has no room for.
      assert.ok(g.segs.length >= g.legend.length, where);
      for (const sg of g.segs) {
        const rs = land(() => disc(view), x => x.glanceRings.find(y => y.key === g.key).segs.find(y => y.key === sg.key).go);
        expectList(rs, tabOf[g.key], sg.n, `${where} segment ${sg.label}`);
        expectActs(rs, `${where} segment ${sg.label}`);
      }
      assert.equal(typeof g.pick, 'function', where);
    }
  }
});

test('a click on the ring picks the segment under the pointer; the hole or a key press picks the whole set', async () => {
  const { ringHit } = await import('../naas-drill.js');
  const segs = [{ from: 0, to: 25 }, { from: 25, to: 75 }, { from: 75, to: 100 }];
  assert.equal(ringHit(segs, 0, 0, 48, 33), -1, 'the centre');
  assert.equal(ringHit(segs, 10, -40, 48, 33), 0, 'just past twelve is the first arc');
  assert.equal(ringHit(segs, 0, 40, 48, 33), 1, 'six o\'clock is the middle arc');
  assert.equal(ringHit(segs, -40, -10, 48, 33), 2, 'ten o\'clock is the last arc');
  const c = disc('partial');
  const g = vals(c).glanceRings.find(x => x.key === 'clouds');
  const el = { getBoundingClientRect: () => ({ left: 100, top: 100, width: 96, height: 96 }) };
  const mid = g.segs.find(sg => sg.from <= 50 && sg.to > 50);
  g.pick({ currentTarget: el, clientX: 148, clientY: 190, detail: 1, stopPropagation() {} });
  assert.equal(vals(c).cloudListN, mid.n, 'the pointer at six o\'clock did not open the segment under it');
  const c2 = disc('partial');
  vals(c2).glanceRings.find(x => x.key === 'clouds').pick({ currentTarget: el, clientX: 0, clientY: 0, detail: 0, stopPropagation() {} });
  assert.equal(vals(c2).cloudListN, 7, 'a key press on the ring opens the whole ring');
});

test('the apps table: every cell opens its own set, and only Traffic reaches Logs', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    for (const a of v.appAll) {
      const at = (k) => (x) => x.appAll.find(y => y.key === a.key)[k];
      const where = `${view} app ${a.name}`;
      expectList(land(() => disc(view), at('nameGo')), 'clouds', a.wl, `${where} name`);
      expectList(land(() => disc(view), at('wlGo')), 'clouds', a.wl, `${where} workloads`);
      expectList(land(() => disc(view), at('runsGo')), 'clouds', a.runsTitle.split(', ').length, `${where} runs in`);
      assert.equal(Math.round(a.onAttN / a.wl * 100), num(a.onAttF), `${where}: ${a.onAttN} of ${a.wl} is not ${a.onAttF}`);
      if (a.onAttN) expectList(land(() => disc(view), at('onAttGo')), 'clouds', a.onAttN, `${where} on AT&T ${a.onAttF}`);
      else assert.equal(a.onAttCan, false, `${where}: 0% is not a door`);
      if (a.exposed) { const r = land(() => disc(view), at('exposedGo')); expectList(r, 'clouds', a.exposed, `${where} exposed`); expectActs(r, `${where} exposed`); }
      else assert.equal(a.exposedCan, false, `${where}: None is not a door`);
      const t = land(() => disc(view), at('gbpsGo'));
      assert.equal(t.s.obPage, 'logs', `${where} traffic`); assert.equal(t.s.logQ, a.name, `${where} traffic`);
      const p = land(() => disc(view), at('p95Go'));
      assert.equal(p.s.tab, 'observe', `${where} p95`); assert.equal(p.s.obPanel, 'paths', `${where} p95`);
      logsCheck(p, `${where} p95`);
      const row = land(() => disc(view), at('go'));
      expectList(row, 'clouds', a.wl, `${where} row`);
      expectActs(row, `${where} row`);
    }
  }
});

test('"exposed" opens the exposed workloads, never Logs (Micah: "why does exposed ... go to logs?")', () => {
  const v = vals(disc('partial'));
  const fin = v.appAll.find(a => a.name === 'finance');
  const r = land(() => disc('partial'), x => x.appAll.find(y => y.key === fin.key).exposedGo);
  expectList(r, 'clouds', 12, 'finance exposed');
  assert.match(r.v.cloudFilterLabel, /Exposed finance workloads/);
  assert.ok(r.v.cloudRows.every(x => x.dot === 'var(--warning)'), 'an exposed workload row reads as private');
});

test('the gaps: "Private path for 5 sites" and every count in a gap opens its set; each move carries the set', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    for (const g of v.glanceGaps) {
      assert.equal(g.titleParts.map(p => p.t).join(''), g.title, `${view} ${g.title}: the doors do not read as the title`);
      assert.equal(g.soParts.map(p => p.t).join(''), g.soWhat, `${view} ${g.title}: the doors do not read as the line`);
      for (const [side, parts] of [['titleParts', g.titleParts], ['soParts', g.soParts]]) {
        for (const p of parts.filter(x => x.can)) {
          const r = land(() => disc(view), x => x.glanceGaps.find(y => y.key === g.key)[side].find(y => y.key === p.key).go);
          if (/\$/.test(p.t)) { assert.equal(r.s.tab, 'cost', `${view} ${p.t}`); logsCheck(r, p.t); continue; }
          const tab = /site|endpoint|outside AT&T/.test(p.t) ? 'sites' : 'clouds';
          expectList(r, tab, num(p.t), `${view} gap "${g.title}" ${p.t}`);
          expectActs(r, `${view} gap ${p.t}`);
        }
      }
      assert.ok(g.titleParts.some(x => x.can), `${view} "${g.title}": the count in the title is not a door`);
      // The gap's own move starts the flow with the whole set, not its first member: the
      // set the title's count opens, as that landing's own move would carry it.
      const c = disc(view); vals(c).glanceGaps.find(y => y.key === g.key).go(EV);
      assert.equal(c.state.screen, 's4', `${view} ${g.cta}`);
      const sets = c.state.compose.prefillSets;
      assert.ok(sets, `${view} ${g.cta}: the order carries no set`);
      const lt = land(() => disc(view), x => x.glanceGaps.find(y => y.key === g.key).titleParts.find(y => y.can).go);
      if (lt.at === 'clouds') assert.deepEqual([...sets.regions].sort(), [...lt.v.cloudSetPub].sort(), `${view} ${g.cta}: not every region in the order`);
      else assert.deepEqual([...sets.sites].sort(), [...(/backup/i.test(g.title) ? lt.v.placeSetSingles : lt.v.placeSetOutside)].sort(), `${view} ${g.cta}: not every site in the order`);
    }
  }
  const p = vals(disc('partial')).glanceGaps.find(g => /Private path for 5 sites/.test(g.title));
  const r = land(() => disc('partial'), x => x.glanceGaps.find(y => y.key === p.key).titleParts.find(y => y.can).go);
  expectList(r, 'sites', 5, 'Private path for 5 sites');
  assert.equal(r.v.placeFilterLabel, 'Sites outside AT&T');
  assert.equal(r.v.placeActs[0].key, 'move', 'Sites outside AT&T lead with Move to AT&T');
});

test('Your clouds: the tiles and How they connect open their sets at every level of the drill', () => {
  for (const view of ESTATES) {
    const trails = [[]];
    const c1 = disc(view, { estPanel: 'clouds' });
    for (let d = 0; d < 4; d++) { const row = vals(c1).cloudRows.find(x => x.canGo); if (!row) break; row.go(EV); trails.push(c1.state.cloudTrailE.slice()); }
    for (const trail of trails) {
      const mk = () => disc(view, { estPanel: 'clouds', cloudTrailE: trail.slice() });
      const v = vals(mk());
      const at = `${view} ${trail.join('>') || 'root'}`;
      for (const t of v.cloudTiles) {
        if (!t.can) { assert.ok(t.l === 'Zone' || !num(t.v), `${at} tile ${t.l} is not a door`); continue; }
        expectList(land(mk, x => x.cloudTiles.find(y => y.key === t.key).go), 'clouds', num(t.v), `${at} tile ${t.l}`);
      }
      for (const m of v.cloudMix) {
        if (!m.n) { assert.equal(m.can, false, `${at} mix ${m.label} 0`); continue; }
        expectList(land(mk, x => x.cloudMix.find(y => y.key === m.key).go), 'clouds', m.n, `${at} mix ${m.label}`);
      }
      assert.equal(v.cloudMixParts.map(p => p.t).join(''), v.cloudMixLabel, `${at}: the mix label's doors do not read as the label`);
      for (const p of v.cloudMixParts.filter(x => x.can)) expectList(land(mk, x => x.cloudMixParts.find(y => y.key === p.key).go), 'sites', num(p.t), `${at} ${p.t}`);
    }
  }
});

test('Your clouds: every count in a row opens its set, and a connection\'s bandwidth opens Capacity', () => {
  for (const view of ESTATES) {
    const walk = (trail, depth) => {
      const mk = () => disc(view, { estPanel: 'clouds', cloudTrailE: trail.slice() });
      const v = vals(mk());
      for (const row of v.cloudRows) {
        assert.equal(row.parts.map(p => p.t).join(''), row.sub, `${view} ${row.name}: the doors do not read as the line`);
        for (const p of row.parts.filter(x => x.can)) {
          const r = land(mk, x => x.cloudRows.find(y => y.key === row.key).parts.find(y => y.key === p.key).go);
          if (/Gbps/.test(p.t)) { assert.equal(r.s.obPage, 'logs', `${view} ${row.name} ${p.t}`); continue; }
          if (!/\d/.test(p.t)) { assert.equal(r.at, 'clouds'); assert.ok(r.v.hasCloudFilter, `${view} ${row.name} tag ${p.t}`); continue; }
          expectList(r, 'clouds', num(p.t), `${view} ${trail.join('>') || 'root'} ${row.name} "${p.t}"`);
        }
        for (const b of row.bwParts.filter(x => x.can)) {
          const r = land(mk, x => x.cloudRows.find(y => y.key === row.key).bwParts.find(y => y.key === b.key).go);
          assert.equal(r.s.obPanel, 'conn', `${view} ${row.name} ${b.t}: bandwidth opens Capacity`);
          assert.ok(r.s.mapSel, `${view} ${row.name} ${b.t}: no connection picked`);
          logsCheck(r, b.t);
        }
        if (depth < 3 && row.canGo) { const c = mk(); vals(c).cloudRows.find(y => y.key === row.key).go(EV); walk(c.state.cloudTrailE, depth + 1); }
      }
    };
    walk([], 0);
  }
});

test('Your sites: every count in a row opens its sites by place, filtered, never flat', () => {
  for (const view of ESTATES) {
    const mk = () => disc(view, { estPanel: 'sites' });
    const v = vals(mk());
    for (const row of v.placeRows) {
      assert.equal(row.parts.map(p => p.t).join(''), row.access, `${view} ${row.name}: the doors do not read as the line`);
      for (const p of row.parts.filter(x => x.can)) {
        const r = land(mk, x => x.placeRows.find(y => y.key === row.key).parts.find(y => y.key === p.key).go);
        expectList(r, 'sites', num(p.t), `${view} ${row.name} "${p.t}"`);
        assert.ok(r.s.placeTrail.length >= 1, `${view} ${row.name}: the count opened a flat list`);
        expectActs(r, `${view} ${row.name} ${p.t}`);
      }
    }
  }
});

test('Business units and Sources: each count opens its set', () => {
  for (const view of ESTATES) {
    const vb = vals(disc(view, { estPanel: 'bu' }));
    for (const b of vb.buList) {
      if (!b.n) { assert.equal(b.countCan, false, `${view} ${b.name} 0`); continue; }
      const r = land(() => disc(view, { estPanel: 'bu' }), x => x.buList.find(y => y.key === b.key).countGo);
      expectList(r, 'sites', b.n, `${view} business unit ${b.name}`);
      assert.equal(r.v.placeFilterLabel, b.name);
      expectActs(r, `${view} business unit ${b.name}`);
    }
    const vs = vals(disc(view, { discoverView: 'sources' }));
    for (const src of vs.sources) {
      assert.equal(src.scopeCan, true, `${view} ${src.name} ${src.scope}`);
      const r = land(() => disc(view, { discoverView: 'sources' }), x => x.sources.find(y => y.key === src.key).scopeGo);
      if (/connection/.test(src.scope)) { assert.equal(r.s.obPanel, 'conn', `${view} ${src.scope}`); assert.equal(r.v.gaugeRows.length, num(src.scope)); logsCheck(r, src.scope); continue; }
      expectList(r, /site/.test(src.scope) ? 'sites' : 'clouds', num(src.scope), `${view} source ${src.name} ${src.scope}`);
    }
    // The access sites are counted as the pill counts them (Established read "10 sites" beside 221).
    const sitesSrc = vs.sources.find(x => x.key === 'src:sites');
    if (sitesSrc) assert.equal(num(sitesSrc.scope), num(vals(disc(view)).invStats.find(k => k.key === 's').v), `${view}: the access sites source and the pill disagree`);
  }
});

test('what an added source found: its regions, its VCNs and its workloads each open their set; Attach carries them all', () => {
  const NOW = '2026-10-05T15:00:00Z';
  const c = disc('partial', { discoverView: 'sources', nowIso: NOW });
  vals(c).openAddSource(); vals(c).sourceTiles.find(t => /Oracle/.test(t.name)).pick(); vals(c).addSource();
  const mk = () => disc('partial', { discoverView: 'sources', nowIso: NOW, addedSources: JSON.parse(JSON.stringify(c.state.addedSources)) });
  const v = vals(mk());
  assert.equal(v.hasFound, true, 'the found line is gone');
  assert.equal(v.foundParts.map(p => p.t).join(''), v.foundLine, 'the found line\'s doors do not read as the line');
  const doors = v.foundParts.filter(p => p.can);
  assert.equal(doors.length, 3, `three counts in "${v.foundLine}"`);
  for (const p of doors) { const r = land(mk, x => x.foundParts.find(y => y.key === p.key).go); expectList(r, 'clouds', num(p.t), `found "${p.t}"`); expectActs(r, `found ${p.t}`); }
  const ca = mk(); vals(ca).foundAttach(EV);
  assert.equal(ca.state.screen, 's4');
  assert.deepEqual([...ca.state.compose.prefillSets.regions].sort(), ['eu-frankfurt-1', 'us-ashburn-1'], 'Attach on what it found carries one region');
});

test('with what an added source found over Estate, the lists give up the rows the alert takes', () => {
  const NOW = '2026-10-05T15:00:00Z';
  const plain = vals(disc('partial', { estPanel: 'clouds', cloudFilter: { unit: 'workload' } }));
  const c = disc('partial', { discoverView: 'sources', nowIso: NOW });
  vals(c).openAddSource(); vals(c).sourceTiles.find(t => /Oracle/.test(t.name)).pick(); vals(c).addSource();
  const v = vals(disc('partial', { estPanel: 'clouds', cloudFilter: { unit: 'workload' }, nowIso: NOW, addedSources: JSON.parse(JSON.stringify(c.state.addedSources)) }));
  assert.equal(v.hasFound, true);
  assert.equal(v.cloudPageSize, plain.cloudPageSize - 2, 'Your clouds keeps its nine rows under the alert (973 on the fold)');
  assert.equal(v.appPageSize, plain.appPageSize - 1, 'the apps keep their five rows under the alert (905 on the fold)');
  assert.equal(v.placePageSize, plain.placePageSize - 2);
  assert.equal(v.cloudRows.length, v.cloudPageSize);
});

test('integrate costs: each cloud, region and site row carries the month Cost shows for it, its door opening that Cost row', () => {
  for (const view of ESTATES) {
    // Clouds: the cloud's egress is the head of Egress, By cloud, the cloud picked.
    const vc = vals(disc(view, { estPanel: 'clouds' }));
    for (const row of vc.cloudRows) {
      if (!row.costCan) { assert.equal(row.costF, 'Not yet measured', `${view} ${row.name}: no egress figure and no word for it`); continue; }
      const r = land(() => disc(view, { estPanel: 'clouds' }), x => x.cloudRows.find(y => y.key === row.key).costGo);
      assert.equal(r.s.tab, 'cost', `${view} ${row.name}`); assert.equal(r.s.costPanel, 'legs');
      assert.equal(num(r.v.legPHead.sub), num(row.costF), `${view} ${row.name}: ${row.costF} here, ${r.v.legPHead.sub} on Cost`);
      // Each region of the cloud: its own row in Egress, By region, its place picked.
      const c2 = disc(view, { estPanel: 'clouds' }); vals(c2).cloudRows.find(y => y.key === row.key).go(EV);
      const vr = vals(c2);
      for (const rr of vr.cloudRows) {
        if (!rr.costCan) continue;
        const r2 = land(() => { const c3 = disc(view, { estPanel: 'clouds', cloudTrailE: c2.state.cloudTrailE.slice() }); return c3; }, x => x.cloudRows.find(y => y.key === rr.key).costGo);
        const hit = r2.v.legCloudRows.find(x => x.label === rr.name);
        assert.ok(hit, `${view} ${rr.name}: Cost's Egress rows do not list it (${r2.v.legCloudRows.map(x => x.label).join(', ')})`);
        assert.equal(num(hit.vF), num(rr.costF), `${view} ${rr.name}: ${rr.costF} here, ${hit.vF} on Cost`);
      }
    }
    // Sites: down to the sites, each site's access is its row in its service's access leg.
    const walk = (trail, depth) => {
      const mk = () => disc(view, { estPanel: 'sites', placeTrail: trail.slice() });
      const v = vals(mk());
      for (const row of v.placeRows) {
        if (row.costCan) {
          const r = land(mk, x => x.placeRows.find(y => y.key === row.key).costGo);
          if (r.at === 'sites') {
            // Two services: the site's services, each priced as Cost prices it.
            assert.ok(r.v.placeRows.length >= 2, `${view} ${row.name}: a multi-service site opened ${r.v.placeRows.length} services`);
            assert.equal(r.v.placeRows.reduce((a, x) => a + num(x.costF), 0), num(row.costF), `${view} ${row.name}: its services do not add up to ${row.costF}`);
            for (const sv of r.v.placeRows) {
              const r3 = land(() => { const c = mkC({}); Object.assign(c.state, JSON.parse(JSON.stringify(r.s))); return c; }, x => x.placeRows.find(y => y.key === sv.key).costGo);
              const hit = r3.v.legAccessRows.find(x => x.label === row.name);
              assert.ok(hit, `${view} ${row.name} ${sv.name}: Cost's access rows do not list the site`);
              assert.equal(num(hit.vF), num(sv.costF), `${view} ${row.name} ${sv.name}`);
            }
          } else if (/^one of /.test(String(row.costTitle).split(': ')[1] || '')) {
            // A site inside a rollup costs the rollup's rate: the "× $480 each" its Cost row reads.
            assert.equal(r.s.tab, 'cost', `${view} ${row.name}`);
            assert.ok(r.v.legAHead.on, `${view} ${row.name}: Cost did not open the rollup's access row`);
            if (/^\$/.test(row.costF)) assert.ok(r.v.legAHead.sub.includes(`× ${row.costF} each`), `${view} ${row.name}: ${row.costF} here, "${r.v.legAHead.sub}" on Cost`);
            else assert.match(r.v.legAHead.sub, /another carrier/, `${view} ${row.name}`);
          } else {
            assert.equal(r.s.tab, 'cost', `${view} ${row.name}`);
            const hit = r.v.legAccessRows.find(x => x.label === row.name);
            assert.ok(hit, `${view} ${row.name}: Cost's access rows do not list it (${r.v.legAccessRows.map(x => x.label).join(', ')})`);
            assert.equal(num(hit.vF), num(row.costF), `${view} ${row.name}: ${row.costF} here, ${hit.vF} on Cost`);
          }
        }
        if (depth < 3 && row.canGo && !row.costCan) { const c = mk(); vals(c).placeRows.find(y => y.key === row.key).go(EV); walk(c.state.placeTrail.slice(), depth + 1); }
      }
    };
    walk([], 0);
  }
});

test('integrate costs: At a glance shows the estate\'s spend beside the rings, each figure Cost\'s own', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    const sp = v.glanceSpend;
    assert.ok(sp && sp.totalF, `${view}: no spend at a glance`);
    const r = land(() => disc(view), x => x.glanceSpend.totalGo);
    assert.equal(r.s.tab, 'cost'); assert.equal(r.s.costPanel, 'legs');
    assert.equal(sp.totalF, r.v.legTotalF, `${view}: ${sp.totalF} at a glance, ${r.v.legTotalF} on Cost`);
    assert.equal(sp.legs.length, 3, view);
    for (const l of sp.legs) {
      const rl = land(() => disc(view), x => x.glanceSpend.legs.find(y => y.key === l.key).go);
      assert.equal(rl.v.legTiles.find(t => t.key === l.key).v, l.vF, `${view} ${l.label}`);
    }
  }
});

test('the markup: every figure is a real button, the ring too, and no loop inside svg, table or select', () => {
  assert.ok(/\.fx-fig\{[^}]*border:0[^}]*background:transparent[^}]*padding:0[^}]*font:inherit[^}]*cursor:pointer/.test(HTML), 'no reset .fx-fig figure button');
  assert.ok(/\.fx-fig:hover\{[^}]*text-decoration:underline/.test(HTML), 'the figure button has no hover underline');
  const between = (a, b) => { const i = HTML.indexOf(a); assert.ok(i >= 0, a); const j = HTML.indexOf(b, i); assert.ok(j > i, b); return HTML.slice(i, j); };
  const onButton = (part, bind) => {
    const at = [...part.matchAll(new RegExp(`onClick="${bind.replace(/[{}.]/g, '\\$&')}"`, 'g'))].map(m => m.index);
    assert.ok(at.length, `${bind} is not bound to a click on Discover`);
    assert.ok(at.some(i => part.slice(part.lastIndexOf('<', i), part.lastIndexOf('<', i) + 7) === '<button'), `${bind} is never on a button on Discover`);
  };
  const disc0 = between('<!-- ===== S1 DISCOVER ===== -->', '<!-- ===== S2 FLOOR');
  for (const bind of ['{{ k.go }}', '{{ newStrip.go }}', '{{ gr.pick }}', '{{ gr.headGo }}', '{{ lg.go }}', '{{ ap.nameGo }}', '{{ ap.wlGo }}', '{{ ap.runsGo }}', '{{ ap.onAttGo }}', '{{ ap.exposedGo }}', '{{ ap.gbpsGo }}', '{{ ap.p95Go }}',
    '{{ gp.go }}', '{{ gs.go }}', '{{ ct.go }}', '{{ cm.go }}', '{{ mp.go }}', '{{ cp.go }}', '{{ bp.go }}', '{{ cr.go }}', '{{ cr.costGo }}', '{{ pp.go }}', '{{ pr.go }}', '{{ pr.costGo }}', '{{ bl.countGo }}', '{{ bl.go }}', '{{ sr.scopeGo }}',
    '{{ clearCloudFilter }}', '{{ clearPlaceFilter }}', '{{ ca.go }}', '{{ pa.go }}', '{{ glanceSpend.totalGo }}', '{{ gl.go }}', '{{ fp.go }}']) onButton(disc0, bind);
  assert.ok(!/class="fx-ring" role="img"/.test(disc0), 'the ring is still an image');
  for (const host of ['svg', 'table', 'select']) {
    const re = new RegExp(`<${host}\\b[\\s\\S]*?</${host}>`, 'g');
    for (const m of disc0.match(re) || []) assert.ok(!m.includes('<sc-for'), `Discover: an sc-for inside <${host}>`);
  }
});

test('new state keys live in defaults() and in the markup constructor', async () => {
  const { defaults } = await import('../naas-app.js');
  const d = defaults();
  const ctor = HTML.slice(HTML.indexOf('class Component extends DCLogic'), HTML.indexOf('componentDidUpdate'));
  for (const k of ['cloudFilter', 'placeFilter']) {
    assert.ok(k in d, `${k} is not in defaults()`);
    assert.ok(new RegExp(`\\b${k}: null`).test(ctor), `${k} is not in the markup constructor`);
  }
});
