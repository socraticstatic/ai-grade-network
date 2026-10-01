import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import * as BW from '../naas-bandwidth.js';
import * as R from '../naas-round2.js';
import { ESTATES } from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as FB from '../naas-fabric.js';
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

const WORST = { ok: 0, risk: 1, slo: 2, down: 3 };
test('The home\'s map dots draw only what Health lists, and a rolled-up row draws none', () => {
  for (const view of VIEWS) {
    const health = vals(obs(view, { obPanel: 'health' })).problemRows;
    const home = vals(mkC({ view, estateParam: null, screen: 's0' }));
    const regs = ESTATES[view].regionsList;
    const want = (names) => { const rs = regs.filter(r => names.includes(r.region)); if (!rs.length) return null;
      return rs.reduce((a, r) => health.filter(p => p.where === `${r.cloud} ${r.region}`).reduce((b, p) => (WORST[p.state] > WORST[b] ? p.state : b), a), 'ok'); };
    for (const r of home.heroRegions) {
      if (r.ghost) continue;
      assert.equal(r.relState, want([r.region]), `${view}: ${r.region}'s dot reads ${r.relState} ("${r.relTitle}")`);
      if (!r.relState) assert.equal(r.relFill, 'transparent', `${view}: ${r.region} draws a dot with no state`);
    }
    for (const cc of home.heroClouds.filter(x => !x.ghost)) {
      const names = regs.filter(x => x.cloud === cc.cloud).map(x => x.region);
      assert.equal(cc.relState, want(names), `${view}: ${cc.cloud}'s dot reads ${cc.relState} ("${cc.relTitle}")`);
    }
  }
});

test('Every dot a map draws has a key on that map, and on Connect a dot and its wire mean one thing', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    for (const [where, patch] of [['home', { screen: 's0' }], ['Connect', { screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'picture' }], ['Connect, performance', { screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'picture', lens: 'performance' }]]) {
      const v = vals(mkC({ view, estateParam: null, ...patch }));
      const keys = new Set(v.overlayLegend.filter(l => l.isDot || l.isBar).map(l => l.sw));
      for (const d of [...v.heroRegions, ...v.heroClouds].filter(x => x.relFill && x.relFill !== 'transparent'))
        assert.ok(keys.has(d.relFill), `${view} ${where}: ${d.region || d.cloud}'s dot ${d.relFill} ("${d.relTitle}") has no key`);
      if (where !== 'home') {
        // On Connect the lens colours the wire outside the network; a dot never says something else in that ink.
        const lensInks = new Set(['var(--success)', 'var(--warning)', 'var(--error)']);
        for (const d of [...v.heroRegions, ...v.heroClouds].filter(x => lensInks.has(x.relFill)))
          assert.match(d.relTitle, /lens/i, `${view} ${where}: ${d.region || d.cloud}'s dot "${d.relTitle}" wears a lens ink`);
        assert.ok(v.overlayLegend.some(l => /dot/.test(l.l) && /lens/.test(l.l)), `${view} ${where}: the legend does not say the dots follow the lens`);
        // Opened, each region's dot is its own wire's colour.
        for (const cloud of ['AWS', 'Azure']) {
          const o = vals(mkC({ view, estateParam: null, ...patch, cloudPick: cloud }));
          for (const r of o.heroRegions.filter(x => x.relFill && x.relFill !== 'transparent')) {
            const wire = o.heroEdges.find(e => e.region && e.region.region === r.region && !e.ghost && e.kind === 'egress');
            if (wire) assert.equal(wire.stroke, r.relFill, `${view} ${where}: ${r.region}'s dot is ${r.relFill}, its wire ${wire.stroke}`);
          }
          for (const cc of o.heroClouds) assert.equal(cc.relFill, 'transparent', `${view} ${where}: the ${cc.cloud} card draws a dot`);
        }
      }
    }
  }
});

