/**
 * Chart color constants — matches fw-* design tokens and Okabe-Ito CVD-safe palette.
 *
 * Rules:
 * - Never pair red + green as opposing series (deuteranopia collapses both)
 * - Categorical series use Okabe-Ito derived hues (Nature Methods endorsed)
 * - Threshold zones use 8% opacity fills — preattentive without overwhelming data
 * - Status dots use AT&T brand colors (not chart series colors)
 */
export const chartColors = {
  // ── Legacy (used by RealTimeChart / RouterMetricsView / etc — do not remove) ──
  primary: '#0057b8',
  primaryLight: 'rgba(0, 87, 184, 0.1)',
  success: '#2d7e24',
  successLight: 'rgba(45, 126, 36, 0.1)',
  error: '#c70032',
  errorLight: 'rgba(199, 0, 50, 0.1)',
  secondary: '#454b52',
  secondaryLight: 'rgba(69, 75, 82, 0.12)',
  info: '#0074b3',
  infoLight: 'rgba(0, 116, 179, 0.1)',
  bodyLight: '#686e74',
  bodyLightAlpha: 'rgba(104, 110, 116, 0.16)',
  heading: '#1d2329',
  neutral: '#f3f4f6',
  wash: '#f8fafb',
  warn: '#d97706',

  // ── Categorical — Okabe-Ito derived, CVD-safe ─────────────────────────────
  // Safe for multi-series. Tested under deuteranopia & protanopia.
  // Never use index 0 (Blue) and index 1 (Vermillion) as a red/green pair — they are distinct.
  categorical: [
    '#0072B2', // Okabe-Ito Blue        — index 0
    '#D55E00', // Okabe-Ito Vermillion  — index 1
    '#CC79A7', // Okabe-Ito Reddish Purple — index 2
    '#009E73', // Okabe-Ito Bluish Green — index 3
    '#E69F00', // Okabe-Ito Orange      — index 4
    '#56B4E9', // Okabe-Ito Sky Blue    — index 5
    '#000000', // Black                  — index 6
  ] as const,

  // ── Named series (4 primary network metrics) ──────────────────────────────
  series: {
    packetLoss: '#D55E00', // Okabe-Ito Vermillion — loss is bad; orange-red, not pure red
    latency:    '#0072B2', // Okabe-Ito Blue — close to AT&T cobalt #0057b8
    jitter:     '#CC79A7', // Okabe-Ito Reddish Purple
    throughput: '#009E73', // Okabe-Ito Bluish Green
  } as const,

  // ── Threshold zones (ReferenceArea fills) ─────────────────────────────────
  // Sequential single-hue, 8% opacity — preattentive without drowning data.
  // Uses Orange + Vermillion from Okabe-Ito: safe under all CVD types.
  threshold: {
    warningFill:    'rgba(230, 159, 0, 0.08)', // Okabe-Ito Orange 8%
    criticalFill:   'rgba(213, 94, 0, 0.08)',  // Okabe-Ito Vermillion 8%
    warnStroke:     '#E69F00',                  // Okabe-Ito Orange
    criticalStroke: '#D55E00',                  // Okabe-Ito Vermillion
  } as const,

  // ── Status dots (AT&T brand — used on KPI cards, not chart series) ─────────
  status: {
    healthy:  '#2d7e24', // AT&T success green
    warning:  '#E69F00', // Okabe-Ito Orange
    critical: '#c70032', // AT&T crimson
    neutral:  '#686e74', // fw-bodyLight
  } as const,
} as const;

export type SeriesKey = keyof typeof chartColors.series;
