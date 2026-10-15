import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as F from '../naas-flowmap.js';
import * as OD from '../naas-observe-dash.js';
import { appsOf } from '../naas-apps.js';

// Down and Over are two things (final review, 2026-09-30, findings 3 and 4).
// Light --error is #c23131 and the other red was a hard #c9362c: the Health
// legend and the Traffic legend drew two identical reds, so red still meant two
// things (the stakeholder's att5 complaint, plan D-8). Down keeps --error and
// is the square dot; Over (an app's own signal over your threshold since
// 2026-10-15, when Over SLO and every delay figure left the site) is its own
// theme token. An open problem colours the rows of the apps it lists.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8').replace('<link rel="stylesheet" href="./storefront.css">', () => '<style>\n' + readFileSync(new URL('../storefront.css', import.meta.url), 'utf8') + '</style>') /* the stylesheet moved to storefront.css (2026-10-12); this test reads its rules */;
const HEX = /#[0-9a-f]{3,8}\b/i;
const RANK = { ok: 0, risk: 1, over: 2, down: 3 };
const health = (view, patch = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', obPanel: 'health', ...patch }));
const traffic = (patch = {}) => vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch }));
const probsOf = (view) => {
  const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv), conns = X.connections(est, ob);
  return OD.problems(est, conns, ob, appsOf(est, inv, ob.flows), [], Date.parse('2026-09-29T12:00:00Z'));
};
const theme = (name) => {
  const head = `[data-theme="${name}"]{`, i = HTML.indexOf(head);
  return Object.fromEntries(HTML.slice(i + head.length, HTML.indexOf('}', i)).split(';').filter(Boolean).map(d => d.split(':').map(x => x.trim())));
};
const resolve = (ink, name) => theme(name)[String(ink).replace(/^var\((--[\w-]+)\)$/, '$1')];
const legend = () => {
  const i = HTML.indexOf('aria-label="Health legend"');
  const body = HTML.slice(i, HTML.indexOf('</div>', i));
  return Object.fromEntries([...body.matchAll(/<span><i style="([^"]*)"><\/i>([^<]+)<\/span>/g)].map(m => [m[2], m[1]]));
};

test('Down and Over are two theme tokens, apart from each other and from At risk in both themes', () => {
  const ink = F.HEALTH_INK;
  assert.deepEqual(Object.keys(ink).sort(), ['down', 'ok', 'over', 'risk'], 'no state left that a delay figure set');
  for (const k of ['ok', 'risk', 'over', 'down']) assert.match(ink[k], /^var\(--[\w-]+\)$/, `${k} is ${ink[k]}`);
  assert.equal(ink.down, 'var(--error)');
  assert.notEqual(ink.over, ink.down);
  for (const name of ['light', 'dark']) {
    const [over, down, risk] = [resolve(ink.over, name), resolve(ink.down, name), resolve(ink.risk, name)];
    assert.ok(over && down && risk, `${name}: ${over} ${down} ${risk}`);
    assert.ok(over !== down && over !== risk, `${name}: Over ${over}, Down ${down}, At risk ${risk}`);
  }
});

test('Down is the square dot; every other state is round', () => {
  assert.equal(F.healthRadius('down'), '2px');
  for (const k of ['ok', 'risk', 'over', 'nodata', 'none']) assert.equal(F.healthRadius(k), '9999px', k);
});

test('Health: the eu-central-1 Down problem and the us-west-2 near-full problem read apart, by ink, shape and word', () => {
  const v = health('mature');
  const down = v.problemRows.find(p => p.where === 'AWS eu-central-1'), risk = v.problemRows.find(p => p.where === 'AWS us-west-2');
  assert.equal(down.dot, 'var(--error)');
  assert.equal(risk.dot, F.HEALTH_INK.risk);
  assert.ok(!HEX.test(down.dot) && !HEX.test(risk.dot), `${down.dot} ${risk.dot}`);
  assert.equal(down.rad, '2px');
  assert.equal(risk.rad, '9999px');
  assert.equal(down.stateWord, 'Down');
  assert.equal(risk.stateWord, 'At risk');
  assert.ok(HTML.includes('{{ pb.stateWord }}'), 'the problem row prints its state word');
});

test('every health dot on Health and Paths takes the square for Down, and the one ink for its state', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = health(view), seg = health(view, { healthView: 'segment', segOpen: 'cloudlink' });
    const dots = [
      ...v.pathFlowRows.map(r => [r.state, r.dot, r.rad, `row ${r.tag}`]),
      ...v.pathFlowRows.flatMap(r => r.cells.filter(c => RANK[c.state] != null).map(c => [c.state, c.limited ? null : c.bg, c.rad, `cell ${r.tag}/${c.key}`])),
      ...v.problemRows.map(p => [p.state, p.dot, p.rad, `problem ${p.key}`]),
      ...v.pathTimeRows.map(r => [r.state, r.dot, r.rad, `path ${r.key}`]),
      ...v.segRows.filter(r => RANK[r.state] != null).map(r => [r.state, r.limited ? null : r.bg, r.rad, `segment ${r.key}`]),
      ...seg.segDrillRows.filter(r => RANK[r.state] != null).map(r => [r.state, r.bg, r.rad, `drill ${r.key}`]),
    ];
    // Small has no degraded connection, so nothing there is Down.
    if (view !== 'small') assert.ok(dots.some(d => d[0] === 'down'), `${view} has a Down dot to check`);
    for (const [state, ink, rad, what] of dots) {
      assert.equal(rad, F.healthRadius(state), `${view} ${what}: ${state} drawn with radius ${rad}`);
      if (ink) assert.equal(ink, F.HEALTH_INK[state], `${view} ${what}: ${state} inked ${ink}`);
    }
  }
  for (const b of ['pf.rad', 'pb.rad', 'pt.rad', 'sg.rad', 'sd.rad']) assert.ok(HTML.includes(`border-radius:{{ ${b} }}`), `the markup draws ${b}`);
  // The Health cells are the seven-station strip since 2026-10-02: the node takes its state, and Down's square is the strip's own rule.
  assert.ok(HTML.includes('data-state="{{ cl.state }}"'), 'the markup draws cl.state on the strip');
  assert.ok(/\.ps \[data-state="down"\] i\{border-radius:6px/.test(HTML), 'the strip squares Down');
});