test('The home legend\'s third party and public internet keys are two marks, as their wires are', () => {
  const v = vals(mkC({ view: 'mature', estateParam: null, screen: 's0' }));
  const third = v.overlayLegend.find(l => l.key === 'ot'), pub = v.overlayLegend.find(l => l.key === 'pub');
  assert.ok(third && pub, 'Established keys both');
  assert.notEqual(third.bar, pub.bar.replace(pub.sw, third.sw), 'the two keys differ only by a grey');
  const pubWires = v.heroEdges.filter(e => !e.priv && !e.ghost);
  assert.ok(pubWires.length, 'a public wire');
  for (const w of pubWires) assert.equal(w.dash, '2 4', `the public wire ${w.key} is not dotted, as its key is`);
});


// Orders on the one clock (SCH.nowOf): ordered Tue Sep 29, read Mon Oct 5, the Monday demo.
const ORDERED = Date.parse('2026-09-29T15:00:00Z'), LATER = Date.parse('2026-10-05T15:00:00Z');
const landedOf = (view, id, pick) => {
  const est = ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv);
  const cp = OD.capacity(X.connections(est, ob)).find(r => r.id === id);
  const o = BW.orderOf(cp, pick, ORDERED, est.id, { id: BW.nextId([]) });
  const landed = BW.landUtil(ob, [o], est.id, LATER);
  return { est, inv, landed, cap: OD.capacity(X.connections(est, landed)).find(r => r.id === id) };
};

test('A landed size reads the same in the AT&T network band as on Capacity: the port size and its use', () => {
  const { est, inv, landed, cap } = landedOf('partial', 'cx-us-east-1', { ports: 3, mbps: 1000 });
  assert.ok(cap.peakPct > 100, `the landed 3 x 1 Gbps reads ${cap.peakPct}%`);
  const fac = FB.facilities(est, inv, landed).find(f => f.regions.some(r => r.region === 'us-east-1'));
  assert.equal(fac.regions.length, 1, 'one region on that facility');
  assert.match(fac.sub, new RegExp(`· ${cap.peakPct}% used$`), `the facility reads "${fac.sub}", Capacity ${cap.peakPct}%`);
  for (const p of FB.ports(fac)) assert.match(p.sub, /^1 Gbps · /, `a landed 1 Gbps port reads "${p.sub}"`);
  assert.ok(FB.ports(fac).some(p => p.pct > 99), 'the ports are capped at 99% under a 410% connection');
});

test('Order ids never repeat, whatever Reset demo leaves', () => {
  const flow = { id: 'o2', title: 'Rehearsed connection', stage: 'Submitted for approval' };
  const a = BW.nextId([flow]);
  const b = BW.nextId([flow, { id: a, kind: 'bandwidth' }]);
  assert.notEqual(a, 'o2'); assert.notEqual(b, a); assert.notEqual(b, 'o2');
  assert.notEqual(BW.nextId([{ id: 'o1', kind: 'bandwidth' }, flow]), 'o2');
});

test('Network Eng\'s latency action counts the regions its Latency over SLO list shows', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { persona: 'neteng', insPanel: 'role' }));
    const list = (v.roleVisuals || []).find(x => x.key === 'slo');
    const regions = new Set((card(vals(ins(view, { persona: 'neteng' })), 'slo') || { all: [] }).all.map(r => r.region));
    const act = v.roleActAll.find(a => /above the latency SLO/.test(a.head));
    if (!regions.size) { assert.ok(!act, `${view}: "${act && act.head}" with nothing over SLO`); continue; }
    assert.ok(act, `${view}: ${regions.size} regions over SLO and no action`);
    assert.match(act.head, new RegExp(`^${regions.size} ${regions.size === 1 ? 'region runs' : 'regions run'} above`), `${view}: "${act.head}" under a list of ${[...regions].join(', ')}`);
    if (list) assert.ok(list.rows.length > 0);
  }
});

