import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import * as A from '../naas-addendum.js';
import { levelList } from '../naas-volume.js';
import { vals } from '../naas-app.js';
import { briefingFor } from '../naas-verdicts.js';
import { mkC } from './harness.mjs';

// The width and copy sweep (review round 2, 2026-09-30). scripts/fold.mjs now
// fails a page that scrolls sideways, anything past the right edge, and an em
// dash or a ramp code (ER, DX, EQX, GCI) in the words on screen. The fold only
// reads what its walk opens, so these pin the same words below the browser, on
// everything vals() hands the page, drawers and closed panels included.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const NOW = '2026-10-05T15:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const BAD = /\u2014|\b(?:ER|DX|EQX|GCI)\b/;

// Fields that hold data, never words: ids and keys (the unplaced-state bucket
// keys on a dash), the ramp code a region carries, and select option values.
const DATA = new Set(['key', 'id', 'ramp', 'value', 'cadenceValue', 'parentKey', 'stateCode']);
function badWords(o, path = '', out = [], seen = new Set()) {
  if (o == null) return out;
  if (typeof o === 'string') { if (BAD.test(o)) out.push(`${path}: ${o.slice(0, 120)}`); return out; }
  if (typeof o !== 'object' || seen.has(o)) return out;
  seen.add(o);
  if (Array.isArray(o)) o.forEach((x, i) => badWords(x, `${path}[${i}]`, out, seen));
  else for (const [k, v] of Object.entries(o)) if (!DATA.has(k) && typeof v !== 'function') badWords(v, `${path}.${k}`, out, seen);
  return out;
}

// Each estate in the states that reach the most words: Home (Andi's lead), the
// Connect page with every site class and metro open and each site's paths open,
// and a private region's chain open; Traffic; Insights > Operations on the last
// hour (nothing fixed yet); and Sources.
function statesOf(view) {
  const est = D.ESTATES[view];
  const siteOpen = {}, pathOpen = {};
  for (const cl of S.siteTree(est)) for (const m of cl.children.filter(ch => ch.kind === 'metro')) {
    siteOpen[cl.key] = true; siteOpen[m.key] = true;
    for (const x of m.sites || []) pathOpen['site:' + x.id] = true;
  }
  const rs = est.regionsList || [], region = rs.find(r => r.priv && r.ramp && r.ramp !== 'NetBond') || rs[0];
  return [
    { view, screen: 's0' },
    { view, screen: 's3', layer: 'cloud', tab: 'connect', siteOpen, pathOpen, openWorkload: region && region.region },
    { view, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf' },
    { view, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', obWindow: '1h' },
    { view, screen: 's1', discoverView: 'sources', scanStep: 4 },
  ];
}
const ctx = (st) => mkC({ estateParam: null, nowIso: NOW, ...st });

test('nothing vals() hands the page carries an em dash or a ramp code', () => {
  // One line per field, not every row and state that repeats it.
  const found = new Map();
  for (const view of ESTATES) for (const st of statesOf(view)) for (const x of badWords(vals(ctx(st)))) {
    const field = x.slice(0, x.indexOf(':')).replace(/\[\d+\]/g, '[]');
    if (!found.has(field)) found.set(field, `${view}${x}`);
  }
  assert.deepEqual([...found.values()], []);
});

test('after Add a source > Oracle > Add and scan, Sources still reads clean', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const c = ctx({ view, screen: 's1', discoverView: 'sources', scanStep: 4 });
    vals(c).openAddSource();
    c.setState({ intakeProvider: 'Oracle' });
    vals(c).addSource();
    const v = vals(c);
    assert.ok(v.sources.some(r => r.canRemove), `${view}: the added source has no Remove`);
    assert.deepEqual(badWords(v).slice(0, 3), [], view);
  }
});

