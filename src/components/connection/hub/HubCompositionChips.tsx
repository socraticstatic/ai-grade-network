import { isC2C } from '../../../utils/connectionLegs';
import type { Connection } from '../../../types';

/**
 * Compact "3 VPN · 2 C2C" breakdown of a Connection Hub's contents by connection
 * type. This is what makes a heterogeneous Hub legible at a glance in the list and
 * detail header. C2C is bucketed via isC2C so multi-cloud connections read as one type.
 */

const TYPE_SHORT: Record<string, string> = {
  'Internet to Cloud': 'Internet',
  'Cloud to Cloud': 'C2C',
  'DataCenter/CoLocation to Cloud': 'DC/CoLo',
  'VPN to Cloud': 'VPN',
  'Site to Cloud': 'Site',
  'Internet Direct': 'Direct',
  'AWS Last Mile': 'Last Mile',
};

/** Group order for stable display. */
const TYPE_ORDER = [
  'Internet to Cloud',
  'AWS Last Mile',
  'Cloud to Cloud',
  'DataCenter/CoLocation to Cloud',
  'VPN to Cloud',
  'Site to Cloud',
  'Internet Direct',
];

/**
 * Canonical group key for a connection. C2C is bucketed via isC2C. The wizard derives
 * single-cloud internet connections as "Internet to AWS Cloud" (etc.); fold those back
 * to the canonical "Internet to Cloud" so they group together and pick up the right
 * column schema instead of forming a one-off group.
 */
export function normalizeHubGroupType(c: Connection): string {
  if (isC2C(c)) return 'Cloud to Cloud';
  const t = c.type as string;
  if (/^Internet to .+Cloud$/.test(t)) return 'Internet to Cloud';
  return t;
}

function bucketOf(c: Connection): string {
  return normalizeHubGroupType(c);
}

export function composeByType(connections: Connection[]): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of connections) {
    const k = bucketOf(c);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a[0]);
      const bi = TYPE_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([type, count]) => ({ type, count }));
}

interface HubCompositionChipsProps {
  connections: Connection[];
  size?: 'sm' | 'md';
}

export function HubCompositionChips({ connections, size = 'md' }: HubCompositionChipsProps) {
  const groups = composeByType(connections);
  if (groups.length === 0) {
    return <span className="text-figma-xs text-fw-disabled">No connections</span>;
  }
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-figma-xs';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map(({ type, count }) => (
        <span
          key={type}
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-brand-lightBlue text-fw-link ${pad}`}
          title={`${count} ${type}`}
        >
          <span className="tabular-nums">{count}</span>
          {TYPE_SHORT[type] ?? type}
        </span>
      ))}
    </div>
  );
}
