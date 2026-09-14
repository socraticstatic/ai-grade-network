export interface ProviderCredentialConfig {
  requiredInfo: string[];
  consoleUrl: string;
  consoleName: string;
}

export const PROVIDER_CREDENTIALS: Record<string, ProviderCredentialConfig> = {
  'AWS': {
    requiredInfo: ['AWS Account ID', 'Access Key ID', 'Secret Access Key', 'Region'],
    consoleUrl: 'https://console.aws.amazon.com/directconnect',
    consoleName: 'AWS Console',
  },
  'Azure': {
    requiredInfo: ['ExpressRoute Service Key', 'Subscription ID', 'Tenant ID', 'Client ID', 'Client Secret'],
    consoleUrl: 'https://portal.azure.com/#blade/Microsoft_Azure_ExpressRoute',
    consoleName: 'Azure Portal',
  },
  'Google': {
    requiredInfo: ['Project ID', 'Service Account Key', 'Region'],
    consoleUrl: 'https://console.cloud.google.com/hybrid/interconnects',
    consoleName: 'Google Cloud Console',
  },
  'Oracle': {
    requiredInfo: ['Tenancy OCID', 'Compartment ID', 'DRG ID', 'Region'],
    consoleUrl: 'https://cloud.oracle.com/networking/fast-connect',
    consoleName: 'Oracle Cloud Console',
  },
  'IBM': {
    requiredInfo: ['API Key', 'Account ID', 'Resource Group ID'],
    consoleUrl: 'https://cloud.ibm.com/interconnectivity/direct-link',
    consoleName: 'IBM Cloud Console',
  },
  'Equinix': {
    requiredInfo: ['Client ID', 'Client Secret', 'Metro Location'],
    consoleUrl: 'https://fabric.equinix.com',
    consoleName: 'Equinix Fabric Portal',
  },
  'Digital Realty': {
    requiredInfo: ['Portal Account', 'Service Exchange Access', 'Location ID'],
    consoleUrl: 'https://portal.digitalrealty.com',
    consoleName: 'Digital Realty Portal',
  },
  'Centersquare': {
    requiredInfo: ['Portal Account', 'Facility Access', 'Cross Connect Info'],
    consoleUrl: 'https://portal.centersquaredc.com',
    consoleName: 'CSquare Portal',
  },
  'CoreSite': {
    requiredInfo: ['Portal Account', 'Site Access', 'Cabinet Information'],
    consoleUrl: 'https://portal.coresite.com',
    consoleName: 'CoreSite Portal',
  },
  'DataBank': {
    requiredInfo: ['Portal Account', 'Site Access', 'Cross Connect Details'],
    consoleUrl: 'https://portal.databank.com',
    consoleName: 'DataBank Portal',
  },
  'Cisco Jasper': {
    requiredInfo: ['Jasper Account', 'API Key', 'Organization ID', 'Location Access'],
    consoleUrl: 'https://jasper.cisco.com',
    consoleName: 'Cisco Jasper Portal',
  },
};

export function isSecretField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return lower.includes('secret') || lower.includes('key') || lower.includes('password');
}
