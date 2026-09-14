import { Zap, Award, Leaf, Sun } from 'lucide-react';
import { PUEMetricsWidget } from './PUEMetricsWidget';
import { BCorpStatusWidget } from './BCorpStatusWidget';
import { CarbonFootprintWidget } from './CarbonFootprintWidget';
import { RenewableEnergyWidget } from './RenewableEnergyWidget';
import { WidgetDefinition } from '../../../types';

export const sustainabilityWidgets: WidgetDefinition[] = [
  {
    id: 'pue-metrics',
    title: 'PUE Efficiency',
    description: 'Power Usage Effectiveness and energy efficiency metrics',
    icon: Zap,
    color: 'green',
    defaultW: 2,
    defaultH: 2,
    component: PUEMetricsWidget
  },
  {
    id: 'bcorp-status',
    title: 'B Corp Impact',
    description: 'B Corporation certification progress and impact scores',
    icon: Award,
    color: 'blue',
    defaultW: 1,
    defaultH: 2,
    component: BCorpStatusWidget
  },
  {
    id: 'carbon-footprint',
    title: 'Carbon Footprint',
    description: 'Carbon emissions tracking and offset progress',
    icon: Leaf,
    color: 'green',
    defaultW: 2,
    defaultH: 2,
    component: CarbonFootprintWidget
  },
  {
    id: 'renewable-energy',
    title: 'Renewable Energy',
    description: 'Clean energy sources and renewable usage tracking',
    icon: Sun,
    color: 'green',
    defaultW: 1,
    defaultH: 2,
    component: RenewableEnergyWidget
  }
];

export * from './PUEMetricsWidget';
export * from './BCorpStatusWidget';
export * from './CarbonFootprintWidget';
export * from './RenewableEnergyWidget';
