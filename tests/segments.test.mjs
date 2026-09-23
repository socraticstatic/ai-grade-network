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
