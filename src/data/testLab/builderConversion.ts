import type { StudyPack, TestTask, VerifierFn } from '../../types/testLab';
import type { CustomStudy } from '../../types/testLabBuilder';
import { VERIFIER_CATALOG, recordBaselineSeed } from './verifierCatalog';

export function customStudyToPack(study: CustomStudy): StudyPack {
  const verifiers: Record<string, VerifierFn> = {};
  const tasks: TestTask[] = study.tasks.map(t => {
    const { verifierRef, ...rest } = t;
    let verifyId: string | undefined;
    const entry = verifierRef && VERIFIER_CATALOG.find(c => c.id === verifierRef.catalogId);
    if (entry) {
      verifyId = `${t.id}::${entry.id}`;
      verifiers[verifyId] = entry.build((verifierRef!.params as Record<string, any>) ?? {});
    }
    return { ...rest, verifyId };
  });
  const persona = { ...study.persona, seedId: 'record-baseline' };
  return {
    id: study.id,
    feature: study.feature,
    featureVersion: study.featureVersion,
    personas: [persona],
    tasks,
    scripts: [{
      id: `${study.id}-script`,
      personaId: persona.id,
      taskIds: tasks.map(t => t.id),
      inviteCodes: study.inviteCodes,
      previewCodes: study.previewCodes,
    }],
    verifiers,
    seeds: { 'record-baseline': recordBaselineSeed },
  };
}
