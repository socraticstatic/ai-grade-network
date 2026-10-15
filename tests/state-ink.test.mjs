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

// Each state wears its own ink and shape everywhere; one lift rule on Health and Paths (review round 2, 2026-09-30).
// Round 1 gave Down the red and the square. A verifier found states drawn in Down's red in the Traffic site panel,
// every public path amber, the Home banner drawing every problem amber and round, hex on the map legend, Paths rows
// that never took the lift Health rows take, and a Bank scale On-ramp cell that swapped the AT&T NetBond saturation
// for a hollow public-internet ring on a tie. This file was over-slo-ink until 2026-10-15, when every delay figure and
// its Over SLO state left the site ("we can't measure that"); what it pins now is the measured states' inks.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const HEX = /#[0-9a-f]{3,8}\b/i;
const RANK = { ok: 0, risk: 1, down: 2 };
// Healthy paints the light blue on the Utilization view ("Green ONLY on a money saving", 2026-10-13), apart from On AT&T's
// blue; what no connection measures takes the not-yet-measured ink.
const INKS = new Set([F.HEALTH_INK.risk, F.HEALTH_INK.down, 'var(--viz-2)', 'var(--text-disabled)']);
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const probsOf = (view) => {
  const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv), conns = X.connections(est, ob);
  return OD.problems(est, conns, ob, appsOf(est, inv, ob.flows), [], Date.parse('2026-09-29T12:00:00Z'));
};
const ctxOf = (view) => {
  const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv), conns = X.connections(est, ob);
  return G.segCtxOf(est, { inv, ob, conns, probs: OD.problems(est, conns, ob, appsOf(est, inv, ob.flows), [], Date.parse('2026-09-29T12:00:00Z')) });
};

// The Signals cards share one legend loop (2026-09-30): the swatch binds its card's own ink.
test('Signals: a legend swatch binds its card\'s own ink, never a default red', () => {
  // The key reads its first words since the Insights story (2026-10-13); the whole label is the item's title.
  const i = HTML.indexOf('{{ lg.short }}', HTML.indexOf('<sc-for list="{{ sg.legend }}"'));
  const swatch = HTML.slice(HTML.lastIndexOf('<i ', i), i);
  assert.ok(!swatch.includes('var(--error)'), swatch);
  const bound = (swatch.match(/background:\{\{ ([\w.]+) \}\}/) || [])[1];
  assert.equal(bound, 'lg.ink', swatch);
  const health = vals(at('partial', { obPage: 'insights', insPanel: 'signals' })).sigAll.find(x => x.key === 'health');
  for (const l of health.legend) assert.equal(l.ink, F.HEALTH_INK[l.key], l.label);
});

// One rule for a site's paths (review round 2, 2026-09-30; 2026-10-15): Down on a degraded link, At risk where its
// connection is near full, else Healthy, never timed; a public path is Healthy, not amber by default.
test('Traffic site panel: each path is inked by the one rule, and a public path is Healthy', () => {
  const PARTIAL = { 'London DC': { 'us-west-2': 'ok', 'eu-west-1': 'ok', 'us-east-1': 'ok' }, 'Ashburn DC': { 'us-west-2': 'ok', 'eu-west-1': 'ok', eastus: 'down' } };
  for (const [site, want] of Object.entries(PARTIAL)) {
    const p = vals(at('partial', { obPanel: 'map', mapSel: 'asset:' + site })).panel;
    for (const [region, state] of Object.entries(want)) {
      const x = p.paths.find(y => y.key === region);
      assert.equal(x.dot, F.HEALTH_INK[state], `${site} to ${x.region} is ${state}, inked ${x.dot}`);
      assert.equal(x.rad, F.healthRadius(state), `${site} to ${x.region}: radius ${x.rad}`);
      assert.equal(x.stateF, F.HEALTH_WORD[state], `${site} to ${x.region} reads ${x.stateF}`);
    }
  }
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    const est = D.ESTATES[view], conns = X.connections(est, A.observe(est, [], A.inventory(est)));
    for (const site of new Set(vals(at(view, { obPanel: 'paths' })).pathTimeAll.map(r => r.site))) {
      const p = vals(at(view, { obPanel: 'map', mapSel: 'asset:' + site })).panel;
      for (const x of p.paths) {
        const r = est.regionsList.find(y => y.region === x.key), cx = conns.rows.find(c => c.region === x.key);
        const state = r.link === 'degraded' ? 'down' : cx && cx.hot ? 'risk' : 'ok';
        assert.equal(x.dot, F.HEALTH_INK[state], `${view} ${site} to ${x.region}`);
      }
    }
  }
  assert.ok(HTML.includes('border-radius:{{ pa.rad }};background:{{ pa.dot }}'), 'the panel path dot draws its radius');
  assert.ok(HTML.includes('{{ pa.stateF }}') && !HTML.includes('{{ pa.msF }}'), 'the path reads its state, never a time');
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

test('Utilization legend and map: the health tokens and the not-measured ink, no hex', () => {
  for (const theme of ['light', 'dark']) {
    const v = vals(at('partial', { mapMode: 'util', theme }));
    const col = (l) => v.mapLegend.find(x => x.label === l).color;
    assert.equal(col('Healthy'), 'var(--viz-2)', theme); // the light blue, never the saving's green (2026-10-13)
    assert.equal(col('Near full'), F.HEALTH_INK.risk, theme);
    assert.equal(col('Down'), F.HEALTH_INK.down, theme);
    assert.equal(col('Not measured'), 'var(--text-disabled)', theme);
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
  // A public path carries no connection to measure: Healthy, and its link reads Public, never a figure.
  for (const [view, tag] of [['trust', 'prod'], ['small', 'internet-facing']]) {
    const row = paths(view).find(r => r.tag === tag);
    assert.equal(row.state, 'ok', `${view} ${tag}`);
    assert.equal(row.linkF, 'Public', `${view} ${tag}`);
  }
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
