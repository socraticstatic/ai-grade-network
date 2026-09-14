> ## NaaS storefront: `ATT-NaaS-Storefront/`
>
> The current storefront (the static `.dc.html` prototype, same content as
> [socraticstatic/naas-design-scope](https://github.com/socraticstatic/naas-design-scope))
> lives in **`ATT-NaaS-Storefront/`** at the root of this repo, and as
> `ATT-NaaS-Storefront-20260914-0752.zip`. Serve that folder over HTTP to run it;
> see `ATT-NaaS-Storefront/README.md`. The React application below is unchanged.

# AT&T NetBond SDCI - Cloud Connectivity Management Platform

[![CI/CD Pipeline](https://github.com/your-username/att-netbond-sdci/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/att-netbond-sdci/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/your-username/att-netbond-sdci/actions/workflows/auto-deploy.yml/badge.svg)](https://github.com/your-username/att-netbond-sdci/actions/workflows/auto-deploy.yml)
[![Lighthouse Performance](https://github.com/your-username/att-netbond-sdci/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/your-username/att-netbond-sdci/actions/workflows/lighthouse.yml)

## Overview

AT&T NetBond SDCI (Software-Defined Cloud Interconnect) is a comprehensive cloud connectivity management platform that enables enterprises to establish secure, high-performance connections between their networks and major cloud service providers. This application provides a unified interface for managing, monitoring, and configuring network connections across multiple cloud environments.

**✨ Now available as a Progressive Web App (PWA)** - Install on any device and run independently like a native application. Works offline, auto-updates, and provides a seamless native-like experience.

---

## ⚡ Important: Functional Ideation Prototype

**This repository contains a React/TypeScript prototype for functional ideation and UX validation. This is NOT production code.**

- **Purpose**: Rapid prototyping and concept validation
- **Production**: All production features are implemented in Angular
- **Process**: See [FUNCTIONAL_IDEATION_PROCESS.md](./FUNCTIONAL_IDEATION_PROCESS.md) for complete workflow

**Quick Reference**: [PROCESS_FLOW_QUICK_REFERENCE.md](./PROCESS_FLOW_QUICK_REFERENCE.md)

---

## NetBond Advanced Max — LMCC

**AT&T NetBond Advanced Max** is the high-resiliency tier of NetBond, built on the AWS LMCC (Locally Managed Cross-Connect) interconnect architecture. It provisions four independent hosted connections across two diverse datacenter sites within a metro, delivering 99.99%+ uptime through path-level failover rather than connection-level redundancy.

### Architecture

- **4 paths** per connection — 4 separate Juniper MX-304 IPEs, 100G physical ports
- **2 diverse sites** per metro — Site A + Site B, never the same facility
- **BFD failover** — 300ms interval × 3 multiplier = **900ms detection**
- **BGP/BFD sessions** enable route exchange; billing triggers on BGP Established (GA)

### Phase Status

| Phase | Date | Metros | Bandwidth | Billing |
|-------|------|--------|-----------|---------|
| Preview | June 30, 2026 | San Jose, CA only | 1 Gbps (fixed) | Manual |
| GA | November 16, 2026 | San Jose, CA + Ashburn, VA | 1 / 2 / 5 / 10 / 25 / 50 / 100 Gbps | Auto (BGP trigger) |

LA Metro is infrastructure-pending (fiber installation in progress) and is not available in Preview.

### Two Flows

**Flow 03 — AT&T Initiates:** Customer creates connection in NetBond → wizard generates ActivationKey → customer carries key to AWS Direct Connect Console → AWS validates and drives negotiation as Active Provider.

**Flow 04 — AWS Initiates:** Customer starts in AWS Direct Connect Console with `deferConnectionProvisioning=true` → receives ActivationKey → pastes into NetBond → AT&T validates and provisions.

Status progression: **Key Generated** (Flow 03 only) → Key Accepted → Negotiating Parameters → BGP Forming → **Live**

### Demo vs Product

| Component | Purpose | Ships to customers? |
|-----------|---------|-------------------|
| `NetBondMaxBanner.tsx` | Customer-facing product — handles full journey (choice → key → live) | **Yes** |
| `AWSWorkflowPage.tsx` + `SecondaryAssets.tsx` | Requirements page at `/demo` — stakeholder reference only | No |
| `LMCCKickoffModal.tsx` + `LMCCOnboardingDrawer.tsx` | Demo orchestration components used inside requirements page | No |

The requirements page (`/demo`) opens with a "Design Proof of Concept" disclaimer. Everything behind it is requirements content, not product UI.

### Authoritative Source

All copy, flows, constraints, and data come from the **LMCC Bible** (`project_lmcc_bible.md` in session memory). The Design Brief (04/21/2026) is design authority; the PRD (04/09/2026) is engineering authority. When they conflict, the Design Brief wins. External sources (AWS docs, etc.) are subordinate to both.

See [LMCC.md](./LMCC.md) for session-to-session context and dev rules.

---

## Key Features

### Connection Management
- **Multi-Cloud Support**: Connect to AWS, Azure, Google Cloud, and other providers
- **Connection Types**: Support for Internet to Cloud, Container, Direct Connect, and more
- **Visual Network Designer**: Interactive canvas for designing network topologies
- **Connection Wizard**: Step-by-step guided connection creation
- **API Integration**: Create connections programmatically via API

### Monitoring & Analytics
- **Real-time Metrics**: Monitor latency, packet loss, jitter, and bandwidth utilization
- **Performance Dashboard**: Comprehensive view of network health and performance
- **Alerts & Notifications**: Proactive notifications for performance issues
- **Historical Data**: Track performance trends over time
- **Custom Reports**: Generate tailored reports for specific metrics

### Control Center
- **Customizable Dashboard**: Drag-and-drop widgets for personalized monitoring
- **Widget Library**: Extensive collection of widgets for different metrics and functions
- **Layout Persistence**: Save and restore dashboard configurations

### Configuration & Administration
- **User Management**: Role-based access control for different user types
- **Pool Management**: Organize connections into logical pools
- **Billing Management**: Track costs and usage across connections
- **Policy Configuration**: Define and manage network policies
- **System Settings**: Configure global system preferences

### Security Features
- **End-to-End Encryption**: Secure data transmission
- **DDoS Protection**: Built-in protection against distributed denial-of-service attacks
- **Compliance Reporting**: Generate reports for security compliance
- **Access Control**: Fine-grained permissions for connection management

### Visualization Options
- **Grid View**: Card-based visualization of connections
- **List View**: Detailed tabular view with customizable columns
- **Topology View**: Network diagram visualization of connections
- **Detached Tables**: Open tables in separate windows for multi-monitor workflows

### Progressive Web App (PWA)
- **Installable**: Add to home screen on desktop and mobile devices
- **Offline Capable**: Works without internet connection (cached content)
- **Auto-Updates**: Automatically checks for new versions every hour
- **Native Feel**: Runs in standalone window without browser UI
- **Fast Loading**: Service worker caching for instant repeat loads
- **App Shortcuts**: Quick access to Create, Monitor, and Manage pages

## Technical Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6 with HashRouter (file:// protocol support)
- **State Management**: Zustand for global state
- **UI Components**: Custom component library with Tailwind CSS
- **Charts & Visualization**: Chart.js with React-ChartJS-2
- **Icons**: Lucide React
- **Drag & Drop**: DND Kit for drag-and-drop functionality
- **PWA**: Vite PWA plugin with Workbox service worker

### Data & State
- **State management**: Zustand
- **Persistence**: Browser localStorage (no backend service)
- **Sample data**: In-memory fixtures driving the demo scenarios

### Accessibility
- **WCAG 2.1 AA Compliance**: 98% conformance
- **Section 508 Compliance**: 97% conformance
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: ARIA attributes and semantic HTML
- **Focus Management**: Proper focus trapping in modals and drawers

### Performance Optimizations
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Manual chunk splitting for vendor libraries
- **Service Worker**: Workbox caching strategies for instant repeat loads
- **Precaching**: 59 static resources (2.2 MB) cached on install
- **Responsive Design**: Optimized for all device sizes
- **Reduced Motion**: Respects user preferences for reduced motion
- **Tree Shaking**: Automatic removal of unused code

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/att/netbond.git

# Navigate to the project directory
cd netbond

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start the development server (with PWA enabled)
- `npm run build` - Build for production (includes PWA)
- `npm run build:pwa` - Explicit PWA production build
- `npm run build:gh-pages` - Build for GitHub Pages deployment
- `npm run preview` - Preview production build locally
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:a11y` - Run accessibility tests
- `npm run lint` - Lint the codebase
- `npm run deploy` - Deploy to GitHub Pages (manual)

## Deployment

### 🚀 Automatic Deployment (Recommended)

**The application automatically deploys to GitHub Pages when you push to `main`.**

**Quick Start:**
1. Enable GitHub Pages: Settings → Pages → Source: "GitHub Actions"
2. Push changes: `git push origin main`
3. Wait 1-3 minutes
4. Your site is live!

**Your deployment URL:**
```
https://your-username.github.io/NetBond_Advanced/
```

**📖 Complete Guides:**
- **Quick Start**: [DEPLOY_QUICK_START.md](./DEPLOY_QUICK_START.md) - Get started in 2 minutes
- **Full Guide**: [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md) - Complete documentation with troubleshooting

**Monitor deployments:** Check the Actions tab in your repository to see build and deployment status.

### Manual Deployment (Optional)

To manually deploy to GitHub Pages:

```bash
npm run deploy
```

### PWA Installation

Once deployed, users can install the app on their devices:

- **Desktop (Chrome/Edge)**: Click install icon (⊕) in address bar
- **iOS**: Safari → Share → "Add to Home Screen"
- **Android**: Chrome → Menu → "Install app"

See [PWA_INSTALLATION.md](./PWA_INSTALLATION.md) for detailed installation instructions.

### Deployment Requirements

- **HTTPS Required**: PWA features require HTTPS (GitHub Pages provides this automatically)
- **Base Path**: Configure `base` in `vite.config.ts` for subdirectory deployments
- **Icons**: Replace placeholder icons in `public/` with production assets before deploying

## CI/CD Pipeline

### Workflows
- **CI Pipeline** (`.github/workflows/ci.yml`): Runs tests, linting, and builds
- **GitHub Pages Deploy** (`.github/workflows/gh-pages.yml`): Automated deployment on push to main
- **Code Quality** (`.github/workflows/code-quality.yml`): Advanced quality checks
- **Lighthouse Audit** (`.github/workflows/lighthouse.yml`): Performance monitoring
- **Sync** (`.github/workflows/sync.yml`): Syncs changes from external environments

### Quality Gates
- ✅ All tests must pass
- ✅ ESLint validation with zero errors
- ✅ TypeScript compilation without errors
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Bundle size under 5MB
- ✅ Performance score above 80
- ✅ Security audit passing

## Project Structure

```
src/
├── components/         # UI components
│   ├── common/         # Reusable UI components
│   ├── connection/     # Connection-specific components
│   ├── control-center/ # Control center dashboard components
│   ├── pool/           # Pool management components
│   ├── pool-detail/    # Pool detail components
│   ├── monitoring/     # Monitoring and analytics components
│   ├── network-designer/ # Network topology designer
│   ├── navigation/     # Navigation components
│   ├── wizard/         # Connection creation wizard
│   └── ...
├── hooks/              # Custom React hooks
├── store/              # Zustand store and slices
│   └── slices/         # Store slices for different features
├── styles/             # Global styles and design tokens
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── ...
```

## Connection Creation Methods

The platform offers three different ways to create network connections:

1. **Step-by-Step Wizard**: A guided, user-friendly approach with detailed configuration options
2. **Visual Designer**: Interactive canvas for designing complex network topologies
3. **API Toolbox**: Advanced option for creating connections using JSON configuration and API endpoints

## Pool Management

Pools allow you to organize connections and users for easier management:

- **Pool Types**: Business, Department, Project, Team, and Custom
- **Pool Features**: Addresses, Contacts, Permissions, Billing, Performance metrics
- **Connection Management**: Associate connections with specific pools
- **Member Management**: Add users with different permission levels

## Monitoring Dashboard

The monitoring dashboard provides comprehensive visibility into your network:

- **Overview**: Summary of all connection metrics
- **Detailed Metrics**: In-depth performance analysis
- **Alerts**: Real-time notification of issues
- **Logs**: Comprehensive logging of events and activities
- **Network Analyzer**: Advanced tools for troubleshooting
- **Reports**: Generate and schedule detailed reports

## Customization

### Theme Customization
The application uses a design token system that can be customized in `src/styles/tokens.css`. This allows for consistent styling across the application while enabling easy theme changes.

### Widget Customization
The Control Center dashboard supports custom widgets that can be added to the `src/components/control-center/widgets/` directory.

## Accessibility

AT&T NetBond SDCI is designed with accessibility in mind, following WCAG 2.1 AA guidelines. Key features include:

- Semantic HTML structure
- ARIA attributes for interactive elements
- Keyboard navigation support
- Focus management for modals and drawers
- Color contrast compliance
- Screen reader announcements for dynamic content

## Browser Support

### Full Support (PWA + All Features)
- Chrome 90+ (Desktop & Mobile)
- Edge 90+ (Desktop & Mobile)
- Samsung Internet 14+
- Opera 76+

### Partial PWA Support
- Safari 15.4+ (iOS - Add to Home Screen only)
- Firefox (Latest 2 versions - Offline caching, no install)

### Minimum Requirements
- Modern browser with ES2020+ support
- JavaScript enabled
- Cookies/LocalStorage enabled
- 2.4 MB available storage for cached assets

## Documentation

### Process & Workflow
- [Functional Ideation Process](./FUNCTIONAL_IDEATION_PROCESS.md) - Complete workflow from idea to production (includes quick reference, visual diagrams, and detailed process documentation)

### Technical Documentation
- [PWA Installation Guide](./PWA_INSTALLATION.md) - User guide for installing the app
- [PWA Technical Summary](./PWA_SUMMARY.md) - Implementation details and features
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project
- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions
- [Site Map](./SITE_MAP.md) - Complete application structure and routes

## Auth

There is none. The app opens straight onto the product.

This is a static GitHub Pages prototype: the JS bundle is public regardless,
so a login screen gated nothing while costing every visitor a wall. The
previous email gate, its OTP flow, and the third-party auth dependency were
removed on 2026-09-14.

## License

Copyright © 2025 AT&T Intellectual Property. All rights reserved.
