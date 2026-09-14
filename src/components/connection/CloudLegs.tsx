import type { Connection } from '../../types/connection';
import { getConnectionLegs, isC2C } from '../../utils/connectionLegs';
import { ProviderLogo } from './ProviderLogo';

interface CloudLegsProps {
  connection: Connection;
  className?: string;
  /** When provided, each leg renders as a button that drills into that leg. */
  onLegClick?: (legIndex: number) => void;
  /** Show the provider brand logo before each provider name. */
  withLogos?: boolean;
  /** Logo size in px (when withLogos). */
  logoSize?: number;
}

/**
 * Renders the cloud destination(s) of a connection as plain text. A single-cloud
 * connection shows one provider; a C2C connection shows each leg joined by a dot.
 * The Hub hub that links them is implied by the surrounding topology.
 */
export function CloudLegs({ connection, className = '', onLegClick, withLogos = false, logoSize = 16 }: CloudLegsProps) {
  const legs = getConnectionLegs(connection);

  if (legs.length === 0) {
    return <span className={`text-figma-sm text-fw-heading ${className}`}>—</span>;
  }

  if (legs.length === 1 && !isC2C(connection)) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-figma-sm text-fw-heading ${className}`}>
        {withLogos && <ProviderLogo provider={legs[0].provider} size={logoSize} />}
        {legs[0].provider}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 ${className}`}>
      {legs.map((leg, i) => (
        <span key={`${leg.provider}-${i}`} className="inline-flex items-center gap-1">
          {withLogos && <ProviderLogo provider={leg.provider} size={logoSize} />}
          {onLegClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLegClick(i);
              }}
              aria-label={`Open ${leg.provider} leg`}
              className="rounded-md px-1 -mx-1 text-figma-sm font-medium text-fw-link hover:bg-fw-wash focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link transition-colors"
              title={`Open ${leg.provider} leg`}
            >
              {leg.provider}
            </button>
          ) : (
            <span className="text-figma-sm font-medium text-fw-heading">{leg.provider}</span>
          )}
          {i < legs.length - 1 && <span className="text-fw-bodyLight" aria-hidden>·</span>}
        </span>
      ))}
    </span>
  );
}
