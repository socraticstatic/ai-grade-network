import { describe, it, expect } from 'vitest';
import { scopePathToFilter, scopeDepthLabel } from './scopeUtils';

describe('scopePathToFilter', () => {
  it('returns all-tenants for platform scope', () => {
    expect(scopePathToFilter('/platform')).toBe('all-tenants');
  });

  it('returns my-tenant for tenant scope', () => {
    expect(scopePathToFilter('/tenants/TNT-001')).toBe('my-tenant');
  });

  it('returns my-department for department scope', () => {
    expect(scopePathToFilter('/tenants/TNT-001/departments/dept-network')).toBe('my-department');
  });

  it('returns my-pools for pool scope', () => {
    expect(scopePathToFilter('/tenants/TNT-001/departments/dept-network/pools/pool-1')).toBe('my-pools');
  });

  it('returns owned-by-me for empty or unknown scope', () => {
    expect(scopePathToFilter('')).toBe('owned-by-me');
    expect(scopePathToFilter('/unknown')).toBe('owned-by-me');
  });
});

describe('scopeDepthLabel', () => {
  it('returns Platform only for platform scope', () => {
    expect(scopeDepthLabel('/platform')).toEqual(['Platform']);
  });

  it('returns breadcrumb for tenant scope', () => {
    expect(scopeDepthLabel('/tenants/TNT-001')).toEqual(['Platform', 'Tenant']);
  });

  it('returns breadcrumb for department scope', () => {
    expect(scopeDepthLabel('/tenants/TNT-001/departments/dept-network')).toEqual([
      'Platform', 'Tenant', 'Department'
    ]);
  });
});
