/** The one visualization palette (Flywheel hex, SVG-attribute form — fill/
 *  stroke cannot reach Tailwind's fw-* classes). Color carries exactly one
 *  meaning app-wide: cobalt = on the AT&T fabric, slate = public internet,
 *  green = resilient/success. Everything else is ink.
 *
 *  Each entry is `var(--viz-…, #hex)`: the fallback is the light hex the app
 *  has always rendered, and html.dark re-points the variable (tokens.css), so
 *  every SVG consumer is theme-aware without a single JS branch. fill/stroke
 *  presentation attributes resolve var() in all supported browsers. */
export const VIZ_HEX = {
  cobalt: 'var(--viz-cobalt, #0057b8)',
  cobaltSoft: 'var(--viz-cobalt-soft, #7aa6d6)',
  green: 'var(--viz-green, #2d7e24)',
  slate: 'var(--viz-slate, #94a3b8)',
  slateInk: 'var(--viz-slate-ink, #475569)',
  slateMuted: 'var(--viz-slate-muted, #64748b)', // SankeyPanel's node-bar gray - lighter than slateInk, kept distinct so extraction changes zero pixels
  ink: 'var(--viz-ink, #1d2329)',
  inkSoft: 'var(--viz-ink-soft, #475569)',
  wash: 'var(--viz-wash, #f8fafb)',
  line: 'var(--viz-line, #dcdfe3)',
  band: 'var(--viz-band, #eef4fb)',
  bandStroke: 'var(--viz-band-stroke, #c7ddf5)',
  skyCursor: 'var(--viz-sky-cursor, #009FDB)',
} as const;
