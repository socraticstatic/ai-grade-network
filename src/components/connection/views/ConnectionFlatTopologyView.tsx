// src/components/connection/views/ConnectionFlatTopologyView.tsx
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { MiniTopology } from '../MiniTopology';
import { OverflowMenu } from '../../common/OverflowMenu';
import { ExternalLink, Trash2, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { displayStatus } from '../../../utils/lmccDisplay';
import { isC2C } from '../../../utils/connectionLegs';
import type { Connection } from '../../../types';

interface ConnectionFlatTopologyViewProps {
  connections: Connection[];
}

export function ConnectionFlatTopologyView({ connections }: ConnectionFlatTopologyViewProps) {
  const navigate = useNavigate();
  const removeConnection = useStore(state => state.removeConnection);
  const [pendingDelete, setPendingDelete] = useState<Connection | null>(null);

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    removeConnection(pendingDelete.id.toString());
    window.addToast({ type: 'success', title: 'Connection deleted', message: `${pendingDelete.name} has been removed.`, duration: 3000 });
    setPendingDelete(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {connections.map(connection => {
          const s = connection.status;
          const isAws = connection.provider === 'AWS' && !isC2C(connection);
          const isLmcc = connection.configuration?.isLmcc === true;
          const isPending = s === 'Provisioning' || s === 'Pending';
          const isActive = isAws ? !isPending && s !== 'Deleting' && s !== 'Deleted' : s === 'Active';
          const statusLabel = isLmcc ? displayStatus(connection)
            : isActive ? 'Active' : isPending ? 'Pending' : 'Inactive';

          return (
            <div
              key={connection.id}
              className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-fw-secondary flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-fw-success' : isPending ? 'bg-fw-active animate-pulse' : 'bg-fw-neutral'}`} />
                  <div className="min-w-0">
                    <h3 className="text-figma-sm font-semibold text-fw-heading truncate">{connection.name}</h3>
                    <p className="text-figma-xs text-fw-bodyLight truncate">
                      {connection.provider ? `${connection.provider} · ` : ''}{connection.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-figma-xs font-medium ${
                    isActive  ? 'bg-fw-successLight text-fw-success' :
                    isPending ? 'bg-brand-lightBlue text-fw-link' :
                                'bg-fw-secondary text-fw-disabled'
                  }`}>
                    {statusLabel}
                  </span>
                  <div onClick={e => e.stopPropagation()}>
                    <OverflowMenu
                      items={[
                        {
                          id: 'details',
                          label: 'Connection Details',
                          icon: <ExternalLink className="h-4 w-4" />,
                          onClick: () => navigate(`/connections/${connection.id}`),
                        },
                        {
                          id: 'delete',
                          label: 'Delete',
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => setPendingDelete(connection),
                          variant: 'danger',
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Topology diagram */}
              <div className="px-5 pt-3 pb-1">
                <MiniTopology
                  connection={connection}
                  onNodeClick={(node) => {
                    if (node.icon === 'hub' && connection.hubIds?.[0]) {
                      navigate(`/hubs/${connection.hubIds[0]}`);
                    } else {
                      navigate(`/connections/${connection.id}`);
                    }
                  }}
                />
              </div>

              {/* Footer */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-fw-secondary mt-1">
                <div className="flex items-center gap-4 text-figma-xs text-fw-bodyLight">
                  <span>
                    <span className="font-medium text-fw-heading">{connection.bandwidth}</span>
                  </span>
                  <span>
                    <span className="font-medium text-fw-heading">{connection.location}</span>
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/connections/${connection.id}`)}
                  className="flex items-center gap-1 text-figma-xs text-fw-link hover:text-fw-linkHover transition-colors"
                >
                  View connection
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-fw-base rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-connection-flat-title"
          >
            <div className="px-6 pt-6 pb-5 flex items-start gap-4">
              <div className="shrink-0 h-11 w-11 rounded-full bg-fw-errorLight flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-fw-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="delete-connection-flat-title" className="text-figma-lg font-bold text-fw-heading tracking-[-0.02em] leading-tight">
                  Delete this connection?
                </h2>
                <p className="text-figma-sm text-fw-body mt-2 leading-relaxed">
                  <span className="font-semibold text-fw-heading">{pendingDelete.name}</span> will be permanently removed.
                </p>
              </div>
              <button onClick={() => setPendingDelete(null)} aria-label="Dismiss" className="shrink-0 p-1.5 -mt-1 -mr-1 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 bg-fw-wash border-t border-fw-secondary flex items-center justify-end gap-3">
              <button onClick={() => setPendingDelete(null)} className="h-9 px-4 rounded-full border border-fw-secondary bg-fw-base text-figma-sm font-semibold text-fw-body hover:border-fw-bodyLight hover:text-fw-heading transition-colors">Cancel</button>
              <button onClick={handleConfirmDelete} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-fw-error text-white text-figma-sm font-semibold hover:brightness-90 transition-all">
                <Trash2 className="h-3.5 w-3.5" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
