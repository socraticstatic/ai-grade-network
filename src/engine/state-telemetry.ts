// @ts-nocheck
/* Cloud Control - telemetry (observability mock data).
   Deterministic seeded series, derived FROM the state model so every
   chart agrees with every page: a region's latency series ends at the
   latency shown in the Discovery tree, attaching this session steps the
   line down to the private envelope, an active failure sim spikes it. */
(function(CC){
const _=CC._;
const {clouds,regions,vpcs}=CC;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(str){let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
/* the rule engine seeds its flow table from the same generators - one
   PRNG family keeps every derived number reproducible across pages */
_.mulberry32=mulberry32;
_.hashStr=hashStr;
/* Latency figures come from ONE place: CC.regionLatency (state-routing.ts).
   `privateMs` is the region's RTT to the on-ramp serving it — the figure
   /discover, Connect's Performance tile, both PathChoice cards and every
   AT&T flow row on /naas/observe render. `publicMs` is the same region over
   public transit. This file used to carry its own `PRIVATE_LAT=12` and read
   the raw seed `r.lat` for the public baseline, which is how the briefing
   came to say "~12ms" beside regions Connect showed at 3, 29, 33 and 120ms.
   Called through CC at call time, never at load time (see state.ts header). */
function _lat(rid){return CC.regionLatency(rid)||{privateMs:null,publicMs:null};}

function regionList(){
  const out=[];
  clouds.forEach(cl=>(regions[cl.id]||[]).forEach(r=>out.push({key:cl.id+'/'+r.id,cloud:cl,region:r})));
  return out;
}
/* one seeded anomaly: eu-west-1 transit congestion event in the past.
   Both figures in the sentence are derived: the spike is the region's public
   baseline times the anomaly factor the series actually applies, and the
   private figure is the region's own fabric RTT — not a "~12-14ms" literal. */
const ANOMALY={key:'aws/euw1',at:0.62,factor:2.3,
  title:'Transit congestion · eu-west-1',
  explain:()=>{
    // euw1 is acme's own seed region (aws eu-west-1) - meridian's swap
    // replaces aws's region set with use1/usw2, so it doesn't resolve
    // there. This narrative names a specific ACME event class; degrade to
    // a generic explanation rather than crash netops' default Observe
    // stage, which calls this unconditionally.
    const euw=regions.aws.find(r=>r.id==='euw1'), L=_lat('euw1');
    if(!euw)return `<b>Transit congestion · eu-west-1</b> — this estate profile does not model eu-west-1, so this event class does not apply.`;
    return `<b>eu-west-1 latency spiked to ~${Math.round(L.publicMs*ANOMALY.factor)}ms</b> for roughly 4 hours. The signature — latency up, throughput flat, every other region steady — is upstream transit congestion on the public path, not an application change. ${euw.attached?`Since attaching over Direct Connect this session, eu-west-1 rides the private envelope (${L.privateMs}ms to its on-ramp) where transit events like this cannot reach it.`:'eu-west-1 still rides public transit — Direct Connect · Equinix DC2 already terminates near it; attaching removes exposure to exactly this class of event.'}`;
  }};

function latencySeries(key,N){
  const item=regionList().find(x=>x.key===key); if(!item)return [];
  const r=item.region;
  const rng=mulberry32(hashStr('lat:'+key));
  const wasAttachedAtLoad=key==='aws/use1';
  const attachedNow=r.attached;
  const sessionIdx=_.sessionAttached.indexOf(key); // -1 if not this session
  const stepAt=sessionIdx>=0?Math.floor(N*0.82):-1;
  const pts=[];
  // both baselines are the region's own derived figures - the private envelope
  // is its RTT to the on-ramp, the public baseline is that over public transit
  const L=_lat(r.id);
  const privBase=L.privateMs, pubBase=L.publicMs;
  for(let i=0;i<N;i++){
    let target,variance;
    const isPrivate=wasAttachedAtLoad||(stepAt>=0&&i>=stepAt);
    if(isPrivate){target=privBase;variance=1.6;}
    else {target=pubBase;variance=pubBase*0.18;}
    let v=target+(rng()-0.5)*2*variance+Math.sin(i/N*6.28*2)*variance*0.4;
    if(ANOMALY.key===key&&!isPrivate){
      const d=Math.abs(i/N-ANOMALY.at);
      if(d<0.04)v*=ANOMALY.factor-(d/0.04)*(ANOMALY.factor-1);
    }
    // floor of 1ms, not 8: a region sitting a few miles from its on-ramp
    // derives a 3ms envelope, and an 8ms clamp would have flattened the whole
    // private series onto a figure its own tail (and Connect) contradicts.
    pts.push(Math.max(1,Math.round(v*10)/10));
  }
  /* the TAIL is today's live reading, and it is exact: the chart a viewer
     opens from Connect's "View in Observe" link must land on the number the
     tile they clicked was showing. */
  const impact=CC.simImpact();
  if(impact&&impact.regionKeys.includes(key)){
    const spike=impact.defense?pubBase*1.6:pubBase*2.6;
    pts[N-2]=Math.round(spike*0.8);pts[N-1]=Math.round(spike);
  } else {
    pts[N-1]=attachedNow?privBase:pubBase;
  }
  return pts;
}
/* packet-loss series, derived the same deterministic way as latency: the
   public path loses ~0.25% (worse during the seeded congestion anomaly),
   the private envelope loses ~0.02%, and attaching this session steps the
   line down. No Math.random / Date.now - one seed per region key. */
const PUBLIC_LOSS=0.25, PRIVATE_LOSS=0.02;
function lossSeries(key,N){
  const item=regionList().find(x=>x.key===key); if(!item)return [];
  const r=item.region;
  const rng=mulberry32(hashStr('loss:'+key));
  const wasAttachedAtLoad=key==='aws/use1';
  const attachedNow=r.attached;
  const sessionIdx=_.sessionAttached.indexOf(key);
  const stepAt=sessionIdx>=0?Math.floor(N*0.82):-1;
  const pts=[];
  for(let i=0;i<N;i++){
    const isPrivate=wasAttachedAtLoad||(stepAt>=0&&i>=stepAt);
    const target=isPrivate?PRIVATE_LOSS:PUBLIC_LOSS;
    const variance=target*0.5;
    let v=target+(rng()-0.5)*2*variance;
    if(ANOMALY.key===key&&!isPrivate){
      const d=Math.abs(i/N-ANOMALY.at);
      if(d<0.04)v*=ANOMALY.factor-(d/0.04)*(ANOMALY.factor-1);
    }
    pts.push(Math.max(0,Math.round(v*1000)/1000));
  }
  const impact=CC.simImpact();
  if(impact&&impact.regionKeys.includes(key)){
    pts[N-1]=Math.round((impact.defense?PUBLIC_LOSS*2:PUBLIC_LOSS*4)*1000)/1000;
  } else if(attachedNow){
    pts[N-1]=Math.max(0,Math.round((PRIVATE_LOSS+(rng()-0.5)*0.01)*1000)/1000);
  } else {
    pts[N-1]=PUBLIC_LOSS;
  }
  return pts;
}
function throughputSeries(key,N){
  const item=regionList().find(x=>x.key===key); if(!item)return [];
  const rng=mulberry32(hashStr('tp:'+key));
  const attached=item.region.attached;
  const base=attached?(2.5+rng()*2.5):(0.4+rng()*1.2);
  const pts=[];
  for(let i=0;i<N;i++){
    const diurnal=Math.sin((i/N)*6.28*(N>30?7:1)-1.4)*0.35+1;
    pts.push(Math.max(0.05,Math.round(base*diurnal*(0.9+rng()*0.2)*100)/100));
  }
  const impact=CC.simImpact();
  if(impact&&impact.regionKeys.includes(key)){pts[N-1]=impact.defense?Math.round(pts[N-1]*0.4*100)/100:0;}
  return pts;
}
function egressSeries(N){
  const rng=mulberry32(hashStr('egress'));
  const e=CC.egress();
  const pub0=29900/30,priv0=18300/30;            // discovered split, per day
  const pubNow=e.pub/30,privNow=e.priv/30;       // current split
  const shiftAt=Math.floor(N*0.8);
  const pts=[];
  for(let i=0;i<N;i++){
    const late=i>=shiftAt;
    const pub=(late?pubNow:pub0)*(0.86+rng()*0.28);
    const priv=(late?privNow:priv0)*(0.9+rng()*0.2);
    pts.push({pub:Math.round(pub),priv:Math.round(priv)});
  }
  return pts;
}
function telemetry(N){
  return {
    regions:regionList().map(x=>({key:x.key,name:x.region.name,cloudName:x.cloud.name,color:x.cloud.color,
      // the region's live figure on the path it is actually on — never the raw seed
      attached:x.region.attached,lat:x.region.attached?_lat(x.region.id).privateMs:_lat(x.region.id).publicMs,ai:x.region.ai,
      latency:latencySeries(x.key,N),throughput:throughputSeries(x.key,N),loss:lossSeries(x.key,N)})),
    egress:egressSeries(N),
    anomaly:ANOMALY,
    events:_.hist.map(h=>({label:h.label,posture:h.posture})),
  };
}
/* The engine-known instants inside the telemetry window, for the Observe
   time machine. Every marker restates a fact a series already draws: the
   seeded anomaly at its own `at`, a this-session attach at the 0.82 step
   latencySeries applies, an active failure sim at the live tail. Nothing
   here invents a moment the charts do not show. */
function windowMoments(){
  const out=[{at:ANOMALY.at,key:'anomaly',label:ANOMALY.title}];
  _.sessionAttached.forEach(key=>{
    const item=regionList().find(x=>x.key===key);
    if(item)out.push({at:0.82,key:'attach:'+key,label:'Attached this session · '+item.region.name});
  });
  const impact=CC.simImpact();
  if(impact)out.push({at:1,key:'sim',label:'Simulated failure · '+impact.onramp.name});
  return out;
}

/* AI narrative over the telemetry - regenerated from state every time */
function obsSummary(){
  const c=CC.counts();
  const rl=regionList();
  const att=rl.filter(x=>x.region.attached);
  const pub=rl.filter(x=>!x.region.attached);
  const worst=pub.slice().sort((a,b)=>_lat(b.region.id).publicMs-_lat(a.region.id).publicMs)[0];
  const e=CC.egress();
  const impact=CC.simImpact();
  const parts=[];
  if(impact){
    parts.push(`<b>Active incident (simulated):</b> ${impact.onramp.name} is down — ${impact.vpcIds.length} VPCs ${impact.defense?'failed over to public transit and are running degraded with no SLA':'are blackholed with Dynamic Defense off'}. Latency on the affected paths is spiking in the charts below.`);
  }
  /* The envelope used to read "~12ms" — a bare literal sitting beside Connect
     cards showing the same private regions at 3, 29, 33 and 120ms. It is now
     the actual spread of those regions' figures, and it SAYS what the figure
     measures (RTT to the on-ramp), so the sentence can be checked against the
     tile one click away instead of contradicting it. */
  const envMs=att.map(x=>_lat(x.region.id).privateMs).sort((a,b)=>a-b);
  const envelope=envMs.length?(envMs[0]===envMs[envMs.length-1]
    ?`${envMs[0]}ms`:`${envMs[0]}–${envMs[envMs.length-1]}ms`):null;
  parts.push(`${envelope
    ?`${att.length} of ${rl.length} regions ride the private envelope — ${envelope} to the on-ramp serving each.`
    :`None of the ${rl.length} regions ride the private envelope yet.`} ${pub.length?`${pub.length} still depend on public transit${worst?` — <b>${worst.region.name}</b> is the outlier at ${_lat(worst.region.id).publicMs}ms on the public path`:''}.`:'Nothing depends on public transit.'}`);
  parts.push(`Egress is running ${'$'+(e.total/1000).toFixed(1)}k/mo${e.pub?` with ${'$'+(e.pub/1000).toFixed(1)}k still on public rates`:' — fully on committed private pricing'}${e.savings?`; private-path savings hold at ${'$'+(e.savings/1000).toFixed(1)}k/mo`:''}.`);
  // euw1 is acme's own seed region - doesn't resolve once meridian's swap
  // replaces aws's region set. Skip the sentence rather than crash the
  // narrative every /naas/observe render depends on (same idiom as the
  // ANOMALY.explain guard above).
  const euw=regions.aws.find(r=>r.id==='euw1');
  if(euw)parts.push(`One anomaly in the window: a transit-congestion spike on eu-west-1${euw.attached?' — before it attached; the private path is immune to that event class':' — it remains exposed to that event class until attached'}.`);
  return parts.join(' ');
}

/* drill-down stats over a region's live series */
function percentiles(arr){
  const s=arr.slice().sort((a,b)=>a-b);
  const q=p=>s[Math.min(s.length-1,Math.floor(p*s.length))];
  return {p50:q(.5),p95:q(.95),p99:q(.99)};
}
function topTalkers(rid){
  const rng=mulberry32(hashStr('tt:'+rid));
  const vs=vpcs[rid]||[];
  const svc=['api-gw','etl-batch','inference','replication','telemetry','cdn-origin'];
  return vs.flatMap(v=>[0,1].map(()=>({
    name:`${v.name}/${svc[Math.floor(rng()*svc.length)]}`,
    gb:Math.round((rng()*420+40)),
    pct:0
  }))).sort((a,b)=>b.gb-a.gb).slice(0,5).map((t,i,all)=>{
    const tot=all.reduce((s,x)=>s+x.gb,0);t.pct=Math.round(t.gb/tot*100);return t;
  });
}

/* ---------- jitter: variance of the region's own drawn series ----------
   Not a new number: p95 minus p50 over the SAME latencySeries every chart
   draws, so the jitter figure and the chart a viewer checks it against can
   never disagree. Public transit carries the wide variance (the series'
   own 18% band); the fabric carries the tight one. */
function regionJitter(cloudId,regionId,N){
  const key=cloudId+'/'+regionId;
  const s=latencySeries(key,N||48);
  if(!s.length)return null;
  const p=percentiles(s);
  return {jitterMs:Math.max(0,Math.round((p.p95-p.p50)*10)/10),p50:p.p50,p95:p.p95};
}

/* ---------- trend: the window's own direction ----------
   The mean of the series' last quarter against its first. Deterministic -
   the seeded anomaly and the public-transit variance are what move it -
   and honest: "rising" is a claim about the drawn window, nothing more. */
function latencyTrend(cloudId,regionId,N){
  const s=latencySeries(cloudId+'/'+regionId,N||48);
  if(s.length<8)return null;
  const q=Math.floor(s.length/4);
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const first=mean(s.slice(0,q)), last=mean(s.slice(-q));
  const risingPct=Math.round(((last-first)/first)*100);
  return {risingPct,rising:risingPct>=15,firstMs:Math.round(first),lastMs:Math.round(last)};
}

Object.assign(CC,{telemetry,obsSummary,latencySeries,lossSeries,percentiles,topTalkers,windowMoments,regionJitter,latencyTrend});

/* tokens get a time dimension: spend/day per app (flat zero before the
   substrate exists, ramping once it does) and per-model inference latency
   derived from the same region latencies everything else uses.

   The TAIL is always today's live meter, ready or not. An identity whose
   endpoint has never been attached has no charted history - it started
   metering today - but it is not at zero, and this series used to say it
   was: all-zero points fired /ai/observe's "No token flow yet" empty state
   directly under a TOKENS tile reading the same meter. History it does not
   have, and today it does. */
CC.tokenSeries=function(tag,N){
  const rng=_.mulberry32(_.hashStr('tok:'+tag));
  const m=CC.tokenMeterList().find(x=>x.tag===tag);
  const budget=CC.tokenBudgetOf?CC.tokenBudgetOf(tag):1000000000;
  const pts=[];
  for(let i=0;i<N;i++){
    if(!m||!m.ready){pts.push(0);continue;}
    const ramp=Math.min(1,(i/(N-1))*1.6); // adoption ramps
    pts.push(Math.round(budget*0.55*ramp*(0.75+rng()*0.5)));
  }
  if(m&&N>0)pts[N-1]=m.today;
  return pts;
};
CC.modelLatencySeries=function(modelId,N){
  const rng=_.mulberry32(_.hashStr('mlat:'+modelId));
  const m=CC.modelCatalog().find(x=>x.id===modelId);
  const pts=[];
  for(let i=0;i<N;i++)pts.push(Math.max(6,Math.round(m.p50*(0.85+rng()*0.4))));
  pts[N-1]=m.p50;
  return pts;
};
})(window.CC);
