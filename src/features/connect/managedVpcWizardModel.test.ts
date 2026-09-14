import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { eligibleRegions, validCidr, confirmCopy, TIERS, WIZ_STEPS } from './managedVpcWizardModel';

describe('managedVpcWizardModel', () => {
  it('offers every AWS/Azure region exactly once and no other clouds', () => {
    const el = eligibleRegions(CC);
    const clouds = new Set(el.map(e => e.cloudId));
    expect([...clouds].sort()).toEqual(['aws', 'azure']);
    const awsCount = (CC.regions['aws'] || []).length;
    const azCount = (CC.regions['azure'] || []).length;
    expect(el.length).toBe(awsCount + azCount);
  });

  it('a deployed region drops out of eligibility', () => {
    CC.deployManagedVpc({ cloudId: 'aws', regionId: 'use1' });
    expect(eligibleRegions(CC).some(e => e.regionId === 'use1')).toBe(false);
  });

  it('validates the managed CIDR shape', () => {
    expect(validCidr('10.255.7.0/24')).toBe(true);
    expect(validCidr(' 10.255.7.0/24 ')).toBe(true);
    expect(validCidr('10.0.0.0/16')).toBe(false);
    expect(validCidr('')).toBe(false);
  });

  it('confirm copy speaks the provider vocabulary', () => {
    expect(confirmCopy('aws', 'Oregon', '1G', 'Direct Connect · Equinix DC2'))
      .toContain('TGW attachment');
    expect(confirmCopy('azure', 'West US 2', '1G', 'ExpressRoute · Equinix CH1'))
      .toContain('VNet peering');
    expect(WIZ_STEPS).toEqual(['region', 'tier', 'cidr', 'confirm']);
    expect(TIERS.map(t => t.id)).toEqual(['500M', '1G', '5G']);
  });
});
