import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, init } from '../naas-app.js';
import { CARD_ORDER, words } from '../naas-home.js';
import { mkC } from './harness.mjs';

// The NaaS home, v2 (Micah, 2026-09-30: "home page is too wordy! this isn't a
// white paper"; "snapshot views"; "more visual, what's the take-away";
// "actionability"; "it needs to tell a story without words - visuals"). He
// approved the mockup: one take-away per persona, four snapshot cards with a
// small picture each, Waiting on you as three chips, and the Connect network
// map below the fold. Every figure is the page's own that it opens; the home
// adds the layout and the pictures, never a number of its own.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const NOW = '2026-10-05T14:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const LIVE = ESTATES.filter(e => e !== 'empty');
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', nowIso: NOW, ...patch });
const observe = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', nowIso: NOW, ...patch });
const WORD = { down: 'down', slo: 'over SLO', risk: 'at risk' };
const tile = (v, k) => v.spendTiles.find(t => t.key === k).v;
const roll = (v, k) => v.rollup.find(t => t.key === k);
const stat = (v, k) => String(v.invStats.find(x => x.key === k).v);
const money = (s) => +String(s).replace(/[^\d]/g, '');
const at = (c, keys) => keys.map(k => c.state[k]);
const card = (v, k) => v.homeCards.find(x => x.key === k);
// Every string the home prints, for the word, zero and dash checks.
const printed = (v) => [v.homeTake && v.homeTake.head, v.homeTake && v.homeTake.sub, v.homeTake && v.homeTake.cta, v.homeWaitingMore, v.homeWaitingNone,
  v.homeStep && v.homeStep.line, v.homeStep && v.homeStep.sub, v.homeStep && v.homeStep.cta,
  ...(v.homeCards || []).flatMap(x => [x.label, x.value, x.unit, ...x.figs.flatMap(f => [f.v, f.u]), ...(x.legend || []).map(l => l.word)]),
  ...(v.homeWaiting || []).flatMap(a => [a.head, a.stateLabel, a.saveLine, a.doorLabel])].filter(Boolean);

// ---- 1. The take-away: one per persona, read from the page it lands on ----

