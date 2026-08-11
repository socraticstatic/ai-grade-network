import { describe, it, expect } from 'vitest';
import type { FindingKind } from './advisorModel';
import { ladderFor } from './offerCatalog';

/* Registered route paths this test checks every offer's `route` against —
 * transcribed from src/App.tsx:305-492 (the app's single <Routes> tree).
 * Only paths reachable without a dynamic segment are listed; this catalog
 * never routes to a parameterized path. */
const REGISTERED_ROUTES = [
  '/detached/vnf/:connectionId/:windowId',
  '/detached/insights',
  '/login',
  '/sso-login',
  '/onboarding',
  '/assessment',
  '/stack',
  '/no-internet',
  '/maintenance',
  '/demo',
  '/aws-workflow',
  '/brief',
  '/scorecard',
  '/create',
  '/aws-handoff',
  '/tasks',
  '/work',
  '/discover',
  '/naas',
  '/naas/home',
  '/naas/connect',
  '/naas/govern',
  '/naas/observe',
  '/naas/cost',
  '/ai',
  '/ai/teams',
  '/ai/providers',
  '/ai/keys',
  '/ai/home',
  '/ai/connect',
  '/ai/govern',
  '/ai/observe',
  '/ai/cost',
  '/connect',
  '/govern',
  '/observe',
  '/cost',
  '/ai-fabric',
  '/netops',
  '/manage',
  '/monitor',
  '/configure/*',
  '/profile',
  '/notifications',
  '/notifications/showcase',
  '/support',
  '/support/banners',
  '/glossary',
  '/news',
  '/tickets',
  '/tickets/create',
  '/tickets/:id',
  '/connections/:id/*',
  '/groups',
  '/groups/:id/*',
  '/pools/:id',
  '/hubs/:id',
  '/cloud-routers/:id',
  '/gateways/:id',
  '/vnfs/:id',
  '/',
];

const ALL_KINDS: FindingKind[] = ['untracked-ai', 'unattached-regions', 'egress-bleed', 'exposed-spof'];

describe('offerCatalog', () => {
  describe('ladderFor', () => {
    it('returns exactly 3 tiers for every FindingKind, in good/better/best order', () => {
      for (const kind of ALL_KINDS) {
        const ladder = ladderFor(kind);
        expect(ladder).toHaveLength(3);
        expect(ladder.map(t => t.framing)).toEqual(['good', 'better', 'best']);
      }
    });

    it('every tier has non-empty key/name/tagline and a route registered in the app router', () => {
      for (const kind of ALL_KINDS) {
        for (const tier of ladderFor(kind)) {
          expect(tier.key.length).toBeGreaterThan(0);
          expect(tier.name.length).toBeGreaterThan(0);
          expect(tier.tagline.length).toBeGreaterThan(0);
          expect(REGISTERED_ROUTES).toContain(tier.route);
        }
      }
    });

    it('tier keys are unique within a ladder', () => {
      for (const kind of ALL_KINDS) {
        const keys = ladderFor(kind).map(t => t.key);
        expect(new Set(keys).size).toBe(keys.length);
      }
    });

    it('untracked-ai ladder: 14-day assessment, AI Fabric governance, private AI transport', () => {
      const [good, better, best] = ladderFor('untracked-ai');
      expect(good.route).toBe('/assessment');
      expect(good.name).toMatch(/14-day assessment/i);
      expect(better.route).toBe('/ai/govern');
      expect(better.name).toMatch(/ai fabric governance/i);
      expect(best.route).toBe('/naas/connect');
      expect(best.name).toMatch(/private ai transport/i);
    });

    it('unattached-regions ladder: steer on the fabric, NetBond attach, NetBond Advanced', () => {
      const [good, better, best] = ladderFor('unattached-regions');
      expect(good.route).toBe('/naas/observe');
      expect(good.name).toMatch(/steer/i);
      expect(better.route).toBe('/naas/connect');
      expect(better.name).toMatch(/netbond attach/i);
      expect(best.route).toBe('/naas/connect');
      expect(best.name).toMatch(/netbond advanced/i);
    });

    it('egress-bleed ladder: same three destinations as unattached-regions, steer-first taglines', () => {
      const unattached = ladderFor('unattached-regions');
      const egress = ladderFor('egress-bleed');
      expect(egress.map(t => t.route)).toEqual(unattached.map(t => t.route));
      expect(egress[0].tagline.toLowerCase()).toContain('steer');
    });

    it('exposed-spof ladder: Dynamic Defense, SASE, dual-path attach', () => {
      const [good, better, best] = ladderFor('exposed-spof');
      expect(good.route).toBe('/naas/govern');
      expect(good.name).toMatch(/dynamic defense/i);
      expect(better.route).toBe('/naas/govern');
      expect(better.name).toMatch(/sase/i);
      expect(best.route).toBe('/naas/connect');
      expect(best.name).toMatch(/dual-path attach/i);
    });

    it('no offer copy references the retired brand', () => {
      // Built by concatenation, not a literal — see advisorModel.test.ts:81-85.
      const retiredBrand = ['Cloud', 'Connect'].join(' ');
      const retiredBrandPattern = new RegExp(retiredBrand, 'i');
      for (const kind of ALL_KINDS) {
        for (const tier of ladderFor(kind)) {
          expect(tier.name).not.toMatch(retiredBrandPattern);
          expect(tier.tagline).not.toMatch(retiredBrandPattern);
        }
      }
    });
  });
});
