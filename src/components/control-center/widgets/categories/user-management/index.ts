import { Users, UserPlus, UserCheck, Shield } from 'lucide-react';
import { UserOverviewWidget } from './UserOverviewWidget';
import { UserActivityWidget } from './UserActivityWidget';
import { UserPermissionsWidget } from './UserPermissionsWidget';
import { UserRolesWidget } from './UserRolesWidget';
import { WidgetDefinition } from '../../../types';

export const userManagementWidgets: WidgetDefinition[] = [
  {
    id: 'user-overview',
    title: 'User Overview',
    description: 'Overview of user accounts and activity',
    icon: Users,
    color: 'blue',
    defaultW: 2,
    defaultH: 1,
    component: UserOverviewWidget
  },
  {
    id: 'user-activity',
    title: 'User Activity',
    description: 'Recent user actions and events',
    icon: UserCheck,
    color: 'green',
    defaultW: 1,
    defaultH: 1,
    component: UserActivityWidget
  },
  {
    id: 'user-permissions',
    title: 'User Permissions',
    description: 'Manage user access and permissions',
    icon: Shield,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: UserPermissionsWidget
  },
  {
    id: 'user-roles',
    title: 'User Roles',
    description: 'Role-based access control management',
    icon: UserPlus,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: UserRolesWidget
  }
];

export * from './UserOverviewWidget';
export * from './UserActivityWidget';
export * from './UserPermissionsWidget';
export * from './UserRolesWidget';