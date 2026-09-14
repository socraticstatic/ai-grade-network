# Quick Start Guide

## AT&T NetBond® Advanced - PWA Edition

Fast reference for developers working with the app.

---

## Install & Run

```bash
# Install dependencies
npm install

# Start development server (with PWA)
npm run dev
# → Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build locally
npm run preview
# → Opens at http://localhost:4173
```

---

## PWA Development

### Test PWA Locally

```bash
npm run build
npm run preview
```

Open Chrome DevTools → Application → Service Workers to inspect.

### Update Service Worker

Edit `vite.config.ts` → `VitePWA()` configuration.

Service worker regenerates on each build automatically.

### Clear Cache During Development

```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

---

## Key Commands

```bash
npm run dev                # Dev server with HMR + PWA
npm run build              # Production build with PWA
npm run build:pwa          # Explicit PWA build
npm run build:gh-pages     # GitHub Pages deployment build
npm run preview            # Preview production build
npm run test               # Run test suite
npm run test:coverage      # Tests with coverage
npm run test:a11y          # Accessibility tests
npm run lint               # ESLint
npm run deploy             # Deploy to GitHub Pages
```

---

## Project Structure

```
src/
├── components/           # UI components
│   ├── common/          # Shared components (Button, Card, etc.)
│   ├── connection/      # Connection management
│   ├── monitoring/      # Monitoring dashboard
│   ├── wizard/          # Connection wizard
│   └── control-center/  # Custom dashboard
├── hooks/               # Custom React hooks
├── store/               # Zustand state management
│   └── slices/         # Feature-based state slices
├── styles/              # Global styles + design tokens
├── types/               # TypeScript definitions
└── utils/               # Helper functions

public/
├── manifest.json        # PWA manifest
├── icon-*.png          # App icons (8 sizes)
└── offline.html        # Offline fallback page
```

---

## Data & Persistence

This app has no backend. All state lives in the browser via Zustand stores
persisted to `localStorage`, seeded with in-memory sample/mock data for demo
scenarios.

### Sample Data Entities

- `connections` - Network connections
- `containers` - Container configurations
- `vnfs` - Virtual Network Functions
- `pools` - Connection pools
- `detached_windows` - Detached table state

---

## Common Tasks

### Add New Component

```typescript
// src/components/myfeature/MyComponent.tsx
import { useState } from 'react';

export function MyComponent() {
  return <div>My Component</div>;
}
```

### Add to Store

```typescript
// src/store/slices/myFeatureSlice.ts
export interface MyFeatureSlice {
  data: string[];
  setData: (data: string[]) => void;
}

export const createMyFeatureSlice = (set) => ({
  data: [],
  setData: (data) => set({ data })
});
```

### Add Route

```typescript
// src/App.tsx
<Route path="/my-feature" element={
  <LazyMyFeature />
} />
```

### Add Icon

```typescript
import { Icon } from 'lucide-react';

<Icon className="w-5 h-5" />
```

Browse icons: https://lucide.dev/icons

---

## Styling

### Using Design Tokens

```typescript
// Tailwind classes using design tokens
<div className="bg-brand-blue text-white">
  <h1 className="text-xl font-bold">Title</h1>
</div>
```

### Available Tokens

```css
/* Colors */
--color-brand-blue: #0057b8;
--color-brand-darkBlue: #003d82;
--color-brand-lightBlue: #009fdb;

/* Spacing */
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;

/* Typography */
--font-family: 'ATT Aleck Sans', sans-serif;
```

See `src/styles/tokens.css` for full list.

---

## Testing

### Run Tests

```bash
npm run test              # All tests
npm run test:coverage     # With coverage report
npm run test:a11y         # Accessibility tests
```

### Write Tests

```typescript
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('My Component')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Service Worker Not Updating

```javascript
// Force update in console
navigator.serviceWorker.getRegistration()
  .then(reg => reg.update());
```

### Clear All Cache

```bash
# In Chrome DevTools
Application → Clear Storage → Clear site data
```

### PWA Not Installing

- Ensure HTTPS (or localhost)
- Check manifest.json is accessible
- Verify service worker registered
- Check console for errors

### Build Fails

```bash
# Clean build artifacts
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## Useful Links

- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
- **Workbox Docs**: https://developers.google.com/web/tools/workbox
- **PWA Builder**: https://www.pwabuilder.com/

---

## Performance Tips

1. **Lazy Load Heavy Components**
   ```typescript
   const Heavy = lazy(() => import('./Heavy'));
   ```

2. **Use Suspense Boundaries**
   ```typescript
   <Suspense fallback={<Loading />}>
     <Heavy />
   </Suspense>
   ```

3. **Memoize Expensive Calculations**
   ```typescript
   const result = useMemo(() => expensiveCalc(), [deps]);
   ```

4. **Optimize Images**
   - Use WebP format
   - Provide multiple sizes
   - Lazy load off-screen images

---

## Deployment Checklist

Before deploying to production:

- [ ] Replace placeholder icons in `public/`
- [ ] Update `manifest.json` with production URL
- [ ] Set correct `base` in `vite.config.ts`
- [ ] Run full test suite (`npm test`)
- [ ] Run accessibility tests (`npm run test:a11y`)
- [ ] Build and test locally (`npm run build && npm run preview`)
- [ ] Check Lighthouse scores in DevTools
- [ ] Test PWA installation on multiple devices
- [ ] Verify offline functionality works

---

## Getting Help

1. **Check Documentation**
   - README.md - Project overview
   - PWA_INSTALLATION.md - User installation guide
   - PWA_SUMMARY.md - Technical PWA details
   - CONTRIBUTING.md - Contribution guidelines

2. **Debug with DevTools**
   - Console - JavaScript errors
   - Network - API calls and caching
   - Application - Service worker and storage
   - Lighthouse - Performance audit

3. **Common Issues**
   - Service worker not updating? Hard refresh (Ctrl+Shift+R)
   - Styles not applying? Check Tailwind config
   - Route not working? Verify HashRouter paths
   - Data not persisting? Check the browser's localStorage (Application tab)

---

**Pro Tip**: Use React DevTools and Redux DevTools extensions for easier debugging.

Happy coding! 🚀
