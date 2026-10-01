import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults } from '../naas-app.js';
import * as SG from '../naas-signals.js';
import * as CF from '../naas-connect-flow.js';
import { ESTATES } from '../naas-data.js';
import { mkC } from './harness.mjs';

// Insights opens on Signals again (Micah, 2026-09-30: "Observe insights is
// light"; "the previous insights in the last one yesterday were really good";
// he chose "Cards plus Your actions"). Yesterday's six cards come back first in
// the tab order, with Health, Capacity and Spend beside them; the persona chips
// pick which three lead, the grid pages at six, and every figure is a button
// that opens exactly the set it counts.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const panel = () => { const a = HTML.indexOf('<sc-if value="{{ insPanelSignals }}"'); return HTML.slice(a, HTML.indexOf('<!-- Operations (notes', a)); };
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', ...patch });
const PERSONAS = ['architect', 'neteng', 'security', 'finops', 'exec'];
const PNAME = { architect: 'Cloud & Platform Architect', neteng: 'Network Engineering', security: 'Security & Compliance', finops: 'FinOps & SRE', exec: 'Executive' };
const card = (v, k) => v.sigAll.find(x => x.key === k);

test('Insights lands on Signals, first in the tab order', () => {
  const v = vals(ins('partial'));
  assert.deepEqual(v.insPanels.map(p => p.label.replace(/ · \d+$/, ' · N')), ['Signals', 'Your actions', 'Operations', 'Findings · N', 'Monthly briefing']);
  assert.equal(v.insPanelSignals, true);
  assert.equal(v.insPanelRole, false);
  // From anywhere, the rail's Insights opens on it.
  const c = mkC({ view: 'partial', estateParam: null, screen: 's0' });
  vals(c).railGroups.find(g => g.title === 'Observe').items.find(i => i.label === 'Insights').go();
  const w = vals(c);
  assert.equal(w.obIsInsights, true);
  assert.equal(w.insPanelSignals, true);
});

test('the new state keys start in defaults() and in the markup constructor alike', () => {
  const d = defaults();
  const ctor = HTML.slice(HTML.indexOf('constructor(p) { super(p); this.state = {'), HTML.indexOf('}; }', HTML.indexOf('constructor(p) { super(p); this.state = {')));
  for (const [k, want] of [['insPanel', "'signals'"], ['sigPage', '0'], ['sigOpen', 'null'], ['sigListPage', '0']]) {
    assert.ok(k in d, `${k} is not in defaults()`);
    assert.ok(ctor.includes(`${k}: ${want}`), `${k} is not in the markup constructor as ${want}`);
  }
});

test('nine cards, each with rows, and every row carries its action', () => {
  for (const view of ['partial', 'mature']) {
    const v = vals(ins(view));
    assert.deepEqual(v.sigAll.map(x => x.key).sort(), SG.CARDS.slice().sort(), view);
    for (const x of v.sigAll) {
      assert.ok(x.title && x.head, `${view} ${x.key} has no title or figure`);
      assert.equal(typeof x.open, 'function', `${view} ${x.key}: the title opens nothing`);
      if (x.isCols) {
        assert.equal(x.cols.length, 12, `${view} ${x.key}: twelve weeks`);
        assert.ok(x.cols.every(w => typeof w.go === 'function'), `${view} ${x.key}: a week is not a button`);
        assert.ok(x.hasAct && x.act && typeof x.actGo === 'function', `${view} ${x.key} has no action`);
        continue;
      }
      assert.ok(x.rows.length >= 1 && x.rows.length <= 4, `${view} ${x.key}: ${x.rows.length} rows`);
      for (const r of x.rows) {
        assert.ok(r.act && typeof r.actGo === 'function', `${view} ${x.key} ${r.label}: no action`);
        assert.equal(typeof r.figGo, 'function', `${view} ${x.key} ${r.label}: the figure opens nothing`);
      }
    }
  }
});

