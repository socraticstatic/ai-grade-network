import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Model the NetBond Advanced help and information center" and "simpler, less
// paragraphs, more visuals, more actions, more help and guidance" (Micah,
// 2026-09-28). NetBond Advanced's /support page is a hero and seven resource
// cards (att-netbond-sdci HelpResourcesPage.tsx); this keeps its shape, puts
// Andi in the hero, and leads with guides built from the customer's own estate.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const help = (patch = {}) => mkC({ view: 'partial', screen: 's9', estateParam: null, ...patch });

test('a ? in the header opens Help', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null });
  vals(c).goHelp();
  assert.equal(c.state.screen, 's9');
  assert.match(HTML, /aria-label="Help and resources"/);
});

test('the guides are built from what this customer has, each with steps and one move', () => {
  const g = vals(help()).helpGuides;
  assert.ok(g.length >= 3 && g.length <= 4);
  assert.ok(g.some(x => /IPsec/.test(x.title)), g.map(x => x.title).join(' | '));
  for (const x of g) { assert.ok(x.steps.length === 3, x.title); assert.ok(x.cta && typeof x.go === 'function', x.title); assert.ok(x.title.length < 44, x.title); }
});

test('the seven NetBond resources keep their names; the ones with nothing behind them say so', () => {
  const r = vals(help()).helpResources;
  assert.deepEqual(r.map(x => x.title), ['Network Glossary', 'Support Tickets', 'Interactive Tour', 'Knowledge Base', 'Video Tutorials', 'Documentation', 'Contact Support']);
  for (const x of r) assert.ok(x.soon || typeof x.go === 'function', x.title);
  assert.ok(r.filter(x => x.soon).length >= 3);
  assert.ok(r.every(x => x.desc.length < 48), 'one line each');
  // The four with nothing behind them fold into one line (2026-09-28 review).
  const v = vals(help());
  // Support Tickets opens the Health tab's open problems since 2026-09-30.
  assert.deepEqual(v.helpLive.map(x => x.title), ['Network Glossary', 'Support Tickets', 'Interactive Tour', 'Contact Support']);
  assert.match(v.helpSoonLine, /^Coming soon: Knowledge Base · Video Tutorials · Documentation$/);
});

test('the glossary is the storefront\'s own words, one line each, and the search narrows it', () => {
  const c = help();
  const all = vals(c).helpTerms;
  for (const t of ['Access', 'Edge', 'Core', 'NetBond', 'AVPN', 'ADI', 'AIA-B', 'IPsec', 'SLO', 'Egress']) assert.ok(all.some(x => x.term === t), t);
  assert.ok(all.every(x => x.def.length < 110), 'one line each');
  vals(c).setHelpQ({ target: { value: 'ipsec' } });
  const v = vals(c);
  assert.ok(v.helpTerms.length >= 1 && v.helpTerms.length < all.length);
  assert.ok(v.helpGuides.every(x => /ipsec/i.test(x.title + x.steps.map(s => s.label).join(' '))));
});

test('the hero offers Andi and three questions that ask him', () => {
  const c = help();
  const v = vals(c);
  assert.equal(v.helpAsks.length, 3);
  v.helpAsks[0].go();
  assert.equal(c.state.andiOpen, true);
});
