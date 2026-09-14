import { ResourceFilter, ScopePathBuilder } from '../types/scope';

/**
 * Converts a hierarchical scope path to the ResourceFilter representing
 * the breadth of access at that scope level.
 */
export function scopePathToFilter(path: string): ResourceFilter {
  if (!path) return 'owned-by-me';
  if (path === '/platform') return 'all-tenants';
  const depth = ScopePathBuilder.getDepth(path);
  if (depth === 1) return 'my-tenant';
  if (depth === 2) return 'my-department';
  if (depth >= 3) return 'my-pools';
  return 'owned-by-me';
}

/**
 * Returns ordered breadcrumb labels for a scope path.
 * e.g. '/tenants/TNT-001/departments/dept-x' → ['Platform', 'Tenant', 'Department']
 */
export function scopeDepthLabel(path: string): string[] {
  if (!path || path === '/platform') return ['Platform'];
  const depth = ScopePathBuilder.getDepth(path);
  const labels = ['Platform'];
  if (depth >= 1) labels.push('Tenant');
  if (depth >= 2) labels.push('Department');
  if (depth >= 3) labels.push('Pool');
  return labels;
}
