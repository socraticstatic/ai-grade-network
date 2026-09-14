import { Info } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ConnectionType } from '../../../types/connection';
import { getAvailableConnectionTypes } from '../../../data/providerConnectionTypes';
import { ConnectionTypeIcon } from '../../connection/icons/ConnectionTypeIcon';

const INTERNET_CONNECTION_TYPES = [
  {
    type: 'Internet to Cloud',
    description: 'High-performance internet connectivity to cloud services',
    features: [
      'Dedicated bandwidth',
      'Built-in DDoS protection',
      '24/7 monitoring',
      'Auto-scaling support',
    ],
    disabled: false,
  },
  {
    type: 'AWS Last Mile',
    description: 'AT&T-managed AWS Interconnect – last mile. Maximum resiliency by design.',
    features: [
      '4 channels across 2 datacenters',
      'Survives a datacenter loss',
      'Auto-negotiated BGP, VLAN, IP',
      'MACsec-encrypted core',
    ],
    disabled: false,
  },
  {
    type: 'Cloud to Cloud',
    description: 'Secure connectivity between cloud environments',
    features: [
      'Private backbone transit',
      'Multi-cloud routing',
      'Low-latency peering',
      'Encrypted tunnels',
    ],
    disabled: false,
  },
  {
    type: 'DataCenter/CoLocation to Cloud',
    description: 'Direct connectivity from data centers to cloud services',
    features: [
      'Cross-connect provisioning',
      'Layer 2 and Layer 3 options',
      'Sub-millisecond latency',
      'Dedicated fiber paths',
    ],
    disabled: false,
  },
  {
    type: 'Site to Cloud',
    description: 'Secure branch connectivity to cloud services',
    features: [
      'SD-WAN integration',
      'Branch auto-discovery',
      'Zero-touch provisioning',
      'Automated failover',
    ],
    disabled: true,
  },
];

interface ConnectionTypeSelectionProps {
  selectedType: ConnectionType | undefined;
  provider?: string;
  providers?: string[];
  onSelect: (type: ConnectionType) => void;
}

export function ConnectionTypeSelection({
  selectedType,
  provider,
  providers = [],
  onSelect,
}: ConnectionTypeSelectionProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Filter connection types based on selected provider(s)
  const availableTypes = useMemo(() => {
    const allProviders = providers.length > 0 ? providers : provider ? [provider] : [];
    return getAvailableConnectionTypes(allProviders);
  }, [provider, providers]);

  const connectionTypes = INTERNET_CONNECTION_TYPES.map(ct => ({
    ...ct,
    // Disable types not available for selected provider(s), unless it's Site to Cloud (already disabled)
    disabled: ct.disabled || !availableTypes.includes(ct.type),
  }));

  // Provider-specific product name for each connection type
  const getProviderContext = (connType: string): string | null => {
    if (!provider) return null;
    const contexts: Record<string, Record<string, string>> = {
      'AWS': {
        'Internet to Cloud': 'Provisions an AWS Interconnect – last mile hosted connection',
        'Cloud to Cloud': 'Uses Transit VIF on AWS Interconnect – last mile',
        'DataCenter/CoLocation to Cloud': 'Provisions a Dedicated AWS Interconnect – last mile',
        'VPN to Cloud': 'Uses AWS Site-to-Site VPN (not Interconnect – last mile)',
      },
      'Azure': {
        'Internet to Cloud': 'Provisions an Azure ExpressRoute circuit',
        'Cloud to Cloud': 'Uses ExpressRoute Global Reach',
        'DataCenter/CoLocation to Cloud': 'Provisions ExpressRoute Direct',
        'VPN to Cloud': 'Uses Azure VPN Gateway (not ExpressRoute)',
      },
      'Google': {
        'Internet to Cloud': 'Provisions a Google Partner Interconnect',
        'Cloud to Cloud': 'Uses multiple VLAN Attachments',
        'DataCenter/CoLocation to Cloud': 'Provisions a Dedicated Interconnect',
        'VPN to Cloud': 'Uses Google Cloud VPN (not Interconnect)',
      },
      'Oracle': {
        'Internet to Cloud': 'Provisions an Oracle FastConnect virtual circuit',
        'Cloud to Cloud': 'Uses multiple FastConnect virtual circuits',
        'DataCenter/CoLocation to Cloud': 'Provisions FastConnect Direct',
        'VPN to Cloud': 'Uses OCI Site-to-Site VPN (not FastConnect)',
      },
    };
    return contexts[provider]?.[connType] || null;
  };

  const tooltips: Record<string, string> = {
    'Internet to Cloud': 'High-performance internet connectivity with dedicated bandwidth to cloud services. Includes built-in security, DDoS protection, and 24/7 monitoring.',
    'Cloud to Cloud': 'Direct private connectivity between cloud environments without traversing the public internet for enhanced security and performance.',
    'DataCenter/CoLocation to Cloud': 'Direct fiber connection from your data center or colocation facility to cloud provider for maximum speed and reliability.',
    'VPN to Cloud': 'Encrypted IPSec/IKEv2 tunnel from any site to cloud services. Supports split-tunnel, redundant endpoints, and policy-based routing.',
    'Site to Cloud': 'Secure connectivity from branch offices or remote sites to centralized cloud services with automated failover.',
  };

  return (
    <div>
      <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] text-center mb-6">Choose Your Connection Type</h3>

      {/* Compact mini cards — icon + title + one-line description; details on the info tooltip. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {connectionTypes.map(({ type, description, disabled }) => {
          const selected = selectedType === type;
          const context = !disabled ? getProviderContext(type) : null;
          return (
            <div key={type} className="relative">
              <button
                onClick={() => !disabled && onSelect(type as ConnectionType)}
                disabled={disabled}
                className={`choice-card w-full h-full p-4 rounded-xl border-2 text-left transition-all ${
                  disabled
                    ? 'bg-fw-wash border-fw-secondary cursor-not-allowed opacity-70'
                    : selected
                      ? 'border-fw-active bg-fw-accent shadow-sm'
                      : 'border-fw-secondary bg-fw-base hover:border-fw-active/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 ${disabled ? 'text-fw-disabled' : selected ? 'text-fw-link' : 'text-fw-body'}`}>
                    <ConnectionTypeIcon type={type} size={28} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-figma-sm font-bold truncate ${disabled ? 'text-fw-disabled' : selected ? 'text-fw-link' : 'text-fw-heading'}`}>
                        {type}
                      </span>
                      {disabled && (
                        <span className="inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-semibold bg-fw-secondary text-fw-bodyLight shrink-0">
                          Coming Soon
                        </span>
                      )}
                      {!disabled && (
                        <span
                          className="ml-auto text-fw-disabled hover:text-fw-body shrink-0"
                          onMouseEnter={() => setShowTooltip(type)}
                          onMouseLeave={() => setShowTooltip(null)}
                          onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === type ? null : type); }}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <p className={`text-figma-xs mt-0.5 leading-snug ${disabled ? 'text-fw-disabled' : 'text-fw-bodyLight'}`}>
                      {description}
                    </p>
                    {context && (
                      <p className="text-[11px] text-fw-link mt-1 leading-snug">{context}</p>
                    )}
                  </div>
                </div>
              </button>
              {showTooltip === type && (
                <div className="absolute z-10 w-72 px-3 py-2.5 bg-fw-heading text-white text-figma-xs rounded-lg shadow-xl mt-1 left-0">
                  {tooltips[type]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
