import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, homeVals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The NaaS home (spec docs/superpowers/specs/2026-09-30-naas-home-design.md,
// plan Task 1): the whole network at a glance, by persona. Every figure on it
// is a field vals() already computes for the page it opens; the home adds a
// greeting and its layout, never a number of its own.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const NOW = '2026-10-05T14:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', nowIso: NOW, ...patch });
const observe = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', nowIso: NOW, ...patch });
const pick = (t) => ({ key: t.key, label: t.label, value: t.value, sub: t.sub, door: t.door });
const plural = (n, one, many) => `${n} ${String(n) === '1' ? one : many}`;
// Every string the home prints, for the zero and the on-AT&T checks.
const words = (v) => [v.homeGreeting, v.homeHead, v.homeBrief, v.homeWaitingMore, v.homeNowMore, v.homeNowNone, v.homeStep && v.homeStep.line,
  ...v.homeStrip.flatMap(t => [t.label, t.value, t.sub, t.door]),
  ...v.homeWaiting.flatMap(a => [a.head, a.rec, a.stateLabel, a.saveLine]),
  ...v.homeNow.flatMap(p => [p.stateWord, p.where, p.thing, p.what, p.startedF])].filter(Boolean);

test('every figure on the home is its page\'s own, on every estate and for every role', () => {
  for (const view of ESTATES) {
    const head = vals(observe(view)).pageVerdict;
    for (const persona of ROLES) {
      const where = `${view}/${persona}`;
      const v = vals(home(view, { persona }));
      assert.ok(v.homeHead.startsWith(head), `${where}: "${v.homeHead}" does not start with Observe's "${head}"`);
      if (view === 'empty') assert.equal(v.homeBrief, '', `${where}: the empty estate leaves Andi's briefing out`);
      else assert.equal(v.homeBrief, v.briefText, where);
      assert.deepEqual(v.homeWaiting.map(a => a.key), v.roleActAll.slice(0, 3).map(a => a.key), where);
      assert.deepEqual(v.homeStrip.map(t => t.key), ['discover', 'connect', 'observe', 'govern', 'cost'], where);
      assert.deepEqual(v.homeStrip.slice(1).map(pick), v.rollup.map(pick), `${where}: the four tiles are the rollup's, as Connect read them`);
      const [s, c] = ['s', 'c'].map(k => v.invStats.find(x => x.key === k).v);
      const disc = v.homeStrip[0];
      if (view === 'empty') assert.equal(disc.value, 'Nothing discovered yet', where);
      else assert.equal(disc.value, `${plural(s, 'site', 'sites')} · ${plural(c, 'cloud', 'clouds')}`, where);
      assert.deepEqual(v.homeNow.map(p => p.key), v.problemRows.slice(0, 3).map(p => p.key), where);
      assert.equal(v.homeEmpty, view === 'empty', where);
    }
  }
});

test('the head adds the Sev 1 clause only when one is open', () => {
  const g = vals(home('partial'));
  assert.equal(g.opsFacts.sev1, 1);
  assert.equal(g.homeHead, '13 findings open. $41,500/mo potential savings. 1 Sev 1 open now.');
  const sm = vals(home('small'));
  assert.equal(sm.opsFacts.sev1, 0);
  assert.equal(sm.homeHead, '6 findings open. $1,500/mo potential savings.');
});

test('the greeting reads the one clock in Chicago time, and names the role', () => {
  assert.equal(vals(home('partial')).homeGreeting, 'Good morning, Network Eng');
  assert.equal(vals(home('partial', { nowIso: '2026-10-05T20:00:00Z' })).homeGreeting, 'Good afternoon, Network Eng');
  assert.equal(vals(home('partial', { nowIso: '2026-10-05T23:30:00Z', persona: 'finops' })).homeGreeting, 'Good evening, FinOps & SRE');
  assert.equal(vals(home('partial', { nowIso: '2026-10-05T16:59:00Z', persona: 'exec' })).homeGreeting, 'Good morning, Executive');
  assert.equal(vals(home('partial', { nowIso: '2026-10-05T17:00:00Z', persona: 'exec' })).homeGreeting, 'Good afternoon, Executive');
});

test('the Discover tile carries the new pill at Discover\'s own 30 days, and opens Discover > Estate', () => {
  const c = home('partial');
  const disc = vals(c).homeStrip[0];
  assert.deepEqual(pick(disc), { key: 'discover', label: 'Discover', value: '25 sites · 3 clouds', sub: '10 new · 30 days', door: 'Estate' });
  disc.go();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.discoverView, 'estate');
  // A rollup tile's door is the one Connect's tile had.
  const c2 = home('partial');
  vals(c2).homeStrip.find(t => t.key === 'observe').go();
  assert.equal(c2.state.screen, 's3');
  assert.equal(c2.state.tab, 'observe');
  assert.equal(c2.state.obPanel, 'health');
});

