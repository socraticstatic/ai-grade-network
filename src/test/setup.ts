import '@testing-library/jest-dom';

// Setup global test environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
} as any;

// Mock scrollTo
window.scrollTo = () => {};

// Mock addToast global function
(window as any).addToast = () => {};

// Functional in-memory localStorage (tests that need isolation call localStorage.clear())
const localStorageStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => (localStorageStore.has(key) ? localStorageStore.get(key)! : null),
  setItem: (key: string, value: string) => { localStorageStore.set(key, String(value)); },
  removeItem: (key: string) => { localStorageStore.delete(key); },
  clear: () => { localStorageStore.clear(); },
  get length() { return localStorageStore.size; },
  key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
