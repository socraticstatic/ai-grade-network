import { Database, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import { ResourceInventoryWidget } from './ResourceInventoryWidget';
import { CapacityPlanningWidget } from './CapacityPlanningWidget';
import { AssetLifecycleWidget } from './AssetLifecycleWidget';
import { ResourceUtilizationWidget } from './ResourceUtilizationWidget';
import { WidgetDefinition } from '../../../types';

export const resourceManagementWidgets: WidgetDefinition[] = [
  {
    id: 'resource-inventory',
    title: 'Resource Inventory',
    description: 'Track and manage network resources',
    icon: Database,
    color: 'blue',
    defaultW: 2,
    defaultH: 1,
    component: ResourceInventoryWidget
  },
  {
    id: 'capacity-planning',
    title: 'Capacity Planning',
    description: 'Plan and forecast resource capacity',
    icon: TrendingUp,
    color: 'gray',
    defaultW: 2,
    defaultH: 2,
    component: CapacityPlanningWidget
  },
  {
    id: 'asset-lifecycle',
    title: 'Asset Lifecycle',
    description: 'Monitor asset lifecycle and maintenance',
    icon: RefreshCw,
    color: 'green',
    defaultW: 1,
    defaultH: 1,
    component: AssetLifecycleWidget
  },
  {
    id: 'resource-utilization',
    title: 'Resource Utilization',
    description: 'Track resource usage and efficiency',
    icon: Activity,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: ResourceUtilizationWidget
  }
];

export * from './ResourceInventoryWidget';
export * from './CapacityPlanningWidget';
export * from './AssetLifecycleWidget';
export * from './ResourceUtilizationWidget';