test('the take-away is one headline, one line and one action per persona, each from its page\'s own figures', () => {
  for (const view of LIVE) {
    const obHead = vals(observe(view)).pageVerdict;
    for (const persona of ROLES) {
      const where = `${view}/${persona}`;
      const v = vals(home(view, { persona }));
      const t = v.homeTake;
      assert.ok(t && t.head && t.sub && t.cta, `${where}: no take-away`);
      if (persona === 'neteng') {
        // The worst live problem leads (skeptic, 2026-09-30): an outage beats over SLO beats at risk.
        const p = [...v.problemRows].sort((a, b) => ({ down: 0, slo: 1, risk: 2 }[a.state] - { down: 0, slo: 1, risk: 2 }[b.state]))[0];
        if (p) {
          assert.equal(t.head, `${p.where} is ${WORD[p.state]}`, where);
          const who = p.apps.length === 1 ? `${p.apps[0][0].toUpperCase()}${p.apps[0].slice(1)} rides it` : `${p.apps.length} apps ride it`;
          assert.equal(t.sub, `${who} · ${p.wl.toLocaleString('en-US')} workloads · ${p.ago}`, where);
          assert.equal(t.cta, 'Trace it', where);
        } else assert.equal(t.head, 'Nothing is down or over SLO', where);
      }
      if (persona === 'exec') {
        const fig = t.head.replace(/\/mo on the table$/, '');
        assert.ok(obHead.includes(`${fig}/mo potential savings`), `${where}: "${t.head}" is not Observe's "${obHead}"`);
        // The moves are the executive's Your actions, and they add up to the headline.
        assert.equal(v.roleActAll.reduce((a, r) => a + money(r.saveLine), 0), money(fig), `${where}: the moves do not add up to ${fig}`);
        const n = v.roleActAll.length;
        assert.ok(t.sub.startsWith(`${n} ${n === 1 ? 'move' : 'moves'} · `), `${where}: "${t.sub}"`);
        const down = v.problemRows.filter(p => p.state === 'down');
        assert.ok(t.sub.endsWith(down.length ? `${down.length} ${down.length === 1 ? 'outage' : 'outages'}${down[0].apps.length === 1 ? ` on ${down[0].apps[0][0].toUpperCase()}${down[0].apps[0].slice(1)}` : ` on ${down[0].apps.length} apps`}` : 'nothing down'), `${where}: "${t.sub}"`);
        assert.equal(t.cta, 'See the moves', where);
      }
      if (persona === 'finops') {
        // Spend's own words (skeptic, 2026-09-30): Could save, what is banked, the regions that move.
        const pub = +roll(v, 'connect').value.split(' ')[0];
        // Spend's tile whole, its condition with it (third skeptic, 2026-09-30).
        // Spend's condition, whatever Spend says it is (Cost v2 merged, 2026-09-30).
        const could = v.spendTiles.find(x => x.key === 'could');
        assert.equal(t.head, `Could save ${tile(v, 'could')}/mo ${could.sub}`, where);
        assert.equal(t.sub, `${money(tile(v, 'banked')) ? `${tile(v, 'banked')} banked to date` : 'Nothing banked yet'} · ${pub} ${pub === 1 ? 'region' : 'regions'} to move`, where);
        assert.equal(t.cta, 'Optimize', where);
      }
      if (persona === 'security') {
        // One part, Govern's total; the policy-row count left (skeptic, 2026-09-30).
        const e = stat(v, 'e'), g = roll(v, 'govern');
        // Discover's own word (third skeptic, 2026-09-30).
        assert.equal(t.head, `${e} ${e === '1' ? 'workload' : 'workloads'} exposed`, where);
        assert.equal(t.sub, `${g.value} policy violations`, where);
        assert.equal(t.cta, 'Review violations', where);
      }
      if (persona === 'architect') {
        // The public regions' clouds, named (skeptic, 2026-09-30).
        const cn = roll(v, 'connect'), pub = +cn.value.split(' ')[0];
        const pubWl = v.haveCards[1].soWhat.match(/([\d,]+) workloads on the internet/)[1];
        const names = [...new Set(v.allRegions.filter(r => !r.priv).map(r => r.cloud))];
        const named = names.length < 2 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
        assert.equal(t.head, `${cn.value} still ${pub === 1 ? 'rides' : 'ride'} the public internet`, where);
        assert.equal(t.sub, `${pubWl} workloads ride ${pub === 1 ? 'it' : 'them'} · on ${named}`, where);
        assert.equal(t.cta, cn.door, where);
      }
    }
  }
});

test('the take-away lands on its page', () => {
  const land = (persona, view = 'partial') => { const c = home(view, { persona }); vals(c).homeTake.go(); return c; };
  // Network Eng: Trace it opens Paths on the problem, as Health's Trace does.
  const ne = land('neteng');
  assert.deepEqual(at(ne, ['screen', 'tab', 'obPage', 'obPanel']), ['s3', 'observe', 'perf', 'paths']);
  assert.equal(ne.state.pathSel, 'finance|eastus');
  // Executive: See the moves opens Your actions, as the executive.
  assert.deepEqual(at(land('exec'), ['screen', 'tab', 'obPage', 'insPanel', 'persona']), ['s3', 'observe', 'insights', 'role', 'exec']);
  // FinOps: Optimize opens Cost > Optimize.
  assert.deepEqual(at(land('finops'), ['screen', 'tab', 'costPanel']), ['s3', 'cost', 'optimize']);
  // Security: Review violations opens Govern > Violations & policies.
  assert.deepEqual(at(land('security'), ['screen', 'tab', 'govPanel']), ['s3', 'govern', 'policies']);
  // Architect: the Connect tile's own door, Connect > Options.
  assert.deepEqual(at(land('architect'), ['screen', 'tab', 'cnPage']), ['s3', 'connect', 'options']);
});

