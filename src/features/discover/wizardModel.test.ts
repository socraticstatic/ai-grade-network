import { describe, it, expect } from 'vitest';
import { CC } from '../../engine/index';
import {
  WIZARD_PROVIDERS,
  WIZARD_STEPS,
  providerById,
  validateCredential,
  scanSteps,
  scanSummary,
} from './wizardModel';

describe('wizardModel — providers & steps', () => {
  it('offers AWS / Azure / GCP / Oracle and neoclouds, all with ProviderLogo ids', () => {
    const ids = WIZARD_PROVIDERS.map(p => p.id);
    expect(ids).toEqual(expect.arrayContaining(['aws', 'azure', 'gcp', 'oci', 'cw', 'neb']));
  });

  it('AWS asks for an IAM role ARN; others for an API key / service principal', () => {
    expect(providerById('aws')!.credKind).toBe('arn');
    expect(providerById('aws')!.credPlaceholder).toBe('arn:aws:iam::123456789012:role/CloudConnectDiscovery');
    expect(providerById('azure')!.credKind).toBe('key');
    expect(providerById('gcp')!.credKind).toBe('key');
  });

  it('walks provider → credentials → scanning → done', () => {
    expect(WIZARD_STEPS).toEqual(['provider', 'credentials', 'scanning', 'done']);
  });
});

describe('wizardModel — credential shape-validation (simulated, never stored)', () => {
  const aws = providerById('aws')!;
  const gcp = providerById('gcp')!;

  it('rejects an empty AWS ARN', () => {
    expect(validateCredential(aws, '')).toBe(false);
    expect(validateCredential(aws, '   ')).toBe(false);
  });

  it('rejects a malformed AWS ARN', () => {
    expect(validateCredential(aws, 'not-an-arn')).toBe(false);
    expect(validateCredential(aws, 'arn:aws:iam::12:role/x')).toBe(false); // too few digits
  });

  it('accepts a well-shaped AWS role ARN', () => {
    expect(validateCredential(aws, 'arn:aws:iam::123456789012:role/CloudConnectDiscovery')).toBe(true);
  });

  it('accepts a non-trivial key for non-AWS providers, rejects too-short', () => {
    expect(validateCredential(gcp, 'short')).toBe(false);
    expect(validateCredential(gcp, 'a-real-looking-service-account-key')).toBe(true);
  });
});

describe('wizardModel — scan steps are deterministic CC derivations', () => {
  it('produces one step per AWS region with live VPC + subnet counts', () => {
    const steps = scanSteps(CC, 'aws');
    expect(steps.map(s => s.regionId)).toEqual(['use1', 'usw2', 'euw1']);
    const use1 = steps.find(s => s.regionId === 'use1')!;
    expect(use1.subnets).toBe(14);
    expect(use1.vpcs).toBe(3);
    expect(use1.label).toBe('Scanning us-east-1… found 3 VPCs, 14 subnets');
  });

  it('is deterministic — same result across calls (no random / Date)', () => {
    expect(scanSteps(CC, 'aws')).toEqual(scanSteps(CC, 'aws'));
  });

  it('summarizes the estate found for a cloud', () => {
    expect(scanSummary(CC, 'gcp')).toBe('Google Cloud: 1 region, 2 VPCs, 6 subnets');
  });
});
