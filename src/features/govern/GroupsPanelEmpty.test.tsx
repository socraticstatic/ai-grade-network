import { render, screen } from '@testing-library/react';
import { CC } from '../../engine';
import { GroupsPanel } from './GroupsPanel';

/* Zero groups is unreachable in the seeded product — two groups ship — but
   it is a real state the moment anything removes them, and a blank table is
   not a design. Its own file because clearing the group store is a
   destructive mutation on the shared engine singleton, and vitest isolates
   state per file. */

test('zero groups renders a designed empty state that says what a group is for', () => {
  CC.groupList().forEach(g => CC.removeGroup(g.id));
  expect(CC.groupList()).toHaveLength(0);

  render(<GroupsPanel />);

  expect(screen.getByText(/no groups yet/i)).toBeInTheDocument();
  // it explains the concept rather than reporting a zero
  expect(screen.getByText(/a named set of workloads and branch sites/i)).toBeInTheDocument();
  // and it offers the way out, so the state is not a dead end
  expect(screen.getAllByRole('button', { name: /^New group$/i }).length).toBeGreaterThan(0);
  // no empty table shell left behind
  expect(screen.queryByRole('table')).toBeNull();
});
