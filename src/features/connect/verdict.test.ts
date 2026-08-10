import { describe, it, expect } from 'vitest';
import { connectVerdict } from './verdict';
import type { FabricModel } from './FabricHero';

const region = (path: 'private' | 'public', reliability: 'dual' | 'single' | 'none') =>
  ({ cloudId: 'aws', regionId: `r-${Math.random()}`, name: 'r', cloudName: 'AWS',
     attached: path === 'private', reliability, path, privateMs: 10, publicMs: 40,
     currentMs: path === 'private' ? 10 : 40 }) as FabricModel['regions'][number];

const model = (regions: FabricModel['regions']): FabricModel =>
  ({ sites: [], onramps: [], regions, c2c: [] });

describe('connectVerdict', () => {
  it('mixed estate: counts on-fabric, dual, and public in one sentence pair', () => {
    const v = connectVerdict(model([
      region('private', 'dual'), region('private', 'single'), region('public', 'none'),
    ]));
    expect(v).toBe('2 of 3 regions are on the AT&T fabric, 1 with dual paths. 1 still rides the public internet.');
  });
  /* Row 37 of the phase-0 metric audit: the rendered sentence at 1-of-9
     attached read "1 of 9 regions ARE on the AT&T fabric, 0 with dual
     paths" — plural verb on a singular subject, and a bare 0 that reads as
     a blank field. Singular/plural and a "none" branch, both inside the
     existing string builder; the values are unchanged. */
  it('one region attached, none dual: singular verb and "none", not a bare 0', () => {
    const v = connectVerdict(model([
      region('private', 'single'),
      ...Array.from({ length: 8 }, () => region('public', 'none')),
    ]));
    expect(v).toBe('1 of 9 regions is on the AT&T fabric, none with dual paths. 8 still ride the public internet.');
  });

  it('nothing attached: says so plainly', () => {
    const v = connectVerdict(model([region('public', 'none'), region('public', 'none')]));
    expect(v).toBe('None of your 2 regions are on the AT&T fabric yet. Everything rides the public internet.');
  });
  it('fully attached: no public remainder sentence', () => {
    const v = connectVerdict(model([region('private', 'dual'), region('private', 'dual')]));
    expect(v).toBe('All 2 regions are on the AT&T fabric, 2 with dual paths.');
  });
  it('empty estate returns a sentence, not silence', () => {
    expect(connectVerdict(model([]))).toBe('No estate mapped yet. Discover your clouds to begin.');
  });
});
