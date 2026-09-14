import { ChevronRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Connection } from '../../../types';

interface ConnectionSummaryRowProps {
  connection: Connection;
}

export function ConnectionSummaryRow({ connection }: ConnectionSummaryRowProps) {
  const navigate = useNavigate();

  const isDeleted = connection.status === 'Deleted';
  const isActive = connection.status === 'Active';
  const isPending = connection.status === 'Pending' || connection.status === 'Provisioning';
  const isLmcc = connection.configuration?.isLmcc;

  return (
    <div
      className="px-4 py-3 flex items-center gap-4 hover:bg-fw-wash transition-colors cursor-pointer border-b border-fw-secondary last:border-0"
      onClick={() => navigate(`/connections/${connection.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/connections/${connection.id}`);
        }
      }}
    >
      {/* Left: name + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-figma-sm font-semibold text-fw-heading truncate">
            {connection.name}
          </span>
          {isLmcc && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 text-fw-link bg-fw-accent">
              <Shield className="h-2.5 w-2.5" />
              {connection.provider === 'AWS' ? 'AWS Max' : 'LMCC'}
            </span>
          )}
        </div>
        <p className="text-figma-xs text-fw-bodyLight truncate">{connection.type}</p>
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-figma-xs font-medium shrink-0 ${
        isDeleted ? 'bg-fw-secondary text-fw-disabled' :
        isActive  ? 'bg-fw-successLight text-fw-success' :
        isPending ? 'bg-brand-lightBlue text-fw-link' :
                    'bg-fw-secondary text-fw-disabled'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          isDeleted ? 'bg-fw-disabled' :
          isActive  ? 'bg-fw-success' :
          isPending ? 'bg-fw-active animate-pulse' :
                      'bg-fw-disabled'
        }`} />
        {isDeleted ? 'Deleted' : isActive ? 'Active' : isPending ? 'Pending' : 'Inactive'}
      </span>

      {/* Bandwidth */}
      <span className="text-figma-xs font-medium text-fw-heading tabular-nums shrink-0 hidden sm:inline">
        {connection.bandwidth}
      </span>

      {/* Latency (hidden if N/A — pending connections) */}
      {connection.performance?.latency && connection.performance.latency !== 'N/A' && (
        <span className="text-figma-xs text-fw-bodyLight tabular-nums shrink-0 hidden md:inline">
          {connection.performance.latency}
        </span>
      )}

      <ChevronRight className="h-3.5 w-3.5 text-fw-disabled shrink-0" />
    </div>
  );
}
