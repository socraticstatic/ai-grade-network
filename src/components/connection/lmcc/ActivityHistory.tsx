import { ShieldAlert, History } from 'lucide-react';
import { useStore } from '../../../store/useStore';

/**
 * Durable customer activity history (GA requirement): timestamped lifecycle events
 * with the acting admin. A toast that disappears is not a record.
 */
export function ActivityHistory({ connectionId }: { connectionId: string }) {
  const events = useStore(s => s.activityEvents).filter(
    e => e.connectionId === connectionId || (e.type === 'security' && !e.connectionId)
  );

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <History className="h-4 w-4 text-fw-link" />
        <h3 className="text-figma-base font-bold text-fw-heading">Activity history</h3>
      </div>
      <p className="text-figma-xs text-fw-bodyLight mb-4">
        Every lifecycle event, timestamped, with the admin who acted.
      </p>
      {events.length === 0 ? (
        <p className="text-figma-sm text-fw-bodyLight">
          Lifecycle events will appear here — created, Live, bandwidth changes, deletion.
        </p>
      ) : (
        <ol className="space-y-3">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                e.type === 'security' ? 'bg-fw-error' : 'bg-fw-link'
              }`} />
              <div className="min-w-0">
                <p className="text-figma-sm text-fw-heading leading-snug">
                  {e.type === 'security' && <ShieldAlert className="inline h-3.5 w-3.5 text-fw-error mr-1 -mt-0.5" />}
                  {e.message}
                </p>
                <p className="text-figma-xs text-fw-bodyLight mt-0.5">
                  {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {e.admin}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
