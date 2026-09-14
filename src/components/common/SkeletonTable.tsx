import { Skeleton } from './Skeleton';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = ''
}: SkeletonTableProps) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="bg-fw-wash p-4 border-b border-fw-secondary">
        <Skeleton width="30%" height={24} />
      </div>

      <div className="min-w-full divide-y divide-fw-secondary">
        <div className="bg-fw-wash">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={`header-${i}`} className="px-6 py-3">
                <Skeleton width="80%" height={16} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-fw-base divide-y divide-fw-secondary">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={`row-${rowIndex}`} 
              className="grid" 
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} className="px-6 py-4">
                  <Skeleton 
                    width={`${Math.floor(Math.random() * 40) + 60}%`} 
                    height={16} 
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}