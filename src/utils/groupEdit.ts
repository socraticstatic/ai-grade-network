import { ScopePath, RoleAssignment } from '../types/rbac';

/**
 * Returns assignments whose scope is broader than the proposed new ceiling.
 * Used to warn before tightening a group's scope ceiling.
 * An assignment is "within" the ceiling if the ceiling's path is a prefix of the assignment's path.
 */
export function detectCeilingConflicts(
  newCeiling: ScopePath,
  assignments: RoleAssignment[],
): RoleAssignment[] {
  // Platform ceiling ('/') contains everything
  if (newCeiling.segments.length === 0) return [];

  return assignments.filter(a => {
    const aSegs = a.scope.segments;
    const cSegs = newCeiling.segments;
    // Assignment is within ceiling if ceiling is a prefix of (or equal to) assignment scope
    if (aSegs.length < cSegs.length) return true; // assignment is broader — conflict
    return !cSegs.every((seg, i) => aSegs[i] === seg); // different branch — conflict
  });
}
