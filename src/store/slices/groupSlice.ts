import { StateCreator } from 'zustand';
import { Group } from '../../types/group';
import { calculateGroupPerformance, calculateGroupBilling } from '../../utils/groups';

export interface GroupSlice {
  groups: Group[];
  selectedGroupId: string | null;
  addGroup: (group: Group) => Promise<void>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  setSelectedGroup: (id: string | null) => void;
  addConnectionToGroup: (groupId: string, connectionId: string) => Promise<void>;
  removeConnectionFromGroup: (groupId: string, connectionId: string) => Promise<void>;
  addUserToGroup: (groupId: string, userId: string) => Promise<void>;
  removeUserFromGroup: (groupId: string, userId: string) => Promise<void>;
  addAddressToGroup: (groupId: string, address: Group['addresses'][0]) => Promise<void>;
  removeAddressFromGroup: (groupId: string, addressIndex: number) => Promise<void>;
  updateAddressInGroup: (groupId: string, addressIndex: number, updates: Partial<Group['addresses'][0]>) => Promise<void>;
  refreshGroupPerformance: (groupId: string) => Promise<void>;
  refreshGroupBilling: (groupId: string) => Promise<void>;
}

export const createGroupSlice: StateCreator<GroupSlice> = (set, get) => ({
  groups: [],
  selectedGroupId: null,

  addGroup: async (group) => {
    try {
      // Validate group data
      if (!group.name) {
        throw new Error('Group name is required');
      }

      // Check for duplicate names
      const existingGroup = get().groups.find(g => 
        g.name.toLowerCase() === group.name.toLowerCase()
      );
      
      if (existingGroup) {
        throw new Error('A group with this name already exists');
      }

      // Generate a unique ID if not provided
      const newId = group.id || `group-${Date.now()}`;
      
      // Create timestamps
      const now = new Date().toISOString();
      
      const newGroup: Group = {
        ...group,
        id: newId,
        createdAt: now,
        updatedAt: now,
        connectionIds: group.connectionIds || [],
        userIds: group.userIds || [],
        status: group.status || 'active'
      };

      // Add performance and billing if not provided
      if (!newGroup.performance) {
        newGroup.performance = calculateGroupPerformance([], newGroup);
      }

      if (!newGroup.billing) {
        newGroup.billing = calculateGroupBilling([], newGroup);
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({ 
        groups: [newGroup, ...state.groups]
      }));

      window.addToast({
        type: 'success',
        title: 'Group Created',
        message: 'New group has been created successfully.',
        duration: 3000
      });

    } catch (error) {
      console.error('Error adding group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create group',
        duration: 3000
      });
      throw error;
    }
  },

  updateGroup: async (id, updates) => {
    try {
      // If name is being updated, check for uniqueness
      if (updates.name) {
        const existingGroup = get().groups.find(
          g => g.id !== id && g.name.toLowerCase() === updates.name?.toLowerCase()
        );

        if (existingGroup) {
          throw new Error('A group with this name already exists');
        }
      }

      // Update timestamp
      const updatedAt = new Date().toISOString();

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((group) => 
          group.id === id ? { ...group, ...updates, updatedAt } : group
        ),
      }));

      window.addToast({
        type: 'success',
        title: 'Group Updated',
        message: 'Group has been updated successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update group',
        duration: 3000
      });
      throw error;
    }
  },

  removeGroup: async (id) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.filter((group) => group.id !== id),
        selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId
      }));

      window.addToast({
        type: 'success',
        title: 'Group Deleted',
        message: 'Group has been deleted successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error removing group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete group',
        duration: 3000
      });
      throw error;
    }
  },

  setSelectedGroup: (id) => set({ selectedGroupId: id }),

  addConnectionToGroup: async (groupId, connectionId) => {
    try {
      // Find the group
      const group = get().groups.find(g => g.id === groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Normalize connectionId to string
      const connectionIdStr = connectionId.toString();

      // Check if connection is already in the group
      if (group.connectionIds && group.connectionIds.includes(connectionIdStr)) {
        throw new Error('Connection is already in this group');
      }

      // Ensure connectionIds is an array
      const connectionIds = Array.isArray(group.connectionIds) ? [...group.connectionIds] : [];

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId 
            ? { 
                ...g, 
                connectionIds: [...connectionIds, connectionIdStr],
                updatedAt: new Date().toISOString()
              } 
            : g
        ),
      }));

      window.addToast({
        type: 'success',
        title: 'Connection Added',
        message: 'Connection has been added to the group successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error adding connection to group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add connection to group',
        duration: 3000
      });
      throw error;
    }
  },

  removeConnectionFromGroup: async (groupId, connectionId) => {
    try {
      // Normalize connectionId to string
      const connectionIdStr = connectionId.toString();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id === groupId && g.connectionIds) {
            return { 
              ...g, 
              connectionIds: g.connectionIds.filter(id => id !== connectionIdStr),
              updatedAt: new Date().toISOString()
            };
          }
          return g;
        }),
      }));

      window.addToast({
        type: 'success',
        title: 'Connection Removed',
        message: 'Connection has been removed from the group successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error removing connection from group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to remove connection from group',
        duration: 3000
      });
      throw error;
    }
  },

  addUserToGroup: async (groupId, userId) => {
    try {
      // Find the group
      const group = get().groups.find(g => g.id === groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is already in the group
      if (group.userIds.includes(userId)) {
        throw new Error('User is already in this group');
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId 
            ? { 
                ...g, 
                userIds: [...g.userIds, userId],
                updatedAt: new Date().toISOString()
              } 
            : g
        ),
      }));

      window.addToast({
        type: 'success',
        title: 'User Added',
        message: 'User has been added to the group successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error adding user to group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add user to group',
        duration: 3000
      });
      throw error;
    }
  },

  removeUserFromGroup: async (groupId, userId) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId 
            ? { 
                ...g, 
                userIds: g.userIds.filter(id => id !== userId),
                updatedAt: new Date().toISOString()
              } 
            : g
        ),
      }));

      window.addToast({
        type: 'success',
        title: 'User Removed',
        message: 'User has been removed from the group successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error removing user from group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to remove user from group',
        duration: 3000
      });
      throw error;
    }
  },

  addAddressToGroup: async (groupId, address) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id === groupId) {
            // If setting this as primary, mark all others as non-primary
            let addresses = g.addresses || [];
            if (address.isPrimary) {
              addresses = addresses.map(a => ({ ...a, isPrimary: false }));
            }
            addresses = [...addresses, address];
            
            return { 
              ...g, 
              addresses,
              updatedAt: new Date().toISOString()
            };
          }
          return g;
        }),
      }));

      window.addToast({
        type: 'success',
        title: 'Address Added',
        message: 'Address has been added to the group successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error adding address to group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add address to group',
        duration: 3000
      });
      throw error;
    }
  },

  removeAddressFromGroup: async (groupId, addressIndex) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id === groupId && g.addresses) {
            const addresses = [...g.addresses];
            addresses.splice(addressIndex, 1);
            
            // If we removed the primary and there are other addresses, make the first one primary
            if (addresses.length > 0 && !addresses.some(a => a.isPrimary)) {
              addresses[0].isPrimary = true;
            }
            
            return { 
              ...g, 
              addresses,
              updatedAt: new Date().toISOString()
            };
          }
          return g;
        }),
      }));

      window.addToast({
        type: 'success',
        title: 'Address Removed',
        message: 'Address has been removed from the group successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error removing address from group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to remove address from group',
        duration: 3000
      });
      throw error;
    }
  },

  updateAddressInGroup: async (groupId, addressIndex, updates) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id === groupId && g.addresses && g.addresses[addressIndex]) {
            const addresses = [...g.addresses];
            
            // If setting this as primary, mark all others as non-primary
            if (updates.isPrimary) {
              addresses.forEach(a => a.isPrimary = false);
            }
            
            addresses[addressIndex] = { ...addresses[addressIndex], ...updates };
            
            return { 
              ...g, 
              addresses,
              updatedAt: new Date().toISOString()
            };
          }
          return g;
        }),
      }));

      window.addToast({
        type: 'success',
        title: 'Address Updated',
        message: 'Address has been updated successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating address in group:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update address',
        duration: 3000
      });
      throw error;
    }
  },

  refreshGroupPerformance: async (groupId) => {
    try {
      // Find the group
      const group = get().groups.find(g => g.id === groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Get connections from the store
      const { connections } = get();

      // Calculate performance metrics for the group
      const performance = calculateGroupPerformance(connections, group);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId 
            ? { 
                ...g,
                performance,
                updatedAt: new Date().toISOString()
              } 
            : g
        ),
      }));

      window.addToast({
        type: 'success',
        title: 'Performance Refreshed',
        message: 'Group performance metrics have been updated.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error refreshing group performance:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to refresh performance metrics',
        duration: 3000
      });
      throw error;
    }
  },

  refreshGroupBilling: async (groupId) => {
    try {
      // Find the group
      const group = get().groups.find(g => g.id === groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Get connections from the store
      const { connections } = get();

      // Calculate billing info for the group
      const billing = calculateGroupBilling(connections, group);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId 
            ? { 
                ...g,
                billing,
                updatedAt: new Date().toISOString()
              } 
            : g
        ),
      }));

      window.addToast({
        type: 'success',
        title: 'Billing Refreshed',
        message: 'Group billing information has been updated.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error refreshing group billing:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to refresh billing information',
        duration: 3000
      });
      throw error;
    }
  },
});