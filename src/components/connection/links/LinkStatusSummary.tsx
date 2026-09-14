import { Activity } from 'lucide-react';
import { VLAN } from '../modals/VLANModal';

interface LinkStatusSummaryProps {
  links: VLAN[];
}

export function LinkStatusSummary({ links }: LinkStatusSummaryProps) {
  const activeCount = links.filter(v => v.status === 'active').length;
  const inactiveCount = links.filter(v => v.status === 'inactive').length;
  
  return (
    <div className="p-4 bg-fw-wash border border-fw-secondary rounded-lg">
      <div className="flex items-start space-x-2">
        <Activity className="h-5 w-5 text-fw-warn mt-0.5" />
        <div>
          <p className="text-figma-base text-fw-body">
            <span className="font-medium">Link Status:</span> {activeCount} active, {inactiveCount} inactive
          </p>
          <p className="text-figma-sm text-fw-bodyLight mt-1">
            Virtual Links are logical network segments that allow devices to communicate as if they were on the same physical network, even when they are on different physical segments.
          </p>
        </div>
      </div>
    </div>
  );
}