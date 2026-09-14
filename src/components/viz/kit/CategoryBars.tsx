/** Horizontal category bars in the kit idiom: label + count on the left,
 *  a single-hue bar scaled to the max on the right. Deterministic divs -
 *  no chart library, no animation. */
export function CategoryBars({
  items,
  ariaLabel,
}: {
  items: { label: string; value: number; color: string }[];
  ariaLabel: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <ul aria-label={ariaLabel} className="space-y-2">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-figma-xs text-fw-body tabular-nums">{`${i.label} · ${i.value}`}</span>
          <span className="relative h-3 flex-1 overflow-hidden rounded bg-fw-wash">
            <span
              data-testid={`category-bar-${i.label}`}
              className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${(i.value / max) * 100}%`, background: i.color }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