// The drill rule on the take-away (2026-09-30): the headline and each part of
// the line that counts something open that set; a duration is never a door.
test('the take-away\'s headline and each counted part of its line open the set they count', () => {
  const tap = (persona, pick, view = 'partial') => { const c = home(view, { persona }); pick(vals(c).homeTake)(); return c; };
  const part = (i) => (t) => t.parts[i].go;
  const v = vals(home('partial'));
  assert.deepEqual(v.homeTake.parts.map(p => [p.t, p.off]), [['Finance rides it', false], ['40 workloads', false], ['22 min', true]]);
  assert.equal(v.homeTake.parts.map(p => p.t).join(' · '), v.homeTake.sub, 'the parts are the line');
  // Network Eng: the headline traces the problem; Finance opens its own path; the workloads open Health.
  assert.equal(tap('neteng', t => t.headGo).state.pathSel, 'finance|eastus');
  const fin = tap('neteng', part(0));
  assert.deepEqual([...at(fin, ['screen', 'tab', 'obPanel']), fin.state.pathSel], ['s3', 'observe', 'paths', 'finance|eastus']);
  assert.deepEqual(at(tap('neteng', part(1)), ['screen', 'tab', 'obPanel']), ['s3', 'observe', 'health']);
  // Executive: the moves are Your actions; the outage is in Health.
  assert.deepEqual(at(tap('exec', part(0)), ['tab', 'obPage', 'insPanel']), ['observe', 'insights', 'role']);
  assert.deepEqual(at(tap('exec', part(1)), ['tab', 'obPanel']), ['observe', 'health']);
  // FinOps: Could save and banked are Spend's own tiles; the regions to move are Recommended's.
  assert.deepEqual(at(tap('finops', t => t.headGo), ['tab', 'costPanel']), ['cost', 'spend']);
  assert.deepEqual(at(tap('finops', part(0)), ['tab', 'costPanel']), ['cost', 'spend']);
  assert.deepEqual(at(tap('finops', part(1)), ['tab', 'cnPage']), ['connect', 'options']);
  // Security: the exposed workloads are Discover's At a glance, scanned; the violations, Violations & policies.
  assert.deepEqual(at(tap('security', t => t.headGo), ['screen', 'discoverView', 'estPanel', 'scanStep']), ['s1', 'estate', 'glance', 4]);
  assert.deepEqual(at(tap('security', part(0)), ['tab', 'govPanel']), ['govern', 'policies']);
  // Architect: the workloads on the internet are Discover's At a glance; the clouds are named, not a door.
  assert.deepEqual(at(tap('architect', part(0)), ['screen', 'discoverView', 'estPanel']), ['s1', 'estate', 'glance']);
  assert.equal(vals(home('partial', { persona: 'architect' })).homeTake.parts[1].off, true);
});

test('the persona chips switch the take-away and the card order', () => {
  const c = home('partial');
  const heads = new Set();
  for (const persona of ROLES) {
    const v = vals(c);
    v.roleChips.find(r => r.key === persona).go();
    const w = vals(c);
    assert.equal(c.state.persona, persona);
    assert.deepEqual(w.homeCards.map(x => x.key), CARD_ORDER[persona], persona);
    heads.add(w.homeTake.head);
  }
  assert.equal(heads.size, ROLES.length, 'two personas share a take-away');
  assert.deepEqual(CARD_ORDER.neteng[0], 'apps');
  assert.deepEqual(CARD_ORDER.exec[0], 'egress');
  // No card repeats the take-away (skeptic, 2026-09-30): Security leads with Tags, the Architect with Egress.
  assert.deepEqual(CARD_ORDER.security[0], 'tags');
  assert.deepEqual(CARD_ORDER.architect[0], 'egress');
  assert.deepEqual(CARD_ORDER.finops[0], 'egress');
  for (const order of Object.values(CARD_ORDER)) {
    assert.equal(new Set(order).size, 4);
    for (const k of order) assert.ok(['apps', 'egress', 'exposed', 'onatt', 'tags'].includes(k), k);
  }
});

// ---- 2. The four snapshot cards ----

