import { RoleAssignment } from '../types/roleAssignment';
import { sampleUsers, currentUser } from './sampleData';

// Maps freeform user role strings to RBAC Role values
function inferRbacRole(userRole: string): 'user' | 'admin' | 'super-admin' {
  const lower = userRole.toLowerCase();
  if (lower.includes('admin') || lower.includes('administrator')) return 'admin';
  return 'user';
}

function makeAssignment(
  user: { id: string; name?: string; role: string; scopePath: string },
  overrideRole?: 'user' | 'admin' | 'super-admin'
): RoleAssignment {
  return {
    id: `ra-${user.id}`,
    principalId: user.id,
    principalType: 'user',
    principalName: user.name,
    role: overrideRole ?? inferRbacRole(user.role),
    scope: user.scopePath,
    assignedBy: 'emilio-estevez',
    assignedAt: new Date('2025-01-01'),
    status: 'active',
  };
}

const userAssignments: RoleAssignment[] = sampleUsers.map(u => makeAssignment(u));

const currentUserAssignment: RoleAssignment = makeAssignment(currentUser, 'admin');

export const sampleRoleAssignments: RoleAssignment[] = [
  ...userAssignments,
  currentUserAssignment,
];

export const roleAssignmentsByUserId: Record<string, RoleAssignment[]> = {};
for (const assignment of sampleRoleAssignments) {
  if (!roleAssignmentsByUserId[assignment.principalId]) {
    roleAssignmentsByUserId[assignment.principalId] = [];
  }
  roleAssignmentsByUserId[assignment.principalId].push(assignment);
}
