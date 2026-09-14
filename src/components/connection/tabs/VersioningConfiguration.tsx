import { useState } from 'react';
import {
  GitCommit, History,
  Clock, Check,
  Download, Upload, RefreshCw, Lock, Diff, X, ArrowRight
} from 'lucide-react';
import { Button } from '../../common/Button';
import { diffVersions, nextVersionNumber } from '../../../utils/versionDiff';

/** Title-cased display name derived from a sign-in email, e.g. j.smith@att.com -> "J Smith". */
function authorFromEmail(email?: string | null): string {
  if (!email) return 'You';
  const local = email.split('@')[0];
  const name = local.replace(/[._-]+/g, ' ').trim();
  return name
    ? name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'You';
}

/** Trigger a client-side JSON download (mock config export). */
function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Two-letter initials for an author avatar, e.g. "Sarah Patel" -> "SP". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function AuthorBadge({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-fw-accent text-fw-link text-[10px] font-bold"
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="font-medium text-fw-heading">{name}</span>
    </span>
  );
}

interface Version {
  id: string;
  number: string;
  timestamp: string;
  author: string;
  type: 'major' | 'minor' | 'patch' | 'config';
  status: 'deployed' | 'pending' | 'rollback' | 'failed';
  locked?: boolean;
  changes: Array<{
    component: string;
    type: 'added' | 'modified' | 'removed';
    description: string;
  }>;
  metadata: {
    deploymentId?: string;
    environment: string;
    approvedBy?: string;
    reviewers: string[];
    deploymentStatus: 'deployed' | 'pending' | 'failed';
    rollbackVersion?: string;
    configHash: string;
    dependencies: {
      name: string;
      version: string;
    }[];
  };
  compliance: {
    changeRequest: string;
    riskAssessment: 'low' | 'medium' | 'high';
    approvals: {
      required: number;
      received: number;
    };
    auditTrail: {
      created: string;
      reviewed: string;
      deployed: string;
    };
  };
}

interface VersioningConfigurationProps {
  connectionId: string;
  currentVersion: string;
}

