// src/components/configure/users/AuditLog.tsx
import { useState, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { AuditLogEntry } from '../../../types/rbac';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { formatAction, formatTimestamp } from '../../../utils/rbacLabels';

const PAGE_SIZE = 20;

function ResultBadge({ result }: { result: 'ALLOW' | 'DENY' }) {
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-lg ${
      result === 'ALLOW' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-errorLight text-fw-error'
    }`}>
      {result}
    </span>
  );
}

function scopeTierBadgeClass(tier: string): string {
  if (tier === 'tenant') return 'bg-fw-warnLight text-fw-warn border-fw-warn';
  if (tier === 'client') return 'bg-fw-successLight text-fw-success border-fw-success';
  if (tier === 'platform') return 'bg-fw-purpleLight text-fw-purple border-fw-purple';
  return 'bg-fw-neutral text-fw-disabled border-fw-secondary';
}


export function AuditLog() {
  const auditLog = useStore(s => s.auditLog);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'ALLOW' | 'DENY'>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return auditLog.filter(e => {
      const matchesSearch =
        e.principalName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.objectType.toLowerCase().includes(q) ||
        (e.objectName ?? '').toLowerCase().includes(q);
      const matchesResult = resultFilter === 'all' || e.result === resultFilter;
      return matchesSearch && matchesResult;
    });
  }, [auditLog, search, resultFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v: string | undefined) => {
    setSearch(v ?? '');
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchFilterBar
          searchPlaceholder="Search by principal, action, or object..."
          searchValue={search}
          onSearchChange={handleSearch}
        />
        <div className="flex gap-1 ml-4">
          {(['all', 'ALLOW', 'DENY'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setResultFilter(f); setPage(0); }}
              className={`px-3 py-1.5 text-figma-xs font-medium rounded-lg transition-colors ${
                resultFilter === f
                  ? f === 'ALLOW' ? 'bg-fw-successLight text-fw-success'
                  : f === 'DENY' ? 'bg-fw-errorLight text-fw-error'
                  : 'bg-fw-accent text-fw-cobalt-700'
                  : 'text-fw-bodyLight hover:bg-fw-wash'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-10 w-10 text-fw-disabled mx-auto mb-3" />
          <p className="text-figma-sm text-fw-bodyLight">No audit log entries found</p>
        </div>
      ) : (
        <div className="border border-fw-secondary rounded-xl overflow-hidden">
          <table className="w-full text-figma-sm">
            <thead className="bg-fw-wash border-b border-fw-secondary">
              <tr>
                {['Timestamp', 'Principal', 'Action', 'Object', 'Scope', 'Result', 'Note'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[14px] font-medium text-fw-heading whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {paged.map((e: AuditLogEntry) => (
                <tr key={e.id} className="hover:bg-fw-wash transition-colors">
                  <td className="px-4 py-3 text-figma-xs text-fw-bodyLight whitespace-nowrap">
                    {(() => {
                      const { relative, absolute } = formatTimestamp(e.timestamp);
                      return <span title={absolute} className="cursor-help">{relative}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 font-medium text-fw-heading">{e.principalName}</td>
                  <td className="px-4 py-3">
                    <div className="text-fw-body text-figma-xs">{formatAction(e.action)}</div>
                    <div className="text-[10px] text-fw-disabled font-mono mt-0.5">{e.action}</div>
                  </td>
                  <td className="px-4 py-3 text-fw-body">
                    <div className="text-figma-xs font-medium">{e.objectType}</div>
                    {e.objectName && <div className="text-figma-xs text-fw-bodyLight">{e.objectName}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block mb-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded border ${scopeTierBadgeClass(e.scope.tier)}`}>
                      {e.scope.tier}
                    </span>
                    <div className="text-figma-xs text-fw-bodyLight font-mono truncate max-w-[160px]" title={e.scope.raw}>
                      {e.scope.raw}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ResultBadge result={e.result} />
                  </td>
                  <td className="px-4 py-3">
                    {e.result === 'DENY' && e.denyReason && (
                      <span className="text-figma-xs text-fw-error">{e.denyReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-figma-xs text-fw-bodyLight">
            {filtered.length} entries — page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-figma-xs border border-fw-secondary rounded-lg disabled:opacity-40 hover:bg-fw-wash">
              Previous
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-figma-xs border border-fw-secondary rounded-lg disabled:opacity-40 hover:bg-fw-wash">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
