import { describe, it, expect } from 'vitest';
import { CC } from '../../engine/index';
import { regionConnection, cloudConnection, connMeta } from './connectionState';

/**
 * Connection-state derivations read the live engine fabric model. In the seed,
 * only NetBond PE-IAD-02 (nb1) is active, reaching AWS us-east-1 — so AWS is
 * connected via us-east-1 and every other cloud/region is public until an
 * on-ramp is activated.
 */
describe('connectionState derivation', () => {
  it('AWS us-east-1 is connected (private on-ramp reaches it in the seed)', () => {
    expect(regionConnection(CC, 'aws', 'use1')).toBe('connected');
  });

  it('AWS us-west-2 is public until an on-ramp is activated', () => {
    expect(regionConnection(CC, 'aws', 'usw2')).toBe('public');
  });

  it('the AWS cloud is connected because at least one region is private', () => {
    expect(cloudConnection(CC, 'aws')).toBe('connected');
  });

  it('Azure is public — no active on-ramp reaches any of its regions', () => {
    expect(cloudConnection(CC, 'azure')).toBe('public');
    expect(regionConnection(CC, 'azure', 'wus2')).toBe('public');
  });

  it('activating an on-ramp flips its region and cloud to connected', () => {
    // dx1 (Direct Connect) reaches gcp/usc1; inactive in the seed.
    expect(cloudConnection(CC, 'gcp')).toBe('public');
    expect(CC.activateOnramp('dx1', true)).toBe(true);
    expect(regionConnection(CC, 'gcp', 'usc1')).toBe('connected');
    expect(cloudConnection(CC, 'gcp')).toBe('connected');
  });

  it('connMeta maps state to label + icon, never amber', () => {
    expect(connMeta('connected')).toMatchObject({
      connected: true,
      label: 'via the AT&T fabric',
      icon: 'link',
    });
    expect(connMeta('public')).toMatchObject({
      connected: false,
      label: 'public internet',
      icon: 'globe',
    });
  });
});
