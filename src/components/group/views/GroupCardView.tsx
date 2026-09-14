import { Group } from '../../../types/group';
import { GroupCard } from '../GroupCard';

interface GroupCardViewProps {
  groups: Group[];
  onDelete: (id: string) => void;
  isMinimized?: boolean;
}

export function GroupCardView({ groups, onDelete, isMinimized = false }: GroupCardViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {groups.map(group => (
        <GroupCard 
          key={group.id} 
          group={group} 
          onDelete={onDelete}
          isMinimized={isMinimized}
        />
      ))}
    </div>
  );
}