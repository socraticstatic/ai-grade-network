/**
 * Pure comparison logic for the Versioning "Compare" view. Given two versions,
 * it computes a field-by-field diff and a per-dependency status so the UI can
 * render exactly what changed between any two points in history.
 */

export interface VersionLike {
  number: string;
  author: string;
  type: string;
  status: string;
  timestamp: string;
  metadata: {
    environment: string;
    configHash: string;
    approvedBy?: string;
    dependencies: { name: string; version: string }[];
  };
  compliance: {
    riskAssessment: string;
    changeRequest: string;
    approvals: { required: number; received: number };
  };
}

export interface FieldDiff {
  label: string;
  from: string;
  to: string;
  changed: boolean;
}

export interface DependencyDiff {
  name: string;
  from?: string;
  to?: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
}

export interface VersionDiff {
  fields: FieldDiff[];
  dependencies: DependencyDiff[];
  changedFieldCount: number;
}

/** Next semantic version: bump the patch of the highest existing version (x.y.z). */
export function nextVersionNumber(existing: string[]): string {
  if (existing.length === 0) return '1.0.0';
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
  const highest = existing
    .map(parse)
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
  const [maj = 1, min = 0, patch = 0] = highest;
  return `${maj}.${min}.${patch + 1}`;
}

function field(label: string, from: string, to: string): FieldDiff {
  return { label, from, to, changed: from !== to };
}

export function diffVersions(a: VersionLike, b: VersionLike): VersionDiff {
  const fields: FieldDiff[] = [
    field('Version', a.number, b.number),
    field('Author', a.author, b.author),
    field('Type', a.type, b.type),
    field('Status', a.status, b.status),
    field('Environment', a.metadata.environment, b.metadata.environment),
    field('Risk', a.compliance.riskAssessment, b.compliance.riskAssessment),
    field('Change Request', a.compliance.changeRequest, b.compliance.changeRequest),
    field(
      'Approvals',
      `${a.compliance.approvals.received}/${a.compliance.approvals.required}`,
      `${b.compliance.approvals.received}/${b.compliance.approvals.required}`
    ),
    field('Config Hash', a.metadata.configHash, b.metadata.configHash),
  ];

  const fromDeps = new Map(a.metadata.dependencies.map(d => [d.name, d.version]));
  const toDeps = new Map(b.metadata.dependencies.map(d => [d.name, d.version]));
  const names = Array.from(new Set([...fromDeps.keys(), ...toDeps.keys()])).sort();

  const dependencies: DependencyDiff[] = names.map(name => {
    const from = fromDeps.get(name);
    const to = toDeps.get(name);
    let status: DependencyDiff['status'];
    if (from === undefined) status = 'added';
    else if (to === undefined) status = 'removed';
    else if (from !== to) status = 'changed';
    else status = 'unchanged';
    return { name, from, to, status };
  });

  return {
    fields,
    dependencies,
    changedFieldCount: fields.filter(f => f.changed).length,
  };
}
