import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as SG from '../naas-signals.js';
import * as F from '../naas-flowmap.js';
import * as CF from '../naas-connect-flow.js';
import { ESTATES, FOUND_SOURCES } from '../naas-data.js';
import { observe } from '../naas-addendum.js';
import { mkC } from './harness.mjs';

// Signals, second round (skeptic's verdict, 2026-09-30). Each test names the
// problem it pins: a figure that contradicts the card beside it, a colour that
// means two things, a move that lands somewhere generic, a rule applied twice,
// a lead card that opens another role's work, an empty card leading, and the
// Gbps yesterday's cards showed.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const panel = () => { const a = HTML.indexOf('<sc-if value="{{ insPanelSignals }}"'); return HTML.slice(a, HTML.indexOf('<!-- Operations (notes', a)); };
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', ...patch });
const card = (v, k) => v.sigAll.find(x => x.key === k);
const PERSONAS = ['architect', 'neteng', 'security', 'finops', 'exec'];
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
const listOf = (view, persona, k) => vals(ins(view, { persona, sigOpen: k })).sigFocus.all;

test('FinOps\' Top talkers puts no dollar on a region the buckets do not price; its total is the buckets\'', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { persona: 'finops' }));
    const t = card(v, 'talkers');
    assert.match(t.title, /by egress/, view);
    for (const r of listOf(view, 'finops', 'talkers')) {
      for (const w of [r.v, r.v2 || '', r.sub]) assert.doesNotMatch(w, /\$/, `${view} ${r.label}: "${w}" prices a region the buckets price by cloud`);
    }
    const pubMo = v.buckets.filter(b => b.today > b.fabric).reduce((a, b) => a + b.today, 0);
    if (pubMo) {
      assert.ok(t.head.includes(`${fmt(pubMo)}/mo`), `${view}: "${t.head}" is not the buckets' ${fmt(pubMo)}/mo`);
      assert.ok(card(v, 'growth').nowLabel.includes(fmt(pubMo)), `${view}: Egress growth this week reads another figure`);
    }
  }
});

test('one colour, one meaning: a saving is --success, no policy is --warning, and no card paints --viz-3 or --viz-4', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p }));
    for (const x of v.sigAll) {
      for (const r of x.all) for (const sg of r.segs) assert.doesNotMatch(sg.fill, /--viz-[34]\)/, `${view} ${x.key} ${r.label}: ${sg.fill}`);
      for (const l of x.legend) assert.doesNotMatch(l.ink, /--viz-[34]\)/, `${view} ${x.key} legend ${l.label}: ${l.ink}`);
    }
  }
  const v = vals(ins('partial'));
  const sp = card(v, 'spend');
  assert.equal(sp.rows[0].segs.find(x => x.key === 'save').fill, 'var(--success)', 'a saving reads as a warning');
  assert.ok(sp.legend.some(l => l.ink === 'var(--success)'));
  const sh = card(v, 'shadow');
  assert.ok(sh.all.filter(r => r.act === 'Set policy').every(r => r.segs[0].fill === 'var(--warning)'), 'no policy is at risk');
  assert.ok(card(v, 'newdest').all.every(r => r.segs[0].fill === 'var(--warning)'), 'a new destination with no policy is at risk');
  // The Monthly briefing's pictures too: idle ports read as peak use, public egress as the public internet.
  for (const view of VIEWS) for (const p of PERSONAS) {
    for (const rv of vals(ins(view, { persona: p, insPanel: 'brief' })).roleVisuals) {
      for (const r of rv.rows) assert.doesNotMatch(r.fill, /--viz-[34]\)/, `${view} ${p} briefing ${rv.key} ${r.label}: ${r.fill}`);
    }
  }
});

