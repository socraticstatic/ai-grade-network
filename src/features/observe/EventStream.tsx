import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl } from '../../engine/react/useCloudControl';

interface TelemetryEvent {
  label: string;
  posture: number;
}

function postureBadgeClass(score: number): string {
  if (score >= 80) return 'bg-fw-successLight text-fw-success';
  // Mid posture → neutral slate attention, no warm tone.
  if (score >= 60) return 'bg-fw-wash text-fw-bodyLight border border-fw-secondary';
  return 'bg-fw-errorLight text-fw-error';
}

export function EventStream() {
  const events = useCloudControl(cc => cc.telemetry(56).events) as TelemetryEvent[];

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <AttIcon name="high-meter" className="h-5 w-5 text-fw-body" />
        <span className="font-medium text-fw-heading">Event stream</span>
        <span className="text-figma-xs text-fw-bodyLight">{events.length} events this session</span>
      </div>

      {events.length === 0 ? (
        <p className="px-5 py-6 text-figma-sm text-fw-bodyLight">
          No onramp or fix events yet — attach a circuit or apply a fix on Connect / Govern to populate the feed.
        </p>
      ) : (
        <ul className="divide-y divide-fw-secondary">
          {events.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="text-figma-sm text-fw-body">{e.label}</span>
              <span
                className={`shrink-0 inline-flex items-center h-5 px-2 rounded-full text-figma-xs font-medium tabular-nums ${postureBadgeClass(e.posture)}`}
              >
                posture {e.posture}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
