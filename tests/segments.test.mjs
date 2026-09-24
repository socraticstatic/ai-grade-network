import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { heroLayout } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { siteDrillRows } from '../naas-connections.js';
import { mkC } from './harness.mjs';

// The middle of the picture is the path a packet takes, left to right:
// Access, Edge, Core, Edge, Access. It replaces four horizontal product layers
// (AI Fabric, Cloud, Network services, Transport) that a packet never passes
// through. Core is singular and shared; the two sides mirror it.
// The right column's first level is providers (tests/cloud-cards.test.mjs); these
// read the things per region, so they lay the regions out as the drill does.
const REGIONS = D.ESTATES.mature.regionsList;
const L = () => heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500, regionRows: REGIONS });
// The left root is regions; drilled into US West, Denver and Phoenix are themselves.
const West = () => heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500, regionRows: REGIONS, siteRows: siteDrillRows(D.ESTATES.mature, ['region:US West']).rows });

test('the middle is five segments, in path order', () => {
  assert.deepEqual(L().segments.map(s => s.label), ['Access', 'Edge', 'Core', 'Edge', 'Access']);
});

test('the segments tile the band exactly, with no gap and no overlap', () => {
  const l = L();
  const s = l.segments;
  assert.equal(s[0].x, l.bandX, 'the first segment does not start at the band');
  for (let i = 1; i < s.length; i++) assert.equal(s[i].x, s[i - 1].x + s[i - 1].w, `a gap or overlap before ${s[i].label}`);
  const last = s[s.length - 1];
  assert.equal(last.x + last.w, l.bandX + l.bandW, 'the last segment does not end at the band');
});

test('each side is the mirror of the other around Core', () => {
  const s = L().segments;
  assert.equal(s[0].side, 'site');
  assert.equal(s[1].side, 'site');
  assert.equal(s[2].side, 'core');
  assert.equal(s[3].side, 'cloud');
  assert.equal(s[4].side, 'cloud');
  assert.equal(s[0].w, s[4].w, 'the two Access segments differ in width');
  assert.equal(s[1].w, s[3].w, 'the two Edge segments differ in width');
});

test('the picture draws the segments, not the four product layers', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  assert.equal(v.segments.length, 5);
  assert.equal(v.strata, undefined, 'the four product layers still reach the picture');
});

test('unfolded, the band has room for five segments whether or not the facilities drill is open', () => {
  for (const fabDrill of [[], ['fab']]) {
    const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null, fabDrill, bandUnfolded: true }));
    for (const sg of v.segments) assert.ok(sg.w >= 90, `${sg.label} is ${sg.w}px wide`);
  }
});

test('the band starts folded, and a click on a folded side unfolds it, and back', () => {
  const c = mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null });
  let v = vals(c);
  assert.equal(v.segments[0].w, 72, 'Access is not folded on arrival');
  for (const n of v.nodes.filter(x => x.seg !== 2)) assert.equal(n.op, 0, `${n.label} shows inside a folded segment`);
  v.segments[0].open();
  v = vals(c);
  assert.ok(v.segments[0].w >= 90, 'the click did not unfold Access');
  assert.ok(v.nodes.every(n => n.op === 1));
  v.segments[1].open();
  assert.equal(vals(c).segments[1].w, 72, 'a click on an open side did not fold it back');
});

// ---- things: each segment holds named things, each owned by AT&T or not ----
// A path is a chain of things, one per segment: a circuit in Access, a router or
// port in Edge, a backbone in Core, an on-ramp in the cloud's Edge, the cloud's
// own gateway in its Access. Paths that use the same thing meet at it. Sites and
// regions are still not paired: Core is shared. Replaced 2026-09-23 the two
// tracks and bends, which coloured a line by owner but never said what was in a
// segment ("On the left Access there may be specific things that are either
// AT&T or third party. That's true for all of them including core." - Micah).

const seg = (l, label, side) => l.segments.find(s => s.label === label && s.side === side);
const node = (l, id) => l.nodes.find(n => n.id === id);
const routeOf = (l, who) => l.routes.find(r => r.who === who);
const labels = (l, r) => r.nodes.map(id => node(l, id).label);
const owners = (l, r) => r.nodes.map(id => node(l, id).owner);

test('every private site runs through one thing in Access, one in Edge, and meets Core', () => {
  const l = L();
  const sites = l.routes.filter(r => r.side === 'site');
  assert.ok(sites.length > 0);
  for (const r of sites) assert.deepEqual(r.nodes.map(id => node(l, id).seg), [0, 1, 2], r.who);
});

