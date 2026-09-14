/**
 * Safe localStorage utilities with error handling and quota management
 * Namespace: netbond_*
 */

const NETBOND_PREFIX = 'netbond_';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const QUOTA_WARNING_THRESHOLD = 0.8; // 80%

/**
 * Safely get an item from localStorage with JSON parsing
 */
export function safeGetItem<T = any>(key: string): T | null {
  try {
    const fullKey = key.startsWith(NETBOND_PREFIX) ? key : `${NETBOND_PREFIX}${key}`;
    const item = localStorage.getItem(fullKey);

    if (item === null) return null;

    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[localStorage] Error reading key "${key}":`, error);
    return null;
  }
}

/**
 * Safely set an item in localStorage with JSON serialization
 */
export function safeSetItem(key: string, value: any): boolean {
  try {
    const fullKey = key.startsWith(NETBOND_PREFIX) ? key : `${NETBOND_PREFIX}${key}`;
    const serialized = JSON.stringify(value);

    // Check quota before setting
    if (isQuotaExceeded(serialized.length)) {
      console.warn('[localStorage] Quota exceeded, attempting cleanup');
      pruneOldEntries();

      // Try again after cleanup
      if (isQuotaExceeded(serialized.length)) {
        throw new Error('Storage quota exceeded even after cleanup');
      }
    }

    localStorage.setItem(fullKey, serialized);
    return true;
  } catch (error) {
    console.error(`[localStorage] Error writing key "${key}":`, error);

    // Show user-friendly error
    if (window.addToast) {
      window.addToast({
        type: 'error',
        title: 'Storage Error',
        message: 'Unable to save preferences. Storage may be full.',
        duration: 5000
      });
    }

    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
  try {
    const fullKey = key.startsWith(NETBOND_PREFIX) ? key : `${NETBOND_PREFIX}${key}`;
    localStorage.removeItem(fullKey);
    return true;
  } catch (error) {
    console.error(`[localStorage] Error removing key "${key}":`, error);
    return false;
  }
}

/**
 * Calculate current storage usage in bytes
 */
export function getStorageSize(): number {
  try {
    let total = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NETBOND_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }

    return total;
  } catch (error) {
    console.error('[localStorage] Error calculating storage size:', error);
    return 0;
  }
}

/**
 * Check if quota is exceeded or near limit
 */
export function isQuotaExceeded(additionalBytes: number = 0): boolean {
  try {
    const currentSize = getStorageSize();
    const projectedSize = currentSize + additionalBytes;

    if (projectedSize >= MAX_STORAGE_SIZE) {
      return true;
    }

    // Warn if approaching limit
    if (projectedSize >= MAX_STORAGE_SIZE * QUOTA_WARNING_THRESHOLD) {
      console.warn(`[localStorage] Storage at ${Math.round((projectedSize / MAX_STORAGE_SIZE) * 100)}%`);
    }

    return false;
  } catch (error) {
    console.error('[localStorage] Error checking quota:', error);
    return false;
  }
}

/**
 * Get storage usage percentage
 */
export function getQuotaPercentage(): number {
  try {
    const size = getStorageSize();
    return Math.round((size / MAX_STORAGE_SIZE) * 100);
  } catch (error) {
    console.error('[localStorage] Error calculating quota percentage:', error);
    return 0;
  }
}

/**
 * Prune old entries (older than 30 days) to free up space
 */
export function pruneOldEntries(): void {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(NETBOND_PREFIX)) {
        // Check if key contains timestamp metadata
        const value = localStorage.getItem(key);

        if (value) {
          try {
            const parsed = JSON.parse(value);

            // If object has timestamp field and it's old, mark for removal
            if (parsed && typeof parsed === 'object' && parsed.timestamp) {
              if (parsed.timestamp < thirtyDaysAgo) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Not JSON or no timestamp, skip
          }
        }
      }
    }

    // Remove old entries
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {

    }
  } catch (error) {
    console.error('[localStorage] Error pruning old entries:', error);
  }
}

/**
 * Get all keys with netbond prefix
 */
export function getAllKeys(): string[] {
  try {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NETBOND_PREFIX)) {
        keys.push(key.replace(NETBOND_PREFIX, ''));
      }
    }

    return keys;
  } catch (error) {
    console.error('[localStorage] Error getting all keys:', error);
    return [];
  }
}

/**
 * Clear all netbond-prefixed entries (useful for testing/reset)
 */
export function clearAllNetbondData(): void {
  try {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NETBOND_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach(key => localStorage.removeItem(key));


  } catch (error) {
    console.error('[localStorage] Error clearing netbond data:', error);
  }
}
