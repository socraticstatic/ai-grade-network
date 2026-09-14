// src/types/rbac.ts

// ── Scope path ──────────────────────────────────────────────────────────────
export type ScopeTier =
  | 'platform'
  | 'reseller'
  | 'tenant'
  | 'client'
  | 'pool'
  | 'connection'
  | 'hub';

export interface ScopePath {
  tier: ScopeTier;
  segments: string[]; // e.g. ['resellers','RSL-001','tenants','TNT-001']
  raw: string;        // e.g. '/resellers/RSL-001/tenants/TNT-001'
}

// ── Resource attribute types ─────────────────────────────────────────────────
// These are properties OF the asset being acted on — static, not request-time.

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'oracle';
export type GeographicZone = 'US-East' | 'US-West' | 'EU-West' | 'Asia-Pacific';
export type Environment = 'prod' | 'staging' | 'dev';
export type DataClass = 'unclassified' | 'cui' | 'sensitive';

// Who owns the physical/logical asset.
// att-owned      — AT&T backbone, managed CPE, cross-connects
// provider-owned — Azure/AWS/GCP endpoint routers
// tenant-owned   — customer BYOD (bring-your-own-device: their own CPE/routers)
// reseller-owned — partner/VAR equipment between AT&T and the customer
export type AssetOwnership =
  | 'att-owned'
  | 'provider-owned'
  | 'tenant-owned'
  | 'reseller-owned';

// ── Condition types ──────────────────────────────────────────────────────────
// Two fundamentally distinct kinds of constraints on a role assignment.

// What RESOURCES this assignment covers (matched against the target asset).
// If a field is set and the resource doesn't declare that attribute → DENY.
export interface ResourceConditions {
  cloudProviders?: CloudProvider[];   // absent = all providers
  locations?: GeographicZone[];       // absent = all locations
  environments?: Environment[];       // absent = all environments
  assetOwnership?: AssetOwnership[];  // absent = all ownership types
  classification?: DataClass;         // max data class this assignment is valid for
}

// HOW and WHEN this assignment may be used (matched against the request itself).
export interface RecurringWindow {
  daysOfWeek: number[];  // 0=Sun … 6=Sat
  startHour: number;     // local hour in tz (0–23)
  endHour: number;       // local hour in tz (0–23)
  timezone: string;      // IANA timezone — required, not optional (e.g. 'America/Chicago')
}

export interface RequestConditions {
  requiresMFA?: boolean;
  requiresApproval?: boolean;
  allowedIPs?: string[];
  timeWindow?: RecurringWindow;
}

// Unified condition bag on any assignment. Replaces the old ScopeDimensions +
// AssignmentConditions split that conflated resource attributes with request circumstances.
export interface AssignmentConditions {
  resource?: ResourceConditions;
  request?: RequestConditions;
}

// ── Evaluation context passed to can() ──────────────────────────────────────

// What you know about the TARGET RESOURCE at call time.
export interface ResourceContext {
  resourceId?: string;           // specific resource ID — used to evaluate objectFilter on assignments
  cloudProvider?: CloudProvider;
  location?: GeographicZone;
  environment?: Environment;
  assetOwnership?: AssetOwnership;
  classification?: DataClass;
}

// What you know about the REQUEST ITSELF at call time.
// The resolver uses these to evaluate RequestConditions on an assignment.
// Security rule: if a condition is set and the required context field is absent → DENY.
// Callers must provide every field that any active assignment might test.
export interface RequestContext {
  currentTime?: Date;
  mfaVerified?: boolean;           // true only after MFA challenge completed this session
  ipAddress?: string;              // source IP of the request; required when any assignment has allowedIPs
  approvalToken?: string;          // present when an explicit out-of-band approval has been obtained
}

// Combined context for can().
export interface EvaluationContext {
  resource?: ResourceContext;
  request?: RequestContext;
}