test('every private region leaves Core through one thing in Edge and one in Access', () => {
  const l = L();
  for (const reg of l.regions.filter(x => x.priv && !x.ghost && !x.rollup)) {
    const r = routeOf(l, reg.region);
    assert.ok(r, `${reg.region} has no route`);
    assert.deepEqual(r.nodes.map(id => node(l, id).seg), [2, 3, 4], reg.region);
  }
});

test('a public site or region never enters the segments', () => {
  const l = L();
  for (const s of l.sites.filter(s => !s.priv)) assert.equal(l.routes.some(r => r.who === s.name), false, s.name);
  for (const x of l.regions.filter(x => !x.priv)) assert.equal(l.routes.some(r => r.who === x.region), false, x.region);
});

// NetBond is Edge, and it is AT&T's. DX and ER are the hyperscaler's edge.
// Equinix is a third party. The cloud's own gateway is the right-hand Access.
test('the right-hand Edge is the on-ramp, owned by whoever runs it', () => {
  const l = L();
  const edgeOf = (region) => node(l, routeOf(l, region).nodes[1]);
  assert.deepEqual([edgeOf('us-east-1').label, edgeOf('us-east-1').owner], ['NetBond', 'att']);
  assert.deepEqual([edgeOf('us-central1').label, edgeOf('us-central1').owner], ['NetBond', 'att']);
  assert.deepEqual([edgeOf('us-west-2').label, edgeOf('us-west-2').owner], ['Direct Connect', 'cloud']);
  assert.deepEqual([edgeOf('eastus').label, edgeOf('eastus').owner], ['ExpressRoute', 'cloud']);
  assert.deepEqual([edgeOf('us-east-04').label, edgeOf('us-east-04').owner], ['Equinix Fabric', 'third']);
});

test('the right-hand Access is the cloud\'s own gateway, one per cloud', () => {
  const l = L();
  const accessOf = (region) => node(l, routeOf(l, region).nodes[2]);
  assert.equal(accessOf('us-east-1').label, 'AWS gateway');
  assert.equal(accessOf('us-east-1').id, accessOf('us-west-2').id, 'two AWS regions use two AWS gateways');
  assert.equal(accessOf('eastus').label, 'Azure gateway');
  for (const r of ['us-east-1', 'eastus', 'us-central1']) assert.equal(accessOf(r).owner, 'cloud');
});

test('paths that use the same thing meet at it', () => {
  const l = L();
  // Both NetBond regions hand off at one NetBond; every AT&T-core route meets one backbone.
  assert.equal(routeOf(l, 'us-east-1').nodes[1], routeOf(l, 'us-central1').nodes[1]);
  const backbones = new Set(l.routes.filter(r => r.side !== 'path').map(r => r.side === 'site' ? r.nodes[2] : r.nodes[0]));
  assert.deepEqual([...backbones], ['c:att']);
  assert.equal(l.nodes.filter(n => n.id === 'c:att').length, 1);
});

test('each thing is drawn once, inside its segment, clear of the labels', () => {
  const l = L();
  assert.equal(new Set(l.nodes.map(n => n.id)).size, l.nodes.length, 'a thing is drawn twice');
  const labelBottom = l.bandY + 3 + 16;
  for (const n of l.nodes) {
    const sg = l.segments[n.seg];
    assert.equal(n.x, sg.x, `${n.label} is not in its segment`);
    assert.ok(n.y - 9 >= labelBottom, `${n.label} at ${n.y} sits under the segment label`);
    assert.ok(n.y + 9 <= l.bandY + l.bandH, `${n.label} falls out of the band`);
  }
});

test('no two things in one segment overlap, on any estate', () => {
  for (const k of ['small', 'partial', 'mature', 'trust']) {
    const l = heroLayout(D.ESTATES[k], { bandX: 300, bandW: 500 });
    for (let i = 0; i < 5; i++) {
      const ys = l.nodes.filter(n => n.seg === i).map(n => n.y).sort((a, b) => a - b);
      for (let j = 1; j < ys.length; j++) assert.ok(ys[j] - ys[j - 1] >= 22, `${k} segment ${i}: things at ${ys[j - 1]} and ${ys[j]} overlap`);
    }
  }
});

