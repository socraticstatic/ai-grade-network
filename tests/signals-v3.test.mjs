import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as SG from '../naas-signals.js';
import * as LC from '../naas-lifecycle.js';
import * as CF from '../naas-connect-flow.js';
import { ESTATES, FOUND_SOURCES } from '../naas-data.js';
import { observe } from '../naas-addendum.js';
import { mkC } from './harness.mjs';

// Signals, third round (skeptic's verdict on b541af5, 2026-09-30). Each test
// names what it pins: Top talkers that gave all public egress to the public
// regions while the cards beside it billed cross-cloud and GCP; the Architect's
// findings owned by Network Eng; Steer on a pair with nothing on AT&T; a head
// that said 12 weeks over labels that say 11; --viz-1 meaning Covered and On
// AT&T; two lists called Latency over SLO; two moves for one connection; and
// lead cards that open another role's work.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', ...patch });
const card = (v, k) => v.sigAll.find(x => x.key === k);
const listOf = (view, persona, k) => vals(ins(view, { persona, sigOpen: k })).sigFocus.all;
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const PERSONAS = ['architect', 'neteng', 'security', 'finops', 'exec'];
const g1 = (s) => +(/([\d.]+) Gbps/.exec(s) || [])[1];
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
// The public Gbps every flow outside AT&T carries, as observe() counts it.
const pubOf = (view) => observe(ESTATES[view], [], null).flows.filter(f => !f.controlled).reduce((a, f) => a + f.gbps, 0);
const thisWeek = (v) => card(v, 'growth').all.find(r => r.label === 'This week');

test('Egress growth\'s this week is the public Gbps the flows carry, to the tenth', () => {
  for (const view of VIEWS) {
    const w = thisWeek(vals(ins(view, { persona: 'finops' })));
    assert.equal(w.v2, `public ${pubOf(view).toFixed(1)} Gbps`, `${view}: this week reads "${w.v2}"`);
  }
});

test('FinOps\' Top talkers by egress shares what Egress growth counts, cross-cloud included, and names every cloud a bucket bills public', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { persona: 'finops' }));
    const t = card(v, 'talkers'), all = listOf(view, 'finops', 'talkers');
    const pub = all.filter(r => /% of public$/.test(r.v2));
    const sum = pub.reduce((a, r) => a + g1(r.v), 0);
    const week = g1(thisWeek(v).v2);
    assert.equal(sum.toFixed(1), week.toFixed(1), `${view}: the rows add up to ${sum.toFixed(1)} Gbps against Growth's ${week}`);
    const pcts = pub.reduce((a, r) => a + parseInt(r.v2, 10), 0);
    if (pub.length) assert.equal(pcts, 100, `${view}: the shares add up to ${pcts}%`);
    // Its head is Growth's this week: the same dollars and the same Gbps, never a region count the dollars are not split by.
    const pubMo = v.buckets.filter(b => b.today > b.fabric).reduce((a, b) => a + b.today, 0);
    assert.ok(t.head.includes(`${week.toFixed(1)} Gbps`), `${view}: "${t.head}" against ${week} Gbps`);
    if (pubMo) assert.ok(t.head.includes(`${fmt(pubMo)}/mo`), `${view}: "${t.head}"`);
    assert.doesNotMatch(t.head, /\d+ regions?\b/, `${view}: "${t.head}" puts the buckets' dollars on regions`);
    // A pair Cloud-to-cloud calls public is public egress here, at its first end.
    for (const m of card(v, 'multi').all.filter(r => /public internet/.test(r.sub))) {
      const r = pub.find(x => x.region === m.region);
      assert.ok(r, `${view}: ${m.label} rides the public internet, yet ${m.region} carries no public egress here`);
    }
    // Every cloud a bucket still bills above the AT&T rate has a row that says so.
    for (const b of v.buckets.filter(x => x.today > x.fabric)) {
      const rows = all.filter(r => r.label.startsWith(b.cloud + ' ') && (/% of public$/.test(r.v2) || /bills public/.test(r.sub)));
      assert.ok(rows.length, `${view}: ${b.name} bills ${b.cloud} egress public, and no ${b.cloud} row says so`);
    }
  }
  // Bank scale: GCP us-central1 is on AT&T, and its GPU inference bucket still bills public.
  const gcp = listOf('trust', 'finops', 'talkers').find(r => r.label === 'GCP us-central1');
  assert.match(gcp.sub, /GPU inference egress bills public/);
  assert.equal(gcp.act, 'Optimize');
});

