// src/utils/permissionResolver.ts
import {
  Permission,
  RoleAssignment,
  RoleDefinition,
  DenyAssignment,
  AccessGroup,
  ScopePath,
  ScopeTier,
  AssignmentConditions,
  EvaluationContext,
  ResourceContext,
  RequestContext,
  DataClass,
  scopeContains,
} from '../types/rbac';
import { ROLE_CATALOG, SOD_CONSTRAINTS } from '../data/roleCatalog';

// step: which evaluation stage produced the decision.
//   0 = (reserved — SoD violations no longer block; see sodWarning)
//   1 = deny assignment matched
//   2 = no active assignments covering the scope
//   3 = no role grants the requested permission
//   4 = allowed
export interface PermissionResult {
  allowed: boolean;
  step: 0 | 1 | 2 | 3 | 4;
  reason: string;
  matchedAssignment?: RoleAssignment;
  matchedDeny?: DenyAssignment;
  // SoD constraint triggered. Access is NOT blocked — violations are logged for
  // governance review, not used as a deny gate. Blocking on SoD is a DoS vector:
  // one stale conflicting assignment locks out all permissions until an admin acts.
  sodWarning?: string;
}

interface UserData {
  assignments: RoleAssignment[];
  denies: DenyAssignment[];
}

const DATA_CLASS_ORDER: DataClass[] = ['unclassified', 'cui', 'sensitive'];

// Tier order — higher index = narrower scope.
// connection and hub are siblings at the same depth.
const SCOPE_TIER_RANK: Record<ScopeTier, number> = {
  platform:      0,
  reseller:      1,
  tenant:        2,
  client:        3,
  pool:          4,
  connection:    5,
  'hub': 5,
};

export type EffectiveAssignment = {
  assignment: RoleAssignment;
  source: 'direct' | 'group';
  groupId?: string;
  groupName?: string;
};

// ── IP / CIDR helpers ─────────────────────────────────────────────────────────
// No dependencies — pure bit arithmetic. IPv4 only.

