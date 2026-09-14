import { Activity, Search, History, AlertTriangle, Terminal } from 'lucide-react';
import { LogStreamWidget } from './LogStreamWidget';
import { AuditTrailWidget } from './AuditTrailWidget';
import { MetricsExplorerWidget } from './MetricsExplorerWidget';
import { AlertHistoryWidget } from './AlertHistoryWidget';
import { DiagnosticsWidget } from './DiagnosticsWidget';
import { WidgetDefinition } from '../../../types';

export const observabilityWidgets: WidgetDefinition[] = [
  {
    id: 'log-stream',
    title: 'Log Stream',
    description: 'Real-time log streaming and analysis',
    icon: Terminal,
    color: 'blue',
    defaultW: 2,
    defaultH: 2,
    component: LogStreamWidget
  },
  {
    id: 'audit-trail',
    title: 'Audit Trail',
    description: 'Track system and user actions',
    icon: History,
    color: 'green',
    defaultW: 1,
    defaultH: 1,
    component: AuditTrailWidget
  },
  {
    id: 'metrics-explorer',
    title: 'Metrics Explorer',
    description: 'Advanced metrics visualization',
    icon: Activity,
    color: 'gray',
    defaultW: 2,
    defaultH: 2,
    component: MetricsExplorerWidget
  },
  {
    id: 'alert-history',
    title: 'Alert History',
    description: 'Historical alerts and resolutions',
    icon: AlertTriangle,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: AlertHistoryWidget
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    description: 'System health and diagnostics',
    icon: Search,
    color: 'blue',
    defaultW: 1,
    defaultH: 1,
    component: DiagnosticsWidget
  }
];

export * from './LogStreamWidget';
export * from './AuditTrailWidget';
export * from './MetricsExplorerWidget';
export * from './AlertHistoryWidget';
export * from './DiagnosticsWidget';