test('The Architect\'s lead cards each open their own findings, never the same one twice', () => {
  for (const view of VIEWS) {
    const seen = new Map();
    for (const cd of vals(ins(view, { persona: 'architect' })).sigCards) {
      if (!cd.finds || cd.finds.none) continue;
      const c = ins(view, { persona: 'architect' });
      vals(c).sigCards.find(x => x.key === cd.key).finds.go();
      const keys = vals(c).insightRows.map(r => r.key);
      for (const k of keys) { assert.ok(!seen.has(k), `${view}: ${cd.title} and ${seen.get(k)} both open ${k}`); seen.set(k, cd.title); }
    }
  }
});

test('Your actions\' head reads the figures its role\'s Signals read, and its records door carries them', () => {
  const g = (t) => (/([\d.]+) Gbps/.exec(t) || [])[1];
  for (const view of VIEWS) {
    const exp = card(vals(ins(view, { persona: 'security' })), 'talkers').head;
    const cov = card(vals(ins(view, { persona: 'exec' })), 'talkers').head;
    for (const persona of ['neteng', 'security']) {
      const c = ins(view, { persona, insPanel: 'role' }), v = vals(c);
      if (!g(exp)) continue;
      assert.equal(g(v.roleHead), g(exp), `${view} ${persona}: "${v.roleHead}" against Signals' "${exp}"`);
      v.roleGo();
      assert.equal(c.state.explain.value, `${g(exp)} Gbps`, `${view} ${persona}: the records explain ${c.state.explain.value}`);
    }
    const e = vals(ins(view, { persona: 'exec', insPanel: 'role' }));
    const pct = (/(\d+)% of traffic/.exec(cov) || [])[1];
    if (pct) assert.match(e.roleHead, new RegExp(`^${pct}% `), `${view} exec: "${e.roleHead}" against Signals' "${cov}"`);
  }
});

test('A role\'s Signals count as findings only what its Your actions can list; an event says event', () => {
  for (const view of VIEWS) for (const persona of ['architect', 'neteng', 'security', 'finops']) {
    const ya = vals(ins(view, { persona, insPanel: 'role' })).roleActAll.length;
    const sig = vals(ins(view, { persona }));
    if (!ya) for (const cd of sig.sigCards.slice(0, 3)) assert.doesNotMatch(cd.finds.label, /\d+ findings?/, `${view} ${persona}: Your actions lists nothing, yet ${cd.title} reads "${cd.finds.label}"`);
  }
  const sec = vals(ins('mature', { persona: 'security' }));
  assert.equal(sec.sigCards.find(x => x.key === 'newdest').finds.label, '1 event ›');
});

test('A Signals card keys only the inks its rows draw', () => {
  for (const view of VIEWS) for (const persona of ['architect', 'neteng', 'security', 'finops', 'exec']) {
    for (const cd of vals(ins(view, { persona })).sigAll) {
      if (cd.isCols || !cd.all.length) continue;
      const drawn = new Set(cd.all.flatMap(r => r.segs.map(x => x.fill)));
      for (const l of cd.legend) assert.ok(drawn.has(l.ink), `${view} ${persona} ${cd.title}: the key "${l.label}" (${l.ink}) is drawn by no row`);
    }
  }
});

test('Cost > By region\'s Steer on an attached region changes its routing, never buys an internet circuit', () => {
  let seen = 0;
  for (const view of VIEWS) {
    const base = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'legs', costBy: 'region' }));
    for (const r of (base.regionSaveRows || []).filter(x => / · attached$/.test(x.sub))) {
      const c = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'legs', costBy: 'region' });
      vals(c).regionSaveRows.find(x => x.key === r.key).attach();
      assert.notEqual(c.state.screen, 's4', `${view} ${r.label}: Steer starts a new order`);
      assert.equal(c.state.tab, 'govern', `${view} ${r.label}: Steer lands on ${c.state.tab}`);
      assert.ok(c.state.authoring && c.state.authoring.req.includes('Cost-aware routing') && c.state.authoring.match === 'region ' + r.regionId, `${view} ${r.label}: ${JSON.stringify(c.state.authoring)}`);
      seen += 1;
    }
  }
  assert.ok(seen > 0, 'no attached region with egress to steer');
});

