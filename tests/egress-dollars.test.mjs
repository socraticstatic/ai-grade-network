import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Egress growth in dollars (notes, 2026-09-30, Task 2.2): "show the trend % or $
// on top of each bar or some reference number for the start and the end ... to
// show what is the impact overall from growth to $$ perspective".

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ins = (view, patch = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'signals', ...patch }));

test('Growing: the card reads in dollars, then, now and the difference', () => {
  const g = ins('partial').iw.growth;
  assert.equal(g.nowF, '$71,600');
  assert.equal(g.thenF, '$64,800');
  assert.equal(g.deltaF, '+$6,800');
  assert.match(g.subF, /^Public egress \+\$6,800\/mo in 12 weeks · \+\d+%$/);
});

test('Established: this week equals the public egress the Cost verdict counts', () => {
  const est = D.ESTATES.mature;
  const pubMo = est.buckets.filter(b => b.today > b.fabric).reduce((a, b) => a + b.today, 0);
  assert.equal(ins('mature').iw.growth.nowF, '$' + (Math.round(pubMo / 100) * 100).toLocaleString('en-US'));
});

test('a scope with no public traffic shows no public bars, no % and no dollars', () => {
  const g = ins('mature', { obDim: 'cloud', obScope: 'cloud:GCP' }).iw.growth;
  assert.equal(g.nowF, '');
  assert.equal(g.pubPctF, '');
  assert.ok(g.weeks.every(w => w.pubH === '0%'), g.weeks.map(w => w.pubH).join(' '));
});

test('the finding behind the card says what the card says', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[view], ob = A.observe(est, [], A.inventory(est));
    const an = R.anomalies(est, ob, Date.parse('2026-10-05T15:00:00Z')).find(a => a.key === 'an-egress');
    if (!an) continue;
    const g = ins(view).iw.growth;
    assert.ok(an.head.includes(g.pubPctF), `${view}: ${an.head} vs ${g.pubPctF}`);
    assert.ok(!/week over week/.test(an.head), an.head);
  }
});

test('no bar says 1 weeks; the axis ends carry the reference dollars', () => {
  const g = ins('partial').iw.growth;
  assert.ok(g.weeks.every(w => !/\b1 weeks\b/.test(w.title)));
  assert.equal(g.thenLabel, '$64,800/mo · 12 weeks ago');
  assert.equal(g.nowLabel, 'this week · $71,600/mo');
  // The nine Signals cards share one loop (2026-09-30): Egress growth's figure and axis ends are its card's.
  assert.ok(HTML.includes('{{ sg.head }}') && HTML.includes('{{ sg.thenLabel }}') && HTML.includes('{{ sg.nowLabel }}'));
  const card = ins('partial').sigAll.find(x => x.key === 'growth');
  assert.deepEqual([card.head, card.thenLabel, card.nowLabel], [g.subF, g.thenLabel, g.nowLabel]);
});
