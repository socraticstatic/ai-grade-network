// Declarative, parameterized store checks for builder-made studies.
// All checks are baseline-relative: recordBaselineSeed snapshots entity ids at Begin.
import type { VerifierFn, SeedFn } from '../../types/testLab';

const ENTITY_TYPES = ['connections', 'hubs', 'vnfs', 'groups'] as const;
type EntityType = typeof ENTITY_TYPES[number];

export const recordBaselineSeed: SeedFn = ({ set, get }) => {
  const baseline: Record<string, string[]> = {};
  for (const t of ENTITY_TYPES) baseline[t] = (get()[t] ?? []).map((e: any) => e.id);
  const meta = get().testLabSeedMeta ?? {};
  set({ testLabSeedMeta: { ...meta, builderBaseline: baseline } });
};

function newEntities(state: Record<string, any>, type: EntityType): any[] {
  const base: string[] = state.testLabSeedMeta?.builderBaseline?.[type] ?? [];
  return (state[type] ?? []).filter((e: any) => !base.includes(e.id));
}

const matches = (e: any, params: Record<string, any>) => {
  if (params.nameIncludes && !String(e.name ?? '').toLowerCase().includes(String(params.nameIncludes).toLowerCase())) return false;
  if (params.provider && String(e.provider ?? '').toLowerCase() !== String(params.provider).toLowerCase()) return false;
  return true;
};

export interface CatalogParamField { key: string; label: string; placeholder?: string }
export interface CatalogEntry {
  id: string;
  label: string;
  description: string;
  paramFields: CatalogParamField[];
  build: (params: Record<string, any>) => VerifierFn;
}

const createdEntry = (type: EntityType, id: string, label: string, withFilters: boolean): CatalogEntry => ({
  id,
  label,
  description: `Passes when a new ${label.split(' ')[0].toLowerCase()} exists beyond what the session started with.`,
  paramFields: withFilters
    ? [
        { key: 'nameIncludes', label: 'Name contains (optional)', placeholder: 'e.g. AWS' },
        { key: 'provider', label: 'Provider (optional)', placeholder: 'e.g. AWS' },
      ]
    : [],
  build: (params) => (state) => newEntities(state, type).some(e => matches(e, params ?? {})),
});

export const VERIFIER_CATALOG: CatalogEntry[] = [
  createdEntry('connections', 'connection-created', 'Connection created', true),
  createdEntry('hubs', 'hub-created', 'Hub created', false),
  createdEntry('vnfs', 'vnf-created', 'VNF created', false),
  createdEntry('groups', 'group-created', 'Group created', false),
  {
    id: 'no-new-entities',
    label: 'Nothing created (permission wall)',
    description: 'Passes when no connections, hubs, VNFs, or groups were created — pair with a comprehension check.',
    paramFields: [],
    build: () => (state) => ENTITY_TYPES.every(t => newEntities(state, t).length === 0),
  },
];
