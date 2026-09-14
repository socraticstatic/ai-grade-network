// src/components/connection/views/GridView.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { HubCard } from '../../hub/card/HubCard';
import type { Hub } from '../../../types/hub';

interface GridViewProps {
  routers: Hub[];
  isMinimized?: boolean;
}

export function GridView({ routers, isMinimized = false }: GridViewProps) {
  const connections = useStore(state => state.connections);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());

  // Sync global minimize-all / expand-all with per-card state
  useEffect(() => {
    if (isMinimized) {
      setMinimizedIds(new Set(routers.map(r => r.id)));
    } else {
      setMinimizedIds(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinimized]); // routers intentionally omitted — stale closure is safe here; IDs only needed on minimize

  const handleMinimize = (id: string) =>
    setMinimizedIds(prev => new Set([...prev, id]));

  const handleMaximize = (id: string) =>
    setMinimizedIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {routers.map(router => {
        const routerConnections = connections.filter(c =>
          router.connectionIds.includes(c.id)
        );
        return (
          <HubCard
            key={router.id}
            router={router}
            connections={routerConnections}
            isMinimized={minimizedIds.has(router.id)}
            onMinimize={() => handleMinimize(router.id)}
            onMaximize={() => handleMaximize(router.id)}
          />
        );
      })}
    </div>
  );
}
