import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's second pass on w2-consistency (2026-09-30, on 0d7472b). Each
// test names the problem it pins: a page past the fold, a door that lands on a
// set other than the one it counts, one connection with two moves, a landed
// size misread, a colour that means two things, a briefing that says a thing
// is under way when it is snoozed.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'signals', ...patch });
const card = (v, k) => (v.sigAll || []).find(x => x.key === k);

test('Logs with an explanation: the filters are shut when the toggle says Show, and the page is sized for what shows', () => {
  for (const view of VIEWS) {
    const c = ins(view, { persona: 'neteng' });
    card(vals(c), 'talkers').all[0].figGo();
    let v = vals(c);
    assert.equal(c.state.obPage, 'logs');
    assert.ok(v.explainOn, `${view}: no explanation on the landing`);
    assert.equal(v.logFiltersOpen, !v.logFiltersShut, `${view}: the filters render ${v.logFiltersOpen ? 'open' : 'shut'} while the page sizes them ${v.logFiltersShut ? 'shut' : 'open'}`);
    assert.equal(v.logFilterToggleWord, v.logFiltersOpen ? 'Hide' : 'Show', `${view}: the toggle reads ${v.logFilterToggleWord} over filters that are ${v.logFiltersOpen ? 'open' : 'shut'}`);
    // Opened by hand, the page drops rows to keep the fold.
    const shut = v.logPageSize;
    v.toggleLogFilters();
    v = vals(c);
    assert.ok(v.logFiltersOpen, `${view}: Show does not open the filters`);
    assert.ok(v.logPageSize < shut, `${view}: the open filters keep ${v.logPageSize} rows, as many as shut (${shut})`);
  }
});

// Every record a landing lists, across its pages.
const allRecords = (c) => {
  const out = []; let v = vals(c), guard = 0;
  for (;;) { out.push(...v.flowRecords); if (!v.logPager.many || v.logPager.nextOp < 1 || guard++ > 20) break; v.logPager.next(); v = vals(c); }
  return { v: vals(c), recs: out };
};
// Every row of a paged list, across its pages.
const allOf = (c, list, pager) => { const out = []; let v = vals(c), guard = 0; for (;;) { out.push(...v[list]); if (!v[pager] || !v[pager].many || v[pager].nextOp < 1 || guard++ > 20) break; v[pager].next(); v = vals(c); } return out; };
const healthAll = (view) => allOf(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' }), 'problemRows', 'probPager');
const regionsOf = (rec) => [rec.srcSub, rec.dstSub].map(s => s.split(' · ').pop());
test('A Signals traffic figure lands on the records it counts, or says no sample record carries it', () => {
  let seen = 0, empty = 0;
  for (const view of VIEWS) for (const persona of ['architect', 'neteng', 'security', 'finops', 'exec']) {
    const v0 = vals(ins(view, { persona }));
    for (const k of ['talkers', 'multi', 'slo']) {
      const cd = card(v0, k); if (!cd) continue;
      cd.all.forEach((r, i) => {
        if (r.fig === 'finding' || r.fig === 'logs') return;
        const c = ins(view, { persona });
        card(vals(c), k).all[i].figGo();
        const { v, recs } = allRecords(c);
        const where = `${view} ${persona} ${cd.title} "${r.label} ${r.v} · ${r.sub}"`;
        seen += 1;
        if (!recs.length) { empty += 1; assert.match(v.explainCount, /^No sample record carries it/, `${where}: an empty landing reads "${v.explainCount}"`); return; }
        assert.equal(v.explainCount, `${recs.length} of ${v.logTabs[0].label.split(' · ')[1]} records carry it`, `${where}: the count reads "${v.explainCount}" over ${recs.length} records`);
        const pair = / ↔ /.test(r.label) ? r.label.split(' ↔ ') : null;
        // Egress and exposure rows count what leaves AT&T; their On AT&T rows count what rides it.
        const onRow = /egress|exposure/.test(cd.title) && r.v2 === 'On AT&T';
        const outside = !onRow && (/public|outside/.test(r.sub) || /egress|exposure/.test(cd.title));
        for (const rec of recs) {
          const [src, dst] = regionsOf(rec), say = `${where} lists ${rec.srcName} (${rec.srcSub}) to ${rec.dstName} (${rec.dstSub}) ${rec.path}`;
          if (pair) {
            assert.deepEqual([src, dst].sort(), pair.slice().sort(), `${say}: not the pair`);
            assert.equal(rec.path, /on AT&T/.test(r.sub) ? 'private' : 'public', `${say}: the pair reads ${r.sub}`);
          } else {
            assert.equal(src, r.region, `${say}: not from ${r.region}`);
            if (k === 'slo') assert.equal(rec.path, / · on AT&T$/.test(r.sub) ? 'private' : 'public', `${say}: the flow runs ${r.sub}`);
            else if (outside) assert.equal(rec.path, 'public', `${say}: the row counts traffic outside AT&T`);
            else if (onRow) assert.equal(rec.path, 'private', `${say}: the row counts traffic on AT&T`);
            if (/cross-cloud/.test(r.sub)) assert.equal(rec.pattern, 'clouds', `${say}: the row counts its cross-cloud pair`);
          }
        }
      });
    }
  }
  assert.ok(seen > 60, `only ${seen} figures checked`);
  assert.ok(empty < seen / 4, `${empty} of ${seen} figures land on no record`);
});

// The Traffic map with a cloud opened and one of its regions selected, or a connection's own panel.
const mapAt = (view, cloud, sel) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'map', mapOpen: cloud ? ['cloud:' + cloud] : [], mapSel: sel });
const WORST = ['ok', 'risk', 'slo', 'down'];
test('A connection that is down is traced first on the map too, never given a port', () => {
  let seen = 0;
  for (const view of VIEWS) {
    for (const r of vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn' })).capRows.filter(x => x.state === 'down')) {
      for (const [where, c] of [['the region node', mapAt(view, r.cloud, `cloud:${r.cloud}/${r.region}`)], ['the connection', mapAt(view, null, r.id)]]) {
        const p = vals(c).panel;
        assert.ok(p, `${view}: no panel for ${where} ${r.region}`);
        const labels = p.actions.map(a => a.label);
        assert.ok(!labels.includes('Add a port'), `${view} ${where} ${r.cloud} ${r.region} is down and offers ${labels.join(', ')}`);
        assert.ok(labels.includes('Trace'), `${view} ${where} ${r.cloud} ${r.region} is down and offers no Trace: ${labels.join(', ')}`);
        assert.equal(p.primary.label, 'Trace', `${view} ${where}: the primary reads ${p.primary.label}`);
        p.primary.go();
        assert.equal(c.state.obPanel, 'paths', `${view} ${where}: Trace opens ${c.state.obPanel}`);
        assert.ok(String(c.state.pathPin || '').length, `${view} ${where}: Trace pins no path`);
        seen += 1;
      }
    }
  }
  assert.ok(seen >= 2, 'no connection down to check');
});

