import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('RuleBuilder seeded from a proposal', () => {
  test('opens pre-filled from the named rule and says where it came from', async () => {
    const rule = CC.ruleList().find((r: { id: string }) => r.id === 'pol-dns')!;
    render(<MemoryRouter><RuleBuilder seed={{ ruleId: 'pol-dns' }} /></MemoryRouter>);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect((screen.getByLabelText(/rule name/i) as HTMLInputElement).value).toContain(rule.name);
    expect(screen.getByTestId('rule-provenance')).toHaveTextContent(/proposed by andi/i);
  });

  /* pol-dns (the only rule any other seed test uses) carries a string dst,
     so the "structured dst -> group:<id>" re-encoding branch in the seed
     effect (RuleBuilder.tsx, around GROUP_DST_PREFIX) never ran in the test
     tree. No seeded rule in state-rules.ts has an object dst, so this
     authors one live via CC.addRule, seeds from it, and undoes the author
     afterward via the shared afterEach above. */
  test('re-encodes a structured {group} destination into the "group:<id>" select value', async () => {
    const groupId = (CC.groupList() as { id: string }[])[0].id;
    const authored = CC.addRule({
      name: 'stage-guard-group-dst-seed-source',
      src: { tag: 'any', cloud: 'any' },
      dst: { group: groupId },
      ports: 'any',
      action: 'deny',
      chain: [],
    }) as { id: string };
    expect(authored).toBeTruthy();

    render(<MemoryRouter><RuleBuilder seed={{ ruleId: authored.id }} /></MemoryRouter>);
    await screen.findByRole('dialog');

    const dstSelect = screen.getByLabelText(/destination/i) as HTMLSelectElement;
    expect(dstSelect.value).toBe(`group:${groupId}`);
  });
});
