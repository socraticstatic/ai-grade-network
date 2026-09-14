export function InvoiceTable({ lines, total }: {
  lines: { item: string; kind: 'circuit' | 'usage'; amount: number; note: string }[];
  total: number;
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Monthly consumption invoice</caption>
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-fw-bodyLight border-b border-fw-secondary">
          <th className="py-2 font-medium">Item</th><th className="font-medium">Kind</th>
          <th className="text-right font-medium">Amount</th><th className="font-medium pl-4">Note</th>
        </tr>
      </thead>
      <tbody>
        {lines.map(l => (
          <tr key={l.item} className="border-b border-fw-secondary">
            <td className="py-2 text-fw-heading">{l.item}</td>
            <td><span className={`rounded-full border px-2 py-0.5 text-[11px] ${
              l.kind === 'circuit' ? 'text-fw-link border-fw-active/25' : 'text-fw-body border-fw-secondary'}`}>
              {l.kind}</span></td>
            <td className="text-right tabular-nums text-fw-heading">${l.amount.toLocaleString()}</td>
            <td className="pl-4 text-fw-bodyLight">{l.note}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr>
        <td className="py-2 font-semibold text-fw-heading">Total</td><td />
        <td className="text-right font-semibold tabular-nums text-fw-heading">${total.toLocaleString()}</td><td />
      </tr></tfoot>
    </table>
  );
}
