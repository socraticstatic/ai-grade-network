interface Tab {
  id: string;
  label: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastActive: string;
  connectionAccess: Array<{
    connectionId: string;
    name: string;
    permissions: string[];
  }>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
}