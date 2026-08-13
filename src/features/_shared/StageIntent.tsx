import { STAGE_PERSONA, type Stage } from './personas';

/**
 * One quiet line under a stage's verdict: who this screen serves, and the
 * job they came to do. The deck's value map, said out loud on the screen it
 * describes.
 *
 * Deliberately recessive - the verdict above it carries the stage's live
 * argument, and this is the frame around that argument, not a competing
 * headline. It states no figures, so it can never disagree with one.
 */
export function StageIntent({ stage }: { stage: Stage }) {
  const { persona, job } = STAGE_PERSONA[stage];
  return (
    <p data-testid={`stage-intent-${stage}`} className="text-figma-sm text-fw-bodyLight">
      <span className="font-medium text-fw-body">For {persona}:</span> {job}
    </p>
  );
}