test('the markup a person reads has no em dash and no ramp code', () => {
  const tpl = HTML.slice(0, HTML.indexOf('<script type="text/x-dc"'))
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const hits = [...tpl.matchAll(/.{0,40}(?:\u2014|\b(?:ER|DX|EQX|GCI)\b).{0,40}/g)].map(m => m[0]);
  assert.deepEqual(hits, []);
  // The Connection type filter in renderVals labels its chips the same way.
  const g = HTML.slice(HTML.indexOf("group: 'Connection type'"), HTML.indexOf('\n', HTML.indexOf("group: 'Connection type'")));
  assert.ok(g.length > 30, 'the Connection type group moved; find it again');
  assert.ok(!/'(?:DX|ER|EQX|GCI)'/.test(g), g);
});

test('the clouds drawer names each region\'s on-ramp', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const e = D.ESTATES[view], i = A.inventory(e), lv = levelList(e, i, A.observe(e, [], i), 'clouds', [], { flat: true });
    assert.ok(lv && lv.rows.length, view);
    const subs = lv.rows.map(r => r.sub).join(' | ');
    assert.ok(!BAD.test(subs), `${view}: ${subs}`);
  }
});

test('a cross-connect on a provider card names the on-ramp it plugs into', () => {
  // It read "into AWS null": the card carries no ramp, the region that stated the cable does.
  const xc = vals(ctx({ view: 'mature', screen: 's3', layer: 'cloud', tab: 'connect' })).xconnects.find(x => x.region === 'AWS');
  assert.ok(xc, 'the AWS card lost its cross-connect');
  assert.match(xc.title, /^Your cross-connect at Equinix SE2, Seattle, into AWS Direct Connect\. /);
});

test('the Connection type chips read product names and still filter by the ramp', () => {
  const c = ctx({ view: 'mature', screen: 's1', discoverView: 'estate', scanStep: 4 });
  const v = vals(c);
  const chips = v.estateChips.map(x => x.label);
  assert.ok(chips.includes('Direct Connect') && chips.includes('ExpressRoute'), chips.join(', '));
  const dx = D.ESTATES.mature.regionsList.filter(r => r.ramp === 'DX').map(r => r.region).sort();
  c.setState({ chips: ['Direct Connect'] });
  assert.deepEqual(vals(c).tree.map(r => r.region).sort(), dx);
});

