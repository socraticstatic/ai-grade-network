import { ReactNode, useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';

// --- Types ---

export type FilterControlType = 'checkbox' | 'toggle' | 'select';

export interface FilterOption {
  value: string;
  label: string;
  /** Semantic color for pill/toggle. Falls back to 'default'. */
  color?: 'error' | 'warning' | 'success' | 'info' | 'default';
}

export interface FilterGroup {
  id: string;
  label: string;
  type: FilterControlType;
  options: FilterOption[];
  /** For select type only - placeholder when nothing is selected */
  placeholder?: string;
}

export interface ActiveFilter {
  groupId: string;
  groupLabel: string;
  value: string;
  label: string;
  color?: FilterOption['color'];
}

export interface TableFilterPanelProps {
  /** Filter group definitions */
  groups: FilterGroup[];
  /** Current active filter values keyed by group id */
  activeFilters: Record<string, string[]>;
  /** Called when filters change */
  onFiltersChange: (filters: Record<string, string[]>) => void;
  /** Whether the filter panel is expanded */
  isOpen: boolean;
  /** Toggle filter panel open/closed */
  onToggle: () => void;
  /** Optional: search query (to show in active pills) */
  searchQuery?: string;
  /** Optional: callback to clear search */
  onClearSearch?: () => void;
  /** Optional: extra content in the actions column */
  actions?: ReactNode;
  /** Optional: how many items pass the current filters (shown with totalCount) */
  resultCount?: number;
  /** Optional: total item count before filtering */
  totalCount?: number;
}

// --- Color Map ---

const PILL_COLORS: Record<string, { text: string; bg: string }> = {
  error: { text: '#c70032', bg: 'rgba(199,0,50,0.16)' },
  warning: { text: '#ea712f', bg: 'rgba(234,113,47,0.16)' },
  success: { text: '#2d7e24', bg: 'rgba(45,126,36,0.16)' },
  info: { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
  default: { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
};

const TOGGLE_ACTIVE: Record<string, string> = {
  error: 'bg-fw-errorLight text-fw-error',
  warning: 'bg-fw-warnLight text-fw-warn',
  success: 'bg-fw-successLight text-fw-success',
  info: 'bg-fw-accent text-fw-link',
  default: 'bg-fw-accent text-fw-link',
};

const TOGGLE_INACTIVE = 'bg-fw-wash text-fw-body hover:bg-fw-neutral';

// --- Helpers ---

function getPillColor(color?: string): { text: string; bg: string } {
  return PILL_COLORS[color || 'default'] || PILL_COLORS.default;
}

function getToggleColor(color?: string, active?: boolean): string {
  if (!active) return TOGGLE_INACTIVE;
  return TOGGLE_ACTIVE[color || 'default'] || TOGGLE_ACTIVE.default;
}

// --- Components ---

/** Active filter pill with dismiss button */
function FilterPill({
  filter,
  onRemove,
}: {
  filter: ActiveFilter;
  onRemove: () => void;
}) {
  const colors = getPillColor(filter.color);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[12px] font-medium leading-4"
      style={{ color: colors.text, backgroundColor: colors.bg }}
    >
      {filter.groupLabel}: {filter.label}
      <button
        onClick={onRemove}
        className="ml-1.5 hover:opacity-75 focus:outline-none"
        aria-label={`Remove ${filter.label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Checkbox filter group */
function CheckboxGroup({
  group,
  selected,
  onToggle,
}: {
  group: FilterGroup;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  // Long facets (e.g. every metro) balance into two columns instead of one tall stack.
  const twoColumn = group.options.length > 6;
  return (
    <div className="min-w-[140px]">
      <h4 className="text-figma-base font-medium text-fw-body mb-2 whitespace-nowrap">{group.label}</h4>
      <div className={twoColumn ? 'grid grid-cols-2 gap-x-8 gap-y-2' : 'space-y-2'}>
        {group.options.map((opt) => (
          <label key={opt.value} className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="rounded border-fw-secondary text-brand-blue focus:ring-brand-blue h-4 w-4 shrink-0"
            />
            <span className="ml-2 text-figma-base text-fw-bodyLight whitespace-nowrap">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Toggle button filter group */
function ToggleGroup({
  group,
  selected,
  onToggle,
}: {
  group: FilterGroup;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h4 className="text-figma-base font-medium text-fw-body mb-2">{group.label}</h4>
      <div className="flex flex-wrap gap-2">
        {group.options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${getToggleColor(opt.color, active)}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Select dropdown filter group */
function SelectGroup({
  group,
  selected,
  onChange,
}: {
  group: FilterGroup;
  selected: string[];
  onChange: (value: string) => void;
}) {
  const currentValue = selected[0] || '';
  return (
    <div>
      <h4 className="text-figma-base font-medium text-fw-body mb-2">{group.label}</h4>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
      >
        {group.placeholder && <option value="">{group.placeholder}</option>}
        {group.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Main Component ---

export function TableFilterPanel({
  groups,
  activeFilters,
  onFiltersChange,
  isOpen,
  onToggle,
  searchQuery,
  onClearSearch,
  actions,
  resultCount,
  totalCount,
}: TableFilterPanelProps) {
  // Toggle a single value in a filter group
  const handleToggleValue = useCallback(
    (groupId: string, value: string) => {
      const current = activeFilters[groupId] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onFiltersChange({ ...activeFilters, [groupId]: next });
    },
    [activeFilters, onFiltersChange]
  );

  // Set a single value for select-type groups
  const handleSelectValue = useCallback(
    (groupId: string, value: string) => {
      onFiltersChange({
        ...activeFilters,
        [groupId]: value ? [value] : [],
      });
    },
    [activeFilters, onFiltersChange]
  );

  // Remove a specific filter value
  const handleRemoveFilter = useCallback(
    (groupId: string, value: string) => {
      const current = activeFilters[groupId] || [];
      onFiltersChange({
        ...activeFilters,
        [groupId]: current.filter((v) => v !== value),
      });
    },
    [activeFilters, onFiltersChange]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    const cleared: Record<string, string[]> = {};
    groups.forEach((g) => {
      cleared[g.id] = [];
    });
    onFiltersChange(cleared);
    onClearSearch?.();
  }, [groups, onFiltersChange, onClearSearch]);

  // Build the flat list of active filter pills
  const activePills = useMemo<ActiveFilter[]>(() => {
    const pills: ActiveFilter[] = [];
    groups.forEach((group) => {
      const values = activeFilters[group.id] || [];
      values.forEach((value) => {
        const opt = group.options.find((o) => o.value === value);
        // No matching option (stale value from another view) still gets a pill —
        // an active filter the user can't see or remove is worse than a raw label.
        pills.push({
          groupId: group.id,
          groupLabel: group.label,
          value,
          label: opt?.label ?? value,
          color: opt?.color,
        });
      });
    });
    return pills;
  }, [groups, activeFilters]);

  const hasActiveFilters = activePills.length > 0 || !!searchQuery;
  const activeCount = activePills.length + (searchQuery ? 1 : 0);

  return (
    <div>
      {/* Filter panel body */}
      {isOpen && (
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4 mt-4 pt-4 border-t border-fw-secondary">
          {groups.map((group) => {
            const selected = activeFilters[group.id] || [];

            switch (group.type) {
              case 'checkbox':
                return (
                  <CheckboxGroup
                    key={group.id}
                    group={group}
                    selected={selected}
                    onToggle={(v) => handleToggleValue(group.id, v)}
                  />
                );
              case 'toggle':
                return (
                  <ToggleGroup
                    key={group.id}
                    group={group}
                    selected={selected}
                    onToggle={(v) => handleToggleValue(group.id, v)}
                  />
                );
              case 'select':
                return (
                  <SelectGroup
                    key={group.id}
                    group={group}
                    selected={selected}
                    onChange={(v) => handleSelectValue(group.id, v)}
                  />
                );
              default:
                return null;
            }
          })}

          {/* Actions column */}
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
      )}

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-fw-bodyLight shrink-0">Active:</span>
          <div className="flex flex-wrap gap-1">
            {activePills.map((pill) => (
              <FilterPill
                key={`${pill.groupId}-${pill.value}`}
                filter={pill}
                onRemove={() => handleRemoveFilter(pill.groupId, pill.value)}
              />
            ))}
            {searchQuery && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[12px] font-medium leading-4"
                style={{ color: '#686e74', backgroundColor: 'rgba(104,110,116,0.16)' }}
              >
                Search: &ldquo;{searchQuery}&rdquo;
                <button
                  onClick={onClearSearch}
                  className="ml-1.5 hover:text-fw-heading focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <button
            onClick={handleClearAll}
            className="text-figma-sm text-fw-bodyLight hover:text-fw-body ml-1 shrink-0"
          >
            Clear all
          </button>
          {resultCount !== undefined && totalCount !== undefined && (
            <span className="ml-auto text-figma-sm text-fw-bodyLight shrink-0">
              Showing {resultCount} of {totalCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// --- Hook for managing filter state ---

export interface UseTableFiltersOptions {
  groups: FilterGroup[];
  /** Optional initial filter values */
  initialFilters?: Record<string, string[]>;
}

export function useTableFilters({ groups, initialFilters }: UseTableFiltersOptions) {
  const defaultFilters = useMemo(() => {
    const defaults: Record<string, string[]> = {};
    groups.forEach((g) => {
      defaults[g.id] = initialFilters?.[g.id] || [];
    });
    return defaults;
  }, [groups, initialFilters]);

  const [filters, setFilters] = useState<Record<string, string[]>>(defaultFilters);
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const activeCount = useMemo(() => {
    return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);
  }, [filters]);

  const resetFilters = useCallback(() => {
    const cleared: Record<string, string[]> = {};
    groups.forEach((g) => {
      cleared[g.id] = [];
    });
    setFilters(cleared);
  }, [groups]);

  /** Check if a value passes the current filters. Returns true if no filter is set for that group. */
  const matchesFilter = useCallback(
    (groupId: string, value: string): boolean => {
      const selected = filters[groupId];
      if (!selected || selected.length === 0) return true;
      return selected.includes(value);
    },
    [filters]
  );

  return {
    filters,
    setFilters,
    isOpen,
    setIsOpen,
    toggle,
    activeCount,
    resetFilters,
    matchesFilter,
  };
}
