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

// Down and Over SLO are two things (final review, 2026-09-30, findings 3 and 4).
// Light --error is #c23131 and Over SLO was a hard #c9362c: the Health legend
// and the Traffic legend drew two identical reds, so red still meant two
// things (the stakeholder's att5 complaint, plan D-8). Down keeps --error and
// is the square dot; Over SLO is its own theme token. And a latency spike was
// always "Over SLO", even at 86 ms: its state now comes from the one latency
// rule, and an open problem colours the rows of the apps it lists.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const HEX = /#[0-9a-f]{3,8}\b/i;
const RANK = { ok: 0, risk: 1, slo: 2, down: 3 };
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

test('Down and Over SLO are two theme tokens, apart from each other and from At risk in both themes', () => {
  const ink = F.HEALTH_INK;
  for (const k of ['ok', 'risk', 'slo', 'down']) assert.match(ink[k], /^var\(--[\w-]+\)$/, `${k} is ${ink[k]}`);
  assert.equal(ink.down, 'var(--error)');
  assert.notEqual(ink.slo, ink.down);
  for (const name of ['light', 'dark']) {
    const [slo, down, risk] = [resolve(ink.slo, name), resolve(ink.down, name), resolve(ink.risk, name)];
    assert.ok(slo && down && risk, `${name}: ${slo} ${down} ${risk}`);
    assert.ok(slo !== down && slo !== risk, `${name}: Over SLO ${slo}, Down ${down}, At risk ${risk}`);
  }
});

test('Down is the square dot; every other state is round', () => {
  assert.equal(F.healthRadius('down'), '2px');
  for (const k of ['ok', 'risk', 'slo', 'nodata', 'none']) assert.equal(F.healthRadius(k), '9999px', k);
});

test('Health: the eastus Down problem and the eu-west-1 Over SLO problem read apart, by ink, shape and word', () => {
  const v = health('partial');
  const down = v.problemRows.find(p => p.where === 'Azure eastus'), slo = v.problemRows.find(p => p.where === 'AWS eu-west-1');
  assert.equal(down.dot, 'var(--error)');
  assert.equal(slo.dot, F.HEALTH_INK.slo);
  assert.ok(!HEX.test(down.dot) && !HEX.test(slo.dot), `${down.dot} ${slo.dot}`);
  assert.equal(down.rad, '2px');
  assert.equal(slo.rad, '9999px');
  assert.equal(down.stateWord, 'Down');
  assert.equal(slo.stateWord, 'Over SLO');
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

test('the Health legend carries a distinct swatch for Down and for Over SLO', () => {
  const lg = legend();
  const bg = (s) => (s.match(/background:([^;]+)/) || [])[1], rad = (s) => (s.match(/border-radius:([^;]+)/) || [])[1];
  assert.equal(bg(lg['Over SLO']), F.HEALTH_INK.slo);
  assert.equal(bg(lg.Down), F.HEALTH_INK.down);
  assert.equal(rad(lg.Down), '2px');
  assert.equal(rad(lg['Over SLO']), '9999px');
  assert.equal(bg(lg['At risk']), F.HEALTH_INK.risk);
  assert.ok(!Object.values(lg).some(s => HEX.test(s)), JSON.stringify(lg));
});

test('the Traffic legends say Degraded and Over SLO in two inks, neither a hex', () => {
  const st = traffic().mapLegend, slo = traffic({ mapMode: 'slo' }).mapLegend;
  const col = (lg, l) => lg.find(x => x.label === l).color;
  assert.equal(col(st, 'Degraded'), 'var(--error)');
  assert.equal(col(st, 'Over SLO'), F.HEALTH_INK.slo);
  assert.equal(col(slo, 'Over SLO'), F.HEALTH_INK.slo);
  assert.ok(!HEX.test(col(st, 'Over SLO')) && !HEX.test(col(slo, 'Over SLO')));
});

test('a latency spike is as bad as the one latency rule says, no worse', () => {
  const spike = (view) => probsOf(view).find(p => p.kind === 'spike');
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    const p = spike(view), peak = +p.what.match(/p95 (\d+) ms at peak/)[1];
    assert.equal(p.state, F.healthOf(peak, F.SLO), `${view}: ${p.what} is ${p.state}`);
  }
  assert.equal(spike('small').state, 'risk', '86 ms is near the 100 ms SLO, not over it');
  assert.equal(spike('trust').state, 'risk', '100 ms is not over 100 ms');
  assert.equal(spike('partial').state, 'slo', '136 ms is over');
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
    assert.equal(t['Over SLO or at risk'], String(v.pathFlowRows.filter(r => r.state === 'risk' || r.state === 'slo').length));
  }
  const small = health('small');
  const t = Object.fromEntries(small.healthTiles.map(x => [x.l, x.v]));
  assert.equal(t['Apps healthy'], '1 of 2');
  assert.equal(t['Over SLO or at risk'], '1');
  const inet = small.pathFlowRows.find(r => r.tag === 'internet-facing');
  assert.equal(inet.state, 'risk');
  const onramp = inet.cells.find(c => c.key === 'onramp');
  assert.equal(onramp.state, 'risk', 'the spike shows on the segment it sits on');
  assert.match(onramp.title, /Latency spike · p95 86 ms at peak/);
  assert.equal(small.problemRows[0].stateWord, 'At risk');
  assert.equal(small.problemRows[0].dot, 'var(--warning)');
  assert.equal(health('trust').pathFlowRows.find(r => r.tag === 'prod').state, 'risk', 'prod rides the us-west-2 spike');
  assert.equal(health('partial').pathFlowRows.find(r => r.tag === 'internet-facing').state, 'slo', 'the 136 ms eu-west-1 spike is over');
});