test('a card with nothing to show says so, and an estate with no traffic gets a first step', () => {
  const t = vals(ins('trust'));
  const slo = card(t, 'slo');
  assert.equal(slo.rows.length, 0);
  assert.equal(slo.noRows, true);
  assert.match(slo.empty, /No flow/);
  // The closest flow still reads, so an empty card says how close it runs, against its own SLO (2026-09-30).
  assert.match(slo.empty, /The closest, .+, takes \d+ ms against \d+ ms\.$/);
  assert.deepEqual(slo.legend, [], 'no bars, no key to them');
  const sm = card(vals(ins('small')), 'capacity');
  assert.equal(sm.noRows, true);
  assert.match(sm.empty, /No connection/);
  assert.notEqual(sm.head, sm.empty.replace(/\.$/, ''), 'the figure and the empty line say two things');
  // Nothing attached: the card offers the first step, and it starts the connect flow for the busiest
  // public region, named in the order (2026-09-30: it landed on a Compose that never named it).
  assert.equal(sm.hasEmptyAct, true);
  assert.equal(sm.emptyAct, 'Attach');
  const cs = ins('small'); card(vals(cs), 'capacity').emptyGo();
  assert.equal(cs.state.screen, 's4');
  assert.deepEqual(CF.flowOf(cs.state.compose, ESTATES.small).regions, ['AWS us-east-1']);
  assert.match(HTML, /<sc-if value="\{\{ sg\.hasEmptyAct \}\}"[^>]*><button class="sig-act" onClick="\{\{ sg\.emptyGo \}\}">\{\{ sg\.emptyAct \}\}<\/button>/);
  const e = vals(ins('empty'));
  assert.equal(e.sigHas, false);
  assert.equal(e.sigEmpty, true);
  assert.deepEqual(e.sigCards, []);
  e.sigEmptyGo();
  const c = ins('empty'); vals(c).sigEmptyGo();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.discoverView, 'sources');
  // No persona chips over nothing: the row waits for traffic.
  const p = panel();
  assert.ok(p.indexOf('<sc-if value="{{ sigHas }}"') >= 0 && p.indexOf('<sc-if value="{{ sigHas }}"') < p.indexOf('aria-label="Signals for"'), 'the chips show on an empty estate');
});

test('the persona chips pick which three lead; the grid pages at six', () => {
  for (const p of PERSONAS) {
    const c = ins('partial', { persona: p });
    const v = vals(c);
    assert.deepEqual(v.sigAll.map(x => x.key), SG.orderOf(p), p);
    assert.deepEqual(v.sigCards.map(x => x.key), SG.orderOf(p).slice(0, 6), `${p} page one`);
    assert.equal(v.sigPager.label, '1–6 of 9');
    v.sigPager.next();
    assert.deepEqual(vals(c).sigCards.map(x => x.key), SG.orderOf(p).slice(6), `${p} page two`);
  }
  const c = ins('partial', { persona: 'neteng', sigPage: 1 });
  const v = vals(c);
  assert.deepEqual(v.sigChips.map(x => x.label), ['Architect', 'Network Eng', 'Security', 'FinOps & SRE', 'Executive']);
  assert.equal(v.sigChips.find(x => x.on).label, 'Network Eng');
  v.sigChips.find(x => x.label === 'Security').go();
  assert.equal(c.state.persona, 'security');
  assert.equal(c.state.sigPage, 0, 'a new persona starts on its own lead');
  assert.deepEqual(vals(c).sigCards.slice(0, 3).map(x => x.key), ['newdest', 'shadow', 'talkers']);
});

