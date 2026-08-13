import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { PageSection } from '../../components/common/layouts';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { FlowBar } from '../../components/flow/FlowBar';
import { VerdictLine } from '../_shared/VerdictLine';
import { StageIntent } from '../_shared/StageIntent';
import { FabricHero } from './FabricHero';
import type { FabricModel, FabricSelection } from './FabricHero';
import { connectVerdict } from './verdict';
import { RegionPanel } from './RegionPanel';
import { SitePanel } from './SitePanel';
import { EdgeGroupPanel } from './EdgeGroupPanel';
import { EdgeTrail } from './EdgeTrail';
import {
  edgeNodes,
  edgeTrail,
  edgeCaption,
  scopeNode,
  descend,
  NO_EDGE_DRILL,
  type EdgeDrill,
  type EdgeNode,
} from './edgeDrill';
import { branchesOf } from '../discover/discoveryModel';
import { CC } from '../../engine';
import { ConnectionsList } from './ConnectionsList';
import { ProvisionWizard } from './ProvisionWizard';

/** Fabric posture panel — the default view (no node selected, or fabric picked):
 * the whole-fabric summary, all derived from the same model. */
function FabricPanel({ model }: { model: FabricModel }) {
  const attached = model.regions.filter(r => r.path === 'private');
  const dual = attached.filter(r => r.reliability === 'dual');
  // Rows 38 and 40 of the phase-0 metric audit: "On the fabric" and "Still
  // public" cut — both restate the verdict line directly above this panel
  // (`connectVerdict`, row 37), which states the same 1-vs-8 split as one
  // sentence. `dual` and `model.c2c` stay: neither is said anywhere else
  // on this screen.
  const stats = [
    { label: 'Dual / resilient', value: `${dual.length}`, sub: 'diverse paths', tone: 'text-fw-success' },
    { label: 'Cloud-to-cloud', value: `${model.c2c.length}`, sub: `${model.c2c.filter(c => c.controlled).length} on fabric`, tone: 'text-fw-heading' },
  ];
  return (
    <section aria-label="Fabric posture" className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-3">
      <header>
        <div className="font-semibold text-fw-heading">AT&amp;T Fabric</div>
        <div className="text-figma-xs text-fw-bodyLight">One fabric — select any site or region above to manipulate it.</div>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
            <div className="text-figma-xs text-fw-bodyLight">{s.label}</div>
            <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
            <div className="text-[11px] text-fw-bodyLight">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Once per page load, not once per mount. */
let trailHintShown = false;

export function ConnectPage() {
  const model = useCloudControl(cc => cc.fabricModel()) as FabricModel;
  /* The ingress column reads the real estate, not `fabricModel().sites` — see
     `edgeDrill`. Held separately from `model` so a drill never re-runs the
     engine, and spliced into the hero's model below. */
  const branches = useCloudControl(cc => branchesOf(cc));
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const fromDiscover = params.get('from') === 'discover';
  const provisionParam = params.get('provision');
  const provisionDual = params.get('dual') === '1';

  const [selected, setSelected] = useState<FabricSelection | null>({ kind: 'fabric' });
  const [wizardRegionId, setWizardRegionId] = useState<string | null>(null);
  const [justProvisioned, setJustProvisioned] = useState<string | null>(null);
  const [fabricExpanded, setFabricExpanded] = useState(false);
  const [edgeDrill, setEdgeDrill] = useState<EdgeDrill>(NO_EDGE_DRILL);
  /* The breadcrumb announces itself on the first descent only — see
     `EdgeTrail`. Module-scoped so it is once per session, not once per mount:
     bouncing to Observe and back is not a first drill. */
  const [trailHint, setTrailHint] = useState(false);

  /* The ingress column, one level at a time. `heroModel` splices it into the
     fabric model so the diagram, the edges and the panels all read the same
     rows — there is no second source of sites on this page. */
  const edgeRows: EdgeNode[] = edgeNodes(CC, branches, edgeDrill);
  const heroModel: FabricModel = {
    ...model,
    sites: edgeRows.map(n => ({ id: n.id, label: n.label, firstMile: n.firstMile, sub: n.sub, drillable: n.drillable })),
  };
  const selectedEdge = selected?.kind === 'site' ? edgeRows.find(n => n.id === selected.id) ?? null : null;
  const scope = scopeNode(CC, branches, edgeDrill);

  const drillInto = (siteId: string) => {
    const node = edgeRows.find(n => n.id === siteId);
    if (!node) return;
    const next = descend(edgeDrill, node);
    if (next) {
      setEdgeDrill(next);
      if (!trailHintShown) {
        trailHintShown = true;
        setTrailHint(true);
        window.setTimeout(() => setTrailHint(false), 5200);
      }
      // A descent replaces the selection with the level you just opened, so
      // the panel below never states a group you can no longer see.
      setSelected({ kind: 'fabric' });
    }
  };

  // "connect <region>" from ANDI lands here as ?provision=<regionId>&dual=<0|1> -
  // open the wizard on that region already selected. Only a real, still-public
  // region qualifies; an unknown or already-attached id is left alone.
  useEffect(() => {
    if (!provisionParam) return;
    const r = model.regions.find(x => x.regionId === provisionParam);
    if (r && r.path === 'public') {
      setSelected({ kind: 'region', id: r.regionId });
      setWizardRegionId(r.regionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provisionParam]);

  const selectedRegion =
    selected?.kind === 'region' ? model.regions.find(r => r.regionId === selected.id) ?? null : null;
  const wizardRegion = wizardRegionId ? model.regions.find(r => r.regionId === wizardRegionId) ?? null : null;

  const handleProvisioned = (regionId: string) => {
    setJustProvisioned(regionId);
    setSelected({ kind: 'region', id: regionId });
    // clear the draw-in flag after the animation window (deterministic single-shot)
    window.setTimeout(() => setJustProvisioned(cur => (cur === regionId ? null : cur)), 900);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-6">
      <PageSection
        title="Connect"
        description="Your cloud estate as one AT&T fabric — sites, the fabric, and cloud regions you can click and provision. On-ramps (NetBond / Direct Connect / ExpressRoute) ride the edges."
      >
        <VerdictLine>{connectVerdict(model)}</VerdictLine>
        <StageIntent stage="connect" />
        <FlowBar cta={{ label: 'Govern these paths', to: '/naas/govern' }} />

        {fromDiscover && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-figma-sm text-fw-bodyLight">
            <Globe size={14} className="shrink-0 text-fw-bodyLight" aria-hidden="true" />
            Attaching the workloads flagged on Discover — select a region and provision it onto the fabric.
          </div>
        )}

        <EdgeTrail
          trail={edgeTrail(edgeDrill)}
          caption={edgeCaption(edgeRows, branches.length)}
          onGo={d => { setEdgeDrill(d); setSelected({ kind: 'fabric' }); setTrailHint(false); }}
          highlight={trailHint}
        />

        <FabricHero
          model={heroModel}
          selected={selected}
          onSelect={setSelected}
          justProvisioned={justProvisioned}
          expanded={fabricExpanded}
          onToggleExpand={() => setFabricExpanded(v => !v)}
          onDrillSite={drillInto}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {selectedRegion ? (
            <RegionPanel
              region={selectedRegion}
              model={model}
              onProvision={() => setWizardRegionId(selectedRegion.regionId)}
              onProvisioned={handleProvisioned}
            />
          ) : selectedEdge && selectedEdge.count === 1 ? (
            <SitePanel siteId={selectedEdge.id} model={heroModel} />
          ) : selectedEdge ? (
            <EdgeGroupPanel node={selectedEdge} />
          ) : scope ? (
            <EdgeGroupPanel node={scope} />
          ) : (
            <FabricPanel model={model} />
          )}

          <ConnectionsList
            model={heroModel}
            selected={selected}
            onSelect={setSelected}
            onProvisioned={handleProvisioned}
          />
        </div>
      </PageSection>

      {wizardRegion && (
        <ProvisionWizard
          region={wizardRegion}
          model={model}
          onClose={() => setWizardRegionId(null)}
          onProvisioned={handleProvisioned}
          initialResilient={provisionDual}
        />
      )}
    </div>
  );
}
