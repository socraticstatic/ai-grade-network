// src/types/rbac.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildScopePath,
  scopeContains,
  PLATFORM_SCOPE,
  TENANT_SCOPE,
  CLIENT_SCOPE,
} from './rbac';

describe('buildScopePath', () => {
  it('infers platform tier for root path', () => {
    const s = buildScopePath('/');
    expect(s.tier).toBe('platform');
  });

  it('infers tenant tier', () => {
    const s = buildScopePath('/tenants/TNT-001');
    expect(s.tier).toBe('tenant');
    expect(s.raw).toBe('/tenants/TNT-001');
  });

  it('infers client tier', () => {
    const s = buildScopePath('/tenants/TNT-001/clients/CLT-A');
    expect(s.tier).toBe('client');
  });
});

describe('scopeContains', () => {
  it('platform contains everything', () => {
    expect(scopeContains(PLATFORM_SCOPE, TENANT_SCOPE('TNT-001'))).toBe(true);
  });

  it('tenant contains its clients', () => {
    expect(scopeContains(TENANT_SCOPE('TNT-001'), CLIENT_SCOPE('TNT-001', 'CLT-A'))).toBe(true);
  });

  it('tenant does not contain sibling tenant', () => {
    expect(scopeContains(TENANT_SCOPE('TNT-001'), TENANT_SCOPE('TNT-002'))).toBe(false);
  });

  it('client does not contain its tenant', () => {
    expect(scopeContains(CLIENT_SCOPE('TNT-001', 'CLT-A'), TENANT_SCOPE('TNT-001'))).toBe(false);
  });
});
