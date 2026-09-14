import { StateCreator } from 'zustand';
import { Notification, NotificationPreferences, NotificationSettings, NotificationChannel } from '../../types/notification';

const defaultPreferences: NotificationPreferences = {
  system: {
    enabled: true,
    channels: ['email', 'app'],
    maintenance: true,
    updates: true,
    performance: true,
  },
  activity: {
    enabled: true,
    channels: ['app'],
    statusChanges: true,
    bandwidthAlerts: true,
    thresholdAlerts: true,
    configChanges: true,
  },
  security: {
    enabled: true,
    channels: ['email', 'sms', 'app'],
    securityAlerts: true,
    compliance: true,
    accessChanges: true,
    patches: true,
  },
  billing: {
    enabled: true,
    channels: ['email'],
    invoices: true,
    paymentFailures: true,
    budgetAlerts: true,
    usageThresholds: true,
  },
  alert: {
    enabled: true,
    channels: ['email', 'app'],
    criticalOnly: false,
    minPriority: 'medium',
  },
};

const defaultSettings: NotificationSettings = {
  doNotDisturb: false,
  doNotDisturbSchedule: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  digestEnabled: false,
  digestFrequency: 'daily',
  soundEnabled: true,
  browserNotifications: true,
};

const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'security',
    priority: 'critical',
    status: 'unread',
    title: 'Security Alert: Unusual Login Activity',
    message: 'A login attempt was detected from an unrecognized device in Tokyo, Japan.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    archived: false,
    actionUrl: '/configure/security',
    actionLabel: 'Review Activity',
  },
  {
    id: '2',
    type: 'activity',
    priority: 'high',
    status: 'unread',
    title: 'Connection Status Changed',
    message: 'Connection "AWS-US-EAST-1" status changed from Active to Degraded.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
    archived: false,
    actionUrl: '/connections/aws-us-east-1',
    actionLabel: 'View Connection',
  },
  {
    id: '3',
    type: 'billing',
    priority: 'medium',
    status: 'read',
    title: 'Monthly Invoice Available',
    message: 'Your invoice for November 2025 is now available. Total: $2,847.50',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/configure/billing',
    actionLabel: 'View Invoice',
  },
  {
    id: '4',
    type: 'system',
    priority: 'low',
    status: 'read',
    title: 'System Update Completed',
    message: 'Platform version 2.8.3 has been successfully deployed with new features and improvements.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/support',
    actionLabel: 'View Release Notes',
  },
  {
    id: '5',
    type: 'activity',
    priority: 'high',
    status: 'read',
    title: 'Bandwidth Threshold Exceeded',
    message: 'Connection "AZURE-WEST-EU" has exceeded 85% bandwidth utilization.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/monitor',
    actionLabel: 'View Metrics',
  },
  {
    id: '6',
    type: 'alert',
    priority: 'critical',
    status: 'read',
    title: 'High Latency Detected',
    message: 'Connection "GCP-ASIA-1" experiencing latency spikes above 200ms.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/monitor',
    actionLabel: 'Investigate',
  },
  {
    id: '7',
    type: 'security',
    priority: 'medium',
    status: 'read',
    title: 'Compliance Report Generated',
    message: 'Your quarterly SOC 2 compliance report is ready for review.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/configure/compliance',
    actionLabel: 'View Report',
  },
  {
    id: '8',
    type: 'billing',
    priority: 'high',
    status: 'read',
    title: 'Budget Alert: 75% Threshold',
    message: 'You have used 75% of your monthly budget allocation.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/configure/billing',
    actionLabel: 'Manage Budget',
  },
  {
    id: '9',
    type: 'system',
    priority: 'medium',
    status: 'read',
    title: 'Scheduled Maintenance Notice',
    message: 'Platform maintenance scheduled for December 15, 2025, 02:00-04:00 UTC.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: true,
    archived: false,
  },
  {
    id: '10',
    type: 'activity',
    priority: 'low',
    status: 'read',
    title: 'Configuration Change Successful',
    message: 'VLAN 100 configuration updated successfully on connection "DC-PRIMARY".',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    read: true,
    archived: false,
    actionUrl: '/connections/dc-primary',
    actionLabel: 'View Details',
  },
];

export interface NotificationSlice {
  notifications: Notification[];
  preferences: NotificationPreferences;
  settings: NotificationSettings;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  archiveNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  toggleChannel: (type: keyof NotificationPreferences, channel: NotificationChannel) => void;
}

export const createNotificationSlice: StateCreator<NotificationSlice> = (set) => ({
  notifications: sampleNotifications,
  preferences: defaultPreferences,
  settings: defaultSettings,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, read: true, status: 'read' as const }
          : notification
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
        status: 'read' as const,
      })),
    })),

  archiveNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, archived: true, status: 'archived' as const }
          : notification
      ),
    })),

  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id
      ),
    })),

  clearAll: () =>
    set(() => ({
      notifications: [],
    })),

  updatePreferences: (preferences) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...preferences,
      },
    })),

  updateSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),

  toggleChannel: (type, channel) =>
    set((state) => {
      const currentChannels = state.preferences[type].channels;
      const hasChannel = currentChannels.includes(channel);

      return {
        preferences: {
          ...state.preferences,
          [type]: {
            ...state.preferences[type],
            channels: hasChannel
              ? currentChannels.filter((c) => c !== channel)
              : [...currentChannels, channel],
          },
        },
      };
    }),
});
