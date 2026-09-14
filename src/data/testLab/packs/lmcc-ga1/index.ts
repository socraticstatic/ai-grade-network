import type { StudyPack } from '../../../../types/testLab';
import { personas } from './personas';
import { tasks } from './tasks';
import { verifiers } from './verifiers';
import { seeds } from './seeds';

/**
 * LMCC GA Round 1 — the study the whole GA build points at.
 * Operator script: order via key handoff, recover from an expired key, read
 * status-vs-health correctly, and understand what downgrades and deletes cost.
 * Billing script: the account ledger, when billing starts, and what an
 * expired key costs (nothing).
 */
export const lmccGa1: StudyPack = {
  id: 'lmcc-ga1',
  feature: 'LMCC',
  featureVersion: 'GA 0706',
  personas,
  tasks,
  scripts: [
    {
      id: 'lmcc-ga1-operator',
      personaId: 'ga-netops',
      taskIds: ['ga-order-paste', 'ga-key-expired', 'ga-status-health', 'ga-downgrade', 'ga-delete'],
      inviteCodes: ['LMCC-GA1'],
      previewCodes: ['LMCC-GA1-PREVIEW'],
    },
    {
      id: 'lmcc-ga1-billing',
      personaId: 'ga-billing',
      taskIds: ['ga-billing-total', 'ga-billing-starts', 'ga-billing-expired'],
      // Independent tasks — shuffle to break learning-order contamination.
      // The operator script stays sequential: its tasks tell one story.
      randomizeTaskOrder: true,
      inviteCodes: ['LMCC-GA1B'],
      previewCodes: ['LMCC-GA1B-PREVIEW'],
    },
    {
      id: 'lmcc-ga1-feature-owner',
      personaId: 'ga-feature-owner',
      // The owner's arc: order from the portal side, live the wait, sell the term,
      // read status-vs-health, execute the commercial changes.
      taskIds: ['ga-fo-order-portal', 'ga-fo-golive', 'ga-fo-term-value', 'ga-status-health', 'ga-downgrade', 'ga-delete'],
      inviteCodes: ['LMCC-GA1F'],
      previewCodes: ['LMCC-GA1F-PREVIEW'],
    },
  ],
  verifiers,
  seeds,
};
