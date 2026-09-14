// @ts-nocheck
/* Cloud Control - applications (the workload layer).
   The layer between bytes and tokens: applications are derived, not
   declared - tags name them, the flow table gives their dependencies,
   topology gives their footprint, the rule engine gives their policy
   coverage, the fabric gives their AI consumption. Bytes -> workloads
   -> tokens. */
(function(CC){
const {vpcs}=CC;

const APPS=[
  {id:'helion-rd',name:'Project Helion · R&D',tag:'rd-helion',desc:'Model training and experimentation'},
  {id:'helion-classified',name:'Project Helion · Classified',tag:'classified-helion',desc:'Restricted inference workloads'},
  {id:'invoices',name:'Invoice Processing',tag:'finance-invoices',desc:'Finance batch and reporting'},
  {id:'platform',name:'Shared Platform Services',tag:'shared-services',desc:'Cross-BU APIs and tooling'},
];
function appView(appId){
  const app=APPS.find(a=>a.id===appId);
  if(!app)return null;
  const footprint=CC.policyMatches(app.tag); // [{v,cloud,region}]
  const workloads=footprint.reduce((s,m)=>s+m.v.subnets*3,0);
  const fl=CC.flows().filter(f=>f.srcTag===app.tag);
  // dependencies: aggregate flows by destination, decided by the rule table
  const depMap={};
  fl.forEach(f=>{
    const d=depMap[f.dst]=depMap[f.dst]||{dst:f.dst,gbps:0,viaPublic:false,flows:0};
    d.gbps=Math.round((d.gbps+f.gbps)*10)/10;d.flows++;
    if(f.viaPublic)d.viaPublic=true;
  });
  const deps=Object.values(depMap).map(d=>{
    const sample=fl.find(f=>f.dst===d.dst);
    const rule=CC.ruleList().filter(r=>CC.ruleEnforced(r)).find(r=>CC.ruleMatch(r,sample));
    return {...d,decided:rule?{action:rule.action,name:rule.name}:null};
  });
  const attached=footprint.filter(m=>m.v.attached).length;
  const privatePct=footprint.length?Math.round(attached/footprint.length*100):0;
  const coverage=CC.ruleList().filter(r=>r.src.tag===app.tag);
  const aiDeps=deps.filter(d=>d.dst==='ai-endpoints');
  const im=CC.simImpact();
  const degraded=im&&footprint.some(m=>im.regionKeys.includes(m.cloud.id+'/'+m.region.id));
  const exposed=deps.some(d=>d.viaPublic&&(app.tag==='classified-helion'||app.tag==='finance-invoices'));
  const health=degraded?'degraded':exposed?'at-risk':privatePct<100?'partial':'healthy';
  return {app,footprint,workloads,deps,aiDeps,privatePct,
    coverage:{total:coverage.length,enforced:coverage.filter(CC.ruleEnforced).length},
    health};
}
function appList(){return APPS.map(a=>appView(a.id));}
function untaggedWorkloads(){
  let n=0;
  Object.values(vpcs).flat().forEach(v=>{if(!(v.tags||[]).length)n+=v.subnets*3;});
  return n;
}

Object.assign(CC,{appList,appView,untaggedWorkloads});
})(window.CC);
