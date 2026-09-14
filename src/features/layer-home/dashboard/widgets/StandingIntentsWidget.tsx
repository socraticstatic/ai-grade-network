import { Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetFrame } from '../WidgetFrame';
import { useLayer, type LayerWidgetProps } from '../registry';
import { isAiIntent } from './intentLayer';
import { useCloudControlLive, useCloudControlActions } from '../../../../engine/react/useCloudControl';

const STATUS_TONE: Record<string, string> = {
  aligned: 'text-fw-success',
  drifting: 'text-fw-bodyLight',
  violated: 'text-fw-warn',
};

export function StandingIntentsWidget(_props: LayerWidgetProps) {
  const surface = useLayer();
  const actions = useCloudControlActions();
  const navigate = useNavigate();

  // Required pattern: get the engine handle with a trivial selector, then
  // derive everything in the render body every render. Baking `surface`
  // into the selector passed to useCloudControlLive (or memoizing on `cc`,
  // whose reference never changes) freezes the widget on a layer switch or
  // an engine mutation with no compensating event — see Task 3's defect.
  const cc = useCloudControlLive(c => c);
  const forLayer = (key: string) => (surface === 'ai' ? isAiIntent(key) : !isAiIntent(key));

  const intents = cc.intentList().filter(i => forLayer(i.key));
  const catalog = cc.intentCatalog().filter(e => forLayer(e.key));

  if (intents.length === 0) {
    return (
      <WidgetFrame title="Standing intents" icon={Target}>
        <p className="text-figma-sm text-fw-bodyLight mb-3">
          No standing intents on this layer yet. Declare one and the estate starts holding the promise.
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.slice(0, 4).map(e => (
            <button
              key={e.key}
              data-testid="declare-intent"
              onClick={() => actions.declareIntent(e.key, e.scopes()[0], 'watch')}
              className="rounded-full border border-fw-secondary bg-fw-wash px-3 py-1.5 text-figma-sm font-medium text-fw-link hover:border-fw-active transition-colors"
            >
              Declare an intent: {e.label}
            </button>
          ))}
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Standing intents" icon={Target}>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {intents.map(i => (
          <li key={i.id} data-testid="intent-row" className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <span className={`text-figma-xs font-semibold uppercase tracking-[0.08em] ${STATUS_TONE[i.reading.status]}`}>
                Intent {i.reading.status}
              </span>
              <span className="text-figma-xs text-fw-bodyLight">&#183; {i.scope.label}</span>
            </div>
            <p className="text-figma-sm text-fw-body mt-1">{i.reading.evidence}</p>
            {i.reading.moves.length > 0 && (
              <button
                data-testid="intent-synchronize"
                onClick={() => navigate(`/discover?draft=intent-${i.id}`)}
                className="mt-2 rounded-full bg-fw-ctaPrimary px-3 py-1.5 text-figma-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Synchronize
              </button>
            )}
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