test('A region node\'s chip reads its Health state, its connection included, in Health\'s ink; its traffic says it is from the sites', () => {
  let seen = 0;
  for (const view of VIEWS) {
    const health = healthAll(view);
    for (const r of vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn' })).capRows) {
      const p = vals(mapAt(view, r.cloud, `cloud:${r.cloud}/${r.region}`)).panel;
      if (!p) continue;
      const listed = health.filter(x => x.where === `${r.cloud} ${r.region}`).map(x => x.state);
      const want = [r.state, ...listed].reduce((a, s) => (WORST.indexOf(s) > WORST.indexOf(a) ? s : a), 'ok');
      const WORD = { ok: 'Healthy', risk: 'At risk', slo: 'Over SLO', down: 'Down' }, INK = { ok: 'var(--success)', risk: 'var(--warning)', slo: 'var(--viz-5)', down: 'var(--error)' };
      if (WORST.indexOf(want) >= WORST.indexOf(r.state)) {
        assert.equal(p.stateWord, WORD[want], `${view} ${r.cloud} ${r.region}: the chip reads ${p.stateWord}; Health lists ${listed.join(', ') || 'nothing'} and Capacity reads ${r.state}`);
        assert.equal(p.stateDot, INK[want], `${view} ${r.cloud} ${r.region}: the chip's dot is ${p.stateDot} for ${p.stateWord}`);
      }
      assert.ok(p.tiles.some(t => t.k === 'From your sites'), `${view} ${r.cloud} ${r.region}: the traffic tile reads ${p.tiles.map(t => t.k).join(', ')}`);
      seen += 1;
    }
  }
  assert.ok(seen > 5, `only ${seen} panels checked`);
});

test('Health lists every region the latency finding says runs above the SLO, so the home\'s dot and its chip agree', async () => {
  const F = await import('../naas-flowmap.js');
  const { ESTATES } = await import('../naas-data.js');
  let seen = 0;
  for (const view of VIEWS) {
    const over = ESTATES[view].regionsList.filter(r => F.regionState(r) === 'slo');
    const health = healthAll(view);
    const home = vals(mkC({ view, estateParam: null, screen: 's0', persona: 'neteng' }));
    const chip = home.roleActAll.find(a => /above the latency SLO/.test(a.head));
    for (const r of over) {
      const row = health.find(p => p.where === `${r.cloud} ${r.region}` && p.state === 'slo');
      assert.ok(row, `${view}: ${r.cloud} ${r.region} runs ${r.priv ? r.fab : r.pub} ms over its SLO and Health does not list it (${health.map(p => p.where + ' ' + p.state).join(', ')})`);
      // A spike's region reads its spike, worse than its p95.
      if (!/^Latency spike/.test(row.what)) assert.match(row.what, new RegExp(`${r.priv ? r.fab : r.pub} ms`), `${view}: Health's row reads "${row.what}"`);
      const dot = home.heroRegions.find(x => x.region === r.region && !x.ghost);
      if (dot) assert.equal(dot.relState, 'slo', `${view}: the home's ${r.region} dot reads ${dot.relState} ("${dot.relTitle}") beside "${chip && chip.head}"`);
      seen += 1;
    }
  }
  assert.ok(seen >= 2, `only ${seen} regions over SLO`);
});