// ── Permissions ──────────────────────────────────────────────────────────────
// Format: {object}:{action}
// Actions map 1:1 to real UI capabilities confirmed in the codebase:
//   connection  — ConnectionOverflowMenu: view, activate/deactivate, modify bandwidth, edit, export, clone, delete
//   link        — LinkTable: view, add/edit (incl. VLAN/MTU config), delete
//   hub — HubTable: view, add/edit (incl. BGP/policy config), delete
//   vnf         — VNFTable: view, edit, delete; operate = start/stop/restart
//   subnet      — IP subnets on connections/links: view, add/edit, remove
//   pool        — GroupOverflowMenu: view, edit, manage members (assign), delete
//   monitoring  — Metrics/health: view; operate = acknowledge/dismiss alerts
//   alert-rule  — Threshold rules: view, create/edit, delete
//   report      — Reports: view, create saved reports, delete saved reports, export
//   user        — UserList: view, invite/edit, deactivate (operate), remove (delete)
//   role        — RoleCatalog: view, create/edit custom roles, delete custom roles
//   role-assignment — Assignments: view, assign, revoke
//   billing     — Billing tab: view, finance ops (process/approve), export
//   policy      — PoliciesTab routing/security rules: view, create/edit, delete, assign
//   partner     — Partner/reseller records (platform admin): view, create/edit, delete
//   api         — APIConfiguration: view, create/edit keys, delete keys, configure settings
//   tenant      — Tenant settings: view, edit, administer (sub-tenant management)
//   system      — Platform system config: view, configure, administer
//   audit       — Audit logs: view only
export type Permission =
  // Network connections (the primary resource)
  | 'connection:read'       // view connection list and detail
  | 'connection:write'      // create new connection; edit name, type, config
  | 'connection:delete'     // delete connection
  | 'connection:operate'    // activate / deactivate (toggle status)
  | 'connection:bandwidth'  // modify bandwidth tier (Modify Bandwidth modal)
  | 'connection:configure'  // change IP/BGP/routing configuration on a connection
  | 'connection:export'     // export connection data to CSV

  // Links (VLANs within a connection)
  | 'link:read'             // view links
  | 'link:write'            // create or edit a link (name, VLAN ID, MTU, QoS)
  | 'link:delete'           // delete a link
  | 'link:configure'        // change IP addressing / routing config on a link

  // IP subnets (CIDRs assigned to connections and links)
  | 'subnet:read'           // view IP subnets configured on connections/links
  | 'subnet:write'          // add or edit IP subnets
  | 'subnet:delete'         // remove IP subnets

  // Hubs (AT&T/provider router instances)
  | 'hub:read'     // view hubs
  | 'hub:write'    // create or edit a hub
  | 'hub:delete'   // delete a hub
  | 'hub:configure'// configure BGP, route filters, policies on a hub

  // Virtual Network Functions
  | 'vnf:read'              // view VNFs
  | 'vnf:write'             // add or edit a VNF
  | 'vnf:delete'            // delete a VNF
  | 'vnf:operate'           // start / stop / restart a VNF

  // Pools (connection groups)
  | 'pool:read'             // view pools
  | 'pool:write'            // create or edit a pool
  | 'pool:delete'           // delete a pool
  | 'pool:assign'           // add/remove connections from a pool

  // Monitoring and alerting
  | 'monitoring:read'       // view metrics, health dashboards
  | 'monitoring:operate'    // acknowledge or dismiss alerts

  // Alert rules (configured thresholds)
  | 'alert-rule:read'       // view alert rules
  | 'alert-rule:write'      // create or edit alert rules
  | 'alert-rule:delete'     // delete alert rules

  // Reports
  | 'report:read'           // view and run reports
  | 'report:write'          // create or edit saved report configurations
  | 'report:delete'         // delete saved report configurations
  | 'report:export'         // export report output to CSV/PDF

  // Users
  | 'user:read'             // view user list and profiles
  | 'user:write'            // invite or edit users
  | 'user:delete'           // remove users
  | 'user:operate'          // deactivate / reactivate users

  // Roles
  | 'role:read'             // view role catalog
  | 'role:write'            // create or edit custom roles
  | 'role:delete'           // delete custom roles

  // Role assignments
  | 'role-assignment:read'  // view role assignments
  | 'role-assignment:assign'// create role assignments
  | 'role-assignment:revoke'// revoke role assignments

  // Billing
  | 'billing:read'          // view invoices and usage data
  | 'billing:finance'       // process payments, approve charges
  | 'billing:export'        // export billing data

  // Routing and security policies
  | 'policy:read'           // view routing/security policies
  | 'policy:write'          // create or edit policies
  | 'policy:delete'         // delete policies
  | 'policy:assign'         // assign policies to connections or routers

  // Partner / reseller records (platform admin only)
  | 'partner:read'          // view partner accounts
  | 'partner:write'         // create or edit partner records
  | 'partner:delete'        // offboard a partner

  // API keys and access
  | 'api:read'              // view API keys and configuration
  | 'api:write'             // create or edit API keys
  | 'api:delete'            // delete API keys
  | 'api:configure'         // configure API hub settings

  // Tenant management
  | 'tenant:read'           // view tenant settings
  | 'tenant:write'          // edit tenant configuration
  | 'tenant:administer'     // manage sub-tenants, billing, full tenant control

  // Platform system
  | 'system:read'           // view system configuration
  | 'system:configure'      // change system settings
  | 'system:administer'     // full platform administration

  // Audit
  | 'audit:read'            // view audit log (read-only)

  // Design libraries (platform-exclusive)
  | 'design-library:read'       // view platform design libraries / templates
  | 'design-library:write'      // create or edit design libraries
  | 'design-library:delete'     // delete design libraries
  | 'design-library:clone'      // clone a design library down to a reseller or tenant
  | 'design-library:import'     // import a JSON design library (reseller action)

  // NetBond instances (platform-exclusive)
  | 'instance:read'             // view NetBond instances / regions
  | 'instance:add'              // provision a new NetBond instance
  | 'instance:configure'        // configure an instance

  // Reseller accounts (platform-exclusive)
  | 'reseller:read'             // view reseller / channel partner accounts
  | 'reseller:write'            // create or edit reseller accounts
  | 'reseller:delete'           // offboard a reseller
  | 'reseller:suspend'          // suspend or unsuspend a reseller account

  // Tenant provisioning (reseller-exclusive)
  | 'tenant:provision'          // add a new tenant account under this reseller
  | 'tenant:suspend'            // suspend or unsuspend a tenant account

  // Business unit management (tenant-exclusive)
  | 'client:read'               // view business units
  | 'client:write'              // add or edit a business unit
  | 'client:delete';            // delete a business unit

