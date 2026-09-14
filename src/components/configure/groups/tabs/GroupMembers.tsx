import { useState, useCallback, useMemo } from 'react';
import { UserPlus, Trash2, ShieldCheck, Edit2, Search } from 'lucide-react';
import { UserIcon } from '../../../common/UserIcon';
import { Group } from '../../../../types/group';
import { User as UserType } from '../../../../types';
import { BaseTable } from '../../../common/BaseTable';
import { Button } from '../../../common/Button';
import { SearchFilterBar } from '../../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../../common/TableFilterPanel';
import { OverflowMenu } from '../../../common/OverflowMenu';
import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { useStore } from '../../../../store/useStore';

const MEMBER_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'role',
    label: 'Role',
    type: 'toggle',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'editor', label: 'Editor' },
      { value: 'viewer', label: 'Viewer' },
      { value: 'operator', label: 'Operator' },
      { value: 'auditor', label: 'Auditor' },
    ],
  },
];

interface GroupMembersProps {
  group: Group;
  users: UserType[];
  allUsers: UserType[];
}

export function GroupMembers({ group, users, allUsers }: GroupMembersProps) {
  const removeUserFromGroup = useStore(state => state.removeUserFromGroup);
  const addUserToGroup = useStore(state => state.addUserToGroup);

  const [searchQuery, setSearchQuery] = useState('');
  const [userToRemove, setUserToRemove] = useState<string | null>(null);

  const { filters: memberFilters, setFilters: setMemberFilters, isOpen: memberFilterOpen, toggle: toggleMemberFilter, activeCount: memberFilterCount } = useTableFilters({
    groups: MEMBER_FILTER_GROUPS,
  });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [sortField, setSortField] = useState<keyof UserType>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((field: keyof UserType) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const filteredUsers = useMemo(() => {
    const roleFilters = memberFilters.role || [];
    return users
      .filter(user => {
        if (roleFilters.length > 0 && !roleFilters.includes(user.role.toLowerCase())) return false;
        if (!searchQuery) return true;
        return (
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.role.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => {
        const aVal = String(a[sortField]);
        const bVal = String(b[sortField]);
        return aVal.localeCompare(bVal) * (sortDirection === 'asc' ? 1 : -1);
      });
  }, [users, searchQuery, memberFilters, sortField, sortDirection]);

  const availableUsers = allUsers.filter(user => !group.userIds.includes(user.id));

  const handleRemoveUser = async () => {
    if (userToRemove) {
      try {
        await removeUserFromGroup(group.id, userToRemove);
        setUserToRemove(null);
      } catch (error) {
        console.error('Error removing user from group:', error);
      }
    }
  };

  const handleAddUser = async (userId: string) => {
    try {
      await addUserToGroup(group.id, userId);
      setShowAddUserModal(false);
    } catch (error) {
      console.error('Error adding user to group:', error);
    }
  };

  const columns = [
    {
      id: 'user',
      label: 'User',
      sortable: true,
      sortKey: 'name' as keyof UserType,
      width: '45%',
      render: (user: UserType) => (
        <div className="flex items-center max-w-xs">
          <div className="flex-shrink-0 h-10 w-10">
            {user.avatar ? (
              <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user.name} />
            ) : (
              <div className="h-10 w-10 rounded-full bg-fw-blue-light flex items-center justify-center border border-fw-secondary">
                <UserIcon size="md" variant="primary" />
              </div>
            )}
          </div>
          <div className="ml-4 max-w-[calc(100%-44px)]">
            <div className="text-[14px] font-medium text-fw-heading truncate">{user.name}</div>
            <div className="text-[14px] text-fw-bodyLight truncate">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      id: 'role',
      label: 'User Role',
      sortable: true,
      sortKey: 'role' as keyof UserType,
      width: '35%',
      render: (user: UserType) => (
        <div className="text-fw-bodyLight truncate max-w-[120px]">{user.role}</div>
      )
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status' as keyof UserType,
      width: '20%',
      render: (user: UserType) => (
        <span className={`px-2.5 py-0.5 inline-flex text-[12px] font-medium rounded-full ${
          user.status === 'active'
            ? 'bg-fw-successLight text-fw-success'
            : 'bg-fw-neutral text-fw-body'
        }`}>
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <BaseTable<UserType>
        tableId="group-members"
        columns={columns}
        data={filteredUsers}
        keyField="id"
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        showColumnManager={true}
        toolbar={
          <SearchFilterBar
            searchPlaceholder="Search members..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggleMemberFilter}
            activeFilterCount={memberFilterCount}
            isFilterOpen={memberFilterOpen}
            filterPanel={
              <TableFilterPanel
                groups={MEMBER_FILTER_GROUPS}
                activeFilters={memberFilters}
                onFiltersChange={setMemberFilters}
                isOpen={memberFilterOpen}
                onToggle={toggleMemberFilter}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => {
              window.addToast({ type: 'success', title: 'Exported', message: 'Members exported', duration: 3000 });
            }}
            actions={
              <Button variant="primary" icon={UserPlus} onClick={() => setShowAddUserModal(true)}>
                Add User
              </Button>
            }
          />
        }
        actions={(user) => (
          <OverflowMenu
            items={[
              {
                id: 'edit',
                label: 'Edit Permissions',
                icon: <Edit2 className="h-4 w-4" />,
                onClick: () => {
                  window.addToast({ type: 'info', title: 'Edit Permissions', message: 'Permissions management coming soon', duration: 3000 });
                }
              },
              {
                id: 'make-admin',
                label: 'Make Admin',
                icon: <ShieldCheck className="h-4 w-4" />,
                onClick: () => {
                  window.addToast({ type: 'info', title: 'Make Admin', message: 'Admin promotion coming soon', duration: 3000 });
                }
              },
              {
                id: 'remove',
                label: 'Remove from Pool',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => setUserToRemove(user.id),
                variant: 'danger'
              }
            ]}
          />
        )}
        emptyState={
          <div className="text-center py-12">
            <UserIcon size="xl" variant="muted" className="mx-auto mb-4" />
            <p className="text-fw-bodyLight">No members found in this pool</p>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={handleRemoveUser}
        title="Remove User"
        message="Are you sure you want to remove this user from the pool? They will lose all pool-related permissions."
        confirmText="Remove"
        confirmVariant="danger"
      />

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-fw-neutral bg-opacity-75" onClick={() => setShowAddUserModal(false)} />
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-fw-base rounded-xl shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 bg-fw-base sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-fw-accent rounded-full sm:mx-0 sm:h-10 sm:w-10">
                    <UserPlus className="w-6 h-6 text-fw-link" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-fw-heading">Add User to Pool</h3>
                    <p className="mt-2 text-[14px] text-fw-bodyLight">
                      Select a user to add. They will receive read access to pool resources.
                    </p>
                  </div>
                </div>
                <div className="relative mt-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 h-9 border border-fw-secondary rounded-lg text-[14px] focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  />
                </div>
                <div className="mt-4 max-h-60 overflow-y-auto">
                  {availableUsers.length > 0 ? (
                    <ul className="divide-y divide-fw-secondary">
                      {availableUsers.map(user => (
                        <li key={user.id} className="py-3 flex items-center hover:bg-fw-wash px-2 rounded-lg">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.avatar ? (
                              <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-fw-neutral flex items-center justify-center">
                                <UserIcon size="md" variant="muted" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-[14px] font-medium text-fw-heading">{user.name}</div>
                            <div className="text-[14px] text-fw-bodyLight">{user.email}</div>
                          </div>
                          <button
                            onClick={() => handleAddUser(user.id)}
                            className="ml-2 inline-flex items-center px-3 py-1 border border-transparent text-[14px] font-medium rounded-full text-white bg-fw-cobalt-600 hover:bg-fw-cobalt-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fw-active"
                          >
                            Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-[14px] text-fw-bodyLight">No available users to add</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 bg-fw-wash sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex justify-center w-full px-4 py-2 text-[14px] font-medium text-white bg-fw-cobalt-600 border border-transparent rounded-full hover:bg-fw-cobalt-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fw-active sm:ml-3 sm:w-auto"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
