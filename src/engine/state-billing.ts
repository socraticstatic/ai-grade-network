// @ts-nocheck
/* Cloud Control - NaaS billing, the egress model, and token meters.
   The money layer: everything here is derived live from the substrate,
   so attaching a circuit grows the invoice a line and completing an AI
   endpoint's prerequisites starts its meters spending. */
(function(CC){
const _=CC._;
const {onramps,regions,fixes}=CC;

/* ---------------- token meters (act two becomes live) ----------------
   Once an AI endpoint's bytes-layer prerequisites are satisfied, its
   consuming apps start SPENDING: token meters tick with the same
   cadence as policy hits, proportional to inference traffic. The
   payoff is watchable - complete the substrate, watch the tokens flow.

   TWO BUCKETS, NOT ONE.

   Agents issue traced requests before the substrate is attached - that
   is the cold-start beat, and those tokens are real spend, so nothing
   here discards them. But they rode the PUBLIC INTERNET, and a token
   metered once the endpoint is attached did not. Both facts are the
   product's story and neither can be recovered from the other after
   the fact: attaching an endpoint does not retroactively govern what
   already left, and detaching does not ungovern what already rode the
   fabric.

   So the engine carries both, distinctly:
     governed   - metered against an AT&T-controlled path
     ungoverned - metered while the identity's route was public
     today      - governed + ungoverned, the total spend

   Every consumer then STATES which bucket it means instead of
   inferring exposure from the identity's route right now. That
   inference is what printed "none of that spend leaves over the
   public internet" on /ai/cost over a total accrued entirely public. */
const tokenMeters={}; // appTag -> {governed,ungoverned,budget}
const TOKEN_BUDGETS={'rd-helion':2400000000,'classified-helion':900000000,'shared-services':1600000000};
/* The unscaled ceilings, kept so a profile switch scales from the original
   rather than compounding on whatever the last profile left behind. */
const BASE_TOKEN_BUDGETS={...TOKEN_BUDGETS};
// budgets become editable once the console module loads - read lazily
const budgetOf=tag=>CC.tokenBudgetOf?CC.tokenBudgetOf(tag):TOKEN_BUDGETS[tag];
function meterFor(tag,seedGoverned){
  return tokenMeters[tag]||(tokenMeters[tag]={governed:seedGoverned||0,ungoverned:0,budget:budgetOf(tag)});
}
/* Governed means "on an AT&T-controlled path" - read off modelRoutes(),
   the ONE path derivation this estate has. `promptTrace` stamps the same
   predicate on its Network-path hop, /ai/observe renders it in its Route
   column and /ai/connect in its catalog state, so a token's bucket and
   every sentence about that token's path come from one source. */
function governedPathFor(tag){
  const r=modelRoutes().find(x=>x.tag===tag);
  return !!r&&r.path!=='public';
}
/* `governed` is optional: a caller that KNOWS the path it took (promptTrace
   walked it hop by hop) passes it; anything else gets the honest answer for
   the identity's route at meter time. */
CC.meterTokens=function(tag,n,governed){
  const m=meterFor(tag);
  const g=governed===undefined?governedPathFor(tag):!!governed;
  if(g)m.governed+=n;else m.ungoverned+=n;
};
function endpointReadyFor(tag){
  if(tag==='rd-helion')return regions.cw.find(r=>r.id==='cwe').attached&&fixes.segmentHelion;
  if(tag==='classified-helion')return regions.neb.find(r=>r.id==='nbe').attached&&fixes.fwInspection;
  if(tag==='shared-services')return onramps.find(o=>o.id==='nb2').active;
  return false;
}
function tickTokens(rng){
  let any=false;
  Object.keys(TOKEN_BUDGETS).forEach(tag=>{
    /* Readiness is strictly stronger than attachment (it also wants the
       identity's governance fix), so anything this gate lets through is on
       an AT&T path by construction - every token it adds is governed. */
    if(!endpointReadyFor(tag))return;
    const seed=Math.round(budgetOf(tag)*0.22);
    const m=meterFor(tag,seed);
    /* An agent trace can create the meter (at a few hundred tokens) before
       the endpoint attaches, which silently discarded the adoption seed and
       left a just-attached estate accruing from zero. The seed is the floor:
       apply it on the first governed tick, whoever created the meter. */
    if(m.governed+m.ungoverned<seed)m.governed=seed;
    const gbps=CC.flows().filter(f=>f.srcTag===tag&&f.dst==='ai-endpoints').reduce((s,f)=>s+f.gbps,0);
    m.governed+=Math.round(gbps*(900000+rng()*700000));
    any=true;
  });
  return any;
}
/* the rule engine's tickHits drives this on its own cadence */
_.tickTokens=tickTokens;
/* Estate-scale token seeding, driven by estateProfile.ts.
   The bank demo has to read like a bank: an enterprise runs billions of
   tokens a day whether or not AT&T governs them, and it is precisely the
   UNgoverned volume that is the argument. Meters that start at zero and
   accrue only once an endpoint is attached made the flagship AI layer open
   on "$62.83 spent today", which reads as a hobby project rather than a
   institution. Scale the ceilings, then seed the day already in progress;
   the governed/ungoverned split still comes from readiness, so nothing here
   claims AT&T is carrying traffic it is not. */
_.scaleTokenBudgets=function(factor){
  Object.keys(TOKEN_BUDGETS).forEach(tag=>{TOKEN_BUDGETS[tag]=Math.round(BASE_TOKEN_BUDGETS[tag]*factor);});
  /* budgetOf() defers to CC.tokenBudgetOf once state-console loads, and
     that reads state-console's OWN editable tokenPolicies store - so
     scaling only this module's constant would be silently ignored by every
     figure on screen. Scale the policy budgets too, from their own
     captured baseline, so the ceiling a viewer edits and the ceiling the
     meters measure against stay the same number. */
  const pol=_.tokenPolicies;
  if(!pol)return;
  if(!_.baseTokenPolicyBudgets){
    _.baseTokenPolicyBudgets={};
    Object.keys(pol).forEach(t=>{_.baseTokenPolicyBudgets[t]=pol[t].budget;});
  }
  Object.keys(pol).forEach(t=>{pol[t].budget=Math.round(_.baseTokenPolicyBudgets[t]*factor);});
};
_.seedTokenDay=function(fraction){
  Object.keys(TOKEN_BUDGETS).forEach(tag=>{
    const today=Math.round(budgetOf(tag)*fraction);
    const governed=endpointReadyFor(tag)?today:0;
    tokenMeters[tag]={governed,ungoverned:today-governed,budget:budgetOf(tag)};
  });
};
_.resetTokenMeters=function(){Object.keys(tokenMeters).forEach(t=>delete tokenMeters[t]);};
/* The raw store rides `_` for the same reason tickTokens does: a test that
   freezes the estate needs to drain what a 3s tick metered BEFORE the freeze
   ran - module loading is async under vite-node, so under a loaded runner the
   interval can fire between the engine import finishing and a test file's own
   module scope executing. Nothing in the app reads this. */
_.tokenMeters=tokenMeters;
function tokenMeterList(){
  return Object.keys(TOKEN_BUDGETS).map(tag=>{
    const ready=endpointReadyFor(tag);
    const m=tokenMeters[tag];
    const governed=m?m.governed:0,ungoverned=m?m.ungoverned:0;
    const today=governed+ungoverned;
    return {tag,ready,governed,ungoverned,today,budget:budgetOf(tag),
      pct:Math.min(100,Math.round(today/budgetOf(tag)*100))};
  });
}
/* model routing: app -> model class -> endpoint -> path, all derived.
   Each route carries the `tag` it belongs to. Consumers used to pair a route
   with its meter by ARRAY INDEX, which held only while both lists iterated
   the same keys in the same order - and every path sentence on every AI
   screen would have described the wrong identity the first time one of them
   stopped. The tag makes the pairing a lookup. */
function modelRoutes(){
  const routes=[];
  const cwReady=regions.cw.find(r=>r.id==='cwe').attached;
  const nbReady=regions.neb.find(r=>r.id==='nbe').attached;
  const nb2=onramps.find(o=>o.id==='nb2').active;
  routes.push({tag:'rd-helion',app:'Project Helion · R&D',model:'helion-70b (self-hosted)',endpoint:'CoreWeave H100',cloud:'cw',
    path:cwReady?'private':'public',guardrail:fixes.segmentHelion?'segmented':null});
  routes.push({tag:'classified-helion',app:'Project Helion · Classified',model:'helion-cls-13b (air-gapped)',endpoint:'Nebius L40S',cloud:'neb',
    path:nbReady?'private':'public',guardrail:fixes.fwInspection?'inline guardrail':null});
  routes.push({tag:'shared-services',app:'Shared Platform Services',model:'GPT-class (external)',endpoint:'OpenAI API',cloud:null,
    path:nb2?'governed egress':'public',guardrail:nb2?'metered':null});
  return routes;
}

/* ---------------- NaaS billing (the bill) ----------------
   As-a-service means a consumption invoice: circuit port fees for
   active on-ramps, egress at public vs committed rates, a monthly
   commit with burst above it. Derived live - attach a circuit and the
   invoice grows a line. */
const PORT_FEES={'NetBond':4200,'Direct Connect':3800,'ExpressRoute':3800,'NetBond Adv':5600};
const COMMIT=30000; // $/mo committed spend - committed-rate egress draws down against it
function billing(){
  const e=egress();
  const circuits=onramps.filter(o=>o.active).map(o=>({
    name:o.name,type:o.type,fee:PORT_FEES[o.type]||4000,
    utilization:o.id==='nb1'?utilization():Math.min(92,38+CC.activeOnramps()*9)}));
  const portTotal=circuits.reduce((s,c)=>s+c.fee,0);
  const lines=[
    ...circuits.map(c=>({item:`${c.name} · 10G port`,kind:'circuit',amount:c.fee,note:`${c.utilization}% utilized`})),
    {item:'Egress · committed private rate',kind:'usage',amount:e.priv,note:'draws against commit'},
    ...(e.pub?[{item:'Egress · public internet (uncommitted)',kind:'usage',amount:e.pub,note:'no SLA, market rate'}]:[]),
  ];
  const total=portTotal+e.priv+e.pub;
  const commitDraw=Math.min(COMMIT,portTotal+e.priv);
  return {lines,total,commit:COMMIT,commitDraw,
    commitPct:Math.min(100,Math.round(commitDraw/COMMIT*100)),
    burst:Math.max(0,portTotal+e.priv-COMMIT),
    uncommitted:e.pub,savings:e.savings,forecast:e.forecast};
}

/* Virtual ports - the on-demand consumption lens: each active on-ramp is a
   virtual port, spun up on demand, billed for what it carries. Derived from
   the same on-ramp + fee model the invoice uses, so it never disagrees. */
function virtualPorts(){
  const ports=onramps.filter(o=>o.active).map(o=>({
    name:o.name,type:o.type,capacityGbps:10,
    utilization:o.id==='nb1'?utilization():Math.min(92,38+CC.activeOnramps()*9),
    ratePerMo:PORT_FEES[o.type]||4000,
  }));
  const e=egress();
  return {ports,active:ports.length,
    consumptionMo:ports.reduce((s,p)=>s+p.ratePerMo,0)+e.priv+e.pub};
}

/* Egress model - honest-middle per-bucket arbitrage.
   Each bucket carries an explicit public (hyperscaler) rate and an AT&T
   committed rate; a bucket is "captured" onto the fabric when its on-ramp is
   active (or its fix applied; base-private is always private). Captured
   buckets bill at attCost; the rest bill at publicCost. This one model feeds
   egress()/billing() AND arbitrage(), so the invoice, Observe's egress KPIs,
   and the arbitrage hero agree by construction.

   Calibration (honest middle): internet/cross-cloud egress gets the big
   per-GB win; committed base stays a modest ~18%, so the blended headline is
   ~40% when fully attached and stays defensible to a technical buyer. */
const BUCKETS=[
  {k:'gpu',        label:'GPU inference egress', category:'internet',
   publicCost:11400, attCost:3400,  onrampId:'nb2', captured:()=>onramps.find(o=>o.id==='nb2').active},
  {k:'aws-west-eu',label:'AWS West / EU',        category:'cross-cloud',
   publicCost:9500,  attCost:3300,  onrampId:'dx1', captured:()=>onramps.find(o=>o.id==='dx1').active},
  {k:'azure',      label:'Azure cross-cloud',    category:'cross-cloud',
   publicCost:6000,  attCost:2100,  onrampId:'er1', captured:()=>onramps.find(o=>o.id==='er1').active},
  {k:'misc',       label:'Misc internet egress', category:'internet',
   publicCost:3000,  attCost:1200,  onrampId:null,  captured:()=>fixes.shiftAws},
  {k:'base-private',label:'Committed base',       category:'committed',
   publicCost:18300, attCost:15000, onrampId:null,  captured:()=>true},
];
/* Public vs committed $/mo from the current attach state, before the steer
   overlay: captured buckets contribute attCost to private, the rest their
   publicCost to public. */
function rawBuckets(){
  let pub=0,priv=0;
  BUCKETS.forEach(b=>{if(b.captured())priv+=b.attCost;else pub+=b.publicCost;});
  return {pub,priv};
}
/* Σ publicCost over ALL buckets - what the estate would cost fully on public
   (hyperscaler) egress; the arbitrage ceiling. */
function hyperscalerEgress(){return BUCKETS.reduce((s,b)=>s+b.publicCost,0);}
/* Σ attCost over ALL buckets - what it would cost with EVERY bucket captured
   onto the fabric; the opportunity floor. */
function fabricEgress(){return BUCKETS.reduce((s,b)=>s+b.attCost,0);}
/* committed pricing is ~15% under public rates - a steered public flow's
   dollars land here when the operator overrides it onto an AT&T path. */
const STEER_DISCOUNT=0.15;

/* ---- steer baselines, frozen once at module load ----
   Captured with zero steers and only the seed on-ramp active, so they are
   deterministic (no Date.now / Math.random). The steer economics value a
   steered public flow as its SHARE of this baseline public spend - the same
   share-of-public-spend model costMath uses - so the invoice, the egress
   split, and "captured this session" all reconcile on one scale. */
const BASELINE_PUB=rawBuckets().pub;              // public $/mo with zero steers
let BASELINE_PUBLIC_GBPS=1;                        // sum of gbps over seed public flows
let BASELINE_PUBLIC_IDS=new Set();                 // ids of the seed public flows
try{
  const seed=CC.routeFlows();
  const pubRows=seed.filter(r=>!r.current.attControlled);
  BASELINE_PUBLIC_IDS=new Set(pubRows.map(r=>r.id));
  BASELINE_PUBLIC_GBPS=pubRows.reduce((s,r)=>s+r.gbps,0)||1;
}catch(e){/* routing not ready at load; share stays 0 until first egress() */}

/* Fraction of the baseline public Gbps that is currently STEERED onto an
   AT&T-controlled path (a flow the operator overrode public->private). */
function steeredShare(){
  let g=0;
  try{
    CC.routeFlows().forEach(r=>{
      if(r.steered&&r.current.attControlled&&BASELINE_PUBLIC_IDS.has(r.id))g+=r.gbps;
    });
  }catch(e){}
  return Math.min(1,Math.max(0,g/BASELINE_PUBLIC_GBPS));
}

function egress(){
  const {pub:rawPub,priv:rawPriv}=rawBuckets();
  // a steered public flow moves its share of the ORIGINAL public spend onto an
  // AT&T-committed path; capped at what's actually still public so priv is
  // never over-credited (floor pub at 0).
  const pubReduction=Math.min(rawPub,BASELINE_PUB*steeredShare());
  const pub=Math.max(0,rawPub-pubReduction);
  // moved dollars re-price at the committed rate (15% under public): the bill
  // genuinely drops by the discount on what was steered. Round the discount so
  // the invoice total stays a clean integer (the raw share is fractional).
  const steerDiscount=Math.round(pubReduction*STEER_DISCOUNT);
  const priv=rawPriv+pubReduction-steerDiscount;
  const currentEgress=pub+priv;                    // = rawPub+rawPriv - steerDiscount
  // savings = what the fabric saves vs paying all-public for the same estate.
  const savings=Math.round(hyperscalerEgress()-currentEgress);
  return {total:currentEgress,pub,priv,savings,
    forecast:pub>20000?'+9%':pub>6000?'+3%':'-4%'};
}
function utilization(){return fixes.shiftAws?85:60;}

/* Arbitrage - the AT&T-vs-hyperscaler differentiator, all derived from the
   same per-bucket model and the same attach state as egress()/billing(), so
   the hero, the invoice, and Observe's KPIs reconcile by construction. */
function arbitrage(){
  const buckets=BUCKETS.map(b=>{
    const saving=b.publicCost-b.attCost;
    return {key:b.k,label:b.label,category:b.category,
      publicCost:b.publicCost,attCost:b.attCost,
      saving,savingPct:Math.round(saving/b.publicCost*100),
      attached:b.captured(),onrampId:b.onrampId};
  }).sort((a,b)=>b.saving-a.saving);          // opportunity ranking, biggest first
  const e=egress();
  const currentEgress=e.pub+e.priv;           // == e.total
  // Bills are EGRESS-ONLY: port fees are the fabric's access cost, disclosed
  // separately (portFeesMo) so the arbitrage comparison stays clean and the
  // hyperscaler ceiling is attach-invariant.
  const hyperscalerBill=hyperscalerEgress();            // Σ publicCost, all buckets
  const cloudConnectBill=currentEgress;                 // current egress (pub+priv)
  const fullyFabricBill=fabricEgress();                 // Σ attCost, all buckets
  const savings=hyperscalerBill-cloudConnectBill;       // realized so far
  const availableSavings=cloudConnectBill-fullyFabricBill; // still on the table
  const portFeesMo=onramps.filter(o=>o.active)
    .reduce((s,o)=>s+(PORT_FEES[o.type]||4000),0);       // current access cost
  const fullyFabricPortFeesMo=onramps
    .reduce((s,o)=>s+(PORT_FEES[o.type]||4000),0);       // if every on-ramp attached
  return {hyperscalerBill,cloudConnectBill,savings,
    savingsPct:Math.round(savings/hyperscalerBill*100),
    fullyFabricBill,availableSavings,
    portFeesMo,fullyFabricPortFeesMo,buckets};
}

Object.assign(CC,{billing,tokenMeterList,modelRoutes,egress,arbitrage,utilization,virtualPorts});
})(window.CC);
