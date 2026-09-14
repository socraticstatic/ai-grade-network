import { useState } from 'react';
import { Globe, Network, Layers, Lock, TrendingUp, Shield } from 'lucide-react';
import { VerticalTabGroup } from '../../navigation/VerticalTabGroup';
import { TabItem } from '../../../types/navigation';
import { Layer3IPv4Policy } from './tabs/Layer3IPv4Policy';
import { Layer3IPv6Policy } from './tabs/Layer3IPv6Policy';
import { RestrictedIPv4Policy } from './tabs/RestrictedIPv4Policy';
import { BandwidthScalingPolicy } from './tabs/BandwidthScalingPolicy';
import { AccessControlPolicy } from './tabs/AccessControlPolicy';
import { Button } from '../../common/Button';

export function PoliciesConfiguration() {
  const [activeView, setActiveView] = useState<'internet' | 'ipv4' | 'ipv6' | 'restricted' | 'bandwidth' | 'security'>('ipv4');

  const tabs: TabItem[] = [
    { id: 'internet', label: 'Internet', icon: <Globe className="h-5 w-5 mr-2" />, category: 'Routing' },
    { id: 'ipv4', label: 'Layer 3 IPV4', icon: <Network className="h-5 w-5 mr-2" />, category: 'Routing' },
    { id: 'ipv6', label: 'Layer 3 IPV6', icon: <Layers className="h-5 w-5 mr-2" />, category: 'Routing' },
    { id: 'restricted', label: 'Restricted IPV4', icon: <Lock className="h-5 w-5 mr-2" />, category: 'Routing' },
    { id: 'bandwidth', label: 'Bandwidth', icon: <TrendingUp className="h-5 w-5 mr-2" />, category: 'Scaling' },
    { id: 'security', label: 'Access Control', icon: <Shield className="h-5 w-5 mr-2" />, category: 'Security' }
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'ipv4':
        return <Layer3IPv4Policy />;
      case 'ipv6':
        return <Layer3IPv6Policy />;
      case 'restricted':
        return <RestrictedIPv4Policy />;
      case 'bandwidth':
        return <BandwidthScalingPolicy />;
      case 'security':
        return <AccessControlPolicy />;
      default:
        return (
          <div className="p-6">
            <div className="bg-fw-accent border border-fw-active rounded-xl p-4 mb-6">
              <p className="text-figma-base font-medium text-fw-link tracking-[-0.03em]">
                Policy configuration allows you to define and manage network policies for different connection types and protocols.
                Select a policy type from the left to begin configuration.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-fw-neutral rounded-full p-6 mb-4">
                <Globe className="h-8 w-8 text-fw-bodyLight" />
              </div>
              <h3 className="text-figma-lg font-bold text-fw-body tracking-[-0.03em] mb-2">
                Select a Policy Type
              </h3>
              <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] max-w-md mb-6">
                Choose a policy type from the navigation menu to configure specific network policies.
              </p>
              <Button 
                variant="primary"
                onClick={() => setActiveView('ipv4')}
              >
                Configure IPv4 Policies
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex p-6">
      <VerticalTabGroup
        tabs={tabs}
        activeTab={activeView}
        onChange={(tab) => setActiveView(tab as typeof activeView)}
      />

      <div className="flex-1 pl-6">
        {renderContent()}
      </div>
    </div>
  );
}