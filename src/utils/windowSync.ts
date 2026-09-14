/**
 * Window Sync Manager using BroadcastChannel API
 * Provides cross-window communication with fallback to storage events
 */

export type MessageType =
  | 'DATA_UPDATE'
  | 'STATE_SYNC'
  | 'HEARTBEAT'
  | 'COLUMN_CHANGE'
  | 'SCROLL_SYNC'
  | 'FILTER_CHANGE'
  | 'SORT_CHANGE'
  | 'PAGE_CHANGE';

export interface SyncMessage {
  type: MessageType;
  payload: any;
  tableId: string;
  timestamp: number;
  senderId: string;
}

type MessageHandler = (message: SyncMessage) => void;

const CHANNEL_NAME = 'netbond-sync';
const MAX_MESSAGES_PER_SECOND = 10;
const THROTTLE_WINDOW = 1000; // 1 second
const MAX_QUEUE_SIZE = 100;

/**
 * WindowSyncManager class
 */
export class WindowSyncManager {
  private channel: BroadcastChannel | null = null;
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private messageQueue: SyncMessage[] = [];
  private messageCounts: Map<MessageType, number> = new Map();
  private throttleResetInterval: NodeJS.Timeout | null = null;
  private senderId: string;
  private useFallback: boolean = false;

  constructor() {
    this.senderId = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.initialize();
  }

  /**
   * Initialize the sync manager
   */
  private initialize(): void {
    try {
      // Try to use BroadcastChannel
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleMessage(event.data);

      } else {
        // Fallback to storage events
        this.useFallback = true;
        window.addEventListener('storage', this.handleStorageEvent.bind(this));

      }

      // Reset throttle counts every second
      this.throttleResetInterval = setInterval(() => {
        this.messageCounts.clear();
      }, THROTTLE_WINDOW);

    } catch (error) {
      console.error('[WindowSync] Initialization error:', error);
      this.useFallback = true;
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  /**
   * Broadcast a message to all windows
   */
  broadcast(type: MessageType, payload: any, tableId: string = 'global'): void {
    // Check throttle
    const count = this.messageCounts.get(type) || 0;
    if (count >= MAX_MESSAGES_PER_SECOND) {
      // Queue message
      if (this.messageQueue.length < MAX_QUEUE_SIZE) {
        this.messageQueue.push({
          type,
          payload,
          tableId,
          timestamp: Date.now(),
          senderId: this.senderId
        });
      }
      return;
    }

    // Update count
    this.messageCounts.set(type, count + 1);

    // Create message
    const message: SyncMessage = {
      type,
      payload,
      tableId,
      timestamp: Date.now(),
      senderId: this.senderId
    };

    // Send message
    try {
      if (this.channel && !this.useFallback) {
        this.channel.postMessage(message);
      } else {
        // Fallback: use localStorage
        const key = `netbond_sync_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(message));
        // Clean up immediately
        setTimeout(() => localStorage.removeItem(key), 100);
      }
    } catch (error) {
      console.error('[WindowSync] Broadcast error:', error);
    }
  }

  /**
   * Broadcast message with batching
   */
  broadcastBatched(type: MessageType, payload: any, tableId: string = 'global', delay: number = 100): void {
    setTimeout(() => {
      this.broadcast(type, payload, tableId);
    }, delay);
  }

  /**
   * Subscribe to messages of a specific type
   */
  subscribe(type: MessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Unsubscribe from all messages of a specific type
   */
  unsubscribe(type: MessageType, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: SyncMessage): void {
    // Ignore messages from self
    if (message.senderId === this.senderId) {
      return;
    }

    try {
      // Call handlers for this message type
      const handlers = this.handlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('[WindowSync] Handler error:', error);
          }
        });
      }
    } catch (error) {
      console.error('[WindowSync] Message handling error:', error);
    }
  }

  /**
   * Handle storage event (fallback)
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (!event.key || !event.key.startsWith('netbond_sync_')) {
      return;
    }

    if (!event.newValue) {
      return;
    }

    try {
      const message: SyncMessage = JSON.parse(event.newValue);
      this.handleMessage(message);
    } catch (error) {
      console.error('[WindowSync] Storage event parse error:', error);
    }
  }

  /**
   * Process queued messages
   */
  private processQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    // Process up to MAX_MESSAGES_PER_SECOND messages
    const toProcess = this.messageQueue.splice(0, MAX_MESSAGES_PER_SECOND);

    toProcess.forEach(message => {
      this.broadcast(message.type, message.payload, message.tableId);
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.throttleResetInterval) {
      clearInterval(this.throttleResetInterval);
      this.throttleResetInterval = null;
    }

    if (this.useFallback) {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    }

    this.handlers.clear();
    this.messageQueue = [];
    this.messageCounts.clear();


  }

  /**
   * Get current sender ID
   */
  getSenderId(): string {
    return this.senderId;
  }

  /**
   * Check if using fallback mode
   */
  isUsingFallback(): boolean {
    return this.useFallback;
  }
}

/**
 * Singleton instance
 */
let syncManager: WindowSyncManager | null = null;

/**
 * Get or create sync manager instance
 */
export function getSyncManager(): WindowSyncManager {
  if (!syncManager) {
    syncManager = new WindowSyncManager();
  }
  return syncManager;
}

/**
 * Destroy sync manager instance
 */
export function destroySyncManager(): void {
  if (syncManager) {
    syncManager.destroy();
    syncManager = null;
  }
}