// Wires that share a thing fan a few pixels apart at the band's edge (all of
// them landing on one pixel read as a knot, and stacked their chips), so a wire
// meets its route where the route's first or last piece starts or ends.
test('a wire into the band meets its route, and a wire out leaves from where its route ends', () => {
  const l = L();
  const start = (d) => d.match(/^M([\d.]+),([\d.]+)/).slice(1).map(Number);
  const end = (d) => d.match(/([\d.]+),([\d.]+)$/).slice(1).map(Number);
  const piece = (k) => l.pieces.find(p => p.key === k);
  for (const e of l.edges.filter(x => x.kind === 'ingress' && x.priv && !x.viaLane && !x.ghost && x.site && !x.site.more)) {
    const r = routeOf(l, e.site.name);
    assert.deepEqual(start(piece(r.pieces[0]).d), [e.x2, e.y2], `${e.site.name} lands off its route`);
    assert.ok(Math.abs(e.y2 - node(l, r.nodes[0]).y) <= 10, `${e.site.name} lands far from its circuit`);
  }
  for (const e of l.edges.filter(x => x.kind === 'egress' && x.priv && !x.viaLane && x.region)) {
    const r = routeOf(l, e.region.region);
    if (r) assert.deepEqual(end(piece(r.pieces[r.pieces.length - 1]).d), [e.x1, e.y1], `${e.region.region} leaves off its route`);
  }
});

test('wires that share a thing never leave the band on the same pixel', () => {
  const l = L();
  const outs = l.edges.filter(x => x.kind === 'egress' && x.priv && !x.viaLane && x.region).map(e => e.y1);
  assert.equal(new Set(outs).size, outs.length, `egress wires share a start: ${outs.join(', ')}`);
});

test('a route is one continuous line: each piece starts where the last one ended', () => {
  const l = L();
  const start = (d) => d.match(/^M([\d.]+),([\d.]+)/).slice(1).map(Number);
  const end = (d) => d.match(/([\d.]+),([\d.]+)$/).slice(1).map(Number);
  for (const r of l.routes) {
    const ps = r.pieces.map(k => l.pieces.find(p => p.key === k));
    for (let i = 1; i < ps.length; i++) assert.deepEqual(start(ps[i].d), end(ps[i - 1].d), `${r.who}: a gap between ${ps[i - 1].node} and ${ps[i].node}`);
  }
});

test('each piece is drawn in the style of the thing it belongs to', () => {
  const l = L();
  for (const p of l.pieces) assert.equal(p.owner, node(l, p.node).owner, p.key);
});

test('a handoff between things at different heights is a curve, never a step', () => {
  const l = L();
  const curved = l.pieces.filter(p => / C/.test(p.d));
  assert.ok(curved.length > 0, 'nothing changes height, so the test proves nothing');
  for (const p of l.pieces) assert.doesNotMatch(p.d, /L[\d.]+,[\d.]+ L/, `${p.key} bends with a corner`);
});

test('the view names every thing and says who answers for it', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  assert.ok(v.nodes.length > 0);
  for (const n of v.nodes) {
    assert.ok(n.label, `${n.id} has no name`);
    assert.match(n.title, /AT&T|Third party|AWS|Azure|GCP|CoreWeave|Cloud/, `${n.id}: ${n.title}`);
    assert.match(n.title, /used by/, `${n.id} does not say what uses it`);
  }
});

// Third party and "fair" were both amber, side by side in one legend: one
// colour, two meanings. Ownership colours must not reuse a lens colour.
test('no ownership colour is also a lens colour', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  const owners2 = new Set(v.ownerKey.map(o => o.stroke));
  for (const lens of ['var(--success)', 'var(--warning)', 'var(--error)']) assert.equal(owners2.has(lens), false, `${lens} means two things`);
});

// ---- Lumen: a real mixed-carrier estate ----
// Lumen sells its own private cloud on-ramps (Cloud Connect, and since April
// 2026 AWS Interconnect - last mile) and hands off to other carriers over ENNI.
// AT&T bought Lumen's mass-market fiber, not its enterprise network, so in an
// enterprise estate Lumen is a separate carrier.
//
// Owner means who holds the SLA, not whose wire it is. Found 2026-09-23: Denver's
// data said "AT&T orders Lumen's circuit and takes it over ENNI", which is an AT&T
// off-net circuit, so AT&T holds the SLA. The picture drew it as third party,
// because owner was read off the word "Lumen" in the access label.
test('a carrier name never decides who owns the Access leg; the stated SLA does', async () => {
  const { accessOwner } = await import('../naas-logic.js');
  assert.equal(accessOwner({ access: 'Lumen Ethernet' }), 'att', 'the word Lumen made a leg third party');
  assert.equal(accessOwner({ access: 'Anything', accessSla: 'third' }), 'third');
  assert.equal(accessOwner({ access: 'ABF (Business Fiber)' }), 'att');
});

