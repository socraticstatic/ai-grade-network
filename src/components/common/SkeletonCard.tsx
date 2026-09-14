import { Skeleton } from './Skeleton';

interface SkeletonCardProps {
  lines?: number;
  header?: boolean;
  footer?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 3,
  header = true,
  footer = false,
  className = ''
}: SkeletonCardProps) {
  return (
    <div className={`bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden ${className}`}>
      {header && (
        <div className="p-4 border-b border-fw-secondary">
          <Skeleton width="40%" height={24} className="mb-2" />
          <Skeleton width="60%" height={16} />
        </div>
      )}
      
      <div className="p-4">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            width={`${Math.floor(Math.random() * 40) + 60}%`} 
            height={16} 
            className={i < lines - 1 ? 'mb-3' : ''} 
          />
        ))}
      </div>
      
      {footer && (
        <div className="p-4 border-t border-fw-secondary">
          <Skeleton width="30%" height={16} />
        </div>
      )}
    </div>
  );
}