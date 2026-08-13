import { describe, test, expect } from 'vitest';
import { WIDGET_REGISTRY, DEFAULT_LAYOUT, widgetsForSurface, type Surface } from './registry';

describe('default layouts', () => {
  test.each(['naas', 'ai'] as Surface[])('every %s default widget exists and is valid for the surface', (surface) => {
    const valid = new Set(widgetsForSurface(surface).map(w => w.id));
    /* The board no longer carries the layer's figures - LayerHero states
       them above it, once. What remains must still be real. */
    expect(DEFAULT_LAYOUT[surface].length).toBeGreaterThanOrEqual(1);
    for (const id of DEFAULT_LAYOUT[surface]) {
      expect(WIDGET_REGISTRY[id], `${id} missing from registry`).toBeDefined();
      expect(valid.has(id), `${id} is not valid on ${surface}`).toBe(true);
    }
  });

  /* The empty-state problem this used to guard against was solved by
     moving the figures ABOVE the board rather than by ordering widgets
     inside it: LayerHero opens the page with the layer's headline number,
     its evidence and its action, so Standing intents can lead the board
     without the page ever opening on a blank slate. What must not come
     back is a widget restating a figure the hero already states. */
  test('the board carries no widget whose figures the hero already states', () => {
    for (const surface of ['naas', 'ai'] as Surface[]) {
      for (const dropped of ['money-on-the-table', 'estate-figures', 'assessment-findings']) {
        expect(DEFAULT_LAYOUT[surface], `${dropped} duplicates the hero on ${surface}`).not.toContain(dropped);
      }
    }
  });

  test('Standing intents is still on both boards, not dropped', () => {
    expect(DEFAULT_LAYOUT.naas).toContain('standing-intents');
    expect(DEFAULT_LAYOUT.ai).toContain('standing-intents');
  });
});
