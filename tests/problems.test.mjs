import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as SCH from '../naas-schedule.js';
import { appsOf } from '../naas-apps.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// One incident list (notes, 2026-09-30, Task 1.4): "Open problems (ranked by
// apps affected): Azure eastus | ExpressRoute | BGP flapping | Cloud provider |
// 14 apps | Started 02:14 · 1 route change at 02:11". Growing showed 2
// incidents on Home, 9 alerts in Observe and 12 findings, from three lists.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const MIN = 60000;
const NOW = Date.parse('2026-10-05T15:00:00Z');
const probsOf = (view) => {
  const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv), conns = X.connections(est, ob);
  const act = OD.activityOf(est, { conns, now: NOW });
  return OD.problems(est, conns, ob, appsOf(est, inv, ob.flows), OD.changes(est, conns, act, NOW), NOW);
};
const obs = (patch = {}) => vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch }));

test('Alerts, the Home hero and the findings events count one list', () => {
  assert.equal(obs().queueCount, '2');
  assert.equal(vals(mkC({ view: 'partial', estateParam: null, screen: 's0' })).healthIncidents.length, 2);
  const v = obs({ obPage: 'insights', insPanel: 'findings', findFilter: 'all' });
  const keys = new Set(probsOf('partial').map(p => p.key));
  assert.deepEqual(v.findAll.filter(r => keys.has(r.key)).map(r => r.key).sort(), [...keys].sort(), 'every problem is a finding event');
});

test('Growing: the first problem is the eastus flap, owned by the cloud provider', () => {
  const p = probsOf('partial')[0];
  assert.equal(p.where, 'Azure eastus');
  assert.equal(p.thing, 'ExpressRoute');
  assert.match(p.what, /BGP flapping/);
  assert.equal(p.ownerLabel, 'Cloud provider');
  assert.equal(p.state, 'down');
  assert.ok(p.apps.includes('finance'), p.apps.join(', '));
  assert.equal(p.startedAt, NOW - 22 * MIN);
  assert.equal(p.change.text, '1 route change');
  assert.equal(p.change.at, p.startedAt - 3 * MIN);
});

test('Blind regions are not alerts; they stay the blindspots finding', () => {
  const v = obs({ obPage: 'insights', insPanel: 'findings', findFilter: 'all' });
  assert.ok(!v.queueRows.some(q => /Blind|Over SLO/.test(q.state)), v.queueRows.map(q => q.state).join(', '));
  assert.ok(v.findAll.some(r => r.key === 'blindspots'));
});

test('the head counts the flap and keeps the savings', () => {
  assert.equal(obs().pageVerdict, '13 findings open. $41,500/mo potential savings.');
});

test('the head reads the whole estate under a Traffic pick', () => {
  assert.equal(obs({ obDim: 'cloud', obScope: 'cloud:GCP' }).pageVerdict, obs().pageVerdict);
});

test('ranked by apps affected, then severity', () => {
  const m = probsOf('mature');
  assert.equal(m[0].region, 'us-west-2', m.map(p => `${p.region}:${p.apps.length}`).join(' '));
  assert.ok(m.findIndex(p => p.region === 'us-west-2') < m.findIndex(p => p.region === 'eu-central-1'));
  assert.equal(probsOf('trust')[0].region, 'us-east-2');
  for (const view of ['partial', 'mature', 'trust']) {
    const ps = probsOf(view);
    for (let i = 1; i < ps.length; i++) assert.ok(ps[i - 1].apps.length >= ps[i].apps.length, view);
  }
});

test('no problem row prints ER, DX, fabric or a literal age', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const p of probsOf(view)) {
      const text = `${p.where} ${p.thing} ${p.what} ${p.ownerLabel}`;
      assert.ok(!/\b(ER|DX|EQX)\b|fabric/i.test(text), `${view}: ${text}`);
    }
  }
  const hero = vals(mkC({ view: 'mature', estateParam: null, screen: 's0' })).healthIncidents.map(i => i.text).join(' | ');
  assert.ok(!/\b(ER|DX)\b/.test(hero), hero);
});
