import { Shield, AlertTriangle, Lock, Activity, FileText } from 'lucide-react';
import { SecurityOverviewWidget } from './SecurityOverviewWidget';
import { SecurityAlertsWidget } from './SecurityAlertsWidget';
import { ComplianceStatusWidget } from './ComplianceStatusWidget';
import { SecurityAuditWidget } from './SecurityAuditWidget';
import { ThreatDetectionWidget } from './ThreatDetectionWidget';
import { WidgetDefinition } from '../../../types';

export const securityWidgets: WidgetDefinition[] = [
  {
    id: 'security-overview',
    title: 'Security Overview',
    description: 'Overview of security status and threats',
    icon: Shield,
    color: 'blue',
    defaultW: 2,
    defaultH: 1,
    component: SecurityOverviewWidget
  },
  {
    id: 'security-alerts',
    title: 'Security Alerts',
    description: 'Active security alerts and incidents',
    icon: AlertTriangle,
    color: 'red',
    defaultW: 1,
    defaultH: 1,
    component: SecurityAlertsWidget
  },
  {
    id: 'compliance-status',
    title: 'Compliance Status',
    description: 'Compliance and certification status',
    icon: Lock,
    color: 'green',
    defaultW: 1,
    defaultH: 1,
    component: ComplianceStatusWidget
  },
  {
    id: 'security-audit',
    title: 'Security Audit',
    description: 'Security audit logs and findings',
    icon: FileText,
    color: 'gray',
    defaultW: 2,
    defaultH: 1,
    component: SecurityAuditWidget
  },
  {
    id: 'threat-detection',
    title: 'Threat Detection',
    description: 'Real-time threat monitoring and detection',
    icon: Activity,
    color: 'gray',
    defaultW: 2,
    defaultH: 1,
    component: ThreatDetectionWidget
  }
];

export * from './SecurityOverviewWidget';
export * from './SecurityAlertsWidget';
export * from './ComplianceStatusWidget';
export * from './SecurityAuditWidget';
export * from './ThreatDetectionWidget';