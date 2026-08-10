import { describe, test, expect } from 'vitest';
import { WIDGET_REGISTRY, widgetsForSurface, type WidgetDef } from './registry';

// A throwaway def so the filter has data independent of real widgets.
const def = (id: string, surface: WidgetDef['surface']): WidgetDef => ({
  id, title: id, description: id, icon: (() => null) as unknown as WidgetDef['icon'],
  category: 'test', surface, defaultSize: { w: 1, h: 1 },
  component: () => null,
});

describe('widgetsForSurface', () => {
  test('returns widgets tagged for the surface plus the shared ones, never the other surface', () => {
    const reg: Record<string, WidgetDef> = {
      a: def('a', 'naas'), b: def('b', 'ai'), c: def('c', 'both'),
    };
    const naas = widgetsForSurface('naas', reg).map(w => w.id).sort();
    const ai = widgetsForSurface('ai', reg).map(w => w.id).sort();
    expect(naas).toEqual(['a', 'c']);
    expect(ai).toEqual(['b', 'c']);
  });

  test('the real registry is keyed by each widget id', () => {
    for (const [key, w] of Object.entries(WIDGET_REGISTRY)) expect(w.id).toBe(key);
  });

  /* Fix-wave review finding 2: "Estate at a glance" was registered w:2 for
     a "four figures, two-up" layout that the phase-0 audit's cuts (rows
     4-7, 14-16) shrank to one or two short figures. A w:2 card holding one
     figure left half the card empty. */
  test('estate-figures is registered w:1, matching its post-audit content', () => {
    expect(WIDGET_REGISTRY['estate-figures'].defaultSize.w).toBe(1);
  });
});
