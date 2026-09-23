import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { heroLayout } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The middle of the picture is the path a packet takes, left to right:
// Access, Edge, Core, Edge, Access. It replaces four horizontal product layers
// (AI Fabric, Cloud, Network services, Transport) that a packet never passes
// through. Core is singular and shared; the two sides mirror it.
const L = () => heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500 });

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

test('the band has room for five segments whether or not the facilities drill is open', () => {
  for (const fabDrill of [[], ['fab']]) {
    const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null, fabDrill }));
    for (const sg of v.segments) assert.ok(sg.w >= 90, `${sg.label} is ${sg.w}px wide`);
  }
});

// ---- stage 2: routes cross the segments ----
// Sites and regions are not paired, and they do not need to be: Core is shared.
// Every site runs Access -> Edge -> into Core. Every region runs out of Core ->
// Edge -> Access. Core is where they all meet, which is what a backbone is.

const seg = (l, label, side) => l.segments.find(s => s.label === label && s.side === side);

test('every private site crosses Access and Edge and stops at Core', () => {
  const l = L();
  const core = seg(l, 'Core', 'core');
  const sites = l.sites.filter(s => s.priv && !s.ghost);
  assert.ok(sites.length > 0);
  for (const s of sites) {
    const legs = l.legs.filter(g => g.site === s.name);
    assert.deepEqual(legs.map(g => g.seg), ['Access', 'Edge'], `${s.name} legs`);
    assert.equal(legs[1].x + legs[1].w, core.x, `${s.name} does not reach Core`);
  }
});

test('every private region leaves Core and crosses Edge and Access', () => {
  const l = L();
  const core = seg(l, 'Core', 'core');
  for (const r of l.regions.filter(r => r.priv && !r.ghost && !r.rollup)) {
    const legs = l.legs.filter(g => g.region === r.region);
    assert.deepEqual(legs.map(g => g.seg), ['Edge', 'Access'], `${r.region} legs`);
    assert.equal(legs[0].x, core.x + core.w, `${r.region} does not leave from Core`);
  }
});

test('a public site or region never enters the segments', () => {
  const l = L();
  for (const s of l.sites.filter(s => !s.priv)) assert.equal(l.legs.some(g => g.site === s.name), false, s.name);
  for (const r of l.regions.filter(r => !r.priv)) assert.equal(l.legs.some(g => g.region === r.region), false, r.region);
});

// NetBond is Edge, and it is AT&T's. DX and ER are the hyperscaler's edge.
// Equinix is a third party. The cloud's own port is the right-hand Access.
test('the right-hand Edge belongs to whoever runs the on-ramp', () => {
  const l = L();
  const edgeOf = (region) => l.legs.find(g => g.region === region && g.seg === 'Edge');
  assert.equal(edgeOf('us-east-1').owner, 'att');     // NetBond
  assert.equal(edgeOf('us-central1').owner, 'att');   // NetBond
  assert.equal(edgeOf('us-west-2').owner, 'cloud');   // DX
  assert.equal(edgeOf('eastus').owner, 'cloud');      // ER
  assert.equal(edgeOf('us-east-04').owner, 'third');  // EQX
});

test('the on-ramp is named inside the Edge segment it belongs to', () => {
  const l = L();
  const edge = seg(l, 'Edge', 'cloud');
  const leg = l.legs.find(g => g.region === 'us-east-1' && g.seg === 'Edge');
  assert.equal(leg.label, 'NetBond');
  assert.ok(leg.x >= edge.x && leg.x + leg.w <= edge.x + edge.w, 'NetBond is drawn outside the Edge segment');
});


test('an all-AT&T site path stays on the AT&T track into Core', () => {
  const l = L();
  assert.deepEqual(l.bends.filter(b => b.site === 'Ashburn DC'), []);
  assert.equal(l.handoffs, undefined, 'the handoff dots are back beside the bends');
});

// The owner style carried a `label` field and was spread after the leg, so
// every chip read "AT&T" or "Cloud" instead of NetBond or DX. Pinned.
test('the chip on an Edge leg names the on-ramp, not its owner', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  const chip = (region) => v.legs.find(g => g.region === region && g.seg === 'Edge').label;
  assert.equal(chip('us-east-1'), 'NetBond');
  assert.equal(chip('us-west-2'), 'DX');
  assert.equal(chip('eastus'), 'ER');
  assert.equal(chip('us-east-04'), 'EQX');
});

// Third party and "fair" were both amber, side by side in one legend: one
// colour, two meanings. Ownership colours must not reuse a lens colour.
test('no ownership colour is also a lens colour', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  const owners = new Set(v.ownerKey.map(o => o.stroke));
  for (const lens of ['var(--success)', 'var(--warning)', 'var(--error)']) assert.equal(owners.has(lens), false, `${lens} means two things`);
});

// ---- lanes: each segment has an AT&T track and a not-AT&T track ----
// A route runs on the track of whoever owns that segment and bends where the
// owner changes. The bend is the handoff, and where the line drops shows how far
// AT&T stays accountable. Replaces the handoff dots.

test('a leg runs on the AT&T track only where AT&T owns it', () => {
  const l = L();
  for (const g of l.legs) assert.equal(g.track, g.owner === 'att' ? 'att' : 'other', `${g.site || g.region} ${g.seg}`);
});

test('the not-AT&T track sits below the AT&T track on the same row', () => {
  const l = L();
  // NetBond: AT&T on the Edge, the AWS port on Access. Same row, two tracks.
  const edge = l.legs.find(g => g.region === 'us-east-1' && g.seg === 'Edge');
  const port = l.legs.find(g => g.region === 'us-east-1' && g.seg === 'Access');
  assert.equal(edge.track, 'att');
  assert.ok(port.y > edge.y, 'the not-AT&T leg is not below the AT&T leg');
});

test('a route bends exactly where its owner changes, at the segment boundary', () => {
  const l = L();
  const bendsOf = (region) => l.bends.filter(b => b.region === region).map(b => b.between);
  assert.deepEqual(bendsOf('us-east-1'), [['Edge', 'Access']]);            // NetBond: AT&T to the cloud port
  assert.deepEqual(bendsOf('us-west-2'), [['Core', 'Edge']]);              // DX: hands off at the edge
  const edge = l.segments.find(s => s.label === 'Edge' && s.side === 'cloud');
  assert.equal(l.bends.find(b => b.region === 'us-west-2').x, edge.x, 'the DX bend is not on the Core/Edge boundary');
});

test('a bend is a curve from one track to the other, not a straight line', () => {
  const b = L().bends.find(x => x.region === 'us-west-2');
  assert.match(b.d, /^M[\d.]+,[\d.]+ C/, 'a bend is not drawn as a curve');
  assert.notEqual(b.y1, b.y2, 'a bend that does not change height is not a bend');
});

test('the Equinix path bends into the third party and out to the cloud', () => {
  const l = L();
  assert.deepEqual(l.bends.filter(b => b.region === 'us-east-04').map(b => b.between), [['Core', 'Edge']]);
  // Equinix and CoreWeave are both not-AT&T: one track, so only one bend.
});

test('the wire out to the cloud leaves from where the last leg ended', () => {
  const l = L();
  for (const e of l.edges.filter(x => x.kind === 'egress' && x.priv && !x.viaLane && x.region)) {
    const last = l.legs.filter(g => g.region === e.region.region).pop();
    if (last) assert.equal(e.y1, last.y, `${e.region.region} jogs at the band edge`);
  }
});
