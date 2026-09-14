import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { GovernPage } from './GovernPage';

/* NOTE ON ORDER: the engine is a shared singleton and mutations persist
   between tests in this file. Every read-only assertion runs before the one
   test that creates a group. */

function openGroups() {
  render(
    <MemoryRouter>
      <GovernPage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /^Groups/ }));
}

function row(name: string) {
  return screen.getByRole('row', { name: new RegExp(name, 'i') });
}

test('Groups is a tab on Govern, badged with a count the engine derives', () => {
  render(
    <MemoryRouter>
      <GovernPage />
    </MemoryRouter>,
  );
  const tab = screen.getByRole('button', { name: /^Groups/ });
  expect(tab).toBeInTheDocument();
  expect(tab).toHaveTextContent(String(CC.groupList().length));
});

test('lists every seeded group with what it resolves to RIGHT NOW, named not just counted', () => {
  openGroups();

  // west-branches: 3 literal branch members
  const branches = row('West branches');
  const branchCount = CC.resolveGroup('west-branches').count;
  expect(branchCount).toBe(3);
  expect(branches).toHaveTextContent(String(branchCount));
  // named, so a person can recognise one — not a bare count
  expect(branches).toHaveTextContent('San Jose campus');

  // west-workloads: a Region:west predicate over VPCs
  const workloads = row('West workloads');
  const workloadCount = CC.resolveGroup('west-workloads').count;
  expect(workloadCount).toBe(6);
  expect(workloads).toHaveTextContent(String(workloadCount));
  expect(workloads).toHaveTextContent('vpc-west-01');
});

test('states how each group is DEFINED in language, not as a data structure', () => {
  openGroups();

  expect(row('West workloads')).toHaveTextContent('anything where Region is west');
  expect(row('West branches')).toHaveTextContent('3 branch sites picked by hand');

  const table = screen.getByRole('table', { name: /groups/i });
  const text = table.textContent ?? '';
  expect(text).not.toContain('cloudTag');
  expect(text).not.toContain('[object Object]');
  expect(text).not.toContain('undefined');
});

/* M5 — the seeded west-workloads desc used to restate the generated
   sentence ("Anything tagged Region=west" next to "anything where Region is
   west") in the WRONG vocabulary: "tagged" is the governanceTag phrasing
   groupLanguage deliberately reserves, and this predicate is a cloudTag.
   The fixed desc has to say something the generated sentence does not —
   same pattern as west-branches' "Bay Area premises", which complements
   "3 branch sites picked by hand" instead of re-describing the rule. */
test('the seeded west-workloads description complements the generated sentence rather than repeating it', () => {
  openGroups();
  const workloads = row('West workloads');

  // the generated sentence, unchanged
  expect(workloads).toHaveTextContent('anything where Region is west');
  // the desc adds something the generated sentence does not say
  expect(workloads).toHaveTextContent(/AWS/i);
  // and never uses the governance-tag vocabulary for a cloud-tag predicate
  expect(workloads).not.toHaveTextContent(/tagged Region/i);
});

test('shows the id a policy will store BEFORE the group is committed', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Central sites' } });

  // the derived id is on screen, and it is the id — not the label — that
  // policies reference, so it cannot be revealed only after saving
  const idReadout = screen.getByTestId('group-id-preview');
  expect(idReadout).toHaveTextContent('central-sites');
  expect(screen.getByTestId('group-id-warning')).toHaveTextContent(/renaming/i);

  // and it tracks the name as it is edited
  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'EMEA (prod)' } });
  expect(screen.getByTestId('group-id-preview')).toHaveTextContent('emea-prod');
});

test('refuses an id that already belongs to another group', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));
  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'West branches' } });

  expect(screen.getByRole('alert')).toHaveTextContent(/already/i);
  expect(screen.getByRole('button', { name: /^Create group$/i })).toBeDisabled();
});

