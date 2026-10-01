import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import * as BW from '../naas-bandwidth.js';
import * as R from '../naas-round2.js';
import { ESTATES } from '../naas-data.js';
import { mkC } from './harness.mjs';

// The skeptics' leftovers on the v2 builds, integrated (w2-consistency,
// 2026-09-30). Each test names the problem it pins: a move that cannot be
// done (Resize on a port AT&T does not sell, a Resize that lands on the
// retired review order, an Add a port that does not name the port, Steer on a
// flow with nothing on AT&T), a door that opens something else, a figure that
// differs from the page its door opens, a colour that means two things, and a
// role whose briefing, home chips and Your actions list different things.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'signals', ...patch });
const obs = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn', ...patch });
const card = (v, k) => (v.sigAll || []).find(x => x.key === k);
const capOf = (v, id) => (v.capRows || []).find(r => r.id === id);
// What a move did to the app: Modify bandwidth open at a size, the connect flow with its note, or the retired review.
const landed = (c) => ({ screen: c.state.screen, bwFor: c.state.bwFor, ports: c.state.bwPick && c.state.bwPick.ports, note: (c.state.compose || {}).note || '', bandwidth: (((c.state.compose || {}).prefillSets) || {}).bandwidth || '', mapSel: c.state.mapSel });

test('Signals\' Resize opens Modify bandwidth at the size it names, and only where AT&T sells the port', () => {
  let seen = 0;
  for (const view of VIEWS) for (const persona of ['neteng', 'architect']) {
    const c = ins(view, { persona });
    const v = vals(c);
    const cap = card(v, 'capacity');
    for (const r of (cap ? cap.all : []).filter(x => x.act === 'Resize')) {
      seen += 1;
      assert.equal(r.ramp, 'NetBond', `${view}: Resize is offered on ${r.label} (${r.ramp}), a port AT&T does not sell`);
      const c2 = ins(view, { persona });
      const r2 = card(vals(c2), 'capacity').all.find(x => x.key === r.key);
      r2.actGo();
      const l = landed(c2);
      assert.notEqual(l.screen, 's6', `${view}: Resize on ${r.label} lands on the retired review order`);
      assert.equal(l.bwFor, r.key, `${view}: Resize on ${r.label} does not open Modify bandwidth`);
      assert.match(r.sub, new RegExp(`^${l.ports} would hold the peak`), `${view}: ${r.label} says "${r.sub}" and opens at ${l.ports} ports`);
    }
  }
  assert.ok(seen > 0, 'no Resize to check');
});

test('Add a port is one move per connection: Modify bandwidth one port up where AT&T sells it, else the connect flow naming the port', () => {
  const check = (view, where, cp, l) => {
    if (BW.sells(cp)) {
      assert.equal(l.bwFor, cp.id, `${view} ${where}: Add a port on ${cp.cloud} ${cp.region} does not open Modify bandwidth`);
      assert.equal(l.ports, cp.ports + 1, `${view} ${where}: Add a port opens at ${l.ports} ports, not ${cp.ports + 1}`);
    } else {
      assert.equal(l.screen, 's4', `${view} ${where}: Add a port on ${cp.cloud} ${cp.region} does not start the connect flow`);
      assert.match(l.note, new RegExp(`^Add a port to ${cp.cloud} ${cp.region}`), `${view} ${where}: the order does not name the port: "${l.note}"`);
      assert.equal(l.bandwidth, `${cp.portG} Gbps`, `${view} ${where}: the port size is not chosen`);
      assert.ok(!l.mapSel, `${view} ${where}: the map's panel stays open over the connect flow`);
    }
  };
  let seen = 0;
  for (const view of ['mature', 'trust']) {
    // Signals: Capacity and Health.
    for (const k of ['capacity', 'health']) {
      const v = vals(ins(view, { persona: 'neteng' }));
      for (const r of card(v, k).all.filter(x => x.act === 'Add a port')) {
        const c = ins(view, { persona: 'neteng' });
        const v2 = vals(c), r2 = card(v2, k).all.find(x => x.key === r.key);
        const cp = (v2.capRows || []).find(x => x.region === r.region);
        r2.actGo(); check(view, `Signals ${k}`, cp, landed(c)); seen += 1;
      }
    }
    // Your actions: the Architect's port rows.
    const ya = vals(ins(view, { persona: 'architect', insPanel: 'role' }));
    for (const a of ya.roleActAll.filter(x => x.doorLabel === 'Add a port')) {
      const c = ins(view, { persona: 'architect', insPanel: 'role' });
      const v2 = vals(c), a2 = v2.roleActAll.find(x => x.key === a.key), cp = v2.capRows.find(x => 'cap-' + x.region === a.key);
      a2.door(); check(view, 'Your actions', cp, landed(c)); seen += 1;
    }
    // Traffic: the map panel's primary, Health's open problems, and the queue.
    const base = vals(obs(view));
    for (const cp of base.capRows.filter(x => x.peakPct >= 80 && x.state !== 'down')) {
      const c = obs(view, { mapSel: cp.id });
      const v2 = vals(c);
      // The panel leads with the move: Modify bandwidth where AT&T sells the port, else Add a port; both list Add a port.
      assert.equal(v2.panel.primary.label, BW.sells(cp) ? 'Modify bandwidth' : 'Add a port', `${view}: ${cp.region}'s panel leads with "${v2.panel.primary.label}"`);
      v2.panel.actions.find(a => a.key === 'port').go(); check(view, 'map panel', cp, landed(c)); seen += 1;
      const c3 = obs(view, { obPanel: 'health' });
      const pb = vals(c3).problemRows.find(p => p.key === 'an-sat-' + cp.region);
      if (pb) { assert.equal(pb.moveLabel, 'Add a port', `${view}: Health's open problem for ${cp.region} offers "${pb.moveLabel}"`); pb.move(); check(view, 'Traffic Health', cp, landed(c3)); seen += 1; }
    }
  }
  assert.ok(seen >= 8, `only ${seen} doors checked`);
});

