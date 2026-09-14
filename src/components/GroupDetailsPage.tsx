import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, User, Network, CreditCard, Activity, Edit2, Trash2, Tag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SubNav } from './navigation/SubNav';
import { ConfirmDialog } from './common/ConfirmDialog';
import { Button } from './common/Button';
import { IconButton } from './common/IconButton';
import { useEditableField } from '../hooks/useEditableField';
import { GroupOverview } from './configure/groups/tabs/GroupOverview';
import { GroupMembers } from './configure/groups/tabs/GroupMembers';
import { GroupConnections } from './configure/groups/tabs/GroupConnections';
import { GroupBilling } from './configure/groups/tabs/GroupBilling';
import { GroupPerformance } from './configure/groups/tabs/GroupPerformance';
import { GroupSettings } from './configure/groups/tabs/GroupSettings';

type GroupTabType = 'overview' | 'members' | 'connections' | 'billing' | 'performance' | 'settings';

const tabs: { id: GroupTabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'connections', label: 'Connections' },
  { id: 'billing', label: 'Billing' },
  { id: 'performance', label: 'Performance' },
  { id: 'settings', label: 'Settings' }
];

export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groups = useStore(state => state.groups);
  const users = useStore(state => state.users);
  const connections = useStore(state => state.connections);
  const removeGroup = useStore(state => state.removeGroup);
  const updateGroup = useStore(state => state.updateGroup);

  const [activeTab, setActiveTab] = useState<GroupTabType>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const group = groups.find(g => g.id === id);

  const {
    isEditing: isEditingName,
    value: newName,
    error: nameError,
    setValue: setNewName,
    handleStartEdit: startEditingName,
    handleSave: handleSaveName,
    handleCancel: handleCancelEdit
  } = useEditableField({
    initialValue: group?.name || '',
    onSave: (name) => {
      if (group) {
        updateGroup(group.id, { name });
        window.addToast({
          type: 'success',
          title: 'Name Updated',
          message: 'Pool name has been updated successfully.',
          duration: 3000
        });
      }
    },
    validate: (name) => {
      if (!name.trim()) return 'Pool name cannot be empty';
    }
  });

  const groupConnections = connections.filter(conn =>
    group?.connectionIds.includes(conn.id)
  );

  const groupUsers = users.filter(user =>
    group?.userIds.includes(user.id)
  );

  useEffect(() => {
    if (!group && id) {
      navigate('/groups');

      window.addToast({
        type: 'error',
        title: 'Pool Not Found',
        message: 'The requested pool could not be found.',
        duration: 3000
      });
    }
  }, [group, id, navigate]);

  if (!group) {
    return null;
  }

  const handleDeleteGroup = async () => {
    try {
      await removeGroup(group.id);
      navigate('/groups');
    } catch (error) {
      console.error('Failed to delete pool:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <GroupOverview group={group} connections={groupConnections} users={groupUsers} />;
      case 'members':
        return <GroupMembers group={group} users={groupUsers} allUsers={users} />;
      case 'connections':
        return <GroupConnections group={group} connections={groupConnections} allConnections={connections} />;
      case 'billing':
        return <GroupBilling group={group} connections={groupConnections} />;
      case 'performance':
        return <GroupPerformance group={group} connections={groupConnections} />;
      case 'settings':
        return <GroupSettings group={group} />;
      default:
        return <GroupOverview group={group} connections={groupConnections} users={groupUsers} />;
    }
  };

  return (
    <div className="min-h-screen">
      <SubNav
        title={
          isEditingName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`px-3 h-9 text-figma-xl font-bold bg-fw-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active ${
                  nameError ? 'border-fw-error' : 'border-fw-secondary'
                }`}
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <IconButton
                  icon={<Edit2 className="h-5 w-5" />}
                  onClick={handleSaveName}
                  variant="success"
                  title="Save"
                />
                <IconButton
                  icon={<Trash2 className="h-5 w-5" />}
                  onClick={handleCancelEdit}
                  variant="danger"
                  title="Cancel"
                />
              </div>
              {nameError && (
                <span className="text-figma-base text-fw-error">{nameError}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>{group.name}</span>
              <IconButton
                icon={<Edit2 className="h-5 w-5" />}
                onClick={startEditingName}
                variant="ghost"
                title="Edit Name"
              />
            </div>
          )
        }
        description={`${group.type.charAt(0).toUpperCase() + group.type.slice(1)} Pool - ${group.description}`}
        action={{
          label: 'Back to Pools',
          icon: <ArrowLeft className="h-5 w-5 mr-2" />,
          onClick: () => navigate('/groups')
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          {/* Status Card */}
          <div className="bg-fw-base p-6 rounded-2xl border border-fw-secondary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Status</h3>
              <Activity className="h-5 w-5 text-fw-bodyLight" />
            </div>
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${
                group.status === 'active' ? 'bg-fw-success' : 'bg-fw-neutral'
              }`} />
              <span className="ml-2 text-figma-lg font-medium text-fw-heading capitalize">
                {group.status}
              </span>
            </div>
          </div>

          {/* Type Card */}
          <div className="bg-fw-base p-6 rounded-2xl border border-fw-secondary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Type</h3>
              <Tag className="h-5 w-5 text-fw-bodyLight" />
            </div>
            <p className="text-figma-lg font-medium text-fw-heading capitalize">{group.type}</p>
          </div>

          {/* Members Card */}
          <div className="bg-fw-base p-6 rounded-2xl border border-fw-secondary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Members</h3>
              <User className="h-5 w-5 text-fw-bodyLight" />
            </div>
            <p className="text-figma-lg font-medium text-fw-heading">
              {group.userIds.length} {group.userIds.length === 1 ? 'User' : 'Users'}
            </p>
          </div>

          {/* Connections Card */}
          <div className="bg-fw-base p-6 rounded-2xl border border-fw-secondary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Connections</h3>
              <Network className="h-5 w-5 text-fw-bodyLight" />
            </div>
            <p className="text-figma-lg font-medium text-fw-heading">
              {group.connectionIds.length} Active
            </p>
          </div>

          {/* Monthly Cost Card */}
          <div className="bg-fw-base p-6 rounded-2xl border border-fw-secondary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Monthly Cost</h3>
              <CreditCard className="h-5 w-5 text-fw-bodyLight" />
            </div>
            <p className="text-figma-lg font-medium text-fw-heading">
              ${group.billing?.monthlyRate?.toFixed(0) || '0'}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Status Badge */}
            <Button
              variant={group.status === 'active' ? 'primary' : 'outline'}
              className={group.status === 'active' ? 'bg-fw-success hover:bg-fw-success/90' : ''}
            >
              {group.status === 'active' ? 'Active' : 'Inactive'}
            </Button>

            {/* Delete Button */}
            <Button
              variant="outline-danger"
              icon={Trash2}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>

          <Button
            variant={isEditing ? 'primary' : 'outline'}
            icon={Edit2}
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? 'bg-fw-success hover:bg-fw-success/90' : ''}
          >
            {isEditing ? 'Save Changes' : 'Manage Settings'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-fw-secondary">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-figma-base no-rounded
                    transition-colors duration-200
                    ${activeTab === tab.id
                      ? 'border-fw-active text-fw-link'
                      : 'border-transparent text-fw-bodyLight hover:text-fw-body hover:border-fw-secondary'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-fw-base rounded-2xl shadow-sm">
          {renderContent()}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteGroup}
        title="Delete Pool"
        message={`Are you sure you want to delete the pool "${group.name}"? This will remove all associations but won't delete the actual users or connections.`}
        icon={<Trash2 className="w-6 h-6 text-fw-error" />}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
