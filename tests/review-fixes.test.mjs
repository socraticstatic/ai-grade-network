import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { banked, lifeFor, closedFindings } from '../naas-lifecycle.js';
import { accessRows } from '../naas-logic.js';
import { vals, defaults } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The whole-branch review of the notes build (2026-09-29): each test here
// reproduces a finding it made.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (patch = {}) => mkC({ view: 'partial', screen: 's3', tab: 'observe', obPage: 'insights', insPanel: 'findings', estateParam: null, ...patch });
const act = (c, key, label) => { c.state.fdKey = key; vals(c).fd.actions.find(a => a.label === label).go(); };

test('one clock: the view reads the day from state when it is given, so dates do not drift', () => {
  const v = vals(at({ tab: 'cost', costPanel: 'banked', nowIso: '2026-10-15T12:00:00Z' }));
  assert.match(v.bankBars[11].title, /^Oct 2026 /);
  const sep = vals(at({ nowIso: '2026-09-29T12:00:00Z' })).openFindingsN;
  assert.equal(vals(at({ nowIso: '2026-10-15T12:00:00Z' })).openFindingsN, sep + 1, 'the snooze to Oct 10 has ended');
});

test('a dismissed or resolved finding leaves every "on the table" figure, not only the Observe head', () => {
  const c = at({ nowIso: '2026-09-29T12:00:00Z' });
  act(c, 'avoidable', 'Dismiss');
  c.state.tab = 'cost';
  const v = vals(c);
  assert.match(v.pageVerdict, /^\$18,300\/mo on the table across 2 priced findings\./);
  c.state.tab = 'observe';
  // The Sankey's Could save tile is the map's own avoidable egress since 2026-09-29
  // ("the sankey widgets and the sankey graphic doesn't really match"); the head keeps the findings.
  assert.match(vals(c).pageVerdict, /\$18,300\/mo/);
  assert.equal(vals(c).rollup.find(r => r.key === 'cost').value, '$18,300/mo');
});

test('banked to date counts every month since the first attach, not the last twelve', () => {
  const t = D.ESTATES.trust;
  const closed = closedFindings(t);
  const base = t.savedMo - closed.reduce((a, f) => a + f.save, 0);
  // Jan 2025 to Sep 2026 is 21 months; c2c banks from Feb 2026 (8 months), hosted from Jun 2026 (4).
  const expected = base * 21 + 21000 * 8 + 9000 * 4;
  assert.equal(banked(t, lifeFor(t), new Date('2026-09-29T12:00:00Z')).at(-1).cumulative, expected);
});

test('the preview starts from the figure in the finding\'s own headline', () => {
  const c = at({ nowIso: '2026-09-29T12:00:00Z', fdKey: 'ipsecegress' });
  const d = vals(c).fd;
  assert.equal(d.before.money, '$8,600/mo');
  assert.equal(d.after.money, '$3,100/mo');
});

test('the evidence is the records behind this finding', () => {
  const c = at({ nowIso: '2026-09-29T12:00:00Z', fdKey: 'crosscloud' });
  const ev = vals(c).fd.evidence;
  assert.ok(ev.length >= 1 && ev.every(r => r.pattern === 'clouds'), ev.map(r => r.pattern).join(','));
  c.state.fdKey = 'ipsecegress';
  const ev2 = vals(c).fd.evidence;
  assert.ok(ev2.length >= 1 && ev2.every(r => r.pattern === 'internet' && r.path === 'outside AT&T'), ev2.map(r => r.pattern + '/' + r.path).join(','));
});

test('an event\'s "Show it on the map" opens its region', () => {
  const c = at({ nowIso: '2026-09-29T12:00:00Z' });
  const ev = vals(c).findAll.find(r => r.key.startsWith('an-') && r.key !== 'an-dest' && r.key !== 'an-egress');
  c.state.fdKey = ev.key;
  vals(c).fd.showMap();
  assert.ok(c.state.mapRegion, 'no region set');
});

test('the primary move says an order was started, not placed', () => {
  const c = at({ nowIso: '2026-09-29T12:00:00Z', fdKey: 'crosscloud' });
  const label = vals(c).fd.primary.label;
  vals(c).fd.primary.go();
  const ev = c.state.findingLife.partial.crosscloud.events.at(-1);
  assert.equal(ev.note, `Started an order: ${label}`);
});

test('leaving the page, or switching estate, closes the finding drawer', () => {
  const c = at({ nowIso: '2026-09-29T12:00:00Z', fdKey: 'avoidable' });
  vals(c).railGroups.flatMap(g => g.items).find(i => i.label === 'Spend').go();
  assert.equal(c.state.fdKey, null);
  assert.match(HTML, /fdKey: null/);
});

test('every new state key starts in defaults and in the markup constructor', () => {
  assert.equal(defaults().prodPanel, 'get');
  assert.equal(defaults().nowIso, null);
  const ctor = HTML.slice(HTML.indexOf('constructor(p) { super(p); this.state = {'), HTML.indexOf('constructor(p) { super(p); this.state = {') + 4000);
  for (const k of ['prodPanel', 'nowIso']) assert.ok(ctor.includes(k + ':'), k);
});

test('a first mile the catalog does not name, but that is on AT&T, is not drawn outside AT&T', () => {
  const other = accessRows(D.ESTATES.mature).find(r => r.key === 'other');
  assert.ok(other, 'the Lumen off-net site');
  assert.equal(other.onAtt, other.sites.every(x => x.priv && x.accessSla !== 'third' && x.core !== 'third'));
});