// ── Roles ────────────────────────────────────────────────────────────────────
// BC hands us ~10 empty bucket names. We own the permission mapping.
// RoleSource distinguishes AT&T Business Center templates from admin-created roles.
export type RoleSource = 'bc-template' | 'custom';

// The canonical BC role name enum — used for SoD constraint pairs and static lookups.
export type RoleName =
  | 'NetworkEngineer'
  | 'SupportSpecialist'
  | 'BillingAdmin'
  | 'SecurityAdmin'
  | 'OperationsManager'
  | 'PartnerManager'
  | 'ResellerAdmin'
  | 'ApiManager'
  | 'ProvisioningManager'
  | 'Viewer'          // tenant-scoped read-only — tenant + BU objects only
  | 'PlatformViewer'  // platform-scoped read-only — all objects including AT&T-internal
  | 'ClientAdmin'
  | 'TenantAdmin'
  | 'PlatformAdmin';

export interface RoleDefinition {
  id: string;              // bc-template: same as RoleName; custom: uuid
  displayName: string;
  description: string;
  permissions: Permission[];
  maxScopeTier: ScopeTier;
  source: RoleSource;
  derivedFrom?: string;    // bc-template id this was cloned from
  createdBy?: string;
  createdAt?: string;
  tenantScoped?: string;   // if set, role is only valid within this tenant id
}

// ── Role assignments ─────────────────────────────────────────────────────────
export type AssignmentStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'pending-approval'
  | 'exceeds-ceiling';