test('Andi\'s Steer worst offender steers only a flow with one end on AT&T; with none it offers Attach', () => {
  for (const view of VIEWS) {
    const c = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf' });
    const v = vals(c);
    const act = (v.andiActs || []).find(a => /^Steer|^Attach/.test(a.label));
    assert.ok(act, `${view}: Andi offers no Steer or Attach`);
    const before = (c.state.steered || []).length;
    act.go();
    if (/^Steer/.test(act.label)) {
      const id = c.state.steered[c.state.steered.length - 1];
      assert.equal(c.state.steered.length, before + 1);
      const f = v.paths.find(p => p.id === id);
      assert.ok(f && R.canSteerFlow(ESTATES[view].regionsList, f), `${view}: Andi steered ${id} (${f && f.name}), a flow with no end on AT&T`);
    } else {
      assert.equal(c.state.screen, 's4', `${view}: Attach does not start the connect flow`);
      assert.equal((c.state.steered || []).length, before, `${view}: Attach steered a flow`);
    }
  }
});

test('Each role\'s briefing names what waits as its home chips do, and no more', () => {
  const first = (h) => String(h).split(/(?<=\.)\s+/)[0].replace(/\.$/, '').toLowerCase();
  for (const view of VIEWS) for (const persona of ['architect', 'neteng', 'security', 'finops', 'exec']) {
    const home = vals(mkC({ view, estateParam: null, persona, screen: 's0' }));
    const brief = vals(ins(view, { persona, insPanel: 'brief' })).briefText.toLowerCase();
    const waits = home.roleActAll.filter(a => a.waiting), moving = home.roleActAll.filter(a => !a.waiting);
    const line = (brief.match(/(nothing[^.]*waits[^.]*\.|for [^,.]*, [a-z]+ things? waits?(?: and [a-z]+ more (?:is|are) under way)?: [^.]*\.|of [a-z]+ things waiting on [^:]*: [^.]*\.)/) || [''])[0];
    for (const a of home.homeWaiting) assert.ok(line.includes(first(a.head)), `${view} ${persona}: the home's chip "${a.head}" is not in the briefing's "${line}"`);
    for (const a of moving) assert.ok(!line.includes(first(a.head)), `${view} ${persona}: the briefing says "${a.head}" waits; the home says it is under way`);
    if (!waits.length) assert.match(line, /^nothing/, `${view} ${persona}: nothing waits on the home, yet the briefing reads "${line}"`);
  }
});

test('A Signals traffic figure opens its records with that figure, never a map scoped to a figure it does not print', () => {
  let seen = 0;
  for (const view of VIEWS) for (const persona of ['architect', 'neteng', 'security', 'finops']) {
    const v = vals(ins(view, { persona }));
    for (const k of ['talkers', 'multi', 'slo']) {
      const cd = card(v, k); if (!cd) continue;
      cd.all.forEach((r, i) => {
        if (r.fig === 'finding') return;
        const c = ins(view, { persona });
        card(vals(c), k).all[i].figGo();
        const st = c.state;
        assert.equal(st.obPage, 'logs', `${view} ${persona} ${k} ${r.label}: ${r.v} opens ${st.obPage}/${st.obPanel}, not its records`);
        assert.equal(st.explain.value, r.v, `${view} ${persona} ${k} ${r.label}: the landing explains ${st.explain.value}, the row reads ${r.v}`);
        assert.ok(st.explain.label.includes(r.label), `${view} ${persona} ${k}: the landing names "${st.explain.label}", the row "${r.label}"`);
        if (persona === 'neteng') assert.ok(vals(c).hasLogs, `${view} ${k} ${r.label}: the records page is empty`);
        seen += 1;
      });
    }
  }
  assert.ok(seen > 20, `only ${seen} figures checked`);
});
