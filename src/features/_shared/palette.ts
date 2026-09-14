/**
 * Shared visual language for the AI-grade network feature views.
 *
 * WHY THIS EXISTS: the six sections were built independently and drifted into
 * ad-hoc color use (loud greens/ambers, a rainbow latency chart with duplicate
 * hues because it colored by cloud). This module centralizes the discipline so
 * it can't drift again:
 *  - Cobalt is the primary accent; gray is structure.
 *  - Semantic colors (green/amber/red) are for SMALL status indicators only,
 *    never large fills or repeated colored body text.
 *  - Charts use one cohesive categorical palette, indexed per SERIES so no two
 *    lines share a hue.
 *
 * SVG/Recharts `stroke`/`fill` props don't resolve Tailwind `*-fw-*` classes
 * (the config extends only text/bg/border), so chart colors are literal hex.
 */

/** Flywheel core tokens for SVG/Recharts. Each is `var(--chart-…, #hex)`:
 * the fallback is the original light hex, html.dark re-points the variable
 * (tokens.css), so charts follow the theme with no JS branching. */
export const FW = {
  cobalt: 'var(--chart-cobalt, #0057b8)', // primary interactive / brand accent
  cobalt300: 'var(--chart-cobalt300, #3374cc)',
  cobaltWash: 'var(--chart-cobalt-wash, #e6f0fa)',
  ink: 'var(--chart-ink, #1d2329)', // heading
  body: 'var(--chart-body, #454b52)',
  muted: 'var(--chart-muted, #686e74)', // secondary text / neutral series
  line: 'var(--chart-line, #dcdfe3)', // borders
  grid: 'var(--chart-grid, #f3f4f6)', // chart gridlines
  wash: 'var(--chart-wash, #f8fafb)', // page/panel wash
  success: 'var(--chart-success, #2d7e24)', // AT&T green — status only
  successWash: 'var(--chart-success-wash, #e9f5e7)',
  warn: 'var(--chart-warn, #475569)', // slate-600 — neutral "attention" text (de-amber), status only
  warnWash: 'var(--chart-warn-wash, #f8fafc)', // slate-50 wash
  danger: 'var(--chart-danger, #b42318)',
} as const;

/**
 * Cohesive categorical palette for multi-series charts. Distinct but harmonized
 * (cool-leaning, one warm accent), colorblind-considerate. Index per series so
 * lines never collide on a hue — do NOT color chart series by cloud/tenant.
 */
export const SERIES = [
  'var(--chart-series-1, #0057b8)', // cobalt
  'var(--chart-series-2, #009e8e)', // teal
  'var(--chart-series-3, #7b61ff)', // violet
  'var(--chart-series-4, #c2426b)', // rose (single warm accent — de-amber)
  'var(--chart-series-5, #2aa0d8)', // sky
  'var(--chart-series-6, #3f8f3a)', // green
  'var(--chart-series-7, #8a5bd6)', // plum
  'var(--chart-series-8, #5b6b7b)', // slate
  'var(--chart-series-9, #0e7490)', // cyan-700
] as const;

/** Deterministic series color by index (wraps if there are more series). */
export function seriesColor(i: number): string {
  return SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length];
}

/**
 * Two-tone pairing for the recurring "private/committed vs public" comparison —
 * cobalt for the AT&T-controlled series, muted gray for public. Keeps that
 * chart on-brand instead of green-vs-orange.
 */
export const COMPARE = {
  controlled: FW.cobalt,
  controlledWash: 'var(--chart-compare-controlled-wash, rgba(0,87,184,0.10))',
  public: FW.muted,
  publicWash: 'var(--chart-compare-public-wash, rgba(104,110,116,0.10))',
} as const;

/** Semantic status → subtle badge/dot classes (Tailwind, resolve fine on
 * text/bg/border). Use the DOT for inline row status; the BADGE for pills. */
export type StatusTone = 'ok' | 'warn' | 'neutral' | 'info';

export const STATUS_DOT: Record<StatusTone, string> = {
  ok: 'bg-[#2d7e24]',
  warn: 'bg-[#94a3b8]', // slate — neutral attention (de-amber)
  neutral: 'bg-[#bdc2c7]',
  info: 'bg-[#0057b8]',
};

export const STATUS_BADGE: Record<StatusTone, string> = {
  ok: 'bg-[#e9f5e7] text-[#2d7e24]',
  warn: 'bg-[#f8fafc] text-[#475569]', // slate — neutral attention (de-amber)
  neutral: 'bg-fw-wash text-fw-bodyLight',
  info: 'bg-[#e6f0fa] text-[#0057b8]',
};
