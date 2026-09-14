import type { StudyPack } from '../../../../types/testLab';
import { personas } from './personas';
import { tasks } from './tasks';
import { verifiers } from './verifiers';
import { seeds } from './seeds';

export const lmccR1: StudyPack = {
  id: 'lmcc-r1',
  feature: 'LMCC',
  featureVersion: 'pre-GA 0409',
  personas,
  tasks,
  scripts: [
    {
      id: 'lmcc-r1-main',
      personaId: 'lmcc-netops',
      taskIds: ['lmcc-discover', 'lmcc-order-happy', 'lmcc-bad-bandwidth', 'lmcc-billing', 'lmcc-status'],
      inviteCodes: ['LMCC-R1'],
      previewCodes: ['LMCC-R1-PREVIEW'],
    },
    {
      id: 'lmcc-r1-viewer',
      personaId: 'lmcc-viewer',
      taskIds: ['lmcc-wall-attempt', 'lmcc-wall-info'],
      inviteCodes: ['LMCC-R1V'],
      previewCodes: ['LMCC-R1V-PREVIEW'],
    },
  ],
  verifiers,
  seeds,
};
