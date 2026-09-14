import { ReactNode } from 'react';
import { AttIcon } from '../../icons/AttIcon';
import { OverflowTabs } from '../../common/OverflowTabs';

export type ConnectionTabType =
  | 'overview'
  | 'hubs'
  | 'links'
  | 'vnfs'
  | 'policies'
  | 'access'
  | 'versions'
  | 'billing'
  | 'logs'
  | 'api';

interface Tab {
  id: ConnectionTabType;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
}

interface ConnectionTabsProps {
  activeTab: ConnectionTabType;
  onTabChange: (tab: ConnectionTabType) => void;
  disabledTabs?: ConnectionTabType[];
  hiddenTabs?: ConnectionTabType[];
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <AttIcon name="high-meter" className="h-5 w-5" /> },
  { id: 'hubs', label: 'Connection Hubs', icon: <AttIcon name="hub" className="h-6 w-6" /> },
  { id: 'links', label: 'Links', icon: <AttIcon name="cable" className="h-5 w-5" /> },
  { id: 'vnfs', label: 'VNFs', icon: <AttIcon name="check-shield" className="h-5 w-5" /> },
  { id: 'policies', label: 'Policies', icon: <AttIcon name="checklist" className="h-5 w-5" /> },
  { id: 'api', label: 'API', icon: <AttIcon name="apis" className="h-5 w-5" /> },
  { id: 'access', label: 'Access', icon: <AttIcon name="person-group" className="h-5 w-5" /> },
  { id: 'billing', label: 'Billing', icon: <AttIcon name="bill" className="h-5 w-5" /> },
  { id: 'versions', label: 'Versions', icon: <AttIcon name="download" className="h-5 w-5" /> },
  { id: 'logs', label: 'Logs', icon: <AttIcon name="grid" className="h-5 w-5" /> }
];

export function ConnectionTabs({ activeTab, onTabChange, disabledTabs = [], hiddenTabs = [] }: ConnectionTabsProps) {
  return (
    <div className="border-b border-fw-secondary">
      <OverflowTabs
        items={TABS.filter(tab => !hiddenTabs.includes(tab.id)).map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          active: activeTab === tab.id,
          disabled: tab.disabled || disabledTabs.includes(tab.id),
        }))}
        onSelect={(id) => onTabChange(id as ConnectionTabType)}
      />
    </div>
  );
}