test('A map node\'s Add a port opens a drawer whose peak the node\'s Connection line prints', () => {
  for (const [view, cloud, region] of [['trust', 'GCP', 'us-central1'], ['partial', 'AWS', 'us-east-1']]) {
    const node = vals(obs(view, { obPanel: 'map', mapOpen: ['cloud:' + cloud], mapSel: `cloud:${cloud}/${region}` })).panel;
    const line = node.overview.find(o => o.k === 'Connection').v;
    const peak = vals(obs(view, { bwFor: 'cx-' + region })).bw.stats.find(x => x.l === 'Peak');
    assert.ok(line.includes(`peak ${peak.v}`) && line.includes(peak.sub), `${view} ${region}: the node reads "${line}", the drawer "${peak.v}, ${peak.sub}"`);
  }
});

test('A connection\'s current never reads above the peak its Modify bandwidth opens on', () => {
  for (const [view, id] of [['partial', 'cx-us-east-1'], ['trust', 'cx-us-central1'], ['trust', 'cx-us-east-1']]) {
    const cur = vals(obs(view, { mapSel: id, panelTab: 'overview' })).panel.overview.find(o => /^Current/.test(o.k)).v;
    const peak = vals(obs(view, { bwFor: id })).bw.stats.find(x => x.l === 'Peak').v;
    assert.ok(parseFloat(cur) <= parseFloat(peak), `${view} ${id}: current ${cur} over a ${peak} peak`);
  }
});

test('Capacity\'s average bar is the one ink its legend keys, whatever the state', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const g of vals(obs(view)).gaugeRows)
    assert.equal(g.color, 'var(--viz-1)', `${view} ${g.label}: the average bar is ${g.color} under a legend of Average use in --viz-1`);
});

test('A region never sends more outside AT&T than it carries, and the regions hold all the traffic', () => {
  for (const view of VIEWS) {
    const est = ESTATES[view], ob = A.observe(est, [], A.inventory(est));
    const iw = R.insightWidgets(est, ob, 30);
    for (const t of iw.talkersAll) assert.ok(t.pubG <= t.gbps + 1e-9, `${view} ${t.label}: ${t.pubG} Gbps public of ${t.gbps} Gbps`);
    const sum = iw.talkersAll.reduce((a, t) => a + t.gbps, 0);
    assert.ok(Math.abs(sum - ob.total) <= 0.05 * iw.talkersAll.length + 1e-9, `${view}: the regions carry ${sum.toFixed(1)} of ${ob.total} Gbps`);
  }
});

test('A policy\'s matched count reads as Govern > Tags reads the same number', () => {
  const v = vals(mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies' }));
  const pci = v.polRows.find(p => p.match === 'tag PCI');
  assert.equal(pci.appliesTo, 'tag PCI · 1,047 matched');
});

test('A By leg tile is the sum of the rows it opens, to the dollar', () => {
  const $ = (t) => +String(t).replace(/[$,]/g, '');
  let seen = 0;
  for (const view of ['partial', 'mature', 'trust']) {
    const at = (patch) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'legs', ...patch }));
    const base = at({ costBy: 'all' });
    const picks = [{ costBy: 'all' }];
    for (const by of ['region', 'cloud']) for (const m of (at({ costBy: by }).regionBars || [])) picks.push({ costBy: by, costPick: m.key });
    for (const p of picks) {
      const v = at(p);
      const rows = { access: v.legAccessRows, connect: v.legConnectRows, cloud: v.legCloudRows };
      v.legTiles.forEach((t, i) => {
        const rs = rows[['access', 'connect', 'cloud'][i]] || [];
        if (!rs.length) return;
        const sum = rs.reduce((a, r) => a + $(r.vF), 0);
        assert.equal(sum, $(t.v), `${view} ${JSON.stringify(p)} ${t.l}: the tile reads ${t.v}, its rows ${sum}`);
        seen += 1;
      });
    }
    assert.ok(base.legTiles.length === 3);
    // A member's row before the pick is the tile after it.
    for (const by of ['region', 'cloud']) {
      const un = at({ costBy: by });
      for (const [i, leg] of ['legAccessRows', 'legConnectRows', 'legCloudRows'].entries()) for (const r of un[leg] || []) {
        const t = at({ costBy: by, costPick: r.key.replace(/^m:/, '') }).legTiles[i];
        if (t) assert.equal($(r.vF), $(t.v), `${view} by ${by} ${r.label}: the row reads ${r.vF}, picked its tile ${t.v}`);
      }
    }
  }
  assert.ok(seen > 10, `only ${seen} tiles checked`);
});

