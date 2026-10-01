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
        // A coverage or share row counts all a region sends, on any path.
        const outside = !onRow && /egress|exposure/.test(cd.title);
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
            if (/egress|exposure/.test(cd.title) && /cross-cloud public/.test(r.sub)) assert.equal(rec.pattern, 'clouds', `${say}: the row counts its cross-cloud pair`);
          }
        }
      });
    }
  }
  assert.ok(seen > 60, `only ${seen} figures checked`);
  assert.ok(empty < seen / 4, `${empty} of ${seen} figures land on no record`);
});

test('An explanation no sample record carries says so, on its count and in the empty list, never falling back to other records', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'logs', explain: { label: 'A flow', value: '1 Gbps', sub: '', cut: 'Records from nowhere.', src: 'nowhere', pattern: 'internet', path: 'public', parts: [] } });
  const v = vals(c);
  assert.equal(v.flowRecords.length, 0, 'the cut fell back to other records');
  assert.equal(v.explainCount, 'No sample record carries it yet.');
  assert.match(v.logEmptyLine, /^No sample record carries it yet\./);
  const plain = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'logs', logQ: 'zzzz' }));
  assert.equal(plain.logEmptyLine, 'Nothing matches these filters.');
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

// Orders on the one clock (SCH.nowOf): ordered Tue Sep 29, read Mon Oct 5.
const ORDERED = Date.parse('2026-09-29T15:00:00Z'), LATER = '2026-10-05T15:00:00Z';
test('A landed size reads as it landed on the home\'s chip, in Your actions and in the briefing, as Health reads it', async () => {
  const BW = await import('../naas-bandwidth.js');
  const cap = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn' })).capRows.find(r => r.region === 'us-east-1');
  const order = BW.orderOf(cap, { ports: 3, mbps: 1000 }, ORDERED, 'partial', { id: BW.nextId([]) });
  const at = (patch) => mkC({ view: 'partial', estateParam: null, persona: 'architect', orders: [order], nowIso: LATER, ...patch });
  const health = allOf(at({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' }), 'problemRows', 'probPager').find(p => p.where === 'AWS us-east-1');
  assert.ok(health && /of 3 × 1 Gbps purchased/.test(health.what), `Health reads "${health && health.what}"`);
  const home = vals(at({ screen: 's0' }));
  const chip = home.roleActAll.find(a => /AWS us-east-1 peaks at/.test(a.head));
  assert.ok(chip, `no us-east-1 chip on the home: ${home.roleActAll.map(a => a.head).join(' / ')}`);
  assert.match(chip.head, /of 3 × 1 Gbps/, `the home's chip reads "${chip.head}"`);
  const ya = vals(at({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role' })).roleActAll.find(a => /AWS us-east-1 peaks at/.test(a.head));
  assert.match(ya.head, /of 3 × 1 Gbps/, `Your actions reads "${ya.head}"`);
  const brief = vals(at({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'brief' })).briefText;
  assert.doesNotMatch(brief, /3 × 10 Gbps/, `the briefing reads "${brief}"`);
});

test('A size short of the peak drops what the peak does not fit, and the connection says so', async () => {
  const BW = await import('../naas-bandwidth.js');
  const cap = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn' })).capRows.find(r => r.region === 'us-east-1');
  const order = BW.orderOf(cap, { ports: 3, mbps: 1000 }, ORDERED, 'partial', { id: BW.nextId([]) });
  const c = mkC({ view: 'partial', estateParam: null, orders: [order], nowIso: LATER, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'map', mapSel: 'cx-us-east-1' });
  const p = vals(c).panel;
  const drops = p.overview.find(o => o.k === 'Drops') || (p.groups.flatMap(g => g.rows).find(o => o.k === 'Drops'));
  const pct = +(p.overview.find(o => o.k === 'Utilization') || p.groups.flatMap(g => g.rows).find(o => o.k === 'Utilization') || { v: '0' }).v.match(/\d+/)[0];
  assert.ok(pct > 100, `the landed size reads ${pct}%`);
  assert.equal(drops.v, `${Math.round((1 - 100 / pct) * 100)}% at peak`, `a connection at ${pct}% of its size reads drops ${drops.v}`);
});

const COUNTW = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
test('The briefing says under way only of what is accepted or in progress, never of a snoozed finding; a port on order no longer waits', async () => {
  for (const view of VIEWS) for (const persona of ['architect', 'neteng', 'security', 'finops']) {
    const ya = vals(ins(view, { persona, insPanel: 'role' })).roleActAll;
    const under = ya.filter(a => ['Acknowledged', 'In progress'].includes(a.stateLabel)).length;
    const brief = vals(ins(view, { persona, insPanel: 'brief' })).briefText;
    const m = brief.match(/(\w+) more (?:is|are) under way|; (\w+) (?:is|are) under way/);
    const said = m ? COUNTW.indexOf(m[1] || m[2]) : 0;
    assert.equal(said, under, `${view} ${persona}: the briefing says ${said} under way ("${brief}") over ${ya.map(a => `${a.head.slice(0, 40)} [${a.stateLabel}]`).join(' / ')}`);
  }
  // Bank scale, an order in flight on us-central1: the home's chip reads In progress, so nothing says it waits.
  const BW = await import('../naas-bandwidth.js');
  const cap = vals(mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn' })).capRows.find(r => r.region === 'us-central1');
  const order = BW.orderOf(cap, { ports: cap.ports + 1, mbps: 10000 }, ORDERED, 'trust', { id: BW.nextId([]) });
  const at = (patch) => mkC({ view: 'trust', estateParam: null, persona: 'architect', orders: [order], nowIso: '2026-09-29T18:00:00Z', ...patch });
  const home = vals(at({ screen: 's0' }));
  assert.ok(!home.homeWaiting.some(a => /us-central1/.test(a.head)), `the home still says us-central1 waits: ${home.homeWaiting.map(a => a.head).join(' / ')}`);
  const brief = vals(at({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'brief' })).briefText;
  const waits = (brief.match(/(?:wait|waiting)[^.]*\./) || [''])[0];
  assert.doesNotMatch(waits, /us-central1/, `the briefing says us-central1 waits: "${brief}"`);
  const row = vals(at({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role' })).roleActAll.find(a => /us-central1/.test(a.head));
  assert.equal(row.stateLabel, 'In progress', `Your actions reads ${row.stateLabel} on an order in flight`);
  // Optimize's Capacity move reads what Signals, Health and the panel read.
  const opt = vals(at({ screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'optimize' })).optRows.find(r => r.key === 'capacity');
  assert.equal(opt.state, 'In progress');
  assert.equal(opt.cta, 'In progress', `Optimize's Capacity reads In progress beside a button reading ${opt.cta}`);
});

test('Signals\' Add a port and Attach name the data center the order serves, never "No data centers in" the region\'s metro', async () => {
  const CF = await import('../naas-connect-flow.js');
  const { ESTATES } = await import('../naas-data.js');
  let seen = 0;
  for (const view of ['partial', 'mature', 'trust']) for (const persona of ['architect', 'neteng']) {
    for (const k of ['capacity', 'health', 'talkers']) {
      const cd = card(vals(ins(view, { persona })), k); if (!cd) continue;
      cd.all.forEach((r, i) => {
        if (!/^(Add a port|Attach)$/.test(r.act)) return;
        const c = ins(view, { persona });
        card(vals(c), k).all[i].actGo();
        if (c.state.screen !== 's4') return; // Modify bandwidth opens in place where AT&T sells the port
        const f = CF.flowOf(c.state.compose, ESTATES[view]);
        const sites = CF.wipRows(f, ESTATES[view]).find(x => x.key === 'sites');
        assert.ok(sites, `${view} ${persona} ${r.act} ${r.label}: the order has no Sites row`);
        assert.doesNotMatch(String(sites.value), /^No /, `${view} ${persona} ${r.act} ${r.label}: Sites reads "${sites.value}"`);
        seen += 1;
      });
    }
  }
  assert.ok(seen >= 3, `only ${seen} orders checked`);
});

test('Could save is one figure: the Traffic map\'s tile names its own basis, the sites\' traffic it draws', () => {
  for (const view of VIEWS) {
    const spend = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend' })).spendTiles.find(t => t.l === 'Could save');
    const tiles = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'map' })).flowTiles;
    for (const t of tiles.filter(x => x.l === 'Could save')) assert.equal(t.v, spend.v, `${view}: Traffic's Could save reads ${t.v}, Spend's ${spend.v}`);
    assert.ok(tiles.some(x => x.key === 'could' && /^Sites could save$/.test(x.l)), `${view}: the map's tile reads ${tiles.map(x => x.l).join(', ')}`);
  }
});

// Govern's one rule won the merge (2026-10-01): PCI counts the workloads carrying Discover's pci tag, so the
// finding names PCI-tagged workloads, the set Discover's apps table and Govern > Tags list.
test('The PCI finding names the basis of its count, the PCI-tagged workloads Discover and Govern list', async () => {
  const { ESTATES } = await import('../naas-data.js');
  let seen = 0;
  for (const view of VIEWS) {
    const f = (ESTATES[view].findings || []).find(x => x.kind === 'pci'); if (!f) continue;
    assert.match(f.ev, /^[\d,]+ of [\d,]+ PCI-tagged workloads in [\w -]+ have/, `${view}: the evidence reads "${f.ev}"`);
    seen += 1;
  }
  // Established's PCI workloads are exposed too under Govern's one rule (w2-govern), so three estates carry the finding.
  assert.equal(seen, 3);
});

test('Spend by bucket names its blue as Cost does, AT&T price, and never calls a bucket\'s dollars on AT&T', async () => {
  const CV = await import('../naas-cost-view.js');
  for (const view of VIEWS) {
    const sp = card(vals(ins(view, { persona: 'finops' })), 'spend');
    if (!sp || !sp.all.length) continue;
    const blue = sp.legend.find(l => l.ink === CV.COST_INK.att.color);
    assert.ok(blue, `${view}: Spend keys no blue`);
    assert.equal(blue.label, CV.COST_INK.att.word, `${view}: Spend keys blue "${blue.label}", Cost keys it "${CV.COST_INK.att.word}"`);
    for (const r of sp.all) assert.doesNotMatch(r.sub, /on AT&T/, `${view}: the ${r.label} bucket (${r.sub}) reads its dollars as on AT&T`);
  }
});

test('Top talkers paints a region\'s public pair outside AT&T, its On AT&T parts add up to the head, and it names the pair\'s Gbps', () => {
  const w = (s) => parseFloat(s) / 100;
  for (const view of VIEWS) for (const persona of ['architect', 'neteng']) {
    const v = vals(ins(view, { persona }));
    const t = card(v, 'talkers'), iw = v.iw;
    const max = Math.max(...iw.talkersAll.map(x => x.gbps));
    let onG = 0;
    for (const r of t.all) {
      const src = iw.talkersAll.find(x => x.key === r.key);
      const on = r.segs.filter(x => x.fill === 'var(--viz-1)').reduce((a, x) => a + w(x.w) * max, 0);
      const pub = r.segs.filter(x => x.fill === 'var(--viz-6)').reduce((a, x) => a + w(x.w) * max, 0);
      assert.ok(Math.abs(pub - (src.pubG || 0)) < 0.15, `${view} ${persona} ${r.label}: the bar paints ${pub.toFixed(1)} Gbps outside AT&T, the region sends ${src.pubG}`);
      onG += on;
      if (src.xG > 0) assert.match(r.sub, new RegExp(`${src.xG.toFixed(1)} Gbps cross-cloud`), `${view} ${persona} ${r.label}: "${r.sub}" does not name its ${src.xG} Gbps cross-cloud`);
    }
    const fab = v.iw.talkersAll.reduce((a, x) => a + x.gbps - (x.pubG || 0), 0), tot = v.iw.talkersAll.reduce((a, x) => a + x.gbps, 0);
    assert.ok(Math.abs(onG - fab) < 0.3, `${view} ${persona}: the blue adds up to ${onG.toFixed(1)} Gbps, On AT&T is ${fab.toFixed(1)}`);
    const pct = (/on AT&T · (\d+)% of traffic/.exec(t.head) || [])[1];
    if (pct) assert.equal(+pct, Math.round(fab / tot * 100), `${view} ${persona}: "${t.head}" over ${fab.toFixed(1)} of ${tot.toFixed(1)} Gbps on AT&T`);
  }
  // The egress and exposure lenses' On AT&T rows name their pair too.
  for (const view of VIEWS) for (const persona of ['security', 'finops']) {
    const v = vals(ins(view, { persona }));
    for (const r of card(v, 'talkers').all.filter(x => x.v2 === 'On AT&T' && !/bills public/.test(x.sub))) {
      const src = v.iw.talkersAll.find(x => x.key === r.key);
      if (src.xG > 0) assert.match(r.sub, new RegExp(`${src.xG.toFixed(1)} Gbps cross-cloud`), `${view} ${persona} ${r.label}: "${r.sub}"`);
    }
  }
});