export function VersioningConfiguration({ connectionId, currentVersion }: VersioningConfigurationProps) {
  const author = authorFromEmail();
  const [versions, setVersions] = useState<Version[]>([
    {
      id: 'v1.0.0',
      number: '1.0.0',
      timestamp: '2024-03-10T15:30:00Z',
      author: 'Sarah Patel',
      type: 'major',
      status: 'deployed',
      changes: [
        {
          component: 'Security',
          type: 'added',
          description: 'Implemented AES-256 encryption'
        },
        {
          component: 'Network',
          type: 'added',
          description: 'Configured BGP routing'
        }
      ],
      metadata: {
        deploymentId: 'dep-001',
        environment: 'production',
        approvedBy: 'John Smith',
        reviewers: ['John Smith', 'Maria Garcia'],
        deploymentStatus: 'deployed',
        configHash: 'abc123',
        dependencies: [
          { name: 'routing-module', version: '2.1.0' },
          { name: 'security-module', version: '1.5.0' }
        ]
      },
      compliance: {
        changeRequest: 'CR-001',
        riskAssessment: 'low',
        approvals: {
          required: 2,
          received: 2
        },
        auditTrail: {
          created: '2024-03-10T14:00:00Z',
          reviewed: '2024-03-10T14:30:00Z',
          deployed: '2024-03-10T15:30:00Z'
        }
      }
    },
    {
      id: 'v1.1.0',
      number: '1.1.0',
      timestamp: '2024-03-11T10:15:00Z',
      author: 'Maria Garcia',
      type: 'minor',
      status: 'deployed',
      changes: [
        {
          component: 'QoS',
          type: 'added',
          description: 'Added traffic prioritization'
        }
      ],
      metadata: {
        deploymentId: 'dep-002',
        environment: 'production',
        approvedBy: 'John Smith',
        reviewers: ['John Smith', 'Sarah Patel'],
        deploymentStatus: 'deployed',
        configHash: 'def456',
        dependencies: [
          { name: 'qos-module', version: '1.0.0' }
        ]
      },
      compliance: {
        changeRequest: 'CR-002',
        riskAssessment: 'medium',
        approvals: {
          required: 2,
          received: 2
        },
        auditTrail: {
          created: '2024-03-11T09:00:00Z',
          reviewed: '2024-03-11T09:30:00Z',
          deployed: '2024-03-11T10:15:00Z'
        }
      }
    },
    {
      id: 'v1.1.1',
      number: '1.1.1',
      timestamp: '2024-03-14T16:45:00Z',
      author: 'Alex Chen',
      type: 'patch',
      status: 'pending',
      changes: [
        {
          component: 'Security',
          type: 'modified',
          description: 'Tightened BGP route filters'
        },
        {
          component: 'QoS',
          type: 'removed',
          description: 'Removed deprecated shaping policy'
        }
      ],
      metadata: {
        deploymentId: 'dep-003',
        environment: 'staging',
        reviewers: ['Sarah Patel'],
        deploymentStatus: 'pending',
        rollbackVersion: '1.1.0',
        configHash: 'ghi789',
        dependencies: [
          { name: 'qos-module', version: '1.1.0' },
          { name: 'security-module', version: '1.6.0' }
        ]
      },
      compliance: {
        changeRequest: 'CR-007',
        riskAssessment: 'high',
        approvals: {
          required: 3,
          received: 1
        },
        auditTrail: {
          created: '2024-03-14T15:00:00Z',
          reviewed: '2024-03-14T16:00:00Z',
          deployed: ''
        }
      }
    }
  ]);

  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [current, setCurrent] = useState(currentVersion);

  const toast = (title: string, message: string, type: 'success' | 'info' = 'success') =>
    window.addToast?.({ type, title, message, duration: 3000 });

  // Mock "create version" — snapshots the current config as the next patch release.
  const handleCreateVersion = () => {
    const number = nextVersionNumber(versions.map(v => v.number));
    const now = new Date().toISOString();
    const newVersion: Version = {
      id: `v${number}`,
      number,
      timestamp: now,
      author,
      type: 'config',
      status: 'pending',
      changes: [{ component: 'Configuration', type: 'modified', description: 'Snapshot of current configuration' }],
      metadata: {
        environment: 'staging',
        reviewers: [],
        deploymentStatus: 'pending',
        configHash: Math.random().toString(16).slice(2, 8),
        dependencies: versions[versions.length - 1]?.metadata.dependencies ?? [],
      },
      compliance: {
        changeRequest: `CR-${String(100 + versions.length).padStart(3, '0')}`,
        riskAssessment: 'low',
        approvals: { required: 2, received: 0 },
        auditTrail: { created: now, reviewed: '', deployed: '' },
      },
    };
    setVersions(prev => [...prev, newVersion]);
    setCurrent(number);
    setShowHistory(true);
    toast('Version Created', `v${number} snapshotted by ${author}.`);
  };

  const handleExport = (version?: Version) => {
    const target = version ?? versions.find(v => v.number === current) ?? versions[versions.length - 1];
    if (!target) return;
    downloadJSON(`hub-config-v${target.number}.json`, target);
    toast('Configuration Exported', `v${target.number} downloaded as JSON.`);
  };

  const handleRestore = (version: Version) => {
    setCurrent(version.number);
    setVersions(prev => prev.map(v => (v.id === version.id ? { ...v, status: 'deployed' } : v)));
    toast('Version Restored', `Configuration restored to v${version.number}.`);
  };

  const handleToggleLock = (version: Version) => {
    setVersions(prev => prev.map(v => (v.id === version.id ? { ...v, locked: !v.locked } : v)));
    toast(version.locked ? 'Version Unlocked' : 'Version Locked', `v${version.number} is now ${version.locked ? 'editable' : 'locked'}.`, 'info');
  };

  const getStatusColor = (status: Version['status']) => {
    switch (status) {
      case 'deployed':
        return 'bg-fw-successLight text-fw-success';
      case 'pending':
        return 'bg-fw-warn/10 text-fw-warn';
      case 'rollback':
        return 'bg-fw-accent text-fw-linkHover';
      case 'failed':
        return 'bg-fw-errorLight text-fw-error';
    }
  };

  const getTypeColor = (type: Version['type']) => {
    switch (type) {
      case 'major':
        return 'bg-fw-purpleLight text-fw-purple';
      case 'minor':
        return 'bg-fw-accent text-fw-linkHover';
      case 'patch':
        return 'bg-fw-successLight text-fw-success';
      case 'config':
        return 'bg-fw-neutral text-fw-heading';
    }
  };

  const getChangeTypeColor = (type: 'added' | 'modified' | 'removed') => {
    switch (type) {
      case 'added':
        return 'text-fw-success';
      case 'modified':
        return 'text-fw-link';
      case 'removed':
        return 'text-fw-error';
    }
  };

  const isCurrent = (v: Version) => v.number === current;

  // When exactly two versions are selected, build the comparison (oldest → newest).
  const comparePair = (() => {
    if (selectedVersions.length !== 2) return null;
    const picked = versions
      .filter(v => selectedVersions.includes(v.id))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (picked.length !== 2) return null;
    return { a: picked[0], b: picked[1], diff: diffVersions(picked[0], picked[1]) };
  })();

  return (
    <div className="space-y-6">
      {/* Version Control Header */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">Version Control</h3>
            <span className="px-2 py-1 text-figma-sm bg-fw-accent text-brand-blue rounded-lg">
              Current: v{current}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={History}
              onClick={() => setShowHistory(!showHistory)}
            >
              Version History
            </Button>
            <Button
              variant="outline"
              icon={Diff}
              onClick={() => setShowDiff(true)}
              disabled={selectedVersions.length !== 2}
              className={
                selectedVersions.length === 2
                  ? "border-brand-blue text-brand-blue hover:bg-brand-blue/5"
                  : ""
              }
            >
              Compare Versions
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-fw-accent rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-linkHover">Create Version</span>
              <GitCommit className="h-5 w-5 text-fw-link" />
            </div>
            <p className="text-figma-sm text-fw-link mb-3">Create a new version from current configuration</p>
            <Button variant="primary" className="w-full" onClick={handleCreateVersion}>
              Create Version
            </Button>
          </div>

          <div className="p-4 bg-fw-successLight rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-success">Backup Configuration</span>
              <Download className="h-5 w-5 text-fw-success" />
            </div>
            <p className="text-figma-sm text-fw-success mb-3">Export current configuration as backup</p>
            <Button variant="primary" className="w-full bg-fw-success hover:bg-fw-success" onClick={() => handleExport()}>
              Export Config
            </Button>
          </div>

          <div className="p-4 bg-fw-purpleLight rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-purple">Restore Version</span>
              <Upload className="h-5 w-5 text-fw-purple" />
            </div>
            <p className="text-figma-sm text-fw-purple mb-3">Restore configuration from backup</p>
            <Button
              variant="primary"
              className="w-full bg-fw-purple hover:bg-fw-purple"
              onClick={() => {
                const latestDeployed = [...versions].reverse().find(v => v.status === 'deployed') ?? versions[0];
                if (latestDeployed) handleRestore(latestDeployed);
              }}
            >
              Restore Config
            </Button>
          </div>
        </div>

        {/* Compare panel takes precedence when two versions are selected and Compare is active */}
        {showDiff && comparePair ? (
          <div className="border border-fw-active rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-fw-accent border-b border-fw-active/30">
              <div className="flex items-center gap-2">
                <Diff className="h-5 w-5 text-fw-link" />
                <h4 className="text-figma-base font-bold text-fw-heading">
                  Comparing v{comparePair.a.number}
                  <ArrowRight className="inline h-4 w-4 mx-1.5 text-fw-bodyLight" />
                  v{comparePair.b.number}
                </h4>
                <span className="ml-2 px-2 py-0.5 text-figma-sm font-medium rounded-lg bg-fw-base text-fw-link">
                  {comparePair.diff.changedFieldCount} field{comparePair.diff.changedFieldCount === 1 ? '' : 's'} changed
                </span>
              </div>
              <button
                onClick={() => setShowDiff(false)}
                className="inline-flex items-center gap-1.5 text-figma-sm font-medium text-fw-bodyLight hover:text-fw-heading"
              >
                <X className="h-4 w-4" /> Close
              </button>
            </div>

            {/* Author attribution for the two compared versions */}
            <div className="grid grid-cols-2 gap-px bg-fw-secondary">
              {[comparePair.a, comparePair.b].map((v, i) => (
                <div key={v.id} className="bg-fw-base px-5 py-3">
                  <p className="text-figma-xs font-semibold uppercase tracking-[0.06em] text-fw-bodyLight mb-1">
                    {i === 0 ? 'From' : 'To'} · v{v.number}
                  </p>
                  <AuthorBadge name={v.author} className="text-figma-sm" />
                  <p className="text-figma-xs text-fw-bodyLight mt-1">{new Date(v.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Field-by-field diff */}
            <div className="divide-y divide-fw-secondary">
              {comparePair.diff.fields.map((f) => (
                <div
                  key={f.label}
                  className={`grid grid-cols-[140px_1fr_auto_1fr] items-center gap-3 px-5 py-2.5 ${
                    f.changed ? 'bg-fw-warn/5' : ''
                  }`}
                >
                  <span className="text-figma-sm font-medium text-fw-bodyLight">{f.label}</span>
                  <span className={`text-figma-sm tabular-nums ${f.changed ? 'text-fw-error line-through/0' : 'text-fw-heading'}`}>
                    {f.from || '—'}
                  </span>
                  <ArrowRight className={`h-3.5 w-3.5 ${f.changed ? 'text-fw-link' : 'text-fw-secondary'}`} />
                  <span className={`text-figma-sm tabular-nums font-medium ${f.changed ? 'text-fw-success' : 'text-fw-heading'}`}>
                    {f.to || '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Dependency diff */}
            <div className="px-5 py-4 border-t border-fw-secondary">
              <p className="text-figma-xs font-semibold uppercase tracking-[0.06em] text-fw-bodyLight mb-2">Dependencies</p>
              <div className="flex flex-wrap gap-2">
                {comparePair.diff.dependencies.map((dep) => {
                  const tone =
                    dep.status === 'added' ? 'bg-fw-successLight text-fw-success' :
                    dep.status === 'removed' ? 'bg-fw-errorLight text-fw-error' :
                    dep.status === 'changed' ? 'bg-fw-accent text-fw-link' :
                    'bg-fw-neutral text-fw-body';
                  const label =
                    dep.status === 'added' ? `+ ${dep.name}@${dep.to}` :
                    dep.status === 'removed' ? `− ${dep.name}@${dep.from}` :
                    dep.status === 'changed' ? `${dep.name} ${dep.from} → ${dep.to}` :
                    `${dep.name}@${dep.to}`;
                  return (
                    <span key={dep.name} className={`px-2 py-1 text-figma-sm rounded-lg ${tone}`}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ) : showHistory ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-fw-neutral" />
            <div className="space-y-6">
              {versions.map((version) => (
                <div key={version.id} className="relative pl-8">
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCurrent(version)
                      ? 'bg-fw-cobalt-600 text-white'
                      : 'bg-fw-neutral text-fw-bodyLight'
                  }`}>
                    <GitCommit className="h-4 w-4" />
                  </div>
                  <div className="bg-fw-base p-4 rounded-2xl border border-fw-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-fw-heading">v{version.number}</span>
                        <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getTypeColor(version.type)}`}>
                          {version.type}
                        </span>
                        <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getStatusColor(version.status)}`}>
                          {version.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-figma-sm text-fw-bodyLight">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(version.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {version.changes.map((change, idx) => (
                        <div key={idx} className={`text-figma-base ${getChangeTypeColor(change.type)}`}>
                          {change.type === 'added' && '+'}
                          {change.type === 'removed' && '-'}
                          {change.type === 'modified' && '•'}
                          {change.component}: {change.description}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-figma-base">
                      <div className="flex items-center space-x-2">
                        <span className="text-fw-bodyLight">Author:</span>
                        <span className="font-medium text-fw-heading">{version.author}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-fw-bodyLight">CR:</span>
                        <span className="font-medium text-fw-heading">{version.compliance.changeRequest}</span>
                      </div>
                    </div>

                    {version.metadata.approvedBy && (
                      <div className="mt-2 pt-2 border-t border-fw-secondary flex items-center justify-between text-figma-base">
                        <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-fw-success" />
                          <span className="text-fw-bodyLight">Approved by {version.metadata.approvedBy}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-fw-bodyLight">Risk:</span>
                          <span className={`font-medium ${
                            version.compliance.riskAssessment === 'low' ? 'text-fw-success' :
                            version.compliance.riskAssessment === 'medium' ? 'text-fw-warn' : 'text-fw-error'
                          }`}>
                            {version.compliance.riskAssessment}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 border rounded-2xl ${
                  selectedVersions.includes(version.id)
                    ? 'border-fw-active bg-fw-accent'
                    : 'border-fw-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedVersions.includes(version.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedVersions.length < 2) {
                            setSelectedVersions([...selectedVersions, version.id]);
                          }
                        } else {
                          setSelectedVersions(selectedVersions.filter(id => id !== version.id));
                        }
                      }}
                      className="rounded border-fw-secondary text-fw-link"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-fw-heading">Version {version.number}</span>
                        <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getTypeColor(version.type)}`}>
                          {version.type}
                        </span>
                        <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getStatusColor(version.status)}`}>
                          {version.status}
                        </span>
                        {isCurrent(version) && (
                          <span className="px-2 py-1 text-figma-sm font-medium bg-fw-accent text-fw-linkHover rounded-lg">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-figma-sm text-fw-bodyLight mt-1.5">
                        <AuthorBadge name={version.author} className="text-figma-sm" />
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(version.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleExport(version)}
                      className="text-fw-bodyLight hover:text-fw-body p-2 rounded-full hover:bg-fw-neutral"
                      title="Download Configuration"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRestore(version)}
                      disabled={isCurrent(version)}
                      className="text-fw-bodyLight hover:text-fw-body p-2 rounded-full hover:bg-fw-neutral disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={isCurrent(version) ? 'Current version' : 'Restore Version'}
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleToggleLock(version)}
                      className={`p-2 rounded-full hover:bg-fw-neutral ${version.locked ? 'text-fw-link' : 'text-fw-bodyLight hover:text-fw-body'}`}
                      title={version.locked ? 'Unlock Version' : 'Lock Version'}
                      aria-pressed={!!version.locked}
                    >
                      <Lock className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Version Details */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-figma-base">
                  <div>
                    <span className="text-fw-bodyLight">Change Request:</span>
                    <span className="ml-2 text-fw-heading">{version.compliance.changeRequest}</span>
                  </div>
                  <div>
                    <span className="text-fw-bodyLight">Risk Level:</span>
                    <span className={`ml-2 font-medium ${
                      version.compliance.riskAssessment === 'low' ? 'text-fw-success' :
                      version.compliance.riskAssessment === 'medium' ? 'text-fw-warn' : 'text-fw-error'
                    }`}>
                      {version.compliance.riskAssessment.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-fw-bodyLight">Approvals:</span>
                    <span className="ml-2 text-fw-heading">
                      {version.compliance.approvals.received}/{version.compliance.approvals.required}
                    </span>
                  </div>
                  <div>
                    <span className="text-fw-bodyLight">Environment:</span>
                    <span className="ml-2 text-fw-heading">{version.metadata.environment}</span>
                  </div>
                </div>

                {/* Dependencies */}
                <div className="mt-4">
                  <span className="text-figma-sm text-fw-bodyLight">Dependencies:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {version.metadata.dependencies.map((dep) => (
                      <span key={dep.name} className="px-2 py-1 text-figma-sm bg-fw-neutral text-fw-body rounded-lg">
                        {dep.name}@{dep.version}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}