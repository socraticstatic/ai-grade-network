import { Server, Network, Globe, Database } from 'lucide-react';
import { DataCenterWidget } from './DataCenterWidget';
import { EdgeLocationsWidget } from './EdgeLocationsWidget';
import { ResourceUtilizationWidget } from './ResourceUtilizationWidget';
import { WidgetDefinition } from '../../../types';

export const infrastructureWidgets: WidgetDefinition[] = [
  {
    id: 'data-center',
    title: 'Data Center Overview',
    description: 'Monitor data center health and capacity',
    icon: Server,
    color: 'blue',
    defaultW: 2,
    defaultH: 1,
    component: DataCenterWidget
  },
  {
    id: 'edge-locations',
    title: 'Edge Locations',
    description: 'Global edge location status and metrics',
    icon: Globe,
    color: 'green',
    defaultW: 1,
    defaultH: 1,
    component: EdgeLocationsWidget
  },
  {
    id: 'resource-utilization',
    title: 'Resource Utilization',
    description: 'Infrastructure resource usage metrics',
    icon: Database,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: ResourceUtilizationWidget
  }
];

export * from './DataCenterWidget';
export * from './EdgeLocationsWidget';
export * from './ResourceUtilizationWidget';