/** The sankey ribbon: a closed shape whose top and bottom edges are the
 *  same horizontal bezier (45%/55% control points), source end st thick,
 *  target end tt thick. Extracted verbatim from SankeyPanel — including its
 *  unrounded control points, so output stays byte-identical to what the
 *  panel emitted before extraction. */
export function ribbonPath(sx: number, sy0: number, tx: number, ty0: number, st: number, tt: number): string {
  const c1 = sx + (tx - sx) * 0.45;
  const c2 = sx + (tx - sx) * 0.55;
  return `M ${sx} ${sy0} C ${c1} ${sy0} ${c2} ${ty0} ${tx} ${ty0} L ${tx} ${ty0 + tt} C ${c2} ${ty0 + tt} ${c1} ${sy0 + st} ${sx} ${sy0 + st} Z`;
}
