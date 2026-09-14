/**
 * Single source of truth for cloud-provider brand dot colors, used by cards,
 * topology nodes, and the leg drawer. Case-insensitive so it works for both
 * display keys ("AWS") and topology keys ("aws").
 */
const PROVIDER_COLOR: Record<string, string> = {
  aws: '#ff9900',
  azure: '#0089d6',
  google: '#ea4335',
  oracle: '#c74634',
  ibm: '#1f70c1',
  equinix: '#ed1c24',
  'digital realty': '#0033a0',
  digitalrealty: '#0033a0',
  coresite: '#e35205',
};

const NEUTRAL = '#94a3b8';

export function providerColor(provider?: string): string {
  if (!provider) return NEUTRAL;
  return PROVIDER_COLOR[provider.toLowerCase()] ?? NEUTRAL;
}
