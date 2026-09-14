import { useState } from 'react';
import { Shield, ServerCog, Network, Globe, Clock, Info, MoreVertical, Activity, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { VNF } from '../../../types/vnf';
import { OverflowMenu } from '../../common/OverflowMenu';
import { Hub } from '../../../types/hub';

interface VNFCardProps {
  vnf: VNF;
  hub?: Hub;
  onEdit: () => void;
  onDelete: () => void;
}

export function VNFCard({ vnf, hub, onEdit, onDelete }: VNFCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  
  // Define icon based on VNF type
  const getIcon = () => {
    switch(vnf.type) {
      case 'firewall':
        return <Shield className="h-8 w-8 text-fw-error" />;
      case 'sdwan':
        return <Globe className="h-8 w-8 text-fw-bodyLight" />;
      case 'router':
        return <AttIcon name="hub" className="h-8 w-8 text-fw-bodyLight" />;
      case 'vnat':
        return <Network className="h-8 w-8 text-fw-success" />;
      case 'custom':
      default:
        return <ServerCog className="h-8 w-8 text-fw-body" />;
    }
  };

  // Define card color based on VNF type
  const getCardColor = () => {
    switch(vnf.type) {
      case 'firewall':
        return 'border-fw-error bg-fw-errorLight';
      case 'sdwan':
        return 'border-fw-purpleLight bg-fw-purpleLight';
      case 'router':
        return 'border-fw-active bg-fw-infoLight';
      case 'vnat':
        return 'border-fw-success bg-fw-successLight';
      case 'custom':
      default:
        return 'border-fw-secondary bg-fw-wash';
    }
  };

  // Define status color and text
  const getStatusColor = () => {
    switch(vnf.status) {
      case 'active':
        return { bg: 'bg-fw-successLight', text: 'text-fw-success', icon: <CheckCircle className="h-4 w-4 mr-1" /> };
      case 'inactive':
        return { bg: 'bg-fw-neutral', text: 'text-fw-heading', icon: <XCircle className="h-4 w-4 mr-1" /> };
      case 'provisioning':
        return { bg: 'bg-fw-accent', text: 'text-fw-linkHover', icon: <Activity className="h-4 w-4 mr-1" /> };
      case 'error':
        return { bg: 'bg-fw-errorLight', text: 'text-fw-error', icon: <XCircle className="h-4 w-4 mr-1" /> };
      default:
        return { bg: 'bg-fw-neutral', text: 'text-fw-heading', icon: <Info className="h-4 w-4 mr-1" /> };
    }
  };

  // Calculate license expiration status
  const getLicenseStatus = () => {
    if (!vnf.licenseExpiry) return null;

    const expiryDate = new Date(vnf.licenseExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { text: 'Expired', color: 'text-fw-error' };
    } else if (daysUntilExpiry <= 30) {
      return { text: `Expires in ${daysUntilExpiry} days`, color: 'text-fw-warn' };
    } else {
      return { text: `Valid until ${expiryDate.toLocaleDateString()}`, color: 'text-fw-success' };
    }
  };

  const licenseStatus = getLicenseStatus();

  // Card handling
  const handleCardClick = () => {
    setShowDetails(!showDetails);
  };

  // Get formatted type name
  const getTypeName = () => {
    switch(vnf.type) {
      case 'firewall':
        return 'Firewall';
      case 'sdwan':
        return 'SD-WAN';
      case 'router':
        return 'Router';
      case 'vnat':
        return 'Virtual NAT';
      case 'custom':
        return 'Custom VNF';
      default:
        return vnf.type.toUpperCase();
    }
  };

  const status = getStatusColor();

  return (
    <div 
      className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${getCardColor()}`}
      style={{ transform: 'translateY(0)' }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-fw-secondary bg-fw-base flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            vnf.type === 'firewall' ? 'bg-fw-errorLight' :
            vnf.type === 'sdwan' ? 'bg-fw-neutral' :
            vnf.type === 'router' ? 'bg-fw-accent' :
            vnf.type === 'vnat' ? 'bg-fw-successLight' :
            'bg-fw-neutral'
          }`}>
            {getIcon()}
          </div>
          <div>
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] line-clamp-1">{vnf.name}</h3>
            <p className="text-figma-base text-fw-bodyLight">{vnf.vendor} {vnf.model}</p>
          </div>
        </div>
        <div className="relative">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-figma-sm font-medium ${status.bg} ${status.text}`}>
            {status.icon}
            {vnf.status.charAt(0).toUpperCase() + vnf.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-fw-base">
        <div className="flex justify-between mb-3">
          <div>
            <span className="text-figma-sm font-medium text-fw-bodyLight">Type</span>
            <p className="text-figma-base font-medium text-fw-heading">{getTypeName()}</p>
          </div>
          <div>
            <span className="text-figma-sm font-medium text-fw-bodyLight">Throughput</span>
            <p className="text-figma-base font-medium text-fw-heading">{vnf.throughput || 'N/A'}</p>
          </div>
        </div>

        {/* Hub Association */}
        <div className="mb-4 p-2 bg-brand-lightBlue rounded-lg">
          <div className="flex items-center">
            <AttIcon name="hub" className="h-4 w-4 text-brand-blue mr-1.5" />
            <span className="text-figma-sm text-brand-blue">
              {hub ? `Attached to: ${hub.name}` : 'Not attached to any Hub'}
            </span>
          </div>
        </div>

        <p className="text-figma-base text-fw-bodyLight mb-4 line-clamp-2">{vnf.description || 'No description available'}</p>

        {/* License information */}
        {licenseStatus && (
          <div className="flex items-center mt-2 mb-4">
            <Clock className="h-4 w-4 mr-1.5" />
            <span className={`text-figma-sm ${licenseStatus.color}`}>{licenseStatus.text}</span>
          </div>
        )}

        {/* Expandable details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-fw-secondary">
            <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.04em] mb-2">Interfaces</h4>
            <div className="space-y-2 mb-3">
              {vnf.configuration?.interfaces && vnf.configuration.interfaces.length > 0 ? (
                vnf.configuration.interfaces.map(iface => (
                  <div key={iface.id} className="flex items-center justify-between text-figma-sm">
                    <div className="flex items-center">
                      <Network className="h-3 w-3 mr-1 text-fw-bodyLight" />
                      <span className="font-medium">{iface.name}</span>
                      <span className="ml-1 text-fw-bodyLight">({iface.type})</span>
                    </div>
                    <span className={iface.status === 'up' ? 'text-fw-success' : 'text-fw-error'}>
                      {iface.status.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-figma-sm text-fw-bodyLight italic">No interfaces configured</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-figma-sm">
              {vnf.configuration?.highAvailability !== undefined && (
                <div>
                  <span className="text-fw-bodyLight">High Availability:</span>{' '}
                  <span className={vnf.configuration.highAvailability ? 'text-fw-success' : 'text-fw-bodyLight'}>
                    {vnf.configuration.highAvailability ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}

              {vnf.configuration?.managementIP && (
                <div>
                  <span className="text-fw-bodyLight">Management IP:</span>{' '}
                  <span className="font-mono">{vnf.configuration.managementIP}</span>
                </div>
              )}

              {vnf.configuration?.routingProtocols && vnf.configuration.routingProtocols.length > 0 && (
                <div className="col-span-2">
                  <span className="text-fw-bodyLight">Routing:</span>{' '}
                  <span>{vnf.configuration.routingProtocols.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex items-center justify-between">
          <button 
            onClick={handleCardClick}
            className="text-figma-base text-fw-bodyLight hover:text-fw-body"
          >
            {showDetails ? 'Show less' : 'Show more'}
          </button>
          
          <div className="relative">
            <OverflowMenu
              items={[
                {
                  id: 'edit',
                  label: 'Edit VNF',
                  icon: <Edit2 className="h-4 w-4" />,
                  onClick: (e) => {
                    e.stopPropagation();
                    onEdit();
                  }
                },
                {
                  id: 'delete',
                  label: 'Delete VNF',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: (e) => {
                    e.stopPropagation();
                    onDelete();
                  },
                  variant: 'danger'
                }
              ]}
              isOpen={showOverflow}
              onOpenChange={setShowOverflow}
            />
          </div>
        </div>
      </div>
    </div>
  );
}