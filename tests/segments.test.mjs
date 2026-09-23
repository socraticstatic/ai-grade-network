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
const L = () => heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500 });
// The root is regions; drilled into US West, Denver and Phoenix are themselves.
const West = () => heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500, siteRows: siteDrillRows(D.ESTATES.mature, ['region:US West']).rows });

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
  // One line per region pattern at the root. A third-party core is its own route
  // (see Phoenix below); these are the lines that meet in the shared AT&T core.
  const lines = l.edges.filter(e => e.kind === 'ingress' && e.priv && !e.ghost && !e.viaLane && e.site.core !== 'third').map(e => e.site);
  assert.ok(lines.length > 0);
  for (const s of lines) {
    const legs = l.legs.filter(g => g.site === s.name);
    assert.deepEqual(legs.map(g => g.seg), ['Access', 'Edge'], `${s.name} legs`);
    assert.equal(legs[1].x + legs[1].w, core.x, `${s.name} does not reach Core`);
  }
});

test('every private region leaves Core and crosses Edge and Access', () => {
  const l = L();
  const core = seg(l, 'Core', 'core');
  for (const r of l.regions.filter(r => r.priv && !r.ghost && !r.rollup)) {
    const legs = l.legs.filter(g => g.region === r.region && g.side === 'cloud');
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
    const last = l.legs.filter(g => g.region === e.region.region && g.side === 'cloud').pop();
    if (last) assert.equal(e.y1, last.y, `${e.region.region} jogs at the band edge`);
  }
});

// ---- Lumen: a real mixed-carrier estate ----
// Lumen sells its own private cloud on-ramps (Cloud Connect, and since April
// 2026 AWS Interconnect - last mile) and hands off to other carriers over ENNI.
// AT&T bought Lumen's mass-market fiber, not its enterprise network, so in an
// enterprise estate Lumen is a separate carrier. Two scenarios, side by side.

test('Denver: a Lumen last mile handed onto AT&T at the Edge', () => {
  const l = West();
  const legs = l.legs.filter(g => g.site === 'Denver branch');
  assert.deepEqual(legs.map(g => [g.seg, g.owner]), [['Access', 'third'], ['Edge', 'att']]);
  assert.deepEqual(l.bends.filter(b => b.site === 'Denver branch').map(b => b.between), [['Access', 'Edge']], 'the ENNI handoff is not drawn');
});

test('Phoenix: Lumen end to end never touches AT&T, core included', () => {
  const legs = West().legs.filter(g => g.site === 'Phoenix DC');
  assert.deepEqual(legs.map(g => g.seg), ['Access', 'Edge', 'Core', 'Edge', 'Access']);
  assert.equal(legs.some(g => g.owner === 'att'), false, 'a Lumen path is drawn on AT&T');
  assert.equal(legs.find(g => g.seg === 'Core').owner, 'third');
  assert.equal(legs.find(g => g.seg === 'Edge' && g.label).label, 'Lumen');
});

test('Phoenix runs to the region Lumen reaches, so its line bends through Core', () => {
  const l = West();
  const core = l.legs.find(g => g.site === 'Phoenix DC' && g.seg === 'Core');
  assert.match(core.d, / C/, 'the Lumen core leg is straight, so it cannot reach another row');
  const target = l.regions.find(r => r.region === 'us-west-2');
  const out = l.edges.find(e => e.lumen && e.site && e.site.name === 'Phoenix DC');
  assert.ok(out, 'nothing carries Phoenix from the band to its cloud');
  assert.equal(out.y2, target.cy, 'Phoenix does not land on us-west-2');
});

test('every leg is a path, straight or curved, so one loop draws them all', () => {
  for (const g of L().legs) assert.match(g.d, /^M[\d.]+,[\d.]+ [LC]/, `${g.site || g.region} ${g.seg}`);
});

test('a site arrives on the track its first leg runs on', () => {
  const l = L();
  for (const e of l.edges.filter(x => x.kind === 'ingress' && x.site && !x.viaLane)) {
    const first = l.legs.find(g => g.site === e.site.name);
    if (first) assert.equal(e.y2, first.y, `${e.site.name} jogs at the band edge`);
  }
});

test('the Lumen story is on the first screen: US West carries all three paths', () => {
  const l = L();
  const west = l.edges.filter(e => e.kind === 'ingress' && e.site && e.site.region === 'US West').map(e => e.site.name);
  assert.deepEqual(west, ['US West · att', 'US West · third>att', 'US West · third>third']);
  const lumen = l.legs.filter(g => g.site === 'US West · third>third');
  assert.equal(lumen.some(g => g.owner === 'att'), false, 'the Lumen end-to-end line touches AT&T');
});

test('drilled into US West, both Lumen sites are themselves', () => {
  const names = West().sites.map(s => s.name);
  assert.ok(names.includes('Denver branch') && names.includes('Phoenix DC'), names.join(', '));
});

// Nine sites are taller than the band. Clamping each separately piled every site
// below the band's floor onto one pixel, so Denver and Phoenix entered on top of
// each other. Two routes must never enter the band at the same height.
test('no two sites enter the band at the same height, on any estate', () => {
  for (const k of ['small', 'partial', 'mature', 'trust']) {
    const ys = heroLayout(D.ESTATES[k], { bandX: 300, bandW: 500 }).edges.filter(e => e.kind === 'ingress' && !e.viaLane && !e.ghost).map(e => e.y2);
    assert.equal(new Set(ys).size, ys.length, `${k}: sites share an entry: ${ys.join(', ')}`);
  }
});

test('a site column that fits the band is not re-spaced', () => {
  const l = heroLayout(D.ESTATES.partial, { bandX: 300, bandW: 500 });
  for (const e of l.edges.filter(x => x.kind === 'ingress' && !x.viaLane && !x.ghost && x.site && !x.site.core)) {
    const first = l.legs.find(g => g.site === e.site.name);
    const onTrack = first && first.track === 'other' ? 14 : 0;
    assert.equal(e.y2 - onTrack, Math.round(Math.min(l.bandY + l.bandH - 24, Math.max(l.bandY + 24, e.y1))), `${e.site.name} moved`);
  }
});

test('no route runs through a segment label', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect', view: 'mature', estateParam: null }));
  const labelBottom = v.segments[0].labelY + 16;
  const topEntry = Math.min(...v.legs.map(g => g.y));
  assert.ok(topEntry > labelBottom, `a route at y ${topEntry} runs under labels ending at ${labelBottom}`);
});
