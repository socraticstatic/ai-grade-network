import { useState, useEffect } from 'react';
import { Network, Globe, Activity, Settings, Info, Upload, X, AlertTriangle, Shield } from 'lucide-react';
import { CloudProvider } from '../../../types/connection';
import { PROVIDER_CREDENTIALS, isSecretField } from '../../../data/providerCredentialFields';
import { NetworkConfigUpload } from '../NetworkConfigUpload';

interface AdvancedSettingsProps {
  resiliencyLevel?: string;
  config: {
    provider?: CloudProvider;
    providers?: CloudProvider[];
    type?: string;
    bandwidth?: string;
    location?: string;
    configuration?: {
      internetSubnets?: string[];
      stackType?: 'ipv4' | 'ipv6' | 'dual';
      bfdEnabled?: boolean;
      qosClassifier?: 'best-effort' | 'out-of-contract';
      peerAsn?: 'public' | 'private' | 'global';
      peerAsnRange?: string;
      l3mtu?: number;
      subscriptionId?: string;
      vifType?: 'internet' | 'L3VPN' | 'restricted' | '3rd party internet' | 'ethernet';
      serviceAccessType?: 'internet' | 'l3vmp' | 'restricted';
      ddosProtection?: boolean;
      advancedMonitoring?: boolean;
      // Azure-specific
      azureSubscriptionId?: string;
      expressRouteCircuitKey?: string;
      // Google-specific
      gcpPairingKey?: string;
      gcpInterconnectType?: 'dedicated' | 'partner';
      // Oracle-specific
      oracleOcid?: string;
      oracleCompartmentId?: string;
      oracleDrgId?: string;
      // Azure-specific
      azureSku?: 'local' | 'standard' | 'premium';
      // Cloud-to-Cloud specific
      peeringType?: 'private' | 'direct' | 'exchange';
      encryptionMode?: 'ipsec' | 'macsec' | 'none';
      routeExchange?: 'full' | 'partial' | 'default';
    };
  };
  onConfigChange: (updates: any) => void;
}

