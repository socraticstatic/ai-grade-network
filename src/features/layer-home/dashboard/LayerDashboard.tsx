import { LayerContext, DEFAULT_LAYOUT, WIDGET_REGISTRY, type Surface } from './registry';

export function LayerDashboard({ surface }: { surface: Surface }) {
  // Drop any id not in the registry rather than crashing (forward-compat with
  // Phase 2 persisted layouts that may reference a removed widget).
  const ids = DEFAULT_LAYOUT[surface].filter(id => WIDGET_REGISTRY[id]);
  return (
    <LayerContext.Provider value={surface}>
      {/* data-tour: the guided tour's layer-home beat spotlights the board —
          the claim it makes ("every widget reads the same getters its verb
          pages read") is about the board, not one widget. */}
      <div data-testid="layer-dashboard" data-tour="layer-board" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min">
        {ids.map(id => {
          const def = WIDGET_REGISTRY[id];
          const Widget = def.component;
          const span = def.defaultSize.w === 2 ? 'md:col-span-2' : '';
          return (
            <div key={id} className={span}>
              <Widget />
            </div>
          );
        })}
      </div>
    </LayerContext.Provider>
  );
}
