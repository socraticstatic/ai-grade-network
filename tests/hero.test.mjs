import test from 'node:test';
import assert from 'node:assert/strict';
import { heroLayout } from '../naas-logic.js';
import * as D from '../naas-data.js';

const est = { stage: 'partial', sites: [{ name: 'A', priv: true }, { name: 'B', priv: false }], regionsList: [{ cloud: 'AWS', region: 'us-east-1', wl: 10, priv: true, tags: [] }, { cloud: 'AWS', region: 'us-west-2', wl: 5, priv: false, tags: [] }], arcs: [], regionsExtra: 0 };

// These used to assert the pixel values of one particular layout, so every
// time the picture was retuned the file went red and stayed red. What the
// hero actually promises is a relationship: the lane sits below the band, and
// traffic we do not carry is routed through the lane rather than across it.
test('the lane sits beneath the band, clear of the strata', () => {
  const L = heroLayout(est, {});
  assert.ok(L.bandH > 0 && L.lane.h > 0);
  const strataBottom = Math.max(...L.strata.map(s => s.y + s.h));
  assert.ok(L.lane.y >= strataBottom, `lane ${L.lane.y} overlaps strata ending ${strataBottom}`);
  assert.ok(L.lane.y + L.lane.h <= L.H, 'lane runs off the bottom of the picture');
  assert.ok(L.lane.x + L.lane.w <= 800 + 1, 'lane runs off the right');
  assert.ok(strataBottom <= L.bandY + L.bandH, 'strata overflow the band');
});

test('public edges enter and leave through the lane; private edges use the band', () => {
  const L = heroLayout(est, {});
  const inLane = (y) => y >= L.lane.y && y <= L.lane.y + L.lane.h;
  const pubIn = L.edges.find(e => e.id === 'in1'), privIn = L.edges.find(e => e.id === 'in0');
  assert.equal(pubIn.viaLane, true);
  assert.ok(inLane(pubIn.y2), `public ingress lands at ${pubIn.y2}, outside the lane`);
  assert.equal(privIn.viaLane, false);
  assert.ok(privIn.y2 < L.lane.y, `private ingress at ${privIn.y2} dips into the lane`);
  const pubOut = L.edges.find(e => e.kind === 'egress' && !e.priv), inet = L.edges.find(e => e.internet);
  assert.ok(pubOut.viaLane && inLane(pubOut.y1), 'public egress does not leave through the lane');
  assert.ok(inet.y1 >= L.lane.y, 'internet edge does not start at the lane');
  // Nothing we carry is allowed to be routed through the lane, whatever the
  // geometry happens to be: that is the whole claim the picture makes.
  assert.ok(L.edges.filter(e => e.priv).every(e => !e.viaLane), 'a private edge was routed through the public lane');
});

test('the canvas a full estate needs does not move', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const L = heroLayout(D.ESTATES[id], {});
    assert.equal(L.W, 1392, id);
    assert.equal(L.H, 560, id);
    assert.equal(L.bandH, 396, id);
    assert.equal(L.lane.y, 440, id);
    assert.equal(L.strata[0].h, 99, id);
  }
  assert.equal(heroLayout(D.ESTATES.mature, {}).internet.y, 472);
  assert.equal(heroLayout(D.ESTATES.trust, {}).internet.y, 380);
  assert.equal(heroLayout(D.ESTATES.partial, {}).internet.y, 406);
  // Drilling must not resize the picture under the click.
  const t = D.ESTATES.trust;
  const drilled = heroLayout(t, { siteRows: t.sites.slice(0, 3), regionRows: t.regionsList.slice(0, 1) });
  assert.equal(drilled.H, 560);
  assert.equal(drilled.bandH, 396);
  assert.equal(drilled.lane.y, 440);
});

test('a small estate gets a canvas sized to it', () => {
  for (const id of ['empty', 'small']) {
    const L = heroLayout(D.ESTATES[id], {});
    assert.equal(L.H, 500, id);
    assert.equal(L.bandH, 336, id);
    assert.equal(L.lane.y, 380, id);
    assert.equal(L.internet.y, 320, id);
    assert.equal(L.strata.length, 4, id);
    assert.equal(L.strata[0].h, 84, id);
    assert.ok(L.lane.y + L.lane.h <= L.H, id);
    assert.ok(L.internet.y + 30 <= L.H, id);
    for (const s of L.sites) assert.ok(s.y >= 0 && s.y + 36 <= L.H, `${id}: site at ${s.y} leaves the canvas`);
    for (const r of L.regions) assert.ok(r.y + 28 <= L.H, `${id}: region at ${r.y} leaves the canvas`);
  }
  assert.equal(heroLayout(D.ESTATES.small, {}).sites.length, 2);
  assert.equal(heroLayout(D.ESTATES.small, {}).regions.length, 2);
});

test('zero sites and one region still lay out', () => {
  const base = D.ESTATES.small;
  const noSites = heroLayout({ ...base, sites: [] }, {});
  assert.equal(noSites.sites.length, 0);
  assert.equal(noSites.edges.filter(e => e.kind === 'ingress').length, 0);
  assert.equal(noSites.strata.length, 4);
  assert.ok(noSites.H >= noSites.lane.y + noSites.lane.h);

  const oneRegion = heroLayout({ ...base, regionsList: [base.regionsList[0]] }, {});
  assert.equal(oneRegion.regions.length, 1);
  assert.equal(oneRegion.groups.length, 1);
  assert.ok(oneRegion.internet.y > oneRegion.regions[0].y, 'the internet row rides up over the regions');
  assert.ok(oneRegion.internet.y + 30 <= oneRegion.H);

  const oneSite = heroLayout({ ...base, sites: [base.sites[0]] }, {});
  assert.equal(oneSite.sites.length, 1);
  assert.ok(oneSite.sites[0].y > 0 && oneSite.sites[0].y + 36 <= oneSite.H, 'the single site is off the canvas');
});
