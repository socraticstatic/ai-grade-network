import { useEffect, useMemo, useState } from 'react';
import { VIZ_HEX } from './palette';

/** Concrete-hex twin of VIZ_HEX, for renderers that PARSE colors instead of
 *  handing them to the DOM. ECharts blends its own opacities and gradients,
 *  so a `var(--viz-…, #hex)` string fails its color parser and comes out
 *  black — the SVG/inline-style consumers that make up the rest of the app
 *  never hit this because the browser resolves the var for them.
 *
 *  Resolution reads the live computed value of each custom property off
 *  <html> (so html.dark is honoured) and falls back to the light hex baked
 *  into the var() string (jsdom, or a var that never loaded). */
export type VizHexResolved = Record<keyof typeof VIZ_HEX, string> & { tooltipBg: string };

const VAR_RE = /^var\((--[\w-]+)\s*,\s*(.+)\)$/;

function resolveOne(value: string, styles: CSSStyleDeclaration | null): string {
  const m = VAR_RE.exec(value);
  if (!m) return value;
  const live = styles?.getPropertyValue(m[1]).trim();
  return live || m[2].trim();
}

function resolveAll(): VizHexResolved {
  const styles =
    typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const out = {} as Record<string, string>;
  for (const [k, v] of Object.entries(VIZ_HEX)) out[k] = resolveOne(v, styles);
  out.tooltipBg = resolveOne('var(--viz-tooltip-bg, #ffffff)', styles);
  return out as VizHexResolved;
}

function readIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/** Theme-aware VIZ_HEX for color-parsing renderers (ECharts). Re-resolves on
 *  the app's `themechange` event (ThemeProvider dispatches it on every mode
 *  or system flip), so charts repaint in place when the toggle moves. */
export function useVizHex(): { viz: VizHexResolved; isDark: boolean } {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const onChange = () => setIsDark(readIsDark());
    window.addEventListener('themechange', onChange);
    return () => window.removeEventListener('themechange', onChange);
  }, []);

  const viz = useMemo(() => resolveAll(), [isDark]);
  return { viz, isDark };
}