export interface RoleAssignment {
  id: string;
  principal: {
    id: string;
    type: 'user' | 'group' | 'service-principal';
    displayName: string;
  };
  role: string;                      // bc-template RoleName OR custom role id
  scope: ScopePath;
  conditions?: AssignmentConditions; // resource + request conditions (replaces scopeDimensions)
  objectFilter?: string[];           // specific resource IDs; empty = all in scope
  justification: string;             // mandatory
  grantedBy: string;
  grantedAt: string;                 // ISO 8601
  approvedBy?: string;
  expiresAt: string;                 // ISO 8601, mandatory
  reviewCycle: 'quarterly' | 'annual' | 'audit-close';
  status: AssignmentStatus;
  revokedBy?: string;
  revokedAt?: string;
  revokeReason?: string;
}

// ── Deny assignments ─────────────────────────────────────────────────────────
export type DenyStatus = 'active' | 'expired' | 'lifted';

export interface DenyAssignment {
  id: string;
  principal: {
    id: string;
    type: 'user' | 'group' | 'service-principal';
    displayName: string;
  };
  permissions: Permission[];
  scope: ScopePath;
  conditions?: AssignmentConditions;
  justification: string;
  grantedBy: string;
  grantedAt: string;
  approvedBy: string;      // always required for deny
  expiresAt: string;       // emergency lockouts default to +48h
  status: DenyStatus;
  liftedBy?: string;
  liftedAt?: string;
  liftReason?: string;
}

// ── Access Groups ─────────────────────────────────────────────────────────────
export type AccessGroupPurpose =
  | 'organizational'
  | 'resource-cluster'
  | 'project'
  | 'audit-engagement';

export type AccessGroupStatus =
  | 'active'
  | 'suspended'
  | 'ownerless'
  | 'pending-review'
  | 'closed';

export type OwnerlessPolicy = 'suspend' | 'inherit-tenant-admin' | 'freeze';

export interface AccessGroupMember {
  userId: string;
  displayName: string;
  membershipScope: { path?: ScopePath; conditions?: AssignmentConditions } | null;
  justification: string;
  addedBy: string;
  addedAt: string;
  expiresAt: string;
}

export interface AccessGroupCeiling {
  path?: ScopePath;
  conditions?: AssignmentConditions;
}

export interface AccessGroup {
  id: string;
  name: string;
  description: string;
  purpose: AccessGroupPurpose;
  owner: string;
  ownerSuccessor?: string;
  ownerlessPolicy: OwnerlessPolicy;
  scopeCeiling: AccessGroupCeiling;
  members: AccessGroupMember[];
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  reviewCycle: 'quarterly' | 'annual';
  status: AccessGroupStatus;
  engagementMetadata?: {
    subject: string;
    auditingBody: string;
    closedAt?: string;
    closedBy?: string;
  };
}

// ── SoD Constraints ───────────────────────────────────────────────────────────
export interface SodConstraint {
  id: string;
  name: string;
  mutuallyExclusiveRoles: [string, string]; // role ids (bc-template names or custom ids)
  scopeContext: 'same-scope' | 'any-scope';
  checkOn: Array<'role-assignment' | 'group-role-assignment' | 'membership-assignment'>;
  flagExistingViolations: boolean;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  principalId: string;
  principalName: string;
  action: string;
  objectType: string;
  objectId?: string;
  objectName?: string;
  scope: ScopePath;
  result: 'ALLOW' | 'DENY';
  denyReason?: string;
  ipAddress?: string;
}

