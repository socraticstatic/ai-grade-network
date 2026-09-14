import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Users,
  Network,
  Activity,
  CreditCard,
  Settings,
  Plus,
  ExternalLink,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HubConnectionGroups } from '../connection/hub/HubConnectionGroups';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MetricCard } from '../common/MetricCard';
import { ROLE_CATALOG } from '../../data/roleCatalog';
import { SCOPE_CATALOG } from '../../data/scopeCatalog';
import {
  scopeContains,
  CLIENT_POOL_SCOPE,
  buildScopePath,
  Permission,
} from '../../types/rbac';

// Permissions relevant at pool scope
const POOL_PERMS: Permission[] = [
  'pool:read', 'pool:write', 'pool:delete', 'pool:assign',
];

function scopeLabel(raw: string, poolId: string): string {
  if (raw === '/') return 'Platform-wide';
  if (/\/tenants\/[^/]+$/.test(raw)) return 'Tenant-wide';
  if (/\/clients\/[^/]+$/.test(raw)) {
    const clientId = raw.split('/clients/')[1]?.split('/')[0];
    const client = SCOPE_CATALOG.client.find(c => c.id === clientId);
    return client ? `Client — ${client.displayName}` : 'Client-wide';
  }
  if (/\/pools\/[^/]+$/.test(raw)) {
    const pid = raw.split('/pools/')[1]?.split('/')[0];
    if (pid === poolId) return 'This pool';
    const pool = SCOPE_CATALOG.pool.find(p => p.id === pid);
    return pool ? `Pool — ${pool.displayName}` : 'Pool-wide';
  }
  return raw;
}

function scopeBadgeClass(raw: string): string {
  if (/\/tenants\/[^/]+$/.test(raw) || raw === '/')
    return 'bg-fw-warningLight text-fw-warning border-fw-warning/30';
  if (/\/clients\/[^/]+$/.test(raw))
    return 'bg-fw-accent text-fw-cobalt-700 border-fw-cobalt-200';
  if (/\/pools\/[^/]+$/.test(raw))
    return 'bg-fw-successLight text-fw-success border-fw-success/30';
  return 'bg-fw-neutral text-fw-heading border-fw-secondary';
}

function permLabel(p: Permission): string {
  return p.split(':')[1] ?? p;
}