test('Top talkers by exposure counts the public traffic Coverage counts, cross-cloud included', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { persona: 'security' }));
    const t = card(v, 'talkers'), all = listOf(view, 'security', 'talkers');
    const exposed = all.filter(r => r.segs.length);
    const sum = exposed.reduce((a, r) => a + g1(r.v), 0);
    // Each row's share is of the exposed, so they add up to the whole of it (7.3 Gbps read 5% and 3.2 read 2% beside a head of 8%).
    if (exposed.length) assert.equal(exposed.reduce((a, r) => a + parseInt(r.v2, 10), 0), 100, `${view}: ${exposed.map(r => r.v2).join(' + ')}`);
    for (const r of exposed) assert.match(r.v2, /% of public$/);
    assert.equal(sum.toFixed(1), pubOf(view).toFixed(1), `${view}: the exposed rows add up to ${sum.toFixed(1)} Gbps`);
    const cov = +/(\d+)% of traffic/.exec(card(vals(ins(view, { persona: 'architect' })), 'talkers').head)[1];
    if (sum > 0) assert.ok(t.head.includes(`${100 - cov}% of traffic`), `${view}: "${t.head}" against Coverage's ${cov}% on AT&T`);
    for (const m of card(v, 'multi').all.filter(r => /public internet/.test(r.sub))) {
      assert.ok(exposed.some(x => x.region === m.region), `${view}: ${m.label} rides the public internet, yet ${m.region} is not exposed`);
    }
  }
  // Established: us-west-2 is on Direct Connect, and its pair to us-central1 is public.
  const w2 = listOf('mature', 'security', 'talkers').find(r => r.label === 'AWS us-west-2');
  assert.equal(w2.v, '3.2 Gbps');
  assert.equal(w2.act, 'Set policy');
});

test('Egress growth\'s head counts the weeks its labels count: 11 from the first column to this one', () => {
  for (const view of VIEWS) {
    const g = card(vals(ins(view, { persona: 'finops' })), 'growth');
    assert.match(g.thenLabel, /11 weeks ago/);
    assert.doesNotMatch(g.head, /12 weeks/, `${view}: "${g.head}" over "${g.thenLabel}"`);
    if (/in \d+ weeks/.test(g.head)) assert.match(g.head, /in 11 weeks/, view);
  }
});

test('Steer only where one end of the flow is on AT&T; otherwise the move is Attach', () => {
  for (const view of VIEWS) {
    const est = ESTATES[view], ob = observe(est, [], null);
    const onAtt = (name) => { const r = est.regionsList.find(x => `${x.cloud} ${x.region}` === name); return !!(r && r.priv); };
    const endsOf = (f) => (f.kind === 'App' ? [f.region] : f.name.split(' ↔ '));
    for (const p of PERSONAS) {
      const v = vals(ins(view, { persona: p }));
      for (const k of ['multi', 'slo']) for (const r of card(v, k).all.filter(x => x.id)) {
        const f = ob.flows.find(x => x.id === r.id);
        if (f.controlled) continue;
        const want = endsOf(f).some(onAtt) ? 'Steer' : 'Attach';
        assert.equal(r.act, want, `${view} ${p} ${k} ${r.label} (${f.name})`);
      }
    }
  }
  const c = ins('partial', { persona: 'architect' });
  const pair = card(vals(c), 'multi').all.find(r => r.label === 'us-west-2 ↔ us-central1');
  assert.equal(pair.act, 'Attach');
  pair.actGo();
  assert.equal(c.state.screen, 's4');
  assert.deepEqual(CF.flowOf(c.state.compose, ESTATES.partial).regions, ['AWS us-west-2']);
  assert.ok(!(c.state.steered || []).length, 'nothing was put on AT&T');
});

