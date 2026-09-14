import { memo } from 'react';
import { attIcons, AttIconName } from './att-icons';

interface AttIconProps {
  name: AttIconName;
  className?: string;
}

function AttIconComponent({ name, className = 'h-5 w-5' }: AttIconProps) {
  const icon = attIcons[name];
  if (!icon) return null;

  const sw = icon.strokeWidth ?? 4;
  const fillValue = icon.fill ?? 'currentColor';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      fill={fillValue}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} fillRule="evenodd" clipRule="evenodd" d={d} />
      ))}
      {icon.rects?.map((r, i) => (
        <rect key={`r${i}`} x={r.x} y={r.y} width={r.width} height={r.height} />
      ))}
    </svg>
  );
}

AttIconComponent.displayName = 'AttIcon';

export const AttIcon = memo(AttIconComponent);
export type { AttIconName };
