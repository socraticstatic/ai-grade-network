import { useState } from 'react';
import { AttIcon } from '../../components/icons/AttIcon';
import { CC } from '../../engine';
import { useCloudControlActions } from '../../engine/react/useCloudControl';

interface TagEntry {
  label: string;
  hex?: string;
  desc?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  kind: string;
  endpoint: string;
}

interface TraceStep {
  hop: string;
  detail: string;
  ok: boolean;
}

interface TraceResult {
  blocked: boolean;
  steps: TraceStep[];
  tokens: number;
}

const DEFAULT_TAG = 'classified-helion';
const DEFAULT_MODEL = 'gpt-class';

export function PromptTrace() {
  const actions = useCloudControlActions();
  const tags = Object.keys(CC.TAGS) as string[];
  const models = actions.modelCatalog() as ModelInfo[];

  const [tag, setTag] = useState(tags.includes(DEFAULT_TAG) ? DEFAULT_TAG : tags[0]);
  const [modelId, setModelId] = useState(models.some(m => m.id === DEFAULT_MODEL) ? DEFAULT_MODEL : models[0]?.id ?? '');
  const [prompt, setPrompt] = useState('summarize the classified incident report');
  const [result, setResult] = useState<TraceResult | null>(null);

  function runTrace() {
    const res = actions.promptTrace(tag, modelId, prompt) as TraceResult;
    setResult(res);
  }

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <AttIcon name="apis" className="h-5 w-5 text-fw-body" />
        <span className="font-medium text-fw-heading">Prompt trace</span>
        <span className="text-figma-xs text-fw-bodyLight">
          walk one request through every layer this portal governs
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-figma-xs text-fw-bodyLight">
            App / tag
            <select
              value={tag}
              onChange={e => setTag(e.target.value)}
              className="h-9 rounded-lg border border-fw-secondary bg-fw-base px-2 text-figma-sm text-fw-heading"
            >
              {tags.map(t => (
                <option key={t} value={t}>
                  {CC.TAGS[t]?.label ?? t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-figma-xs text-fw-bodyLight">
            Model
            <select
              value={modelId}
              onChange={e => setModelId(e.target.value)}
              className="h-9 rounded-lg border border-fw-secondary bg-fw-base px-2 text-figma-sm text-fw-heading"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-figma-xs text-fw-bodyLight">
            Prompt
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="h-9 rounded-lg border border-fw-secondary bg-fw-base px-2 text-figma-sm text-fw-heading"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={runTrace}
            className="inline-flex items-center h-9 px-4 rounded-full text-figma-xs font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
          >
            Trace
          </button>
        </div>

        {result && (
          <div className="space-y-2 pt-2">
            {result.blocked && (
              <div className="rounded-xl border border-fw-error bg-fw-errorLight px-4 py-3">
                <div className="font-medium text-fw-error">DENIED at the token layer</div>
                <p className="text-figma-xs text-fw-error/90 mt-0.5">
                  the network never carries it — the request stops before it reaches the wire.
                </p>
              </div>
            )}

            <ol className="space-y-1.5" aria-label="Trace hops">
              {result.steps.map((step, i) => (
                <li
                  key={`${step.hop}-${i}`}
                  className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-figma-sm ${
                    step.ok ? 'bg-fw-successLight' : 'bg-fw-errorLight'
                  }`}
                >
                  <span
                    className={`inline-flex items-center h-6 px-2 rounded-full text-figma-xs font-medium shrink-0 ${
                      step.ok ? 'bg-fw-success text-white' : 'bg-fw-error text-white'
                    }`}
                  >
                    {step.ok ? 'OK' : 'DENIED'}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium text-fw-heading">{step.hop}</span>
                    <span className="text-fw-body">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            {!result.blocked && (
              <p className="text-figma-xs text-fw-bodyLight pt-1">
                {result.tokens.toLocaleString()} tokens metered.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
