import { useState, useEffect } from 'react';
import { Network, Activity, Shield, Server, PanelRight, Menu, Database, Router, Cloud, Globe, Lock, Feather as Ethernet, Wifi, MapPin } from 'lucide-react';
import { NetworkNode } from '../types';
import { FloatingPanel } from './FloatingPanel';
import {
  getCloudRegionLocations,
  getDatacenterLocations,
  getCloudProviders,
  getDatacenterProviders,
  type CloudRegionLocation,
  type DatacenterLocation
} from '../../services/locationService';

interface NodeConfigPanelProps {
  node: NetworkNode;
  isVisible: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<NetworkNode>) => void;
  onDelete: (nodeId: string) => void;
  hubRef: React.RefObject<HTMLElement>;
}

export function NodeConfigPanel({
  node,
  isVisible,
  onClose,
  onUpdate,
  onDelete,
  hubRef
}: NodeConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'connectivity' | 'routing' | 'security'>('connectivity');
  const [cloudRegions, setCloudRegions] = useState<CloudRegionLocation[]>([]);
  const [datacenterLocations, setDatacenterLocations] = useState<DatacenterLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setActiveTab('connectivity');
      loadLocationData();
    }
  }, [isVisible, node.type]);

  const loadLocationData = async () => {
    setLoadingLocations(true);
    try {
      if (node.type === 'destination') {
        const provider = node.config?.provider || 'AWS';
        const regions = await getCloudRegionLocations(provider);
        setCloudRegions(regions);
      } else if (node.type === 'datacenter') {
        const locations = await getDatacenterLocations();
        setDatacenterLocations(locations);
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleProviderChange = async (provider: string) => {
    handleConfigChange('provider', provider);

    if (node.type === 'destination') {
      setLoadingLocations(true);
      try {
        const regions = await getCloudRegionLocations(provider);
        setCloudRegions(regions);
      } catch (error) {
        console.error('Error loading regions:', error);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleRegionChange = (regionCode: string) => {
    const region = cloudRegions.find(r => r.region_code === regionCode);
    if (region) {
      onUpdate({
        config: {
          ...node.config,
          region: regionCode,
          city: region.city,
          state: region.state || undefined,
          country: region.country,
          latitude: Number(region.latitude),
          longitude: Number(region.longitude)
        }
      });
    }
  };

  const handleDatacenterChange = (facilityCode: string) => {
    const location = datacenterLocations.find(
      l => l.facility_code === facilityCode && l.provider === node.config?.provider
    );
    if (location) {
      onUpdate({
        config: {
          ...node.config,
          facilityCode: location.facility_code,
          location: `${location.city}, ${location.state || location.country}`,
          city: location.city,
          state: location.state || undefined,
          country: location.country,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude)
        }
      });
    }
  };

  if (!node) return null;

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      config: {
        ...node.config,
        [key]: value
      }
    });
  };

  // Helper to get network type icon
  const getNetworkTypeIcon = (networkType: string) => {
    switch (networkType?.toLowerCase()) {
      case 'internet': return Globe;
      case 'vpn': return Lock;
      case 'ethernet': return Ethernet;
      case 'iot': return Wifi;
      default: return Network;
    }
  };

  // Helper for icon update - removed type change functionality
  const handleNetworkTypeChange = (networkType: string) => {
    // Update config
    handleConfigChange('networkType', networkType);
  };

  const tabs = [
    { id: 'connectivity', label: 'Connectivity', icon: Network },
    { id: 'routing', label: 'Routing', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  // Helper to get the proper title based on node type
  const getNodeTitle = () => {
    if (node.type === 'function' && node.functionType) {
      return `${node.functionType} Configuration`;
    }
    
    if (node.type === 'network' && node.config?.networkType) {
      const networkType = node.config.networkType;
      return `${networkType.charAt(0).toUpperCase() + networkType.slice(1)} Configuration`;
    }
    
    return `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} Configuration`;
  };

  // Helper to get function-specific fields
  const getFunctionFields = () => {
    if (node.type !== 'function' || !node.functionType) return null;
    
    switch (node.functionType) {
      case 'SDWAN':
        return (
          <>
            <div className="form-group">
              <label htmlFor="sdwanRole">SD-WAN Role</label>
              <select
                id="sdwanRole"
                value={node.config?.sdwanRole || 'edge'}
                onChange={(e) => handleConfigChange('sdwanRole', e.target.value)}
                className="form-select"
              >
                <option value="edge">Edge Device</option>
                <option value="controller">Controller</option>
                <option value="orchestrator">Orchestrator</option>
                <option value="hub">Hub</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tunnelProtocol">Tunnel Protocol</label>
              <select
                id="tunnelProtocol"
                value={node.config?.tunnelProtocol || 'ipsec'}
                onChange={(e) => handleConfigChange('tunnelProtocol', e.target.value)}
                className="form-select"
              >
                <option value="ipsec">IPsec</option>
                <option value="gre">GRE</option>
                <option value="vxlan">VXLAN</option>
                <option value="proprietary">Proprietary</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="trafficPolicies">Traffic Policies</label>
              <textarea
                id="trafficPolicies"
                value={node.config?.trafficPolicies || ''}
                onChange={(e) => handleConfigChange('trafficPolicies', e.target.value)}
                rows={2}
                placeholder="Enter traffic policies or rules"
                className="form-textarea"
              />
            </div>
          </>
        );
      
      case 'Firewall':
        return (
          <>
            <div className="form-group">
              <label htmlFor="firewallType">Firewall Type</label>
              <select
                id="firewallType"
                value={node.config?.firewallType || 'ngfw'}
                onChange={(e) => handleConfigChange('firewallType', e.target.value)}
                className="form-select"
              >
                <option value="ngfw">Next-Gen Firewall</option>
                <option value="waf">Web Application Firewall</option>
                <option value="stateful">Stateful Firewall</option>
                <option value="ids_ips">IDS/IPS</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="deploymentMode">Deployment Mode</label>
              <select
                id="deploymentMode"
                value={node.config?.deploymentMode || 'inline'}
                onChange={(e) => handleConfigChange('deploymentMode', e.target.value)}
                className="form-select"
              >
                <option value="inline">Inline</option>
                <option value="tap">TAP/Monitor</option>
                <option value="proxy">Proxy</option>
              </select>
            </div>
            <div className="toggle-group">
              <input
                id="dpi"
                type="checkbox"
                checked={node.config?.dpi || false}
                onChange={(e) => handleConfigChange('dpi', e.target.checked)}
                className="toggle-input"
              />
              <label htmlFor="dpi" className="toggle-label">
                <span className="toggle-text">Deep Packet Inspection</span>
              </label>
            </div>
          </>
        );
      
      case 'VNAT':
        return (
          <>
            <div className="form-group">
              <label htmlFor="natType">NAT Type</label>
              <select
                id="natType"
                value={node.config?.natType || 'static'}
                onChange={(e) => handleConfigChange('natType', e.target.value)}
                className="form-select"
              >
                <option value="static">Static NAT</option>
                <option value="dynamic">Dynamic NAT</option>
                <option value="pat">PAT (Port Address Translation)</option>
                <option value="cgnat">CGNAT</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ipPool">IP Pool</label>
              <input
                id="ipPool"
                type="text"
                value={node.config?.ipPool || ''}
                onChange={(e) => handleConfigChange('ipPool', e.target.value)}
                placeholder="e.g., 203.0.113.0/24"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="translationRules">Translation Rules</label>
              <textarea
                id="translationRules"
                value={node.config?.translationRules || ''}
                onChange={(e) => handleConfigChange('translationRules', e.target.value)}
                rows={2}
                placeholder="Enter translation rules"
                className="form-textarea"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'connectivity':
        return (
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="nodeName">Node Name</label>
              <input
                id="nodeName"
                type="text"
                value={node.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="form-input"
              />
            </div>
            
            {node.type === 'function' && (
              <>{getFunctionFields()}</>
            )}

            {node.type === 'destination' && (
              <>
                <div className="form-group">
                  <label htmlFor="provider">Cloud Provider</label>
                  <select
                    id="provider"
                    value={node.config?.provider || 'AWS'}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="form-select"
                  >
                    {getCloudProviders().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="region">Region</label>
                  <select
                    id="region"
                    value={node.config?.region || ''}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="form-select"
                    disabled={loadingLocations}
                  >
                    <option value="">Select a region...</option>
                    {cloudRegions.map(region => (
                      <option key={region.region_code} value={region.region_code}>
                        {region.region_name}
                      </option>
                    ))}
                  </select>
                </div>
                {node.config?.city && (
                  <div className="form-group">
                    <label className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      Location
                    </label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {node.config.city}{node.config.state ? `, ${node.config.state}` : ''}, {node.config.country}
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="vpcId">VPC/VNET ID</label>
                  <input
                    id="vpcId"
                    type="text"
                    value={node.config?.vpcId || ''}
                    onChange={(e) => handleConfigChange('vpcId', e.target.value)}
                    placeholder="e.g., vpc-0a1b2c3d4e"
                    className="form-input"
                  />
                </div>
              </>
            )}

            {node.type === 'datacenter' && (
              <>
                <div className="form-group">
                  <label htmlFor="dcProvider">Datacenter Provider</label>
                  <select
                    id="dcProvider"
                    value={node.config?.provider || 'Equinix'}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="form-select"
                  >
                    {getDatacenterProviders().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="facility">Facility</label>
                  <select
                    id="facility"
                    value={node.config?.facilityCode || ''}
                    onChange={(e) => handleDatacenterChange(e.target.value)}
                    className="form-select"
                    disabled={loadingLocations}
                  >
                    <option value="">Select a facility...</option>
                    {datacenterLocations
                      .filter(loc => loc.provider === (node.config?.provider || 'Equinix'))
                      .map(location => (
                        <option key={location.facility_code} value={location.facility_code}>
                          {location.facility_code} - {location.city}, {location.state || location.country}
                        </option>
                      ))}
                  </select>
                </div>
                {node.config?.city && (
                  <div className="form-group">
                    <label className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      Location
                    </label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {node.config.city}{node.config.state ? `, ${node.config.state}` : ''}, {node.config.country}
                    </div>
                  </div>
                )}
              </>
            )}

            {node.type === 'network' && (
              <>
                <div className="form-group">
                  <label htmlFor="subnet">Subnet Range</label>
                  <input
                    id="subnet"
                    type="text"
                    value={node.config?.subnet || ''}
                    onChange={(e) => handleConfigChange('subnet', e.target.value)}
                    placeholder="e.g., 10.0.0.0/16"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vlanId">VLAN ID</label>
                  <input
                    id="vlanId"
                    type="number"
                    value={node.config?.vlanId || ''}
                    onChange={(e) => handleConfigChange('vlanId', e.target.value)}
                    placeholder="1-4094"
                    min="1"
                    max="4094"
                    className="form-input"
                  />
                </div>
              </>
            )}
            
            <div className="toggle-group">
              <input
                id="status"
                type="checkbox"
                checked={node.status === 'active'}
                onChange={(e) => onUpdate({
                  status: e.target.checked ? 'active' : 'inactive'
                })}
                className="toggle-input"
              />
              <label htmlFor="status" className="toggle-label">
                <span className="toggle-text">Node Active</span>
              </label>
            </div>
          </div>
        );

      case 'routing':
        return (
          <div className="form-section">
            {(node.type === 'function' && node.functionType === 'Router') && (
              <>
                <div className="form-group">
                  <label htmlFor="asn">ASN</label>
                  <input
                    type="number"
                    value={node.config?.asn || ''}
                    onChange={(e) => handleConfigChange('asn', parseInt(e.target.value))}
                    placeholder="e.g., 65000"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bgpConfig">BGP Configuration</label>
                  <textarea
                    value={node.config?.bgpConfig || ''}
                    onChange={(e) => handleConfigChange('bgpConfig', e.target.value)}
                    rows={3}
                    className="form-textarea"
                    placeholder="Enter BGP configuration"
                  />
                </div>
              </>
            )}
            
            {node.type === 'destination' && (
              <>
                <div className="form-group">
                  <label htmlFor="vpcId">VPC/VNET</label>
                  <input
                    type="text"
                    value={node.config?.vpcId || ''}
                    onChange={(e) => handleConfigChange('vpcId', e.target.value)}
                    placeholder="e.g., vpc-12345"
                    className="form-input"
                  />
                </div>
              </>
            )}
            
            {node.type === 'network' && (
              <>
                <div className="form-group">
                  <label htmlFor="subnet">Subnet</label>
                  <input
                    type="text"
                    value={node.config?.subnet || ''}
                    onChange={(e) => handleConfigChange('subnet', e.target.value)}
                    placeholder="e.g., 10.0.0.0/16"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="routeDistribution">Route Distribution</label>
                  <select
                    value={node.config?.routeDistribution || 'none'}
                    onChange={(e) => handleConfigChange('routeDistribution', e.target.value)}
                    className="form-select"
                  >
                    <option value="none">None</option>
                    <option value="ospf">OSPF</option>
                    <option value="eigrp">EIGRP</option>
                    <option value="rip">RIP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="routeAdvertisement">Route Advertisement</label>
                  <input
                    type="text"
                    value={node.config?.routeAdvertisement || ''}
                    onChange={(e) => handleConfigChange('routeAdvertisement', e.target.value)}
                    placeholder="e.g., 10.0.0.0/8"
                    className="form-input"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="form-section">
            {node.type === 'destination' && (
              <>
                <div className="form-group">
                  <label htmlFor="cloudSecurity">Cloud Security</label>
                  <select
                    value={node.config?.cloudSecurity || 'standard'}
                    onChange={(e) => handleConfigChange('cloudSecurity', e.target.value)}
                    className="form-select"
                  >
                    <option value="standard">Standard Security</option>
                    <option value="enhanced">Enhanced Security</option>
                    <option value="custom">Custom Security</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="complianceLevel">Compliance Level</label>
                  <select
                    value={node.config?.complianceLevel || 'standard'}
                    onChange={(e) => handleConfigChange('complianceLevel', e.target.value)}
                    className="form-select"
                  >
                    <option value="standard">Standard</option>
                    <option value="hipaa">HIPAA</option>
                    <option value="pci">PCI DSS</option>
                    <option value="sox">SOX</option>
                    <option value="gdpr">GDPR</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="networkAcls">Network ACLs</label>
                  <textarea
                    value={node.config?.networkAcls || ''}
                    onChange={(e) => handleConfigChange('networkAcls', e.target.value)}
                    rows={2}
                    className="form-textarea"
                    placeholder="Enter network ACLs"
                  />
                </div>
              </>
            )}
            
            {(node.type === 'function' && node.functionType === 'Router') && (
              <>
                <div className="form-group">
                  <label htmlFor="accessLists">Access Lists</label>
                  <textarea
                    value={node.config?.accessLists || ''}
                    onChange={(e) => handleConfigChange('accessLists', e.target.value)}
                    rows={3}
                    className="form-textarea"
                    placeholder="Enter ACL rules"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="controlPlaneProtection">Control Plane Protection</label>
                  <select
                    value={node.config?.controlPlaneProtection || 'standard'}
                    onChange={(e) => handleConfigChange('controlPlaneProtection', e.target.value)}
                    className="form-select"
                  >
                    <option value="standard">Standard Protection</option>
                    <option value="enhanced">Enhanced Protection</option>
                    <option value="custom">Custom Protection</option>
                  </select>
                </div>
              </>
            )}
            
            {node.type === 'network' && (
              <>
                <div className="form-group">
                  <label htmlFor="accessControl">Access Control</label>
                  <select
                    value={node.config?.accessControl || 'private'}
                    onChange={(e) => handleConfigChange('accessControl', e.target.value)}
                    className="form-select"
                  >
                    <option value="private">Private Access</option>
                    <option value="public">Public Access</option>
                    <option value="restricted">Restricted Access</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="securityGroups">Security Groups</label>
                  <input
                    type="text"
                    value={node.config?.securityGroups || ''}
                    onChange={(e) => handleConfigChange('securityGroups', e.target.value)}
                    placeholder="e.g., sg-123456"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="networkSecurity">Network Security</label>
                  <select
                    value={node.config?.networkSecurity || 'standard'}
                    onChange={(e) => handleConfigChange('networkSecurity', e.target.value)}
                    className="form-select"
                  >
                    <option value="standard">Standard Security</option>
                    <option value="enhanced">Enhanced Security</option>
                    <option value="custom">Custom Security</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="firewallRules">Firewall Rules</label>
                  <textarea
                    value={node.config?.firewallRules || ''}
                    onChange={(e) => handleConfigChange('firewallRules', e.target.value)}
                    rows={3}
                    className="form-textarea"
                    placeholder="Enter firewall rules"
                  />
                </div>
              </>
            )}
            
            {node.type === 'datacenter' && (
              <>
                <div className="form-group">
                  <label htmlFor="securityControls">Security Controls</label>
                  <select
                    value={node.config?.securityControls || 'standard'}
                    onChange={(e) => handleConfigChange('securityControls', e.target.value)}
                    className="form-select"
                  >
                    <option value="standard">Standard Controls</option>
                    <option value="enhanced">Enhanced Controls</option>
                    <option value="custom">Custom Controls</option>
                  </select>
                </div>
                <div className="toggle-group">
                  <input
                    id="physicalSecurity"
                    type="checkbox"
                    checked={node.config?.physicalSecurity || false}
                    onChange={(e) => handleConfigChange('physicalSecurity', e.target.checked)}
                    className="toggle-input"
                  />
                  <label htmlFor="physicalSecurity" className="toggle-label">
                    <span className="toggle-text">Enhanced Physical Security</span>
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="dcCompliance">Compliance</label>
                  <select
                    value={node.config?.dcCompliance || 'tier3'}
                    onChange={(e) => handleConfigChange('dcCompliance', e.target.value)}
                    className="form-select"
                  >
                    <option value="tier3">Tier III</option>
                    <option value="tier4">Tier IV</option>
                    <option value="soc2">SOC 2</option>
                    <option value="iso27001">ISO 27001</option>
                  </select>
                </div>
              </>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <FloatingPanel
      title={getNodeTitle()}
      isVisible={isVisible}
      onClose={onClose}
      anchorPosition={{ x: node.x, y: node.y }}
      hubRef={hubRef}
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4 sticky top-0 bg-white z-10">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center px-3 py-2 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors ${activeTab === tab.id ? 'text-blue-600 border-blue-500' : ''}`}
                type="button"
              >
                <TabIcon className="h-3.5 w-3.5 mr-1.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Tab Content - Scrollable area */}
        <div className="overflow-y-auto custom-scrollbar">
          {renderTabContent()}
        </div>
        
        {/* Delete Button */}
        <div className="pt-4 border-t border-gray-200 mt-4 sticky bottom-0 bg-white">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
              onClose();
            }}
            className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
            type="button"
          >
            Delete Node
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}