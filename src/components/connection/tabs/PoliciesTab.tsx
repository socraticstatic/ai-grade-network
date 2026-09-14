import { useState, useMemo } from 'react';
import {
  Plus, Play, Pause, Edit2, Trash2, X,
  Shield, AlertTriangle, Check, Network, Layers,
  ChevronDown, ChevronUp, Globe, ArrowRight, Settings,
  Upload, Download, FileText
} from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { CopyButton } from '../../common/CopyButton';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { OverflowMenu } from '../../common/OverflowMenu';
import { Toggle } from '../../common/Toggle';
import { RoutingPolicy, PolicyAppliesTo, PolicyAction, PolicyProtocol, InheritedPolicyOverride, PolicyPrefix, PolicyCommunity, PolicyASPath, PolicyProtocolContext } from '../../../types/routingPolicy';
import { Connection } from '../../../types';
import { Hub } from '../../../types/hub';
import { VNF } from '../../../types/vnf';
import { Link } from '../../../types';
import { Modal } from '../../common/Modal';
import { SideDrawer } from '../../common/SideDrawer';
import { FormField } from '../../form/FormField';

interface PoliciesTabProps {
  /** Optional — present on the connection page. On the hub page pass ownerName instead. */
  connection?: Connection;
  hubs: Hub[];
  vnfs: VNF[];
  allLinks: Link[];
  /** Display name for the heading when there's no single connection (hub use). */
  ownerName?: string;
}