test('Add a port lands on an order that names the connection and the port; Attach names its region', () => {
  const c = mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', persona: 'neteng' });
  const cap = card(vals(c), 'capacity');
  const i = cap.rows.findIndex(r => r.act === 'Add a port');
  assert.ok(i >= 0, 'mature offers Add a port');
  const row = cap.rows[i];
  row.actGo();
  // The connect flow, the way Connect > Recommended's "Add a port to ..." starts it:
  // the region in the order, and the banner says what and why.
  const st = c.state;
  assert.equal(st.screen, 's4');
  const f0 = CF.flowOf(st.compose, ESTATES.mature);
  assert.deepEqual(f0.regions, [row.label]);
  // And that it is a second port beside the connection it relieves (third round, 2026-09-30).
  assert.equal(f0.note, `Add a port to ${row.label}: it peaks at 84% of 2 × 10 Gbps. This order adds a 10 Gbps port beside the Direct Connect.`);
  // Your actions' Architect row is the same move, so it lands the same way.
  const a = mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role', persona: 'architect' });
  const port = vals(a).roleActAll.find(x => x.doorLabel === 'Add a port');
  assert.ok(port, 'the Architect has Add a port in Your actions');
  port.door();
  assert.equal(a.state.screen, 's4');
  assert.equal(CF.flowOf(a.state.compose, ESTATES.mature).note, f0.note);
  // Attach starts the connect flow with the region in it, and the banner says so.
  const b = ins('partial', { persona: 'architect' });
  const tk = card(vals(b), 'talkers');
  const at = tk.rows.find(r => r.act === 'Attach');
  at.actGo();
  assert.equal(b.state.screen, 's4');
  const f = CF.flowOf(b.state.compose, ESTATES.partial);
  assert.deepEqual(f.regions, [at.label]);
  assert.match(f.note, new RegExp(`^Attach ${at.label}`));
});

test('Cloud-to-cloud agrees with the cross-cloud finding it links', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { persona: 'architect' }));
    const m = card(v, 'multi');
    const cross = v.findAll.find(f => f.key === 'crosscloud');
    const pub = m.all.filter(r => /public internet/.test(r.sub));
    if (cross) assert.ok(pub.length > 0, `${view}: "${m.head}", yet "${cross.head}"`);
  }
  assert.equal(card(vals(ins('mature')), 'multi').head, '2 of 3 on AT&T');
});

test('Latency over SLO follows the one rule Health uses: 20 ms on AT&T, 100 ms outside, and a spike over it', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view));
    const x = card(v, 'slo');
    const all = x.all;
    const o = observe(ESTATES[view], [], null);
    const want = o.flows.filter(f => F.healthOf(f.latency, f.controlled ? F.SLO_PRIVATE : F.SLO) === 'slo').map(f => f.id).sort();
    assert.deepEqual(all.filter(r => r.id).map(r => r.id).sort(), want, `${view}: the flows over their path's SLO`);
    // A region over its SLO is a Health problem too (w2 second pass, 2026-09-30); its flows are the card's rows, so only spikes add one.
    const pc = ins(view); let pv = vals(pc); const probAll = [...pv.problemRows];
    while (pv.probPager.many && pv.probPager.nextOp === 1) { pv.probPager.next(); pv = vals(pc); probAll.push(...pv.problemRows); }
    const spikes = probAll.filter(p => /^an-(?!link-|sat-|slo-)/.test(p.key) && p.state === 'slo').map(p => p.key).sort();
    assert.deepEqual(all.filter(r => !r.id).map(r => r.key).sort(), spikes, `${view}: a spike Health calls Over SLO is on the card`);
    assert.doesNotMatch(x.head, /100 ms/, `${view}: "${x.head}" applies one flat SLO`);
    for (const r of all) assert.equal(r.segs[0].fill, F.HEALTH_INK.slo);
    if (all.length) assert.match(x.legend[0].label, /Over SLO/);
  }
  const m = card(vals(ins('mature')), 'slo');
  assert.ok(m.all.some(r => /Azure westeurope/.test(r.sub)), 'westeurope runs 21 ms on AT&T against 20');
  const p = card(vals(ins('partial')), 'slo');
  assert.ok(p.all.some(r => /AWS eu-west-1/.test(r.sub)), 'eu-west-1 is Over SLO on Health and missing here');
  // What the count opens is what the rows show: the regions over SLO and the spikes.
  const c = ins('partial'); const pc = card(vals(c), 'slo'); pc.finds.go();
  const keys = vals(c).insightRows.map(r => r.key).sort();
  assert.deepEqual(keys, ['an-eu-west-1', 'degraded']);
});

