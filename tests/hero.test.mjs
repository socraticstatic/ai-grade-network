import test from 'node:test';
import assert from 'node:assert/strict';
import { heroLayout } from '../naas-logic.js';

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