test('an empty Paths cell is empty, and its title says why', () => {
  const v = vals(ctx({ view: 'partial', screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf' }));
  // A timed cell's title reads "Label · hops · N ms · loss ..."; an untimed one, "Label · why".
  const blanks = v.pathTimeRows.flatMap(r => r.cells).filter(c => !/ ms · loss /.test(c.title));
  assert.ok(blanks.length > 0, 'no path skips a column; the fixture changed');
  assert.deepEqual([...new Set(blanks.map(c => c.msShow))], ['']);
  assert.ok(blanks.some(c => / · Not on this path$/.test(c.title)), blanks.map(c => c.title).join(' | '));
});

test('traffic that stays in one region says so in the On AT&T column', () => {
  const v = vals(ctx({ view: 'partial', screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf' }));
  const local = v.mixRows.find(r => /one region/i.test(r.label));
  assert.ok(local, v.mixRows.map(r => r.label).join(', '));
  assert.equal(local.fabPct, 'Local');
  assert.match(local.fabNote, /neither on nor outside AT&T/);
});

test('Time to fix with nothing fixed reads None yet', () => {
  for (const view of ['partial', 'empty']) {
    const v = vals(ctx({ view, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', obWindow: '1h' }));
    const t = v.opsTiles.find(x => x.key === 'mttr');
    assert.equal(t.v, 'None yet', view);
    assert.equal(t.u, '', view);
  }
});

test('with no Sev 1 open, the ops line and the briefing say so in words', () => {
  const small = vals(ctx({ view: 'small', screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops' }));
  assert.match(small.opsLine, /^No Sev 1 is open now\. 1 ticket open\./);
  for (const view of ['partial', 'mature', 'trust']) {
    assert.match(vals(ctx({ view, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops' })).opsLine, /^1 Sev 1 open now\./, view);
  }
  const t = briefingFor('neteng', { open: 6, found: 0, resolved: 0, sev1: 0, ticketsOpen: 1, mttrF: '24h 10m', availN: 0, top: [] });
  assert.match(t, /No Sev 1 is open now; Operations has 1 ticket open, and fixes took 24h 10m on average\./);
  assert.ok(!/\b0 Sev 1\b/.test(t), t);
  assert.match(briefingFor('neteng', { open: 1, found: 0, resolved: 0, sev1: 2, ticketsOpen: 3, availN: 0, top: [] }), /Operations has 2 Sev 1 open now, 3 tickets open\./);
  for (const view of ['small', 'empty']) {
    const b = vals(ctx({ view, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'brief' })).briefText;
    assert.ok(b.includes('No Sev 1 is open now') && !/\b0 Sev 1\b/.test(b), `${view}: ${b}`);
  }
});

test('the last hour reads once: never "in the last the last hour"', () => {
  const v = vals(ctx({ view: 'partial', screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', obWindow: '1h' }));
  const text = [v.opsLine, v.fixLabel, v.fixEmpty, v.availLine, v.opsChangeEmpty, v.opsChangeLabel].join(' | ');
  assert.ok(!/the last the last/.test(text), text);
  assert.match(v.opsLine, /Nothing was fixed in the last hour\./);
  const d = vals(ctx({ view: 'partial', screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', obWindow: '30d' }));
  assert.match(d.fixLabel, /^Fixed in the last 30 days/);
});

test('the order line has no stray space before its comma or its period', () => {
  const c = ctx({ view: 'partial', screen: 's6' });
  const plain = vals(c).orderVisibleLine;
  assert.equal(plain, 'Visible on delivery: path, throughput, P95 latency, loss, egress and flow logs.');
  c.setState({ order: { title: 'Hosted', lines: [{ product: 'Hosted VPC', qty: 1, monthly: 100 }] } });
  assert.equal(vals(c).orderVisibleLine, 'Visible on delivery: path, throughput, P95 latency, loss, egress and flow logs, with inspection from the vSRX pair.');
  // The runtime wraps each {{ }} in a span; inside a flex row that span is its own
  // item, so text either side of it drew with the row's gap. The line binds alone.
  const i = HTML.indexOf('{{ orderVisibleLine }}');
  assert.ok(i > 0, 'orderVisibleLine is not bound');
  assert.ok(!HTML.includes('{{ orderInspection }}'), 'the split binding is back');
  assert.match(HTML.slice(i - 1, i + 23), /^>\{\{ orderVisibleLine \}\}<$/, 'text sits beside the binding again');
});

test('with nothing attached, Next: Observe says what is true', () => {
  const v = vals(ctx({ view: 'small', screen: 's3', layer: 'cloud', tab: 'connect' }));
  assert.equal(v.hasPageNext, true);
  const t = v.pageNext.text;
  assert.ok(!/\b0 connections\b|0\.0 Gbps|degraded/.test(t), t);
  assert.match(t, /^Nothing is attached to the AT&T network yet\. See what your 2 regions send over the public internet\.$/);
  // An estate with a degraded connection keeps the pointer to it.
  assert.match(vals(ctx({ view: 'partial', screen: 's3', layer: 'cloud', tab: 'connect' })).pageNext.text, /See which one is degraded and what it impacts\.$/);
});

test('the Sources Manage links wrap inside their column, never past the edge', () => {
  const i = HTML.indexOf('data-th="Manage"');
  const cell = HTML.slice(i, HTML.indexOf('</div>', i));
  assert.match(cell, /display:flex;flex-wrap:wrap/);
  const heads = HTML.slice(HTML.indexOf('id="sec-accounts"'), HTML.indexOf('<div class="dt-b">', HTML.indexOf('id="sec-accounts"')));
  const widths = [...heads.matchAll(/dt-th" style="width:(\d+)%">(\w[\w ]*)</g)].map(m => [m[2], +m[1]]);
  assert.equal(widths.reduce((a, [, w]) => a + w, 0), 100, JSON.stringify(widths));
  // At 1440 the table is 1,152px. Fixed layout adds each cell's 32px of padding
  // to its percentage and scales the row back to the table, so 20% is a 220px
  // cell: 188px inside, and Re-scan, Edit access and Remove need 177px with
  // their 12px gaps. Narrower than that, they wrap in place.
  assert.ok(Object.fromEntries(widths).Manage >= 20, JSON.stringify(widths));
});
