import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, railFor } from '../naas-app.js';
import { mkC } from './harness.mjs';

if (typeof globalThis.window === 'undefined') {
  globalThis.window = { scrollTo: () => {}, scrollY: 0 };
}

const at = (view, patch = {}) => vals(mkC({ screen: 's3', tab: 'connect', view, estateParam: null, ...patch }));
const linksOf = (v) => v.railGroups.filter(g => g.hasTitle).flatMap(g => g.items.map(i => i.label));
const titlesOf = (v) => v.railGroups.filter(g => g.hasTitle).map(g => g.title);

// ---- the shape holds in every state ----

test('no category offers more than three links, in any state', () => {
  for (const view of ['empty', 'small', 'partial', 'mature']) {
    for (const g of at(view).railGroups.filter(x => x.hasTitle)) {
      assert.ok(g.items.length <= 3, `${view}/${g.title} offers ${g.items.length}`);
    }
  }
});

test('nothing is named twice anywhere in the rail', () => {
  for (const view of ['empty', 'small', 'partial', 'mature']) {
    const l = linksOf(at(view));
    assert.equal(new Set(l).size, l.length, `${view} repeats a link: ${l.join(', ')}`);
  }
});

// ---- the new customer gets a sequence, not a grid ----

test('a customer with nothing connected is given steps, not stops', () => {
  const v = at('empty');
  assert.equal(v.railIsSequence, true, 'the empty estate still gets the five-stop rail');
  assert.deepEqual(titlesOf(v), ['Get connected']);
});

test('no step is offered before it can act', () => {
  const v = at('empty');
  for (const g of v.railGroups.filter(x => x.hasTitle)) {
    for (const i of g.items) assert.equal(i.ready, true, `${i.label} is offered but cannot act`);
  }
});

test('the first step is the only step until it is done', () => {
  assert.deepEqual(linksOf(at('empty')), ['Sources']);
});

test('reading the estate opens the next steps', () => {
  const l = linksOf(at('small'));
  assert.ok(l.includes('Estate'), 'a scanned estate cannot be looked at');
  assert.ok(l.includes('Options'), 'a scanned estate offers no way to connect');
});

// ---- the returning customer gets the five stops ----

test('a customer with something on AT&T gets the five stops', () => {
  const v = at('mature');
  assert.equal(v.railIsSequence, false);
  assert.deepEqual(titlesOf(v), ['Discover', 'Connect', 'Observe', 'Govern', 'Cost']);
});

test('what needs you has one home, not four', () => {
  const v = at('mature');
  assert.equal(v.needsYouLabel !== undefined, true, 'there is no single answer to "does anything need me"');
  const l = linksOf(v);
  assert.equal(l.filter(x => /new|changed/i.test(x)).length, 0, 'what changed is still filed under a category');
});

test('exposed is a filter on the estate, not a destination', () => {
  assert.equal(linksOf(at('mature')).includes('Exposed'), false);
  assert.equal(typeof at('mature').estateExposedGo, 'function', 'there is no way to filter the estate to what is exposed');
});

test('records are named once', () => {
  const l = linksOf(at('mature'));
  // Micah, 2026-09-28: "not records! logs!" The flow records are called Logs, once.
  assert.equal(l.filter(x => /record|evidence|^logs$/i.test(x)).length, 1, `logs appear ${l.filter(x => /record|evidence|^logs$/i.test(x)).length} times`);
  assert.ok(l.includes('Logs'));
});

// ---- railFor is pure, so the rule is testable without a component ----

test('the rail is chosen by what is connected, not by which page you are on', () => {
  assert.equal(railFor({ attachedRegions: 0, regions: 0 }).sequence, true);
  assert.equal(railFor({ attachedRegions: 0, regions: 2 }).sequence, true);
  assert.equal(railFor({ attachedRegions: 5, regions: 12 }).sequence, false);
});

// ---- one icon per link (notes, 2026-09-30) ----
// "Estate and under Connect - Options are same icons ... for Insight- ... currently
// show ? which is same as under top right corner Help and resource."
import { existsSync } from 'node:fs';
const iconsOf = (v) => v.railGroups.flatMap(g => g.items.map(i => ({ label: i.label, icon: i.icon.split('/').pop() })));

test('no two rail links share an icon, and none borrows a header icon', () => {
  for (const view of ['empty', 'small', 'partial', 'mature']) {
    const icons = iconsOf(at(view));
    const names = icons.map(i => i.icon);
    assert.equal(new Set(names).size, names.length, `${view}: ${icons.map(i => i.label + '=' + i.icon).join(', ')}`);
    for (const i of icons) assert.ok(!['question-circle.svg', 'bell.svg'].includes(i.icon), `${view}/${i.label} uses ${i.icon}`);
  }
});

test('Insights is a lightbulb, Spend a bill, Options a cable, Orders a shopping bag', () => {
  const icons = Object.fromEntries(iconsOf(at('partial')).map(i => [i.label, i.icon]));
  assert.equal(icons.Insights, 'lightbulb.svg');
  assert.equal(icons.Spend, 'bill.svg');
  assert.equal(icons.Options, 'cable.svg');
  assert.equal(icons.Orders, 'shopping-bag.svg');
});

test('every rail icon exists in all four theme folders', () => {
  for (const view of ['empty', 'small', 'partial', 'mature']) {
    for (const { label, icon } of iconsOf(at(view))) {
      for (const dir of ['icons-light', 'icons-dark', 'icons-link', 'icons-linkdark']) {
        assert.ok(existsSync(new URL(`../brand/${dir}/${icon}`, import.meta.url)), `${view}/${label}: brand/${dir}/${icon}`);
      }
    }
  }
});
