import type { CloudControl } from '../../engine/types';
import { regionsOf, vpcsOf, type Cloud } from './discoveryModel';

/**
 * Pure logic for the "+ Connect a cloud" discovery workflow.
 *
 * The wizard is a SIMULATED demo-real flow: pick a provider, paste a
 * credential (shape-validated only — nothing is stored or transmitted), then
 * run a scan animation whose STEPS are derived deterministically from the
 * seeded engine (regions / VPCs / subnets for the chosen cloud). No backend,
 * no Date.now, no Math.random — the animation timer paces steps, but every
 * figure shown is a CC derivation.
 */

export type WizardStep = 'provider' | 'credentials' | 'scanning' | 'done';

export const WIZARD_STEPS: WizardStep[] = ['provider', 'credentials', 'scanning', 'done'];

/** Providers a user can connect — cloud id (for ProviderLogo) + credential kind. */
export interface WizardProvider {
  id: string;
  name: string;
  /** AWS uses an IAM role ARN; everyone else an API key / service principal. */
  credKind: 'arn' | 'key';
  credLabel: string;
  credPlaceholder: string;
}

export const WIZARD_PROVIDERS: WizardProvider[] = [
  { id: 'aws', name: 'AWS', credKind: 'arn', credLabel: 'IAM role ARN', credPlaceholder: 'arn:aws:iam::123456789012:role/CloudConnectDiscovery' },
  { id: 'azure', name: 'Azure', credKind: 'key', credLabel: 'Service principal (client ID / secret)', credPlaceholder: 'appId=…  password=…  tenant=…' },
  { id: 'gcp', name: 'Google Cloud', credKind: 'key', credLabel: 'Service account key', credPlaceholder: 'Paste service-account JSON key' },
  { id: 'oci', name: 'Oracle Cloud', credKind: 'key', credLabel: 'API signing key', credPlaceholder: 'ocid1.user.oc1..…  /  API key fingerprint' },
  { id: 'cw', name: 'CoreWeave', credKind: 'key', credLabel: 'API key (neocloud)', credPlaceholder: 'cw_live_…' },
  { id: 'neb', name: 'Nebius', credKind: 'key', credLabel: 'API key (neocloud)', credPlaceholder: 'nb_key_…' },
];

export function providerById(id: string): WizardProvider | undefined {
  return WIZARD_PROVIDERS.find(p => p.id === id);
}

/**
 * Shape-validate a credential. SIMULATED: we only check the rough shape so the
 * demo form feels real — the value is never stored or sent anywhere.
 *   - AWS: an IAM role ARN (arn:aws:iam::<12 digits>:role/<name>).
 *   - Others: a non-trivial key (>= 8 non-space chars).
 */
export function validateCredential(provider: WizardProvider, raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (provider.credKind === 'arn') {
    return /^arn:aws:iam::\d{12}:role\/.+/.test(value);
  }
  return value.replace(/\s/g, '').length >= 8;
}

export interface ScanStep {
  regionId: string;
  /** e.g. "Scanning us-east-1… found 2 VPCs, 14 subnets" */
  label: string;
  vpcs: number;
  subnets: number;
}

/**
 * Deterministic scan steps for a cloud, one per region, from the seed. The
 * order matches the engine's region order; counts are live CC derivations.
 */
export function scanSteps(cc: CloudControl, cloudId: string): ScanStep[] {
  return regionsOf(cc, cloudId).map(r => {
    const vpcs = vpcsOf(cc, r.id).length;
    return {
      regionId: r.id,
      vpcs,
      subnets: r.subnets,
      label: `Scanning ${r.name}… found ${vpcs} VPC${vpcs === 1 ? '' : 's'}, ${r.subnets} subnet${r.subnets === 1 ? '' : 's'}`,
    };
  });
}

/** Human summary shown when a scan completes — all figures from CC. */
export function scanSummary(cc: CloudControl, cloudId: string): string {
  const cloud = (cc.clouds as Cloud[]).find(c => c.id === cloudId);
  const steps = scanSteps(cc, cloudId);
  const regions = steps.length;
  const vpcs = steps.reduce((n, s) => n + s.vpcs, 0);
  const subnets = steps.reduce((n, s) => n + s.subnets, 0);
  const name = cloud?.name ?? cloudId.toUpperCase();
  return `${name}: ${regions} region${regions === 1 ? '' : 's'}, ${vpcs} VPC${vpcs === 1 ? '' : 's'}, ${subnets} subnets`;
}
