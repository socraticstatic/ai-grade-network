import { NetworkNode } from '../types';

export const getFunctionIconName = (functionType: string, config?: any): string => {
  switch (functionType) {
    case 'Hub': return 'hub';
    case 'Router': return config?.routerType === 'cloud' ? 'hub' : 'Router';
    case 'SDWAN': return 'PanelRight';
    case 'Firewall': return 'Shield';
    case 'VNF': return 'Activity';
    case 'VNAT': return 'Menu';
    default: return 'Server';
  }
};

export const getNetworkTypeIconName = (networkType: string): string => {
  switch (networkType?.toLowerCase()) {
    case 'internet': return 'Network';
    case 'vpn': return 'Lock';
    case 'ethernet': return 'Cable';
    case 'iot': return 'Wifi';
    case 'at&t core': return 'Globe';
    default: return 'Network';
  }
};

export const getNodeIcon = (type: NetworkNode['type'], functionType?: string, networkType?: string, config?: any): string => {
  switch (type) {
    case 'function':
      return functionType ? getFunctionIconName(functionType, config) : 'Server';
    case 'destination':
      return 'Cloud';
    case 'datacenter':
      return 'Database';
    case 'network':
      return networkType ? getNetworkTypeIconName(networkType) : 'Network';
    default:
      return 'Server';
  }
};

export const getNodeDisplayName = (type: NetworkNode['type'], functionType?: string, networkType?: string, provider?: string): string => {
  if (type === 'function') {
    return functionType === 'Hub' ? 'Hub' : functionType || 'Function';
  } else if (type === 'destination' && provider) {
    return provider === 'Google' ? 'Google Cloud' : provider;
  } else if (networkType) {
    return networkType === 'AT&T Core' ? 'AT&T Core' : `${networkType.charAt(0).toUpperCase() + networkType.slice(1)}`;
  } else {
    return `${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }
};

export const getNodeColors = (node: NetworkNode) => {
  const getBackgroundColor = () => {
    return 'bg-gray-50';
  };

  const getIconColor = () => {
    return 'text-gray-700';
  };

  const getStatusColor = () => {
    if (node.status !== 'active') return 'bg-gray-400';
    return 'bg-green-500';
  };

  return {
    background: getBackgroundColor(),
    icon: getIconColor(),
    status: getStatusColor()
  };
};
