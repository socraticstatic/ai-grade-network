/** The wizard's live picture, as pure geometry: on-ramp → fabric → region
 *  on one left-to-right axis. Deterministic; the component renders it. */
export type RibbonThickness = 'thin' | 'medium' | 'thick';

export interface WizardCanvasSpec {
  left: { label: string; sub?: string } | null;
  right: { label: string; sub?: string } | null;
  edgeLabel?: string;
  thickness: RibbonThickness;
  dual: boolean;
  /** The connection itself is answered (attach type chosen): both edges solidify. */
  edgeAnswered: boolean;
  leftAnswered: boolean;
  rightAnswered: boolean;
}

interface Box { x: number; y: number; w: number; h: number }

export interface WizardCanvasGeometry {
  viewW: number;
  viewH: number;
  leftNode: Box;
  band: Box;
  rightNode: Box;
  leftEdge: string;
  rightEdge: string;
  strokeWidth: number;
}

const VIEW_W = 460;
const VIEW_H = 120;
const NODE_W = 128;
const NODE_H = 44;
const BAND_W = 72;
const MID_Y = VIEW_H / 2;

const STROKE: Record<RibbonThickness, number> = { thin: 1.5, medium: 2.5, thick: 4 };

export function computeWizardCanvas(spec: WizardCanvasSpec): WizardCanvasGeometry {
  const leftNode: Box = { x: 8, y: MID_Y - NODE_H / 2, w: NODE_W, h: NODE_H };
  const band: Box = { x: (VIEW_W - BAND_W) / 2, y: 14, w: BAND_W, h: VIEW_H - 28 };
  const rightNode: Box = { x: VIEW_W - NODE_W - 8, y: MID_Y - NODE_H / 2, w: NODE_W, h: NODE_H };
  const curve = (x0: number, x1: number) =>
    `M ${x0} ${MID_Y} C ${x0 + 24} ${MID_Y}, ${x1 - 24} ${MID_Y}, ${x1} ${MID_Y}`;
  return {
    viewW: VIEW_W,
    viewH: VIEW_H,
    leftNode,
    band,
    rightNode,
    leftEdge: curve(leftNode.x + leftNode.w, band.x),
    rightEdge: curve(band.x + band.w, rightNode.x),
    strokeWidth: STROKE[spec.thickness],
  };
}
