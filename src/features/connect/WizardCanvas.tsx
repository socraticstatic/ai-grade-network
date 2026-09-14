import { useMemo } from 'react';
import { VIZ_HEX } from '../../components/viz/kit';
import { computeWizardCanvas, type WizardCanvasSpec } from './wizardCanvasModel';

/** The wizard's live picture: every answer places or thickens an element.
 *  Answered = solid cobalt; pending = dashed slate ghost; dual = double
 *  line (the FabricHero idiom). Scales to its container - never scrolls. */
export function WizardCanvas({ spec }: { spec: WizardCanvasSpec }) {
  const g = useMemo(() => computeWizardCanvas(spec), [spec]);

  const edgeStroke = (answered: boolean) => ({
    stroke: answered ? VIZ_HEX.cobalt : VIZ_HEX.slate,
    strokeDasharray: answered ? undefined : '5 5',
  });

  const node = (
    box: { x: number; y: number; w: number; h: number },
    station: { label: string; sub?: string } | null,
    answered: boolean,
    testid: string,
    ghostText: string,
  ) => (
    <g data-testid={testid} data-answered={String(answered)}>
      <rect
        x={box.x} y={box.y} width={box.w} height={box.h} rx={10}
        fill={answered ? VIZ_HEX.wash : 'none'}
        stroke={answered ? VIZ_HEX.cobalt : VIZ_HEX.slate}
        strokeWidth={1.2}
        strokeDasharray={answered ? undefined : '4 4'}
      />
      {station ? (
        <>
          <text x={box.x + box.w / 2} y={box.y + 19} textAnchor="middle" fill={VIZ_HEX.ink} className="text-[11px] font-semibold">
            {station.label}
          </text>
          {station.sub && (
            <text x={box.x + box.w / 2} y={box.y + 33} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[9px]">
              {station.sub}
            </text>
          )}
        </>
      ) : (
        <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 3} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[10px]">
          {ghostText}
        </text>
      )}
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${g.viewW} ${g.viewH}`}
      width="100%"
      role="img"
      aria-label="The connection this wizard is building, drawn as you answer"
      data-testid="wizard-canvas"
    >
      <rect x={g.band.x} y={g.band.y} width={g.band.w} height={g.band.h} rx={12} fill={VIZ_HEX.band} stroke={VIZ_HEX.bandStroke} strokeWidth={1.2} />
      <text x={g.band.x + g.band.w / 2} y={g.viewH / 2 - 4} textAnchor="middle" fill={VIZ_HEX.cobalt} className="text-[10px] font-semibold">
        AT&amp;T
      </text>
      <text x={g.band.x + g.band.w / 2} y={g.viewH / 2 + 8} textAnchor="middle" fill={VIZ_HEX.cobalt} className="text-[10px] font-semibold">
        Fabric
      </text>

      <path data-testid="wc-edge-left" data-answered={String(spec.edgeAnswered)} d={g.leftEdge} fill="none" strokeWidth={g.strokeWidth} strokeLinecap="round" {...edgeStroke(spec.edgeAnswered)} />
      {spec.dual && (
        <path d={g.rightEdge} fill="none" strokeWidth={g.strokeWidth} strokeLinecap="round" transform="translate(0,-2.4)" {...edgeStroke(spec.edgeAnswered)} />
      )}
      <path data-testid="wc-edge-right" data-answered={String(spec.edgeAnswered)} data-dual={String(spec.dual)} d={g.rightEdge} fill="none" strokeWidth={g.strokeWidth} strokeLinecap="round" {...edgeStroke(spec.edgeAnswered)} />
      {spec.edgeLabel && (
        <text x={(g.band.x + g.band.w + g.rightNode.x) / 2} y={g.viewH / 2 - 10} textAnchor="middle" fill={VIZ_HEX.slateInk} stroke={VIZ_HEX.wash} strokeWidth={3} paintOrder="stroke" className="text-[9px] font-medium">
          {spec.edgeLabel}
        </text>
      )}

      {node(g.leftNode, spec.left, spec.leftAnswered, 'wc-left', 'Not chosen yet')}
      {node(g.rightNode, spec.right, spec.rightAnswered, 'wc-right', 'Not chosen yet')}
    </svg>
  );
}
