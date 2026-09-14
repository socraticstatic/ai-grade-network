import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { branchMatches, regionMatches, EMPTY_ESTATE_FILTERS } from './estateFilters';
import type { FabricModel } from '../connect/FabricHero';

const model = CC.fabricModel() as FabricModel;

describe('regionMatches', () => {
  it('empty filters match every region', () => {
    expect(model.regions.every(r => regionMatches(r, EMPTY_ESTATE_FILTERS))).toBe(true);
  });
  it('cloud, path and domain narrow conjunctively', () => {
    const cw = model.regions.find(r => r.cloudId === 'cw')!;
    expect(regionMatches(cw, { ...EMPTY_ESTATE_FILTERS, domain: 'ai' })).toBe(true);
    expect(regionMatches(cw, { ...EMPTY_ESTATE_FILTERS, domain: 'network' })).toBe(false);
    expect(regionMatches(cw, { ...EMPTY_ESTATE_FILTERS, cloud: 'aws' })).toBe(false);
    expect(regionMatches(cw, { cloud: 'cw', path: cw.path, domain: 'ai', siteClass: 'all' })).toBe(true);
  });
});

describe('branchMatches', () => {
  const atm = { id: 'x', name: 'x', city: 'x', cidrs: [], siteClass: 'atm' } as never;

  it('branchMatches: siteClass facet narrows, all matches everything', () => {
    expect(branchMatches(atm, EMPTY_ESTATE_FILTERS)).toBe(true);
    expect(branchMatches(atm, { ...EMPTY_ESTATE_FILTERS, siteClass: 'atm' })).toBe(true);
    expect(branchMatches(atm, { ...EMPTY_ESTATE_FILTERS, siteClass: 'dc' })).toBe(false);
  });

  it('cloud facet never excludes a branch', () => {
    expect(branchMatches(atm, { ...EMPTY_ESTATE_FILTERS, cloud: 'aws' })).toBe(true);
  });
});
