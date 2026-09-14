// src/components/configure/users/ConditionsPanel.tsx
// Split into two panels:
//   ResourceFiltersPanel  — WHICH assets (cloud, region, env, ownership, classification)
//   AccessConditionsPanel — HOW/WHEN (MFA, time window, IP allowlist)
import {
  CloudProvider,
  GeographicZone,
  Environment,
  AssetOwnership,
  DataClass,
  AssignmentConditions,
} from '../../../types/rbac';

export interface ConditionsState {
  // Resource filters — static asset attributes
  cloudProviders: CloudProvider[];
  locations: GeographicZone[];
  environments: Environment[];
  assetOwnership: AssetOwnership[];
  classification: DataClass | '';

  // Access conditions — request-time constraints
  requiresMFA: boolean;
  allowedIPs: string;       // newline-separated

  // Time window (part of access conditions)
  useTimeWindow: boolean;
  daysOfWeek: number[];     // 0=Sun … 6=Sat
  startHour: number;
  endHour: number;
  timezone: string;
}

export function emptyConditions(): ConditionsState {
  return {
    cloudProviders: [],
    locations: [],
    environments: [],
    assetOwnership: [],
    classification: '',
    requiresMFA: false,
    allowedIPs: '',
    useTimeWindow: false,
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 18,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function buildConditions(s: ConditionsState): AssignmentConditions | undefined {
  const resource: AssignmentConditions['resource'] = {};
  let hasResource = false;

  if (s.cloudProviders.length) { resource.cloudProviders = s.cloudProviders; hasResource = true; }
  if (s.locations.length) { resource.locations = s.locations; hasResource = true; }
  if (s.environments.length) { resource.environments = s.environments; hasResource = true; }
  if (s.assetOwnership.length) { resource.assetOwnership = s.assetOwnership; hasResource = true; }
  if (s.classification) { resource.classification = s.classification as DataClass; hasResource = true; }

  const request: AssignmentConditions['request'] = {};
  let hasRequest = false;

  if (s.requiresMFA) { request.requiresMFA = true; hasRequest = true; }

  const ips = s.allowedIPs.split('\n').map(l => l.trim()).filter(Boolean);
  if (ips.length) { request.allowedIPs = ips; hasRequest = true; }

  if (s.useTimeWindow) {
    request.timeWindow = {
      daysOfWeek: s.daysOfWeek,
      startHour: s.startHour,
      endHour: s.endHour,
      timezone: s.timezone,
    };
    hasRequest = true;
  }

  if (!hasResource && !hasRequest) return undefined;
  return {
    ...(hasResource ? { resource } : {}),
    ...(hasRequest ? { request } : {}),
  };
}

export function countResourceFilters(s: ConditionsState): number {
  return [
    s.cloudProviders.length,
    s.locations.length,
    s.environments.length,
    s.assetOwnership.length,
    s.classification ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
}

export function countAccessConditions(s: ConditionsState): number {
  return [
    s.requiresMFA ? 1 : 0,
    s.allowedIPs.trim() ? 1 : 0,
    s.useTimeWindow ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
}

/** Total active across both sections — kept for backward compat */
export function countActiveConditions(s: ConditionsState): number {
  return countResourceFilters(s) + countAccessConditions(s);
}

function toggleIn<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-fw-secondary text-fw-active focus:ring-fw-active"
      />
      <span className="text-figma-sm text-fw-body">{label}</span>
    </label>
  );
}

interface PanelProps {
  state: ConditionsState;
  onChange: (s: ConditionsState) => void;
}

// ── Resource Filters ───────────────────────────────────────────────────────────
// Narrows WHICH assets the assignment covers.
// Absence of a filter = unconstrained (applies to all matching assets).
// If a filter is set and the resource lacks that attribute → DENY.
export function ResourceFiltersPanel({ state, onChange }: PanelProps) {
  const set = (patch: Partial<ConditionsState>) => onChange({ ...state, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-figma-xs text-fw-bodyLight">
        Narrows which assets this assignment covers within the selected scope.
        Leave all blank to allow access to every matching asset.
        If a filter is set and the asset doesn't declare that attribute, access is <strong>denied</strong>.
      </p>

      <div>
        <p className="text-figma-xs font-medium text-fw-body mb-1.5">Cloud provider</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['aws', 'azure', 'gcp', 'oracle'] as CloudProvider[]).map(p => (
            <CheckRow
              key={p}
              label={p.toUpperCase()}
              checked={state.cloudProviders.includes(p)}
              onChange={() => set({ cloudProviders: toggleIn(state.cloudProviders, p) })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-figma-xs font-medium text-fw-body mb-1.5">Region</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['US-East', 'US-West', 'EU-West', 'Asia-Pacific'] as GeographicZone[]).map(loc => (
            <CheckRow
              key={loc}
              label={loc}
              checked={state.locations.includes(loc)}
              onChange={() => set({ locations: toggleIn(state.locations, loc) })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-figma-xs font-medium text-fw-body mb-1.5">Environment</p>
        <div className="flex gap-4">
          {(['prod', 'staging', 'dev'] as Environment[]).map(env => (
            <CheckRow
              key={env}
              label={env}
              checked={state.environments.includes(env)}
              onChange={() => set({ environments: toggleIn(state.environments, env) })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-figma-xs font-medium text-fw-body mb-1.5">Asset ownership</p>
        <div className="space-y-1.5">
          {(
            [
              ['att-owned', 'AT&T-owned (backbone, managed CPE)'],
              ['provider-owned', 'Provider-owned (Azure / AWS / GCP routers)'],
              ['tenant-owned', 'Tenant-owned (customer BYOD CPE)'],
              ['reseller-owned', 'Reseller-owned (partner / VAR equipment)'],
            ] as [AssetOwnership, string][]
          ).map(([val, label]) => (
            <CheckRow
              key={val}
              label={label}
              checked={state.assetOwnership.includes(val)}
              onChange={() => set({ assetOwnership: toggleIn(state.assetOwnership, val) })}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-figma-xs font-medium text-fw-body mb-1.5">Max Data Classification</label>
        <select
          value={state.classification}
          onChange={e => set({ classification: e.target.value as DataClass | '' })}
          className="w-full px-3 py-1.5 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active"
        >
          <option value="">Unrestricted</option>
          <option value="unclassified">Unclassified</option>
          <option value="cui">CUI (Controlled Unclassified Information)</option>
          <option value="sensitive">Sensitive</option>
        </select>
        <p className="mt-1 text-figma-xs text-fw-bodyLight">
          Resources above this classification level are denied — regardless of other permissions.
        </p>
      </div>
    </div>
  );
}

// ── Access Conditions ──────────────────────────────────────────────────────────
// Constrains HOW and WHEN this assignment may be used. Evaluated at request time.
export function AccessConditionsPanel({ state, onChange }: PanelProps) {
  const set = (patch: Partial<ConditionsState>) => onChange({ ...state, ...patch });
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <p className="text-figma-xs text-fw-bodyLight">
        Constraints evaluated at request time — not on the asset, but on the request itself.
      </p>

      <div>
        <CheckRow
          label="Require MFA verification"
          checked={state.requiresMFA}
          onChange={() => set({ requiresMFA: !state.requiresMFA })}
        />
      </div>

      <div>
        <CheckRow
          label="Restrict to time window"
          checked={state.useTimeWindow}
          onChange={() => set({ useTimeWindow: !state.useTimeWindow })}
        />
        {state.useTimeWindow && (
          <div className="mt-2 ml-5 space-y-3 p-3 bg-fw-wash rounded-lg border border-fw-secondary">
            <div>
              <p className="text-figma-xs font-medium text-fw-body mb-1.5">Days of week</p>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => set({ daysOfWeek: toggleIn(state.daysOfWeek, i) })}
                    className={`w-8 h-8 text-figma-xs rounded font-medium transition-colors ${
                      state.daysOfWeek.includes(i)
                        ? 'bg-fw-active text-white'
                        : 'bg-fw-base border border-fw-secondary text-fw-bodyLight hover:border-fw-active'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-figma-xs font-medium text-fw-body mb-1">Start hour (0-23)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={state.startHour}
                  onChange={e => set({ startHour: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-xs font-medium text-fw-body mb-1">End hour (0-23)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={state.endHour}
                  onChange={e => set({ endHour: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active"
                />
              </div>
            </div>
            <div>
              <label className="block text-figma-xs font-medium text-fw-body mb-1">Timezone (IANA)</label>
              <input
                type="text"
                value={state.timezone}
                onChange={e => set({ timezone: e.target.value })}
                placeholder="e.g. America/Chicago"
                className="w-full px-2 py-1.5 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-figma-xs font-medium text-fw-body mb-1.5">IP allowlist</label>
        <textarea
          value={state.allowedIPs}
          onChange={e => set({ allowedIPs: e.target.value })}
          rows={3}
          placeholder={"One IP or CIDR per line\n10.0.0.0/24\n192.168.1.100"}
          className="w-full px-2 py-1.5 text-figma-xs font-mono border border-fw-secondary rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled resize-none focus:outline-none focus:ring-2 focus:ring-fw-active"
        />
        <p className="mt-1 text-figma-xs text-fw-bodyLight">Leave blank for no IP restriction.</p>
      </div>
    </div>
  );
}

/** Combined panel — both sections. Kept for contexts where a single collapsible is preferred. */
export function ConditionsPanel({ state, onChange }: PanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wide mb-3">Resource filters</p>
        <ResourceFiltersPanel state={state} onChange={onChange} />
      </div>
      <div className="border-t border-fw-secondary" />
      <div>
        <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wide mb-3">Access conditions</p>
        <AccessConditionsPanel state={state} onChange={onChange} />
      </div>
    </div>
  );
}
