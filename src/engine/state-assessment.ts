// @ts-nocheck
/* The 14-day AI visibility assessment - a stage machine over live
   derivations. Stored: stage, day, startedAt. Everything the funnel
   SHOWS re-derives on read from the same getters the portal screens use,
   so the report can never state a number Insights or NaaS Observe denies.

   The demo clock: advanceAssessment() is the one honest way to compress
   14 days into a demo beat - the UI labels it a demo control. Stage moves
   push undo, emit and audit like every mutation, and ride the share
   payload so a shared session opens mid-assessment. */
(function(){
const CC=window.CC;
const _=CC._||(CC._={});

const state=_.assessment=_.assessment||{stage:'not-started',day:0,startedAt:null};

CC.assessment=function(){return {stage:state.stage,day:state.day,startedAt:state.startedAt};};

CC.startAssessment=function(){
  if(state.stage!=='not-started')return false;
  _.pushUndo('Start assessment');
  state.stage='measuring';state.day=1;state.startedAt=Date.now();
  CC._.emit({type:'policy',label:'Assessment started · measuring, nothing blocked or routed'});
  return true;
};

CC.advanceAssessment=function(days){
  if(state.stage!=='measuring')return false;
  const n=Math.max(1,Math.round(days||1));
  _.pushUndo('Advance assessment clock');
  state.day=Math.min(14,state.day+n);
  if(state.day>=14)state.stage='report';
  CC._.emit({type:'policy',label:state.stage==='report'
    ?'Assessment complete · day 14 report ready'
    :`Assessment · day ${state.day} of 14`});
  return true;
};

CC.closeAssessment=function(){
  if(state.stage!=='report')return false;
  _.pushUndo('Close assessment');
  state.stage='closed';
  CC._.emit({type:'policy',label:'Assessment closed · findings stand as of today'});
  return true;
};

/* Every figure from the getters the portal states the same number with:
   arbitrage() and aiSpend for money, decisionLog + violations for events,
   regionLatency for the wasted milliseconds. Nothing cached. */
CC.assessmentReport=function(){
  const meters=CC.tokenMeterList();
  const routes=CC.modelRoutes();
  const catalog=CC.modelCatalog();
  const log=CC.decisionLog();
  const viols=CC.violations();
  const denials=log.filter(d=>!d.allowed).length;

  // AI routing saving: what the same tokens would have cost external.
  const external=catalog.find(m=>m.id==='gpt-class');
  const priceOf=id=>(catalog.find(m=>m.id===id)||{}).price||0;
  const agents=CC.agentList();
  const modelOf=tag=>{const a=agents.find(x=>x.app===tag);const s=a&&a.scopes.find(x=>x.startsWith('invoke:'));return s?s.slice(7):null;};
  let spendDay=0,externalDay=0;
  meters.forEach(m=>{
    const id=modelOf(m.tag);
    spendDay+=(m.today/1e6)*priceOf(id);
    externalDay+=(m.today/1e6)*((external||{}).price||0);
  });
  const aiSavingMo=Math.max(0,(externalDay-spendDay)*30);
  const recoverableMo=CC.arbitrage().availableSavings+aiSavingMo;

  // Wasted milliseconds: regions still on public transit, fabric delta each.
  const regions=CC.fabricModel().regions.filter(r=>!r.attached);
  const msWasted=regions.reduce((s,r)=>{
    const L=CC.regionLatency(r.regionId);
    return s+(L?Math.max(0,L.publicMs-L.privateMs):0);
  },0);

  // Invisible share: tokens when metered, else public-flow Gbps. Basis named.
  const tokens=meters.reduce((s,m)=>s+m.today,0);
  const ungoverned=meters.reduce((s,m)=>s+m.ungoverned,0);
  const flows=CC.routeFlows();
  const pubGbps=flows.filter(f=>!f.current.attControlled).reduce((s,f)=>s+f.gbps,0);
  const allGbps=flows.reduce((s,f)=>s+f.gbps,0)||1;
  const invisible=tokens>0
    ?{pct:Math.round((ungoverned/tokens)*100),basis:'tokens'}
    :{pct:Math.round((pubGbps/allGbps)*100),basis:'flows'};

  return {
    recoverableMo,
    aiSavingMo,
    securityEvents:denials+viols.length,
    securityBreakdown:{denials,violations:viols.length},
    msWasted:Math.round(msWasted),
    invisibleSharePct:invisible.pct,
    invisibleBasis:invisible.basis,
    counters:{
      identities:meters.length,
      requestsAnalyzed:log.length,
      toolsInUse:catalog.length,
      ungovernedTools:routes.filter(r=>r.path==='public').length,
      securityEvents:denials+viols.length,
    },
  };
};
})();