test('the Architect owns the coverage and topology findings, and every role\'s lead cards open its own work', () => {
  const ARCH = 'Cloud & Platform Architect';
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const all = vals(ins(view)).findAll;
    for (const k of ['onecloud', 'single', 'nothub', 'crosscloud']) { const f = all.find(x => x.key === k); if (f) assert.equal(f.persona, ARCH, `${view} ${k}`); }
  }
  assert.equal(FOUND_SOURCES.Oracle.finding.persona, ARCH, 'the Oracle regions discovery finds are coverage');
  const PNAME = { architect: ARCH, neteng: 'Network Engineering', security: 'Security & Compliance', finops: 'FinOps & SRE' };
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const p of Object.keys(PNAME)) {
      const v = vals(ins(view, { persona: p }));
      // The persona's own three, where they lead. An empty one gives its place to the
      // next card in the persona's order (Small's Capacity for the Architect: Spend).
      const own = SG.orderOf(p).slice(0, SG.LEAD_N);
      for (const x of v.sigCards.slice(0, SG.LEAD_N).filter(x => own.includes(x.key))) {
        const hit = SG.findsOf(x.key, SG.lensOf(p), {});
        for (const f of v.findAll.filter(f => hit(f.key) && !/^an-/.test(f.key))) assert.equal(f.persona, PNAME[p], `${view} ${p} ${x.key}: ${f.key} is ${f.persona}'s`);
      }
    }
  }
  // Each role's Your actions is its own findings, the Architect's too.
  const a = vals(ins('partial', { persona: 'architect', insPanel: 'role' }));
  assert.ok(a.roleActAll.some(r => r.key === 'crosscloud') && a.roleActAll.some(r => r.key === 'single'));
});

test('the presenter\'s notes say Insights lands on Signals', () => {
  const notes = readFileSync(new URL('../docs/demo-2026-10-05-notes.md', import.meta.url), 'utf8');
  const s7 = notes.slice(notes.indexOf('## 7.'), notes.indexOf('## 8.'));
  assert.match(s7, /lands on \*\*Signals\*\*/);
  assert.doesNotMatch(s7, /lands on \*\*Your actions\*\*/);
});

test('a Down connection gets the same move on Capacity as on Health: Trace, never Add a port', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(ins(view));
    const down = card(v, 'capacity').all.filter(r => /^Down/.test(r.sub));
    assert.ok(down.length, `${view} has a Down connection`);
    for (const r of down) {
      assert.equal(r.act, 'Trace', `${view} ${r.label}`);
      assert.doesNotMatch(r.sub, /full|would hold/, `${view} ${r.label}: "${r.sub}" plans capacity on a link that is down`);
      const h = card(v, 'health').all.find(x => x.region === r.region && x.segs[0].fill === F.HEALTH_INK.down);
      assert.equal(h && h.act, 'Trace');
      const c = ins(view); card(vals(c), 'capacity').all.find(x => x.key === r.key).actGo();
      assert.equal(c.state.obPanel, 'paths'); assert.ok(c.state.pathSel, `${view} ${r.label}: Trace picked no path`);
    }
  }
});

test('with nothing on AT&T, no card offers Steer: the first step is Attach', () => {
  for (const p of PERSONAS) {
    const v = vals(ins('small', { persona: p }));
    for (const x of v.sigAll) for (const r of x.all) assert.notEqual(r.act, 'Steer', `small ${p} ${x.key} ${r.label}`);
  }
  const c = ins('small', { persona: 'architect' });
  const m = card(vals(c), 'multi').rows[0];
  assert.equal(m.act, 'Attach');
  m.actGo();
  assert.equal(c.state.screen, 's4');
  assert.ok(CF.flowOf(c.state.compose, ESTATES.small).regions.length === 1);
  // Where AT&T carries something, a public flow can still be steered.
  assert.ok(card(vals(ins('partial')), 'multi').rows.some(r => r.act === 'Steer'));
});

