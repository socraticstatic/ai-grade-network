import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as LC from '../naas-lifecycle.js';
import * as SCH from '../naas-schedule.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// One change list (notes, 2026-09-30, Task 1.3): "What changed? Config, route
// and maintenance events lined up with problems." Every User activity row was
// seeded within about 18 hours, so any window showed the same list, and there
// were no route or maintenance events at all.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const MIN = 60000, DAY = 86400000;
const NOW = Date.parse('2026-10-05T15:00:00Z');
const ctxOf = (view) => { const est = D.ESTATES[view], ob = A.observe(est, [], A.inventory(est)); return { est, conns: X.connections(est, ob) }; };
const actOf = (view, now = NOW) => { const { est, conns } = ctxOf(view); return OD.activityOf(est, { conns, runs: [], now }); };
const chOf = (view, now = NOW) => { const { est, conns } = ctxOf(view); return OD.changes(est, conns, actOf(view, now), now); };

test('config changes are User activity rows, by key', () => {
  const act = new Set(actOf('partial').map(a => a.key));
  const cfg = chOf('partial').filter(c => c.kind === 'config');
  assert.ok(cfg.length >= 3);
  for (const c of cfg) assert.ok(act.has(c.key), c.key);
});

test('each degraded link has a route change exactly 3 minutes before its problem starts', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const { conns } = ctxOf(view);
    const start = SCH.startOf('flap', NOW, SCH.INCIDENT_MIN.flap);
    for (const r of conns.rows.filter(x => x.degraded)) {
      const rc = chOf(view).find(c => c.kind === 'route' && c.region === r.region);
      assert.ok(rc, `${view}/${r.region} has no route change`);
      assert.equal(rc.at, start - 3 * MIN);
      assert.equal(rc.linedUp, 'an-link-' + r.region);
    }
  }
});

test('the windows see different histories', () => {
  const n = (days) => chOf('partial').filter(c => c.at <= NOW && c.at > NOW - days * DAY).length;
  const counts = [1, 7, 30, 90].map(n);
  assert.equal(new Set(counts).size, 4, counts.join(' / '));
});

test('maintenance only on connections AT&T holds, one done and one coming', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const { conns } = ctxOf(view);
    const mt = chOf(view).filter(c => c.kind === 'maintenance');
    const att = new Set(conns.rows.filter(r => r.terminated === 'att').map(r => r.region));
    assert.ok(mt.length, view);
    for (const m of mt) assert.ok(att.has(m.region), `${view}/${m.region} is not AT&T's`);
    assert.ok(mt.some(m => m.at > NOW) && mt.some(m => m.at < NOW), view);
  }
});

test('coming-up maintenance is always after now, at any hour', () => {
  for (const iso of ['2026-09-29T12:00:00Z', '2026-10-05T15:00:00Z', '2026-12-31T23:30:00Z']) {
    const now = Date.parse(iso);
    assert.ok(chOf('partial', now).filter(c => c.kind === 'maintenance' && c.upcoming).every(c => c.at > now), iso);
  }
});

test('no attach predates the estate\'s first attach', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const first = Date.parse(LC.FIRST_ATTACH[view] + '-01T00:00:00Z');
    const att = actOf(view).filter(a => a.verb === 'Attached to the AT&T network');
    assert.ok(att.length, view);
    for (const a of att) assert.ok(a.at >= first && a.at <= NOW, `${view}: ${a.target} at ${new Date(a.at).toISOString()}`);
  }
});

test('User activity reads the same list', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'observe', obPage: 'logs', logTab: 'activity', nowIso: '2026-10-05T15:00:00Z' }));
  const verbs = new Set(actOf('partial').map(a => a.verb));
  assert.ok(v.actRows.length && v.actRows.every(r => verbs.has(r.verb) || r.verb === 'Ran re-discovery' || r.verb === 'Steered a flow'), v.actRows.map(r => r.verb).join(', '));
  assert.ok(v.actRows.some(r => /d ago$/.test(r.when)), 'history reaches back days, not only hours');
});
