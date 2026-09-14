import { describe, it, expect } from 'vitest';
import {
  getAvailableConnectionTypes,
  getAvailableProviders,
  PROVIDER_CONNECTION_TYPES,
} from './providerConnectionTypes';

describe('getAvailableProviders', () => {
  it('returns all providers when no connection type is selected', () => {
    const all = Object.keys(PROVIDER_CONNECTION_TYPES);
    expect(getAvailableProviders(undefined)).toEqual(all);
    expect(getAvailableProviders('')).toEqual(all);
  });
  it('limits "Cloud to Cloud" to the four hyperscalers', () => {
    expect(getAvailableProviders('Cloud to Cloud').sort()).toEqual(['AWS','Azure','Google','Oracle'].sort());
  });
  it('excludes IBM from "DataCenter/CoLocation to Cloud"', () => {
    const r = getAvailableProviders('DataCenter/CoLocation to Cloud');
    expect(r).not.toContain('IBM'); expect(r).toContain('Equinix'); expect(r).toContain('AWS');
  });
  it('excludes DC/colo-only providers from "Internet to Cloud"', () => {
    const r = getAvailableProviders('Internet to Cloud');
    expect(r).not.toContain('Centersquare'); expect(r).not.toContain('DataBank');
    expect(r).toContain('IBM'); expect(r).toContain('AWS');
  });
  it('is the exact inverse of getAvailableConnectionTypes', () => {
    for (const p of Object.keys(PROVIDER_CONNECTION_TYPES))
      for (const t of PROVIDER_CONNECTION_TYPES[p])
        expect(getAvailableProviders(t)).toContain(p);
  });
});
