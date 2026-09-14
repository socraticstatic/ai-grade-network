// src/components/configure/users/ScopeDimensionsPanel.tsx
// Unified scope-dimension controls with 5 W's framing, filtered by tier.
//
// Tier visibility rules:
//   Time window, MFA, IP allowlist  → ALL tiers
//   Geography, Environment          → tenant and below (tenant, client, pool, connection, hub)
//   Cloud provider, Asset ownership,
//   Data classification             → client and below (client, pool, connection, hub)

import {
  ScopeTier,
  CloudProvider,
  GeographicZone,
  Environment,
  AssetOwnership,
  DataClass,
} from '../../../types/rbac';
import { ConditionsState } from './ConditionsPanel';

// ── Tier ranking ───────────────────────────────────────────────────────────────

const TIER_RANK: Record<ScopeTier, number> = {
  platform:     0,
  reseller:     1,
  tenant:       2,
  client:       3,
  pool:         4,
  connection:   5,
  'hub': 5,
};

// Show if the current tier is at or below (i.e. >= rank of) the threshold tier.
function tierAtOrBelow(current: ScopeTier, threshold: ScopeTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[threshold];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toggleIn<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-figma-xs rounded-full border font-medium transition-colors ${
        active
          ? 'bg-fw-active border-fw-active text-white'
          : 'bg-fw-base border-fw-secondary text-fw-body hover:border-fw-active hover:text-fw-heading'
      }`}
    >
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export interface ScopeDimensionsPanelProps {
  scopeTier: ScopeTier;
  state: ConditionsState;
  onChange: (next: ConditionsState) => void;
}

export function ScopeDimensionsPanel({
  scopeTier,
  state,
  onChange,
}: ScopeDimensionsPanelProps) {
  const set = (patch: Partial<ConditionsState>) => onChange({ ...state, ...patch });

  const showGeo = tierAtOrBelow(scopeTier, 'tenant');
  const showClientFilters = tierAtOrBelow(scopeTier, 'client');

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-5">

      {/* WHEN — Time Window */}
      <div>
        <SectionLabel>When — Time Window</SectionLabel>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.useTimeWindow}
            onChange={() => set({ useTimeWindow: !state.useTimeWindow })}
            className="rounded border-fw-secondary text-fw-active focus:ring-fw-active"
          />
          <span className="text-figma-sm text-fw-body">Restrict to a time window</span>
        </label>

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
                <label className="block text-figma-xs font-medium text-fw-body mb-1">
                  Start hour (0-23)
                </label>
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
                <label className="block text-figma-xs font-medium text-fw-body mb-1">
                  End hour (0-23)
                </label>
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
              <label className="block text-figma-xs font-medium text-fw-body mb-1">
                Timezone (IANA)
              </label>
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

      {/* HOW — Require MFA */}
      <div>
        <SectionLabel>How — Require MFA</SectionLabel>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.requiresMFA}
            onChange={() => set({ requiresMFA: !state.requiresMFA })}
            className="rounded border-fw-secondary text-fw-active focus:ring-fw-active"
          />
          <span className="text-figma-sm text-fw-body">Require MFA verification on each access</span>
        </label>
      </div>

      {/* HOW — IP Allowlist */}
      <div>
        <SectionLabel>How — IP Allowlist</SectionLabel>
        <textarea
          value={state.allowedIPs}
          onChange={e => set({ allowedIPs: e.target.value })}
          rows={3}
          placeholder={"One IP or CIDR per line\n10.0.0.0/24\n192.168.1.100"}
          className="w-full px-2 py-1.5 text-figma-xs font-mono border border-fw-secondary rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled resize-none focus:outline-none focus:ring-2 focus:ring-fw-active"
        />
        <p className="mt-1 text-figma-xs text-fw-bodyLight">Leave blank for no IP restriction.</p>
      </div>

      {/* WHICH — Geography (tenant and below) */}
      {showGeo && (
        <div>
          <SectionLabel>Which — Geography</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {(['US-East', 'US-West', 'EU-West', 'Asia-Pacific'] as GeographicZone[]).map(loc => (
              <Chip
                key={loc}
                label={loc}
                active={state.locations.includes(loc)}
                onClick={() => set({ locations: toggleIn(state.locations, loc) })}
              />
            ))}
          </div>
          <p className="mt-1 text-figma-xs text-fw-bodyLight">
            Leave empty to allow all regions.
          </p>
        </div>
      )}

      {/* WHICH — Environment (tenant and below) */}
      {showGeo && (
        <div>
          <SectionLabel>Which — Environment</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {(['prod', 'staging', 'dev'] as Environment[]).map(env => (
              <Chip
                key={env}
                label={env}
                active={state.environments.includes(env)}
                onClick={() => set({ environments: toggleIn(state.environments, env) })}
              />
            ))}
          </div>
          <p className="mt-1 text-figma-xs text-fw-bodyLight">
            Leave empty to allow all environments.
          </p>
        </div>
      )}

      {/* WHICH — Cloud Provider (client and below) */}
      {showClientFilters && (
        <div>
          <SectionLabel>Which — Cloud Provider</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {(['aws', 'azure', 'gcp', 'oracle'] as CloudProvider[]).map(p => (
              <Chip
                key={p}
                label={p.toUpperCase()}
                active={state.cloudProviders.includes(p)}
                onClick={() => set({ cloudProviders: toggleIn(state.cloudProviders, p) })}
              />
            ))}
          </div>
          <p className="mt-1 text-figma-xs text-fw-bodyLight">
            Leave empty to allow all providers.
          </p>
        </div>
      )}

      {/* WHICH — Asset Ownership (client and below) */}
      {showClientFilters && (
        <div>
          <SectionLabel>Which — Asset Ownership</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['att-owned', 'AT&T-owned'],
                ['provider-owned', 'Provider-owned'],
                ['tenant-owned', 'Tenant-owned'],
                ['reseller-owned', 'Reseller-owned'],
              ] as [AssetOwnership, string][]
            ).map(([val, label]) => (
              <Chip
                key={val}
                label={label}
                active={state.assetOwnership.includes(val)}
                onClick={() => set({ assetOwnership: toggleIn(state.assetOwnership, val) })}
              />
            ))}
          </div>
          <p className="mt-1 text-figma-xs text-fw-bodyLight">
            Leave empty to allow all ownership types.
          </p>
        </div>
      )}

      {/* WHICH — Data Classification (client and below) */}
      {showClientFilters && (
        <div>
          <SectionLabel>Which — Data Classification</SectionLabel>
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
            Resources classified above this level will be denied.
          </p>
        </div>
      )}
    </div>
  );
}