test('the Health legend carries a distinct swatch for Down and for Over threshold', () => {
  const lg = legend();
  const bg = (s) => (s.match(/background:([^;]+)/) || [])[1], rad = (s) => (s.match(/border-radius:([^;]+)/) || [])[1];
  assert.equal(bg(lg['Over threshold']), F.HEALTH_INK.over);
  assert.equal(bg(lg.Down), F.HEALTH_INK.down);
  assert.equal(rad(lg.Down), '2px');
  assert.equal(rad(lg['Over threshold']), '9999px');
  assert.ok(!Object.keys(lg).some(k => /SLO/.test(k)), Object.keys(lg).join(', '));
  assert.equal(bg(lg['At risk']), F.HEALTH_INK.risk);
  assert.ok(!Object.values(lg).some(s => HEX.test(s)), JSON.stringify(lg));
});

test('the Traffic legends say Degraded, Down and Near full in their own inks, none a hex', () => {
  const st = traffic().mapLegend, util = traffic({ mapMode: 'util' }).mapLegend;
  const col = (lg, l) => lg.find(x => x.label === l).color;
  assert.equal(col(st, 'Degraded'), 'var(--error)');
  assert.equal(col(util, 'Down'), F.HEALTH_INK.down);
  assert.equal(col(util, 'Near full'), F.HEALTH_INK.risk);
  assert.ok(![...st, ...util].some(l => HEX.test(l.color) && /Down|Near|Degraded/.test(l.label)));
  assert.ok(![...st, ...util].some(l => /SLO/.test(l.label)), 'no SLO on either legend');
});

// The incident list holds only what is measured (2026-10-15): a link down and a port near full.
test('every open problem is a link down or a port near full, never a delay', () => {
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    for (const p of probsOf(view)) {
      assert.ok(['link', 'sat'].includes(p.kind), `${view} ${p.key}: ${p.kind}`);
      assert.ok(['down', 'risk'].includes(p.state), `${view} ${p.key}: ${p.state}`);
      assert.doesNotMatch(`${p.what} ${p.short} ${p.fig}`, /\bms\b|p95|SLO|[Ll]atency/, `${view} ${p.key}: ${p.what}`);
    }
  }
});

test('an open problem colours the rows of the apps it lists, so tiles, grid and list agree', () => {
  for (const view of ['small', 'partial', 'trust']) {
    const v = health(view);
    for (const p of probsOf(view)) {
      for (const tag of p.apps) {
        const row = v.pathFlowRows.find(r => r.tag === tag);
        assert.ok(RANK[row.state] >= RANK[p.state], `${view}: ${tag} reads ${row.state} beside ${p.where} ${p.state}`);
      }
    }
    const t = Object.fromEntries(v.healthTiles.map(x => [x.l, x.v]));
    assert.equal(t['Apps healthy'], `${v.pathFlowRows.filter(r => r.state === 'ok').length} of ${v.pathFlowRows.length}`);
    // The tile counts both states and names both (third skeptic, 2026-09-30).
    assert.equal(t['Over or at risk'], String(v.pathFlowRows.filter(r => r.state === 'risk' || r.state === 'over').length));
  }
  const small = health('small');
  const t = Object.fromEntries(small.healthTiles.map(x => [x.l, x.v]));
  assert.equal(t['Apps healthy'], '1 of 2');
  assert.equal(t['Over or at risk'], '1');
  // Small has no problem open: its at-risk app is its own signal near your threshold, not its path.
  const inet = small.pathFlowRows.find(r => r.tag === 'internet-facing');
  assert.equal(inet.state, 'risk');
  assert.equal(small.pathFlowAll.find(r => r.tag === 'internet-facing').pathState, 'ok');
  assert.equal(small.problemRows.length, 0);
  // Established's internet-facing rides the us-west-2 port near full; its on-ramp cell says so.
  const mi = health('mature').pathFlowRows.find(r => r.tag === 'internet-facing');
  assert.equal(mi.state, 'risk');
  assert.ok(mi.cells.some(c => c.state === 'risk' && /84% of/.test(c.title)), mi.cells.map(c => c.title).join(' | '));
});
