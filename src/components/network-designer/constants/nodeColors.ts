export interface NodeColorSet {
  border: string;
  bg: string;
  accent: string;
}

/* Node tint backgrounds are `var(--nd-…, #light)` so the designer canvas
 * follows html.dark (tokens.css); saturated borders/accents read fine on both
 * themes and stay literal. Light fallbacks are the original values. */
const BG = {
  default: 'var(--nd-bg-default, #ffffff)',
  fuchsia: 'var(--nd-bg-fuchsia, #fdf4ff)',
  amber: 'var(--nd-bg-amber, #fffbeb)',
  cyan: 'var(--nd-bg-cyan, #ecfeff)',
  gray: 'var(--nd-bg-gray, #f9fafb)',
  purple: 'var(--nd-bg-purple, #f5f3ff)',
  blue: 'var(--nd-bg-blue, #eff6ff)',
  teal: 'var(--nd-bg-teal, #f0fdfa)',
} as const;

const DEFAULT_COLORS: NodeColorSet = { border: '#9ca3af', bg: BG.default, accent: '#9ca3af' };

const FUNCTION_COLORS: Record<string, NodeColorSet> = {
  router:   { border: '#d946ef', bg: BG.fuchsia, accent: '#d946ef' },
  firewall: { border: '#f59e0b', bg: BG.amber, accent: '#f59e0b' },
  vnf:      { border: '#f59e0b', bg: BG.amber, accent: '#f59e0b' },
  sdwan:    { border: '#06b6d4', bg: BG.cyan, accent: '#06b6d4' },
  flexware: { border: '#6b7280', bg: BG.gray, accent: '#6b7280' },
};

const NETWORK_COLORS: Record<string, NodeColorSet> = {
  ipe:        { border: '#7c3aed', bg: BG.purple, accent: '#7c3aed' },
  avpn:       { border: '#3b82f6', bg: BG.blue, accent: '#3b82f6' },
  ase:        { border: '#06b6d4', bg: BG.cyan, accent: '#06b6d4' },
  adi:        { border: '#14b8a6', bg: BG.teal, accent: '#14b8a6' },
  internet:   { border: '#6b7280', bg: BG.gray, accent: '#6b7280' },
  wavelength: { border: '#8b5cf6', bg: BG.purple, accent: '#8b5cf6' },
};

const DESTINATION_COLORS: NodeColorSet = { border: '#3b82f6', bg: BG.blue, accent: '#3b82f6' };
const DATACENTER_COLORS: NodeColorSet = { border: '#6b7280', bg: BG.gray, accent: '#6b7280' };

export function getNodeColors(type: string, functionType: string): NodeColorSet {
  if (type === 'destination') return DESTINATION_COLORS;
  if (type === 'datacenter') return DATACENTER_COLORS;
  if (type === 'network') return NETWORK_COLORS[functionType] || DEFAULT_COLORS;
  if (type === 'function') return FUNCTION_COLORS[functionType] || DEFAULT_COLORS;
  return DEFAULT_COLORS;
}

export const STATUS_DOT_COLORS: Record<string, string> = {
  'unconfigured': 'var(--nd-dot-unconfigured, #d1d5db)',
  'configured-inactive': 'var(--nd-dot-inactive, #9ca3af)',
  'active': '#22c55e',
  'active-down': '#ef4444',
};