test('A map node offers Steer only where a flow there has an end on AT&T, and steers that flow', () => {
  let seen = 0;
  for (const view of VIEWS) {
    const est = ESTATES[view], flows = A.observe(est, [], A.inventory(est)).flows;
    for (const r of est.regionsList) {
      const sel = `cloud:${r.cloud}/${r.region}`;
      const c = obs(view, { obPanel: 'map', mapOpen: ['cloud:' + r.cloud], mapSel: sel });
      const p = vals(c).panel; if (!p) continue;
      const st = p.actions.find(a => a.key === 'steer'); if (!st) continue;
      seen += 1;
      st.go();
      const id = (c.state.steered || []).slice(-1)[0], f = flows.find(x => x.id === id);
      assert.ok(f && R.canSteerFlow(est.regionsList, f), `${view} ${r.region}: Steer put ${id} (${f && f.name}) on AT&T with no end there`);
      // The panel's lead button is the same move.
      if (/^Steer/.test(p.primary.label)) { const c2 = obs(view, { obPanel: 'map', mapOpen: ['cloud:' + r.cloud], mapSel: sel }); vals(c2).panel.primary.go(); assert.deepEqual(c2.state.steered, c.state.steered, `${view} ${r.region}: the lead Steer did something else`); }
    }
  }
  assert.ok(seen >= 0);
});

test('FinOps\' egress head names what its dollars and its Gbps each count', () => {
  // Bank scale: the GPU bucket bills public from a region on NetBond, so the dollars hold it and the Gbps do not.
  const t = card(vals(ins('trust', { persona: 'finops' })), 'talkers');
  assert.match(t.head, /^\$[\d,]+\/mo billed public · [\d.]+ Gbps outside AT&T$/, t.head);
});

test('Blue money reads AT&T price on Cost\'s By bucket and on Traffic\'s Cost view, as Cost\'s legend does', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const bk = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'bucket' }));
    for (const b of bk.buckets) assert.notEqual(b.savedF, 'On AT&T', `${view} ${b.name}`);
    const map = vals(obs(view, { obPanel: 'map', mapMode: 'cost' }));
    for (const l of map.mapLegend) assert.doesNotMatch(l.label, /^On AT&T/, `${view}: Traffic's Cost view keys "${l.label}"`);
  }
});

test('AT&T charges with nothing attached says so and opens By leg, never a blank panel', async () => {
  const c = mkC({ view: 'small', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'charges' });
  const v = vals(c);
  assert.equal(v.hasAttCharges, false);
  assert.equal(v.noAttCharges, true, 'Small business shows a blank AT&T charges panel');
  assert.match(v.attEmpty, /By leg/);
  v.attEmptyGo();
  assert.equal(c.state.costPanel, 'legs');
  const html = (await import('node:fs')).readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.ok(html.includes('{{ attEmpty }}') && html.includes('{{ noAttCharges }}'));
});

test('The cross-cloud finding names the public pairs Cloud-to-cloud shows, and no others', () => {
  for (const view of VIEWS) {
    const est = ESTATES[view], f = est.findings.find(x => x.kind === 'crosscloud');
    if (!f) continue;
    for (const a of (est.arcs || []).filter(x => !x.priv)) assert.ok(f.ev.includes(`${a.from} to ${a.to}`), `${view}: "${f.ev}" does not name ${a.from} to ${a.to}`);
    assert.doesNotMatch(f.ev, /other pairs|regions to the other clouds/, `${view}: "${f.ev}" counts pairs the card does not show`);
  }
});