test('every card\'s figures are its page\'s own, on every estate', () => {
  for (const view of LIVE) {
    const v = vals(home(view));
    // On AT&T: regions private of all, and sites on AT&T of all, as Discover's At a glance reads them.
    const [sitesG, cloudsG] = v.glanceRings;
    const on = card(v, 'onatt');
    const priv = cloudsG.head.match(/^(\d+) private$/)[1];
    assert.equal(on.value, `${priv} of ${cloudsG.centre}`, `${view}: regions`);
    const sAtt = /^All on AT&T$/.test(sitesG.head) ? sitesG.centre : sitesG.head.match(/^([\d,]+) on AT&T$/)[1];
    assert.equal(on.figs[0].v, `${sAtt} of ${sitesG.centre}`, `${view}: sites`);
    // Apps healthy: Health's tile, one dot per app group in Health's order, ink and shape.
    const apps = card(v, 'apps');
    assert.equal(apps.value, v.healthTiles.find(x => x.key === 'ok').v, `${view}: apps`);
    assert.deepEqual(apps.dots.map(d => d.key), v.pathFlowAll.map(r => r.tag), `${view}: dots`);
    const INK = { ok: 'var(--success)', risk: 'var(--warning)', slo: 'var(--viz-5)', down: 'var(--error)' };
    apps.dots.forEach((d, i) => { const st = v.pathFlowAll[i].state; assert.equal(d.ink, INK[st], `${view} ${d.key}`); assert.equal(d.rad, st === 'down' ? '2px' : '9999px', `${view} ${d.key}`); });
    // Egress: Spend's this month, and Spend's In 90 days with the moves.
    const eg = card(v, 'egress');
    assert.equal(eg.value, tile(v, 'spend'), `${view}: egress`);
    assert.equal(eg.figs[0].v, `${tile(v, 'ahead')}/mo`, `${view}: if you act`);
    assert.match(eg.spark.past, /^M[\d.]+,[\d.]+( L[\d.]+,[\d.]+){11}$/, `${view}: twelve months drawn`);
    assert.match(eg.spark.asIs, /^M[\d.]+,[\d.]+( L[\d.]+,[\d.]+){3}$/, `${view}: the forecast, three months on from today`);
    assert.match(eg.spark.act, /^M[\d.]+,[\d.]+( L[\d.]+,[\d.]+){3}$/, `${view}: if you act, three months on`);
    // Exposed: Discover's exposed workloads of all, and Govern's violations; the cells are the share.
    const ex = card(v, 'exposed');
    assert.equal(ex.value, `${stat(v, 'e')} of ${stat(v, 'w')}`, `${view}: exposed`);
    assert.equal(ex.figs[0].v, roll(v, 'govern').value, `${view}: violations`);
    const share = money(stat(v, 'e')) / money(stat(v, 'w')) * 100;
    assert.equal(ex.waffle.filter(c => c.on).length, Math.max(1, Math.round(share)), `${view}: the lit cells are exposed of all workloads`);
  }
});

test('the egress line rises with the months and forks at today: as is up, if you act down', () => {
  const eg = card(vals(home('partial')), 'egress');
  const pts = (d) => d.slice(1).split(' L').map(p => p.split(',').map(Number));
  const past = pts(eg.spark.past), asIs = pts(eg.spark.asIs), act = pts(eg.spark.act);
  assert.deepEqual(asIs[0], past[past.length - 1], 'the forecast starts at today');
  assert.deepEqual(act[0], past[past.length - 1], 'if you act starts at today');
  assert.ok(past[0][1] > past[past.length - 1][1], 'egress grew over the year (y runs down)');
  assert.ok(asIs[3][1] < past[past.length - 1][1], 'as is keeps growing');
  assert.ok(act[3][1] > past[past.length - 1][1], 'acting brings it down');
});