// Review Focus 1: Accept or Defer on the home, then Your actions.
test('Accept and Defer on the home move the finding Your actions shows', () => {
  const c = home('partial', { persona: 'architect' });
  const row = vals(c).homeWaiting.find(a => a.canAccept);
  assert.ok(row, 'an open row to accept');
  row.accept();
  c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role' });
  assert.equal(vals(c).roleActAll.find(a => a.key === row.key).stateLabel, 'Acknowledged');
  c.setState({ screen: 's0' });
  assert.equal(vals(c).homeWaiting.find(a => a.key === row.key).stateLabel, 'Acknowledged');
  const next = vals(c).homeWaiting.find(a => a.canDefer);
  assert.ok(next, 'an open row to defer');
  next.defer();
  assert.equal(vals(c).roleActAll.find(a => a.key === next.key).stateLabel, 'Snoozed');
});

test('All N in Your actions opens Insights > Your actions', () => {
  const c = home('partial', { persona: 'finops' });
  const v = vals(c);
  assert.equal(v.homeWaiting.length, 3);
  assert.equal(v.homeWaitingMore, `All ${v.roleActAll.length} in Your actions ›`);
  v.homeWaitingGo();
  assert.deepEqual([c.state.screen, c.state.tab, c.state.obPage, c.state.insPanel], ['s3', 'observe', 'insights', 'role']);
});

// Review Focus 2: adding Oracle, then the home.
test('after Add a source > Oracle, the home reads 4 clouds and 14 findings', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's1', discoverView: 'sources', nowIso: NOW });
  vals(c).openAddSource();
  vals(c).sourceTiles.find(t => /Oracle/.test(t.name)).pick();
  vals(c).addSource();
  c.setState({ screen: 's0' });
  const v = vals(c);
  assert.equal(v.homeStrip[0].value, '25 sites · 4 clouds');
  assert.match(v.homeHead, /^14 findings open\./);
});

// Review Focus 3: changing Since.
test('Since moves the briefing, never the strip or the head', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const a = vals(home(view, { obWindow: '30d' })), b = vals(home(view, { obWindow: '7d' }));
    assert.notEqual(a.homeBrief, b.homeBrief, `${view}: the briefing's fix time follows Since`);
    assert.equal(a.homeHead, b.homeHead, view);
    assert.deepEqual(a.homeStrip.map(pick), b.homeStrip.map(pick), view);
  }
});

test('Now: up to three problems, Trace opens Paths on the problem, and none reads in words', () => {
  const c = home('partial');
  const v = vals(c);
  assert.deepEqual(v.homeNow.map(p => `${p.stateWord} ${p.where} · ${p.thing}`), ['Down Azure eastus · ExpressRoute', 'Over SLO AWS eu-west-1 · Public internet']);
  assert.equal(v.homeNowMore, '');
  assert.equal(v.hasHomeNowMore, false);
  v.homeNow[0].trace();
  assert.deepEqual([c.state.screen, c.state.tab, c.state.obPage, c.state.obPanel, c.state.pathSel], ['s3', 'observe', 'perf', 'paths', 'finance|eastus']);
  const e = vals(home('empty'));
  assert.equal(e.homeNow.length, 0);
  assert.equal(e.homeNowNone, 'Nothing is down or over SLO.');
  assert.equal(vals(home('partial')).homeNowNone, '');
});

test('more than three problems: +N more in Health opens Health', () => {
  let patch = null;
  const set = (p) => { patch = p; };
  const rows = [1, 2, 3, 4, 5].map(i => ({ key: 'p' + i, stateWord: 'Down', dot: 'var(--error)', rad: '2px', where: 'w', thing: 't', what: 'x', startedF: 'Started 08:00 · 1 h', trace: () => {} }));
  const out = { problemRows: rows, roleActAll: [], rollup: [], invStats: [{ key: 's', v: '2' }, { key: 'c', v: '1' }], opsFacts: { sev1: 0 }, briefText: 'b', newPill30: '' };
  const h = homeVals(out, { screen: 's0', persona: 'neteng', nowIso: NOW }, set, { observeHead: '1 finding open.', ob: {}, go: (screen, extra) => () => set({ screen, ...extra }), isEmpty: false });
  assert.equal(h.homeNow.length, 3);
  assert.equal(h.homeNowMore, '+2 more in Health ›');
  assert.equal(h.hasHomeNowMore, true);
  h.homeNowMoreGo();
  assert.deepEqual(patch, { screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' });
});

test('Empty: one step to take, and words, never a zero', () => {
  const c = home('empty');
  const v = vals(c);
  assert.equal(v.homeEmpty, true);
  assert.equal(v.homeStep.line, 'Add a source to see your network');
  for (const w of words(v)) assert.ok(!/(^|[^\d,.])0 |\$0\b|0 of 0/.test(w), `empty prints a zero: "${w}"`);
  v.homeStep.go();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.discoverView, 'sources');
  assert.deepEqual(c.state.sub, { page: 'discover', panel: 'add' });
});

test('Small: every band has its own figures, and none claims traffic on AT&T', () => {
  for (const persona of ROLES) {
    const v = vals(home('small', { persona }));
    assert.equal(v.homeStrip[0].value, '2 sites · 1 cloud');
    for (const w of words(v)) assert.ok(!/\bon AT&T\b/.test(w), `small/${persona}: "${w}"`);
  }
});

test('no em dash and no ramp code anywhere on the home', () => {
  for (const view of ESTATES) for (const persona of ROLES) {
    for (const w of words(vals(home(view, { persona })))) assert.ok(!/—|\b(ER|DX|EQX|GCI)\b/.test(w), `${view}/${persona}: "${w}"`);
  }
});