test('a finding the Architect owns reads the Architect as its owner, in the table and the drawer', () => {
  const ARCH = 'Cloud & Platform Architect';
  const now = new Date('2026-09-29T12:00:00Z');
  for (const view of VIEWS) {
    const est = ESTATES[view], life = LC.lifeFor(est);
    for (const f of est.findings.filter(x => x.persona === ARCH)) assert.match(LC.lifeOf(f, life, now).owner, /^Architect · /, `${view} ${f.kind}`);
    for (const r of vals(ins(view, { persona: 'architect' })).findAll.filter(x => x.persona === ARCH)) assert.match(r.owner, /^Architect · /, `${view} ${r.key}: ${r.owner}`);
  }
  const o = FOUND_SOURCES.Oracle.finding;
  assert.match(LC.lifeOf(o, LC.lifeFor({ findings: [o] }), now).owner, /^Architect · /);
  // Growing, the Architect: Cloud-to-cloud's count opens the cross-cloud finding, and its drawer.
  const c = ins('partial', { persona: 'architect' });
  card(vals(c), 'multi').finds.go();
  const rows = vals(c).insightRows;
  assert.deepEqual(rows.map(r => r.key), ['crosscloud']);
  assert.match(rows[0].owner, /^Architect · /);
  rows[0].open();
  assert.match(vals(c).fd.meta, /^Architect · /);
});

test('one colour, one meaning across every Signals card and the role visuals', () => {
  // The meaning each ink carries, as the legends say it.
  const MEANS = { 'var(--viz-1)': /AT&T/, 'var(--viz-6)': /public/i, 'var(--warning)': /no policy|above 80|at risk/i, 'var(--success)': /save/i, 'var(--viz-5)': /over slo/i, 'var(--viz-2)': /peak use/i, 'var(--error)': /down/i };
  for (const view of VIEWS) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p }));
    for (const x of v.sigAll) {
      const inks = new Set(x.legend.map(l => l.ink));
      for (const l of x.legend) {
        assert.ok(MEANS[l.ink], `${view} ${x.key}: ${l.ink} ("${l.label}") means nothing elsewhere`);
        assert.match(l.label, MEANS[l.ink], `${view} ${x.key}: ${l.ink} reads "${l.label}" here`);
      }
      for (const r of x.all) for (const sg of r.segs) assert.ok(inks.has(sg.fill), `${view} ${p} ${x.key} ${r.label}: ${sg.fill} has no key on its card`);
    }
    for (const rv of vals(ins(view, { persona: p, insPanel: 'role' })).roleVisuals) {
      for (const r of rv.rows) assert.ok(MEANS[r.fill], `${view} ${p} ${rv.key} ${r.label}: ${r.fill}`);
      if (rv.key === 'shadow') for (const r of rv.rows) assert.equal(r.fill, 'var(--warning)', `${view} ${r.label}: "${rv.sub}" and covered`);
    }
  }
  // Established, Security: zoom.us and github.com are covered, and draw no On AT&T blue.
  const sh = listOf('mature', 'security', 'shadow');
  for (const n of ['zoom.us', 'github.com']) assert.ok(sh.find(r => r.label === n).segs.every(s => s.fill !== 'var(--viz-1)'), n);
});

