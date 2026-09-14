// src/utils/validatePermissionModel.test.ts
import { describe, it, expect } from 'vitest';
import { validatePermissionModel } from './validatePermissionModel';
import { accessibleGroups } from '../data/tierPermissions';
import { ROLE_CATALOG } from '../data/roleCatalog';

describe('Permission model consistency', () => {
  it('validatePermissionModel returns valid: true', () => {
    const result = validatePermissionModel();
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('platform role gets all 4 tier groups', () => {
    const groups = accessibleGroups('platform');
    const tiers = groups.map(g => g.tier);
    expect(tiers).toContain('platform');
    expect(tiers).toContain('reseller');
    expect(tiers).toContain('tenant');
    expect(tiers).toContain('client');
  });

  it('reseller role gets 3 tier groups (no platform)', () => {
    const groups = accessibleGroups('reseller');
    const tiers = groups.map(g => g.tier);
    expect(tiers).not.toContain('platform');
    expect(tiers).toContain('reseller');
    expect(tiers).toContain('tenant');
    expect(tiers).toContain('client');
  });

  it('tenant role gets 2 tier groups (no platform or reseller)', () => {
    const groups = accessibleGroups('tenant');
    const tiers = groups.map(g => g.tier);
    expect(tiers).not.toContain('platform');
    expect(tiers).not.toContain('reseller');
    expect(tiers).toContain('tenant');
    expect(tiers).toContain('client');
  });

  it('client role gets only Business Unit permissions', () => {
    const groups = accessibleGroups('client');
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe('client');
  });

  it('partner:read is NOT in tenant tier', () => {
    const groups = accessibleGroups('tenant');
    const tenantGroup = groups.find(g => g.tier === 'tenant');
    expect(tenantGroup?.permissions).not.toContain('partner:read');
  });

  it('partner:read IS in platform tier', () => {
    const groups = accessibleGroups('platform');
    const platformGroup = groups.find(g => g.tier === 'platform');
    expect(platformGroup?.permissions).toContain('partner:read');
  });

  it('partner:write is in platform tier only', () => {
    const groups = accessibleGroups('platform');
    const platformGroup = groups.find(g => g.tier === 'platform');
    expect(platformGroup?.permissions).toContain('partner:write');
    // not in reseller or tenant
    const resellerGroup = groups.find(g => g.tier === 'reseller');
    expect(resellerGroup?.permissions).not.toContain('partner:write');
  });

  it('TenantAdmin has no platform permissions', () => {
    const role = ROLE_CATALOG.TenantAdmin;
    const platformPerms = ['system:configure', 'system:administer', 'reseller:write', 'design-library:clone', 'instance:add'];
    for (const p of platformPerms) {
      expect(role.permissions).not.toContain(p);
    }
  });

  it('TenantAdmin has no reseller-exclusive permissions', () => {
    const role = ROLE_CATALOG.TenantAdmin;
    const resellerPerms = ['tenant:provision', 'tenant:suspend', 'design-library:import'];
    for (const p of resellerPerms) {
      expect(role.permissions).not.toContain(p);
    }
  });

  it('client:write exists in tenant tier group', () => {
    const groups = accessibleGroups('tenant');
    const tenantGroup = groups.find(g => g.tier === 'tenant');
    expect(tenantGroup?.permissions).toContain('client:write');
  });

  it('PartnerManager has maxScopeTier platform', () => {
    expect(ROLE_CATALOG.PartnerManager.maxScopeTier).toBe('platform');
  });

  it('PlatformAdmin permissions include all new platform-tier perms', () => {
    const role = ROLE_CATALOG.PlatformAdmin;
    const platformPerms = ['design-library:clone', 'instance:add', 'reseller:write', 'reseller:delete'];
    for (const p of platformPerms) {
      expect(role.permissions).toContain(p);
    }
  });

  it('ResellerAdmin has reseller-exclusive permissions', () => {
    const role = ROLE_CATALOG.ResellerAdmin;
    expect(role.permissions).toContain('tenant:provision');
    expect(role.permissions).toContain('design-library:import');
  });
});
