import { Edit2, Trash2, Download } from 'lucide-react';
import { Group } from '../../types/group';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

interface GroupDetailHeaderProps {
  group: Group;
  onDeleteClick: () => void;
}

export function GroupDetailHeader({ group, onDeleteClick }: GroupDetailHeaderProps) {
  // Get group type color
  const getGroupTypeColor = () => {
    switch (group.type) {
      case 'business':
        return 'bg-fw-accent text-fw-linkHover';
      case 'department':
        return 'bg-fw-purple/10 text-fw-purple';
      case 'project':
        return 'bg-fw-successLight text-fw-success';
      case 'team':
        return 'bg-fw-warnLight text-fw-warn';
      default:
        return 'bg-fw-neutral text-fw-heading';
    }
  };

  const getHeaderGradient = () => {
    switch (group.type) {
      case 'business':
        return 'from-fw-primary to-fw-primary';
      case 'department':
        return 'from-fw-purple to-fw-purple';
      case 'project':
        return 'from-fw-success to-fw-success';
      case 'team':
        return 'from-fw-warn to-fw-warn';
      default:
        return 'from-fw-secondary to-fw-secondary';
    }
  };

  return (
    <div className="bg-fw-base rounded-2xl shadow-sm border border-fw-secondary mb-8 overflow-hidden">
      <div className={`h-3 bg-gradient-to-r ${getHeaderGradient()}`}></div>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 text-figma-sm font-medium rounded-full capitalize ${getGroupTypeColor()}`}>
                {group.type}
              </span>
              <StatusBadge status={group.status} size="md" />
            </div>
            <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em] mb-2">{group.name}</h2>
            <p className="text-figma-base font-medium text-fw-body">{group.description}</p>
            
            <div className="mt-4 flex flex-wrap gap-3">
              {group.tags && Object.entries(group.tags).map(([key, value]) => (
                <div key={key} className="inline-flex items-center px-3 py-1 rounded-full text-figma-base bg-fw-neutral text-fw-body">
                  <span className="font-medium">{key}:</span>
                  <span className="ml-1">{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              icon={Edit2}
              onClick={() => window.addToast?.({ type: 'info', title: 'Edit Pool', message: 'Pool editing is available in the full product.', duration: 3000 })}
            >
              Edit Pool
            </Button>

            <Button
              variant="outline-danger"
              icon={Trash2}
              onClick={onDeleteClick}
            >
              Delete
            </Button>
            
            <Button
              variant="outline"
              icon={Download}
              onClick={() => {
                window.addToast({
                  type: 'success',
                  title: 'Export Complete',
                  message: 'Pool details exported successfully',
                  duration: 3000
                });
              }}
            >
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}