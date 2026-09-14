import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

// RuleBuilder now navigates (useNavigate) when a seeded submit stages a
// rule, so every render needs a Router ancestor even where these tests
// never seed it — the hook itself throws without one.
const renderBuilder = () => render(<MemoryRouter><RuleBuilder /></MemoryRouter>);

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The default form spec RuleBuilder starts with (matches INITIAL_FORM in
// RuleBuilder.tsx) - kept here so the dry-run test can ask the real engine
// what it thinks that spec does, rather than hardcoding the answer.
const DEFAULT_SPEC = {
  name: '',
  src: { tag: 'any', cloud: 'any' },
  dst: 'any',
  ports: 'any',
  action: 'deny',
  chain: [] as string[],
};

describe('RuleBuilder', () => {
  // Dry run is no longer a button press — the preview is derived from
  // whatever spec is on screen the instant the dialog is open, so this
  // asks the real engine what the default (untouched) form spec produces
  // without ever clicking anything preview-related.
  it('renders a dry-run preview that matches what CC.dryRun actually returns for the current spec', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));

    // Ask the real engine, independently of the component, what the
    // on-screen (default) form spec should produce.
    const expected = CC.dryRun(DEFAULT_SPEC) as {
      matched: unknown[];
      gbps: number;
      blocked: number;
    };

    const noun = `flow${expected.matched.length === 1 ? '' : 's'}`;
    const summary = `${expected.matched.length} ${noun} matched · ${expected.gbps} Gbps · ${expected.blocked} blocked`;
    expect(screen.getByText(new RegExp(escapeRegExp(summary)))).toBeInTheDocument();
    // Shadowing on the default (untouched) form spec is covered directly,
    // with shadowing genuinely enforced first, in
    // RuleBuilder.preview.test.tsx — nothing is enforced here, so
    // expected.shadowed is always empty and asserting on it would be the
    // same vacuous guard this suite is being fixed to remove.
  });

  // Was "changing a field after a dry run clears the now-stale preview" —
  // that was the defect this task removes. The preview is derived from the
  // spec on screen, so a field edit must make it RECOMPUTE, never clear:
  // there is no "no preview at all" state to fall back into once the
  // dialog is open (RuleBuilder.preview.test.tsx covers this directly, but
  // this keeps the regression pinned alongside the rest of this suite).
  it('changing a field after opening the dialog recomputes the preview instead of clearing it', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    expect(screen.getByTestId('rule-preview')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/action/i), { target: { value: 'allow' } });
    expect(screen.getByTestId('rule-preview')).toBeInTheDocument();
    expect(screen.getByText(/matched/i)).toBeInTheDocument();
  });

  it('Cancel resets the form to its initial state', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));

    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'half-typed-name' } });
    fireEvent.change(screen.getByLabelText(/action/i), { target: { value: 'inspect' } });
    expect(screen.getByTestId('rule-preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Reopen and confirm none of the previous session's state survived.
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    expect(screen.getByLabelText(/rule name/i)).toHaveValue('');
    expect(screen.getByLabelText(/action/i)).toHaveValue('deny');
    // The preview is present again — it's derived from the (now reset)
    // default spec, not carried over from the cancelled session.
    expect(screen.getByTestId('rule-preview')).toBeInTheDocument();
  });

  it('offers intra-group / not-intra-group as destinations now that a source-group control exists', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    const dstSelect = screen.getByLabelText(/destination/i) as HTMLSelectElement;
    const values = Array.from(dstSelect.options).map(o => o.value);
    expect(values).toContain('intra-group');
    expect(values).toContain('not-intra-group');
  });

  it('offers every live group as a source', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    const srcGroup = screen.getByLabelText(/source group/i) as HTMLSelectElement;
    const values = Array.from(srcGroup.options).map(o => o.value);
    (CC.groupList() as { id: string }[]).forEach(g => expect(values).toContain(g.id));
  });

  it('offers every live group as a destination', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    const dstSelect = screen.getByLabelText(/destination/i) as HTMLSelectElement;
    const values = Array.from(dstSelect.options).map(o => o.value);
    (CC.groupList() as { id: string }[]).forEach(g => expect(values).toContain(`group:${g.id}`));
  });

  /* The whole point of the feature: west-branches → west-workloads must be
     expressible in the form AND must dry-run to a non-empty match set. A
     group policy that silently matches nothing is the failure this exists
     to prevent. */
  it('dry-runs a group-to-group rule to the same non-empty result the engine returns', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'group:west-workloads' } });
    fireEvent.change(screen.getByLabelText(/action/i), { target: { value: 'allow' } });

    const expected = CC.dryRun({
      name: '',
      src: { tag: 'any', cloud: 'any', group: 'west-branches' },
      dst: { group: 'west-workloads' },
      ports: 'any',
      action: 'allow',
      chain: [],
    }) as { matched: { flow: { srcName: string } }[]; gbps: number; blocked: number };

    expect(expected.matched.length).toBeGreaterThan(0);
    const summary = `${expected.matched.length} flows matched · ${expected.gbps} Gbps · ${expected.blocked} blocked`;
    expect(screen.getByText(new RegExp(escapeRegExp(summary)))).toBeInTheDocument();

    // and it NAMES what it matched, not just a count
    const firstSrc = expected.matched[0].flow.srcName;
    expect(screen.getAllByText(new RegExp(escapeRegExp(firstSrc))).length).toBeGreaterThan(0);
  });

  it('persists src.group and dst.group onto the rule it adds', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'group-rule-c2' } });
    fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'group:west-workloads' } });
    fireEvent.change(screen.getByLabelText(/action/i), { target: { value: 'allow' } });
    fireEvent.click(screen.getByRole('button', { name: /^add rule$/i }));

    const added = (CC.ruleList() as { name: string; src: { group?: string }; dst: unknown }[])
      .find(r => r.name === 'group-rule-c2');
    expect(added).toBeTruthy();
    expect(added!.src.group).toBe('west-branches');
    expect(added!.dst).toEqual({ group: 'west-workloads' });
  });

  it('adds a rule to the engine when submitted', () => {
    const before = (CC.ruleList() as unknown[]).length;
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    fireEvent.change(screen.getByLabelText(/rule name/i), {
      target: { value: 'test-rule-task1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add rule$/i }));
    const after = CC.ruleList() as { name: string }[];
    expect(after.length).toBe(before + 1);
    expect(after.map(r => r.name)).toContain('test-rule-task1');
  });

  /* intra-group / not-intra-group are relative to whatever source group the
     rule names. Choosing one without a source group used to be silently
     committable (the warning informed but didn't block) — this rebuilds
     that guarantee as an unreachable-state test, not just an annotation. */
  describe('relative destination without a source group', () => {
    it('warns and disables Add rule, announced to assistive tech and tied to the controls it concerns', () => {
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'intra-group' } });

      const warning = screen.getByRole('alert');
      expect(warning).toHaveTextContent(/pick a source group/i);

      const addRuleBtn = screen.getByRole('button', { name: /^add rule$/i });
      expect(addRuleBtn).toBeDisabled();

      const dstSelect = screen.getByLabelText(/destination/i);
      const groupSelect = screen.getByLabelText(/source group/i);
      expect(dstSelect.getAttribute('aria-describedby')).toBe(warning.id);
      expect(groupSelect.getAttribute('aria-describedby')).toBe(warning.id);
    });

    it('clears once a source group is named, and Add rule re-enables', () => {
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'not-intra-group' } });
      expect(screen.getByRole('button', { name: /^add rule$/i })).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add rule$/i })).not.toBeDisabled();
    });

    it('cannot be committed: clicking a disabled Add rule adds nothing to the engine', () => {
      const before = (CC.ruleList() as unknown[]).length;
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'should-never-exist' } });
      fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'intra-group' } });

      fireEvent.click(screen.getByRole('button', { name: /^add rule$/i }));

      const after = CC.ruleList() as { name: string }[];
      expect(after.length).toBe(before);
      expect(after.map(r => r.name)).not.toContain('should-never-exist');
    });
  });

  /* Verified in the running app: src:{group:'west-branches', tag:'rd-helion'}
     dry-runs to 0 matched flows, with no warning. Branch-originated flows
     carry srcTag: null by design (a branch has no governance tag), so any
     rule combining a branch-only group with a tag is unsatisfiable - the
     same silent-zero-match failure class the intra-group fix above exists
     to prevent, applied to the source side. A group resolving to at least
     one VPC (e.g. west-workloads) can legitimately combine with a tag, so
     the guard must key off CC.resolveGroup(group) rather than "group and
     tag both set". */
  describe('source group combined with a tag that only branches carry', () => {
    it('warns and disables Add rule when the group resolves to branches only', () => {
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });
      fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'rd-helion' } });

      const warning = screen.getByRole('alert');
      expect(warning).toHaveTextContent(/branch/i);

      const addRuleBtn = screen.getByRole('button', { name: /^add rule$/i });
      expect(addRuleBtn).toBeDisabled();

      const groupSelect = screen.getByLabelText(/source group/i);
      const tagSelect = screen.getByLabelText(/source tag/i);
      expect(groupSelect.getAttribute('aria-describedby')).toBe(warning.id);
      expect(tagSelect.getAttribute('aria-describedby')).toBe(warning.id);
    });

    it('confirms the unsatisfiable spec really does dry-run to zero, proving the warning is honest', () => {
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });
      fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'rd-helion' } });

      const result = CC.dryRun({
        name: '', src: { tag: 'rd-helion', cloud: 'any', group: 'west-branches' },
        dst: 'any', ports: 'any', action: 'deny', chain: [],
      }) as { matched: unknown[] };
      expect(result.matched.length).toBe(0);
    });

    it('does not warn once the tag is cleared back to "any"', () => {
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });
      fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'rd-helion' } });
      expect(screen.getByRole('button', { name: /^add rule$/i })).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'any' } });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add rule$/i })).not.toBeDisabled();
    });

    it('does not warn for a group that resolves to at least one VPC, even combined with a tag', () => {
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-workloads' } });
      fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'rd-helion' } });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add rule$/i })).not.toBeDisabled();
    });

    it('cannot be committed: clicking a disabled Add rule adds nothing to the engine', () => {
      const before = (CC.ruleList() as unknown[]).length;
      renderBuilder();
      fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
      fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'should-never-exist-2' } });
      fireEvent.change(screen.getByLabelText(/source group/i), { target: { value: 'west-branches' } });
      fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'rd-helion' } });

      fireEvent.click(screen.getByRole('button', { name: /^add rule$/i }));

      const after = CC.ruleList() as { name: string }[];
      expect(after.length).toBe(before);
      expect(after.map(r => r.name)).not.toContain('should-never-exist-2');
    });
  });

  /* useCloudControlActions() returns the engine handle but does not
     subscribe — groups must be read through the subscribing hook so a group
     added while the builder is open shows up without an unrelated field
     edit forcing a re-render first. */
  it('offers a group added to the engine while the builder is open, without any unrelated field edit', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));

    act(() => {
      CC.addGroup({ id: 'rb-test-live-group', label: 'RB Test Live Group', kind: 'mixed' });
    });

    const srcGroup = screen.getByLabelText(/source group/i) as HTMLSelectElement;
    const values = Array.from(srcGroup.options).map(o => o.value);
    expect(values).toContain('rb-test-live-group');
  });
});
