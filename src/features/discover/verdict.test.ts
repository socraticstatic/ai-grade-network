import { describe, it, expect } from 'vitest';
import { discoverVerdict } from './verdict';
import type { FabricModel } from '../connect/FabricHero';

const region = (cloudId: string, path: 'private' | 'public') =>
  ({ cloudId, regionId: `${cloudId}-${path}-${Math.random()}`, name: 'r', cloudName: cloudId,
     attached: path === 'private', reliability: 'single', path, privateMs: 10, publicMs: 40,
     currentMs: 40 }) as FabricModel['regions'][number];

const model = (regions: FabricModel['regions']): FabricModel =>
  ({ sites: [], onramps: [], regions, c2c: [] });

describe('discoverVerdict', () => {
  it('states span, fabric count, and public count', () => {
    const v = discoverVerdict(model([
      region('aws', 'private'), region('aws', 'public'), region('azure', 'public'),
    ]));
    expect(v).toBe('2 of your 3 cloud regions still ride the public internet. 1 is on the AT&T fabric, across 2 clouds.');
  });
  it('empty estate returns a sentence, not silence', () => {
    expect(discoverVerdict(model([]))).toBe('No estate mapped yet. Connect a cloud to begin.');
  });
});
