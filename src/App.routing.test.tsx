import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DiscoverEntry } from './App';
import AdvisorPage from './features/advisor/AdvisorPage';
import { CC } from './engine/index';
import { applyEstateProfile } from './engine/estateProfile';
import { advisorDone, markAdvisorDone } from './features/advisor/advisorPhase';

/**
 * Task 5 — the `/discover` first-run gate, tested at the route level rather
 * than the whole `<App/>` tree (which needs the full store/layout stack).
 * `DiscoverEntry` is exported from App.tsx specifically for this.
 *
 * `/discover/advisor` is registered here as the plain, real `AdvisorPage`
 * (not lazy-wrapped — lazy() only defers the import, it doesn't change
 * what renders) so a redirect can be asserted by its actual destination
 * content, not a router-internals inspection.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/discover" element={<DiscoverEntry />} />
        <Route path="/discover/advisor" element={<AdvisorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  applyEstateProfile(CC as never, 'acme');
  localStorage.clear();
});

describe('discover routing — the advisor first-run gate', () => {
  it('meridian with no done flag: /discover redirects to /discover/advisor', async () => {
    applyEstateProfile(CC as never, 'meridian');
    localStorage.setItem('estateProfile', 'meridian'); // resolveProfile reads this, not the CC swap
    renderAt('/discover');
    expect(await screen.findByRole('heading', { name: 'Your AT&T advisor' })).toBeInTheDocument();
  });

  it('acme, already done: /discover renders the tree, not the advisor', async () => {
    markAdvisorDone('acme');
    renderAt('/discover');
    expect(await screen.findByRole('button', { name: 'AWS' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your AT&T advisor' })).not.toBeInTheDocument();
  });

  it('meridian, already done: /discover renders the tree, not the advisor', async () => {
    applyEstateProfile(CC as never, 'meridian');
    localStorage.setItem('estateProfile', 'meridian');
    markAdvisorDone('meridian');
    renderAt('/discover');
    expect(screen.queryByRole('heading', { name: 'Your AT&T advisor' })).not.toBeInTheDocument();
    expect(advisorDone('meridian')).toBe(true);
  });

  it('direct URL /discover/advisor always renders, regardless of the done flag', () => {
    markAdvisorDone('acme'); // done — a gate on this route would redirect away
    renderAt('/discover/advisor');
    expect(screen.getByRole('heading', { name: 'Your AT&T advisor' })).toBeInTheDocument();
  });

  it('direct URL /discover/advisor renders even with no flag at all', () => {
    renderAt('/discover/advisor');
    expect(screen.getByRole('heading', { name: 'Your AT&T advisor' })).toBeInTheDocument();
  });
});
