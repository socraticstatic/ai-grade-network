import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { CC } from '../../engine';
import { GovernPage } from './GovernPage';

/* A sibling that reads the same router's query string back, so a test can
   assert on the URL without reaching into MemoryRouter internals. */
function ParamsProbe() {
  const [params] = useSearchParams();
  return <div data-testid="params-probe">{params.toString()}</div>;
}

const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <GovernPage />
  </MemoryRouter>
);

/* The tab is in the URL because Groups is a DESTINATION: the guided tour
   routes straight at it, and Discover's confirmation links to it. A beat
   pointing at the Groups table on a page that always opens on Policies is a
   beat that spotlights nothing. */
test('/govern?tab=groups opens on the Groups table, not on Policies', () => {
  const { container } = render(at('/govern?tab=groups'));
  expect(container.querySelector('[data-tour="govern-groups"]')).not.toBeNull();
  expect(container.querySelector('[data-tour="govern-rules"]')).toBeNull();
});

test('/govern?tab=policies and a bare /govern both open on Policies', () => {
  for (const path of ['/naas/govern?tab=policies', '/naas/govern', '/naas/govern?tab=nonsense']) {
    const { container, unmount } = render(at(path));
    expect(
      container.querySelector('[data-tour="govern-rules"]'),
      `${path} did not open on Policies`,
    ).not.toBeNull();
    unmount();
  }
});

test('switching tabs preserves other query params instead of replacing the whole string', () => {
  render(
    <MemoryRouter initialEntries={['/govern?tab=groups&foo=bar']}>
      <GovernPage />
      <ParamsProbe />
    </MemoryRouter>,
  );
  expect(screen.getByTestId('params-probe').textContent).toContain('foo=bar');

  // Switching to Policies used to call setParams({}), wiping every param —
  // not just `tab`.
  fireEvent.click(screen.getByRole('button', { name: /^policies/i }));
  const afterPolicies = screen.getByTestId('params-probe').textContent ?? '';
  expect(afterPolicies).toContain('foo=bar');
  expect(afterPolicies).not.toMatch(/\btab=/);

  // Switching to Posture used to call setParams({ tab: 'posture' }), which
  // constructs a brand-new query string and drops `foo` the same way.
  fireEvent.click(screen.getByRole('button', { name: /^posture/i }));
  const afterPosture = screen.getByTestId('params-probe').textContent ?? '';
  expect(afterPosture).toContain('foo=bar');
  expect(afterPosture).toContain('tab=posture');
});

/* Row 58 of the phase-0 metric audit: the Policies tab badge is a bare
   violations count sitting on a tab labelled "Policies" — with 8 rules and
   7 violations, "7" reads as a wrong policy count. The number is right; it
   needs the accessible name/title the badge never had. */
test('the Policies tab badge names itself as open violations, not a policy count', () => {
  render(at('/naas/govern'));
  const violations = CC.violations() as unknown[];
  expect(violations.length).toBeGreaterThan(0);
  expect(screen.getByTitle(`${violations.length} open violations`)).toBeInTheDocument();
});

/* Row 64 of the phase-0 metric audit: "0 / 5 inserted" used deployment
   vocabulary for a posture claim. Same fraction, product noun. */
test('service insertion states coverage in the fabric, not deployment jargon', () => {
  render(at('/naas/govern'));
  const services = CC.serviceCatalog() as { inserted: boolean }[];
  const inserted = services.filter(s => s.inserted).length;
  expect(
    screen.getByText(`${inserted} of ${services.length} inspection services in the path`),
  ).toBeInTheDocument();
});

test('lists rules and enforcing one changes engine state (violations or enforced count)', () => {
  render(<MemoryRouter><GovernPage /></MemoryRouter>);
  const rules = CC.ruleList();
  expect(rules.length).toBeGreaterThan(0);
  const unenforced = rules.find(r => !CC.ruleEnforced(r));
  if (unenforced) {
    const before = CC.ruleList().filter(r => CC.ruleEnforced(r)).length;
    // Row actions live behind an overflow menu, so walk the real path:
    // open the row's menu, then choose Enforce.
    fireEvent.click(screen.getAllByRole('button', { name: /more options/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^enforce$/i }));
    expect(CC.ruleList().filter(r => CC.ruleEnforced(r)).length).toBeGreaterThan(before);
  }
});
