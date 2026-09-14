// Shared display labels and formatting utilities for RBAC objects and actions.

export const OBJECT_LABELS: Record<string, string> = {
  connection: 'Connections',
  link: 'Links (VLANs)',
  subnet: 'Subnets',
  'hub': 'Hubs',
  vnf: 'VNFs',
  pool: 'Pools',
  monitoring: 'Monitoring',
  'alert-rule': 'Alert Rules',
  report: 'Reports',
  user: 'Users',
  role: 'Roles',
  'role-assignment': 'Role Assignments',
  billing: 'Billing',
  policy: 'Policies',
  partner: 'Partners',
  api: 'API Keys',
  tenant: 'Tenants',
  client: 'Clients',
  system: 'System',
  audit: 'Audit',
  'design-library': 'Design Libraries',
  instance: 'Instances',
  reseller: 'Resellers',
};

export const ACTION_LABELS: Record<string, string> = {
  'role-assignment:assign':  'Assigned role',
  'role-assignment:revoke':  'Revoked role',
  'role-assignment:read':    'Viewed assignments',
  'user:read':    'Viewed user',
  'user:write':   'Updated user',
  'user:delete':  'Deleted user',
  'user:operate': 'Operated as user',
  'role:read':    'Viewed role',
  'role:write':   'Updated role',
  'role:delete':  'Deleted role',
  'policy:assign':  'Assigned policy',
  'policy:write':   'Updated policy',
  'policy:delete':  'Deleted policy',
  'connection:write':   'Modified connection',
  'connection:delete':  'Deleted connection',
  'connection:operate': 'Operated connection',
  'system:configure':  'Changed system config',
  'system:administer': 'Admin system operation',
  'billing:finance': 'Billing finance operation',
  'billing:export':  'Exported billing data',
  'audit:read': 'Viewed audit log',
  'deny-assignment:create': 'Created deny assignment',
  'deny-assignment:lift':   'Lifted deny assignment',
  'group-membership:add': 'Added to group (role inherited)',
};

export function formatObjectName(obj: string): string {
  return OBJECT_LABELS[obj] ?? obj.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(':', ': ').replace(/-/g, ' ');
}

export function formatTimestamp(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const relative = diffDay > 0 ? `${diffDay}d ago`
    : diffHr > 0 ? `${diffHr}h ago`
    : diffMin > 0 ? `${diffMin}m ago`
    : 'just now';
  const absolute = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return { relative, absolute };
}