test('previews what the draft resolves to, live, and NAMES it', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Central sites' } });
  fireEvent.change(screen.getByLabelText(/this group contains/i), { target: { value: 'site' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag key/i), { target: { value: 'Region' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'central' } });

  const preview = screen.getByTestId('group-preview');
  // Dallas HQ and Chicago branch are the only central branches in the seed
  expect(preview).toHaveTextContent('Dallas HQ');
  expect(preview).toHaveTextContent('Chicago branch');
  // and a site group never sweeps in a VPC
  expect(preview).not.toHaveTextContent('vpc-west-01');
});

test('designs the empty resolution as a state, not a bare zero', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Typo group' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag key/i), { target: { value: 'Region' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'wets' } });

  const preview = screen.getByTestId('group-preview');
  expect(preview).toHaveTextContent(/matches nothing/i);
  // an empty resolution is not a policy violation — it must not be dressed as one
  expect(preview.querySelector('[class*="error"]')).toBeNull();
  expect(preview.outerHTML).not.toContain('#dc2626');
});

/* I1 — matching is case-sensitive while the tag-value <datalist> filters
   case-insensitively: someone who types "West" for a Region rule gets zero
   results, opens the suggestions, sees "west" offered back, and reads that
   as confirmation they typed the right thing. "Check for a typo" alone
   accuses without giving anything to check against — the message has to
   name what the estate actually carries for a key it knows. */
test('names the live tag values for a rule that matched nothing, on a key the estate carries', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Case typo group' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag key/i), { target: { value: 'Region' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'West' } });

  const preview = screen.getByTestId('group-preview');
  expect(preview).toHaveTextContent(/Region carries:/i);
  // the live values named include the correctly-cased value the person meant
  expect(preview).toHaveTextContent(/west/);
  expect(preview).toHaveTextContent(/central/);
});

test('blocks a governance-tag rule on a branch-site group, which can never resolve', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Impossible sites' } });
  fireEvent.change(screen.getByLabelText(/this group contains/i), { target: { value: 'site' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag source/i), { target: { value: 'governanceTag' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'pci' } });

  const warning = screen.getByRole('alert');
  expect(warning).toHaveTextContent(/branch/i);
  expect(warning).toHaveTextContent(/never/i);

  const create = screen.getByRole('button', { name: /^Create group$/i });
  expect(create).toBeDisabled();
  expect(screen.getByLabelText(/this group contains/i)).toHaveAttribute(
    'aria-describedby',
    warning.id,
  );

  // switching the group to cloud workloads makes the same rule satisfiable
  fireEvent.change(screen.getByLabelText(/this group contains/i), { target: { value: 'workload' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(create).toBeEnabled();
});

/* M1 — addGroup returns null on a duplicate id instead of throwing. The
   reactive idTaken guard normally keeps the Create button disabled before
   this is ever reached, so the only way to prove the fallback works is to
   force the return value directly, the way a genuine race (another actor
   creates the same id between this render and the click) would. Without the
   fix, create() resets and closes the form unconditionally — the group the
   person just described would vanish with no explanation. */
test('does not close or lose the draft when addGroup unexpectedly returns null', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Race group' } });
  fireEvent.change(screen.getByLabelText(/this group contains/i), { target: { value: 'workload' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag key/i), { target: { value: 'Region' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'west' } });

  const realAddGroup = CC.addGroup;
  CC.addGroup = () => null;
  try {
    fireEvent.click(screen.getByRole('button', { name: /^Create group$/i }));
  } finally {
    CC.addGroup = realAddGroup;
  }

  // the draft survives — nothing was silently reset or closed
  expect(screen.getByLabelText(/group name/i)).toHaveValue('Race group');
  // and the person is told why, via the same role="alert" idiom the file
  // already uses for the id-taken and impossible-rule warnings
  expect(screen.getByRole('alert')).toHaveTextContent(/could not|failed|already/i);
});

/* kind decides which estate the rules are evaluated against, so it is never
   defaulted silently: a Region:west rule on a "Both" group is what once
   swept three offices into a group called "workloads". */
test('requires the kind to be chosen rather than defaulting it silently', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));

  const kind = screen.getByLabelText(/this group contains/i) as HTMLSelectElement;
  expect(kind.value).toBe('');

  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Unscoped' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag key/i), { target: { value: 'Region' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'west' } });

  // name + a complete rule, and still not committable — kind is unchosen
  expect(screen.getByRole('button', { name: /^Create group$/i })).toBeDisabled();

  fireEvent.change(kind, { target: { value: 'workload' } });
  expect(screen.getByRole('button', { name: /^Create group$/i })).toBeEnabled();
  // and each choice says what it actually resolves against
  expect(screen.getByTestId('group-kind-scope')).toHaveTextContent(/VPCs only/i);
});