test('Denver: Lumen\'s wire, ordered by AT&T, lands on AT&T\'s ENNI', () => {
  const l = West(), r = routeOf(l, 'Denver branch');
  assert.deepEqual(labels(l, r), ['Lumen off-net', 'ENNI', 'AT&T backbone']);
  assert.deepEqual(owners(l, r), ['att', 'att', 'att'], 'an off-net circuit AT&T answers for is drawn as third party');
});

test('Salt Lake: a Lumen circuit the customer bought, handed to an AT&T PE', () => {
  const l = West(), r = routeOf(l, 'Salt Lake branch');
  assert.deepEqual(labels(l, r), ['Lumen Ethernet', 'AT&T PE', 'AT&T backbone']);
  assert.deepEqual(owners(l, r), ['third', 'att', 'att']);
});

test('Phoenix: Lumen end to end, five things, none of them AT&T\'s', () => {
  const l = West(), r = routeOf(l, 'Phoenix DC');
  assert.equal(r.side, 'path');
  assert.deepEqual(labels(l, r), ['Lumen fiber', 'Lumen edge', 'Lumen core', 'Lumen on-ramp', 'AWS gateway']);
  assert.equal(owners(l, r).includes('att'), false, 'a Lumen path runs through AT&T');
});

test('Phoenix lands on the same AWS gateway as the AT&T routes, and reaches us-west-2', () => {
  const l = West();
  assert.equal(routeOf(l, 'Phoenix DC').nodes[4], routeOf(l, 'us-west-2').nodes[2]);
  const out = l.edges.find(e => e.kind === 'egress' && e.region && e.region.region === 'us-west-2');
  assert.ok(out, 'nothing carries us-west-2 out of the band');
});

test('the SLA owner survives the drill to a site\'s paths', () => {
  for (const [site, owner, label] of [['Denver branch', 'att', 'Lumen off-net'], ['Salt Lake branch', 'third', 'Lumen Ethernet']]) {
    const rows = siteDrillRows(D.ESTATES.mature, ['region:US West', site]).rows;
    const l = heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500, regionRows: REGIONS, siteRows: rows });
    const firsts = l.routes.filter(r => r.side === 'site').map(r => node(l, r.nodes[0]));
    assert.ok(firsts.length > 0, `${site}: no paths drawn`);
    for (const n of firsts) assert.deepEqual([n.label, n.owner], [label, owner], site);
  }
});

test('the root fans a region into one line per circuit it uses', () => {
  const l = L();
  const circuits = (region) => l.routes.filter(r => r.side !== 'region' && r.region === region).map(r => node(l, r.nodes[0]).label);
  assert.deepEqual(circuits('US West'), ['AVPN access', 'Lumen off-net', 'Lumen Ethernet', 'Lumen fiber']);
  assert.deepEqual(circuits('Nationwide'), ['AVPN access', 'AT&T wireless']);
});

test('drilled into US West, every Lumen site is itself', () => {
  const names = West().sites.map(s => s.name);
  for (const n of ['Denver branch', 'Salt Lake branch', 'Phoenix DC']) assert.ok(names.includes(n), `${n} missing: ${names.join(', ')}`);
});

test('a region card names the carrier it has, not a hard-coded one', () => {
  const west = L().sites.find(s => s.name === 'US West');
  assert.match(west.access, /AT&T, Lumen$/);
  const odd = { ...D.ESTATES.mature, sites: [{ name: 'X', access: 'Zayo Ethernet', accessSla: 'third', carrier: 'Zayo', priv: true, metro: 'Denver' }] };
  assert.match(heroLayout(odd, {}).sites[0].access, /Zayo$/, 'every third party was called Lumen');
});

test('Phoenix\'s access is the circuit, not the on-ramp product', () => {
  const phoenix = D.ESTATES.mature.sites.find(s => s.name === 'Phoenix DC');
  assert.doesNotMatch(phoenix.access, /Cloud Connect/, 'an Edge product is labelled as Access');
});

