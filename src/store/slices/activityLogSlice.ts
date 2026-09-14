import { StateCreator } from 'zustand';

/**
 * Durable customer activity history (GA requirement): every lifecycle event,
 * timestamped, with the acting admin. "A toast that disappears is not a record."
 * Security events (e.g. a key rejected by AWS) land here too.
 */

export type ActivityEventType =
  | 'created'
  | 'key-generated'
  | 'key-accepted'
  | 'live'
  | 'healed'
  | 'key-uploaded'
  | 'bandwidth-changed'
  | 'expired'
  | 'deleted'
  | 'security';

export interface ActivityEvent {
  at: string;            // ISO timestamp
  admin: string;         // acting admin (accountability — access is admin-only)
  connectionId?: string;
  type: ActivityEventType;
  message: string;
}

export interface ActivityLogSlice {
  activityEvents: ActivityEvent[];
  logActivity: (e: Omit<ActivityEvent, 'at' | 'admin'>) => void;
}

// There is no auth and no signed-in identity: every action is the operator's.
function currentAdmin(): string {
  return 'admin';
}

export const createActivityLogSlice: StateCreator<ActivityLogSlice> = (set) => ({
  activityEvents: [],
  logActivity: (e) =>
    set((state) => ({
      activityEvents: [
        { ...e, at: new Date().toISOString(), admin: currentAdmin() },
        ...state.activityEvents,
      ],
    })),
});
