import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as F from '../naas-flowmap.js';
import * as G from '../naas-segments.js';
import * as OD from '../naas-observe-dash.js';
import { appsOf } from '../naas-apps.js';

// Over SLO reads purple everywhere; one lift rule on Health and Paths (review
// round 2, 2026-09-30). Round 1 gave Down the red and the square and Over SLO
// --viz-5, on Health. A verifier found Over SLO still drawn in Down's red on
// Insights (the bars and the legend) and in the Traffic site panel, every
// public path amber however fast, the Signals card counting an 86 ms spike as
// over SLO, the Home banner drawing every problem amber and round, hex on the
// Performance legend, Paths rows that never took the lift Health rows take,
// and a Bank scale On-ramp cell that swapped the AT&T NetBond saturation for a
// hollow public-internet ring on a tie.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const HEX = /#[0-9a-f]{3,8}\b/i;
const RANK = { ok: 0, risk: 1, slo: 2, down: 3 };
const INKS = new Set(Object.values(F.HEALTH_INK));
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const probsOf = (view) => {
  const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv), conns = X.connections(est, ob);
  return OD.problems(est, conns, ob, appsOf(est, inv, ob.flows), [], Date.parse('2026-09-29T12:00:00Z'));
};
const ctxOf = (view) => {
  const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv), conns = X.connections(est, ob);
  return G.segCtxOf(est, { inv, ob, conns, probs: OD.problems(est, conns, ob, appsOf(est, inv, ob.flows), [], Date.parse('2026-09-29T12:00:00Z')) });
};

test('Insights: the Latency over SLO bars are the Over SLO ink, on Signals and on Your actions', () => {
  let seen = 0;
  for (const view of ['partial', 'mature', 'trust']) {
    const sig = vals(at(view, { obPage: 'insights', insPanel: 'signals' })).iw;
    for (const r of sig.slo) { seen++; assert.equal(r.fill, F.HEALTH_INK.slo, `${view} Signals ${r.name}: ${r.fill}`); }
    const role = vals(at(view, { obPage: 'insights', insPanel: 'role', persona: 'neteng' })).roleVisuals.find(x => x.key === 'slo');
    for (const r of (role ? role.rows : [])) { seen++; assert.equal(r.fill, F.HEALTH_INK.slo, `${view} Your actions ${r.label}: ${r.fill}`); }
  }
  assert.ok(seen > 0, 'some estate has a flow over SLO to draw');
});

test('Signals: the Latency over SLO legend swatch is the Over SLO ink, never Down\'s red', () => {
  const i = HTML.indexOf('{{ iw.sloLegend }}');
  const swatch = HTML.slice(HTML.lastIndexOf('<i ', i), i);
  assert.ok(!swatch.includes('var(--error)'), swatch);
  const bound = (swatch.match(/background:\{\{ ([\w.]+) \}\}/) || [])[1];
  assert.equal(bound, 'iw.sloInk', swatch);
  assert.equal(vals(at('partial', { obPage: 'insights', insPanel: 'signals' })).iw.sloInk, F.HEALTH_INK.slo);
});

