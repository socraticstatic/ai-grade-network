// src/components/configure/UserManagement.tsx
import { useSearchParams } from 'react-router-dom';
import { Users, Shield, Activity, Layers, ClipboardList } from 'lucide-react';
import { VerticalTabGroup } from '../navigation/VerticalTabGroup';
import { TabItem } from '../../types/navigation';
import { UserList } from './users/UserList';
import { GroupManagement } from './users/GroupManagement';
import { RoleCatalog } from './users/RoleCatalog';
import { AssignmentManagement } from './users/AssignmentManagement';
import { AuditLog } from './users/AuditLog';

type Tab = 'users' | 'groups' | 'roles' | 'assignments' | 'activity';

const VALID_TABS: Tab[] = ['users', 'groups', 'roles', 'assignments', 'activity'];

const tabs: TabItem[] = [
  { id: 'users',       label: 'Users',       icon: <Users className="h-5 w-5 mr-2" />,       category: 'People' },
  { id: 'groups',      label: 'Groups',      icon: <Layers className="h-5 w-5 mr-2" />,      category: 'People' },
  { id: 'roles',       label: 'Roles',       icon: <Shield className="h-5 w-5 mr-2" />,      category: 'Access' },
  { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="h-5 w-5 mr-2" />, category: 'Access' },
  { id: 'activity',    label: 'Activity',    icon: <Activity className="h-5 w-5 mr-2" />,    category: 'Audit' },
];

export function UserManagement() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as Tab | null;
  const activeTab: Tab = raw && VALID_TABS.includes(raw) ? raw : 'users';

  const handleTabChange = (tab: string) => {
    setParams({ tab });
  };

  return (
    <div className="p-6">
      <div className="flex gap-0">
        <VerticalTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        <div className="flex-1 pl-6">
          {activeTab === 'users'       && <UserList />}
          {activeTab === 'groups'      && <GroupManagement />}
          {activeTab === 'roles'       && <RoleCatalog />}
          {activeTab === 'assignments' && <AssignmentManagement />}
          {activeTab === 'activity'    && <AuditLog />}
        </div>
      </div>
    </div>
  );
}