test('will not commit a group with a name but no members and no rules', () => {
  openGroups();
  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));
  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Hollow' } });
  expect(screen.getByRole('button', { name: /^Create group$/i })).toBeDisabled();
});

/* M2 — an object in two groups was counted twice under a label that reads
   as a distinct estate figure ("N objects resolved"). vpcbak already
   belongs to west-workloads; a second group naming it too must not move
   the headline count by more than the genuinely-new objects it adds. */
test('"objects resolved" counts each estate object once, not once per group it is in', () => {
  openGroups();

  act(() => {
    CC.addGroup({ id: 'overlap-grp', label: 'Overlap', kind: 'workload', members: ['vpcbak'], predicates: [] });
  });

  const resolved = CC.groupList().map((g: { id: string }) => CC.resolveGroup(g.id));
  const summed = resolved.reduce((n: number, r: { count: number }) => n + r.count, 0);
  const deduped = new Set(
    resolved.flatMap((r: { branchIds: string[]; vpcIds: string[] }) => [...r.branchIds, ...r.vpcIds]),
  ).size;
  // vpcbak now sits in two groups — if this weren't true the assertion below
  // would pass by coincidence, not because dedup happened
  expect(deduped).toBeLessThan(summed);

  expect(screen.getByText(/objects resolved/i)).toHaveTextContent(String(deduped));

  act(() => {
    CC.removeGroup('overlap-grp');
  });
});

// --- MUTATING: must run last in this file ---
test('creating a group through the UI writes it to the engine and lists it', () => {
  const before = CC.groupList().length;
  openGroups();

  fireEvent.click(screen.getByRole('button', { name: /^New group$/i }));
  fireEvent.change(screen.getByLabelText(/group name/i), { target: { value: 'Central sites' } });
  fireEvent.change(screen.getByLabelText(/this group contains/i), { target: { value: 'site' } });
  fireEvent.click(screen.getByRole('button', { name: /^Add a tag rule$/i }));
  fireEvent.change(screen.getByLabelText(/tag key/i), { target: { value: 'Region' } });
  fireEvent.change(screen.getByLabelText(/tag value/i), { target: { value: 'central' } });
  fireEvent.click(screen.getByRole('button', { name: /^Create group$/i }));

  // the ENGINE moved, with the id and kind the form showed
  expect(CC.groupList().length).toBe(before + 1);
  const created = CC.groupList().find(g => g.id === 'central-sites');
  expect(created).toBeTruthy();
  expect(created!.kind).toBe('site');
  expect(created!.label).toBe('Central sites');

  // resolution is exactly the two central branches, stated independently
  const resolved = CC.resolveGroup('central-sites');
  expect(resolved.branchIds.slice().sort()).toEqual(['br-chi', 'br-dal']);
  expect(resolved.vpcIds).toEqual([]);

  // and the list re-rendered off the subscribing hook, without a reload
  const created_row = row('Central sites');
  expect(within(created_row).getByText(/Dallas HQ/)).toBeInTheDocument();
  expect(created_row).toHaveTextContent('anything where Region is central');
});
