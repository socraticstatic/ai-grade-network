import { StateCreator } from 'zustand';
import { safeGetItem, safeSetItem } from '../../utils/localStorageUtils';

/**
 * Font size preset values (percentage)
 */
export const FONT_SIZES = {
  SMALL: 87.5,      // 14px base
  NORMAL: 100,      // 16px base
  LARGE: 112.5,     // 18px base
  EXTRA_LARGE: 125  // 20px base
} as const;

export type FontSizeValue = typeof FONT_SIZES[keyof typeof FONT_SIZES];

export interface FontSizeSlice {
  fontSize: number;
  setFontSize: (size: number) => void;
  resetFontSize: () => void;
  getFontSizeLabel: () => string;
}

const STORAGE_KEY = 'font_size';
const DEFAULT_FONT_SIZE = FONT_SIZES.NORMAL;
const MIN_FONT_SIZE = 50;
const MAX_FONT_SIZE = 200;

/**
 * Load font size from localStorage
 */
function loadFontSize(): number {
  try {
    const stored = safeGetItem<number>(STORAGE_KEY);

    if (stored !== null && typeof stored === 'number') {
      // Validate range
      if (stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE) {
        return stored;
      }
    }

    return DEFAULT_FONT_SIZE;
  } catch (error) {
    console.error('[FontSize] Error loading from storage:', error);
    return DEFAULT_FONT_SIZE;
  }
}

/**
 * Save font size to localStorage with debouncing
 */
let saveTimeout: NodeJS.Timeout | null = null;

function saveFontSize(size: number): void {
  // Debounce saves to prevent excessive writes
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    safeSetItem(STORAGE_KEY, size);
    saveTimeout = null;
  }, 200);
}

/**
 * Apply font size to document
 */
function applyFontSize(size: number): void {
  try {
    const scale = size / 100;

    // Use requestAnimationFrame for smooth application
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--font-scale', scale.toString());
      document.documentElement.setAttribute('data-font-size', size.toString());
    });
  } catch (error) {
    console.error('[FontSize] Error applying font size:', error);
  }
}

/**
 * Get label for font size value
 */
function getFontSizeLabel(size: number): string {
  switch (size) {
    case FONT_SIZES.SMALL:
      return 'Small';
    case FONT_SIZES.NORMAL:
      return 'Normal';
    case FONT_SIZES.LARGE:
      return 'Large';
    case FONT_SIZES.EXTRA_LARGE:
      return 'Extra Large';
    default:
      return `${size}%`;
  }
}

/**
 * Create font size slice
 */
export const createFontSizeSlice: StateCreator<FontSizeSlice> = (set, get) => {
  // Load initial font size and apply to DOM
  const initialSize = loadFontSize();
  applyFontSize(initialSize);

  return {
    fontSize: initialSize,

    setFontSize: (size: number) => {
      // Validate range
      if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
        console.warn(`[FontSize] Size ${size} out of range (${MIN_FONT_SIZE}-${MAX_FONT_SIZE})`);
        return;
      }

      // Update state
      set({ fontSize: size });

      // Apply to DOM
      applyFontSize(size);

      // Save to localStorage (debounced)
      saveFontSize(size);

      // Show feedback toast
      if (window.addToast) {
        const label = getFontSizeLabel(size);
        window.addToast({
          type: 'success',
          title: 'Font Size Updated',
          message: `Font size set to ${label}`,
          duration: 2000
        });
      }


    },

    resetFontSize: () => {
      const { setFontSize } = get();
      setFontSize(DEFAULT_FONT_SIZE);

      if (window.addToast) {
        window.addToast({
          type: 'info',
          title: 'Font Size Reset',
          message: 'Font size reset to Normal',
          duration: 2000
        });
      }
    },

    getFontSizeLabel: () => {
      const { fontSize } = get();
      return getFontSizeLabel(fontSize);
    }
  };
};

/**
 * Listen for storage events to sync across tabs
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === `netbond_${STORAGE_KEY}` && event.newValue) {
      try {
        const newSize = JSON.parse(event.newValue);

        if (typeof newSize === 'number' && newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
          applyFontSize(newSize);

        }
      } catch (error) {
        console.error('[FontSize] Error syncing from storage event:', error);
      }
    }
  });
}