test('Traffic site panel: each path is inked by the one rule, and a 66 ms public path is Healthy', () => {
  const PARTIAL = { 'London DC': { 'us-west-2': 'ok', 'eu-west-1': 'slo', 'us-east-1': 'ok' }, 'Ashburn DC': { 'us-west-2': 'ok', 'eu-west-1': 'slo', eastus: 'down' } };
  for (const [site, want] of Object.entries(PARTIAL)) {
    const p = vals(at('partial', { obPanel: 'map', mapSel: 'asset:' + site })).panel;
    for (const [region, state] of Object.entries(want)) {
      const x = p.paths.find(y => y.key === region);
      assert.equal(x.dot, F.HEALTH_INK[state], `${site} to ${x.region} at ${x.ms} ms is ${state}, inked ${x.dot}`);
      assert.equal(x.rad, F.healthRadius(state), `${site} to ${x.region}: radius ${x.rad}`);
    }
  }
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    for (const site of new Set(vals(at(view, { obPanel: 'paths' })).pathTimeAll.map(r => r.site))) {
      const p = vals(at(view, { obPanel: 'map', mapSel: 'asset:' + site })).panel;
      for (const x of p.paths) {
        const r = D.ESTATES[view].regionsList.find(y => y.region === x.key);
        const state = r.link === 'degraded' ? 'down' : F.healthOf(x.ms, x.priv ? F.SLO_PRIVATE : F.SLO);
        assert.equal(x.dot, F.HEALTH_INK[state], `${view} ${site} to ${x.region} at ${x.ms} ms`);
      }
    }
  }
  assert.ok(HTML.includes('border-radius:{{ pa.rad }};background:{{ pa.dot }}'), 'the panel path dot draws its radius');
});

test('the Latency over SLO card counts a spike only when the one rule calls it over SLO', () => {
  const drilled = (view) => { const c = at(view, { obPage: 'insights', insPanel: 'signals' }); const n = vals(c).insDrill.slo.n; vals(c).insDrill.slo.go(); return { n, keys: vals(c).insightRows.map(r => r.key) }; };
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    const { n, keys } = drilled(view);
    assert.equal(keys.length, n, `${view}: the card says ${n} and drills to ${keys.join(',')}`);
    for (const r of D.ESTATES[view].regionsList.filter(x => x.rel === 'warn')) {
      const over = F.healthOf(r.pub + 40, F.SLO) === 'slo';
      assert.equal(keys.includes('an-' + r.region), over, `${view} ${r.region}: peak ${r.pub + 40} ms`);
    }
  }
  assert.ok(!drilled('small').keys.includes('an-us-west-2'), '86 ms is At risk, not over SLO');
  assert.ok(!drilled('trust').keys.includes('an-us-west-2'), '100 ms is not over 100 ms');
  assert.ok(drilled('partial').keys.includes('an-eu-west-1'), '136 ms is over');
});

test('Home: each incident on the banner is drawn in its own ink and shape', () => {
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    const probs = probsOf(view);
    const inc = vals(mkC({ view, estateParam: null, screen: 's1' })).healthIncidents;
    assert.equal(inc.length, probs.length, view);
    inc.forEach((x, i) => {
      const st = probs[i].state;
      assert.equal(x.dot, F.HEALTH_INK[st], `${view} ${x.text}: ${st} inked ${x.dot}`);
      assert.equal(x.rad, F.healthRadius(st), `${view} ${x.text}: ${st} radius ${x.rad}`);
    });
  }
  const i = HTML.indexOf('list="{{ healthIncidents }}"'), row = HTML.slice(i, HTML.indexOf('</sc-for>', i));
  assert.ok(row.includes('border-radius:{{ i.rad }};background:{{ i.dot }}'), 'the banner dot binds its ink and radius');
  assert.ok(row.includes('border:1px solid {{ i.dot }}'), 'the banner edge takes the same ink');
  assert.ok(!row.includes('var(--warning)'), 'nothing on the banner is amber by default');
});

test('Performance legend and map: Within SLO and Near SLO are the health tokens, no hex', () => {
  for (const theme of ['light', 'dark']) {
    const v = vals(at('partial', { mapMode: 'slo', theme }));
    const col = (l) => v.mapLegend.find(x => x.label === l).color;
    assert.equal(col('Within SLO'), F.HEALTH_INK.ok, theme);
    assert.equal(col('Near SLO'), F.HEALTH_INK.risk, theme);
    assert.equal(col('Over SLO'), F.HEALTH_INK.slo, theme);
    for (const r of v.mapRibbons) assert.ok(INKS.has(r.fill), `${theme} ribbon ${r.key}: ${r.fill}`);
    assert.ok(!v.mapLegend.some(x => HEX.test(x.color)), JSON.stringify(v.mapLegend));
  }
});

