import { useState } from 'react';
import { Connection } from '../../../types';
import { VNF } from '../../../types/vnf';
import { Hub } from '../../../types/hub';
import { HubSection } from '../hub/HubSection';

interface NetworkTabProps {
  connection: Connection;
  hubs: Hub[];
  vnfs: VNF[];
  onAddHub: () => void;
  onEditHub: (hub: Hub) => void;
  onDeleteHub: (hub: Hub) => void;
  isEditing?: boolean;
}

export function NetworkTab({
  connection,
  hubs,
  vnfs,
  onAddHub,
  onEditHub,
  onDeleteHub,
  isEditing = false
}: NetworkTabProps) {
  return (
    <div className="p-6">
      <HubSection
        hubs={hubs}
        vnfs={vnfs}
        onAdd={onAddHub}
        onEdit={onEditHub}
        onDelete={onDeleteHub}
        connectionId={connection.id.toString()}
        connection={connection}
      />
    </div>
  );
}
