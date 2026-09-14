import { Activity, ArrowDown, AlertTriangle, BarChart2, User, Users, Settings, CreditCard, DollarSign, FileText, ShieldAlert, HelpCircle, Clock, Bell, Network, Database, Layout, Send, Search, Award } from 'lucide-react';

// Import widget categories
import { billingWidgets } from './categories/billing';
import { infrastructureWidgets } from './categories/infrastructure';
import { monitoringWidgets } from './categories/monitoring';
import { observabilityWidgets } from './categories/observability';
import { quickAccessWidgets } from './categories/quick-access';
import { resourceManagementWidgets } from './categories/resource-management';
import { securityWidgets } from './categories/security';
import { supportWidgets } from './categories/support';
import { userManagementWidgets } from './categories/user-management';
import { sustainabilityWidgets } from './categories/sustainability';

// Widget definitions by category
export const AVAILABLE_WIDGETS = {
  'Monitoring': monitoringWidgets,
  'Security': securityWidgets,
  'Billing': billingWidgets,
  'Infrastructure': infrastructureWidgets,
  'Quick Access': quickAccessWidgets,
  'Observability': observabilityWidgets,
  'Resource Management': resourceManagementWidgets,
  'User Management': userManagementWidgets,
  'Support': supportWidgets,
  'Insights': sustainabilityWidgets
};

// Mocked data for demonstration
const MOCK_DATA = {
  connections: {
    total: 15,
    active: 12,
    inactive: 3,
    warning: 2
  },
  bandwidth: {
    total: '124.5 Gbps',
    average: '8.3 Gbps',
    peak: '17.1 Gbps',
    utilizationPoints: [65, 72, 68, 74, 82, 78, 79, 80, 84, 79, 76, 78]
  },
  alerts: [
    { id: '1', severity: 'critical', message: 'High latency on AWS connection', time: '10m ago' },
    { id: '2', severity: 'warning', message: 'Bandwidth approaching limit', time: '30m ago' },
    { id: '3', severity: 'info', message: 'New security patch available', time: '1h ago' }
  ],
  metrics: {
    latency: '4.2ms',
    packetLoss: '0.01%',
    jitter: '1.8ms',
    uptime: '99.98%'
  },
  billing: {
    currentMonth: '$1,248.50',
    previousMonth: '$1,120.75',
    forecast: '$1,310.25',
    trend: '+11.4%'
  },
  security: {
    threatCount: 12,
    mitigated: 10,
    compliance: '94%',
    lastScan: '2h ago'
  },
  tickets: [
    { id: 'TKT-001', status: 'open', priority: 'high', subject: 'Connection issue with AWS' },
    { id: 'TKT-002', status: 'in_progress', priority: 'medium', subject: 'Latency in Asia region' },
    { id: 'TKT-003', status: 'closed', priority: 'low', subject: 'Documentation request' }
  ]
};

// Export all widget-related utilities
;