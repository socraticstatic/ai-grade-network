// Application constants

export const CANVAS_BOUNDS = {
  MAX_Y: 800,
  NODE_SIZE: 64,
  GRID_SIZE: 20
} as const;

export const ZOOM_LIMITS = {
  MIN: 0.5,
  MAX: 3,
  STEP: 0.2,
  DEFAULT: 1
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500
} as const;

export const Z_INDEX = {
  BACKGROUND: 1,
  GRID: 2,
  CANVAS: 5,
  EDGES: 10,
  EDGE_CONTROLS: 15,
  NODES: 20,
  UI_PANELS: 50,
  MODAL: 100,
  MODALS: 100,
  UI_CONTROLS: 150,
  TOOLBAR: 160,
  OVERLAY: 170,
  NOTIFICATIONS: 200
} as const;

export const DEFAULT_NETWORK_CONFIG = {
  ATT_CORE: {
    networkType: 'at&t core',
    provider: 'AT&T'
  },
  HUB: {
    routerType: 'cloud'
  },
  DEFAULT_CONNECTION: {
    type: 'MPLS',
    bandwidth: '10 Gbps',
    resilience: 'standard'
  }
} as const;

export const CLOUD_PROVIDERS = [
  { id: 'AWS', label: 'AWS' },
  { id: 'Azure', label: 'Azure' },
  { id: 'Google', label: 'Google Cloud' },
  { id: 'Oracle', label: 'Oracle Cloud' }
] as const;

export const DATACENTER_PROVIDERS = [
  { id: 'Equinix', label: 'Equinix' },
  { id: 'Digital Reality', label: 'Digital Reality' },
  { id: 'CenterSquare', label: 'CenterSquare' },
  { id: 'CoreSite', label: 'CoreSite' },
  { id: 'DataBank', label: 'DataBank' }
] as const;

export const FUNCTION_TYPES = [
  { id: 'SDWAN', label: 'SD-WAN' },
  { id: 'Firewall', label: 'Firewall' },
  { id: 'VNF', label: 'VNF' },
  { id: 'VNAT', label: 'VNAT' }
] as const;

export const NETWORK_TYPES = [
  { id: 'Internet', label: 'Internet' },
  { id: 'VPN', label: 'VPN' },
  { id: 'Ethernet', label: 'Ethernet' },
  { id: 'IoT', label: 'IoT' },
  { id: 'AT&T Core', label: 'AT&T Core' }
] as const;