function PoolAccessTab({ poolId }: { poolId: string }) {
  const roleAssignments = useStore(s => s.roleAssignments);
  const roleDefinitions = useStore(s => s.roleDefinitions);

  const poolScope = useMemo(() => {
    if (!poolId) return null;
    const pool = SCOPE_CATALOG.pool.find(p => p.id === poolId);
    if (!pool) return null;
    return CLIENT_POOL_SCOPE('TNT-001', pool.clientId, pool.id);
  }, [poolId]);

  const effectiveAssignments = useMemo(() => {
    if (!poolScope) return [];

    return roleAssignments
      .filter(a => {
        if (a.status !== 'active') return false;
        const assignmentScope = buildScopePath(a.scope.raw);
        return scopeContains(assignmentScope, poolScope);
      })
      .map(a => {
        const roleDef =
          roleDefinitions.find(r => r.id === a.role) ??
          ROLE_CATALOG[a.role as keyof typeof ROLE_CATALOG];

        const poolPerms = (roleDef?.permissions ?? []).filter(
          p => POOL_PERMS.includes(p),
        );

        return {
          assignment: a,
          roleDef,
          poolPerms,
          isDirectScope: a.scope.raw === poolScope.raw,
        };
      })
      .filter(r => r.poolPerms.length > 0)
      .sort((a, b) => {
        const depthA = a.assignment.scope.segments.length;
        const depthB = b.assignment.scope.segments.length;
        if (depthA !== depthB) return depthA - depthB;
        return (a.assignment.principal.displayName ?? '').localeCompare(
          b.assignment.principal.displayName ?? '',
        );
      });
  }, [poolScope, roleAssignments, roleDefinitions]);

  if (!poolId || !poolScope) {
    return (
      <div className="p-8 text-center text-fw-bodyLight text-figma-sm">
        No pool selected.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-fw-wash border border-fw-secondary rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-fw-cobalt-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-figma-sm font-semibold text-fw-heading mb-0.5">
              Effective access — scope cascade
            </p>
            <p className="text-figma-xs text-fw-bodyLight">
              Assignments at broader scopes (tenant, client) cascade down and grant
              access here. "Granted via" shows where the assignment actually lives.
            </p>
          </div>
        </div>
      </div>

      {effectiveAssignments.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="h-8 w-8 text-fw-disabled mx-auto mb-2" />
          <p className="text-figma-sm text-fw-bodyLight">No active access to this pool.</p>
        </div>
      ) : (
        <div className="bg-fw-base border border-fw-secondary rounded-xl overflow-hidden">
          <table className="w-full text-figma-sm">
            <thead>
              <tr className="border-b border-fw-secondary bg-fw-wash">
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Principal
                </th>
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Granted via
                </th>
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Pool permissions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {effectiveAssignments.map(({ assignment, roleDef, poolPerms, isDirectScope }) => (
                <tr
                  key={assignment.id}
                  className="hover:bg-fw-wash transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-fw-accent border border-fw-secondary flex items-center justify-center shrink-0">
                        <span className="text-figma-xs font-semibold text-fw-cobalt-700">
                          {(assignment.principal.displayName ?? assignment.principal.id)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-fw-heading leading-tight">
                          {assignment.principal.displayName ?? assignment.principal.id}
                        </p>
                        <p className="text-figma-xs text-fw-disabled capitalize">
                          {assignment.principal.type}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-medium text-fw-heading">
                      {roleDef?.displayName ?? assignment.role}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-figma-xs font-medium border ${scopeBadgeClass(assignment.scope.raw)}`}
                      >
                        {scopeLabel(assignment.scope.raw, poolId)}
                      </span>
                      {!isDirectScope && (
                        <span className="flex items-center gap-0.5 text-figma-xs text-fw-bodyLight">
                          <ArrowRight className="h-3 w-3" />
                          cascades
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {poolPerms.map(p => (
                        <span
                          key={p}
                          className="px-1.5 py-0.5 text-figma-xs rounded bg-fw-neutral text-fw-heading font-mono"
                        >
                          {permLabel(p)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {effectiveAssignments.length > 0 && (
        <p className="text-figma-xs text-fw-bodyLight px-1">
          {effectiveAssignments.length} principal{effectiveAssignments.length !== 1 ? 's' : ''} have
          effective access —{' '}
          {effectiveAssignments.filter(r => !r.isDirectScope).length} via cascaded scope,{' '}
          {effectiveAssignments.filter(r => r.isDirectScope).length} direct.
        </p>
      )}
    </div>
  );
}

export function PoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groups = useStore(state => state.groups);
  const connections = useStore(state => state.connections);
  const users = useStore(state => state.users);
  const removeGroup = useStore(state => state.removeGroup);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'members' | 'performance' | 'access'>('overview');

  const pool = groups.find(g => g.id === id);
  const poolConnections = connections.filter(c => c.pool === id);
  const poolUsers = users.filter(u => pool?.userIds.includes(u.id));

  // Map group store IDs → SCOPE_CATALOG pool IDs for the RBAC Access tab
  const SCOPE_POOL_MAP: Record<string, string> = {
    'group-1': 'POOL-NE',
    'group-2': 'POOL-MW',
    'group-3': 'POOL-WC',
  };
  const scopePoolId = (id && SCOPE_CATALOG.pool.find(p => p.id === id)) ? id
    : (id ? SCOPE_POOL_MAP[id] ?? SCOPE_CATALOG.pool[0]?.id ?? '' : '');

  useEffect(() => {
    if (!pool && id) {
      navigate('/groups');
    }
  }, [pool, id, navigate]);

  if (!pool) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await removeGroup(pool.id);
      navigate('/groups');
      window.addToast({
        type: 'success',
        title: 'Pool Deleted',
        message: 'Pool has been successfully deleted.',
        duration: 3000
      });
    } catch (error) {
      window.addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete pool. Please try again.',
        duration: 3000
      });
    }
  };

  const totalBandwidth = poolConnections.reduce((total, conn) => {
    const bw = parseFloat(conn.bandwidth.replace(/[^\d.]/g, ''));
    return total + (isNaN(bw) ? 0 : bw);
  }, 0);

  const avgUtilization = poolConnections.reduce((total, conn) => {
    return total + (conn.performance?.bandwidthUtilization || 0);
  }, 0) / (poolConnections.length || 1);

  const activeConnections = poolConnections.filter(c => c.status === 'Active').length;

  return (
    <div className="min-h-screen bg-fw-wash">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/groups')}
            className="inline-flex items-center text-figma-sm font-medium text-fw-bodyLight hover:text-fw-heading mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Pools
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">{pool.name}</h1>
              {pool.description && (
                <p className="mt-2 text-figma-base font-medium text-fw-body">{pool.description}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <StatusBadge
                  status={pool.status}
                  label={pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
                />
                <span className="text-figma-sm font-medium text-fw-bodyLight">Type: {pool.type}</span>
                <span className="text-figma-sm font-medium text-fw-bodyLight">
                  Created {new Date(pool.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <IconButton
                icon={<Edit2 className="h-5 w-5" />}
                title="Edit Pool"
                onClick={() => navigate(`/groups/${pool.id}/edit`)}
              />
              <IconButton
                icon={<Trash2 className="h-5 w-5" />}
                title="Delete Pool"
                onClick={() => setShowDeleteConfirm(true)}
                variant="danger"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Connections"
            value={poolConnections.length.toString()}
            icon={Network}
            trend={activeConnections > 0 ? {
              value: `${activeConnections} active`,
              isPositive: true
            } : undefined}
          />
          <MetricCard
            title="Members"
            value={poolUsers.length.toString()}
            icon={Users}
          />
          <MetricCard
            title="Total Bandwidth"
            value={`${totalBandwidth} Gbps`}
            icon={Activity}
          />
          <MetricCard
            title="Avg Utilization"
            value={`${avgUtilization.toFixed(1)}%`}
            icon={CreditCard}
            trend={{
              value: avgUtilization > 75 ? 'High' : 'Normal',
              isPositive: avgUtilization <= 75
            }}
          />
        </div>

        <div className="mb-6">
          <div className="border-b border-fw-secondary">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Settings },
                { id: 'connections', label: 'Connections', icon: Network },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'performance', label: 'Performance', icon: Activity },
                { id: 'access', label: 'Access', icon: Shield },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-figma-base no-rounded tracking-[-0.03em]
                    ${activeTab === tab.id
                      ? 'border-fw-active text-fw-link'
                      : 'border-transparent text-fw-bodyLight hover:text-fw-body hover:border-fw-secondary'
                    }
                  `}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Pool Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Pool ID</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading font-mono">{pool.id}</dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Type</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading capitalize">{pool.type}</dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Status</dt>
                    <dd className="mt-1">
                      <StatusBadge
                        status={pool.status}
                        label={pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Created</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading">
                      {new Date(pool.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  {pool.updatedAt && (
                    <div>
                      <dt className="text-figma-sm font-medium text-fw-bodyLight">Last Updated</dt>
                      <dd className="mt-1 text-figma-base font-medium text-fw-heading">
                        {new Date(pool.updatedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>

            {pool.contacts && pool.contacts.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Contacts</h3>
                  <div className="space-y-4">
                    {pool.contacts.map((contact, index) => (
                      <div key={index} className="flex items-start justify-between border-b border-fw-secondary pb-4 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-fw-heading">{contact.name}</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight">{contact.role}</p>
                          <div className="mt-1 space-y-1">
                            <p className="text-figma-sm font-medium text-fw-bodyLight">{contact.email}</p>
                            <p className="text-figma-sm font-medium text-fw-bodyLight">{contact.phone}</p>
                          </div>
                        </div>
                        {contact.isPrimary && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-accent text-fw-link">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Connections</h3>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => navigate('/wizard')}
                >
                  Add Connection
                </Button>
              </div>

              {poolConnections.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="mx-auto h-12 w-12 text-fw-bodyLight" />
                  <h3 className="mt-2 text-figma-base font-medium text-fw-heading">No connections</h3>
                  <p className="mt-1 text-figma-sm font-medium text-fw-bodyLight">
                    Get started by adding a connection to this pool.
                  </p>
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      leftIcon={Plus}
                      onClick={() => navigate('/wizard')}
                    >
                      Add Connection
                    </Button>
                  </div>
                </div>
              ) : (
                // Same site-wide pattern: connections grouped by type (per-type columns),
                // with the Hub column and a right-hand drawer on row click.
                <HubConnectionGroups connections={poolConnections} showHub filterable />
              )}
            </div>
          </Card>
        )}

        {activeTab === 'members' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Members</h3>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => window.addToast?.({ type: 'info', title: 'Add Member', message: 'Member management is available in the full product.', duration: 3000 })}
                >
                  Add Member
                </Button>
              </div>

              <div className="space-y-4">
                {poolUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between border-b border-fw-secondary pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-fw-neutral flex items-center justify-center border border-fw-secondary text-fw-body font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-fw-heading">{user.name}</p>
                        <p className="text-figma-sm font-medium text-fw-bodyLight">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-figma-sm font-medium text-fw-bodyLight capitalize">{user.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Avg Latency</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {pool.performance?.aggregatedMetrics.averageLatency || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Avg Packet Loss</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {pool.performance?.aggregatedMetrics.averagePacketLoss || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Avg Uptime</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {pool.performance?.aggregatedMetrics.averageUptime || 'N/A'}
                    </dd>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'access' && <PoolAccessTab poolId={scopePoolId} />}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Pool"
        message={`Are you sure you want to delete "${pool.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
