// @ts-nocheck
/* Standing intents - declared outcomes with a scope, a mode, and a status
   the engine re-derives on every read.

   Laws, same as every sibling module:
   - Stored: {id, key, scope, mode, declaredAt, baseline}. Baseline is a
     record of a past fact (what the meter read at declaration), like
     sessionAttached - never a cached derivation.
   - Derived per read: status (aligned | drifting | violated), evidence,
     the compiled repair moves, and watch counts. Nothing stores a status.
   - Mutations push undo BEFORE mutating, emit, and audit.
   - The machine never commits estate moves: enforce mode applies standing
     CONTROLS (a policy flag) only; repairs are moves for the twin's tray.
   - The catalog is the honesty boundary: an intent the engine cannot
     evaluate does not exist here. */
(function(){
const CC=window.CC;
const _=CC._||(CC._={});

const intents=_.intents=_.intents||[];
let intentSeq=0;

/* ---------- helpers over existing derivations only ---------- */

const flows=()=>CC.routeFlows();
const regions=()=>CC.fabricModel().regions;

/** Flows off the AT&T path that have a controlled path available - the one
 *  steer opportunity shape routeAdvisor() and the twin both price. */
function steerables(flowId){
  return flows()
    .filter(f=>!f.current.attControlled)
    .filter(f=>!flowId||f.id===flowId)
    .map(f=>({f,att:f.paths.find(p=>p.attControlled&&p.available)}))
    .filter(x=>x.att);
}

function meterOf(tag){return CC.tokenMeterList().find(m=>m.tag===tag)||null;}

/** Longitude bands, the one geography the seeds actually carry (region.geo).
 *  Coarse on purpose: a residency claim finer than the data would be a lie. */
function geographyOf(geo){
  if(!geo)return 'unknown';
  const lon=geo[1];
  return lon<-30?'Americas':lon<60?'EMEA':'APAC';
}

/** Every (cloudId, region, vpc) carrying `tag`, with its geography. */
function taggedWorkloads(tag){
  const out=[];
  Object.entries(CC.regions).forEach(([cid,rs])=>rs.forEach(r=>{
    (CC.vpcs[r.id]||[]).forEach(v=>{
      if((v.tags||[]).includes(tag))out.push({cloudId:cid,region:r,vpc:v,geography:geographyOf(r.geo)});
    });
  }));
  return out;
}

/** The diversity repair: a region that can carry a second on-ramp. */
function secondRampMove(){
  const end=regions().find(r=>r.onrampIds.length>1&&r.reliability!=='dual');
  return end?{move:{kind:'attach',regionId:end.regionId},name:end.name}:null;
}

/* ---------- the catalog ---------- */
/* Each entry: scopes() the intent may bind to, evaluate() -> a reading,
   both reading ONLY existing getters. `enforceControl` is the standing
   control enforce mode applies (and undo restores). */
const CATALOG=[
  {
    key:'minimize-latency',
    label:'Minimize latency',
    taxonomy:'Performance',
    scopes(){
      return [
        ...regions().map(r=>({kind:'region',id:r.regionId,label:`${r.cloudName} ${r.name}`})),
        ...flows().map(f=>({kind:'flow',id:f.id,label:f.label})),
      ];
    },
    evaluate(scope){
      if(scope.kind==='region'){
        const r=regions().find(x=>x.regionId===scope.id);
        if(!r)return null;
        const L=CC.regionLatency(r.regionId);
        return r.path==='private'
          ? {status:'aligned',evidence:`${r.name} rides the fabric at ${L.privateMs}ms.`,moves:[]}
          : {status:'violated',
             evidence:`${r.name} rides public transit at ${L.publicMs}ms; the fabric path is ${L.privateMs}ms.`,
             moves:[{kind:'attach',regionId:r.regionId}]};
      }
      const f=flows().find(x=>x.id===scope.id);
      if(!f)return null;
      const att=f.paths.find(p=>p.attControlled&&p.available);
      if(f.current.attControlled)
        return {status:'aligned',evidence:`${f.label} is on ${f.current.label} at ${Math.round(f.current.latencyMs||0)}ms.`,moves:[]};
      return att
        ? {status:'violated',
           evidence:`${f.label} crosses the public internet at ${Math.round(f.current.latencyMs||0)}ms with an AT&T path available.`,
           moves:[{kind:'steer',flowId:f.id,pathId:att.id}]}
        : {status:'violated',
           evidence:`${f.label} crosses the public internet and no AT&T path exists yet - attach its regions first.`,
           moves:[]};
    },
  },
  {
    key:'path-diversity',
    label:'Keep this flow diverse',
    taxonomy:'Resiliency',
    scopes(){return flows().map(f=>({kind:'flow',id:f.id,label:f.label}));},
    evaluate(scope){
      const f=flows().find(x=>x.id===scope.id);
      if(!f)return null;
      if(f.diverse){
        /* Drifting when a failure simulation currently holds one of the
           paths down - diversity is present but being leaned on. */
        const sim=CC.sim&&CC.sim.onrampId;
        return sim
          ? {status:'drifting',evidence:`${f.label} is diverse, but a failure simulation is holding ${sim} down right now.`,moves:[]}
          : {status:'aligned',evidence:`${f.label} has two independent paths.`,moves:[]};
      }
      /* The repair is a second on-ramp. Regions grow dual reliability when
         more than one capturing on-ramp is active; attaching the region
         activates its capturing ramps. If the topology carries no second
         ramp, the boundary is stated instead of invented. */
      const ends=regions().filter(r=>r.onrampIds.length>1&&r.reliability!=='dual');
      const end=ends[0];
      return end
        ? {status:'violated',
           evidence:`${f.label} has a single path; ${end.name} can carry a second on-ramp.`,
           moves:[{kind:'attach',regionId:end.regionId}]}
        : {status:'violated',
           evidence:`${f.label} has a single path and the current topology offers no second on-ramp for it.`,
           moves:[]};
    },
  },
  {
    key:'route-by-cost',
    label:'Route by cost',
    taxonomy:'Application-aware routing',
    scopes(){
      return [{kind:'estate',id:null,label:'Every flow'},
        ...flows().map(f=>({kind:'flow',id:f.id,label:f.label}))];
    },
    evaluate(scope){
      const opps=steerables(scope.kind==='flow'?scope.id:null);
      if(!opps.length)
        return {status:'aligned',
          evidence:scope.kind==='flow'
            ?'This flow already rides its cheapest controlled path.'
            :'No flow has a cheaper AT&T path left to steer to.',
          moves:[]};
      const gbps=Math.round(opps.reduce((s,x)=>s+x.f.gbps,0)*10)/10;
      return {status:'violated',
        evidence:`${opps.length} flow${opps.length===1?'':'s'} (${gbps} Gbps) pay public egress with an AT&T path available.`,
        moves:opps.map(x=>({kind:'steer',flowId:x.f.id,pathId:x.att.id}))};
    },
  },
  {
    key:'data-sensitivity',
    label:'Route by data sensitivity',
    taxonomy:'Security and compliance',
    /* The tags whose violations() rows map to a one-fix repair. The tag IS
       the sensitivity class - see TAGS in state.ts. */
    scopes(){
      return [
        {kind:'tag',id:'classified-helion',label:'classified-helion'},
        {kind:'tag',id:'finance-invoices',label:'finance-invoices'},
        {kind:'tag',id:'rd-helion',label:'rd-helion'},
      ];
    },
    evaluate(scope){
      const FIX={'classified-helion':'fwInspection','finance-invoices':'isolateFinance','rd-helion':'segmentHelion'};
      const v=CC.violations().filter(x=>x.tag===scope.id);
      if(!v.length)
        return {status:'aligned',evidence:`Every ${scope.id} path satisfies its policy.`,moves:[]};
      const fixKey=FIX[scope.id];
      return {status:'violated',
        evidence:`${scope.id}: ${v[0].msg}${v.length>1?` (and ${v.length-1} more)`:''}.`,
        moves:fixKey&&!CC.fixes[fixKey]?[{kind:'fix',fixKey}]:[]};
    },
  },
  {
    key:'private-inference',
    label:'Keep AI inference off the public internet',
    taxonomy:'AI and workload',
    scopes(){return [{kind:'estate',id:'ai',label:'The token layer'}];},
    evaluate(scope,intent){
      const meters=CC.tokenMeterList();
      const routes=CC.modelRoutes();
      const publicTags=routes.filter(r=>r.path==='public').map(r=>r.tag);
      const ungoverned=meters.reduce((s,m)=>s+m.ungoverned,0);
      if(publicTags.length){
        /* Repair: attach the regions the self-hosted endpoints sit behind,
           and guardrail the identity that calls externally. */
        const moves=[];
        const cw=regions().find(r=>r.regionId==='cwe');
        const nb=regions().find(r=>r.regionId==='nbe');
        if(cw&&!cw.attached)moves.push({kind:'attach',regionId:'cwe'});
        if(nb&&!nb.attached)moves.push({kind:'attach',regionId:'nbe'});
        const ss=CC.tokenPolicy('shared-services');
        if(ss&&!ss.guardrail)moves.push({kind:'policy',tag:'shared-services',patch:{guardrail:true}});
        return {status:'violated',
          evidence:`${publicTags.length} of ${routes.length} identities route over the public internet (${publicTags.join(', ')}).`,
          moves};
      }
      const grew=intent&&intent.baseline&&ungoverned>intent.baseline.ungoverned;
      return grew
        ? {status:'drifting',
           evidence:`Every route is governed now, but ungoverned spend grew since declaration - history does not launder.`,
           moves:[]}
        : {status:'aligned',evidence:'Every identity routes to a governed endpoint.',moves:[]};
    },
  },
  {
    key:'cap-token-spend',
    label:'Cap token spend',
    taxonomy:'AI and workload',
    scopes(){return CC.tokenMeterList().map(m=>({kind:'identity',id:m.tag,label:m.tag}));},
    enforceControl(scope,on){
      /* The standing control: the policy's enforced flag. promptTrace's
         budget gate (state-console.ts) reads it together with this intent's
         mode - watch mode never gates. */
      CC.setTokenPolicy(scope.id,{enforced:!!on});
    },
    evaluate(scope,intent){
      const m=meterOf(scope.id);
      if(!m)return null;
      const reading=
        m.pct>=100
          ? {status:'violated',evidence:`${scope.id} stands at ${m.pct}% of its ${m.budget.toLocaleString()}-token budget.`,
             moves:[{kind:'policy',tag:scope.id,patch:{enforced:true}}]}
          /* The soft threshold is the policy's to set; 80 stays the default
             so a policy that names none reads exactly as it did before. */
          : m.pct>=((CC.tokenPolicy(scope.id)||{}).softPct||80)
            ? {status:'drifting',evidence:`${scope.id} is at ${m.pct}% of budget - the ceiling is close.`,moves:[]}
            : {status:'aligned',evidence:`${scope.id} is at ${m.pct}% of its budget.`,moves:[]};
      if(intent&&intent.mode==='watch'&&m.pct>=100){
        const would=CC.decisionLog().filter(d=>d.tag===scope.id&&d.allowed&&d.ts>=intent.declaredAt).length;
        reading.watch={events:would,
          note:`${would} request${would===1?'':'s'} rode through over budget - enforce mode would have denied them.`};
      }
      return reading;
    },
  },

  /* ------------------------------------------------------------------ *
   * The back half of the ILM 7 taxonomy. Same law as the first six:
   * only what the engine can evaluate exists here, every evidence
   * sentence quotes a derivation another screen also states, and a
   * repair the estate cannot make is a stated boundary, never a fake.
   * ------------------------------------------------------------------ */

  {
    key:'maximize-bandwidth',
    label:'Maximize bandwidth',
    taxonomy:'Performance',
    scopes(){return [{kind:'estate',id:'transport',label:'Interconnect capacity'}];},
    evaluate(){
      const util=CC.utilization();
      if(util<80)
        return {status:'aligned',evidence:`Primary interconnect at ${util}% - headroom holds for job-class traffic.`,moves:[]};
      const cand=regions().find(r=>!r.attached&&r.onrampIds.length>0);
      return {status:'violated',
        evidence:`Primary interconnect at ${util}% - model training and replication jobs will queue behind it.`,
        moves:cand?[{kind:'attach',regionId:cand.regionId}]:[]};
    },
  },
  {
    key:'optimize-jitter',
    label:'Optimize jitter',
    taxonomy:'Performance',
    scopes(){return regions().map(r=>({kind:'region',id:r.regionId,label:`${r.cloudName} ${r.name}`}));},
    evaluate(scope){
      const r=regions().find(x=>x.regionId===scope.id);
      if(!r)return null;
      const j=CC.regionJitter(r.cloudId,r.regionId,48);
      if(!j)return null;
      return r.path==='private'
        ? {status:'aligned',evidence:`${r.name} rides the fabric: ${j.jitterMs}ms of variance across the window (P50 ${j.p50}ms, P95 ${j.p95}ms).`,moves:[]}
        : {status:'violated',
           evidence:`${r.name} rides public transit: ${j.jitterMs}ms of variance across the window - real-time streams need the deterministic path.`,
           moves:[{kind:'attach',regionId:r.regionId}]};
    },
  },
  {
    key:'recovery-objective',
    label:'Enforce recovery objective',
    taxonomy:'Resiliency',
    scopes(){return flows().filter(f=>f.kind==='c2c').map(f=>({kind:'flow',id:f.id,label:f.label}));},
    evaluate(scope){
      const f=flows().find(x=>x.id===scope.id);
      if(!f)return null;
      if(f.diverse)
        return {status:'aligned',evidence:`${f.label} fails over inside the fabric - the recovery objective survives a path loss.`,moves:[]};
      const second=secondRampMove();
      return {status:'violated',
        evidence:`${f.label} has one path; a failure drops it to public transit and the recovery objective with it.`,
        moves:second?[second.move]:[]};
    },
  },
  {
    key:'active-active',
    label:'Enable active-active resiliency',
    taxonomy:'Resiliency',
    scopes(){return [{kind:'estate',id:'flows',label:'Every east-west flow'}];},
    evaluate(){
      const c2c=flows().filter(f=>f.kind==='c2c');
      const single=c2c.filter(f=>!f.diverse);
      if(!single.length)
        return {status:'aligned',evidence:`All ${c2c.length} east-west flows run multipath.`,moves:[]};
      const second=secondRampMove();
      return {status:'violated',
        evidence:`${single.length} of ${c2c.length} east-west flows run a single path.`,
        moves:second?[second.move]:[]};
    },
  },
  {
    key:'predictive-failover',
    label:'Predictive failover',
    taxonomy:'Resiliency',
    scopes(){return regions().map(r=>({kind:'region',id:r.regionId,label:`${r.cloudName} ${r.name}`}));},
    evaluate(scope){
      const r=regions().find(x=>x.regionId===scope.id);
      if(!r)return null;
      const t=CC.latencyTrend(r.cloudId,r.regionId,48);
      if(!t)return null;
      if(!t.rising)
        return {status:'aligned',evidence:`${r.name} holds steady across the window (${t.firstMs}ms to ${t.lastMs}ms).`,moves:[]};
      /* Rising trend: the window's own tail is degrading. Move BEFORE the
         failure - that is the whole intent. */
      return r.reliability==='dual'
        ? {status:'drifting',
           evidence:`${r.name} degrades ${t.risingPct}% across the window; the second path is holding it.`,moves:[]}
        : {status:'violated',
           evidence:`${r.name} degrades ${t.risingPct}% across the window (${t.firstMs}ms to ${t.lastMs}ms) on its only path - move before it fails.`,
           moves:[{kind:'attach',regionId:r.regionId}]};
    },
  },
  {
    key:'route-by-app-class',
    label:'Route by application class',
    taxonomy:'Application-aware routing',
    scopes(){return [{kind:'estate',id:'apps',label:'Application traffic'}];},
    evaluate(){
      const apps=flows().filter(f=>f.kind==='app');
      const uncontrolled=apps.filter(f=>!f.current.attControlled);
      if(!uncontrolled.length)
        return {status:'aligned',evidence:`All ${apps.length} application flows ride class-appropriate AT&T paths.`,moves:[]};
      const moves=uncontrolled
        .map(f=>({f,att:f.paths.find(p=>p.attControlled&&p.available)}))
        .filter(x=>x.att)
        .map(x=>({kind:'steer',flowId:x.f.id,pathId:x.att.id}));
      return {status:'violated',
        evidence:`${uncontrolled.length} of ${apps.length} application flows ride the public internet regardless of class.`,
        moves};
    },
  },
  {
    key:'zero-trust-segmentation',
    label:'Enforce zero trust segmentation',
    taxonomy:'Security and compliance',
    scopes(){return [{kind:'tag',id:'rd-helion',label:'rd-helion'}];},
    evaluate(scope){
      return CC.fixes.segmentHelion
        ? {status:'aligned',evidence:`${scope.id} is segmented - intra-tag only, identity-aware.`,moves:[]}
        : {status:'violated',
           evidence:`${scope.id} spreads across clouds unsegmented - any workload can reach any other.`,
           moves:[{kind:'fix',fixKey:'segmentHelion'}]};
    },
  },
  {
    key:'threat-aware-routing',
    label:'Apply threat-aware routing',
    taxonomy:'Security and compliance',
    scopes(){return [{kind:'estate',id:'egress',label:'Egress screening'}];},
    evaluate(){
      const missing=[];
      if(!CC.fixes.dnsFirewall)missing.push({name:'resolver DNS firewall',fixKey:'dnsFirewall'});
      if(!CC.fixes.dataPerimeter)missing.push({name:'data perimeter',fixKey:'dataPerimeter'});
      if(!missing.length)
        return {status:'aligned',evidence:'Egress rides screened paths: DNS is filtered and the data perimeter holds.',moves:[]};
      return {status:'violated',
        evidence:`${missing.map(m=>m.name).join(' and ')} ${missing.length===1?'is':'are'} off - egress can reach hostile ground unscreened.`,
        moves:missing.map(m=>({kind:'fix',fixKey:m.fixKey}))};
    },
  },
  {
    key:'data-residency',
    label:'Enforce data residency',
    taxonomy:'Security and compliance',
    scopes(){
      const tags=new Set();
      Object.values(CC.vpcs).forEach(vs=>vs.forEach(v=>(v.tags||[]).forEach(t=>tags.add(t))));
      return [...tags].map(t=>({kind:'tag',id:t,label:t}));
    },
    evaluate(scope){
      const w=taggedWorkloads(scope.id);
      if(!w.length)return null;
      const zones=[...new Set(w.map(x=>x.geography))];
      if(zones.length===1)
        return {status:'aligned',evidence:`Every ${scope.id} workload sits in ${zones[0]}.`,moves:[]};
      /* The estate cannot relocate a workload - that boundary is stated.
         What the fabric CAN do is pin the tag's PATH private so transit
         never leaves controlled ground; the seeded route-private rule is
         that control where one exists. */
      const hasPci=scope.id==='pci';
      return {status:'violated',
        evidence:`${scope.id} spans ${zones.join(' and ')} (${w.length} workloads). Relocation is an estate decision; the fabric can pin the path private.`,
        moves:hasPci?[{kind:'enforce',ruleId:'pol-pci'}]:[]};
    },
  },
  {
    key:'optimize-data-gravity',
    label:'Optimize data gravity',
    taxonomy:'AI and workload',
    scopes(){return [{kind:'estate',id:'ai',label:'Model placement'}];},
    evaluate(){
      const catalog=CC.modelCatalog().filter(m=>m.cloud);
      const away=catalog.filter(m=>!m.ready);
      if(!away.length)
        return {status:'aligned',evidence:'Every self-hosted model sits on an attached region - compute is beside its data.',moves:[]};
      const moves=[];
      const cw=regions().find(r=>r.regionId==='cwe');
      const nb=regions().find(r=>r.regionId==='nbe');
      if(cw&&!cw.attached)moves.push({kind:'attach',regionId:'cwe'});
      if(nb&&!nb.attached)moves.push({kind:'attach',regionId:'nbe'});
      return {status:'violated',
        evidence:`${away.length} of ${catalog.length} self-hosted models sit across the internet from the data calling them.`,
        moves};
    },
  },
  {
    key:'ai-flow-prediction',
    label:'AI-aware flow prediction',
    taxonomy:'AI and workload',
    scopes(){return CC.tokenMeterList().map(m=>({kind:'identity',id:m.tag,label:m.tag}));},
    evaluate(scope){
      const m=meterOf(scope.id);
      if(!m)return null;
      const s=CC.tokenSeries(scope.id,48);
      const q=Math.max(1,Math.floor(s.length/4));
      const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
      const first=mean(s.slice(0,q)), last=mean(s.slice(-q));
      const rising=first>0&&last>first*1.3;
      if(!rising)
        return {status:'aligned',evidence:`${scope.id}'s token flow is steady; capacity holds ahead of demand.`,moves:[]};
      const headline=`${scope.id}'s token flow rose ${Math.round(((last-first)/first)*100)}% across the window`;
      return m.pct>=90
        ? {status:'violated',
           evidence:`${headline} at ${m.pct}% of budget - the surge lands on the ceiling.`,
           moves:[{kind:'policy',tag:scope.id,patch:{budget:Math.ceil(m.budget*1.5/1e5)*1e5}}]}
        : m.pct>=60
          ? {status:'drifting',evidence:`${headline} at ${m.pct}% of budget - pre-scale before it queues.`,moves:[]}
          : {status:'aligned',evidence:`${headline}, with budget headroom to absorb it.`,moves:[]};
    },
  },
  {
    key:'lifecycle-connectivity',
    label:'Lifecycle-manage connectivity',
    taxonomy:'Operational and governance',
    scopes(){return [{kind:'estate',id:'circuits',label:'Circuit lifecycle'}];},
    evaluate(){
      /* Circuits ordered in this session finish provisioning and wait
         ("ready to attach", state-console.orderCircuit). Idle provisioned
         capacity is the lifecycle failure this intent watches. Seeded
         unattached on-ramps are the estate's normal posture and belong to
         route-by-cost, not here. Decommission-when-idle has no mutation in
         this estate - a boundary, stated. */
      const idle=CC.onramps.filter(o=>!o.active&&o.sub&&o.sub.includes('ready to attach'));
      if(!idle.length)
        return {status:'aligned',evidence:'No provisioned circuit sits idle. (Decommission automation is outside this estate.)',moves:[]};
      const moves=idle.flatMap(o=>(o.targets||[]).slice(0,1).map(([,rid])=>({kind:'attach',regionId:rid})));
      return {status:'violated',
        evidence:`${idle.length} circuit${idle.length===1?'':'s'} provisioned and never attached - paid for, carrying nothing.`,
        moves};
    },
  },
];

/* ---------- API ---------- */

CC.intentCatalog=function(){
  return CATALOG.map(c=>({key:c.key,label:c.label,taxonomy:c.taxonomy,scopes:()=>c.scopes()}));
};

function entryOf(key){return CATALOG.find(c=>c.key===key)||null;}

function readingFor(intent){
  const entry=entryOf(intent.key);
  const r=entry?entry.evaluate(intent.scope,intent):null;
  if(!r)return {status:'violated',evidence:'The engine no longer carries this scope.',moves:[],watch:null};
  if(!('watch'in r))r.watch=null;
  return r;
}

/* `silent` is hydrate's flag, like activateOnramp's: a replayed session is
   not an edit, so it pushes no undo entry and emits nothing. */
CC.declareIntent=function(key,scope,mode,silent){
  const entry=entryOf(key);
  if(!entry)return null;
  const valid=entry.scopes().some(s=>s.kind===scope.kind&&s.id===scope.id);
  if(!valid)return null;
  if(intents.some(i=>i.key===key&&i.scope.kind===scope.kind&&i.scope.id===scope.id))return null;
  if(!silent)_.pushUndo('Declare intent '+entry.label);
  const meters=CC.tokenMeterList();
  const it={
    id:'int-'+(++intentSeq),
    key,scope:{...scope},mode:mode==='enforce'?'enforce':'watch',
    declaredAt:Date.now(),
    /* Past facts recorded at the only moment they are knowable. */
    baseline:{ungoverned:meters.reduce((s,m)=>s+m.ungoverned,0)},
  };
  intents.push(it);
  if(it.mode==='enforce'&&entry.enforceControl)entry.enforceControl(it.scope,true);
  if(!silent)CC._.emit({type:'policy',label:`Intent declared · ${entry.label} · ${scope.label}`});
  return {...it};
};

CC.removeIntent=function(id){
  const i=intents.findIndex(x=>x.id===id);
  if(i<0)return false;
  const it=intents[i];
  _.pushUndo('Remove intent '+(entryOf(it.key)||{label:it.key}).label);
  intents.splice(i,1);
  CC._.emit({type:'policy',label:`Intent removed · ${it.scope.label}`});
  return true;
};

CC.setIntentMode=function(id,mode){
  const it=intents.find(x=>x.id===id);
  if(!it||!['watch','enforce'].includes(mode)||it.mode===mode)return false;
  const entry=entryOf(it.key);
  _.pushUndo(`Intent ${mode==='enforce'?'enforce':'watch'} · ${it.scope.label}`);
  it.mode=mode;
  if(entry&&entry.enforceControl)entry.enforceControl(it.scope,mode==='enforce');
  CC._.emit({type:'policy',label:`Intent ${mode} mode · ${it.scope.label}`});
  return true;
};

CC.intentList=function(){
  return intents.map(it=>({...it,scope:{...it.scope},reading:readingFor(it)}));
};

/* Is an enforce-mode cap declared for this tag? state-console's budget gate
   asks; kept here so the predicate has one home. */
CC.intentCapEnforced=function(tag){
  return intents.some(i=>i.key==='cap-token-spend'&&i.mode==='enforce'&&i.scope.id===tag);
};
})();
