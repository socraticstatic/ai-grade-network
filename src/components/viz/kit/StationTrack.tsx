import { Check } from 'lucide-react';
import { VIZ_HEX } from './palette';

/** Status as a place on the wire: an ordered left-to-right track of
 *  stations. Done = green check, current = pulsing cobalt (detail shown),
 *  upcoming = neutral dot. Ingress→egress axis, same as every kit visual. */
export interface Station {
  key: string;
  label: string;
  detail?: string;
  state: 'done' | 'current' | 'upcoming';
}

export function StationTrack({ stations, ariaLabel }: { stations: Station[]; ariaLabel: string }) {
  return (
    <ol data-testid="station-track" aria-label={ariaLabel} className="flex items-start">
      {stations.map((s, i) => {
        const last = i === stations.length - 1;
        return (
          <li
            key={s.key}
            data-testid={`stage-${s.key}`}
            data-done={String(s.state === 'done')}
            aria-current={s.state === 'current' ? 'step' : undefined}
            className={`flex items-start ${last ? '' : 'flex-1'} min-w-0`}
          >
            <div className="flex flex-col items-center gap-1 shrink-0 w-20">
              {s.state === 'done' ? (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white" style={{ background: VIZ_HEX.green }}>
                  <Check size={12} aria-hidden="true" />
                </span>
              ) : s.state === 'current' ? (
                <span className="relative inline-flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-60" style={{ background: VIZ_HEX.cobalt }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: VIZ_HEX.cobalt }} />
                </span>
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-fw-neutral" />
                </span>
              )}
              <span className={`text-center text-[11px] leading-tight ${s.state === 'upcoming' ? 'text-fw-bodyLight' : 'font-medium text-fw-heading'}`}>
                {s.label}
              </span>
              {s.state === 'current' && s.detail && (
                <span className="text-center text-[10px] leading-tight text-fw-bodyLight">{s.detail}</span>
              )}
            </div>
            {!last && (
              <span
                aria-hidden="true"
                className="mt-2.5 h-0.5 flex-1 rounded"
                style={{ background: s.state === 'done' ? VIZ_HEX.green : VIZ_HEX.line }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
