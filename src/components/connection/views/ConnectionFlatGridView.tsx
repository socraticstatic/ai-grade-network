// src/components/connection/views/ConnectionFlatGridView.tsx
import { ConnectionCardContainer } from '../ConnectionCardContainer';
import type { Connection } from '../../../types';

interface ConnectionFlatGridViewProps {
  connections: Connection[];
  isMinimized?: boolean;
}

export function ConnectionFlatGridView({ connections, isMinimized = false }: ConnectionFlatGridViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {connections.map(c => (
        <ConnectionCardContainer key={c.id} connection={c} isMinimized={isMinimized} />
      ))}
    </div>
  );
}
