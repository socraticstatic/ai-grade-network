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
    const flap = SCH.hhmm(now - 22 * MIN);
    // Incidents come from the one list since Task 1.4 (2026-09-30).
    const q = OD.queue(OD.problems(est, conns, ob, [], [], now), now);
    assert.equal(q.find(r => r.state === 'Degraded').age, '22 min');
    assert.equal(OD.problems(est, conns, ob, [], [], now).find(p => p.region === 'eastus').startedAt, now - 22 * MIN);
    // The eu-west-1 spike that checked a second incident left with the delay figures (2026-10-15); Established's
    // us-west-2 port, near full for three hours, reads the same clock.
    const m = D.ESTATES.mature, mob = A.observe(m, [], A.inventory(m));
    const mq = OD.queue(OD.problems(m, X.connections(m, mob), mob, [], [], now), now);
    assert.equal(mq.find(r => r.region === 'us-west-2').age, '3 h');
    assert.ok(!R.anomalies(est, ob, now).some(a => a.key === 'an-eu-west-1'), 'no spike event');
    assert.ok(flap);
  });
}