test('each card is one door to its page, and each figure, ring segment, dot and bar opens the set it counts', () => {
  const click = (fn, patch = {}) => { const c = home('partial', patch); fn(vals(c))(); return c; };
  // The card doors.
  assert.deepEqual(at(click(v => card(v, 'onatt').go), ['screen', 'tab', 'cnPage']), ['s3', 'connect', 'picture']);
  assert.deepEqual(at(click(v => card(v, 'apps').go), ['screen', 'tab', 'obPage', 'obPanel', 'healthView']), ['s3', 'observe', 'perf', 'health', 'app']);
  assert.deepEqual(at(click(v => card(v, 'egress').go), ['screen', 'tab', 'costPanel']), ['s3', 'cost', 'spend']);
  assert.deepEqual(at(click(v => card(v, 'exposed').go), ['screen', 'discoverView', 'estPanel']), ['s1', 'estate', 'glance']);
  // On AT&T: private regions are Connect's own "N are private", on its map; public ones are
  // Recommended's list; sites on or off AT&T are the network map's own Reach filter.
  const segs = card(vals(home('partial')), 'onatt').segs;
  assert.deepEqual(segs.map(g => g.key), ['priv', 'pub', 'att', 'outside']);
  const seg = (k) => (v) => card(v, 'onatt').segs.find(g => g.key === k).go;
  assert.deepEqual(at(click(seg('priv')), ['screen', 'tab', 'cnPage']), ['s3', 'connect', 'picture']);
  assert.deepEqual(at(click(seg('pub')), ['screen', 'tab', 'cnPage']), ['s3', 'connect', 'options']);
  assert.deepEqual(click(seg('att')).state.siteFilter, { reach: 'att' });
  assert.deepEqual(click(seg('outside')).state.siteFilter, { reach: 'outside' });
  assert.deepEqual(at(click(v => card(v, 'onatt').valueGo), ['screen', 'tab', 'cnPage']), ['s3', 'connect', 'picture']);
  const sites = click(v => card(v, 'onatt').figs[0].go);
  assert.deepEqual([sites.state.screen, sites.state.tab, sites.state.cnPage, sites.state.siteFilter], ['s3', 'connect', 'picture', { reach: 'att' }]);
  // Each app's dot opens that app's own path in Paths.
  const v0 = vals(home('partial'));
  const pathRow = (tag) => v0.pathTimeAll.find(r => r.key.startsWith(tag + '|'));
  for (const d of card(v0, 'apps').dots) {
    const c = home('partial');
    card(vals(c), 'apps').dots.find(x => x.key === d.key).go();
    assert.deepEqual(at(c, ['screen', 'tab', 'obPanel']), ['s3', 'observe', 'paths'], d.key);
    assert.equal(c.state.pathSel, pathRow(d.key).key, d.key);
  }
  // Egress: today and in 90 days are both Spend's own tiles (skeptic, 2026-09-30).
  assert.deepEqual(at(click(v => card(v, 'egress').valueGo), ['screen', 'tab', 'costPanel']), ['s3', 'cost', 'spend']);
  assert.deepEqual(at(click(v => card(v, 'egress').figs[0].go), ['screen', 'tab', 'costPanel']), ['s3', 'cost', 'spend']);
  // Exposed: the workloads and their cells are Discover's At a glance, the violations Govern's list.
  assert.deepEqual(at(click(v => card(v, 'exposed').valueGo), ['screen', 'discoverView', 'estPanel', 'scanStep']), ['s1', 'estate', 'glance', 4]);
  assert.deepEqual(at(click(v => card(v, 'exposed').wafGo), ['screen', 'discoverView', 'estPanel', 'scanStep']), ['s1', 'estate', 'glance', 4]);
  assert.deepEqual(at(click(v => card(v, 'exposed').figs[0].go), ['screen', 'tab', 'govPanel']), ['s3', 'govern', 'policies']);
  // Only traffic figures open Logs: nothing on the home counts traffic, so nothing opens Logs.
  const doors = (x) => [x.go, x.valueGo, x.wafGo, ...x.figs.map(f => f.go), ...(x.segs || []).map(g => g.go), ...(x.dots || []).map(d => d.go)];
  for (const [k, persona] of [['onatt', 'neteng'], ['apps', 'neteng'], ['egress', 'neteng'], ['exposed', 'neteng'], ['tags', 'security']]) {
    const n = doors(card(vals(home('partial', { persona })), k)).length;
    for (let i = 0; i < n; i++) {
      const c = home('partial', { persona });
      doors(card(vals(c), k))[i]();
      assert.notEqual(c.state.obPage, 'logs', `${k} door ${i}`);
    }
  }
});

test('a figure that counts nothing is drawn and never a door', () => {
  const v = vals(home('small'));
  const on = card(v, 'onatt');
  assert.equal(on.value, '0 of 2');
  assert.equal(on.valueOff, true, 'no private region to open');
  assert.deepEqual(on.segs.map(g => g.key), ['pub', 'att'], 'a zero segment is not drawn');
  assert.equal(card(vals(home('partial')), 'onatt').valueOff, false);
});

test('no card looks selected: one edge for all four', () => {
  for (const view of ['partial', 'small']) for (const x of vals(home(view)).homeCards) assert.equal(x.edge, 'var(--border-secondary)', `${view} ${x.key}`);
});

// ---- 3. Waiting on you ----

test('Waiting on you is the first three of the role\'s Your actions still waiting', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(home(view, { persona }));
    assert.deepEqual(v.homeWaiting.map(a => a.key), v.roleActAll.filter(a => a.waiting).slice(0, 3).map(a => a.key), `${view}/${persona}`);
  }
  const v = vals(home('partial', { persona: 'finops' }));
  assert.equal(v.homeWaitingMore, `All ${v.roleActAll.length} in Your actions ›`);
  assert.equal(vals(home('mature', { persona: 'security' })).homeWaitingNone, 'No finding waits on you');
});

