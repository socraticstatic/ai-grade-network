import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { volumeList } from '../naas-volume.js';

const est = D.ESTATES.trust;
const RANK = { degraded: 0, public: 1, ok: 2 };

test('the drawer order is a total order', () => {
  const v = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { size: 588 });
  assert.equal(v.rows.length, 588);
  for (let i = 1; i < v.rows.length; i++) {
    const a = v.rows[i - 1], b = v.rows[i];
    const ka = [RANK[a.state], a.ms, a.id], kb = [RANK[b.state], b.ms, b.id];
    assert.ok(ka[0] < kb[0] || (ka[0] === kb[0] && (ka[1] < kb[1] || (ka[1] === kb[1] && ka[2] <= kb[2]))),
      `out of order at ${i}: ${a.state}/${a.ms}/${a.id} before ${b.state}/${b.ms}/${b.id}`);
  }
});

test('paging does not reshuffle the list', () => {
  const p1 = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { page: 1 });
  const p10 = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { page: 10 });
  assert.deepEqual(p10.rows.slice(0, 60).map(r => r.id), p1.rows.map(r => r.id));
});

test('the worst row really is first', () => {
  const v = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { size: 588 });
  const worst = v.rows.filter(r => r.state === 'degraded');
  assert.ok(worst.length > 0);
  assert.equal(v.rows[0].id, worst.slice().sort((a, b) => a.ms - b.ms || a.id.localeCompare(b.id))[0].id);
});
