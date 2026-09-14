import { StateCreator } from 'zustand';
import { User } from '../../types';

export interface UserSlice {
  users: User[];
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  users: [],
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, updates) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === id ? { ...user, ...updates } : user
      ),
    })),
  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((user) => user.id !== id) })),
});