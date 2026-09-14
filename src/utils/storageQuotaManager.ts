/**
 * Advanced storage quota management with compression and LRU eviction
 */

import { safeGetItem, safeSetItem, safeRemoveItem, getStorageSize } from './localStorageUtils';

interface StorageEntry {
  key: string;
  size: number;
  lastAccessed: number;
}

const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const QUOTA_WARNING_THRESHOLD = 0.8; // 80%
const QUOTA_CRITICAL_THRESHOLD = 0.95; // 95%

/**
 * Check storage quota using StorageManager API if available
 */
export async function checkQuota(): Promise<{ used: number; total: number; percentage: number }> {
  try {
    // Try modern StorageManager API first
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || MAX_STORAGE_SIZE;
      const percentage = Math.round((used / total) * 100);

      return { used, total, percentage };
    }

    // Fallback to manual calculation
    const used = getStorageSize();
    const total = MAX_STORAGE_SIZE;
    const percentage = Math.round((used / total) * 100);

    return { used, total, percentage };
  } catch (error) {
    console.error('[QuotaManager] Error checking quota:', error);
    return { used: 0, total: MAX_STORAGE_SIZE, percentage: 0 };
  }
}

/**
 * Get quota percentage (0-100)
 */
export async function getQuotaPercentage(): Promise<number> {
  const { percentage } = await checkQuota();
  return percentage;
}

/**
 * Check if we should show quota warning
 */
export async function shouldShowQuotaWarning(): Promise<boolean> {
  const percentage = await getQuotaPercentage();
  return percentage >= QUOTA_WARNING_THRESHOLD * 100;
}

/**
 * Check if quota is critical (needs immediate action)
 */
export async function isQuotaCritical(): Promise<boolean> {
  const percentage = await getQuotaPercentage();
  return percentage >= QUOTA_CRITICAL_THRESHOLD * 100;
}

/**
 * Simple string compression using run-length encoding
 */
export function compressValue(obj: any): string {
  try {
    const json = JSON.stringify(obj);

    // For small objects, compression overhead isn't worth it
    if (json.length < 1000) {
      return json;
    }

    // Simple RLE compression
    let compressed = '';
    let count = 1;
    let prev = json[0];

    for (let i = 1; i < json.length; i++) {
      if (json[i] === prev && count < 9) {
        count++;
      } else {
        compressed += count > 1 ? `${count}${prev}` : prev;
        prev = json[i];
        count = 1;
      }
    }

    compressed += count > 1 ? `${count}${prev}` : prev;

    // Only use compression if it actually reduces size
    return compressed.length < json.length ? `[C]${compressed}` : json;
  } catch (error) {
    console.error('[QuotaManager] Compression error:', error);
    return JSON.stringify(obj);
  }
}

/**
 * Decompress a compressed string
 */
export function decompressValue(str: string): any {
  try {
    // Check if compressed
    if (!str.startsWith('[C]')) {
      return JSON.parse(str);
    }

    // Remove compression marker
    const compressed = str.slice(3);
    let decompressed = '';

    for (let i = 0; i < compressed.length; i++) {
      const char = compressed[i];

      if (/\d/.test(char)) {
        const count = parseInt(char, 10);
        const nextChar = compressed[i + 1];
        decompressed += nextChar.repeat(count);
        i++; // Skip next character
      } else {
        decompressed += char;
      }
    }

    return JSON.parse(decompressed);
  } catch (error) {
    console.error('[QuotaManager] Decompression error:', error);
    return null;
  }
}

/**
 * Get all storage entries with metadata for LRU eviction
 */
function getStorageEntries(): StorageEntry[] {
  const entries: StorageEntry[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith('netbond_')) {
        const value = localStorage.getItem(key);

        if (value) {
          entries.push({
            key,
            size: key.length + value.length,
            lastAccessed: Date.now() // In real implementation, track this
          });
        }
      }
    }

    // Sort by last accessed (oldest first) for LRU
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    return entries;
  } catch (error) {
    console.error('[QuotaManager] Error getting storage entries:', error);
    return [];
  }
}

/**
 * Evict least recently used entries to free up space
 */
export async function evictLRUEntries(targetBytes: number): Promise<number> {
  try {
    const entries = getStorageEntries();
    let freedBytes = 0;

    // Don't evict critical keys
    const criticalKeys = ['font_size', 'user_preferences'];

    for (const entry of entries) {
      if (freedBytes >= targetBytes) {
        break;
      }

      // Skip critical keys
      const keyName = entry.key.replace('netbond_', '');
      if (criticalKeys.includes(keyName)) {
        continue;
      }

      // Remove entry
      localStorage.removeItem(entry.key);
      freedBytes += entry.size;


    }

    return freedBytes;
  } catch (error) {
    console.error('[QuotaManager] Error evicting LRU entries:', error);
    return 0;
  }
}

/**
 * Prune entries older than specified days
 */
export function pruneEntriesOlderThan(days: number = 30): number {
  try {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith('netbond_')) {
        const value = localStorage.getItem(key);

        if (value) {
          try {
            const parsed = JSON.parse(value);

            // Check for timestamp field
            if (parsed && typeof parsed === 'object' && parsed.timestamp) {
              if (parsed.timestamp < cutoffTime) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Not JSON or no timestamp
          }
        }
      }
    }

    // Remove old entries
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {

    }

    return keysToRemove.length;
  } catch (error) {
    console.error('[QuotaManager] Error pruning old entries:', error);
    return 0;
  }
}

/**
 * Show quota warning to user if needed
 */
export async function checkAndWarnQuota(): Promise<void> {
  try {
    const percentage = await getQuotaPercentage();

    if (percentage >= QUOTA_CRITICAL_THRESHOLD * 100) {
      if (window.addToast) {
        window.addToast({
          type: 'error',
          title: 'Storage Almost Full',
          message: `Storage is ${percentage}% full. Some preferences may not save. Consider clearing old data.`,
          duration: 10000
        });
      }
    } else if (percentage >= QUOTA_WARNING_THRESHOLD * 100) {
      if (window.addToast) {
        window.addToast({
          type: 'warning',
          title: 'Storage Warning',
          message: `Storage is ${percentage}% full. You may want to clear old data soon.`,
          duration: 7000
        });
      }
    }
  } catch (error) {
    console.error('[QuotaManager] Error checking/warning quota:', error);
  }
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
