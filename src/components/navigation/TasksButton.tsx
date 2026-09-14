import { useNavigate } from 'react-router-dom';
import { AttIcon } from '../icons/AttIcon';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { workQueue } from '../../features/work/workQueue';

/**
 * The Tasks badge: the queue's live count in the utility cluster, beside
 * the bell. Tasks are state that follows you, not a place - a tab is
 * silent until visited; this tells you the estate wants attention before
 * you click anything. Red when any promise is violated, cobalt otherwise.
 * Clicking opens the /tasks office. Same derivation Andi and the office
 * read (workQueue) - a lens, never a second list.
 */
export function TasksButton() {
  const navigate = useNavigate();
  const { count, violated } = useCloudControl(cc => {
    const rows = workQueue(cc);
    return {
      count: rows.length,
      violated: rows.some(r => r.status === 'violated'),
    };
  });

  return (
    <button
      type="button"
      data-testid="tasks-badge"
      aria-label={`Tasks: ${count} pending${violated ? ', promises violated' : ''}`}
      title="Every task by lifecycle stage, every standing intent"
      onClick={() => navigate('/tasks')}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-fw-body transition-colors hover:bg-fw-wash hover:text-fw-heading"
    >
      <AttIcon name="checklist" className="h-[18px] w-[18px]" />
      {/* A dot, not a number. "10" crammed into a 16px circle beside a
          second badged circle read as clutter, and the exact figure was
          never the point at this size - whether the estate wants attention
          is. The count stays in the accessible name and on /tasks, where
          there is room to say what the tasks actually are. Red only when a
          promise is genuinely violated; otherwise the quiet cobalt. */}
      {count > 0 && (
        <span
          data-testid="tasks-badge-count"
          data-count={count}
          data-violated={violated ? 'true' : 'false'}
          aria-hidden="true"
          className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-fw-base ${
            violated ? 'bg-fw-error' : 'bg-fw-cobalt-600'
          }`}
        />
      )}
    </button>
  );
}
