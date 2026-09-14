/**
 * Provider-specific bandwidth tiers and burst models.
 *
 * Each provider has different available bandwidth options AND different
 * bandwidth enforcement models:
 * - AWS: Fixed (traffic policing, excess dropped)
 * - Azure: Burstable up to 2x via redundancy link
 * - Google: Soft limits (approximate, can exceed)
 * - Oracle: Fixed (no burst)
 */

export interface BandwidthOption {
  value: number;
  label: string;
}

export type BurstModel = 'fixed' | 'burstable' | 'soft';

export interface ProviderBandwidthConfig {
  options: BandwidthOption[];
  burstModel: BurstModel;
  burstMultiplier?: number;
  burstNote: string;
  billingNote: string;
}

const AWS_HOSTED: BandwidthOption[] = [
  { value: 50, label: '50 Mbps' },
  { value: 100, label: '100 Mbps' },
  { value: 200, label: '200 Mbps' },
  { value: 300, label: '300 Mbps' },
  { value: 400, label: '400 Mbps' },
  { value: 500, label: '500 Mbps' },
  { value: 1000, label: '1 Gbps' },
  { value: 2000, label: '2 Gbps' },
  { value: 5000, label: '5 Gbps' },
  { value: 10000, label: '10 Gbps' },
  { value: 25000, label: '25 Gbps' },
];

const AZURE_CIRCUIT: BandwidthOption[] = [
  { value: 50, label: '50 Mbps' },
  { value: 100, label: '100 Mbps' },
  { value: 200, label: '200 Mbps' },
  { value: 500, label: '500 Mbps' },
  { value: 1000, label: '1 Gbps' },
  { value: 2000, label: '2 Gbps' },
  { value: 5000, label: '5 Gbps' },
  { value: 10000, label: '10 Gbps' },
];

const GOOGLE_PARTNER: BandwidthOption[] = [
  { value: 50, label: '50 Mbps' },
  { value: 100, label: '100 Mbps' },
  { value: 200, label: '200 Mbps' },
  { value: 300, label: '300 Mbps' },
  { value: 500, label: '500 Mbps' },
  { value: 1000, label: '1 Gbps' },
  { value: 2000, label: '2 Gbps' },
  { value: 5000, label: '5 Gbps' },
  { value: 10000, label: '10 Gbps' },
  { value: 20000, label: '20 Gbps' },
  { value: 50000, label: '50 Gbps' },
];

const ORACLE_PARTNER: BandwidthOption[] = [
  { value: 1000, label: '1 Gbps' },
  { value: 2000, label: '2 Gbps' },
  { value: 5000, label: '5 Gbps' },
  { value: 10000, label: '10 Gbps' },
];

const DEFAULT_BANDWIDTH: BandwidthOption[] = [
  { value: 100, label: '100 Mbps' },
  { value: 500, label: '500 Mbps' },
  { value: 1000, label: '1 Gbps' },
  { value: 2000, label: '2 Gbps' },
  { value: 5000, label: '5 Gbps' },
  { value: 10000, label: '10 Gbps' },
];

const PROVIDER_CONFIGS: Record<string, ProviderBandwidthConfig> = {
  'AWS': {
    options: AWS_HOSTED,
    burstModel: 'fixed',
    burstNote: 'Traffic exceeding provisioned rate is dropped (traffic policing).',
    billingNote: 'Billed per port-hour plus data transfer.',
  },
  'Azure': {
    options: AZURE_CIRCUIT,
    burstModel: 'burstable',
    burstMultiplier: 2,
    burstNote: 'Can burst up to 2x provisioned bandwidth using redundancy link. Not for sustained use.',
    billingNote: 'Metered (pay per GB outbound) or Unlimited (flat rate).',
  },
  'Google': {
    options: GOOGLE_PARTNER,
    burstModel: 'soft',
    burstNote: 'Capacity is approximate. Attachments may exceed provisioned bandwidth. Rate limiting on your router recommended.',
    billingNote: 'Billed per VLAN attachment capacity.',
  },
  'Oracle': {
    options: ORACLE_PARTNER,
    burstModel: 'fixed',
    burstNote: 'Fixed provisioned bandwidth. Can be modified after creation.',
    billingNote: 'Billed per port-hour only. No data transfer charges.',
  },
};

const DEFAULT_CONFIG: ProviderBandwidthConfig = {
  options: DEFAULT_BANDWIDTH,
  burstModel: 'fixed',
  burstNote: 'Fixed provisioned bandwidth.',
  billingNote: 'Standard billing.',
};

/**
 * Get bandwidth options for a specific provider.
 * Falls back to a default set for providers without specific data.
 */
export function getProviderBandwidth(provider: string): BandwidthOption[] {
  return (PROVIDER_CONFIGS[provider] || DEFAULT_CONFIG).options;
}

/**
 * Get full bandwidth config including burst model for a provider.
 */
export function getProviderBandwidthConfig(provider: string): ProviderBandwidthConfig {
  return PROVIDER_CONFIGS[provider] || DEFAULT_CONFIG;
}
