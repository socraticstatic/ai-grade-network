import { Connection } from '../../../types';
import { VNF } from '../../../types/vnf';
import { Hub } from '../../../types/hub';
import { VNFSection } from '../vnf/VNFSection';

interface VNFTabProps {
  connection: Connection;
  vnfs: VNF[];
  hubs: Hub[];
  onAdd: () => void;
  onEdit: (vnf: VNF) => void;
  onDelete: (vnf: VNF) => void;
}

export function VNFTab({
  connection,
  vnfs,
  hubs,
  onAdd,
  onEdit,
  onDelete
}: VNFTabProps) {
  return (
    <div className="p-6">
      <VNFSection
        vnfs={vnfs}
        hubs={hubs}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        connectionId={connection.id.toString()}
      />
    </div>
  );
}
