// @ts-nocheck
/* Cloud Control - the mid-mile routing control plane (PRD O1 / U3).
   Builds on the existing flow table (CC.flows): collapses it to the
   significant steerable flows, computes candidate PATHS per flow (the
   hyperscaler-native public path vs AT&T mid-mile paths via each on-ramp
   that reaches the region), and lets the operator STEER/override the
   route - including cloud-to-cloud. Everything derives from the same
   substrate so % under control, diversity, and failover reconcile with
   Discovery (attach), Policies (route-private), and Observability. */
(function(CC){
const _=CC._;
const {onramps,regions,vpcs,clouds}=CC;
const PUBLIC_EGRESS=0.09, PRIVATE_EGRESS=0.02;
const FAILOVER={attMs:1800, nativeMs:47000};   // representative; sub-2s vs tens of seconds

/* ---- THE latency derivation (option 1: one surface, everything downstream) ----

   The AI-grade network used to carry three latency vocabularies for one estate:
   `fabricModel().latencyMs` on /discover, Connect's Performance tile and the
   PathChoice cards; the raw seed `r.lat` (and `r.lat*1.7`) on every
   /naas/observe flow row; and a bare `~12ms` literal in the network briefing.
   us-east-1 read 3ms on Connect and 12ms on its AT&T-controlled flow row one
   click away — the same private path into the same region, two figures.

   The alternative was to keep the flow figure seed-derived and LABEL the two
   apart. It does not hold: once a flow is steered onto the AT&T path, the
   flow's latency and the region's private-path latency are the same object at
   the same granularity. No label dissolves 3 vs 12. So every latency now
   derives from `_regionLatencyMs` and nothing else:

     private (AT&T) path  = the region's fabric RTT to the on-ramp serving it
     public path          = the same figure x PUBLIC_TRANSIT_FACTOR

   The two agree exactly where they measure the same thing and differ only
   where the PATH differs — which every table already names in its Path column.
   Deriving the public figure from the private one (rather than from an
   unrelated seed) also guarantees public > private everywhere, so the
   advisor's "steer here, −Nms" can never recommend a slower path. */
const PUBLIC_TRANSIT_FACTOR=1.7;

const steered={};          // rowId -> pathId (operator override)
const failedPaths=new Set();// pathIds knocked out by failover sim
let lastFailover=null;     // {rowId, from, to, attMs, nativeMs}
const history=[];          // route-change log: {kind, label, detail}
function log(kind,label,detail){history.unshift({kind,label,detail});if(history.length>12)history.pop();}

const DST_LABEL={'ai-endpoints':'AI endpoints','internet':'public internet','storage':'object storage','intra-tag':'intra-app mesh'};

// vpc id -> {cid, rid, lat, attached}
function vpcLoc(){
  const m={};
  clouds.forEach(c=>(regions[c.id]||[]).forEach(r=>(vpcs[r.id]||[]).forEach(v=>{m[v.id]={cid:c.id,rid:r.id,attached:r.attached};})));
  return m;
}
function rampsFor(cid,rid){ return onramps.filter(o=>o.targets.some(([c,r])=>c===cid&&r===rid)); }
function regionAttached(cid,rid){const r=(regions[cid]||[]).find(x=>x.id===rid);return !!(r&&r.attached);}

/* candidate paths for a flow rooted in cloud/region. Both latencies come off
   `regionLatency` — the same derivation Connect's Performance tile, the
   PathChoice cards and Discover's Latency tile render — so an AT&T row on
   /naas/observe states the region's figure exactly, not a second opinion. */
function pathsForRegion(cid,rid){
  const L=_latencyPair(cid,rid);
  const paths=[{id:'public',label:'Hyperscaler-native',sub:'public internet',via:null,mechanism:'public',
    latencyMs:L.publicMs,egressPerGb:PUBLIC_EGRESS,attControlled:false,diversityGroup:'public',available:true}];
  rampsFor(cid,rid).forEach(o=>{
    const id='att-'+o.id;
    paths.push({id,label:'AT&T mid-mile',sub:o.name,via:o.id,
      mechanism:o.active?'native-route':'overlay',
      latencyMs:L.privateMs,egressPerGb:PRIVATE_EGRESS,attControlled:true,diversityGroup:o.site.name,
      available:o.active && !failedPaths.has(id)});
  });
  return paths;
}
function defaultPathId(flowViaPublic,paths){
  const att=paths.find(p=>p.attControlled&&p.available);
  return (!flowViaPublic && att)?att.id:'public';
}
function currentPath(row){
  let id=steered[row.id]||row.defaultPathId;
  let p=row.paths.find(x=>x.id===id);
  if(!p||!p.available){ // steered/default path went down -> reroute to best available
    p=row.paths.find(x=>x.attControlled&&x.available)||row.paths.find(x=>x.id==='public');
  }
  return p;
}
function availableAtt(row){return row.paths.filter(p=>p.attControlled&&p.available);}
function isDiverse(row){
  const groups=new Set(availableAtt(row).map(p=>p.diversityGroup));
  return groups.size>=2;
}

/* explicit cloud-to-cloud flows (U3) - flows() does not model dst=cloud.
   The steerable hop is the mid-mile (AT&T backbone) vs the public internet.

   Endpoints are REGION IDS, not a sentence. The label, the destination cloud
   the scene graph draws into, and both path latencies all derive from the
   pair, so nothing is stated twice and nothing is parsed back out of prose.
   (The scene graph used to recover the far end with /Azure/.test(label) and
   fall through to `c-oci` — so "AWS us-east-1 ↔ CoreWeave" drew an edge into
   the Oracle Cloud node, and "Azure West US 2 ↔ Nebius" drew one out of AWS.)

   `pops` are the AT&T backbone PoPs that can carry the pair; the path id stays
   att-iad / att-dal because `failedPaths` and the failover log key on it. */
const C2C_PAIRS=[
  {id:'c2c-aws-azure',a:['aws','use1'],b:['azure','wus2'],gbps:6.3,pops:['nb1','nb2']},
  {id:'c2c-aws-gcp',a:['aws','use1'],b:['gcp','usc1'],gbps:2.4,pops:['nb1','nb2']},
  {id:'c2c-aws-cw',a:['aws','use1'],b:['cw','cwe'],gbps:4.1,pops:['nb2'],dci:'GPU inference DCI'},
  {id:'c2c-azure-neb',a:['azure','wus2'],b:['neb','nbe'],gbps:2.9,pops:['nb2'],dci:'classified GPU DCI'},
];
const POP_PATH_ID={nb1:'att-iad',nb2:'att-dal'};

function cloudToCloud(){
  // AI-cloud DCI pairs: the backbone GPU path exists only once the GPU
  // on-ramp (nb2, which attaches CoreWeave + Nebius) is up - so east-west
  // reconciles with Discovery attach the same way north-south does.
  const gpuUp=onramps.find(o=>o.id==='nb2').active;
  return C2C_PAIRS.map(pair=>{
    const A=_findRegion(pair.a[1]), B=_findRegion(pair.b[1]);
    // A pair's endpoint region is fixed by id (e.g. azure/wus2) - acme's own
    // seed, not a claim every estate profile holds. Meridian replaces azure's
    // region set with scus/eus2, so wus2 no longer resolves; same null-guard
    // idiom as the branch-flow loop above (state-rules.ts) rather than a
    // crash - a DCI pair this estate doesn't model just isn't listed, not a
    // broken row.
    if(!A||!B)return null;
    const label=`${A.cloud.name} ${A.r.name} ↔ ${B.cloud.name} ${B.r.name}`+(pair.dci?` (${pair.dci})`:'');
    /* Sorted shortest-first, because `currentPath` and `routeAdvisor` both take
       "the first available AT&T path" — so the reroute and the recommendation
       land on the best one. A pair's SECOND PoP is a detour by construction (a
       diverse path leaves the direct line; that is what diversity costs). */
    const att=pair.pops.map(popId=>{
      const o=onramps.find(x=>x.id===popId);
      const id=POP_PATH_ID[popId];
      const city=o.site.name.split(' · ').pop();
      return {id,label:'AT&T mid-mile',sub:`backbone · ${city} PoP`+(pair.dci?' · GPU DCI':''),
        via:popId,mechanism:'native-route',latencyMs:_pairRttMs(A.r,B.r,o),
        egressPerGb:PRIVATE_EGRESS,attControlled:true,diversityGroup:city,
        available:(pair.dci?gpuUp:true)&&!failedPaths.has(id)};
    }).sort((x,y)=>x.latencyMs-y.latencyMs);
    /* East-west PUBLIC latency derives from the two ENDPOINTS' own geography,
       never from the AT&T route that happens to serve them: the public internet
       does not ride AT&T's PoPs. Pricing it as `best AT&T route × factor` made
       `AWS us-east-1 ↔ CoreWeave US-EAST-04A` render "Public internet · 100ms"
       — Virginia to New Jersey — because the only PoP reaching CoreWeave is in
       Dallas, so the pair's AT&T detour was charged to a path that never goes
       near Dallas. It also drove /naas/observe's P95 KPI to 265ms beside a
       briefing on the same screen naming 204ms as the estate's public outlier.

       `_pairRttMs(A,B,null)` IS that derivation: the direct great circle with
       PUBLIC_TRANSIT_FACTOR applied — the same coefficient, and the same fiber
       constants, north-south uses. So public and private still differ only by
       the path, and the AT&T figure is still the one that changes when the
       fabric changes.

       Where the fabric route is genuinely longer than the straight line (the
       GPU DCI: New Jersey reached through Dallas), the row says so and the
       advisor states the sign of the difference — see `routeAdvisor`. A path
       that costs latency still buys the egress rate and the control; a figure
       bent to hide that is the thing this file exists to stop. */
    const paths=[{id:'public',label:'Public internet',sub:pair.dci?'GPU-cloud public peering':'hyperscaler-native peering',
      via:null,mechanism:'public',latencyMs:_pairRttMs(A.r,B.r,null),
      egressPerGb:PUBLIC_EGRESS,attControlled:false,diversityGroup:'public',available:true},...att];
    return {id:pair.id,kind:'c2c',label,gbps:pair.gbps,srcCloud:pair.a[0],dstCloud:pair.b[0],
      viaPublic:pair.dci?!gpuUp:true,paths};
  }).filter(Boolean);
}

// the curated, steerable flow set
function routeFlows(){
  const loc=vpcLoc();
  // aggregate the raw flow table by (tag, dst); keep a representative region (highest-gbps contributor)
  const agg={};
  CC.flows().forEach(f=>{
    if(f.dst==='intra-tag')return; // mesh handled conceptually; keep the list focused
    const l=loc[f.srcVpc]; if(!l)return;
    const key=f.srcTag+'|'+f.dst;
    const a=agg[key]||(agg[key]={tag:f.srcTag,dst:f.dst,gbps:0,viaPublic:false,best:0,cid:l.cid,rid:l.rid});
    a.gbps+=f.gbps; a.viaPublic=a.viaPublic||f.viaPublic;
    if(f.gbps>a.best){a.best=f.gbps;a.cid=l.cid;a.rid=l.rid;}
  });
  const rows=Object.values(agg)
    .filter(a=>a.gbps>=1.5)                 // significant flows only
    .sort((x,y)=>y.gbps-x.gbps)
    .map(a=>{
      const paths=pathsForRegion(a.cid,a.rid);
      // default follows the representative region's actual attachment (consistent
      // with Discovery: attached region => already on the AT&T private path).
      const viaPublic=!regionAttached(a.cid,a.rid);
      // `dst` is projected, not just folded into the id/label: callers that
      // need "which flows go to AI endpoints" must not have to parse a string.
      // Discover's AI blurb reads it to check its own claim against this table.
      const row={id:'r-'+a.tag+'-'+a.dst,kind:'app',dst:a.dst,
        label:tagName(a.tag)+' → '+(DST_LABEL[a.dst]||a.dst),
        srcCloud:a.cid,srcRid:a.rid,gbps:Math.round(a.gbps*10)/10,viaPublic,paths};
      row.defaultPathId=defaultPathId(viaPublic,paths);
      return row;
    });
  // attach cloud-to-cloud (set their default = public unless steered)
  cloudToCloud().forEach(c=>{c.defaultPathId=defaultPathId(c.viaPublic,c.paths);rows.push(c);});
  // resolve current path + diversity for each
  rows.forEach(r=>{r.current=currentPath(r);r.diverse=isDiverse(r);r.steered=!!steered[r.id];});
  return rows;
}
function tagName(t){const tg=CC.TAGS[t];return tg?tg.label:(t==='untagged'?'Untagged':t);}

function steerFlow(rowId,pathId){
  steered[rowId]=pathId;
  const r=routeFlows().find(x=>x.id===rowId);
  if(r)log('steer',r.label,'steered onto '+(r.current.label+(r.current.sub?' · '+r.current.sub:'')));
  _.emit({type:'route',rowId,pathId});return true;
}
function clearSteer(rowId){
  const r=routeFlows().find(x=>x.id===rowId);
  delete steered[rowId];
  if(r)log('revert',r.label,'reverted to hyperscaler-native');
  _.emit({type:'route',rowId});return true;
}

function routingKpis(){
  const rows=routeFlows();
  const total=rows.reduce((s,r)=>s+r.gbps,0)||1;
  const controlled=rows.filter(r=>r.current.attControlled);
  const ctrlGbps=controlled.reduce((s,r)=>s+r.gbps,0);
  const diverseGbps=controlled.filter(r=>r.diverse).reduce((s,r)=>s+r.gbps,0);
  // north-south = app egress/storage/AI flows; east-west = cloud-to-cloud
  const ew=rows.filter(r=>r.kind==='c2c'), ns=rows.filter(r=>r.kind!=='c2c');
  const pct=(sub)=>{const t=sub.reduce((s,r)=>s+r.gbps,0)||0;const c=sub.filter(r=>r.current.attControlled).reduce((s,r)=>s+r.gbps,0);return t?Math.round(c/t*100):0;};
  return {
    pctUnderControl:Math.round(ctrlGbps/total*100),
    pctDiverse:ctrlGbps?Math.round(diverseGbps/ctrlGbps*100):0,
    flowsSteered:Object.keys(steered).length,
    controlledGbps:Math.round(ctrlGbps*10)/10,
    totalGbps:Math.round(total*10)/10,
    eastWestGbps:Math.round(ew.reduce((s,r)=>s+r.gbps,0)*10)/10,
    eastWestControlledPct:pct(ew),
    northSouthControlledPct:pct(ns),
    failover:lastFailover?{attMs:lastFailover.attMs,nativeMs:lastFailover.nativeMs}:FAILOVER,
    failoverActive:!!lastFailover,
  };
}

// knock out the flow's current AT&T path; reroute to the diverse path; measure vs native
function routingFailover(rowId){
  const row=routeFlows().find(r=>r.id===rowId);
  if(!row||!row.current.attControlled)return null;
  const downId=row.current.id, downVia=row.current.via;
  failedPaths.add(downId);
  // reflect in Discovery's failure sim too, when this is a real on-ramp path
  if(downVia&&onramps.find(o=>o.id===downVia&&o.active)){try{CC.simulateFailure(downVia);}catch(e){}}
  const after=routeFlows().find(r=>r.id===rowId);
  lastFailover={rowId,from:row.current.sub||row.current.label,to:(after.current.sub||after.current.label),attMs:FAILOVER.attMs,nativeMs:FAILOVER.nativeMs};
  log('failover',row.label,`path down → rerouted ${lastFailover.from} → ${lastFailover.to} in ${(FAILOVER.attMs/1000).toFixed(1)}s (public path: ~${Math.round(FAILOVER.nativeMs/1000)}s)`);
  _.emit({type:'route-failover',rowId});
  return lastFailover;
}
function routingRestore(){failedPaths.clear();lastFailover=null;try{CC.clearSim();}catch(e){}_.emit({type:'route-restore'});}
function routeHistory(){return history.slice();}

/* ---- scene graph for the isometric canvas: edge -> AT&T mid-mile -> clouds ---- */
// First-mile ingress labeled with the AT&T transport product that carries it:
// AVPN (MPLS VPN), ADI (Dedicated Internet), ABF (Business Fiber), plus
// Mobility/Wireless and the public Internet on-ramp.
const EDGE_NODES=[
  {id:'e-hq',label:'HQ · Dallas · AVPN',kind:'edge'},
  {id:'e-dc',label:'DC · Ashburn · ADI',kind:'edge'},
  {id:'e-branch',label:'Branch · ABF',kind:'edge'},
  {id:'e-mob',label:'Mobility · Wireless',kind:'edge'},
  {id:'e-net',label:'Internet',kind:'edge'},
];
function popNodes(){return onramps.map(o=>({id:'p-'+o.id,label:o.name,site:o.site.name,kind:'pop',active:o.active,onramp:o.id}));}
function cloudNodes(){return clouds.map(c=>({id:'c-'+c.id,label:c.name,kind:'cloud',cloud:c.id,ai:!!c.ai,attached:!!c.attached}));}
// map a flow's current path -> the PoP node it rides (or null for public)
function popForPath(p){
  if(!p||!p.attControlled)return null;
  if(p.via&&onramps.find(o=>o.id===p.via))return 'p-'+p.via;
  // c2c backbone PoPs (att-iad/att-dal) map to nb1/nb2 sites
  if(p.id==='att-iad')return 'p-nb1';
  if(p.id==='att-dal')return 'p-nb2';
  return null;
}
function sceneGraph(){
  const edge=EDGE_NODES.map((n,i)=>({...n,gx:0,gy:i*1.6+0.5}));
  const pops=popNodes().map((n,i)=>({...n,gx:4,gy:i*1.6+0.2}));
  const cl=cloudNodes().map((n,i)=>({...n,gx:8.5,gy:i*1.35}));
  const nodes=[...edge,...pops,...cl];
  const flows=routeFlows();
  // curated, readable subset: controlled flows first (so the AT&T-green paths
  // always show), then the largest public ones, plus cloud-to-cloud.
  const appAll=flows.filter(f=>f.kind!=='c2c');
  const ctrl=appAll.filter(f=>f.current.attControlled).sort((a,b)=>b.gbps-a.gbps);
  const pub=appAll.filter(f=>!f.current.attControlled).sort((a,b)=>b.gbps-a.gbps);
  const app=[...ctrl,...pub].slice(0,5);
  const c2c=flows.filter(f=>f.kind==='c2c');
  const edges=[];
  app.forEach((f,i)=>{
    const to='c-'+f.srcCloud;
    const via=popForPath(f.current);
    edges.push({id:'edge-'+f.id,flowId:f.id,from:EDGE_NODES[i%EDGE_NODES.length].id,via,to,
      cls:f.current.attControlled?(f.current.mechanism==='overlay'?'overlay':'controlled'):'public',
      gbps:f.gbps,label:f.label,latencyMs:f.current.latencyMs});
  });
  c2c.forEach(f=>{
    // Both ends come off the row's own endpoint ids. Reading them back out of
    // the label (/Azure/ ... else 'c-oci') drew the CoreWeave DCI edge into
    // Oracle Cloud and drew the Azure↔Nebius edge out of AWS.
    const via=popForPath(f.current);
    edges.push({id:'edge-'+f.id,flowId:f.id,from:'c-'+f.srcCloud,via,to:'c-'+f.dstCloud,kindC2C:true,
      cls:f.current.attControlled?'controlled':'public',gbps:f.gbps,label:f.label,latencyMs:f.current.latencyMs});
  });
  return {nodes,edges};
}

/* ---- agentic advisor (Akira-style): recommendations + auto-events ---- */
function routeAdvisor(){
  const flows=routeFlows();
  const recs=[];
  flows.forEach(f=>{
    if(!f.current.attControlled){
      const att=f.paths.find(p=>p.attControlled&&p.available);
      if(att){
        const pub=f.paths.find(p=>p.id==='public')||f.current;
        /* The latency delta is stated WITH ITS SIGN. `Math.max(0, …)` printed
           "−0ms" for the one pair whose AT&T path is genuinely longer than the
           public one — the GPU DCI reaches CoreWeave's New Jersey region only
           through the Dallas PoP — so the recommendation claimed a saving the
           flow table beside it contradicted. Cost and control are why that
           steer is still worth making; the sentence now leads with them and
           names the latency it costs. */
        const dLat=Math.round((pub.latencyMs||0)-(att.latencyMs||0));
        const dCost=Math.round(((pub.egressPerGb||0.09)-(att.egressPerGb||0.02))*100)/100;
        const latPhrase=dLat>0?`−${dLat}ms`:dLat<0?`+${-dLat}ms`:'no latency change';
        recs.push({id:'rec-'+f.id,flowId:f.id,pathId:att.id,
          title:f.label+' is on the public internet',
          detail:`Recommend steer to ${att.label}${att.sub?' · '+att.sub:''} — −$${dCost}/GB and AT&T-controlled, ${latPhrase}`,
          action:'steer'});
      }
    } else if(!f.diverse){
      recs.push({id:'rec-div-'+f.id,flowId:f.id,
        title:f.label+' has a single path',
        detail:'Attach a second on-ramp to make this flow diverse (failover without dropping to public).',
        action:'diversify'});
    }
  });
  const events=history.filter(h=>h.kind==='failover').slice(0,3).map(h=>({title:h.label,detail:h.detail}));
  /* STEER recommendations rank above DIVERSIFY ones, because the list is
     truncated and /naas/cost's "Steer to save" panel reads only the steers out
     of what survives.

     After the tour's own Connect beat (`activateOnramp('nb2')`) five
     controlled-but-single-homed flows filled the top five, so that panel
     rendered "Every flow is already on its optimal path — there is nothing
     left to steer" while /naas/observe's flow table, one click away, listed
     `AWS us-east-1 ↔ Azure West US 2` and `AWS us-east-1 ↔ Google Cloud
     us-central1` as `Public internet · Uncontrolled` — each with an available
     AT&T path and a live Steer button in its own Action column.

     A truncation must never drop the whole class of recommendation another
     screen states is empty. Steers also carry an action and two figures; a
     diversity note is advice about a path that does not exist yet. Ordering is
     stable within each class (`routeFlows()` order), so nothing here depends on
     a clock or a sort of equal keys. */
  const ranked=[...recs.filter(r=>r.action==='steer'),...recs.filter(r=>r.action!=='steer')];
  return {recommendations:ranked.slice(0,5),events};
}

/* ---- fabric model (Cloud Fabric redesign C1): Sites → AT&T Fabric → Regions ----
   A shaped, deterministic view the fabric UI renders. Everything derives from the
   same substrate (EDGE_NODES / onramps / regions / routeFlows) so reliability,
   private/public and latency reconcile with Discovery attach and Routing steer. */

// Great-circle + fiber-route RTT estimate. Inlined (not imported from
// features/discover/latency.ts) so the engine has no dependency on the feature
// layer; the formula matches latency.ts (fiber factor 1.4, 124 mi/ms, 3ms base).
function _airMiles(aLat,aLon,bLat,bLon){
  const R=3958.8, toRad=d=>d*Math.PI/180;
  const dLat=toRad(bLat-aLat), dLon=toRad(bLon-aLon);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function _rttForMiles(miles){return Math.round(3+miles*1.4*2/124);}
function _estRttMs(aLat,aLon,bLat,bLon){return _rttForMiles(_airMiles(aLat,aLon,bLat,bLon));}

/* RTT between two cloud REGIONS over the AT&T backbone: region → PoP → region.
   `pop` null is the degenerate case (a pair with no PoP at all) and falls back
   to the direct great circle with the public penalty applied. */
function _pairRttMs(rA,rB,pop){
  if(!rA.geo||!rB.geo)return null;
  if(pop&&pop.site&&typeof pop.site.lat==='number'){
    return _rttForMiles(_airMiles(rA.geo[0],rA.geo[1],pop.site.lat,pop.site.lon)
                       +_airMiles(pop.site.lat,pop.site.lon,rB.geo[0],rB.geo[1]));
  }
  return Math.round(_rttForMiles(_airMiles(rA.geo[0],rA.geo[1],rB.geo[0],rB.geo[1]))*PUBLIC_TRANSIT_FACTOR);
}

// parse the first-mile transport product off an EDGE_NODES label
// ("HQ · Dallas · AVPN" -> "AVPN"; "Internet" -> null)
function _firstMile(label){const m=label.match(/AVPN|ADI|ABF|Wireless/);return m?m[0]:null;}

// locate a region object + its cloud id by region id (region ids are unique)
function _findRegion(rid){
  for(const c of clouds){const r=(regions[c.id]||[]).find(x=>x.id===rid);if(r)return {cid:c.id,cloud:c,r};}
  return null;
}

// shape one region into the fabric view (reliability / path / latency / on-ramps)
function _regionShape(cid,cloud,r){
  const ramps=rampsFor(cid,r.id);
  const active=ramps.filter(o=>o.active);
  /* Reliability counts ACTIVE on-ramps and nothing else. `||r.spof` used to
     force 'single' on an unattached region, so UK South rendered a "Single
     path" pill 40px above two cards reading "Provisionable here" / "Not
     available here" and a Reach line reading "On the public internet - not yet
     attached": a pill asserting a path everything under it denied. `spof` is
     seeded true only on uks and cleared by activateOnramp, so it never added
     information to an ATTACHED region - use1 is 'single' from active.length
     either way. The type already carries 'none' for exactly this state. */
  const reliability = active.length>=2 ? 'dual' : active.length===1 ? 'single' : 'none';
  const path = active.length>=1 ? 'private' : 'public';
  const L=_latencyPair(cid,r.id);
  /* A region has TWO figures and every surface that shows one must say which.
     `latencyMs` used to be the private figure unconditionally, so Connect's
     region node rendered "Public · 54ms" — the word saying public transit, the
     number being the fabric RTT — while /naas/observe's flow rows for the same
     region read 92ms under a Path column reading "Public internet". Eight of
     nine regions disagreed across two screens a hover card links between.

     `latencyMs` is now the figure for the path the region is ON today, so the
     word and the number agree and Observe agrees with both. `privateMs` and
     `publicMs` are carried alongside for the surfaces that tell the two-figure
     story — the hover card, the Performance tile, the PathChoice cards, which
     describe the FABRIC path whether or not the region is on it yet. That gap
     is the product's argument; it has to be told, not left implicit. */
  return {
    cloudId:cid, regionId:r.id, name:r.name, cloudName:cloud.name, attached:!!r.attached,
    reliability, path,
    privateMs:L.privateMs, publicMs:L.publicMs,
    latencyMs: path==='private'?L.privateMs:L.publicMs,
    onrampIds:ramps.map(o=>o.id),
  };
}

/* The region's fabric RTT: nearest ACTIVE on-ramp site -> region.geo; fall back
   to any capturing on-ramp (what it would be once provisioned), then to the
   seeded region.lat when no geometry is available. This is the ONE figure —
   `_regionShape` (Connect, Discover), `pathsForRegion` (every /naas/observe
   flow row), `latencySeries` and the latency-SLO rule all read it. */
function _regionLatencyMs(cid,r){
  const ramps=rampsFor(cid,r.id);
  const active=ramps.filter(o=>o.active);
  const cand=(active.length?active:ramps).filter(o=>o.site&&typeof o.site.lat==='number');
  if(r.geo&&cand.length)return Math.min(...cand.map(o=>_estRttMs(o.site.lat,o.site.lon,r.geo[0],r.geo[1])));
  return r.lat;
}
/* Both figures a region can display, keyed by cloud+region (the internal form
   `pathsForRegion` already holds both ids). */
function _latencyPair(cid,rid){
  const r=(regions[cid]||[]).find(x=>x.id===rid);
  if(!r)return {privateMs:null,publicMs:null};
  const privateMs=_regionLatencyMs(cid,r);
  return {privateMs, publicMs:Math.round(privateMs*PUBLIC_TRANSIT_FACTOR)};
}
/* Public entry point: what latency does this region state, on each path?
   `privateMs` is the figure Connect / Discover render; `publicMs` is what the
   same region costs over public transit. Everything outside this file that
   needs a latency reads this — nothing re-derives it, and nothing types one. */
function regionLatency(regionId){
  const f=_findRegion(regionId);
  return f?_latencyPair(f.cid,regionId):null;
}

function fabricModel(){
  const sites=EDGE_NODES.map(n=>({id:n.id,label:n.label,firstMile:_firstMile(n.label)}));
  const fabricOnramps=onramps.map(o=>({
    id:o.id, name:o.name, type:o.type, site:o.site.name, active:!!o.active,
    targets:o.targets.map(([c,rid])=>[c,rid]),
  }));
  const shaped=[];
  clouds.forEach(c=>(regions[c.id]||[]).forEach(r=>shaped.push(_regionShape(c.id,c,r))));
  const c2c=routeFlows().filter(f=>f.kind==='c2c').map(f=>({
    id:f.id, label:f.label, gbps:f.gbps, viaPublic:!!f.viaPublic, controlled:!!f.current.attControlled,
  }));
  return {sites, onramps:fabricOnramps, regions:shaped, c2c};
}

// simulated provisioning: activate the on-ramp(s) that reach the region (marks it
// attached via activateOnramp), log it, and return the updated region shape.
// opts.onrampId targets a specific on-ramp; opts.resilient/attachType are carried
// for labeling only — the effect is activating the capturing on-ramp(s).
function provisionRegion(regionId,opts){
  opts=opts||{};
  const found=_findRegion(regionId);
  if(!found)return null;
  const {cid,cloud,r}=found;
  const ramps=opts.onrampId?onramps.filter(o=>o.id===opts.onrampId):rampsFor(cid,regionId);
  let activated=[];
  ramps.forEach(o=>{if(!o.active&&CC.activateOnramp(o.id)){activated.push(o.name);}});
  const shape=_regionShape(cid,cloud,r);
  const via=activated.length?activated.join(' + '):(ramps[0]?ramps[0].name:'existing path');
  const label=(opts.attachType?opts.attachType+' · ':'')+cloud.name+' '+r.name;
  log('provision',label,`attached ${r.name} via ${via}${opts.resilient?' (dual)':''} — now ${shape.path}/${shape.reliability}`);
  return shape;
}

Object.assign(CC,{routeFlows,steerFlow,clearSteer,routingKpis,routingFailover,routingRestore,routeHistory,sceneGraph,routeAdvisor,fabricModel,provisionRegion,
  regionLatency,PUBLIC_TRANSIT_FACTOR});
})(window.CC);