test('Latency over SLO is one list on Signals and in Your actions', () => {
  for (const view of VIEWS) {
    const sig = card(vals(ins(view, { persona: 'neteng' })), 'slo');
    const rv = vals(ins(view, { persona: 'neteng', insPanel: 'role' })).roleVisuals.find(x => x.key === 'slo');
    if (!sig.all.length) { assert.ok(!rv, `${view}: Your actions draws a list Signals calls empty`); continue; }
    assert.ok(rv, `${view}: Signals lists ${sig.all.length} and Your actions none`);
    assert.deepEqual(rv.rows.map(r => [r.label, r.v]), sig.all.slice(0, rv.rows.length).map(r => [r.label, r.v]), view);
    assert.equal(rv.rows.length, Math.min(4, sig.all.length));
  }
  // Growing: the eu-west-1 spike leads both.
  const rv = vals(ins('partial', { persona: 'neteng', insPanel: 'role' })).roleVisuals.find(x => x.key === 'slo');
  assert.equal(rv.rows[0].label, 'Latency spike');
  assert.equal(rv.rows[0].v, '136 ms');
});

test('one connection, one move: Health and Capacity offer the same for it', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { persona: 'neteng' }));
    const cap = card(v, 'capacity').all;
    for (const h of card(v, 'health').all.filter(x => /^an-(link|sat)-/.test(x.key))) {
      const c = cap.find(x => x.region === h.region);
      assert.ok(c, `${view} ${h.label}: Health lists it, Capacity does not`);
      assert.equal(h.act, c.act, `${view} ${h.label}: Health offers ${h.act}, Capacity ${c.act}`);
    }
  }
  // Established: us-west-2 near full is Add a port on both, and both land on the same order.
  const a = ins('mature', { persona: 'neteng' }), b = ins('mature', { persona: 'neteng' });
  card(vals(a), 'health').all.find(x => x.key === 'an-sat-us-west-2').actGo();
  card(vals(b), 'capacity').all.find(x => x.region === 'us-west-2').actGo();
  assert.equal(a.state.screen, 's4');
  assert.deepEqual(CF.flowOf(a.state.compose, ESTATES.mature), CF.flowOf(b.state.compose, ESTATES.mature));
});

test('a lead card opens only its own role\'s work', () => {
  const PNAME = { architect: 'Cloud & Platform Architect', neteng: 'Network Engineering', security: 'Security & Compliance', finops: 'FinOps & SRE' };
  for (const view of VIEWS) for (const p of Object.keys(PNAME)) {
    for (const x of vals(ins(view, { persona: p })).sigCards.slice(0, SG.LEAD_N)) {
      if (!x.finds.n) continue;
      const c = ins(view, { persona: p });
      vals(c).sigCards.find(y => y.key === x.key).finds.go();
      const rows = vals(c).insightRows;
      assert.equal(rows.length, x.finds.n, `${view} ${p} ${x.key}`);
      for (const r of rows) assert.equal(r.persona, PNAME[p], `${view} ${p} leads with ${x.key}, which opens ${r.key}, ${r.pFor}`);
    }
  }
});

test('Add a port orders the port: its size chosen, beside the connection it relieves', () => {
  const c = ins('mature', { persona: 'neteng' });
  const row = card(vals(c), 'capacity').all.find(r => r.act === 'Add a port');
  row.actGo();
  const f = CF.flowOf(c.state.compose, ESTATES.mature);
  assert.equal(f.bandwidth, '10 Gbps', 'the 10 Gbps port is not chosen');
  assert.equal(f.from.bandwidth, 'estate');
  assert.match(f.note, /beside the Direct Connect/, `"${f.note}" never says it is a second connection`);
});

test('the presenter\'s notes call the rail entry Recommended', () => {
  const notes = readFileSync(new URL('../docs/demo-2026-10-05-notes.md', import.meta.url), 'utf8');
  assert.doesNotMatch(notes, /Rail: \*\*Options\*\*/);
  const s7 = notes.slice(notes.indexOf('## 7.'), notes.indexOf('## 8.'));
  assert.doesNotMatch(s7, /\*\*Steer\*\* on the westeurope/, 'westeurope is not on AT&T: its move is Attach');
});