// Traffic runs along each route through its things, so a route is also one path.
test('a route is drawable as one path that starts where its first piece starts and ends where its last ends', () => {
  const l = L();
  for (const r of l.routes) {
    const first = l.pieces.find(p => p.key === r.pieces[0]).d, last = l.pieces.find(p => p.key === r.pieces[r.pieces.length - 1]).d;
    assert.equal(r.d.match(/^M[\d.]+,[\d.]+/)[0], first.match(/^M[\d.]+,[\d.]+/)[0], r.who);
    assert.equal(r.d.match(/[\d.]+,[\d.]+$/)[0], last.match(/[\d.]+,[\d.]+$/)[0], r.who);
    assert.equal((r.d.match(/M/g) || []).length, 1, `${r.who} lifts the pen mid-route`);
  }
});

// ---- the fold (2026-09-23): Access and Edge collapse to card edges, click unfolds ----
test('folded, Access and Edge narrow to card edges and Core takes the band', () => {
  const f = heroLayout(D.ESTATES.mature, { bandX: 320, bandW: 580, folded: true });
  const w = f.segments.map(s => s.w);
  // Thickened from 36 to 52, then 72, on 2026-09-23 ("make edge and access thicker in collapsed").
  assert.deepEqual([w[0], w[1], w[3], w[4]], [72, 72, 72, 72]);
  assert.equal(w.reduce((a, b) => a + b, 0), 580, 'the folded band does not tile');
  assert.ok(w[2] > 280, `Core is only ${w[2]} wide folded`);
});

// Folding animates: each piece keeps its key and its shape, only its numbers
// move, so the browser can ease one into the other instead of redrawing.
test('a piece keeps its key and its shape when the band folds', () => {
  const open = heroLayout(D.ESTATES.mature, { bandX: 320, bandW: 580 });
  const shut = heroLayout(D.ESTATES.mature, { bandX: 320, bandW: 580, folded: true });
  assert.deepEqual(shut.pieces.map(p => p.key).sort(), open.pieces.map(p => p.key).sort());
  const shape = (d) => d.replace(/[\d.]+/g, '#');
  for (const p of open.pieces) assert.equal(shape(shut.pieces.find(q => q.key === p.key).d), shape(p.d), p.key);
});

// "It's not spaced quite right on collapse. Balance it out" (2026-09-23): folded
// or not, the band sits centred between the site cards and the cloud column,
// and folded it narrows rather than stranding its stacks at the ends.
test('the band is centred between the columns, folded and unfolded', async () => {
  const { RX } = await import('../naas-logic.js');
  for (const bandUnfolded of [false, true]) {
    const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null, bandUnfolded }));
    const left = v.bandX - 224, right = RX - (v.bandX + v.bandW);
    assert.ok(Math.abs(left - right) <= 1, `${bandUnfolded ? 'unfolded' : 'folded'}: ${left} left, ${right} right`);
  }
  const shut = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  assert.equal(shut.bandW, 4 * 72 + 260, 'the folded band did not narrow');
  assert.equal(shut.segments[2].w, 260);
});

// "You haven't balanced out the cards in collapsed state" (2026-09-23): folded,
// the lines climbed to each thing's row inside 36-unit columns and stood up as
// walls. Folded, a line runs flat through the stacks on its backbone's row.
test('folded, every line runs flat through the Edge stacks', () => {
  const l = heroLayout(D.ESTATES.mature, { bandX: 460, bandW: 404, folded: true });
  const edges = new Set(l.nodes.filter(n => n.seg === 1 || n.seg === 3).map(n => n.id));
  const pieces = l.pieces.filter(p => edges.has(p.node));
  assert.ok(pieces.length > 0);
  for (const p of pieces) {
    const ys = [...p.d.matchAll(/[\d.]+,([\d.]+)/g)].map(m => +m[1]);
    assert.equal(new Set(ys).size, 1, `${p.key} climbs inside a folded stack: ${p.d}`);
  }
});

test('folded, the Lumen line reaches its cloud on its own wire', () => {
  const l = heroLayout(D.ESTATES.mature, { bandX: 460, bandW: 404, folded: true });
  const lumen = l.routes.find(r => r.side === 'path');
  const end = +lumen.d.match(/([\d.]+)$/)[1];
  const wire = l.edges.find(e => e.kind === 'egress' && String(e.id).startsWith('via'));
  assert.ok(wire, 'the Lumen line stops at the band edge');
  assert.equal(wire.y1, end);
});