// Each move lands where its label says.
const LANDS = {
  // In the policy grammar's own words: the requirement is one Govern offers.
  'Set policy': (st) => st.tab === 'govern' && st.govPanel === 'policies' && !!st.authoring && /^(destination|region) /.test(st.authoring.match) && st.authoring.req.includes('Inline security inspection'),
  Policies: (st) => st.tab === 'govern' && st.govPanel === 'policies',
  'Ask Andi': (st) => st.andiOpen === true && !!st.andiScope,
  Steer: (st, r) => (st.steered || []).includes(r.id) && (st.events || []).some(e => /^Steered /.test(e.text)),
  // Attach and Add a port start the connect flow for the region, as Connect > Recommended does,
  // and its banner says which and why (2026-09-30).
  Attach: (st, r) => st.screen === 's4' && st.compose.prefillSets.regions.join() === r.region && /^Attach /.test(st.compose.note),
  // w2 (2026-09-30): one connection, one move. Where AT&T sells the port, Add a port and Resize
  // open Modify bandwidth in place at the size they name, as Optimize does; never the retired review.
  'Add a port': (st, r) => (!!st.bwFor && !!st.bwPick && st.screen === 's3') || (st.screen === 's4' && st.compose.prefillSets.regions.join() === r.region && /^Add a port to /.test(st.compose.note)),
  Resize: (st, r) => st.bwFor === r.key && !!st.bwPick && st.screen === 's3',
  Trace: (st) => st.obPage === 'perf' && st.obPanel === 'paths' && !!st.pathSel,
  Optimize: (st) => st.tab === 'cost' && st.costPanel === 'optimize',
  'By bucket': (st) => st.tab === 'cost' && st.costPanel === 'bucket',
};
test('every action lands where it says, on every estate and persona', () => {
  const seen = new Set();
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const p of PERSONAS) {
      const base = vals(ins(view, { persona: p }));
      for (const x of base.sigAll) {
        const acts = x.isCols ? [{ act: x.act, key: '_' }] : x.rows;
        acts.forEach((r, i) => {
          const c = ins(view, { persona: p });
          const fresh = card(vals(c), x.key);
          const fire = x.isCols ? fresh.actGo : fresh.rows[i].actGo;
          fire();
          const ok = LANDS[r.act];
          assert.ok(ok, `${view} ${p} ${x.key}: "${r.act}" is not a known move`);
          assert.ok(ok(c.state, r), `${view} ${p} ${x.key} ${r.label || ''}: "${r.act}" did not land`);
          seen.add(r.act);
        });
      }
    }
  }
  for (const a of Object.keys(LANDS)) assert.ok(seen.has(a), `no card offers ${a}`);
});

test('every figure is a button: title, headline, count, bar, value and week', () => {
  const p = panel();
  assert.ok(p.length > 0, 'no Signals panel');
  assert.doesNotMatch(p, /role="button"/, 'a div poses as a button');
  assert.doesNotMatch(p, /class="fx-row door"/, 'yesterday\'s clickable div rows are back');
  const onClicks = [...p.matchAll(/onClick="\{\{ ([^}]+) \}\}"/g)].map(m => ({ b: m[1].trim(), at: m.index }));
  for (const need of ['sg.open', 'sg.finds.go', 'r.figGo', 'r.actGo', 'w.go', 'sg.actGo', 'fr.figGo', 'fr.actGo', 'sigFocus.back', 'sigFocus.finds.go']) {
    const hit = onClicks.find(o => o.b === need);
    assert.ok(hit, `${need} is never bound`);
    const tagStart = p.lastIndexOf('<', hit.at);
    assert.ok(p.startsWith('<button', tagStart), `${need} sits on a ${p.slice(tagStart, tagStart + 8)}, not a <button>`);
  }
  // The figure's value and bar live inside the figure's button.
  const fig = p.slice(p.indexOf('onClick="{{ r.figGo }}"'), p.indexOf('</button>', p.indexOf('onClick="{{ r.figGo }}"')));
  for (const b of ['{{ r.label }}', '{{ r.v }}', '{{ sgm.w }}']) assert.ok(fig.includes(b), `${b} is outside the figure's button`);
  // No sc-for inside svg, table or select.
  for (const t of ['svg', 'table', 'select']) assert.doesNotMatch(p, new RegExp(`<${t}\\b`), `a <${t}> in the Signals panel`);
});

