import { ProviderLogo } from './ProviderLogo';

interface ProviderStackProps {
  /** Provider names in display order (deduped internally). */
  providers: string[];
  /** Logo size in px. */
  size?: number;
  /** Max tiles before collapsing into a "+N" token. */
  max?: number;
  className?: string;
}

/**
 * A compact cluster of provider brand marks: the elegant way to show a connection's
 * cloud(s) at a glance. Each cloud sits in its own white, hairline-bordered tile so
 * wordmark logos (AWS, Google, Oracle) stay legible rather than clipping the way an
 * overlapping avatar stack would. One provider renders one tile; a multi-cloud (C2C)
 * connection lines its providers up side by side. Overflow past `max` collapses to "+N".
 */
export function ProviderStack({ providers, size = 24, max = 4, className = '' }: ProviderStackProps) {
  const unique = [...new Set(providers.filter(Boolean))];
  if (unique.length === 0) return null;

  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;
  const tile = size + 8; // breathing room around the mark

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      title={unique.join(' · ')}
      aria-label={`Providers: ${unique.join(', ')}`}
    >
      {shown.map((p) => (
        <span
          key={p}
          className="inline-flex items-center justify-center rounded-md border border-fw-secondary bg-white shadow-sm"
          style={{ width: tile, height: tile }}
        >
          <ProviderLogo provider={p} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-md border border-fw-secondary bg-fw-wash text-fw-body text-[11px] font-semibold"
          style={{ width: tile, height: tile }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