const POLICY_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'action',
    label: 'Action',
    type: 'checkbox',
    options: [
      { value: 'allow', label: 'Allow', color: 'success' },
      { value: 'deny', label: 'Deny', color: 'error' },
      { value: 'manipulate', label: 'Manipulate', color: 'warning' },
      { value: 'advertise', label: 'Advertise', color: 'info' },
    ],
  },
  {
    id: 'appliesTo',
    label: 'Applies To',
    type: 'checkbox',
    options: [
      { value: 'all', label: 'All' },
      { value: 'links', label: 'Links' },
      { value: 'hubs', label: 'Hubs' },
      { value: 'vnfs', label: 'VNFs' },
    ],
  },
  {
    id: 'enabled',
    label: 'Status',
    type: 'select',
    placeholder: 'All',
    options: [
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
];

export function PoliciesTab({ connection, hubs, vnfs, allLinks, ownerName }: PoliciesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOverflow, setActiveOverflow] = useState<string | null>(null);
  const [selectedAppliesTo, setSelectedAppliesTo] = useState<PolicyAppliesTo>('all');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<PolicyAction>('allow');

  // Policy configuration options from Configure > Policies
  const [policyDirection, setPolicyDirection] = useState<'onPremiseToPartner' | 'partnerToOnPremise' | 'both'>('both');
  const [specificOptions, setSpecificOptions] = useState({
    matchingRoutes: false,
    blockDefaultRoutes: false,
    communityValueFilter: false,
    prependASN: false,
    cvTagging: false,
    advertiseStatic: false
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RoutingPolicy | undefined>();
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: POLICY_FILTER_GROUPS,
  });

  // Sample routing policies
  const [policies, setPolicies] = useState<RoutingPolicy[]>([
    {
      id: 'policy-1',
      name: 'Production Traffic Priority',
      description: 'Allow production traffic over all links',
      enabled: true,
      priority: 100,
      action: 'allow',
      protocol: 'any',
      conditions: [
        { id: 'cond-1', type: 'prefix', operator: 'matches', value: '10.0.0.0/8' },
        { id: 'cond-2', type: 'community', operator: 'contains', value: '65000:100' }
      ],
      appliesTo: 'links',
      targetIds: ['link-1', 'link-2'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-03-10T14:30:00Z',
      createdBy: 'admin@att.com'
    },
    {
      id: 'policy-2',
      name: 'Block Suspicious Traffic',
      description: 'Deny traffic from known malicious sources',
      enabled: true,
      priority: 200,
      action: 'deny',
      protocol: 'tcp',
      conditions: [
        { id: 'cond-3', type: 'source', operator: 'matches', value: '192.168.100.0/24' },
        { id: 'cond-4', type: 'port', operator: 'range', value: '1-1024' }
      ],
      appliesTo: 'all',
      targetIds: [],
      createdAt: '2024-02-01T09:15:00Z',
      updatedAt: '2024-02-20T11:45:00Z',
      createdBy: 'security@att.com'
    },
    {
      id: 'policy-3',
      name: 'BGP AS Path Prepending',
      description: 'Manipulate route advertisements by prepending AS path',
      enabled: true,
      priority: 75,
      action: 'manipulate',
      protocol: 'bgp',
      conditions: [
        { id: 'cond-5', type: 'as-path', operator: 'contains', value: '65001' },
        { id: 'cond-6', type: 'prefix', operator: 'matches', value: '172.16.0.0/12' }
      ],
      appliesTo: 'hubs',
      targetIds: ['cr-1'],
      createdAt: '2024-01-20T13:30:00Z',
      updatedAt: '2024-03-05T16:00:00Z',
      createdBy: 'network@att.com'
    },
    {
      id: 'policy-4',
      name: 'Advertise Static Routes',
      description: 'Advertise static routes to BGP neighbors',
      enabled: false,
      priority: 50,
      action: 'advertise',
      protocol: 'bgp',
      conditions: [
        { id: 'cond-7', type: 'prefix', operator: 'matches', value: '192.168.0.0/16' }
      ],
      appliesTo: 'vnfs',
      targetIds: ['vnf-1', 'vnf-2'],
      createdAt: '2024-02-10T11:00:00Z',
      updatedAt: '2024-03-01T09:20:00Z',
      createdBy: 'network@att.com'
    }
  ]);

  // Inherited global policies with per-connection specificity
  const [inheritedPolicies, setInheritedPolicies] = useState<InheritedPolicyOverride[]>([
    {
      globalPolicyId: 'deny-matching-routes',
      globalPolicyName: 'Deny Matching Routes',
      globalPolicyAction: 'deny',
      protocolContext: 'l3vpn-ipv4',
      direction: 'onPremiseToPartner',
      overrideEnabled: true,
      prefixes: [
        { id: 'p1', value: '192.168.100.0/24', action: 'include' },
        { id: 'p2', value: '10.255.0.0/16', action: 'include' },
      ],
      communities: [],
      asPathFilters: [],
      priority: 300,
    },
    {
      globalPolicyId: 'deny-matching-routes-reverse',
      globalPolicyName: 'Deny Matching Routes',
      globalPolicyAction: 'deny',
      protocolContext: 'l3vpn-ipv4',
      direction: 'partnerToOnPremise',
      overrideEnabled: false,
      prefixes: [],
      communities: [],
      asPathFilters: [],
      priority: 300,
    },
    {
      globalPolicyId: 'block-default-routes',
      globalPolicyName: 'Block Default Routes',
      globalPolicyAction: 'deny',
      protocolContext: 'l3vpn-ipv4',
      direction: 'onPremiseToPartner',
      overrideEnabled: true,
      prefixes: [
        { id: 'p3', value: '0.0.0.0/0', action: 'include' },
      ],
      communities: [],
      asPathFilters: [],
      priority: 350,
    },
    {
      globalPolicyId: 'advertise-static',
      globalPolicyName: 'Advertise Static Routes',
      globalPolicyAction: 'advertise',
      protocolContext: 'l3vpn-ipv4',
      direction: 'onPremiseToPartner',
      overrideEnabled: true,
      prefixes: [
        { id: 'p4', value: '10.0.0.0/8', action: 'include' },
        { id: 'p5', value: '172.16.0.0/12', action: 'include' },
        { id: 'p6', value: '192.168.0.0/16', action: 'include' },
      ],
      communities: [
        { id: 'c1', value: '65000:100', action: 'tag' },
      ],
      asPathFilters: [],
      priority: 50,
    },
    {
      globalPolicyId: 'community-filter-customer',
      globalPolicyName: 'Community Value Filter (Customer)',
      globalPolicyAction: 'allow',
      protocolContext: 'l3vpn-ipv6',
      direction: 'onPremiseToPartner',
      overrideEnabled: false,
      prefixes: [],
      communities: [
        { id: 'c2', value: '65000:*', action: 'match' },
      ],
      asPathFilters: [],
      priority: 200,
    },
  ]);

  const [expandedInherited, setExpandedInherited] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const [newPrefixInputs, setNewPrefixInputs] = useState<Record<string, string>>({});
  const [bulkEditMode, setBulkEditMode] = useState<Record<string, boolean>>({});
  const [bulkEditText, setBulkEditText] = useState<Record<string, string>>({});

  const toggleInheritedOverride = (id: string) => {
    setInheritedPolicies(prev => prev.map(p =>
      p.globalPolicyId === id ? { ...p, overrideEnabled: !p.overrideEnabled } : p
    ));
  };

  const addPrefix = (policyId: string) => {
    const value = newPrefixInputs[policyId]?.trim();
    if (!value) return;
    // Basic CIDR validation
    const cidrPattern = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!cidrPattern.test(value)) {
      window.addToast?.({ type: 'error', title: 'Invalid Prefix', message: 'Enter a valid CIDR notation (e.g., 10.0.0.0/8)', duration: 3000 });
      return;
    }
    setInheritedPolicies(prev => prev.map(p =>
      p.globalPolicyId === policyId ? { ...p, prefixes: [...p.prefixes, { id: `p-${Date.now()}`, value, action: 'include' }] } : p
    ));
    setNewPrefixInputs(prev => ({ ...prev, [policyId]: '' }));
  };

  const removePrefix = (policyId: string, prefixId: string) => {
    setInheritedPolicies(prev => prev.map(p =>
      p.globalPolicyId === policyId ? { ...p, prefixes: p.prefixes.filter(px => px.id !== prefixId) } : p
    ));
  };

  const addCommunity = (policyId: string, value: string, action: 'match' | 'tag' | 'strip') => {
    if (!value.trim()) return;
    setInheritedPolicies(prev => prev.map(p =>
      p.globalPolicyId === policyId ? { ...p, communities: [...p.communities, { id: `c-${Date.now()}`, value: value.trim(), action }] } : p
    ));
  };

  const removeCommunity = (policyId: string, communityId: string) => {
    setInheritedPolicies(prev => prev.map(p =>
      p.globalPolicyId === policyId ? { ...p, communities: p.communities.filter(c => c.id !== communityId) } : p
    ));
  };

  // Bulk operations
  const cidrPattern = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;

  const enterBulkEdit = (policyId: string) => {
    const policy = inheritedPolicies.find(p => p.globalPolicyId === policyId);
    if (!policy) return;
    setBulkEditText(prev => ({ ...prev, [policyId]: policy.prefixes.map(p => p.value).join('\n') }));
    setBulkEditMode(prev => ({ ...prev, [policyId]: true }));
  };

  const saveBulkEdit = (policyId: string) => {
    const text = bulkEditText[policyId] || '';
    const lines = text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    const valid: PolicyPrefix[] = [];
    const invalid: string[] = [];
    lines.forEach(line => {
      if (cidrPattern.test(line)) {
        valid.push({ id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, value: line, action: 'include' });
      } else {
        invalid.push(line);
      }
    });
    if (invalid.length > 0) {
      window.addToast?.({ type: 'error', title: 'Invalid Prefixes', message: `${invalid.length} invalid: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`, duration: 5000 });
    }
    setInheritedPolicies(prev => prev.map(p =>
      p.globalPolicyId === policyId ? { ...p, prefixes: valid } : p
    ));
    setBulkEditMode(prev => ({ ...prev, [policyId]: false }));
    if (valid.length > 0) {
      window.addToast?.({ type: 'success', title: 'Prefixes Updated', message: `${valid.length} prefix${valid.length !== 1 ? 'es' : ''} saved`, duration: 3000 });
    }
  };

  const downloadPrefixes = (policyId: string) => {
    const policy = inheritedPolicies.find(p => p.globalPolicyId === policyId);
    if (!policy || policy.prefixes.length === 0) return;
    const csv = 'prefix,action\n' + policy.prefixes.map(p => `${p.value},${p.action}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${policy.globalPolicyName.replace(/\s+/g, '-').toLowerCase()}-prefixes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = (policyId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        // Parse CSV or newline-separated
        const lines = text.split(/[\n,;]+/).map(l => l.trim()).filter(l => l && cidrPattern.test(l));
        const newPrefixes: PolicyPrefix[] = lines.map(line => ({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: line,
          action: 'include' as const,
        }));
        setInheritedPolicies(prev => prev.map(p =>
          p.globalPolicyId === policyId ? { ...p, prefixes: [...p.prefixes, ...newPrefixes] } : p
        ));
        window.addToast?.({ type: 'success', title: 'Prefixes Imported', message: `${newPrefixes.length} prefix${newPrefixes.length !== 1 ? 'es' : ''} added from ${file.name}`, duration: 3000 });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const filteredPolicies = useMemo(() => {
    const actionFilters = filters.action || [];
    const appliesToFilters = filters.appliesTo || [];
    const enabledFilters = filters.enabled || [];

    return policies
      .filter(policy => {
        const matchesSearch = !searchQuery ||
          policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          policy.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAction = actionFilters.length === 0 || actionFilters.includes(policy.action);
        const matchesAppliesTo = appliesToFilters.length === 0 || appliesToFilters.includes(policy.appliesTo);
        const matchesEnabled = enabledFilters.length === 0 ||
          (enabledFilters.includes('enabled') && policy.enabled) ||
          (enabledFilters.includes('disabled') && !policy.enabled);

        return matchesSearch && matchesAction && matchesAppliesTo && matchesEnabled;
      })
      .sort((a, b) => b.priority - a.priority);
  }, [policies, searchQuery, filters]);

  const handleTogglePolicy = (id: string) => {
    setPolicies(policies.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));

    const policy = policies.find(p => p.id === id);
    window.addToast({
      type: 'success',
      title: 'Policy Updated',
      message: `${policy?.name} has been ${policy?.enabled ? 'disabled' : 'enabled'}`,
      duration: 3000
    });
  };

  const handleDeletePolicy = (id: string) => {
    const policy = policies.find(p => p.id === id);
    if (window.confirm(`Are you sure you want to delete "${policy?.name}"? This action cannot be undone.`)) {
      setPolicies(policies.filter(p => p.id !== id));
      window.addToast({
        type: 'success',
        title: 'Policy Deleted',
        message: `${policy?.name} has been deleted`,
        duration: 3000
      });
    }
  };

  const exportPolicies = () => {
    const csv = [
      ['Name', 'Action', 'Protocol', 'Applies To', 'Status', 'Priority'].join(','),
      ...filteredPolicies.map(p => [
        p.name,
        p.action,
        p.protocol,
        p.appliesTo,
        p.enabled ? 'Enabled' : 'Disabled',
        p.priority
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'routing-policies.csv';
    link.click();
    URL.revokeObjectURL(url);

    window.addToast({
      type: 'success',
      title: 'Export Complete',
      message: 'Policies exported successfully',
      duration: 3000
    });
  };

  const getTargetName = (targetId: string): string => {
    const link = allLinks.find(l => l.id === targetId);
    if (link) return link.name;

    const router = hubs.find(cr => cr.id === targetId);
    if (router) return router.name;

    const vnf = vnfs.find(v => v.id === targetId);
    if (vnf) return vnf.name;

    return targetId;
  };

  const getTargetIcon = (appliesTo: PolicyAppliesTo) => {
    switch (appliesTo) {
      case 'links':
        return <Network className="h-4 w-4" />;
      case 'hubs':
        return <AttIcon name="hub" className="h-5 w-5" />;
      case 'vnfs':
        return <Shield className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">Routing Policies</h2>
          <p className="text-figma-sm text-fw-bodyLight mt-1">
            Manage routing policies for {connection?.name ?? ownerName ?? 'this resource'}
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setEditingPolicy(undefined);
            setShowAddModal(true);
          }}
        >
          Add Policy
        </Button>
      </div>

      {/* Inherited Global Policies */}
      <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
        <div className="px-5 py-4 bg-fw-wash border-b border-fw-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-fw-link" />
            <h3 className="text-figma-base font-semibold text-fw-heading">Inherited Global Policies</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-figma-xs font-medium text-fw-link bg-fw-accent">
              {inheritedPolicies.filter(p => p.overrideEnabled).length} active
            </span>
          </div>
          <p className="text-figma-xs text-fw-bodyLight">From Configure &gt; Policies</p>
        </div>

        <div className="divide-y divide-fw-secondary">
          {inheritedPolicies.map(policy => {
            const isExpanded = expandedInherited === policy.globalPolicyId;
            const isAdvanced = showAdvanced[policy.globalPolicyId] || false;
            const actionClasses: Record<string, string> = {
              deny: 'text-fw-error bg-fw-errorLight',
              allow: 'text-fw-success bg-fw-successLight',
              manipulate: 'text-fw-warn bg-fw-warn/10',
              advertise: 'text-fw-link bg-fw-accent',
            };
            const ac = actionClasses[policy.globalPolicyAction] || actionClasses.allow;
            const contextLabels: Record<string, string> = {
              'internet': 'Internet',
              'l3vpn-ipv4': 'L3VPN IPv4',
              'l3vpn-ipv6': 'L3VPN IPv6',
              'restricted-ipv4': 'Restricted IPv4',
            };

            return (
              <div key={policy.globalPolicyId} className={`${policy.overrideEnabled ? '' : 'opacity-50'}`}>
                {/* Policy header */}
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={policy.overrideEnabled}
                      onChange={() => toggleInheritedOverride(policy.globalPolicyId)}
                      label=""
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-figma-base font-medium text-fw-heading">{policy.globalPolicyName}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-figma-sm font-medium ${ac}`}>
                          {policy.globalPolicyAction}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-wash text-fw-body border border-fw-secondary">
                          {contextLabels[policy.protocolContext] || policy.protocolContext}
                        </span>
                        <span className="text-figma-sm text-fw-bodyLight flex items-center gap-1">
                          {policy.direction === 'onPremiseToPartner' ? 'On Premise' : 'Partner'}
                          <ArrowRight className="h-3 w-3" />
                          {policy.direction === 'onPremiseToPartner' ? 'Partner' : 'On Premise'}
                        </span>
                      </div>
                      {policy.prefixes.length > 0 && (
                        <p className="text-figma-sm text-fw-bodyLight mt-0.5">
                          {policy.prefixes.length} prefix{policy.prefixes.length !== 1 ? 'es' : ''}{policy.communities.length > 0 ? `, ${policy.communities.length} communit${policy.communities.length !== 1 ? 'ies' : 'y'}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedInherited(isExpanded ? null : policy.globalPolicyId)}
                    className="text-figma-xs font-medium text-fw-link hover:text-fw-linkHover flex items-center gap-1"
                  >
                    {isExpanded ? 'Collapse' : 'Add Specificity'}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Expanded: prefix list + advanced */}
                {isExpanded && policy.overrideEnabled && (
                  <div className="px-5 pb-4 space-y-3">
                    {/* Prefix list with bulk operations */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-figma-sm font-medium text-fw-body">
                          Prefixes ({policy.globalPolicyAction === 'advertise' ? 'routes to advertise' : policy.globalPolicyAction === 'deny' ? 'routes to deny' : 'routes to allow'})
                          {policy.prefixes.length > 0 && <span className="ml-1 text-fw-bodyLight">({policy.prefixes.length})</span>}
                        </label>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleBulkUpload(policy.globalPolicyId)} className="p-1 text-fw-bodyLight hover:text-fw-link rounded" title="Upload CSV">
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => downloadPrefixes(policy.globalPolicyId)} className="p-1 text-fw-bodyLight hover:text-fw-link rounded" title="Download CSV" disabled={policy.prefixes.length === 0}>
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => bulkEditMode[policy.globalPolicyId] ? saveBulkEdit(policy.globalPolicyId) : enterBulkEdit(policy.globalPolicyId)} className="p-1 text-fw-bodyLight hover:text-fw-link rounded" title={bulkEditMode[policy.globalPolicyId] ? 'Save bulk edit' : 'Bulk edit'}>
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {bulkEditMode[policy.globalPolicyId] ? (
                        <div className="space-y-2">
                          <textarea
                            value={bulkEditText[policy.globalPolicyId] || ''}
                            onChange={(e) => setBulkEditText(prev => ({ ...prev, [policy.globalPolicyId]: e.target.value }))}
                            placeholder="One prefix per line in CIDR notation:&#10;10.0.0.0/8&#10;172.16.0.0/12&#10;192.168.0.0/16"
                            rows={8}
                            className="w-full px-3 py-2 rounded-lg border border-fw-active text-figma-xs font-mono focus:outline-none focus:ring-1 focus:ring-fw-active"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-figma-xs text-fw-bodyLight">One CIDR prefix per line. Supports paste from spreadsheets.</p>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setBulkEditMode(prev => ({ ...prev, [policy.globalPolicyId]: false }))}>Cancel</Button>
                              <Button variant="primary" size="sm" onClick={() => saveBulkEdit(policy.globalPolicyId)}>Save {(bulkEditText[policy.globalPolicyId] || '').split('\n').filter(l => l.trim()).length} Prefixes</Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                      <div className="space-y-1.5">
                        {policy.prefixes.map(prefix => (
                          <div key={prefix.id} className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-1.5 bg-fw-wash border border-fw-secondary rounded-lg text-figma-sm font-mono text-fw-heading">
                              {prefix.value}
                            </code>
                            <CopyButton value={prefix.value} />
                            <span className="text-figma-sm text-fw-bodyLight w-14">{prefix.action}</span>
                            <button onClick={() => removePrefix(policy.globalPolicyId, prefix.id)} className="text-fw-disabled hover:text-fw-error">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newPrefixInputs[policy.globalPolicyId] || ''}
                            onChange={(e) => setNewPrefixInputs(prev => ({ ...prev, [policy.globalPolicyId]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addPrefix(policy.globalPolicyId)}
                            placeholder="e.g., 10.0.0.0/8"
                            className="flex-1 h-8 px-3 rounded-lg border border-fw-secondary text-figma-xs font-mono focus:border-fw-active focus:outline-none"
                          />
                          <Button variant="outline" size="sm" onClick={() => addPrefix(policy.globalPolicyId)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Advanced toggle */}
                    <button
                      onClick={() => setShowAdvanced(prev => ({ ...prev, [policy.globalPolicyId]: !isAdvanced }))}
                      className="flex items-center gap-1.5 text-figma-xs font-medium text-fw-link hover:text-fw-linkHover"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      {isAdvanced ? 'Hide Advanced' : 'Advanced Settings'}
                      {isAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {/* Advanced section */}
                    {isAdvanced && (
                      <div className="p-4 rounded-lg bg-fw-wash border border-fw-secondary space-y-4">
                        {/* BGP Communities */}
                        <div>
                          <label className="block text-figma-sm font-medium text-fw-body mb-1.5">BGP Communities</label>
                          <div className="space-y-1.5">
                            {policy.communities.map(comm => (
                              <div key={comm.id} className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-1.5 bg-fw-base border border-fw-secondary rounded-lg text-figma-sm font-mono text-fw-heading">
                                  {comm.value}
                                </code>
                                <CopyButton value={comm.value} />
                                <select
                                  value={comm.action}
                                  onChange={(e) => {
                                    setInheritedPolicies(prev => prev.map(p =>
                                      p.globalPolicyId === policy.globalPolicyId
                                        ? { ...p, communities: p.communities.map(c => c.id === comm.id ? { ...c, action: e.target.value as any } : c) }
                                        : p
                                    ));
                                  }}
                                  className="h-8 px-2 rounded-lg border border-fw-secondary text-figma-xs bg-fw-base"
                                >
                                  <option value="match">Match</option>
                                  <option value="tag">Tag</option>
                                  <option value="strip">Strip</option>
                                </select>
                                <button onClick={() => removeCommunity(policy.globalPolicyId, comm.id)} className="text-fw-disabled hover:text-fw-error">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="e.g., 65000:100"
                                className="flex-1 h-8 px-3 rounded-lg border border-fw-secondary text-figma-xs font-mono focus:border-fw-active focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addCommunity(policy.globalPolicyId, (e.target as HTMLInputElement).value, 'match');
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                              <span className="text-figma-xs text-fw-bodyLight">Enter to add</span>
                            </div>
                          </div>
                        </div>

                        {/* AS-Path Filters */}
                        <div>
                          <label className="block text-figma-sm font-medium text-fw-body mb-1.5">AS-Path Filters</label>
                          {policy.asPathFilters.length === 0 ? (
                            <p className="text-figma-xs text-fw-bodyLight">No AS-path filters configured</p>
                          ) : (
                            <div className="space-y-1.5">
                              {policy.asPathFilters.map(asp => (
                                <div key={asp.id} className="flex items-center gap-2">
                                  <code className="flex-1 px-3 py-1.5 bg-fw-base border border-fw-secondary rounded-lg text-figma-sm font-mono text-fw-heading">{asp.pattern}</code>
                                  <CopyButton value={asp.pattern} />
                                  <span className="text-figma-sm text-fw-bodyLight">{asp.action}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-3">
                          <label className="text-figma-sm font-medium text-fw-body">Priority</label>
                          <input
                            type="number"
                            value={policy.priority}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setInheritedPolicies(prev => prev.map(p =>
                                p.globalPolicyId === policy.globalPolicyId ? { ...p, priority: val } : p
                              ));
                            }}
                            className="w-20 h-8 px-3 rounded-lg border border-fw-secondary text-figma-xs text-center focus:border-fw-active focus:outline-none"
                          />
                          <span className="text-figma-xs text-fw-bodyLight">Lower number = higher priority</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Connection Policies */}
      <h3 className="text-figma-base font-semibold text-fw-heading">Custom Policies</h3>

      {/* Search and Controls */}
      <div className="rounded-lg border border-fw-secondary overflow-hidden">
        <div className="px-6 py-4 border-b border-fw-secondary">
          <SearchFilterBar
            searchPlaceholder="Search policies..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={POLICY_FILTER_GROUPS}
                activeFilters={filters}
                onFiltersChange={setFilters}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={exportPolicies}
          />
        </div>

      {/* Policies List */}
        {filteredPolicies.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Shield className="h-12 w-12 text-fw-disabled mx-auto mb-3" />
            <p className="text-fw-body">No routing policies found</p>
            <p className="text-figma-sm text-fw-bodyLight mt-1">
              {searchQuery || activeCount > 0
                ? 'Try adjusting your filters'
                : 'Create your first routing policy to get started'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-fw-secondary">
          {filteredPolicies.map((policy) => (
            <div
              key={policy.id}
              className="bg-fw-base hover:bg-fw-wash transition-colors"
            >
              {/* Policy Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Status Indicator */}
                  <Toggle
                    checked={policy.enabled}
                    onChange={() => handleTogglePolicy(policy.id)}
                    size="md"
                  />

                  {/* Priority Badge */}
                  <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-fw-wash">
                    <span className="text-figma-base font-semibold text-fw-link">{policy.priority}</span>
                  </div>

                  {/* Policy Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-figma-base font-medium text-fw-heading truncate">{policy.name}</h3>

                      {/* Action Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-figma-sm font-medium ${
                        policy.action === 'allow'
                          ? 'bg-[var(--status-active-bg)] text-[var(--status-active-text)]'
                          : policy.action === 'deny'
                          ? 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
                          : policy.action === 'manipulate'
                          ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                          : 'bg-fw-accent text-fw-link'
                      }`}>
                        {policy.action === 'allow' ? <Check className="h-3 w-3 mr-1" /> :
                         policy.action === 'deny' ? <AlertTriangle className="h-3 w-3 mr-1" /> :
                         policy.action === 'manipulate' ? <Edit2 className="h-3 w-3 mr-1" /> :
                         <Play className="h-3 w-3 mr-1" />}
                        {policy.action.toUpperCase()}
                      </span>

                      {/* Protocol Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-neutral text-fw-body">
                        {policy.protocol.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-figma-sm text-fw-bodyLight mt-1 truncate">{policy.description}</p>

                    {/* Targets */}
                    <div className="flex items-center space-x-2 mt-2">
                      {getTargetIcon(policy.appliesTo)}
                      <span className="text-figma-sm text-fw-bodyLight">
                        {policy.appliesTo === 'all'
                          ? 'Applied to all resources'
                          : `Applied to ${policy.targetIds.length} ${policy.appliesTo}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <OverflowMenu
                  items={[
                    {
                      id: 'details',
                      label: expandedPolicy === policy.id ? 'Hide Details' : 'View Details',
                      icon: <ChevronDown className="h-4 w-4" />,
                      onClick: () => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)
                    },
                    {
                      id: 'edit',
                      label: 'Edit Policy',
                      icon: <Edit2 className="h-4 w-4" />,
                      onClick: () => {
                        setEditingPolicy(policy);
                        setShowAddModal(true);
                      }
                    },
                    {
                      id: 'delete',
                      label: 'Delete Policy',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => handleDeletePolicy(policy.id),
                      variant: 'danger'
                    }
                  ]}
                  isOpen={activeOverflow === policy.id}
                  onOpenChange={(isOpen) => setActiveOverflow(isOpen ? policy.id : null)}
                />
              </div>

              {/* Expanded Details */}
              {expandedPolicy === policy.id && (
                <div className="border-t border-fw-secondary p-4 bg-fw-wash">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Conditions */}
                    <div>
                      <h4 className="text-figma-base font-medium text-fw-heading mb-3">Conditions</h4>
                      <div className="space-y-2">
                        {policy.conditions.map((condition) => (
                          <div key={condition.id} className="flex items-center space-x-2 text-figma-base">
                            <span className="px-2 py-1 bg-fw-base rounded text-fw-bodyLight font-mono">
                              {condition.type}
                            </span>
                            <span className="text-fw-disabled">{condition.operator}</span>
                            <span className="px-2 py-1 bg-fw-base rounded text-fw-body font-mono">
                              {condition.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Targets */}
                    <div>
                      <h4 className="text-figma-base font-medium text-fw-heading mb-3">Applied To</h4>
                      {policy.appliesTo === 'all' ? (
                        <p className="text-figma-sm text-fw-bodyLight">All links, hubs, and VNFs</p>
                      ) : (
                        <div className="space-y-2">
                          {policy.targetIds.map((targetId) => (
                            <div key={targetId} className="flex items-center space-x-2 text-figma-base">
                              {getTargetIcon(policy.appliesTo)}
                              <span className="text-fw-body">{getTargetName(targetId)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 pt-4 border-t border-fw-secondary text-figma-sm text-fw-bodyLight">
                    <div className="flex items-center justify-between">
                      <span>Created by {policy.createdBy} on {new Date(policy.createdAt).toLocaleDateString()}</span>
                      <span>Last updated {new Date(policy.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Add/Edit Policy Drawer */}
      <SideDrawer
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingPolicy(undefined);
          setSelectedAppliesTo('all');
          setSelectedTargetIds([]);
          setSelectedAction('allow');
        }}
        title={editingPolicy ? 'Edit Routing Policy' : 'Add Routing Policy'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingPolicy(undefined);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary">
              {editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <p className="text-figma-sm text-fw-bodyLight">
            Create routing policies to control traffic flow across your network infrastructure.
            Configure actions and conditions based on your network requirements.
          </p>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-fw-heading border-b border-fw-secondary pb-2">
              Basic Information
            </h3>

            <FormField label="Policy Name" required>
              <input
                type="text"
                className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                placeholder="e.g., Production Traffic Priority"
              />
            </FormField>

            <FormField label="Description">
              <textarea
                className="w-full px-3 py-2 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                rows={3}
                placeholder="Describe what this policy does and when it should be applied..."
              />
            </FormField>

            <FormField label="Priority" required helpText="Higher numbers = higher priority (1-1000)">
              <input
                type="number"
                className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                placeholder="100"
                min="1"
                max="1000"
                defaultValue={100}
              />
            </FormField>
          </div>

          {/* Action Configuration */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-fw-heading border-b border-fw-secondary pb-2">
              Action Configuration
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Action" required>
                <select
                  className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value as PolicyAction)}
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                  <option value="manipulate">Manipulate</option>
                  <option value="advertise">Advertise</option>
                </select>
              </FormField>

              <FormField label="Policy Context" required helpText="Which routing table this applies to">
                <select className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active">
                  <option value="l3vpn-ipv4">L3VPN IPv4</option>
                  <option value="l3vpn-ipv6">L3VPN IPv6</option>
                  <option value="restricted-ipv4">Restricted IPv4</option>
                  <option value="internet">Internet</option>
                </select>
              </FormField>

              <FormField label="Protocol" required>
                <select className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active">
                  <option value="any">Any</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                  <option value="bgp">BGP</option>
                  <option value="ospf">OSPF</option>
                </select>
              </FormField>
            </div>

            {/* Direction Selection */}
            <FormField label="Traffic Direction" required>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="direction"
                    value="onPremiseToPartner"
                    checked={policyDirection === 'onPremiseToPartner'}
                    onChange={(e) => setPolicyDirection(e.target.value as typeof policyDirection)}
                    className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary"
                  />
                  <span className="ml-2 text-figma-base text-fw-body">On Premise → Partner</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="direction"
                    value="partnerToOnPremise"
                    checked={policyDirection === 'partnerToOnPremise'}
                    onChange={(e) => setPolicyDirection(e.target.value as typeof policyDirection)}
                    className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary"
                  />
                  <span className="ml-2 text-figma-base text-fw-body">Partner → On Premise</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="direction"
                    value="both"
                    checked={policyDirection === 'both'}
                    onChange={(e) => setPolicyDirection(e.target.value as typeof policyDirection)}
                    className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary"
                  />
                  <span className="ml-2 text-figma-base text-fw-body">Both Directions</span>
                </label>
              </div>
            </FormField>

            {/* Action-Specific Options */}
            <div className="bg-fw-wash p-4 rounded-lg">
              <h4 className="text-figma-sm font-medium text-fw-body mb-3">
                {selectedAction === 'allow' ? 'Allow Options' :
                 selectedAction === 'deny' ? 'Deny Options' :
                 selectedAction === 'manipulate' ? 'Manipulation Options' :
                 'Advertisement Options'}
              </h4>
              <div className="space-y-2">
                {selectedAction === 'allow' && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.matchingRoutes}
                        onChange={(e) => setSpecificOptions({...specificOptions, matchingRoutes: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Matching Routes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.communityValueFilter}
                        onChange={(e) => setSpecificOptions({...specificOptions, communityValueFilter: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Community Value Filter</span>
                    </label>
                  </>
                )}
                {selectedAction === 'deny' && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.matchingRoutes}
                        onChange={(e) => setSpecificOptions({...specificOptions, matchingRoutes: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Matching Routes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.blockDefaultRoutes}
                        onChange={(e) => setSpecificOptions({...specificOptions, blockDefaultRoutes: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Block Default Routes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.communityValueFilter}
                        onChange={(e) => setSpecificOptions({...specificOptions, communityValueFilter: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Community Value Filter</span>
                    </label>
                  </>
                )}
                {selectedAction === 'manipulate' && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.prependASN}
                        onChange={(e) => setSpecificOptions({...specificOptions, prependASN: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Prepend Advertisements with Extra BGP ASNs</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={specificOptions.cvTagging}
                        onChange={(e) => setSpecificOptions({...specificOptions, cvTagging: e.target.checked})}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <span className="ml-2 text-figma-base text-fw-body">Selective CV Tagging to Routes/Prefixes</span>
                    </label>
                  </>
                )}
                {selectedAction === 'advertise' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={specificOptions.advertiseStatic}
                      onChange={(e) => setSpecificOptions({...specificOptions, advertiseStatic: e.target.checked})}
                      className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                    />
                    <span className="ml-2 text-figma-base text-fw-body">Advertise Static Routes</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Prefix / Subnet Specificity */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-fw-heading border-b border-fw-secondary pb-2">
              Route Specificity
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-figma-xs font-medium text-fw-body">
                  Prefixes / Subnets
                  <span className="ml-1 text-fw-bodyLight font-normal">
                    ({selectedAction === 'advertise' ? 'routes to advertise' : selectedAction === 'deny' ? 'routes to deny' : selectedAction === 'allow' ? 'routes to allow' : 'routes to manipulate'})
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv,.txt';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) window.addToast?.({ type: 'success', title: 'File Selected', message: `${file.name} ready to import`, duration: 3000 });
                      };
                      input.click();
                    }}
                    className="p-1 text-fw-bodyLight hover:text-fw-link rounded" title="Upload CSV/TXT"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button className="p-1 text-fw-bodyLight hover:text-fw-link rounded" title="Download CSV">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button className="p-1 text-fw-bodyLight hover:text-fw-link rounded" title="Bulk edit (textarea)">
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g., 10.0.0.0/8"
                    className="flex-1 h-8 px-3 rounded-lg border border-fw-secondary text-figma-xs font-mono focus:border-fw-active focus:outline-none"
                  />
                  <Button variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-figma-xs text-fw-bodyLight">Add one at a time or use bulk upload/edit icons above for large prefix lists.</p>
              </div>
            </div>

            {/* Advanced: Communities and AS-Path */}
            <details className="group">
              <summary className="flex items-center gap-1.5 text-figma-xs font-medium text-fw-link hover:text-fw-linkHover cursor-pointer list-none">
                <Settings className="h-3.5 w-3.5" />
                Advanced: BGP Communities & AS-Path
                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 p-4 rounded-lg bg-fw-wash border border-fw-secondary space-y-4">
                <FormField label="BGP Communities" helpText="Tag, match, or strip community values">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g., 65000:100"
                        className="flex-1 h-8 px-3 rounded-lg border border-fw-secondary text-figma-xs font-mono focus:border-fw-active focus:outline-none"
                      />
                      <select className="h-8 px-2 rounded-lg border border-fw-secondary text-figma-xs bg-fw-base">
                        <option value="match">Match</option>
                        <option value="tag">Tag</option>
                        <option value="strip">Strip</option>
                      </select>
                      <Button variant="outline" size="sm">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </FormField>

                <FormField label="AS-Path Filters" helpText="Filter or manipulate based on AS path">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g., ^65001$"
                        className="flex-1 h-8 px-3 rounded-lg border border-fw-secondary text-figma-xs font-mono focus:border-fw-active focus:outline-none"
                      />
                      <select className="h-8 px-2 rounded-lg border border-fw-secondary text-figma-xs bg-fw-base">
                        <option value="allow">Allow</option>
                        <option value="deny">Deny</option>
                        <option value="prepend">Prepend</option>
                      </select>
                      <Button variant="outline" size="sm">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </FormField>
              </div>
            </details>
          </div>

          {/* Target Selection */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-fw-heading border-b border-fw-secondary pb-2">
              Apply To Resources
            </h3>

            <FormField label="Target Resources" required>
              <select
                className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                value={selectedAppliesTo}
                onChange={(e) => {
                  setSelectedAppliesTo(e.target.value as PolicyAppliesTo);
                  setSelectedTargetIds([]);
                }}
              >
                <option value="all">All Resources</option>
                <option value="links">Specific Links</option>
                <option value="hubs">Specific Hubs</option>
                <option value="vnfs">Specific VNFs</option>
              </select>
            </FormField>

            {/* Show resource selection when not "all" */}
            {selectedAppliesTo === 'links' && allLinks.length > 0 && (
              <div className="bg-fw-wash p-4 rounded-lg">
                <h4 className="text-figma-sm font-medium text-fw-body mb-3">Select Links</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allLinks.map((link) => (
                    <label key={link.id} className="flex items-center p-2 hover:bg-fw-base rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTargetIds.includes(link.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTargetIds([...selectedTargetIds, link.id]);
                          } else {
                            setSelectedTargetIds(selectedTargetIds.filter(id => id !== link.id));
                          }
                        }}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-figma-sm font-medium text-fw-body">{link.name}</div>
                        <div className="text-figma-sm text-fw-bodyLight">
                          VLAN {link.vlanId} • {link.status === 'active' ? 'Active' : 'Inactive'}
                          {link.ipSubnet && ` • ${link.ipSubnet}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-figma-sm text-fw-bodyLight">
                  {selectedTargetIds.length} of {allLinks.length} links selected
                </div>
              </div>
            )}

            {selectedAppliesTo === 'hubs' && hubs.length > 0 && (
              <div className="bg-fw-wash p-4 rounded-lg">
                <h4 className="text-figma-sm font-medium text-fw-body mb-3">Select Hubs</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {hubs.map((cr) => (
                    <label key={cr.id} className="flex items-center p-2 hover:bg-fw-base rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTargetIds.includes(cr.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTargetIds([...selectedTargetIds, cr.id]);
                          } else {
                            setSelectedTargetIds(selectedTargetIds.filter(id => id !== cr.id));
                          }
                        }}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-figma-sm font-medium text-fw-body">{cr.name}</div>
                        <div className="text-figma-sm text-fw-bodyLight">
                          {cr.provider} • BGP ASN: {cr.bgpAsn}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-figma-sm text-fw-bodyLight">
                  {selectedTargetIds.length} of {hubs.length} hubs selected
                </div>
              </div>
            )}

            {selectedAppliesTo === 'vnfs' && vnfs.length > 0 && (
              <div className="bg-fw-wash p-4 rounded-lg">
                <h4 className="text-figma-sm font-medium text-fw-body mb-3">Select VNFs</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {vnfs.map((vnf) => (
                    <label key={vnf.id} className="flex items-center p-2 hover:bg-fw-base rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTargetIds.includes(vnf.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTargetIds([...selectedTargetIds, vnf.id]);
                          } else {
                            setSelectedTargetIds(selectedTargetIds.filter(id => id !== vnf.id));
                          }
                        }}
                        className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-figma-sm font-medium text-fw-body">{vnf.name}</div>
                        <div className="text-figma-sm text-fw-bodyLight">
                          {vnf.type} • {vnf.provider}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-figma-sm text-fw-bodyLight">
                  {selectedTargetIds.length} of {vnfs.length} VNFs selected
                </div>
              </div>
            )}
          </div>

          {/* Conditions Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-fw-heading border-b border-fw-secondary pb-2">
              Policy Conditions
            </h3>
            <p className="text-figma-sm text-fw-bodyLight">
              Define conditions that must be met for this policy to apply. Leave empty to match all traffic.
            </p>

            <div className="space-y-3">
              <FormField label="Source Prefix">
                <input
                  type="text"
                  className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  placeholder="e.g., 10.0.0.0/8"
                />
              </FormField>

              <FormField label="Destination Prefix">
                <input
                  type="text"
                  className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  placeholder="e.g., 192.168.0.0/16"
                />
              </FormField>

              <FormField label="BGP Community">
                <input
                  type="text"
                  className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  placeholder="e.g., 65000:100"
                />
              </FormField>

              <FormField label="AS Path (Regex)">
                <input
                  type="text"
                  className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  placeholder="e.g., ^65001"
                />
              </FormField>
            </div>
          </div>
        </div>
      </SideDrawer>
    </div>
  );
}