test('each title and headline opens its full list; a card\'s list holds every row it counts', () => {
  const c0 = ins('partial');
  const v0 = vals(c0);
  const iw = v0.iw;
  // Latency over SLO holds the spikes Health calls Over SLO beside the flows, and Egress growth its twelve weeks (2026-09-30).
  const spikes = (v0.problemRows || []).filter(p => /^an-(?!link-|sat-)/.test(p.key) && p.state === 'slo').length;
  const full = { talkers: iw.talkersAll.length, newdest: iw.newDestN, shadow: iw.shadowAll.length, multi: iw.multi.totalN, slo: iw.sloN + spikes, growth: 12 };
  for (const [k, n] of Object.entries(full)) {
    const c = ins('partial');
    card(vals(c), k).open();
    assert.equal(c.state.sigOpen, k);
    const v = vals(c);
    assert.equal(v.sigFocusOn, true);
    assert.equal(v.sigFocus.total, n, `${k}: the list holds ${v.sigFocus.total}, the card counts ${n}`);
    assert.equal(v.sigFocus.head, card(v0, k).head, `${k}: the list reads the card's figure`);
    assert.ok(v.sigFocus.rows.every(r => r.act && typeof r.actGo === 'function'), `${k}: a listed row lost its action`);
    v.sigFocus.back();
    assert.equal(c.state.sigOpen, null);
  }
  assert.equal(iw.newDestN, 6, 'Growing counts six new destinations and the card shows four');
  // The lists that already have a page open it.
  const lands = { health: (st) => st.obPage === 'perf' && st.obPanel === 'health', capacity: (st) => st.obPage === 'perf' && st.obPanel === 'conn', spend: (st) => st.tab === 'cost' && st.costPanel === 'bucket' };
  for (const [k, ok] of Object.entries(lands)) { const c = ins('partial'); card(vals(c), k).open(); assert.ok(ok(c.state), `${k} title`); }
  // Latency over SLO counts every flow over, not the five it draws (it undercounted past five).
  const t = vals(ins('trust'));
  assert.equal(t.iw.sloN, t.iw.sloAll.length);
});

test('each row\'s figure opens the one thing it counts', () => {
  const at = (k, i = 0, view = 'partial', patch = {}) => { const c = ins(view, patch); const r = card(vals(c), k).rows[i]; r.figGo(); return { st: c.state, r, v: vals(c) }; };
  // w2 (2026-09-30): a region's traffic, a pair's and a flow's latency open their records with
  // the row's figure on the landing; the Traffic map scoped to the region drew the sites' traffic to it.
  let x = at('talkers');
  assert.equal(x.st.obPage, 'logs'); assert.equal(x.st.explain.label, x.r.label); assert.equal(x.st.explain.value, x.r.v); assert.equal(x.st.explain.region, x.r.region);
  x = at('newdest');
  assert.equal(x.st.obPage, 'logs'); assert.equal(x.st.explain.label, x.r.label); assert.equal(x.st.explain.pattern, 'internet');
  assert.ok(x.v.hasLogs, 'the destination\'s records page is empty');
  x = at('shadow');
  assert.equal(x.st.obPage, 'logs'); assert.equal(x.st.explain.label, x.r.label); assert.ok(x.v.hasLogs);
  // A flow opens its records with its latency named; a spike opens its problem, as Health's row does.
  const sloRows = card(vals(ins('partial')), 'slo').rows;
  x = at('slo', sloRows.findIndex(r => r.id));
  assert.equal(x.st.obPage, 'logs'); assert.equal(x.st.explain.value, x.r.v); assert.ok(x.v.hasLogs);
  x = at('slo', sloRows.findIndex(r => !r.id));
  assert.equal(x.st.fdKey, x.r.key); assert.equal(x.v.fdOpen, true);
  x = at('multi');
  assert.equal(x.st.obPage, 'logs'); assert.equal(x.st.explain.pattern, 'clouds'); assert.equal(x.st.explain.value, x.r.v); assert.ok(x.v.hasLogs);
  x = at('health');
  assert.equal(x.st.fdKey, x.r.key); assert.equal(x.v.fdOpen, true, 'the problem opens in place, in the finding drawer');
  x = at('capacity');
  assert.equal(x.st.obPanel, 'conn'); assert.equal(x.st.mapSel, x.r.key);
  x = at('spend');
  assert.equal(x.st.tab, 'cost'); assert.equal(x.st.costPanel, 'bucket');
  // A week opens the twelve in place with that week marked (2026-09-30): Over time is another series.
  const c = ins('partial'); card(vals(c), 'growth').cols[11].go();
  assert.equal(c.state.sigOpen, 'growth'); assert.equal(c.state.sigWeek, 'w11');
});

test('only traffic figures open Logs', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const kinds = vals(ins(view)).sigAll;
    for (const x of kinds) {
      const figs = [(v) => card(v, x.key).open(), ...(x.isCols ? x.cols.map((_, i) => (v) => card(v, x.key).cols[i].go()) : x.rows.map((_, i) => (v) => card(v, x.key).rows[i].figGo()))];
      for (const f of figs) {
        const c = ins(view); f(vals(c));
        if (c.state.obPage === 'logs' && c.state.tab === 'observe' && c.state.screen === 's3') assert.ok(SG.TRAFFIC.has(x.key), `${view} ${x.key}: a figure that is not traffic opened Logs`);
      }
    }
  }
});