test('an empty card never leads', () => {
  assert.deepEqual(SG.orderOf('neteng', new Set(['slo', 'capacity'])).slice(0, 3), ['health', 'talkers', 'multi']);
  assert.deepEqual(SG.orderOf('neteng', new Set()), SG.orderOf('neteng'));
  for (const view of VIEWS) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p }));
    const full = v.sigAll.filter(x => !x.noRows).length;
    const lead = v.sigCards.slice(0, SG.LEAD_N);
    if (full >= SG.LEAD_N) assert.ok(lead.every(x => !x.noRows), `${view} ${p} leads with an empty ${lead.filter(x => x.noRows).map(x => x.key).join(', ')}`);
  }
});

test('Top talkers by exposure draws the exposed: public bars on their own scale, nothing for what rides AT&T', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const all = listOf(view, 'security', 'talkers');
    // A region on AT&T whose cross-cloud pair rides the public internet is exposed too (third
    // round, 2026-09-30); what rides AT&T whole reads On AT&T and draws nothing.
    const pub = all.filter(r => r.v2 !== 'On AT&T'), priv = all.filter(r => r.v2 === 'On AT&T');
    if (pub.length) assert.equal(pub[0].segs[0].w, '100.0%', `${view}: the most exposed region is not the longest bar`);
    for (const r of priv) assert.equal(r.segs.length, 0, `${view} ${r.label} rides AT&T and still draws a bar`);
  }
});

test('every Egress growth figure is a button that opens its week', () => {
  const p = panel();
  for (const [go, label] of [['sg.thenGo', 'sg.thenLabel'], ['sg.nowGo', 'sg.nowLabel']]) {
    const at = p.indexOf(`onClick="{{ ${go} }}"`);
    assert.ok(at > 0 && p.lastIndexOf('<button', at) > p.lastIndexOf('>', at - 1) - 200, `${go} is not bound to a button`);
    const tag = p.slice(p.lastIndexOf('<', at), p.indexOf('</button>', at));
    assert.ok(tag.startsWith('<button') && tag.includes(`{{ ${label} }}`), `${label} is not inside its button`);
  }
  for (const view of ['partial', 'mature']) {
    const v0 = vals(ins(view));
    const g = card(v0, 'growth');
    // The title opens the twelve weeks in place, not another series.
    const c0 = ins(view); card(vals(c0), 'growth').open();
    const w0 = vals(c0);
    assert.equal(c0.state.sigOpen, 'growth');
    assert.equal(w0.sigFocus.total, 12);
    // A week opens its own row, marked, and the row reads the card's figures.
    for (const [i, go, label] of [[11, (x) => x.nowGo(), g.nowLabel], [0, (x) => x.thenGo(), g.thenLabel], [5, (x) => x.cols[5].go(), null]]) {
      const c = ins(view); go(card(vals(c), 'growth'));
      assert.equal(c.state.sigOpen, 'growth', `${view} week ${i}`);
      const w = vals(c);
      const marked = w.sigFocus.all.filter(r => r.on);
      assert.equal(marked.length, 1, `${view} week ${i}: ${marked.length} rows marked`);
      assert.equal(marked[0].key, g.cols[i].key);
      assert.ok(w.sigFocus.rows.includes(marked[0]), `${view} week ${i}: the marked row is not on the page shown`);
      if (label) assert.ok(label.includes(marked[0].v.replace('/mo', '')), `${view}: "${label}" against the row's ${marked[0].v}`);
    }
  }
});

test('the Gbps yesterday\'s cards showed are back beside each figure', () => {
  const v = vals(ins('partial'));
  for (const r of card(v, 'talkers').rows) assert.match(r.v2, /^\d+\.\d Gbps$/, `talkers ${r.label}`);
  for (const r of card(v, 'slo').all.filter(x => x.id)) assert.match(r.v2, /^\d+\.\d Gbps$/, `latency ${r.label}`);
  for (const r of card(v, 'multi').rows) assert.match(r.v, /^\d+\.\d Gbps$/, `cloud to cloud ${r.label}`);
  const p = panel();
  for (const b of ['{{ r.v2 }}', '{{ fr.v2 }}']) {
    const at = p.indexOf(b);
    assert.ok(at > 0, `${b} is not bound`);
    assert.ok(p.lastIndexOf('<button class="sig-fig', at) > p.lastIndexOf('</button>', at), `${b} is outside the figure's button`);
  }
});
