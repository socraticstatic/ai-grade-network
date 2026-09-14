import { describe, it, expect } from 'vitest';
import { diffVersions, nextVersionNumber, type VersionLike } from './versionDiff';

describe('nextVersionNumber', () => {
  it('bumps the patch of the highest existing version', () => {
    expect(nextVersionNumber(['1.0.0', '1.1.0', '1.1.1'])).toBe('1.1.2');
  });

  it('ignores ordering and compares semantically', () => {
    expect(nextVersionNumber(['1.1.1', '1.0.0', '1.10.3'])).toBe('1.10.4');
  });

  it('starts at 1.0.0 when there are no versions', () => {
    expect(nextVersionNumber([])).toBe('1.0.0');
  });
});

const base: VersionLike = {
  number: '1.0.0',
  author: 'Sarah Patel',
  type: 'major',
  status: 'deployed',
  timestamp: '2024-03-10T15:30:00Z',
  metadata: {
    environment: 'production',
    configHash: 'abc123',
    approvedBy: 'John Smith',
    dependencies: [
      { name: 'routing-module', version: '2.1.0' },
      { name: 'security-module', version: '1.5.0' },
    ],
  },
  compliance: {
    riskAssessment: 'low',
    changeRequest: 'CR-001',
    approvals: { required: 2, received: 2 },
  },
  changes: [{ component: 'Network', type: 'added', description: 'Configured BGP routing' }],
};

const next: VersionLike = {
  number: '1.1.0',
  author: 'Maria Garcia',
  type: 'minor',
  status: 'deployed',
  timestamp: '2024-03-11T10:15:00Z',
  metadata: {
    environment: 'production',
    configHash: 'def456',
    approvedBy: 'John Smith',
    dependencies: [
      { name: 'routing-module', version: '2.2.0' }, // changed
      { name: 'qos-module', version: '1.0.0' }, // added
      // security-module removed
    ],
  },
  compliance: {
    riskAssessment: 'medium',
    changeRequest: 'CR-002',
    approvals: { required: 2, received: 1 },
  },
  changes: [{ component: 'QoS', type: 'added', description: 'Added traffic prioritization' }],
};

describe('diffVersions', () => {
  it('marks fields that changed and leaves unchanged ones unmarked', () => {
    const d = diffVersions(base, next);
    const byLabel = Object.fromEntries(d.fields.map(f => [f.label, f]));

    expect(byLabel['Author'].from).toBe('Sarah Patel');
    expect(byLabel['Author'].to).toBe('Maria Garcia');
    expect(byLabel['Author'].changed).toBe(true);

    expect(byLabel['Environment'].changed).toBe(false);
    expect(byLabel['Risk'].changed).toBe(true);
    expect(byLabel['Config Hash'].changed).toBe(true);
  });

  it('formats approvals as received/required', () => {
    const d = diffVersions(base, next);
    const approvals = d.fields.find(f => f.label === 'Approvals')!;
    expect(approvals.from).toBe('2/2');
    expect(approvals.to).toBe('1/2');
    expect(approvals.changed).toBe(true);
  });

  it('classifies dependency changes: added, removed, changed, unchanged', () => {
    const d = diffVersions(base, next);
    const byName = Object.fromEntries(d.dependencies.map(dep => [dep.name, dep]));

    expect(byName['routing-module'].status).toBe('changed');
    expect(byName['routing-module'].from).toBe('2.1.0');
    expect(byName['routing-module'].to).toBe('2.2.0');

    expect(byName['security-module'].status).toBe('removed');
    expect(byName['security-module'].from).toBe('1.5.0');
    expect(byName['security-module'].to).toBeUndefined();

    expect(byName['qos-module'].status).toBe('added');
    expect(byName['qos-module'].from).toBeUndefined();
    expect(byName['qos-module'].to).toBe('1.0.0');
  });

  it('reports a stable count of changed fields', () => {
    const d = diffVersions(base, next);
    // Version, Author, Type, Risk, Change Request, Approvals, Config Hash changed; Status, Environment unchanged
    expect(d.changedFieldCount).toBe(7);
  });

  it('produces no changed fields when comparing a version to itself', () => {
    const d = diffVersions(base, base);
    expect(d.changedFieldCount).toBe(0);
    expect(d.dependencies.every(dep => dep.status === 'unchanged')).toBe(true);
  });
});
