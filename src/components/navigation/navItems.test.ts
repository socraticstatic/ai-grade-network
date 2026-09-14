import { describe, it, expect } from 'vitest';
import { NAV_LAYERS, NAV_ITEMS, STACK_LAYERS, counterpartPath, layerRail, layerForPath } from './navItems';

describe('NAV_LAYERS', () => {
  it('splits NaaS from AI Fabric, each with the same four verbs', () => {
    expect(NAV_LAYERS.map(d => d.key)).toEqual(['naas', 'ai']);
    for (const d of NAV_LAYERS) {
      expect(d.items.map(i => i.label)).toEqual(['Connect', 'Govern', 'Observe', 'Cost']);
    }
  });

  it('scopes every verb path under its domain', () => {
    expect(NAV_LAYERS[0].items.map(i => i.to)).toEqual([
      '/naas/connect', '/naas/govern', '/naas/observe', '/naas/cost',
    ]);
    expect(NAV_LAYERS[1].items.map(i => i.to)).toEqual([
      '/ai/connect', '/ai/govern', '/ai/observe', '/ai/cost',
    ]);
  });

  it('every nav path is unique', () => {
    const paths = NAV_ITEMS.map(i => i.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('Discover stays unified above both domains', () => {
    expect(NAV_ITEMS[0]).toMatchObject({ label: 'Discover', to: '/discover' });
  });

  it('every layer carries a tagline for the stack surfaces', () => {
    for (const layer of NAV_LAYERS) {
      expect(layer.tagline.length).toBeGreaterThan(0);
    }
  });
});

describe('STACK_LAYERS', () => {
  it('draws in elevation order — AI Fabric on top of the network', () => {
    expect(STACK_LAYERS.map(l => l.key)).toEqual(['ai', 'naas']);
  });
});

describe('layerRail', () => {
  it('leads with Home, then the four verbs, for each layer', () => {
    for (const layer of NAV_LAYERS) {
      const rail = layerRail(layer);
      expect(rail.map(i => i.label)).toEqual(['Home', 'Connect', 'Govern', 'Observe', 'Cost']);
      expect(rail[0].to).toBe(`/${layer.key}/home`);
      for (const item of rail) {
        expect(item.to).toMatch(new RegExp(`^/${layer.key}/`));
      }
    }
  });
});

describe('layerForPath', () => {
  it('maps a layer route to its layer, both layers, home and verbs', () => {
    expect(layerForPath('/naas/home')?.key).toBe('naas');
    expect(layerForPath('/naas/cost')?.key).toBe('naas');
    expect(layerForPath('/ai/govern')?.key).toBe('ai');
    expect(layerForPath('/ai')?.key).toBe('ai');
  });
  it('returns null for global routes', () => {
    expect(layerForPath('/discover')).toBeNull();
    expect(layerForPath('/stack')).toBeNull();
    expect(layerForPath('/')).toBeNull();
  });
});

describe('counterpartPath', () => {
  it('keeps the verb when hopping layers, both directions', () => {
    for (const verb of ['connect', 'govern', 'observe', 'cost']) {
      expect(counterpartPath(`/ai/${verb}`, 'naas')).toBe(`/naas/${verb}`);
      expect(counterpartPath(`/naas/${verb}`, 'ai')).toBe(`/ai/${verb}`);
    }
  });

  it('keeps the verb from deeper paths under a verb page', () => {
    expect(counterpartPath('/ai/cost/budgets', 'naas')).toBe('/naas/cost');
  });

  it('falls back to the target layer front door when there is no verb to keep', () => {
    expect(counterpartPath('/discover', 'ai')).toBe('/ai/connect');
    expect(counterpartPath('/discover', 'naas')).toBe('/naas/connect');
    expect(counterpartPath('/naas/never-a-verb', 'ai')).toBe('/ai/connect');
  });
});
