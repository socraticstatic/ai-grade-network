import { StateCreator } from 'zustand';

export interface TermDiscount {
  id: string;
  name: string;
  termLength: number;
  termUnit: 'months' | 'years';
  discountPercentage: number;
  description: string;
  isActive: boolean;
  applicableConnectionTypes: string[];
  minimumSpend?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalPolicy {
  id: string;
  name: string;
  autoRenew: boolean;
  renewalNotificationDays: number;
  allowEarlyRenewal: boolean;
  earlyRenewalDays?: number;
  gracePeriodDays: number;
  description: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionTermAgreement {
  id: string;
  connectionId: string;
  connectionName: string;
  termDiscountId: string;
  termDiscountName: string;
  startDate: string;
  endDate: string;
  discountPercentage: number;
  estimatedMonthlySavings: number;
  autoRenew: boolean;
  renewalPolicyId?: string;
  status: 'active' | 'expiring_soon' | 'expired';
  createdAt: string;
}

export interface BillingSlice {
  termDiscounts: TermDiscount[];
  renewalPolicies: RenewalPolicy[];
  connectionTermAgreements: ConnectionTermAgreement[];

  addTermDiscount: (discount: Omit<TermDiscount, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTermDiscount: (id: string, updates: Partial<TermDiscount>) => void;
  deleteTermDiscount: (id: string) => void;

  addRenewalPolicy: (policy: Omit<RenewalPolicy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRenewalPolicy: (id: string, updates: Partial<RenewalPolicy>) => void;
  deleteRenewalPolicy: (id: string) => void;

  addConnectionTermAgreement: (agreement: Omit<ConnectionTermAgreement, 'id' | 'createdAt'>) => void;
  updateConnectionTermAgreement: (id: string, updates: Partial<ConnectionTermAgreement>) => void;
  deleteConnectionTermAgreement: (id: string) => void;
}

const mockTermDiscounts: TermDiscount[] = [
  {
    id: 'td-1',
    name: '12-Month Commitment Discount',
    termLength: 12,
    termUnit: 'months',
    discountPercentage: 10,
    description: 'Save 10% with a 12-month term commitment on eligible connections',
    isActive: true,
    applicableConnectionTypes: ['Dedicated', 'Hub'],
    minimumSpend: 1000,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'td-2',
    name: '24-Month Commitment Discount',
    termLength: 24,
    termUnit: 'months',
    discountPercentage: 15,
    description: 'Save 15% with a 24-month term commitment on eligible connections',
    isActive: true,
    applicableConnectionTypes: ['Dedicated', 'Hub', 'IPE'],
    minimumSpend: 2000,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'td-3',
    name: '36-Month Enterprise Discount',
    termLength: 36,
    termUnit: 'months',
    discountPercentage: 20,
    description: 'Maximum savings with a 36-month enterprise commitment',
    isActive: true,
    applicableConnectionTypes: ['Dedicated', 'Hub', 'IPE'],
    minimumSpend: 5000,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'td-4',
    name: 'Volume Discount - 6 Month',
    termLength: 6,
    termUnit: 'months',
    discountPercentage: 5,
    description: 'Short-term commitment with volume discount',
    isActive: false,
    applicableConnectionTypes: ['Dedicated'],
    minimumSpend: 500,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
];

const mockRenewalPolicies: RenewalPolicy[] = [
  {
    id: 'rp-1',
    name: 'Standard Auto-Renewal',
    autoRenew: true,
    renewalNotificationDays: 30,
    allowEarlyRenewal: true,
    earlyRenewalDays: 60,
    gracePeriodDays: 15,
    description: 'Automatic renewal with 30-day advance notification',
    isDefault: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'rp-2',
    name: 'Manual Renewal Required',
    autoRenew: false,
    renewalNotificationDays: 45,
    allowEarlyRenewal: true,
    earlyRenewalDays: 90,
    gracePeriodDays: 30,
    description: 'Requires manual approval for renewal',
    isDefault: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'rp-3',
    name: 'Enterprise Auto-Renewal',
    autoRenew: true,
    renewalNotificationDays: 60,
    allowEarlyRenewal: true,
    earlyRenewalDays: 120,
    gracePeriodDays: 45,
    description: 'Extended notification period for enterprise agreements',
    isDefault: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

const mockConnectionTermAgreements: ConnectionTermAgreement[] = [
  {
    id: 'cta-1',
    connectionId: 'conn-1',
    connectionName: 'NYC-DFW-Production',
    termDiscountId: 'td-2',
    termDiscountName: '24-Month Commitment Discount',
    startDate: '2024-01-01',
    endDate: '2026-01-01',
    discountPercentage: 15,
    estimatedMonthlySavings: 450,
    autoRenew: true,
    renewalPolicyId: 'rp-1',
    status: 'active',
    createdAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 'cta-2',
    connectionId: 'conn-2',
    connectionName: 'LAX-AWS-US-West',
    termDiscountId: 'td-3',
    termDiscountName: '36-Month Enterprise Discount',
    startDate: '2023-06-01',
    endDate: '2026-06-01',
    discountPercentage: 20,
    estimatedMonthlySavings: 1200,
    autoRenew: false,
    renewalPolicyId: 'rp-2',
    status: 'active',
    createdAt: '2023-06-01T10:00:00Z',
  },
];

export const createBillingSlice: StateCreator<BillingSlice> = (set) => ({
  termDiscounts: mockTermDiscounts,
  renewalPolicies: mockRenewalPolicies,
  connectionTermAgreements: mockConnectionTermAgreements,

  addTermDiscount: (discount) => {
    const newDiscount: TermDiscount = {
      ...discount,
      id: `td-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      termDiscounts: [...state.termDiscounts, newDiscount],
    }));
  },

  updateTermDiscount: (id, updates) => {
    set((state) => ({
      termDiscounts: state.termDiscounts.map((discount) =>
        discount.id === id
          ? { ...discount, ...updates, updatedAt: new Date().toISOString() }
          : discount
      ),
    }));
  },

  deleteTermDiscount: (id) => {
    set((state) => ({
      termDiscounts: state.termDiscounts.filter((discount) => discount.id !== id),
    }));
  },

  addRenewalPolicy: (policy) => {
    const newPolicy: RenewalPolicy = {
      ...policy,
      id: `rp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      renewalPolicies: [...state.renewalPolicies, newPolicy],
    }));
  },

  updateRenewalPolicy: (id, updates) => {
    set((state) => ({
      renewalPolicies: state.renewalPolicies.map((policy) =>
        policy.id === id
          ? { ...policy, ...updates, updatedAt: new Date().toISOString() }
          : policy
      ),
    }));
  },

  deleteRenewalPolicy: (id) => {
    set((state) => ({
      renewalPolicies: state.renewalPolicies.filter((policy) => policy.id !== id),
    }));
  },

  addConnectionTermAgreement: (agreement) => {
    const newAgreement: ConnectionTermAgreement = {
      ...agreement,
      id: `cta-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      connectionTermAgreements: [...state.connectionTermAgreements, newAgreement],
    }));
  },

  updateConnectionTermAgreement: (id, updates) => {
    set((state) => ({
      connectionTermAgreements: state.connectionTermAgreements.map((agreement) =>
        agreement.id === id ? { ...agreement, ...updates } : agreement
      ),
    }));
  },

  deleteConnectionTermAgreement: (id) => {
    set((state) => ({
      connectionTermAgreements: state.connectionTermAgreements.filter(
        (agreement) => agreement.id !== id
      ),
    }));
  },
});
