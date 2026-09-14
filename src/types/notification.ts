export type NotificationType = 'system' | 'activity' | 'security' | 'billing' | 'alert';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'unread' | 'read' | 'archived';
export type NotificationChannel = 'email' | 'sms' | 'app' | 'browser';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  system: {
    enabled: boolean;
    channels: NotificationChannel[];
    maintenance: boolean;
    updates: boolean;
    performance: boolean;
  };
  activity: {
    enabled: boolean;
    channels: NotificationChannel[];
    statusChanges: boolean;
    bandwidthAlerts: boolean;
    thresholdAlerts: boolean;
    configChanges: boolean;
  };
  security: {
    enabled: boolean;
    channels: NotificationChannel[];
    securityAlerts: boolean;
    compliance: boolean;
    accessChanges: boolean;
    patches: boolean;
  };
  billing: {
    enabled: boolean;
    channels: NotificationChannel[];
    invoices: boolean;
    paymentFailures: boolean;
    budgetAlerts: boolean;
    usageThresholds: boolean;
  };
  alert: {
    enabled: boolean;
    channels: NotificationChannel[];
    criticalOnly: boolean;
    minPriority: NotificationPriority;
  };
}

export interface NotificationSettings {
  doNotDisturb: boolean;
  doNotDisturbSchedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: number[];
  };
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
  soundEnabled: boolean;
  browserNotifications: boolean;
}
