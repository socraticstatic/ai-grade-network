import { Link } from 'react-router-dom';
import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl, useCloudControlLive } from '../../engine/react/useCloudControl';
import { aiSpendTotals, fmtTokens } from './aiSpend';

interface ModelInfo {
  id: string;
  name: string;
  kind: string;
  endpoint: string;
  cloud: string | null;
  p50: number;
  price: number;
  ready: boolean;
}

/**
 * The model catalog, and the one thing its badge cannot say on its own.
 *
 * "3 / 3 governed & ready" is a claim about ENDPOINTS: every model's path is
 * attached, so every request from here on is governed. It is true, and it is
 * not the whole of the word "governed" — an agent metering before the attach
 * sent real tokens out over the public internet, and the engine keeps that in
 * its own bucket precisely so it cannot be laundered by a later attach.
 *
 * Unqualified, this badge reads as an all-clear beside an `/ai/cost` screen
 * one click away stating a non-zero ungoverned figure. So it names that figure
 * itself, from the same derivation `/ai/cost` and `/ai/observe` read, and only
 * when there is one to name.
 */
export function ModelCatalog() {
  const models = useCloudControl(cc => cc.modelCatalog()) as ModelInfo[];
  const ungoverned = useCloudControlLive(cc => aiSpendTotals(cc).ungovernedTokensToday);

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <AttIcon name="apps" className="h-5 w-5 text-fw-body" />
        <span className="font-medium text-fw-heading">Model catalog</span>
        <span className="text-figma-xs text-fw-bodyLight">
          {models.filter(m => m.ready).length} / {models.length} governed &amp; ready
        </span>
      </div>

      {ungoverned > 0 && (
        <p className="px-5 py-3 border-b border-fw-secondary text-figma-sm text-fw-bodyLight">
          Attaching governs what comes next, not what already went:{' '}
          {fmtTokens(ungoverned)} tokens have been metered over the public internet today.{' '}
          <Link to="/ai/cost" className="font-medium text-fw-link hover:underline">
            See the split in AI Fabric · Cost
          </Link>
          .
        </p>
      )}

      <table className="w-full text-figma-sm">
        <thead>
          <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
            <th className="px-5 py-2 font-medium">Model</th>
            <th className="px-5 py-2 font-medium">Kind</th>
            <th className="px-5 py-2 font-medium">Endpoint</th>
            <th className="px-5 py-2 font-medium">P50</th>
            <th className="px-5 py-2 font-medium">Price</th>
            <th className="px-5 py-2 font-medium text-center">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fw-secondary">
          {models.map(m => (
            <tr key={m.id} className="align-top">
              <td className="px-5 py-3">
                <div className="font-medium text-fw-heading">{m.name}</div>
              </td>
              <td className="px-5 py-3 text-fw-body">{m.kind}</td>
              <td className="px-5 py-3 text-fw-body">{m.endpoint}</td>
              <td className="px-5 py-3 text-fw-body tabular-nums">{m.p50}ms</td>
              <td className="px-5 py-3 text-fw-body tabular-nums">${m.price.toFixed(2)}/1M</td>
              <td className="px-5 py-3 text-center">
                <span
                  className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium whitespace-nowrap ${
                    m.ready
                      ? 'bg-fw-successLight text-fw-success'
                      : 'bg-fw-neutral text-fw-bodyLight'
                  }`}
                >
                  {m.ready ? 'Governed · ready' : 'Not attached'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