// ── Scope helpers ─────────────────────────────────────────────────────────────
export function buildScopePath(raw: string): ScopePath {
  const segments = raw.replace(/^\//, '').split('/').filter(Boolean);
  const tier = inferTier(segments);
  return { tier, segments, raw: raw === '/' ? '/' : raw };
}

function inferTier(segments: string[]): ScopeTier {
  if (segments.length === 0) return 'platform';
  const key = segments[segments.length - 2]; // key before the ID
  const map: Record<string, ScopeTier> = {
    resellers: 'reseller',
    tenants: 'tenant',
    clients: 'client',
    pools: 'pool',
    connections: 'connection',
    'hubs': 'hub',
  };
  return map[key] ?? 'platform';
}

export const PLATFORM_SCOPE: ScopePath = buildScopePath('/');

// /resellers/{resellerId}
export const RESELLER_SCOPE = (resellerId: string): ScopePath =>
  buildScopePath(`/resellers/${resellerId}`);

// /tenants/{tenantId}
export const TENANT_SCOPE = (tenantId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}`);

// /tenants/{tenantId}/clients/{clientId}  — "client" = business unit within a tenant
export const CLIENT_SCOPE = (tenantId: string, clientId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/clients/${clientId}`);

// /tenants/{tenantId}/clients/{clientId}/pools/{poolId}
export const CLIENT_POOL_SCOPE = (tenantId: string, clientId: string, poolId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/clients/${clientId}/pools/${poolId}`);

// /tenants/{tenantId}/pools/{poolId}  — direct tenant pool (no client level)
export const POOL_SCOPE = (tenantId: string, poolId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/pools/${poolId}`);

// /tenants/{tenantId}/clients/{clientId}/pools/{poolId}/connections/{connId}
export const CONNECTION_SCOPE = (tenantId: string, clientId: string, poolId: string, connId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/clients/${clientId}/pools/${poolId}/connections/${connId}`);

// /tenants/{tenantId}/clients/{clientId}/pools/{poolId}/hubs/{routerId}
export const HUB_SCOPE = (tenantId: string, clientId: string, poolId: string, routerId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/clients/${clientId}/pools/${poolId}/hubs/${routerId}`);

// True if parent covers child (parent = child, or parent is an ancestor of child).
export function scopeContains(parent: ScopePath, child: ScopePath): boolean {
  if (parent.raw === '/') return true;
  return child.raw === parent.raw || child.raw.startsWith(parent.raw + '/');
}

// ── Just-in-Time (JIT) eligible assignments ───────────────────────────────────
// An eligible assignment grants the right to ACTIVATE time-bound access, not
// permanent access. The resolver ignores eligible assignments; on activation,
// a time-bounded RoleAssignment (status: 'active') is minted and loaded into
// the resolver store. The eligible record tracks the cumulative activation history.
//
// This is the Privileged Identity Management (PIM) model used by Azure and GCP
// Privileged Access Manager. It prevents standing privilege by requiring an
// explicit activation step — which can require MFA, approval, or both.

export type EligibleAssignmentStatus = 'eligible' | 'activated' | 'expired' | 'revoked';

export interface EligibleAssignment {
  id: string;
  principal: {
    id: string;
    type: 'user' | 'group' | 'service-principal';
    displayName: string;
  };
  role: string;
  scope: ScopePath;
  conditions?: AssignmentConditions;
  justification: string;            // why this person is eligible
  grantedBy: string;
  grantedAt: string;                // ISO 8601 — when eligibility was granted
  expiresAt: string;                // ISO 8601 — eligibility window (NOT the activation window)
  maxActivationDuration: number;    // seconds; cap on a single activation session
  requiresApproval: boolean;        // if true, activation needs a second approver
  reviewCycle: 'quarterly' | 'annual';
  status: EligibleAssignmentStatus;
  lastActivatedAt?: string;         // ISO 8601
  activationCount: number;          // cumulative activations for audit
}

// Human-readable label for a scope path — used in UI displays, never for logic.
export function scopeLabel(scope: ScopePath): string {
  const segs = scope.segments;
  if (segs.length === 0) return 'Platform';
  // Extract the last ID segment (the value after the type key)
  const id = segs[segs.length - 1];
  const labels: Record<string, string> = {
    resellers: 'Reseller',
    tenants: 'Tenant',
    clients: 'Client',
    pools: 'Pool',
    connections: 'Connection',
    'hubs': 'Hub',
  };
  const typeKey = segs[segs.length - 2];
  const typeName = labels[typeKey] ?? scope.tier;
  return `${typeName} — ${id}`;
}
