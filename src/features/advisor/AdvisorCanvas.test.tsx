import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { CC } from '../../engine/index';
import { applyEstateProfile } from '../../engine/estateProfile';
import { advisorFindings, advisorHeadline, headStart } from './advisorModel';
import { ladderFor } from './offerCatalog';
import { AdvisorCanvas } from './AdvisorCanvas';

/* Deliberately NO `vi.mock('react-router-dom', ...)` here — AdvisorCanvas is
 * documented to render standalone with no rail AND no router (see its own
 * doc comment and AdvisorPage.tsx's). AdvisorPage.test.tsx's module-scoped
 * useNavigate mock would silently swallow a future `useNavigate()` call
 * inside AdvisorCanvas if this test lived there instead — keeping it in its
 * own file, unmocked, is the guard: if AdvisorCanvas ever reaches for the
 * router, this file fails with a real "useNavigate used outside a Router"
 * error rather than passing on borrowed context. */

const noop = () => {};

describe('AdvisorCanvas standalone', () => {
  it("canvas-stands-alone: with no rail and no router, the ready phase renders the headline, one card per finding, and each card's complete 3-tier ladder", () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      const findings = advisorFindings(CC as never);
      const headline = advisorHeadline(CC as never);
      const hs = headStart(CC as never);
      const onAcceptTier = vi.fn();

      render(
        <AdvisorCanvas
          phase="ready"
          headStart={hs}
          onStartIntake={noop}
          providers={[]}
          providerId=""
          onSelectProvider={noop}
          provider={undefined}
          credential=""
          onCredentialChange={noop}
          credValid={false}
          onSubmitCredential={noop}
          steps={[]}
          scanIdx={0}
          headline={headline}
          findings={findings}
          onAcceptTier={onAcceptTier}
        />,
      );

      expect(screen.getByTestId('advisor-headline')).toBeInTheDocument();
      expect(findings.length).toBe(4);
      for (const f of findings) {
        const card = screen.getByTestId(`finding-card-${f.kind}`);
        fireEvent.click(within(card).getByTestId(`finding-ladder-toggle-${f.kind}`));
        for (const tier of ladderFor(f.kind)) {
          const btn = within(card).getByTestId(`finding-tier-${tier.key}`);
          expect(btn).toBeInTheDocument();
          fireEvent.click(btn);
          expect(onAcceptTier).toHaveBeenCalledWith(tier.route);
        }
      }
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });
});
