import { ReactNode } from 'react';
import { Activity, FileText, Bell, TrendingUp, History } from 'lucide-react';
import { TabGroup } from '../../navigation/TabGroup';

export type MonitoringTabType = 'overview' | 'metrics' | 'alerts' | 'logs' | 'reports';

interface DashboardTabsProps {
  activeTab: MonitoringTabType;
  onChange: (tab: MonitoringTabType) => void;
  className?: string;
}

export function DashboardTabs({ activeTab, onChange, className = '' }: DashboardTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-5 w-5 mr-2" /> },
    { id: 'metrics', label: 'Detailed Metrics', icon: <TrendingUp className="h-5 w-5 mr-2" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="h-5 w-5 mr-2" /> },
    { id: 'logs', label: 'Logs', icon: <History className="h-5 w-5 mr-2" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="h-5 w-5 mr-2" /> }
  ];

  return (
    <TabGroup
      tabs={tabs}
      activeTab={activeTab}
      onChange={(tab) => onChange(tab as MonitoringTabType)}
      className={className}
    />
  );
}