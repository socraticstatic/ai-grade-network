import { layoutSegments, type Segment } from './gauge';

/**
 * A total broken into the parts that sum to it.
 *
 * Where a ring answers "how much of the whole", this answers "made of
 * what" - the money split between attaching and steering, an estate split
 * across site classes, a day's tokens split governed vs not. One bar, one
 * legend, no axis: the parts are the argument.
 *
 * Segments render in the order given (the caller's ranking is meaningful),
 * and a zero-value part is dropped rather than drawn as an invisible
 * sliver that the legend then claims exists.
 */
export function SplitBar({
  segments,
  height = 10,
}: {
  segments: (Segment & { label: string; hex: string })[];
  height?: number;
}) {
  const laid = layoutSegments(segments);
  if (laid.length === 0) return null;
  const byKey = new Map(segments.map(s => [s.key, s]));

  return (
    <div>
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ height }}
        role="img"
        aria-label={segments.map(s => `${s.label}: ${s.value}`).join(', ')}
      >
        {laid.map(s => (
          <span
            key={s.key}
            title={`${byKey.get(s.key)?.label}`}
            style={{ width: `${s.widthPct}%`, background: byKey.get(s.key)?.hex }}
            className="block h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {laid.map(s => {
          const seg = byKey.get(s.key)!;
          return (
            <li key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-fw-bodyLight">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seg.hex }} aria-hidden="true" />
              {seg.label}
              <span className="font-semibold tabular-nums text-fw-body">{Math.round(s.share * 100)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
