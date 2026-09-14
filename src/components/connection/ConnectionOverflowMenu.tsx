import { useState } from 'react';
import { Edit2, Trash2, ExternalLink, Download, Play, Pause, Zap, Copy } from 'lucide-react';
import { ModifyBandwidthModal } from './modals/ModifyBandwidthModal';
import { useNavigate } from 'react-router-dom';
import { Connection } from '../../types';
import { OverflowMenu } from '../common/OverflowMenu';
import { useStore } from '../../store/useStore';
import { isConnectionEditable, getConnectionEditRestrictionReason } from '../../utils/connections';
import { isC2C } from '../../utils/connectionLegs';

interface ConnectionOverflowMenuProps {
  connection: Connection;
  onDelete?: () => void;
  hubRef?: React.RefObject<HTMLElement>;
  isActive?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function ConnectionOverflowMenu({
  connection,
  onDelete,
  hubRef,
  isActive,
  onOpenChange
}: ConnectionOverflowMenuProps) {
  const navigate = useNavigate();
  const updateConnection = useStore(state => state.updateConnection);
  const [showBandwidthModal, setShowBandwidthModal] = useState(false);

  const handleToggleStatus = () => {
    const newStatus = connection.status === 'Active' ? 'Inactive' : 'Active';
    updateConnection(connection.id.toString(), { status: newStatus });
    
    window.addToast({
      type: 'success',
      title: 'Status Updated',
      message: `Connection is now ${newStatus}`,
      duration: 3000
    });
  };

  const exportConnectionData = () => {
    const headers = ['Name', 'Type', 'Status', 'Bandwidth', 'Location'];
    const data = [
      connection.name,
      connection.type,
      connection.status,
      connection.bandwidth,
      connection.location
    ];

    if (connection.performance) {
      headers.push('Latency', 'Packet Loss', 'Jitter', 'Uptime');
      data.push(
        connection.performance.latency || '',
        connection.performance.packetLoss || '',
        connection.performance.jitter || '',
        connection.performance.uptime || ''
      );
    }

    const csvContent = [
      headers.join(','),
      data.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `connection_${connection.id}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    window.addToast({
      type: 'success',
      title: 'Export Complete',
      message: 'Connection data has been exported successfully',
      duration: 3000
    });
  };

  const isEditable = isConnectionEditable(connection);
  const editRestrictionReason = getConnectionEditRestrictionReason(connection);

  // AWS Max has no Inactive state, but a Cloud to Cloud does — keep its Deactivate item.
  const isAws = connection.provider === 'AWS' && !isC2C(connection);
  const menuItems = [
    // AWS Max has no Inactive state — Delete is the only way to remove a connection
    ...(isAws ? [] : [{
      id: 'status',
      label: connection.status === 'Active' ? 'Deactivate' : 'Activate',
      icon: connection.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />,
      onClick: handleToggleStatus
    }]),
    {
      id: 'view',
      label: 'View Details',
      icon: <ExternalLink className="h-4 w-4" />,
      onClick: () => navigate(`/connections/${connection.id}`)
    },
    {
      id: 'bandwidth',
      label: 'Modify Bandwidth',
      icon: <Zap className="h-4 w-4" />,
      onClick: () => setShowBandwidthModal(true),
      disabled: connection.status === 'Provisioning',
    },
    {
      id: 'edit',
      label: 'Edit Connection',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: () => navigate(`/connections/${connection.id}/edit`),
      disabled: !isEditable,
      tooltip: editRestrictionReason || undefined
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: <Download className="h-4 w-4" />,
      onClick: exportConnectionData
    },
    {
      id: 'clone',
      label: 'Clone Connection',
      icon: <Copy className="h-4 w-4" />,
      onClick: () => navigate('/create', {
        state: {
          mode: 'step-by-step',
          selectedProviders: connection.provider ? [connection.provider] : [],
          selectedConnectionType: connection.type,
          cloneName: `${connection.name} (Clone)`,
          cloneBandwidth: connection.bandwidth,
        }
      })
    },
    {
      id: 'delete',
      label: 'Delete Connection',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete?.(),
      variant: 'danger' as const,
      disabled: !isEditable,
      tooltip: editRestrictionReason || undefined
    }
  ];

  return (
    <>
      <OverflowMenu
        items={menuItems}
        hubRef={hubRef}
        className="z-30 rounded-full"
        isOpen={isActive}
        onOpenChange={onOpenChange}
      />
      <ModifyBandwidthModal
        connection={connection}
        isOpen={showBandwidthModal}
        onClose={() => setShowBandwidthModal(false)}
      />
    </>
  );
}