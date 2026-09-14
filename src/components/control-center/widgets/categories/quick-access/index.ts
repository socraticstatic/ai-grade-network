import { Zap } from 'lucide-react';
import { QuickActionsWidget } from './QuickActionsWidget';
import { WidgetDefinition } from '../../../types';

export const quickAccessWidgets: WidgetDefinition[] = [
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Frequently used actions and tools',
    icon: Zap,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: QuickActionsWidget
  }
];

export * from './QuickActionsWidget';