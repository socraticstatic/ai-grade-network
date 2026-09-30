import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as SCH from '../naas-schedule.js';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';

// One clock (notes, 2026-09-30, Task 1.1). Findings ran on s.nowIso, the
// discovery schedule on Date.now(), and incidents printed "22 min" and
// "02:14 today" as literals, so a Monday demo at 10:00 would show "22 min"
// beside "02:14".

const MIN = 60000;
const est = D.ESTATES.partial;
const ob = A.observe(est, [], A.inventory(est));
const conns = X.connections(est, ob);

test('nowOf reads the pinned clock when there is one, the real one when not', () => {
  assert.equal(SCH.nowOf({ nowIso: '2026-10-05T15:00:00Z' }), Date.parse('2026-10-05T15:00:00Z'));
  const t = SCH.nowOf({ nowIso: null });
  assert.ok(Math.abs(t - Date.now()) < 1000);
});

test('hhmm prints Dallas time; agoOf prints the age in the fewest words', () => {
  assert.equal(SCH.hhmm(Date.parse('2026-10-05T15:00:00Z')), '10:00');
  assert.equal(SCH.hhmm(Date.parse('2026-10-06T05:05:00Z')), '00:05');
  const now = Date.parse('2026-10-05T15:00:00Z');
  assert.equal(SCH.agoOf(now - 22 * MIN, now), '22 min');
  assert.equal(SCH.agoOf(now - 180 * MIN, now), '3 h');
  assert.equal(SCH.agoOf(now - 2 * 1440 * MIN, now), '2 d');
  assert.equal(SCH.startOf('flap', now, 22), now - 22 * MIN);
});

test('no literal ages or clock times remain in the incident copy', () => {
  const root = new URL('../', import.meta.url);
  for (const f of readdirSync(root).filter(x => /^naas-.*\.js$/.test(x))) {
    const src = readFileSync(new URL(f, root), 'utf8');
    for (const lit of ["'22 min'", "age: '3 h'", '02:14 today', '· 22 min']) assert.ok(!src.includes(lit), `${f} still says ${lit}`);
  }
  const app = readFileSync(new URL('naas-app.js', root), 'utf8');
  assert.ok(!/Date\.now\(\)/.test(app), 'naas-app.js reads Date.now() instead of the one clock');
});

for (const iso of ['2026-10-05T15:00:00Z', '2026-10-06T02:00:00Z']) {
  test(`incident times hold at ${iso}`, () => {
    const now = Date.parse(iso);
    const flap = SCH.hhmm(now - 22 * MIN), spike = SCH.hhmm(now - 47 * MIN);
    const q = OD.queue(est, ob, conns, null, now);
    assert.equal(q.find(r => r.state === 'Degraded').age, '22 min');
    const inc = R.health(est, ob, [], now).incidents;
    assert.match(inc.find(i => i.region === 'eastus').text, /· 22 min ·/);
    assert.match(inc.find(i => i.region === 'eu-west-1').text, /· 47 min ·/);
    const an = R.anomalies(est, ob, now).find(a => a.key === 'an-eu-west-1');
    assert.equal(an.when, `Started ${spike} · 47 min`);
    assert.ok(flap && spike);
  });
}
