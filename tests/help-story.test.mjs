import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Help & Resources as a story (2026-10-13, Micah: "Each page should be its own gorgeous, extremely beautiful story, with
// calls to action on each"; "less words, and more visualizations, animations and icons"). The verdict: what help is at
// hand, guides, terms and Andi, each a glyph and a number and a door. The evidence: the guides as cards with their marks,
// a figure from this estate where the guide has one, and their three steps as a strip. The moves: open a guide, ask
// Andi, search. The search box stays the one it was (Micah: "don't invent a new ui for filtering/searching").

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S9 = HTML.slice(HTML.indexOf('<sc-if value="{{ sS9 }}"'), HTML.indexOf('<sc-if value="{{ sS7 }}"'));
const help = (view = 'partial', patch = {}) => mkC({ view, screen: 's9', estateParam: null, ...patch });
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));

test('the verdict is what help is at hand: guides, terms and Andi, as glyph and number, each a door', () => {
  const c = help();
  const v = vals(c);
  assert.deepEqual(v.helpVerdict.map(x => x.key), ['guides', 'terms', 'andi']);
  const [g, t, a] = v.helpVerdict;
  assert.equal(g.n, v.helpGuides.length);
  assert.equal(t.n, v.helpTerms.length);
  assert.equal(a.n, v.helpAsks.length);
  for (const x of v.helpVerdict) { assert.ok(x.label && x.title && typeof x.go === 'function', x.key); assert.ok(x.hasMark || onDisk(x.icon), `${x.key}: ${x.icon} is not on disk`); }
  // Guides and terms are the page's two views: their figures switch them, and say which is on.
  assert.equal(g.on, true); assert.equal(t.on, false);
  t.go(); assert.equal(c.state.helpPanel, 'terms');
  assert.equal(vals(c).helpVerdict[1].on, true);
  g.go(); assert.equal(c.state.helpPanel, 'start');
  a.go(); assert.equal(c.state.andiOpen, true);
});

test('the search narrows the figures as it narrows the lists', () => {
  const c = help();
  vals(c).setHelpQ({ target: { value: 'ipsec' } });
  const v = vals(c);
  assert.equal(v.helpVerdict[0].n, v.helpGuides.length);
  assert.equal(v.helpVerdict[1].n, v.helpTerms.length);
  assert.ok(v.helpVerdict[1].n >= 1 && v.helpVerdict[1].n < 14);
});

test('each guide is a card: its mark, a figure from this estate where it has one, its steps as a strip, one move', () => {
  for (const view of ['partial', 'mature', 'trust', 'small', 'empty']) {
    const g = vals(help(view)).helpGuides;
    assert.ok(g.length >= 2, view);
    for (const x of g) {
      assert.ok(onDisk(x.icon), `${view} ${x.key}: ${x.icon}`);
      assert.equal(x.steps.length, 3, `${view} ${x.key}`);
      for (const st of x.steps) {
        assert.ok(st.label && st.short && st.short.length <= 12, `${view} ${x.key}: "${st.short}" is not a station word`);
        assert.ok(onDisk(st.icon), `${view} ${x.key}: step glyph ${st.icon}`);
      }
      assert.ok(x.cta && typeof x.go === 'function', `${view} ${x.key}`);
      if (x.fig.has) { assert.ok(x.fig.n > 0 && x.fig.unit && onDisk(x.fig.icon) && x.fig.title, `${view} ${x.key}: a figure with no glyph or word`); assert.equal(typeof x.fig.go, 'function'); }
    }
    assert.equal(g.filter(x => x.primary).length, 1, `${view}: one filled move among the guides`);
  }
  const ip = vals(help()).helpGuides.find(x => x.key === 'ipsec');
  assert.deepEqual([ip.fig.has, ip.fig.n, ip.fig.icon], [true, 5, 'large-building'], 'the IPsec guide counts the sites it moves');
});

test('resources are doors with their glyphs; the ones with nothing behind them fold into one chip', () => {
  const v = vals(help());
  for (const r of v.helpLive) { assert.ok(onDisk(r.icon) && typeof r.go === 'function' && r.title, r.title); }
  const tk = v.helpLive.find(x => x.key === 'tickets');
  assert.equal(tk.n, v.opsFacts.openN, 'Support Tickets counts the open tickets Operations lists');
  assert.equal(tk.hasN, true);
  assert.equal(v.helpSoonN, 3);
  assert.match(v.helpSoonLine, /^Coming soon: Knowledge Base · Video Tutorials · Documentation$/);
});

test('the glossary leads every term with its glyph, and asks Andi for the rest', () => {
  const v = vals(help('partial', { helpPanel: 'terms' }));
  for (const t of v.helpTerms) assert.ok(onDisk(t.icon), `${t.term}: ${t.icon}`);
  assert.equal(new Set(v.helpTerms.map(t => t.icon)).size >= 10, true, 'one glyph per idea, not one for all');
});

test('the Help markup keeps its one search box, binds the story, and has no purple', () => {
  assert.match(S9, /<input value="\{\{ helpQ \}\}" onChange="\{\{ setHelpQ \}\}" placeholder="Search guides and terms" aria-label="Search help"/);
  assert.equal((S9.match(/<input\b/g) || []).length, 1, 'one search box, no second filter');
  for (const b of ['list="{{ helpVerdict }}"', 'list="{{ helpGuides }}"', 'list="{{ hg.steps }}"', '{{ askAndiHelp }}', 'list="{{ helpAsks }}"', 'list="{{ helpLive }}"']) assert.ok(S9.includes(b), `${b} is not bound on Help`);
  assert.match(S9, /role="tab"/, 'the two views are still tabs');
  assert.ok(!/helpSoonBg|helpSoonInk|#8f2199|#e2a6ee|rgba\(175,41,187|rgba\(209,143,224/.test(S9), 'purple is gone from Help');
  const v = vals(help());
  assert.ok(!('helpSoonBg' in v) && !('helpSoonInk' in v), 'the purple inks left the values too');
});