test('Accept on a chip moves the finding Your actions shows, and it leaves Waiting on you', () => {
  const c = home('partial', { persona: 'architect' });
  const row = vals(c).homeWaiting.find(a => a.canAccept);
  assert.ok(row, 'an open row to accept');
  row.accept();
  assert.equal(c.state.screen, 's0', 'Accept stays on the home');
  assert.ok(!vals(c).homeWaiting.some(a => a.key === row.key), 'an accepted finding still waits');
  c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role' });
  assert.equal(vals(c).roleActAll.find(a => a.key === row.key).stateLabel, 'Acknowledged');
});

test('a chip opens its finding in place; All N opens Your actions', () => {
  const c = home('partial', { persona: 'finops' });
  const row = vals(c).homeWaiting[0];
  row.open();
  assert.equal(c.state.screen, 's0');
  assert.equal(c.state.fdKey, row.key);
  assert.equal(vals(c).fdOpen, true);
  const d = home('partial');
  vals(d).homeWaitingGo();
  assert.deepEqual(at(d, ['screen', 'tab', 'obPage', 'insPanel']), ['s3', 'observe', 'insights', 'role']);
});

test('All N in Your actions opens Insights > Your actions', () => {
  // Network Eng, who has more than three (2026-09-30): cross-cloud went to the Architect with
  // the other coverage and topology findings, so FinOps holds two on Growing.
  const c = home('partial', { persona: 'neteng' });
  const v = vals(c);
  assert.equal(v.homeWaiting.length, 3);
  assert.equal(v.homeWaitingMore, `All ${v.roleActAll.length} in Your actions ›`);
  v.homeWaitingGo();
  assert.deepEqual([c.state.screen, c.state.tab, c.state.obPage, c.state.insPanel], ['s3', 'observe', 'insights', 'role']);
});

test('Andi\'s briefing is one link to Insights > Monthly briefing, never prose on the home', () => {
  const c = home('partial');
  const v = vals(c);
  assert.equal(v.homeBrief, undefined, 'the briefing paragraph left the home');
  v.homeBriefGo();
  assert.deepEqual(at(c, ['screen', 'tab', 'obPage', 'insPanel']), ['s3', 'observe', 'insights', 'brief']);
});

// ---- 4. The map below the fold ----

test('the Connect network map renders below the home, on every estate with something to draw', () => {
  for (const view of LIVE) {
    const v = vals(home(view));
    assert.equal(v.heroVisible, true, `${view}: the map is on the home`);
    assert.equal(v.heroFold, 'below', view);
    assert.equal(v.hasIncidents, false, `${view}: the take-away already names the problem`);
  }
  const e = vals(home('empty'));
  assert.equal(e.heroVisible, false, 'Empty draws no map');
  assert.equal(e.heroStrip, false, 'nor its strip');
  const cn = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', nowIso: NOW }));
  assert.equal(cn.heroVisible, true, 'Connect keeps its map');
  assert.equal(cn.heroFold, 'page');
});

// ---- 5. Words ----

test('no line on the home runs past twelve words, and none carries an em dash or a ramp code', () => {
  for (const view of ESTATES) for (const persona of ROLES) {
    for (const w of printed(vals(home(view, { persona })))) {
      assert.ok(words(w) <= 12, `${view}/${persona}: ${words(w)} words in "${w}"`);
      assert.ok(!/—|\b(ER|DX|EQX|GCI)\b/.test(w), `${view}/${persona}: "${w}"`);
    }
  }
  assert.equal(words('Finance rides it · 40 workloads · 22 min'), 6);
});

test('Empty: one step with a picture, and no zeros', () => {
  const c = home('empty');
  const v = vals(c);
  assert.equal(v.homeEmpty, true);
  assert.equal(v.homeBand, false);
  assert.deepEqual(v.homeCards, [], 'no cards on Empty');
  assert.equal(v.homeStep.line, 'Add a source to see your network');
  assert.equal(v.homeStep.cta, 'Add a source');
  for (const w of printed(v)) assert.ok(!/(^|[^\d,.])0 |\$0\b|0 of 0/.test(w), `empty prints a zero: "${w}"`);
  v.homeStep.go();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.discoverView, 'sources');
  assert.deepEqual(c.state.sub, { page: 'discover', panel: 'add' });
});