test('each card\'s count opens its findings, and the lead cards\' findings belong to that persona', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    // The Architect too (2026-09-30): coverage and topology are its own now.
    for (const p of ['architect', 'security', 'finops', 'neteng']) {
      const v = vals(ins(view, { persona: p }));
      for (const k of SG.orderOf(p).slice(0, 3)) {
        const c = ins(view, { persona: p });
        const x = card(vals(c), k);
        x.finds.go();
        const w = vals(c);
        assert.equal(c.state.insPanel, 'findings');
        assert.equal(w.insightRows.length, x.finds.n, `${view} ${p} ${k}: says ${x.finds.n}, lists ${w.insightRows.length}`);
        for (const r of w.findAll.filter(f => SG.findsOf(k, SG.lensOf(p), {})(f.key) && !/^an-/.test(f.key))) assert.equal(r.persona, PNAME[p], `${view} ${p} ${k}: ${r.key} belongs to ${r.persona}`);
        void v;
      }
    }
  }
  // Blind regions and regions over SLO are Network Engineering's (they were FinOps & SRE's).
  const all = vals(ins('partial')).findAll;
  for (const k of ['blindspots', 'degraded']) assert.equal(all.find(f => f.key === k).persona, 'Network Engineering', k);
});

test('the rows speak to the persona that leads with them', () => {
  const tk = (p, view = 'partial') => card(vals(ins(view, { persona: p })), 'talkers');
  // FinOps reads the Gbps that bills as public egress, the buckets' dollars as the total (2026-09-30).
  const fin = tk('finops');
  assert.match(fin.title, /by egress/);
  assert.ok(fin.rows.every(r => /^\d+\.\d Gbps$/.test(r.v)), fin.rows.map(r => r.v).join(', '));
  const sec = tk('security');
  assert.match(sec.title, /exposure/);
  const firstPriv = sec.rows.findIndex(r => r.priv);
  assert.ok(firstPriv === -1 || sec.rows.slice(firstPriv).every(r => r.priv), 'the public internet leads Security\'s exposure');
  assert.ok(sec.rows.filter(r => !r.priv).every(r => r.act === 'Set policy'));
  for (const p of ['architect', 'exec']) assert.ok(tk(p).rows.filter(r => !r.priv).every(r => r.act === 'Attach'), p);
  // FinOps' total is the buckets' public spend, the figure Spend and Egress growth show.
  const pubMo = vals(ins('partial')).buckets.filter(b => b.today > b.fabric).reduce((a, b) => a + b.today, 0);
  assert.ok(fin.head.startsWith('$' + pubMo.toLocaleString('en-US') + '/mo billed public'), fin.head); // w2 (2026-09-30): what the dollars count
});

test('the cards paint from theme tokens, in both themes', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = vals(ins(view));
    for (const x of v.sigAll) {
      for (const r of x.rows || []) for (const sg of r.segs) assert.match(sg.fill, /^var\(--/, `${view} ${x.key} ${r.label}: ${sg.fill}`);
      for (const l of x.legend) assert.match(l.ink, /^var\(--/, `${view} ${x.key} legend ${l.label}`);
    }
  }
  assert.doesNotMatch(panel(), /#[0-9a-f]{3,6}\b/i, 'a hex colour in the Signals markup');
});

test('the words carry no em dash and no ramp code', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p }));
    const words = v.sigAll.flatMap(x => [x.title, x.head, x.empty || '', ...(x.rows || []).flatMap(r => [r.label, r.sub, r.v, r.act]), ...x.legend.map(l => l.label)]).join('\n');
    assert.doesNotMatch(words, /—/, `${view} ${p}: an em dash`);
    assert.doesNotMatch(words, /\b(ER|DX|EQX|GCI)\b/, `${view} ${p}: a ramp code`);
  }
});

test('sample data says so', () => {
  const v = vals(ins('partial'));
  for (const k of ['newdest', 'shadow']) assert.match(card(v, k).head, /sample/, k);
});
