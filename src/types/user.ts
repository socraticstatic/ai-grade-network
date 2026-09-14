export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastActive: string;
  avatar?: string;
  department?: string;
  tenantId: string;
  departmentId?: string;
  scopePath: string;
  connectionAccess: Array<{
    connectionId: string;
    name: string;
    permissions: string[];
  }>;
}

// UserType is identical to User — kept as alias for configure/users components
export type UserType = User;