// ---- 6. The markup and the routes ----

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const railItem = (v, label) => v.railGroups.flatMap(g => g.items).find(i => i.label === label);
const ctorScreen = () => { const head = 'constructor(p) { super(p); this.state = '; const i = HTML.indexOf(head) + head.length; return Function(`return (${HTML.slice(i, HTML.indexOf('; }', i))})`)().screen; };
const homeBlock = () => { const i = HTML.indexOf('aria-label="NaaS home"'); return HTML.slice(i, HTML.indexOf('</section>', i)); };

test('the NaaS rail item and the NaaS pill land on the home on every estate, and only NaaS lights there', () => {
  for (const view of ESTATES) {
    const c = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', nowIso: NOW });
    assert.equal(railItem(vals(c), 'NaaS').cur, false, `${view}: Connect's map is not the home`);
    railItem(vals(c), 'NaaS').go();
    assert.equal(c.state.screen, 's0', view);
    const v = vals(c);
    assert.equal(railItem(v, 'NaaS').cur, true, view);
    assert.deepEqual(v.railGroups.filter(g => g.titleCur).map(g => g.title), [], `${view}: a group lights beside NaaS`);
    const p = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', nowIso: NOW });
    vals(p).pills.find(x => x.label === 'NaaS').go();
    assert.equal(p.state.screen, 's0', `${view}: the NaaS pill`);
  }
});

test('a cold load lands on the home, on every estate', () => {
  window.addEventListener = window.addEventListener || (() => {});
  assert.equal(ctorScreen(), 's0', 'the markup boots on the home');
  for (const view of ESTATES) {
    globalThis.location = { search: `?view=${view}`, hash: '', pathname: '/' };
    const c = mkC({ view: 'partial', screen: ctorScreen() });
    init(c);
    assert.equal(c.state.view, view);
    assert.equal(c.state.screen, 's0', view);
  }
});

test('the home is one section: role chips, the take-away, four cards, Waiting on you, each bound to its field', () => {
  const i = HTML.indexOf('aria-label="NaaS home"');
  assert.ok(i > 0, 'no NaaS home section');
  const gate = HTML.lastIndexOf('<sc-if value="{{ sHome }}"', i);
  assert.ok(gate >= 0 && i - gate < 120, 'the home is not gated on sHome');
  const block = homeBlock();
  for (const b of ['<sc-for list="{{ roleChips }}"', '{{ homeBriefGo }}', "Andi's briefing",
    '{{ homeTake.head }}', '{{ homeTake.headGo }}', '<sc-for list="{{ homeTake.parts }}" as="tp"', '{{ tp.go }}', '{{ tp.off }}', '{{ homeTake.go }}', '{{ homeTake.cta }}', '{{ homeTake.icon }}', '{{ homeTake.ink }}',
    '<sc-for list="{{ homeCards }}"', '{{ hc.go }}', '{{ hc.valueGo }}', '<sc-for list="{{ hc.figs }}"', '{{ hf.go }}',
    '<sc-for list="{{ hc.segs }}"', '{{ sg.go }}', '<sc-for list="{{ hc.dots }}"', '{{ dt.go }}', '<sc-for list="{{ hc.waffle }}"', '{{ hc.wafGo }}', '{{ hc.wafOff }}',
    '{{ hc.spark.past }}', '{{ hc.spark.asIs }}', '{{ hc.spark.act }}',
    'Waiting on you', '<sc-for list="{{ homeWaiting }}"', '{{ ra.accept }}', '{{ ra.canAccept }}', '{{ ra.open }}', '{{ homeWaitingGo }}', '{{ homeStep.go }}']) {
    assert.ok(block.includes(b), `${b} is not in the home`);
  }
  assert.match(block, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/, 'the snapshot is four equal cards');
  assert.match(block, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/, 'Waiting on you is three equal chips');
  for (const gone of ['{{ homeGreeting }}', '{{ homeHead }}', '{{ homeBrief }}', '{{ homeStrip }}', '{{ homeNow }}', 'onChange="{{ setRange }}"']) assert.ok(!block.includes(gone), `${gone} is still on the home`);
  // Every figure, segment, dot and bar is a button bound to its own door.
  assert.match(block, /<button onClick="\{\{ hc\.wafGo \}\}" disabled="\{\{ hc\.wafOff \}\}"[^>]*><sc-for list="\{\{ hc\.waffle \}\}"/, 'the cells are one button, disabled when nothing is exposed');
  for (const [loop, as, go] of [['hc.figs', 'hf', 'hf.go'], ['hc.segs', 'sg', 'sg.go'], ['hc.dots', 'dt', 'dt.go']]) {
    const j = block.indexOf(`<sc-for list="{{ ${loop} }}" as="${as}"`);
    const body = block.slice(j, block.indexOf('</sc-for>', j));
    assert.match(body, new RegExp(`<button[^>]*onClick="\\{\\{ ${go.replace('.', '\\.')} \\}\\}"`), `${loop}: not a button bound to ${go}`);
  }
  assert.match(block, /<button[^>]*onClick="\{\{ hc\.valueGo \}\}"[^>]*disabled="\{\{ hc\.valueOff \}\}"/, 'the big figure is a button, disabled when it counts nothing');
  for (const tag of ['svg', 'table', 'select']) {
    for (const m of block.matchAll(new RegExp(`<${tag}\\b[^]*?</${tag}>`, 'g'))) assert.ok(!m[0].includes('<sc-for'), `an sc-for inside a ${tag}`);
  }
});