function ipToNum(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

// Accepts both plain IPs (treated as /32) and CIDR ranges like '10.0.0.0/8'.
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.includes('/') ? cidr.split('/') : [cidr, '32'];
  const prefix = parseInt(bits, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
  const ipNum    = ipToNum(ip);
  const rangeNum = ipToNum(range);
  if (ipNum === null || rangeNum === null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

export class PermissionResolver {
  private store = new Map<string, UserData>();
  private accessGroups = new Map<string, AccessGroup>();
  // Custom and modified BC role definitions — takes precedence over ROLE_CATALOG
  private roleDefinitions = new Map<string, RoleDefinition>();

  // Called by rbacSlice whenever roleDefinitions change in the store
  setRoleDefinitions(defs: RoleDefinition[]): void {
    this.roleDefinitions.clear();
    for (const d of defs) {
      this.roleDefinitions.set(d.id, d);
    }
  }

  loadAssignments(userId: string, assignments: RoleAssignment[], denies: DenyAssignment[]): void {
    this.store.set(userId, { assignments, denies });
  }

  loadGroup(group: AccessGroup): void {
    this.accessGroups.set(group.id, group);
  }

  private getRoleDef(roleId: string): RoleDefinition | undefined {
    // Custom/modified definitions first, then static catalog fallback
    return this.roleDefinitions.get(roleId) ?? ROLE_CATALOG[roleId as keyof typeof ROLE_CATALOG];
  }

  can(
    userId: string,
    permission: Permission,
    targetScope: ScopePath,
    ctx: EvaluationContext = {}
  ): PermissionResult {
    const now = ctx.request?.currentTime ?? new Date();

    // STEP 0: SoD audit check — violations are flagged but do NOT block access.
    // Blocking here is a denial-of-service vector: one stale conflicting assignment
    // locks the user out of everything until an admin cleans it up. Instead, we
    // surface the warning in the result for governance review while letting the
    // permission evaluation continue normally.
    const sodWarning = this.checkSoD(userId, now) ?? undefined;

    // STEP 1: Deny assignments override ALL role grants — evaluated first.
    const allDenies = this.collectDenies(userId, now);
    for (const deny of allDenies) {
      if (
        deny.permissions.includes(permission) &&
        scopeContains(deny.scope, targetScope) &&
        this.conditionsMatch(deny.conditions, ctx)
      ) {
        return {
          allowed: false,
          step: 1,
          reason: `deny '${deny.id}' blocks ${permission}: ${deny.justification}`,
          matchedDeny: deny,
          sodWarning,
        };
      }
    }

    // STEP 2: Collect active assignments covering the target scope.
    const validAssignments = this.collectAssignments(userId, now).filter(a => {
      if (a.status !== 'active') return false;
      if (new Date(a.expiresAt) <= now) return false;
      if (!scopeContains(a.scope, targetScope)) return false;
      if (!this.conditionsMatch(a.conditions, ctx)) return false;

      // Enforce maxScopeTier: the assignment scope must be at least as narrow as
      // the role's maxScopeTier. A Viewer (maxScopeTier=pool) cannot be assigned
      // at tenant scope — that would be too broad.
      const roleDef = this.getRoleDef(a.role);
      if (roleDef) {
        const assignmentRank = SCOPE_TIER_RANK[a.scope.tier];
        const maxRank        = SCOPE_TIER_RANK[roleDef.maxScopeTier];
        if (assignmentRank < maxRank) return false; // scope is broader than allowed
      }

      // Evaluate tenantScoped: custom roles tagged to a specific tenant are only
      // valid when the assignment scope is within that tenant.
      if (roleDef?.tenantScoped) {
        const tenantPrefix = `/tenants/${roleDef.tenantScoped}`;
        if (a.scope.raw !== tenantPrefix && !a.scope.raw.startsWith(tenantPrefix + '/')) {
          return false;
        }
      }

      // Evaluate objectFilter: if the assignment is restricted to specific resource
      // IDs and the caller supplied a resourceId in context, enforce the filter.
      if (a.objectFilter && a.objectFilter.length > 0 && ctx.resource?.resourceId) {
        if (!a.objectFilter.includes(ctx.resource.resourceId)) return false;
      }

      return true;
    });

    if (validAssignments.length === 0) {
      return {
        allowed: false,
        step: 2,
        reason: `no active assignment covers scope '${targetScope.raw}'`,
        sodWarning,
      };
    }

    // STEP 3 → 4: Resolve permissions from matching role definitions.
    for (const assignment of validAssignments) {
      const roleDef = this.getRoleDef(assignment.role);
      if (roleDef?.permissions.includes(permission)) {
        return {
          allowed: true,
          step: 4,
          reason: `role '${assignment.role}' grants '${permission}' via assignment '${assignment.id}'`,
          matchedAssignment: assignment,
          sodWarning,
        };
      }
    }

    return {
      allowed: false,
      step: 3,
      reason: `no role in the matching assignments grants '${permission}' at '${targetScope.raw}'`,
      sodWarning,
    };
  }

  getEffectivePermissions(
    userId: string,
    targetScope: ScopePath,
    ctx: EvaluationContext = {}
  ): Permission[] {
    const now = ctx.request?.currentTime ?? new Date();
    const deniedSet = new Set<Permission>();

    for (const deny of this.collectDenies(userId, now)) {
      if (scopeContains(deny.scope, targetScope) && this.conditionsMatch(deny.conditions, ctx)) {
        deny.permissions.forEach(p => deniedSet.add(p));
      }
    }

    const grantedSet = new Set<Permission>();
    const validAssignments = this.collectAssignments(userId, now).filter(a => {
      if (a.status !== 'active') return false;
      if (new Date(a.expiresAt) <= now) return false;
      if (!scopeContains(a.scope, targetScope)) return false;
      if (!this.conditionsMatch(a.conditions, ctx)) return false;
      const roleDef = this.getRoleDef(a.role);
      if (roleDef) {
        const assignmentRank = SCOPE_TIER_RANK[a.scope.tier];
        if (assignmentRank < SCOPE_TIER_RANK[roleDef.maxScopeTier]) return false;
      }
      if (roleDef?.tenantScoped) {
        const tenantPrefix = `/tenants/${roleDef.tenantScoped}`;
        if (a.scope.raw !== tenantPrefix && !a.scope.raw.startsWith(tenantPrefix + '/')) return false;
      }
      if (a.objectFilter && a.objectFilter.length > 0 && ctx.resource?.resourceId) {
        if (!a.objectFilter.includes(ctx.resource.resourceId)) return false;
      }
      return true;
    });

    for (const assignment of validAssignments) {
      const roleDef = this.getRoleDef(assignment.role);
      roleDef?.permissions.forEach(p => {
        if (!deniedSet.has(p)) grantedSet.add(p);
      });
    }

    return Array.from(grantedSet).sort();
  }

  private collectDenies(userId: string, now: Date): DenyAssignment[] {
    const direct = (this.store.get(userId)?.denies ?? [])
      .filter(d => d.status === 'active' && new Date(d.expiresAt) > now);

    const groupDenies: DenyAssignment[] = [];
    for (const group of this.accessGroups.values()) {
      if (group.members.some(m => m.userId === userId && new Date(m.expiresAt) > now)) {
        const gd = this.store.get(group.id);
        if (gd) {
          groupDenies.push(
            ...gd.denies.filter(d => d.status === 'active' && new Date(d.expiresAt) > now)
          );
        }
      }
    }
    return [...direct, ...groupDenies];
  }

  // PUBLIC: returns all active assignments with source metadata.
  // This is the canonical implementation. collectAssignments delegates here.
  getEffectiveAssignments(
    userId: string,
    now = new Date()
  ): EffectiveAssignment[] {
    const result: EffectiveAssignment[] = [];

    const direct = this.store.get(userId)?.assignments ?? [];
    for (const a of direct) {
      result.push({ assignment: a, source: 'direct' });
    }

    for (const group of this.accessGroups.values()) {
      const membership = group.members.find(
        m => m.userId === userId && new Date(m.expiresAt) > now
      );
      if (!membership) continue;
      const groupData = this.store.get(group.id);
      if (!groupData) continue;
      for (const ga of groupData.assignments) {
        if (ga.status !== 'active' || new Date(ga.expiresAt) <= now) continue;
        const effectiveScope = this.intersectScopes(
          group.scopeCeiling.path,
          membership.membershipScope?.path,
          ga.scope
        );
        if (!effectiveScope) continue;
        result.push({
          assignment: { ...ga, scope: effectiveScope },
          source: 'group',
          groupId: group.id,
          groupName: group.name,
        });
      }
    }

    return result;
  }

  private collectAssignments(userId: string, now: Date): RoleAssignment[] {
    return this.getEffectiveAssignments(userId, now).map(e => e.assignment);
  }

  // Intersect the group scope ceiling, membership scope, and assignment scope.
  //
  // Returns the narrowest scope that satisfies ALL three constraints, or null if
  // the constraints are incompatible (e.g. ceiling=CLT-A and membership=CLT-B
  // are sibling scopes — no valid intersection exists).
  private intersectScopes(
    ceiling: ScopePath | undefined,
    membershipScope: ScopePath | undefined,
    assignmentScope: ScopePath
  ): ScopePath | null {
    let effective = assignmentScope;
    const constraints = [ceiling, membershipScope].filter(Boolean) as ScopePath[];

    for (const constraint of constraints) {
      if (scopeContains(constraint, effective)) {
        // constraint is broader than or equal to effective — no change needed
        continue;
      }
      if (scopeContains(effective, constraint)) {
        // constraint is narrower — tighten the effective scope
        effective = constraint;
      } else {
        // sibling or incompatible paths — no valid intersection
        return null;
      }
    }
    return effective;
  }

  getSodViolation(userId: string, now = new Date()): string | null {
    return this.checkSoD(userId, now);
  }

  // Check for SoD violations among a user's active assignments.
  // Returns a human-readable description of the first violation found, or null.
  private checkSoD(userId: string, now: Date): string | null {
    const active = this.collectAssignments(userId, now).filter(
      a => a.status === 'active' && new Date(a.expiresAt) > now
    );

    for (const constraint of SOD_CONSTRAINTS) {
      const [roleA, roleB] = constraint.mutuallyExclusiveRoles;
      const assignmentsA = active.filter(a => a.role === roleA);
      const assignmentsB = active.filter(a => a.role === roleB);

      if (assignmentsA.length === 0 || assignmentsB.length === 0) continue;

      if (constraint.scopeContext === 'any-scope') {
        return `user holds both '${roleA}' and '${roleB}' (constraint: ${constraint.name})`;
      }

      // same-scope: violation only if scopes overlap
      for (const aA of assignmentsA) {
        for (const aB of assignmentsB) {
          if (
            scopeContains(aA.scope, aB.scope) ||
            scopeContains(aB.scope, aA.scope)
          ) {
            return `user holds both '${roleA}' at '${aA.scope.raw}' and '${roleB}' at '${aB.scope.raw}' (constraint: ${constraint.name})`;
          }
        }
      }
    }

    return null;
  }

  // Evaluates both resource conditions and request conditions against the context.
  //
  // Security invariant: if a condition RESTRICTS an attribute and the caller
  // did not supply that attribute in context → DENY.
  // "Can't prove compliance" is treated the same as "out of compliance."
  // This is the fail-closed model used by Azure ABAC and AWS IAM Conditions.
  private conditionsMatch(
    conditions: AssignmentConditions | undefined,
    ctx: EvaluationContext
  ): boolean {
    if (!conditions) return true;

    const res = ctx.resource;
    const req = ctx.request;

    // ── Resource conditions (static asset attributes) ─────────────────────────
    const rc = conditions.resource;
    if (rc) {
      // Cloud provider: if restricted and resource doesn't declare one, or doesn't match → deny
      if (rc.cloudProviders?.length) {
        if (!res?.cloudProvider || !rc.cloudProviders.includes(res.cloudProvider)) return false;
      }
      // Geographic zone
      if (rc.locations?.length) {
        if (!res?.location || !rc.locations.includes(res.location)) return false;
      }
      // Environment (prod/staging/dev)
      if (rc.environments?.length) {
        if (!res?.environment || !rc.environments.includes(res.environment)) return false;
      }
      // Asset ownership (att-owned / provider-owned / tenant-owned / reseller-owned)
      if (rc.assetOwnership?.length) {
        if (!res?.assetOwnership || !rc.assetOwnership.includes(res.assetOwnership)) return false;
      }
      // Data classification: assignment's value = maximum class this grant covers.
      // Resources without a declared classification are treated as 'unclassified'.
      if (rc.classification) {
        const resourceClass = res?.classification ?? 'unclassified';
        if (DATA_CLASS_ORDER.indexOf(resourceClass) > DATA_CLASS_ORDER.indexOf(rc.classification)) {
          return false;
        }
      }
    }

    // ── Request conditions (dynamic, evaluated at request time) ───────────────
    const reqc = conditions.request;
    if (reqc) {
      // MFA: if required and not verified → deny
      if (reqc.requiresMFA) {
        if (!req?.mfaVerified) return false;
      }

      // Out-of-band approval: if required and no token present → deny
      if (reqc.requiresApproval) {
        if (!req?.approvalToken) return false;
      }

      // IP allowlist: FAIL CLOSED. Supports both exact IPs and CIDR notation.
      // If a restriction is configured and we cannot verify the source IP → deny.
      // A missing ipAddress is not the same as "unrestricted" — it means unknown.
      if (reqc.allowedIPs?.length) {
        if (!req?.ipAddress) return false;          // can't verify → deny
        if (!reqc.allowedIPs.some(cidr => ipMatchesCIDR(req.ipAddress!, cidr))) return false;
      }

      // Time window: if restricted and no current time in context → deny
      if (reqc.timeWindow) {
        if (!req?.currentTime) return false;        // can't verify → deny
        const { daysOfWeek, startHour, endHour, timezone } = reqc.timeWindow;
        const localStr = req.currentTime.toLocaleString('en-US', { timeZone: timezone });
        const local = new Date(localStr);
        const day = local.getDay();
        const hour = local.getHours();
        if (!daysOfWeek.includes(day)) return false;
        if (hour < startHour || hour >= endHour) return false;
      }
    }

    return true;
  }
}

// Singleton for app use — rbacSlice calls setRoleDefinitions() after mutations
export const permissionResolver = new PermissionResolver();
