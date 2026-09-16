import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import { connections } from '../naas-connections.js';
import { buildMap, leftRoots, rightRoots, childrenOf } from '../naas-flowmap.js';
import { gauges, queue, panelFor } from '../naas-observe-dash.js';

const est = D.ESTATES.mature; const inv = A.inventory(est); const ob = A.observe(est, [], inv); const flows = ob.flows;
const conns = connections(est, ob); const hp = R.health(est, ob, []);
const map = buildMap(est, inv, flows, {});
const ctx = { est, inv, flows, map, conns };

test('gauges: one ring per connection with used against purchased', () => { const g = gauges(conns); assert.equal(g.length, conns.total); assert.match(g[0].dash, /^\d+(\.\d+)? \d+(\.\d+)?$/); assert.equal(g[0].state, 'Degraded'); });
test('queue: degraded first, then saturating, blind, over SLO, each with one action', () => {
  const q = queue(est, ob, conns, hp); assert.equal(q[0].state, 'Degraded'); assert.ok(q.some(r => r.state === 'Saturating') && q.some(r => r.state === 'Blind'));
  assert.ok(q.every(r => r.action && r.actionLabel && r.where));
});
test('panel for a connection: overview, impact, records, actions', () => {
  const p = panelFor('cx-eu-central-1', ctx); assert.equal(p.kind, 'connection'); assert.ok(p.overview.length >= 6); assert.equal(p.impact.kind, 'possible'); assert.ok(p.records.length >= 1); assert.ok(p.actions.length >= 2);
});
// The tag band and the egress-class destinations came off the map on
// 2026-09-11, so the old tag -> region -> vpc -> subnet -> workload assertions
// were testing a path nobody can click. This walks what the map now produces,
// on both columns, and insists every node the map draws opens a panel.
test('every node the map draws resolves to a panel, both columns, all the way down', () => {
  const sd = leftRoots(est, flows).find(x => x.cls === 'sdwan');
  const metro = childrenOf(sd, est, inv, flows)[0];
  const site = childrenOf(metro, est, inv, flows)[0];
  const circuit = childrenOf(site, est, inv, flows)[0];
  const cloud = rightRoots(est, flows).find(x => x.kind === 'cloud');
  const endpoint = childrenOf(cloud, est, inv, flows)[0];
  const inet = rightRoots(est, flows).find(x => x.key === 'dest:public internet');
  const m = buildMap(est, inv, flows, { open: [sd.key, metro.key, site.key, cloud.key, inet.key] });
  const seen = [];
  for (const node of [sd, metro, site, circuit, cloud, endpoint, inet]) {
    const p = panelFor(node.key, { ...ctx, map: m });
    assert.ok(p, `no panel for ${node.kind} ${node.key}`);
    assert.ok(p.overview && p.overview.length >= 4, `${node.kind} panel is thin`);
    assert.ok(p.trail && p.trail.length >= 1, `${node.kind} panel has no trail`);
    seen.push(p.kind);
  }
  // The trail has to deepen as you descend, or the panel is describing the
  // wrong node.
  const depths = [sd, metro, site, circuit].map(n => panelFor(n.key, { ...ctx, map: m }).trail.length);
  assert.deepEqual(depths, [1, 2, 3, 4], `left-column trail depths were ${depths}`);
  assert.deepEqual(seen.slice(0, 4), ['site', 'metro', 'site', 'circuit']);
});
test('panel for nothing is null', () => { assert.equal(panelFor(null, ctx), null); assert.equal(panelFor('nope', ctx), null); });
test('panel describes an opened node from its trail', () => {
  // Roots are keyed by first mile now (site:sdwan), not building class.
  const root = leftRoots(est, flows)[0].key;
  const m = buildMap(est, inv, flows, { open: [root] });
  const p = panelFor(root, { ...ctx, map: m }); assert.ok(p); assert.equal(p.kind, 'site'); assert.ok(p.overview.some(x => x[0] === 'Opened'));
});
import { findSite, sitePanel } from '../naas-observe-dash.js';
import * as S from '../naas-sites.js';
test('an ATM has a detail: identity, access, paths with hops, what it talks to, actions', () => {
  const trust = D.ESTATES.trust; const tinv = A.inventory(trust); const tob = A.observe(trust, [], tinv);
  const atmMetro = S.siteTree(trust).find(c => c.cls === 'Edge').children[0]; const atm = S.metroSites(atmMetro)[10];
  const site = findSite(trust, atm.id); assert.ok(site); assert.equal(site.cls, 'Edge'); assert.deepEqual(site.trail.slice(0, 2), ['Edge devices', atmMetro.name]);
  const p = sitePanel(atm.id, { est: trust, inv: tinv, flows: tob.flows }); assert.equal(p.kind, 'site'); assert.ok(p.overview.some(x => x[0] === 'First mile')); assert.ok(p.paths.length >= 1); assert.match(p.paths[0].via, /PoP/); assert.ok(p.talks.length >= 1); assert.ok(p.actions.some(a => /Attach|second path/.test(a.label)));
  const named = sitePanel('Ashburn DC', { est, inv, flows }); assert.ok(named); assert.equal(named.trail.length, 3);
  const viaPanel = panelFor('asset:' + atm.id, { est: trust, inv: tinv, flows: tob.flows, map: buildMap(trust, tinv, tob.flows, {}), conns: connections(trust, tob) }); assert.equal(viaPanel.kind, 'site');
});
