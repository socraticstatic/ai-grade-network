import { StateCreator } from 'zustand';

export interface APIIntegration {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: 'none' | 'apiKey' | 'bearer' | 'oauth2' | 'basic';
  authConfig?: {
    apiKey?: string;
    headerName?: string;
    token?: string;
    username?: string;
    password?: string;
  };
  endpoints: APIEndpoint[];
  mappings: DataMapping[];
  syncFrequency: 'realtime' | '5min' | '15min' | '30min' | '1hour' | 'manual';
  autoRetry: boolean;
  errorNotifications: 'all' | 'critical' | 'none';
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  parameters?: APIParameter[];
  requestBody?: any;
  responseSchema?: any;
}

export interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'body';
  type: string;
  required: boolean;
  description?: string;
  default?: any;
}

export interface DataMapping {
  source: string;
  target: string;
  transformation?: string;
  filter?: string;
}

export interface APIToolboxSlice {
  apiIntegrations: APIIntegration[];
  addAPIIntegration: (integration: Omit<APIIntegration, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAPIIntegration: (id: string, updates: Partial<APIIntegration>) => void;
  deleteAPIIntegration: (id: string) => void;
  toggleAPIIntegrationStatus: (id: string) => void;
  getAPIIntegration: (id: string) => APIIntegration | undefined;
}

export const createAPIToolboxSlice: StateCreator<APIToolboxSlice> = (set, get) => ({
  apiIntegrations: [],

  addAPIIntegration: (integration) => {
    const newIntegration: APIIntegration = {
      ...integration,
      id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set((state) => ({
      apiIntegrations: [...state.apiIntegrations, newIntegration]
    }));
  },

  updateAPIIntegration: (id, updates) => {
    set((state) => ({
      apiIntegrations: state.apiIntegrations.map((integration) =>
        integration.id === id
          ? { ...integration, ...updates, updatedAt: new Date().toISOString() }
          : integration
      )
    }));
  },

  deleteAPIIntegration: (id) => {
    set((state) => ({
      apiIntegrations: state.apiIntegrations.filter((integration) => integration.id !== id)
    }));
  },

  toggleAPIIntegrationStatus: (id) => {
    set((state) => ({
      apiIntegrations: state.apiIntegrations.map((integration) =>
        integration.id === id
          ? {
              ...integration,
              status: integration.status === 'active' ? 'inactive' : 'active',
              updatedAt: new Date().toISOString()
            }
          : integration
      )
    }));
  },

  getAPIIntegration: (id) => {
    return get().apiIntegrations.find((integration) => integration.id === id);
  }
});
