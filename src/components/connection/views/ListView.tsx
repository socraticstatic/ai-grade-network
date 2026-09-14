// src/components/connection/views/ListView.tsx
import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { HubListCard } from '../../hub/card/HubListCard';
import type { Hub } from '../../../types/hub';

interface ListViewProps {
  routers: Hub[];
  highlightedConnectionId?: string;
}

/**
 * Connection Hubs — LIST view. Each hub is a header with its connections broken out
 * into per-type grouped sub-tables (the same HubConnectionGroups used on the detail
 * page, Connections tab and pools). Hubs are expanded by default; the chevron collapses
 * an individual hub to just its header.
 */
export function ListView({ routers, highlightedConnectionId }: ListViewProps) {
  const connections = useStore(state => state.connections);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set()); // default: all expanded

  const collapse = (id: string) => setCollapsedIds(prev => new Set([...prev, id]));
  const expand = (id: string) => setCollapsedIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  return (
    <div className="space-y-4">
      {routers.map(router => {
        const routerConnections = connections.filter(c => router.connectionIds.includes(c.id));
        return (
          <HubListCard
            key={router.id}
            router={router}
            connections={routerConnections}
            isMinimized={collapsedIds.has(router.id)}
            onMinimize={() => collapse(router.id)}
            onMaximize={() => expand(router.id)}
            highlightedConnectionId={highlightedConnectionId}
          />
        );
      })}
    </div>
  );
}
