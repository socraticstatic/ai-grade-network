# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: AT&T NetBond SDCI (React + Vite + TypeScript)

Quick commands

- Install deps: npm install
- Start dev server (Vite): npm run dev
- Build production: npm run build
- Preview production build: npm run preview
- Lint (ESLint, TS-aware): npm run lint
- Test (Vitest, JSDOM): npm run test
- Test with coverage: npm run test:coverage
- Accessibility tests (pa11y-ci; auto-start dev server): npm run test:a11y
- Bundle analysis (visualize): npm run build:analyze or npm run analyze
- Clean build artifacts: npm run clean
- Deploy to GitHub Pages: npm run deploy

Run a single test or test file

- By file path:
  ```bash path=null start=null
  npx vitest run src/components/navigation/MainNav.test.tsx
  ```
- By name/pattern (substring match):
  ```bash path=null start=null
  npx vitest run -t "renders navigation"
  ```
- Watch an individual suite during development:
  ```bash path=null start=null
  npx vitest src/components/common/Button.test.tsx
  ```

Environment and prerequisites

- Node.js >= 18, npm >= 9 (see README.md)
- Dev server defaults to http://localhost:5173
- Production base path for GitHub Pages is configured; production builds serve under /att-netbond-sdci/

Important scripts and tooling (from package.json)

- Vite (build, dev, preview) with React plugin
- Vitest for unit tests (JSDOM). Setup file is configured via vitest.config.ts (test.setupFiles)
- ESLint with @typescript-eslint
- TailwindCSS + PostCSS/Autoprefixer
- pa11y-ci for accessibility checks (wired via start-server-and-test)
- gh-pages for static deploys to /dist

Deployment notes

- GitHub Pages: npm run deploy builds with base=/att-netbond-sdci/ and publishes dist
- Vite base is set dynamically in vite.config.ts: 
  - Production: /att-netbond-sdci/
  - Development: /

CI/CD and quality gates (from README.md)

- CI (examples referenced in README): tests, lint, build
- Quality expectations: tests pass, ESLint no errors, TypeScript passes, accessibility checks, bundle size < 5MB, Lighthouse performance > 80, security audit passing

High-level architecture and structure

Frontend stack

- React 18 + TypeScript
- Vite for build/dev, with granular manualChunks configuration for code-splitting
- Routing via React Router v6
- State management via Zustand with feature slices
- Tailwind CSS for styling; component-oriented UI

Application composition and routing (big picture)

- src/App.tsx defines the top-level routing and feature modules. It wraps the app with providers and layout components and lazy-loads feature areas. Key patterns:
  - Providers: NavigationStateProvider, ThemeProvider
  - Shell: DashboardLayout with SubNav per route, Footer, ToastContainer, MobileMenu, SmartAssistant
  - Routes are lazily loaded using React.lazy and Suspense, wrapped with AsyncBoundary and ErrorBoundary for robust fallback/error handling.
  - Mobile-aware monitoring route: selects a compact dashboard on small screens.
  - The main management view (/manage) uses a tabbed interface (ConnectionTabs) to switch between connections, groups, marketplace, and control center.

State management (Zustand slices)

- src/store/slices/connectionSlice.ts
  - Holds connections[] and selectedConnection.
  - Async-style CRUD operations (add/update/remove/fetch) simulate latency and perform basic validation (e.g., unique name on add/update).
  - Side effects surface user feedback via window.addToast, standardizing success/error messaging.
  - New connections default to a safe, inactive baseline with performance/security defaults applied.
- src/store/slices/alertSlice.ts
  - Simple alert queue with add/remove/clear operations.

UI/feature modules (selected high-level areas)

- Connections
  - Grid, details, tabs, overflow menus, visualization components under src/components/connection and the ConnectionGrid in src/components.
- Groups
  - Management pages and details under src/components/ManageGroupsPage.tsx, GroupGrid.tsx, GroupDetailsPage.tsx, and src/components/group-detail.
- Control Center
  - Modular dashboard with a grid and widgets (ControlCenterManager, WidgetGrid/Drawer) that integrates drag-and-drop (DnD Kit) and lazy chart loading.
- Monitoring
  - Desktop and mobile dashboards, with charting through Chart.js via react-chartjs-2; mobile-first variants exist for small viewports.
- Configure hub
  - src/components/configure provides billing, user management, reporting, and connection settings panes.

Performance and code-splitting strategy (from vite.config.ts)

- Manual chunks separate frequently used libs: react, router, charts, dnd, motion, icons by category, and store.
- Feature-based chunks partition larger areas: monitoring, wizard, network-designer, configure, control-center, groups.
- Production build removes console.* calls (esbuild/terser) and enables tree-shaking, with stricter chunk size warnings.

Accessibility and error handling

- AsyncBoundary and ErrorBoundary wrap lazily loaded routes to provide consistent loading and error states.
- Accessibility testing is automated via pa11y-ci; UI components include focus and navigation primitives (see src/components/common/* for loading spinners, dialogs, modals, etc.).

What’s important from README.md (condensed)

- Scripts listed above are the source of truth for build, lint, test, coverage, a11y, analysis, and deploy.
- Deployment is oriented around GitHub Pages with a production base path.
- Quality gates listed under CI/CD align with the commands provided here.

Notes for future Warp agents

- Prefer executing npm scripts over ad-hoc commands.
- When adding new routes or large UI areas, follow the existing pattern: lazy load modules, wrap with AsyncBoundary/Suspense, and ensure manualChunks grouping remains coherent.
- For state, add new feature slices under src/store/slices and compose them in the central store (see existing slices for conventions).

