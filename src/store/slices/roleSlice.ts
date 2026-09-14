import { StateCreator } from 'zustand';
import { RoleName } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';

export type UserRole = 'user' | 'admin' | 'super-admin';

const PERSONA_TIER_MAP: Record<string, UserRole> = {
  Viewer: 'user',
  PlatformViewer: 'user',
  SupportSpecialist: 'user',
  NetworkEngineer: 'admin',
  BillingAdmin: 'admin',
  SecurityAdmin: 'admin',
  OperationsManager: 'admin',
  TenantAdmin: 'admin',
  ResellerAdmin: 'admin',
  ClientAdmin: 'admin',
  ApiManager: 'admin',
  ProvisioningManager: 'admin',
  PartnerManager: 'super-admin',
  PlatformAdmin: 'super-admin',
};

export interface ImpersonationState {
  isImpersonating: boolean;
  targetUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  originalUser: {
    name: string;
    email: string;
    role: UserRole;
  } | null;
  startTime: string | null;
}

export interface RoleSlice {
  currentRole: UserRole;
  activePersona: RoleName | null;
  impersonation: ImpersonationState;
  setRole: (role: UserRole) => void;
  setActivePersona: (persona: RoleName) => void;
  startImpersonation: (targetUser: { id: string; name: string; email: string; role: UserRole }) => void;
  exitImpersonation: () => void;
}

export const createRoleSlice: StateCreator<RoleSlice> = (set, get) => ({
  currentRole: 'admin',
  activePersona: 'NetworkEngineer',
  impersonation: {
    isImpersonating: false,
    targetUser: null,
    originalUser: null,
    startTime: null,
  },

  setRole: (role) => {
    set({ currentRole: role, activePersona: null });
    window.addToast?.({
      type: 'info',
      title: 'Role Changed',
      message: `Now viewing as ${role === 'super-admin' ? 'Super Admin' : role === 'admin' ? 'Tenant Admin' : 'Standard User'}`,
      duration: 3000,
    });
  },

  setActivePersona: (persona) => {
    const tier = PERSONA_TIER_MAP[persona] ?? 'admin';
    const displayName = ROLE_CATALOG[persona]?.displayName ?? persona;
    set({ activePersona: persona, currentRole: tier });
    window.addToast?.({
      type: 'info',
      title: 'Persona Changed',
      message: `Now viewing as ${displayName}`,
      duration: 3000,
    });
  },

  startImpersonation: (targetUser) => {
    const currentState = get();
    set({
      activePersona: null,
      impersonation: {
        isImpersonating: true,
        targetUser,
        originalUser: {
          name: 'Emilio Estevez',
          email: 'emilio.estevez@att.com',
          role: currentState.currentRole,
        },
        startTime: new Date().toISOString(),
      },
      currentRole: targetUser.role,
    });
    window.addToast?.({
      type: 'info',
      title: 'Impersonation Started',
      message: `Now viewing as ${targetUser.name}`,
      duration: 4000,
    });
  },

  exitImpersonation: () => {
    const currentState = get();
    const originalRole = currentState.impersonation.originalUser?.role || 'admin';
    set({
      activePersona: null,
      impersonation: {
        isImpersonating: false,
        targetUser: null,
        originalUser: null,
        startTime: null,
      },
      currentRole: originalRole,
    });
    window.addToast?.({
      type: 'success',
      title: 'Impersonation Ended',
      message: 'Returned to your account',
      duration: 3000,
    });
  },
});