export function AdvancedSettings({
  config,
  onConfigChange,
  resiliencyLevel,
}: AdvancedSettingsProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [uploadedConfigs, setUploadedConfigs] = useState<Record<string, any>>({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkSubnets, setBulkSubnets] = useState('');
  const [bulkImportError, setBulkImportError] = useState<string>();

  useEffect(() => {
    let mtu = 1500;

    if (config.provider === 'AWS') {
      if (config.configuration?.vifType === 'private') {
        mtu = 9001;
      } else if (config.configuration?.vifType === 'transit') {
        mtu = 8500;
      }
    }
    
    handleConfigChange('l3mtu', mtu);
  }, [config.provider, config.configuration?.vifType]);

  const handleConfigChange = (key: string, value: any) => {
    onConfigChange({
      configuration: {
        ...config.configuration,
        [key]: value
      }
    });
  };

  const validateSubnet = (subnet: string): boolean => {
    const cidrPattern = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!cidrPattern.test(subnet)) return false;

    const ipParts = subnet.split('/')[0].split('.');
    return ipParts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  const handleBulkImport = () => {
    setBulkImportError(undefined);
    
    const subnets = bulkSubnets
      .split('\n')
      .map(s => s.trim())
      .filter(s => s);

    const invalidSubnets = subnets.filter(subnet => !validateSubnet(subnet));
    if (invalidSubnets.length > 0) {
      setBulkImportError(`Invalid subnets found: ${invalidSubnets.join(', ')}`);
      return;
    }

    handleConfigChange('internetSubnets', subnets);
    setShowBulkImport(false);
    setBulkSubnets('');

    window.addToast({
      type: 'success',
      title: 'Subnets Imported',
      message: `Successfully imported ${subnets.length} subnets`,
      duration: 3000
    });
  };

  const getMtuTooltip = () => {
    switch (config.provider) {
      case 'AWS':
        return 'AWS Interconnect – last mile MTU: 1500 for Public VIF, 9001 for Private VIF, 8500 for Transit VIF';
      case 'Azure':
        return 'Azure ExpressRoute uses a fixed MTU of 1500';
      case 'Google':
        return 'Google Cloud Interconnect uses a fixed MTU of 1500';
      default:
        return 'Default MTU is 1500';
    }
  };

  const isAwsLmcc = config.provider === 'AWS' && resiliencyLevel === 'maximum' && config.type === 'Internet to Cloud';

  return (
    <div className="space-y-8">
      <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] text-center mb-8">Advanced Configuration</h3>

        {/* LMCC Contract & Transport (AWS Max only) */}
        {isAwsLmcc && (
          <div className="bg-fw-base p-6 rounded-xl border border-fw-active/30 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-fw-accent rounded-lg">
                <Shield className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">AWS Max Configuration</h4>
                <p className="text-figma-sm text-fw-bodyLight">Contract term and transport for your AWS Max connection</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Contract Term
                </label>
                <select
                  value={config.configuration?.lmccContractTerm || 'monthly'}
                  onChange={(e) => handleConfigChange('lmccContractTerm', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-fw-primary text-figma-base focus:border-fw-active focus:ring-fw-active"
                >
                  <option value="monthly">Month-to-Month</option>
                  <option value="fixed-12">12 Month Fixed Term</option>
                  <option value="fixed-24">24 Month Fixed Term</option>
                  <option value="fixed-36">36 Month Fixed Term</option>
                </select>
                <p className="text-figma-xs text-fw-bodyLight mt-1">
                  Fixed terms carry committed pricing; month-to-month can change with 30 days notice.
                </p>
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Transport Type
                </label>
                <select
                  value={config.configuration?.lmccTransport || 'mpls'}
                  onChange={(e) => handleConfigChange('lmccTransport', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-fw-primary text-figma-base focus:border-fw-active focus:ring-fw-active"
                >
                  <option value="mpls">MPLS (AT&T AVPN)</option>
                  <option value="internet">Internet</option>
                </select>
                <p className="text-figma-xs text-fw-bodyLight mt-1">
                  MPLS rides your AVPN; Internet transport uses public underlay with the same 4-path design.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-fw-warningLight border border-fw-warning">
              <AlertTriangle className="h-4 w-4 text-fw-warning shrink-0 mt-0.5" />
              <div className="text-figma-xs text-fw-body">
                <p className="font-medium">SLA Prerequisites</p>
                <p className="mt-0.5">99.99% SLA requires an <strong>AWS Enterprise Support plan</strong> and a completed <strong>Well-Architected Review</strong> with an AWS Solutions Architect. Without these, the SLA does not apply.</p>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-fw-wash border border-fw-secondary">
              <Info className="h-4 w-4 text-fw-bodyLight shrink-0 mt-0.5" />
              <div className="text-figma-xs text-fw-bodyLight">
                <p>Billing starts when BGP reaches "Established" state. MACsec encryption is not available for hosted connections - use IPsec via Site-to-Site VPN if encryption is required.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
                <p className="text-figma-xs text-fw-bodyLight">BFD Interval</p>
                <p className="text-figma-sm font-semibold text-fw-heading">300ms</p>
                <p className="text-figma-xs text-fw-disabled">AWS minimum</p>
              </div>
              <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
                <p className="text-figma-xs text-fw-bodyLight">BFD Multiplier</p>
                <p className="text-figma-sm font-semibold text-fw-heading">3x</p>
                <p className="text-figma-xs text-fw-disabled">Detection threshold</p>
              </div>
              <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
                <p className="text-figma-xs text-fw-bodyLight">Failover Time</p>
                <p className="text-figma-sm font-semibold text-fw-heading">900ms</p>
                <p className="text-figma-xs text-fw-disabled">Sub-second detection</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-fw-accent rounded-lg">
                <Network className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Network Configuration</h4>
                <p className="text-figma-sm text-fw-bodyLight">Configure network addressing and routing settings</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-figma-base font-medium text-fw-body">
                    Internet Subnets
                    <button
                      className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                      onMouseEnter={() => setShowTooltip('subnets')}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <Info className="h-4 w-4 inline" />
                    </button>
                  </label>
                </div>
                {showTooltip === 'subnets' && (
                  <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                    Enter your network subnets in CIDR notation (e.g., 192.168.1.0/24). These define the IP ranges for your connection.
                  </div>
                )}
                <div className="space-y-2">
                  {(config.configuration?.internetSubnets || ['']).map((subnet, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={subnet}
                        onChange={(e) => {
                          const newSubnets = [...(config.configuration?.internetSubnets || [''])];
                          newSubnets[index] = e.target.value;
                          handleConfigChange('internetSubnets', newSubnets);
                        }}
                        placeholder="e.g., 192.168.1.0/24"
                        className="flex-1 px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="px-3 py-2 bg-brand-lightBlue text-brand-blue rounded-lg hover:bg-brand-lightBlue/80 w-full flex items-center justify-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  IP Stack Type
                  <button
                    className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                    onMouseEnter={() => setShowTooltip('stack')}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <Info className="h-4 w-4 inline" />
                  </button>
                </label>
                {showTooltip === 'stack' && (
                  <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                    Choose your IP protocol version. Dual Stack supports both IPv4 and IPv6 simultaneously for maximum compatibility.
                  </div>
                )}
                <select
                  value={config.configuration?.stackType || 'ipv4'}
                  onChange={(e) => handleConfigChange('stackType', e.target.value)}
                  className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                >
                  <option value="ipv4">IPv4 Only</option>
                  <option value="ipv6">IPv6 Only</option>
                  <option value="dual">Dual Stack (IPv4 + IPv6)</option>
                </select>
              </div>

              {/* BFD moved to Advanced BGP Configuration section */}

              <div className="relative">
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Quality of Service Classifier
                  <button
                    className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                    onMouseEnter={() => setShowTooltip('qos')}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <Info className="h-4 w-4 inline" />
                  </button>
                </label>
                {showTooltip === 'qos' && (
                  <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                    Determines how your traffic is prioritized. Best Effort provides standard delivery, while Out of Contract handles excess traffic.
                  </div>
                )}
                <select
                  value={config.configuration?.qosClassifier || 'best-effort'}
                  onChange={(e) => handleConfigChange('qosClassifier', e.target.value)}
                  className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                >
                  <option value="best-effort">Best Effort</option>
                  <option value="out-of-contract">Out of Contract</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    Peer ASN Type
                    <button
                      className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                      onMouseEnter={() => setShowTooltip('asn')}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <Info className="h-4 w-4 inline" />
                    </button>
                  </label>
                  {showTooltip === 'asn' && (
                    <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                      Autonomous System Number type for BGP routing. Choose based on your network's scope and requirements.
                    </div>
                  )}
                  <select
                    value={config.configuration?.peerAsn || 'public'}
                    onChange={(e) => handleConfigChange('peerAsn', e.target.value)}
                    className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  >
                    <option value="public">Public ASN</option>
                    <option value="private">Private ASN</option>
                    <option value="global">Global ASN</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    Peer ASN Range
                    <button
                      className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                      onMouseEnter={() => setShowTooltip('asnRange')}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <Info className="h-4 w-4 inline" />
                    </button>
                  </label>
                  {showTooltip === 'asnRange' && (
                    <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                      Specify the ASN range for your BGP peering. For private ASNs use 64512-65534, for public ASNs use assigned range.
                    </div>
                  )}
                  <input
                    type="text"
                    value={config.configuration?.peerAsnRange || ''}
                    onChange={(e) => handleConfigChange('peerAsnRange', e.target.value)}
                    placeholder={config.configuration?.peerAsn === 'private' ? '64512-65534' : '1-64511'}
                    className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  />
                  <p className="mt-1 text-figma-xs text-fw-bodyLight">
                    {config.configuration?.peerAsn === 'private' 
                      ? 'Private ASN range: 64512-65534'
                      : 'Public ASN range: 1-64511'}
                  </p>
                </div>
              </div>

              {/* MTU moved to Advanced BGP Configuration section */}
            </div>
          </div>

          {/* Advanced BGP Configuration */}
          <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-fw-wash rounded-lg">
                <Activity className="h-5 w-5 text-fw-link" />
              </div>
              <div>
                <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Advanced BGP Configuration</h4>
                <p className="text-figma-sm text-fw-bodyLight">Configure BGP routing, subnets, and path attributes</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    BGP Authentication Key
                    <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('bgpKey')} onMouseLeave={() => setShowTooltip(null)}>
                      <Info className="h-4 w-4 inline" />
                    </button>
                  </label>
                  {showTooltip === 'bgpKey' && (
                    <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                      Shared secret for BGP session authentication. Coordinate with your network team and cloud provider.
                    </div>
                  )}
                  <input
                    type="password"
                    value={config.configuration?.bgpAuthKey || ''}
                    onChange={(e) => handleConfigChange('bgpAuthKey', e.target.value)}
                    placeholder="Enter BGP authentication key"
                    className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  />
                </div>

                <div className="relative">
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    MTU Size
                    <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('mtuSelect')} onMouseLeave={() => setShowTooltip(null)}>
                      <Info className="h-4 w-4 inline" />
                    </button>
                  </label>
                  {showTooltip === 'mtuSelect' && (
                    <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                      {getMtuTooltip()}
                    </div>
                  )}
                  <select
                    value={config.configuration?.mtuSize || '1500'}
                    onChange={(e) => handleConfigChange('mtuSize', e.target.value)}
                    disabled={config.provider === 'AWS' || config.providers?.includes('AWS' as CloudProvider)}
                    className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base disabled:bg-fw-wash disabled:cursor-not-allowed"
                  >
                    <option value="1500">1500 (Standard)</option>
                    <option value="9000">9000 (Jumbo Frames)</option>
                  </select>
                  {(config.provider === 'AWS' || config.providers?.includes('AWS' as CloudProvider)) && (
                    <p className="mt-1 text-figma-xs text-fw-bodyLight">Auto-set by AWS VIF type selection</p>
                  )}
                </div>
              </div>

              {/* Google assigns BGP peering IPs - customer only provides ASN */}
              {(config.provider === 'Google' || config.providers?.includes('Google' as CloudProvider)) ? (
                <div className="bg-fw-accent rounded-lg p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-fw-link shrink-0 mt-0.5" />
                  <div>
                    <p className="text-figma-sm font-medium text-fw-heading">Google Cloud assigns BGP peering IPs</p>
                    <p className="text-figma-xs text-fw-bodyLight mt-1">
                      For Google Cloud Interconnect, BGP session IP addresses are automatically assigned by Google. You only need to provide your ASN (configured above).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      Customer Subnet
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('custSubnet')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'custSubnet' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Your side of the BGP peering subnet in CIDR notation. Typically a /30 or /31.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.customerSubnet || ''}
                      onChange={(e) => handleConfigChange('customerSubnet', e.target.value)}
                      placeholder="e.g., 192.168.1.1/30"
                      className={`w-full px-3 h-10 rounded-lg border shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono ${
                        config.configuration?.customerSubnet && !validateSubnet(config.configuration.customerSubnet)
                          ? 'border-fw-error'
                          : 'border-fw-primary'
                      }`}
                    />
                    {config.configuration?.customerSubnet && !validateSubnet(config.configuration.customerSubnet) && (
                      <p className="mt-1 text-figma-xs text-fw-error">Invalid CIDR format</p>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      Provider Subnet
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('provSubnet')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'provSubnet' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Provider side of the BGP peering subnet. Assigned by the cloud provider.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.providerSubnet || ''}
                      onChange={(e) => handleConfigChange('providerSubnet', e.target.value)}
                      placeholder="e.g., 192.168.1.2/30"
                      className={`w-full px-3 h-10 rounded-lg border shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono ${
                        config.configuration?.providerSubnet && !validateSubnet(config.configuration.providerSubnet)
                          ? 'border-fw-error'
                          : 'border-fw-primary'
                      }`}
                    />
                    {config.configuration?.providerSubnet && !validateSubnet(config.configuration.providerSubnet) && (
                      <p className="mt-1 text-figma-xs text-fw-error">Invalid CIDR format</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">Local Preference</label>
                  <input
                    type="number"
                    value={config.configuration?.localPreference ?? 100}
                    onChange={(e) => handleConfigChange('localPreference', parseInt(e.target.value) || 100)}
                    className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  />
                </div>

                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">Prefix Limit</label>
                  <input
                    type="number"
                    value={config.configuration?.prefixLimit ?? 1000}
                    onChange={(e) => handleConfigChange('prefixLimit', parseInt(e.target.value) || 1000)}
                    className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">Community String</label>
                <input
                  type="text"
                  value={config.configuration?.communityString || ''}
                  onChange={(e) => handleConfigChange('communityString', e.target.value)}
                  placeholder="e.g., 65001:100"
                  className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                />
              </div>

              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">Route Filter</label>
                <select
                  value={config.configuration?.routeFilter || 'PERMIT_ALL'}
                  onChange={(e) => handleConfigChange('routeFilter', e.target.value)}
                  className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                >
                  <option value="PERMIT_ALL">Permit All Routes</option>
                  <option value="CUSTOMER_ONLY">Customer Routes Only</option>
                  <option value="CUSTOM">Custom Filter Policy</option>
                </select>
              </div>

              <div className="relative">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.configuration?.bfdEnabled || false}
                    onChange={(e) => handleConfigChange('bfdEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-fw-secondary text-brand-blue focus:ring-fw-active"
                  />
                  <span className="text-figma-base font-medium text-fw-body">
                    Enable BFD (Bidirectional Forwarding Detection)
                  </span>
                </label>
              </div>

              {/* BGP/BFD warnings */}
              {config.configuration?.bfdEnabled && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-fw-warningLight border border-fw-warning">
                  <AlertTriangle className="h-4 w-4 text-fw-warning shrink-0 mt-0.5" />
                  <div className="text-figma-xs text-fw-body">
                    <p className="font-medium">BFD + Graceful Restart Conflict</p>
                    <p className="mt-0.5">Do NOT enable BGP graceful restart when BFD is active. Graceful restart delays convergence and defeats BFD's sub-second failover. AWS minimum BFD: 300ms interval, multiplier 3 (900ms detection).</p>
                  </div>
                </div>
              )}

              {config.configuration?.peerAsn === 'private' && config.provider === 'AWS' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-fw-warningLight border border-fw-warning">
                  <AlertTriangle className="h-4 w-4 text-fw-warning shrink-0 mt-0.5" />
                  <div className="text-figma-xs text-fw-body">
                    <p className="font-medium">Private ASN Limitation</p>
                    <p className="mt-0.5">AWS strips private ASNs and replaces them with 7224 on public VIFs. AS path prepending will not work with a private ASN.</p>
                  </div>
                </div>
              )}

              <div className="bg-fw-wash rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Activity className="w-5 h-5 mt-0.5 text-fw-link" />
                  <div>
                    <h4 className="font-semibold text-fw-heading text-figma-base mb-1">Advanced Network Configuration</h4>
                    <p className="text-fw-bodyLight text-figma-sm">
                      Ensure all BGP values are coordinated with your network team and cloud providers before provisioning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Azure ExpressRoute SKU (separate from resiliency) */}
          {(config.provider === 'Azure' || config.providers?.includes('Azure' as CloudProvider)) && (
            <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-fw-accent flex items-center justify-center">
                  <Globe className="h-5 w-5 text-fw-link" />
                </div>
                <div>
                  <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">ExpressRoute SKU</h4>
                  <p className="text-figma-sm text-fw-bodyLight">Determines which Azure regions your Connection can reach. Separate from resiliency level.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'local', title: 'Local', desc: 'One Azure region near your peering location. Metered data included in price.' },
                  { value: 'standard', title: 'Standard', desc: 'All Azure regions in your geopolitical area (e.g., all of North America).' },
                  { value: 'premium', title: 'Premium', desc: 'Global access across all Azure regions worldwide.' },
                ].map(sku => {
                  const isSelected = (config.configuration?.azureSku || 'standard') === sku.value;
                  return (
                    <button
                      key={sku.value}
                      onClick={() => handleConfigChange('azureSku', sku.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-fw-active bg-fw-accent'
                          : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50'
                      }`}
                    >
                      <p className={`text-figma-base font-semibold mb-1 ${isSelected ? 'text-fw-link' : 'text-fw-heading'}`}>
                        {sku.title}
                      </p>
                      <p className="text-figma-xs text-fw-bodyLight">{sku.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-fw-wash rounded-lg">
                <Settings className="h-5 w-5 text-fw-purple" />
              </div>
              <div>
                <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Service Configuration</h4>
                <p className="text-figma-sm text-fw-bodyLight">Configure service-specific settings</p>
              </div>
            </div>

            <div className="space-y-6">
              {(config.provider === 'AWS' || config.providers?.includes('AWS' as CloudProvider)) && (
                <div className="relative">
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    VIF Type
                    <button
                      className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                      onMouseEnter={() => setShowTooltip('vif')}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <Info className="h-4 w-4 inline" />
                    </button>
                  </label>
                  {showTooltip === 'vif' && (
                    <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                      Virtual Interface type determines how your connection interfaces with AWS services. Private for VPC access, Public for internet services, or Transit for use with Transit Gateway.
                    </div>
                  )}
                  <select
                    value={config.configuration?.vifType || 'private'}
                    onChange={(e) => handleConfigChange('vifType', e.target.value)}
                    className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  >
                    <option value="internet">internet</option>
                    <option value="L3VPN">L3VPN</option>
                    <option value="private">private</option>
                    <option value="3rd party internet">3rd party internet</option>
                    <option value="ethernet">ethernet</option>
                  </select>
                </div>
              )}

              {/* Azure-specific fields */}
              {(config.provider === 'Azure' || config.providers?.includes('Azure' as CloudProvider)) && (
                <>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      Azure Subscription ID
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('azureSub')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'azureSub' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Your Azure subscription GUID for ExpressRoute billing and resource management.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.azureSubscriptionId || ''}
                      onChange={(e) => handleConfigChange('azureSubscriptionId', e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      ExpressRoute Service Key
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('erKey')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'erKey' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        The service key from your Azure ExpressRoute circuit. Find it in the Azure portal under your circuit's properties.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.expressRouteCircuitKey || ''}
                      onChange={(e) => handleConfigChange('expressRouteCircuitKey', e.target.value)}
                      placeholder="Azure ExpressRoute service key"
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                    />
                  </div>
                </>
              )}

              {/* Google Cloud-specific fields */}
              {(config.provider === 'Google' || config.providers?.includes('Google' as CloudProvider)) && (
                <>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      Interconnect Type
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('gcpType')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'gcpType' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Dedicated provides a physical connection. Partner uses AT&T as an intermediary for smaller bandwidth needs.
                      </div>
                    )}
                    <select
                      value={config.configuration?.gcpInterconnectType || 'partner'}
                      onChange={(e) => handleConfigChange('gcpInterconnectType', e.target.value)}
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                    >
                      <option value="dedicated">Dedicated Interconnect</option>
                      <option value="partner">Partner Interconnect</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      Pairing Key
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('gcpKey')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'gcpKey' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Generated in Google Cloud Console when creating a VLAN attachment. Required for Partner Interconnect.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.gcpPairingKey || ''}
                      onChange={(e) => handleConfigChange('gcpPairingKey', e.target.value)}
                      placeholder="GCP pairing key"
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                    />
                  </div>
                </>
              )}

              {/* Oracle-specific fields */}
              {(config.provider === 'Oracle' || config.providers?.includes('Oracle' as CloudProvider)) && (
                <>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      Oracle OCID
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('ocid')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'ocid' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Oracle Cloud Identifier for your FastConnect virtual circuit.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.oracleOcid || ''}
                      onChange={(e) => handleConfigChange('oracleOcid', e.target.value)}
                      placeholder="ocid1.virtualcircuit.oc1..."
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">Compartment ID</label>
                    <input
                      type="text"
                      value={config.configuration?.oracleCompartmentId || ''}
                      onChange={(e) => handleConfigChange('oracleCompartmentId', e.target.value)}
                      placeholder="ocid1.compartment.oc1..."
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-figma-base font-medium text-fw-body mb-2">
                      DRG ID
                      <button className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight" onMouseEnter={() => setShowTooltip('drg')} onMouseLeave={() => setShowTooltip(null)}>
                        <Info className="h-4 w-4 inline" />
                      </button>
                    </label>
                    {showTooltip === 'drg' && (
                      <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                        Dynamic Routing Gateway ID. The DRG is the single entry point for private traffic to your VCN over FastConnect.
                      </div>
                    )}
                    <input
                      type="text"
                      value={config.configuration?.oracleDrgId || ''}
                      onChange={(e) => handleConfigChange('oracleDrgId', e.target.value)}
                      placeholder="ocid1.drg.oc1..."
                      className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base font-mono"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Service Access Type
                  <button
                    className="ml-2 text-fw-bodyLight hover:text-fw-bodyLight"
                    onMouseEnter={() => setShowTooltip('access')}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <Info className="h-4 w-4 inline" />
                  </button>
                </label>
                {showTooltip === 'access' && (
                  <div className="absolute z-10 w-72 px-3 py-2 bg-fw-heading text-white text-figma-base rounded-lg -top-2 left-full ml-2">
                    Specifies the sub-type of service access for specialized network configurations and use cases.
                  </div>
                )}
                <select
                  value={config.configuration?.serviceAccessType || 'internet'}
                  onChange={(e) => handleConfigChange('serviceAccessType', e.target.value)}
                  className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                >
                  <option value="internet">Internet</option>
                  <option value="l3vmp">L3VMP</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Network Config Upload */}
          {(config.providers?.length || 0) > 0 && (
            <NetworkConfigUpload
              providers={config.providers || []}
              uploadedConfigs={uploadedConfigs}
              onConfigUploaded={(pid, cfg) => setUploadedConfigs(prev => ({ ...prev, [pid]: cfg }))}
              onConfigRemoved={(pid) => setUploadedConfigs(prev => { const next = { ...prev }; delete next[pid]; return next; })}
            />
          )}

          {/* Provider Configuration */}
          {(config.providers?.length || 0) > 0 && (
            <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-fw-accent rounded-lg">
                  <Globe className="h-5 w-5 text-brand-blue" />
                </div>
                <div>
                  <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Provider Configuration</h4>
                  <p className="text-figma-sm text-fw-bodyLight">Enter credentials for each selected cloud provider</p>
                </div>
              </div>

              <div className="space-y-6">
                {config.providers?.map((providerId) => {
                  const providerConfig = PROVIDER_CREDENTIALS[providerId];
                  if (!providerConfig) return null;
                  const fields = providerConfig.requiredInfo;

                  return (
                    <div key={providerId} className="border border-fw-secondary rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-figma-base font-semibold text-fw-heading">{providerId}</span>
                          <span className="px-2 py-0.5 bg-fw-wash text-fw-bodyLight rounded-full text-figma-xs">
                            {fields.length} required fields
                          </span>
                        </div>
                        <button
                          onClick={() => window.open(providerConfig.consoleUrl, '_blank')}
                          className="text-figma-sm text-fw-link hover:underline font-medium"
                        >
                          Open {providerConfig.consoleName} →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map((field) => {
                          const fieldKey = `${providerId.toLowerCase().replace(/\s+/g, '_')}_${field.toLowerCase().replace(/\s+/g, '_')}`;
                          const secret = isSecretField(field);
                          return (
                            <div key={field}>
                              <label className="block text-figma-sm font-medium text-fw-body mb-1">
                                {field}
                                {secret && <Shield className="inline h-3.5 w-3.5 ml-1 text-fw-warning" />}
                              </label>
                              <input
                                type={secret ? 'password' : 'text'}
                                value={config.configuration?.[fieldKey] || ''}
                                onChange={(e) => handleConfigChange(fieldKey, e.target.value)}
                                placeholder={`Enter your ${field.toLowerCase()}`}
                                className="w-full px-3 h-10 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t border-fw-secondary flex items-center gap-2 text-figma-xs text-fw-bodyLight">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Credentials are encrypted and secure</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cloud-to-Cloud Specific Settings */}
          {config.type === 'Cloud to Cloud' && (
            <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-fw-accent flex items-center justify-center">
                  <Network className="h-5 w-5 text-fw-link" />
                </div>
                <div>
                  <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Cloud-to-Cloud Peering</h4>
                  <p className="text-figma-sm text-fw-bodyLight">Configure private backbone connectivity between cloud environments</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">Peering Type</label>
                  <select
                    value={config.configuration?.peeringType || 'private'}
                    onChange={(e) => handleConfigChange('peeringType', e.target.value)}
                    className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  >
                    <option value="private">Private Backbone Transit</option>
                    <option value="direct">Direct Cloud Peering</option>
                    <option value="exchange">Cloud Exchange</option>
                  </select>
                </div>

                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">Encryption Mode</label>
                  <select
                    value={config.configuration?.encryptionMode || 'ipsec'}
                    onChange={(e) => handleConfigChange('encryptionMode', e.target.value)}
                    className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  >
                    <option value="ipsec">IPSec Tunnel</option>
                    <option value="macsec" disabled>MACsec (Layer 2) — Available at GA</option>
                    <option value="none">No Encryption (Private Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">Route Exchange</label>
                  <select
                    value={config.configuration?.routeExchange || 'full'}
                    onChange={(e) => handleConfigChange('routeExchange', e.target.value)}
                    className="w-full px-3 h-9 rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                  >
                    <option value="full">Full Route Table Exchange</option>
                    <option value="partial">Partial (Filtered Routes)</option>
                    <option value="default">Default Route Only</option>
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* Security & Monitoring */}
          <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-fw-errorLight rounded-lg">
                <Shield className="h-5 w-5 text-fw-error" />
              </div>
              <div>
                <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Security & Monitoring</h4>
                <p className="text-figma-sm text-fw-bodyLight">Enable protection and observability features</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border border-fw-secondary hover:bg-fw-wash transition-colors cursor-pointer">
                <div>
                  <span className="text-figma-base font-medium text-fw-body block">DDoS Protection</span>
                  <span className="text-figma-xs text-fw-bodyLight">AT&T managed DDoS mitigation for inbound traffic</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.configuration?.ddosProtection || false}
                  onChange={(e) => handleConfigChange('ddosProtection', e.target.checked)}
                  className="h-4 w-4 rounded border-fw-secondary text-brand-blue focus:ring-fw-active"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-fw-secondary hover:bg-fw-wash transition-colors cursor-pointer">
                <div>
                  <span className="text-figma-base font-medium text-fw-body block">Advanced Monitoring</span>
                  <span className="text-figma-xs text-fw-bodyLight">Real-time metrics, alerting, and traffic analytics</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.configuration?.advancedMonitoring || false}
                  onChange={(e) => handleConfigChange('advancedMonitoring', e.target.checked)}
                  className="h-4 w-4 rounded border-fw-secondary text-brand-blue focus:ring-fw-active"
                />
              </label>
            </div>
          </div>
        </div>

      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-fw-base rounded-xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-fw-secondary flex items-center justify-between">
              <h3 className="text-figma-lg font-medium text-fw-heading tracking-[-0.03em]">Bulk Import Subnets</h3>
              <button
                onClick={() => setShowBulkImport(false)}
                className="text-fw-bodyLight hover:text-fw-body"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-figma-base text-fw-bodyLight">
                  Enter one subnet per line in CIDR notation (e.g., 192.168.1.0/24).
                  You can paste directly from a spreadsheet or text file.
                </p>
              </div>

              <textarea
                value={bulkSubnets}
                onChange={(e) => setBulkSubnets(e.target.value)}
                placeholder="192.168.1.0/24&#10;192.168.2.0/24&#10;192.168.3.0/24"
                rows={10}
                className="w-full rounded-lg border border-fw-primary shadow-sm focus:border-fw-active focus:ring-fw-active font-mono text-figma-base"
              />

              {bulkImportError && (
                <div className="mt-4 p-3 bg-fw-errorLight rounded-lg flex items-start">
                  <AlertTriangle className="h-5 w-5 text-fw-error mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-figma-base text-fw-error">{bulkImportError}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="px-4 py-2 text-figma-base font-medium text-fw-body bg-fw-base border border-fw-secondary rounded-lg hover:bg-fw-wash"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  className="px-4 py-2 text-figma-base font-medium text-white bg-brand-blue rounded-full hover:bg-brand-darkBlue"
                >
                  Import Subnets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}