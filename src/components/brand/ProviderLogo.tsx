import { PATHS, MONO, COLOR, NAME } from './providerMarks';

/**
 * Darken a hex color toward black by `factor` (0..1). Pale brand hues
 * (CoreWeave violet, Nebius teal) as monogram TEXT on the faint brand wash
 * fall well under WCAG AA 4.5:1; the SVG marks are graphics and exempt, but
 * monogram glyphs are text, so darken them to clear contrast while staying
 * on-brand.
 */
function darken(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Official provider brand mark on a rounded tile with a faint brand wash.
 * AWS/Azure/GCP/OCI render the simple-icons path in brand color; CoreWeave
 * and Nebius render their monogram (no official mark in the set). The tile
 * uses `{color}1c` bg + `{color}55` border so marks read on light surfaces.
 *
 *   <ProviderLogo id="aws" size={28} />
 */
export function ProviderLogo({ id, size = 22 }: { id: string; size?: number }) {
  const color = COLOR[id] || '#9aa6bd';
  const label = NAME[id] || id.toUpperCase();
  const path = PATHS[id];

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.max(4, Math.round(size * 0.28)),
        background: `${color}1c`,
        border: `1px solid ${color}55`,
      }}
    >
      {path ? (
        <svg
          viewBox="0 0 24 24"
          width={Math.round(size * 0.68)}
          height={Math.round(size * 0.68)}
          fill={color}
          aria-hidden="true"
        >
          <path d={path} />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          style={{
            fontSize: Math.round(size * 0.42),
            fontWeight: 700,
            color: darken(color, 0.5),
            letterSpacing: '0.3px',
          }}
        >
          {MONO[id] || id.toUpperCase().slice(0, 2)}
        </span>
      )}
    </span>
  );
}
