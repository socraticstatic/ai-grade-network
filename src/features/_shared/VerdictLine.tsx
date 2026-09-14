/**
 * The verdict sentence: the one plain-English conclusion a spine screen
 * opens with. Copy comes from a pure selector beside the feature's model;
 * this component only presents it. Spec: Phase 1, "verdict sentences".
 */
export function VerdictLine({ children }: { children: string }) {
  return (
    <p
      data-testid="verdict-line"
      className="text-figma-lg font-semibold leading-snug text-fw-heading"
    >
      {children}
    </p>
  );
}