test('Paths: a row whose app and region an open problem lists is at least that problem\'s state, and says why', () => {
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    const v = vals(at(view, { obPanel: 'paths' })), probs = probsOf(view);
    for (const p of probs) {
      for (const tag of p.apps) {
        const row = v.pathTimeAll.find(r => !r.pinned && r.tag === tag);
        assert.ok(row, `${view}: ${tag} has a Paths row`);
        assert.ok(RANK[row.state] >= RANK[p.state], `${view}: ${tag} reads ${row.state} on Paths beside ${p.where} ${p.state}`);
      }
    }
    for (const r of v.pathTimeAll) {
      for (const p of probs.filter(q => q.region === r.region && q.apps.includes(r.tag))) {
        assert.ok(RANK[r.state] >= RANK[p.state], `${view} ${r.key}: ${r.state} under ${p.key} ${p.state}`);
        assert.ok(r.title.includes(p.what), `${view} ${r.key} title: ${r.title}`);
      }
    }
    // Health and Paths read the same state for every app a problem lists.
    const h = vals(at(view, { obPanel: 'health' }));
    for (const tag of new Set(probs.flatMap(p => p.apps))) {
      const hr = h.pathFlowRows.find(r => r.tag === tag), pr = v.pathTimeAll.find(r => !r.pinned && r.tag === tag);
      assert.ok(RANK[pr.state] >= RANK[hr.state], `${view} ${tag}: Health ${hr.state}, Paths ${pr.state}`);
    }
  }
  const paths = (view) => vals(at(view, { obPanel: 'paths' })).pathTimeAll;
  assert.equal(paths('trust').find(r => r.tag === 'prod').state, 'risk', 'Bank scale prod rides the us-west-2 spike');
  assert.equal(paths('small').find(r => r.tag === 'internet-facing').state, 'risk', 'Small internet-facing rides the 86 ms spike');
  assert.equal(paths('trust').find(r => r.tag === 'ai').state, 'risk', 'Bank scale ai rides the us-central1 saturation');
  const inet = paths('mature').find(r => r.tag === 'internet-facing');
  assert.equal(inet.region, 'us-west-2', 'Established internet-facing sits on the saturated region');
  assert.equal(inet.state, 'risk');
  assert.ok(HTML.includes('aria-pressed="{{ pt.sel }}" title="{{ pt.title }}"'), 'the Paths row carries its title');
});

test('Trace from any problem lands on a Paths row at least as bad as the problem', () => {
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    const n = vals(at(view, { obPanel: 'health' })).problemRows.length;
    for (let i = 0; i < n; i++) {
      const c = at(view, { obPanel: 'health' });
      const p = vals(c).problemRows[i];
      p.trace();
      const row = vals(c).pathTimeAll.find(r => r.key === c.state.pathSel);
      assert.ok(RANK[row.state] >= RANK[p.state], `${view} ${p.key} (${p.state}) opened ${row.key} reading ${row.state}`);
    }
  }
});

test('worst(): on a tie the AT&T-measured part wins over a limited view', () => {
  const ctx = ctxOf('trust');
  const onramp = G.cellsFor('analytics', ctx)[G.SEGMENTS.findIndex(s => s.key === 'onramp')];
  assert.equal(onramp.state, 'risk');
  assert.equal(onramp.thing, 'NetBond', `the cell reads ${onramp.thing}: ${onramp.why}`);
  assert.equal(onramp.limited, false, 'filled, not a hollow limited ring');
  const cell = vals(at('trust', { obPanel: 'health' })).pathFlowRows.find(r => r.tag === 'analytics').cells.find(c => c.key === 'onramp');
  assert.equal(cell.bg, F.HEALTH_INK.risk);
  assert.match(cell.title, /NetBond/);
});
