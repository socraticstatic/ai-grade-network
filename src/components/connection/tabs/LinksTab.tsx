import { Connection, Link } from '../../../types';
import { Hub } from '../../../types/hub';
import { LinkSection } from '../links/LinkSection';

interface LinksTabProps {
  connection: Connection;
  hubs: Hub[];
  allLinks: Link[];
  isEditing?: boolean;
}

export function LinksTab({
  connection,
  hubs,
  allLinks,
  isEditing = false
}: LinksTabProps) {
  return (
    <div className="p-6">
      <LinkSection
        connection={connection}
        hubs={hubs}
        allLinks={allLinks}
        isEditing={isEditing}
      />
    </div>
  );
}
