import { describe, it, expect } from 'vitest';
import { detectCeilingConflicts } from './groupEdit';
import { buildScopePath } from '../types/rbac';
import type { RoleAssignment } from '../types/rbac';

function makeAssignment(id: string, scopeRaw: string, tier: string): RoleAssignment {
  return {
    id,
    principal: { id: 'user-1', type: 'user', displayName: 'Test User' },
    role: 'NetworkEngineer' as any,
    scope: buildScopePath(scopeRaw),
    status: 'active',
    justification: 'test',
    grantedBy: 'admin',
    grantedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
  };
}

describe('detectCeilingConflicts', () => {
  it('returns empty when no assignments exist', () => {
    const ceiling = buildScopePath('/tenants/TNT-001');
    const result = detectCeilingConflicts(ceiling, []);
    expect(result).toEqual([]);
  });

  it('returns empty when all assignments are within the new ceiling', () => {
    const ceiling = buildScopePath('/tenants/TNT-001');
    const assignments = [
      makeAssignment('a1', '/tenants/TNT-001/clients/CLT-001', 'client'),
      makeAssignment('a2', '/tenants/TNT-001', 'tenant'),
    ];
    const result = detectCeilingConflicts(ceiling, assignments);
    expect(result).toEqual([]);
  });

  it('returns assignments whose scope is broader than the new ceiling', () => {
    // New ceiling is client scope — tenant-scoped assignment exceeds it
    const ceiling = buildScopePath('/tenants/TNT-001/clients/CLT-001');
    const assignments = [
      makeAssignment('a1', '/tenants/TNT-001', 'tenant'),           // broader — conflict
      makeAssignment('a2', '/tenants/TNT-001/clients/CLT-001', 'client'), // same — ok
      makeAssignment('a3', '/tenants/TNT-001/clients/CLT-001/pools/P1', 'pool'), // narrower — ok
    ];
    const result = detectCeilingConflicts(ceiling, assignments);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
  });

  it('returns all conflicting assignments when ceiling is tightened significantly', () => {
    const ceiling = buildScopePath('/tenants/TNT-001/clients/CLT-001');
    const assignments = [
      makeAssignment('a1', '/platform', 'platform'),
      makeAssignment('a2', '/tenants/TNT-001', 'tenant'),
      makeAssignment('a3', '/tenants/TNT-001/clients/CLT-001', 'client'),
    ];
    const result = detectCeilingConflicts(ceiling, assignments);
    expect(result).toHaveLength(2);
    expect(result.map(a => a.id)).toEqual(expect.arrayContaining(['a1', 'a2']));
  });

  it('returns empty when ceiling is loosened', () => {
    // Old ceiling was client, new ceiling is tenant — no conflicts
    const ceiling = buildScopePath('/tenants/TNT-001');
    const assignments = [
      makeAssignment('a1', '/tenants/TNT-001/clients/CLT-001', 'client'),
    ];
    const result = detectCeilingConflicts(ceiling, assignments);
    expect(result).toEqual([]);
  });
});
