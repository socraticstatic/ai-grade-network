import { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { useNavigate } from 'react-router-dom';
import { Group } from '../../../types/group';
import { TypeBadge } from '../../common/Badge';

interface GroupCardHeaderProps {
  group: Group;
  onDelete?: (id: string) => void;
  children?: ReactNode;
}

const typeLabels: Record<Group['type'], string> = {
  business: 'Enterprise',
  department: 'Department',
  project: 'Project',
  team: 'Team',
  custom: 'Custom',
};

export function GroupCardHeader({ group, onDelete, children }: GroupCardHeaderProps) {
  const navigate = useNavigate();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/groups/${group.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(group.id);
  };

  return (
    <div className="px-6 pt-4 pb-3 group/header">
      {/* Top row: type badge + status dot + action icons */}
      <div className="flex items-center justify-between mb-2">
        <TypeBadge type={group.type} label={typeLabels[group.type] || group.type} />

        <div className="flex items-center gap-1.5">
          {/* Edit / Delete - visible on hover */}
          <button
            onClick={handleEdit}
            className="flex items-center justify-center w-6 h-6 rounded-full text-fw-bodyLight hover:text-fw-link hover:bg-fw-wash transition-colors opacity-0 group-hover/header:opacity-100"
            aria-label="Edit pool"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center w-6 h-6 rounded-full text-fw-bodyLight hover:text-fw-error hover:bg-fw-errorLight transition-colors opacity-0 group-hover/header:opacity-100"
            aria-label="Delete pool"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          {/* Status dot */}
          <span
            className={`ml-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
              group.status === 'active' ? 'bg-fw-success' : 'bg-fw-secondary'
            }`}
            title={group.status === 'active' ? 'Active' : 'Inactive'}
          />
        </div>
      </div>

      {/* Name row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 flex items-center justify-center bg-fw-wash rounded-lg flex-shrink-0">
            <AttIcon name="person-group" className="h-5 w-5 text-fw-link" />
          </div>
          <div className="min-w-0">
            <h3 className="text-figma-lg font-medium text-fw-heading truncate">
              {group.name}
            </h3>
            <p className="text-figma-sm font-medium text-fw-body truncate max-w-[180px]">{group.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>
  );
}