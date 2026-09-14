import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
  ...props
}: SkeletonProps) {
  const roundedMap = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      className={`bg-fw-neutral ${animate ? 'animate-pulse' : ''} ${roundedMap[rounded]} ${className}`}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : '100%',
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : '1rem'
      }}
      {...props}
    />
  );
}

// SkeletonLine - single animated pulsing line
export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-4 rounded bg-fw-wash animate-pulse ${className}`} />
  );
}

// SkeletonCard - card-shaped skeleton with internal lines
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-fw-wash animate-pulse p-6 space-y-4 ${className}`}>
      <div className="h-5 bg-fw-neutral rounded w-2/5" />
      <div className="h-4 bg-fw-neutral rounded w-3/5" />
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-fw-neutral rounded w-full" />
        <div className="h-3 bg-fw-neutral rounded w-4/5" />
        <div className="h-3 bg-fw-neutral rounded w-3/4" />
      </div>
    </div>
  );
}

// SkeletonTable - table skeleton with header + 5 rows
export function SkeletonTable({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-fw-base border border-fw-secondary overflow-hidden ${className}`}>
      {/* Header row */}
      <div className="bg-fw-wash px-6 py-3 flex gap-4 border-b border-fw-secondary animate-pulse">
        {[40, 25, 15, 20].map((w, i) => (
          <div key={i} className="h-4 bg-fw-neutral rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="px-6 py-4 flex gap-4 border-b border-fw-secondary last:border-b-0 animate-pulse">
          {[40, 25, 15, 20].map((w, col) => (
            <div key={col} className="h-4 bg-fw-wash rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}