test('the home prints no paragraph: no <p>, and no run of static words longer than twelve', () => {
  const block = homeBlock();
  assert.ok(!/<p\b/.test(block), 'a paragraph on the home');
  const text = block.replace(/<[^>]+>/g, '\n').replace(/\{\{[^}]*\}\}/g, '\n').split('\n').map(t => t.trim()).filter(Boolean);
  for (const t of text) assert.ok(words(t) <= 12, `${words(t)} words: "${t}"`);
});

test('the map follows the home in the markup and carries the fold marker', () => {
  const home0 = HTML.indexOf('aria-label="NaaS home"'), hero = HTML.indexOf('id="sec-fabric"');
  assert.ok(home0 > 0 && hero > home0, 'the map is not below the home');
  assert.match(HTML.slice(hero, hero + 400), /data-fold="\{\{ heroFold \}\}"/);
  assert.ok(HTML.includes('aria-label="Your network, once a source is added"'), 'Empty\'s picture is gone');
});

test('Connect no longer draws the four tiles', () => {
  assert.equal(HTML.includes('list="{{ rollup }}"'), false, 'the rollup still renders on its own');
  const cn = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', nowIso: NOW }));
  assert.ok(!cn.showLaunch && !cn.sHome, 'Connect draws no strip');
});

test('the home draws its own head, no discovery controls; the empty estate keeps its s2 onboarding', () => {
  for (const view of ESTATES) {
    const h = vals(home(view));
    assert.equal(h.sHome, true, view);
    assert.equal(h.showPageTitle, false, `${view}: the home draws its own head`);
    assert.equal(h.ownsDiscovery, false, `${view}: Re-discover belongs to Connect`);
    assert.equal(h.sS0, false, `${view}: the onboarding block is s2's`);
  }
  const onboard = vals(mkC({ view: 'empty', estateParam: null, screen: 's2', nowIso: NOW }));
  assert.equal(onboard.sS0, true);
  assert.equal(onboard.sHome, false);
});

test('an estate switch on the home shows the new estate\'s own figures and role list', () => {
  const c = home('partial');
  vals(c).setView({ target: { value: 'mature' } });
  assert.equal(c.state.screen, 's0');
  const v = vals(c), fresh = vals(home('mature'));
  const plain = (x) => JSON.parse(JSON.stringify(x));
  assert.deepEqual(plain(v.homeTake), plain(fresh.homeTake));
  assert.deepEqual(v.homeCards.map(x => [x.key, x.value]), fresh.homeCards.map(x => [x.key, x.value]));
  assert.deepEqual(v.homeWaiting.map(a => a.key), fresh.homeWaiting.map(a => a.key));
});

test('after Add a source > Oracle, the home counts Oracle\'s two public regions', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's1', discoverView: 'sources', nowIso: NOW });
  vals(c).openAddSource();
  vals(c).sourceTiles.find(t => /Oracle/.test(t.name)).pick();
  vals(c).addSource();
  c.setState({ screen: 's0' });
  const v = vals(c);
  assert.equal(card(v, 'onatt').value, '2 of 9');
});
