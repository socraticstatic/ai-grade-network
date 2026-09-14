import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { SubNav } from '../navigation/SubNav';
import { ConnectionManagement } from './ConnectionManagement';
import { UserManagement } from './UserManagement';
import { BillingConfiguration } from './BillingConfiguration';
import { ReportingSettings } from './ReportingSettings';
import { SystemSettings } from './system/SystemSettings';
import { PartnersConfiguration } from './partners/PartnersConfiguration';
import { PoliciesConfiguration } from './policies/PoliciesConfiguration';
import { GroupManagement } from './groups/GroupManagement';
import { AgenticAISettings } from './AgenticAISettings';
import { TabGroup } from '../navigation/TabGroup';
import { useStore } from '../../store/useStore';

interface ConfigureHubProps {
  defaultTab?: string;
}

export function ConfigureHub({ defaultTab = 'connections' }: ConfigureHubProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Set active tab based on URL path
  useEffect(() => {
    const path = location.pathname.split('/')[2]; // /configure/:tab
    if (path) {
      setActiveTab(path);
    }
  }, [location]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/configure/${tab}`);
  };

  const tabs = [
    { id: 'connections', label: 'Connections', icon: <AttIcon name="ethernet" className="h-5 w-5 mr-2" /> },
    { id: 'groups', label: 'Pools', icon: <AttIcon name="grid" className="h-5 w-5 mr-2" /> },
    { id: 'users', label: 'Users', icon: <AttIcon name="person-group" className="h-5 w-5 mr-2" /> },
    { id: 'billing', label: 'Billing', icon: <AttIcon name="bill" className="h-5 w-5 mr-2" /> },
    { id: 'reports', label: 'Reports', icon: <AttIcon name="pie-chart" className="h-5 w-5 mr-2" /> },
    { id: 'system', label: 'System', icon: <AttIcon name="gear" className="h-5 w-5 mr-2" /> },
    { id: 'agentic', label: 'Agentic AI', icon: <AttIcon name="high-meter" className="h-5 w-5 mr-2" /> },
    { id: 'partners', label: 'Partners', icon: <AttIcon name="shopping-bag" className="h-5 w-5 mr-2" /> },
    { id: 'policies', label: 'Policies', icon: <AttIcon name="check-shield" className="h-5 w-5 mr-2" /> },
  ];

  return (
    <div className="space-y-6">
      <TabGroup
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tab) => handleTabChange(tab)}
      />

      <Routes>
        <Route path="connections" element={<ConnectionManagement />} />
        <Route path="groups" element={<GroupManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="billing" element={<BillingConfiguration />} />
        <Route path="reports" element={<ReportingSettings />} />
        <Route path="agentic" element={<AgenticAISettings />} />
        <Route path="system/*" element={<SystemSettings />} />
        <Route path="partners" element={<PartnersConfiguration />} />
        <Route path="policies/*" element={<PoliciesConfiguration />} />
        <Route path="/*" element={<Navigate to="/configure/connections" />} />
      </Routes>
    </div>
  );
}

export default ConfigureHub;