// @ts-nocheck
/* Cloud Control - policy + rule engine.
   Everything that decides traffic: tag-matched policies with live
   evaluators, the flow-table rule engine with dry-run and shadowing,
   the approvals ceremony, and the hit counters that make enforcement
   watchable. Mutations still flow through the core (CC.applyFix,
   CC._.pushUndo, CC._.emit) so one source of truth survives the split. */
(function(CC){
const _=CC._;
const {TAGS,clouds,regions,vpcs,fixes}=CC;

/* ---------------- policy engine ----------------
   Policies are MATCH (tag) + REQUIREMENT. Requirements carry live
   evaluators over the model, so a policy's violation count is computed
   from current state - authoring a private-path policy shows its
   violations draining as circuits attach, without any enforcement
   hand-waving. Seed policies remediate through the same fixes the
   Insights actions use; custom policies of remediable kinds clear on
   enforce, private-path policies clear only when reality complies. */
const REQUIREMENTS={
  'isolate-internet':{label:'No direct internet path',chain:'route-table rewrite',
    action:'remove public-subnet associations · egress via endpoints + private circuits only',
    evaluate:(matched,enforced)=>enforced?[]:matched.map(m=>({vpc:m.v.id,name:m.v.name,msg:'direct internet path exists'}))},
  'require-inspection':{label:'Inline security inspection',chain:'fw-inspect (inline firewall)',
    action:'re-point 0.0.0.0/0 through inspection before any egress',
    evaluate:(matched,enforced)=>enforced?[]:matched.map(m=>({vpc:m.v.id,name:m.v.name,msg:'egress bypasses inspection'}))},
  'intra-tag-only':{label:'Segment · intra-tag traffic only',chain:'segmentation rule',
    action:'allow tag ↔ tag · deny all other flows',
    evaluate:(matched,enforced)=>{
      if(enforced)return [];
      const cloudSet=new Set(matched.map(m=>m.cloud.id));
      return cloudSet.size>1?[{vpc:null,name:null,msg:`spread across ${cloudSet.size} clouds unsegmented`}]:[];
    }},
  'require-private-path':{label:'Private path required',chain:'AI-grade network attach',
    action:'every matched workload must ride an AT&T private circuit - violations clear as circuits attach',
    evaluate:(matched)=>matched.filter(m=>!m.v.attached).map(m=>({vpc:m.v.id,name:m.v.name,msg:'riding public internet'}))},
  'latency-slo':{label:'Latency SLO',chain:'path selection',param:{key:'ms',label:'P95 under (ms)',def:30},
    action:'matched workloads must sit behind a path meeting the SLO - violations clear as faster (private) paths attach',
    /* Measured with the ruler every screen reads: CC.regionLatency(region) —
       `privateMs` for a workload already on the fabric, `publicMs` for one
       still on public transit. It used to compare a flat `12` against the raw
       seed `region.lat`, so a violation could quote a latency no other surface
       in the product showed for that region. */
    evaluate:(matched,enforced,param)=>{
      const slo=+param||30;
      const ms=m=>{const L=CC.regionLatency(m.region.id);return m.v.attached?L.privateMs:L.publicMs;};
      return matched.filter(m=>ms(m)>slo)
        .map(m=>({vpc:m.v.id,name:m.v.name,msg:`${ms(m)}ms exceeds ${slo}ms SLO`}));
    }},
};
const customPolicies=[];
let polSeq=0;
function policyMatches(tag,cloudScope){
  const out=[];
  clouds.forEach(cl=>{
    if(cloudScope&&cloudScope!=='any'&&cl.id!==cloudScope)return;
    (regions[cl.id]||[]).forEach(r=>(vpcs[r.id]||[]).forEach(v=>{
      if((v.tags||[]).includes(tag))out.push({v,cloud:cl,region:r});
    }));
  });
  return out;
}
function addPolicy({name,tag,requirement,cloud,param}){
  if(!REQUIREMENTS[requirement]||!TAGS[tag])return null;
  const p={id:'custom-'+(++polSeq),name:name||`${REQUIREMENTS[requirement].label} · ${tag}`,
    tag,requirement,cloud:cloud||'any',param:param||null,enforced:false,custom:true};
  customPolicies.push(p);
  _.emit({type:'policy',id:p.id,label:'Policy authored · '+p.name});
  return p;
}
function removePolicy(id){
  const i=customPolicies.findIndex(p=>p.id===id);
  if(i<0)return false;
  const [p]=customPolicies.splice(i,1);
  delete polHits[id];
  _.emit({type:'policy',id,label:'Policy removed · '+p.name});
  return true;
}
/* projection for a custom policy: what does enforcing it do to posture? */
function previewPolicy(id){
  const p=customPolicies.find(x=>x.id===id);
  if(!p||p.enforced)return null;
  p.enforced=true;
  const out={posture:CC.posture(),violations:CC.violations().length};
  p.enforced=false;
  return out;
}
function enforcePolicy(id){
  const p=customPolicies.find(x=>x.id===id);
  if(!p||p.enforced)return false;
  p.enforced=true;
  _.emit({type:'fix',key:p.id,label:'Policy enforced · '+p.name});
  return true;
}
function evalPolicy(p){
  const matched=policyMatches(p.tag,p.cloud);
  const req=REQUIREMENTS[p.requirement];
  return {matched,violations:req.evaluate(matched,p.enforced,p.param)};
}
/* the three requirements-doc example policies (pol-pci / pol-internet-facing /
   pol-branch-finance) compute matched + violations from the tag registry the
   same way custom policies do: every tag-carrying workload is in violation of
   the requirement until the policy is ENFORCED, then clears. Mirrors the
   REQUIREMENTS 'require-inspection' / 'isolate-internet' evaluate shape. */
const EXAMPLE_MSG={
  'route-private':'not pinned to an AT&T private path',
  'inspect':'internet-facing egress bypasses NGFW inspection',
  'deny':'reachable outside its tag — unsegmented',
};
function exampleRules(){return rules.filter(r=>r.example);}
function evalExample(r){
  const matched=policyMatches(r.src.tag,r.src.cloud);
  const msg=EXAMPLE_MSG[r.action]||'requirement not yet applied';
  return {matched,violations:ruleEnforced(r)?[]:matched.map(m=>({vpc:m.v.id,name:m.v.name,msg}))};
}


/* ---------------- flow table + rule engine (realistic policies) ----------------
   Rules are traffic statements: IF src -> dst [ports] THEN action (+ chain).
   They evaluate against a FLOW TABLE derived from the estate, support
   dry-run before enforcement, priority order, and shadow detection.
   Enforcing a rule whose pattern matches a known remediation drives the
   SAME fix mutation the rest of the portal uses - the five system rules
   ARE the five governance fixes, authored as rules. */
const SERVICES={
  'fw-inspect-01':{label:'Palo Alto NGFW — inline inspection',kind:'next-gen firewall'},
  'ips-engine':{label:'ips-engine',kind:'intrusion prevention'},
  'dlp-scan':{label:'dlp-scan',kind:'data loss prevention'},
  'ai-guardrail':{label:'ai-guardrail',kind:'token-layer guardrail'},
  'dns-fw':{label:'dns-fw',kind:'resolver DNS firewall'},
};
/* ---------------- service insertion ----------------
   A marketplace lens on the rule engine: inserting a network service into
   the fabric drives the SAME fix/rule the portal already uses. State is
   derived, so insert/inserted survives undo, share-replay, and presets. */
const SVC_TARGETS={
  'fw-inspect-01':{ruleId:'pol-insp',target:'classified-helion egress',desc:'Palo Alto NGFW — re-points 0.0.0.0/0 through inline inspection before egress'},
  'ips-engine':{ruleId:'pol-insp',target:'classified-helion egress',desc:'Intrusion prevention — inserted alongside the firewall in the same chain'},
  'dns-fw':{ruleId:'pol-dns',target:'classified-helion resolver',desc:'Resolver DNS firewall — blocks DNS tunneling that slips past TLS inspection'},
  'dlp-scan':{ruleId:'pol-perimeter',target:'org-wide storage egress',desc:'Data loss prevention — denies writes to object storage outside the org'},
  'ai-guardrail':{ruleId:null,target:'token layer · rd-helion',desc:'Token-layer guardrail — scans prompt + completion on the R&D self-hosted policy'},
};
function svcInserted(id){
  const t=SVC_TARGETS[id];
  if(!t)return false;
  if(id==='ai-guardrail'){const tp=(_.tokenPolicies)||{};return !!(tp['rd-helion']&&tp['rd-helion'].guardrail);}
  const r=rules.find(x=>x.id===t.ruleId);
  return r?ruleEnforced(r):false;
}
function serviceCatalog(){
  return Object.keys(SERVICES).map(id=>({
    id,label:SERVICES[id].label,kind:SERVICES[id].kind,
    target:SVC_TARGETS[id].target,desc:SVC_TARGETS[id].desc,
    inserted:svcInserted(id),
  }));
}
function insertService(id){
  const t=SVC_TARGETS[id];
  if(!t||svcInserted(id))return false;
  if(id==='ai-guardrail'){
    if(CC.setTokenPolicy){CC.setTokenPolicy('rd-helion',{guardrail:true});return true;}
    return false;
  }
  return enforceRule(t.ruleId);
}
const DSTS={
  'internet':'the public internet',
  'ai-endpoints':'AI endpoints (CoreWeave · Nebius · OpenAI)',
  'intra-tag':'workloads carrying the same tag',
  'not-intra-tag':'anything outside the tag',
  'storage':'object storage endpoints',
  'storage-external':'object storage OUTSIDE the org (aws:ResourceOrgID mismatch)',
  'dns-exfil':'covert DNS tunneling (UDP/53)',
  'intra-group':'workloads in the same group',
  'not-intra-group':'anything outside the group',
  'any':'any destination',
};
/* deterministic flow table: what this estate actually talks to */
function flows(){
  const out=[];let n=0;
  const rng=_.mulberry32(_.hashStr('flows'));
  /* Flat index of every VPC and its primary tag, walked in the same
     cloud → region → vpc order as the flow loop below. Used to resolve the
     concrete same-tag peers an intra-tag flow points at. Built before the
     loop and draws no rng, so flow gbps are untouched by its existence. */
  const allVpcs=[];
  clouds.forEach(cl=>(regions[cl.id]||[]).forEach(r=>(vpcs[r.id]||[]).forEach(v=>{
    allVpcs.push({id:v.id,tag:(v.tags||[])[0]||'untagged'});
  })));
  clouds.forEach(cl=>(regions[cl.id]||[]).forEach(r=>(vpcs[r.id]||[]).forEach(v=>{
    const tag=(v.tags||[])[0]||'untagged';
    const base=v.subnets*Math.round(2+rng()*6)/10;
    const mk=(dst,ports,via,gbps)=>{
      const f={id:'f'+(++n),srcVpc:v.id,srcName:v.name,
        srcTag:tag,srcCloud:cl.id,dst,ports,viaPublic:via,gbps:Math.round(gbps*10)/10};
      out.push(f);return f;
    };
    // every VPC reaches storage
    mk('storage','443',!r.attached,base*0.8);
    // unattached estates (and the DMZ) egress to the internet; finance
    // keeps its direct path until the isolation rule removes the
    // public-subnet association - the flow the deny rule exists to stop
    if(!r.attached||v.id==='vpcdmz'||(tag==='finance-invoices'&&!fixes.isolateFinance))mk('internet','443',true,base*1.4);
    // AI-adjacent tags call AI endpoints
    if(tag==='rd-helion'||tag==='shared-services')mk('ai-endpoints','443',!r.attached,base*1.8);
    if(tag==='classified-helion')mk('ai-endpoints','443',!r.attached,base*1.2);
    /* rd-helion talks to itself across clouds. One flow per same-tag PEER,
       not one flow per source: 'intra-tag' names a class of destinations, and
       group membership can only be tested against a concrete instance. The
       dst string stays 'intra-tag' so every legacy rule keeps matching; the
       concrete dstVpc is added alongside it. The source's intra-tag gbps is
       DIVIDED across its peers rather than duplicated onto each, so total
       modelled traffic does not change. A VPC with no same-tag peer emits
       nothing - there is nobody for it to reach.

       The split is done in integer TENTHS and the last peer takes the
       remainder, so the peer flows sum back to the source's own intra-tag
       gbps exactly. Rounding each peer's share independently does not err
       reliably downward - the direction depends on the remainder - so it
       could invent or destroy traffic as the peer count changed. Peer count
       is not static: rescanning GCP surfaces a fourth rd-helion workload,
       which is precisely where an odd divisor used to break the total.
       This gate is a hard literal on rd-helion; only the peer FILTER below
       is tag-generic, so a second intra-tag tag would need this gate widened
       before it got peer expansion. */
    if(tag==='rd-helion'){
      const peers=allVpcs.filter(p=>p.tag===tag&&p.id!==v.id);
      const tenths=Math.round(base*0.9*10);
      let given=0;
      peers.forEach((p,i)=>{
        // FLOOR, not round: with round(), the first n-1 shares can together
        // exceed the total (round(2/4)*3 = 3 > 2) and the last peer absorbs a
        // NEGATIVE remainder - a peer modelled as carrying less than no
        // traffic. Flooring can only under-allocate, so the remainder the last
        // peer takes is non-negative by construction and the sum still lands
        // on `tenths` exactly. The conservation this comment's neighbour
        // describes is preserved; only the direction of the rounding error is
        // pinned. See peerSplit.test.ts.
        const share=i===peers.length-1?tenths-given:Math.floor(tenths/peers.length);
        given+=share;
        mk('intra-tag','5432, 8443',!r.attached,share/10).dstVpc=p.id;
      });
    }
    // classified-helion can attempt DNS tunneling: data encoded in query
    // names on UDP/53. It looks like benign DNS and slips past TLS/packet
    // inspection — only the resolver DNS firewall (dns-fw) catches it.
    if(tag==='classified-helion'&&!fixes.dnsFirewall)mk('dns-exfil','53',true,base*0.3);
    // finance can copy data to a bucket OUTSIDE the org via a legitimate
    // S3 endpoint: the network path is clean (viaPublic:false), so path
    // controls never flag it. Only a resource perimeter (aws:ResourceOrgID)
    // stops it — the article's "second authorization layer".
    if(tag==='finance-invoices'&&!fixes.dataPerimeter)mk('storage-external','443',false,base*0.6);
  })));
  /* Branch-originated flows. A customer branch reaches the cloud regions its
     on-ramp targets; for each, it talks to that region's VPCs. Appended AFTER
     the VPC loop so the rng stream the VPC flows drew from is untouched and
     their gbps stay byte-identical. Without these, a group of branches matches
     nothing and branch policies dry-run empty. */
  (CC.branches||[]).forEach(br=>{
    const onramp=(CC.onramps||[]).find(o=>o.id===br.onrampId);
    if(!onramp)return;
    (onramp.targets||[]).forEach(t=>{
      const cloudId=t[0],regionId=t[1];
      (vpcs[regionId]||[]).forEach(v=>{
        // srcTag is null: a customer branch carries no governance tag of
        // its own, so tag-based rules must never match it here - group
        // membership is the correct match mechanism (later task). The
        // destination VPC's tag is still useful, so it's carried honestly
        // as dstTag rather than mislabeled as the flow's source tag.
        // Same reasoning for cloud: a branch isn't IN a cloud, it reaches
        // one over the on-ramp, so srcCloud is null and the reached cloud
        // is carried honestly as dstCloud rather than mislabeled as origin.
        out.push({id:'f'+(++n),srcBranch:br.id,srcName:br.name,
          srcTag:null,dstTag:(v.tags||[])[0]||null,srcCloud:null,dstCloud:cloudId,
          dst:'intra-tag',dstVpc:v.id,ports:'any',
          viaPublic:!v.attached,gbps:Math.round(rng()*40)/10});
      });
    });
  });
  /* Group membership, resolved live on every call - never stored on the
     estate objects themselves. A workload added to a group tomorrow is
     matched by that group's policies tomorrow. Runs last so it sees every
     accumulated flow, and draws no rng, so flow gbps stay byte-identical.

     `CC.groupsFor(id)` re-resolves EVERY group's full membership (literal
     members + predicates scanned over the whole branch/VPC estate) on every
     call - fine for a single lookup, but this loop used to call it twice per
     flow. Acme's ~250 flows made that cost invisible; Meridian's ~35,000
     flows (4,183 branches) turned it into ~140,000 full group
     re-resolutions, each itself O(branches+vpcs) - a render that should be
     instant took 25+ seconds (discovered rendering UnifiedDiscovery under
     meridian for Task 6's rollup rows). Resolving every group exactly ONCE
     up front and indexing by object id produces the identical per-flow
     result (`groupsFor`/`resolveGroup` are pure derivations of the same live
     `groups` + estate state the two calls below read) at
     O(groups·estateSize + flows) instead of O(flows·groups·estateSize). */
  const groupIndex={};
  CC.groupList().forEach(function(g){
    const r=CC.resolveGroup(g.id);
    r.branchIds.forEach(function(id){(groupIndex[id]=groupIndex[id]||[]).push(g.id);});
    r.vpcIds.forEach(function(id){(groupIndex[id]=groupIndex[id]||[]).push(g.id);});
  });
  out.forEach(function(f){
    const srcId=f.srcBranch||f.srcVpc||null;
    f.srcGroups=srcId?(groupIndex[srcId]||[]):[];
    f.dstGroups=f.dstVpc?(groupIndex[f.dstVpc]||[]):[];
  });
  return out;
}
function ruleMatch(rule,flow){
  if(rule.src.tag&&rule.src.tag!=='any'&&flow.srcTag!==rule.src.tag)return false;
  if(rule.src.cloud&&rule.src.cloud!=='any'&&flow.srcCloud!==rule.src.cloud)return false;
  if(rule.src.group&&(flow.srcGroups||[]).indexOf(rule.src.group)<0)return false;

  /* Destination. A missing dst must fail closed - matching zero flows,
     never every flow - so it can never be mistaken for an unset filter. */
  if(!rule.dst)return false;

  /* Guard the object shape FIRST - the legacy string compare below is
     always true for an object and would match zero flows. An object dst
     with no group key is also unset-filter shaped and must fail closed
     rather than match every flow. */
  if(typeof rule.dst==='object'){
    if(!rule.dst.group)return false;
    if((flow.dstGroups||[]).indexOf(rule.dst.group)<0)return false;
  }else if(rule.dst==='intra-group'){
    // meaningless without a source group - must match nothing, not everything
    if(!rule.src.group)return false;
    if((flow.dstGroups||[]).indexOf(rule.src.group)<0)return false;
  }else if(rule.dst==='not-intra-group'){
    if(!rule.src.group)return false;
    if((flow.dstGroups||[]).indexOf(rule.src.group)>=0)return false;
  }else if(rule.dst==='not-intra-tag'){
    if(flow.dst==='intra-tag')return false;
  }else if(rule.dst&&rule.dst!=='any'&&flow.dst!==rule.dst)return false;

  /* Ports are a comma-separated set, not a string to search: '443' is not a
     port of '5432, 8443' even though it is a substring of it. */
  if(rule.ports&&rule.ports!=='any'){
    var flowPorts=String(flow.ports||'').split(',').map(function(s){return s.trim();});
    if(flowPorts.indexOf(String(rule.ports))===-1)return false;
  }
  return true;
}
function verdictFor(rule,flow){
  // DNS tunneling is invisible to TLS/packet inspection — an inspect rule
  // "sees" it but cannot neutralize it; only a deny at the resolver does.
  if(flow.dst==='dns-exfil'){
    if(rule.action==='deny')return {v:'blocked at resolver',bad:false};
    if(rule.action==='inspect')return {v:'tunneling slips past TLS inspection',bad:true};
  }
  if(rule.action==='deny')return {v:'blocked',bad:false};
  if(rule.action==='inspect')return {v:'inspected via '+(rule.chain.join(' → ')||'chain'),bad:false};
  if(rule.action==='route-private')return flow.viaPublic
    ?{v:'pending private path — attach the region to satisfy',bad:true}
    :{v:'pinned to private path',bad:false};
  return {v:'allowed',bad:false};
}
/* the five governance fixes, authored as what they really are: rules */
const rules=[
  {id:'pol-fin',pri:1,name:'Block finance direct internet',system:true,
    src:{tag:'finance-invoices',cloud:'any'},dst:'internet',ports:'any',action:'deny',chain:[],fix:'isolateFinance'},
  {id:'pol-insp',pri:2,name:'Inspect classified egress',system:true,
    src:{tag:'classified-helion',cloud:'any'},dst:'any',ports:'any',action:'inspect',chain:['fw-inspect-01','ips-engine'],fix:'fwInspection'},
  {id:'pol-seg',pri:3,name:'Segment rd-helion (intra-tag only)',system:true,
    src:{tag:'rd-helion',cloud:'any'},dst:'not-intra-tag',ports:'any',action:'deny',chain:[],fix:'segmentHelion'},
  {id:'pol-dns',pri:4,name:'Block DNS tunneling (classified)',system:true,
    src:{tag:'classified-helion',cloud:'any'},dst:'dns-exfil',ports:'any',action:'deny',chain:['dns-fw'],fix:'dnsFirewall'},
  {id:'pol-perimeter',pri:5,name:'Deny egress to out-of-org storage',system:true,
    src:{tag:'any',cloud:'any'},dst:'storage-external',ports:'any',action:'deny',chain:[],fix:'dataPerimeter'},
  /* The three requirements-doc example policies, authored as first-class,
     enforceable rules alongside the fixes above. No pattern-fix binding, so
     Enforce simply flips their enforced flag - they behave like real rules. */
  {id:'pol-pci',pri:6,name:'PCI workloads → force private path',system:true,example:true,
    src:{tag:'pci',cloud:'any'},dst:'any',ports:'any',action:'route-private',chain:[]},
  {id:'pol-internet-facing',pri:7,name:'Internet-facing → NGFW + AT&T egress',system:true,example:true,
    src:{tag:'internet-facing',cloud:'any'},dst:'internet',ports:'any',action:'inspect',chain:['Palo Alto NGFW','AT&T egress']},
  {id:'pol-branch-finance',pri:8,name:'Finance branch → only finance-tagged workloads',system:true,example:true,
    src:{tag:'finance',cloud:'any'},dst:'not-intra-tag',ports:'any',action:'deny',chain:[]},
];
let ruleSeq=0;
function ruleEnforced(r){return r.fix?fixes[r.fix]:!!r.enforced;}
/* patterns: a hand-authored rule that means one of the known remediations
   drives the same fix - authoring "deny finance->internet" IS isolation */
function patternFix(r){
  if(r.action==='deny'&&r.dst==='internet'&&r.src.tag==='finance-invoices')return 'isolateFinance';
  if(r.action==='inspect'&&r.src.tag==='classified-helion')return 'fwInspection';
  if(r.action==='deny'&&r.dst==='not-intra-tag'&&r.src.tag==='rd-helion')return 'segmentHelion';
  if(r.action==='deny'&&r.dst==='dns-exfil')return 'dnsFirewall';
  if(r.action==='deny'&&r.dst==='storage-external')return 'dataPerimeter';
  return null;
}
function dryRun(rule){
  const fl=flows();
  const matched=fl.filter(f=>ruleMatch(rule,f)).map(f=>({flow:f,...verdictFor(rule,f)}));
  // shadowing: an enforced higher-priority rule already decides some of these flows differently
  const shadowed=[];
  matched.forEach(m=>{
    const shadow=rules.filter(r=>r.id!==rule.id&&ruleEnforced(r)&&(rule.pri==null||r.pri<rule.pri))
      .find(r=>ruleMatch(r,m.flow)&&r.action!==rule.action);
    if(shadow)shadowed.push({flow:m.flow,by:shadow.name});
  });
  const gbps=Math.round(matched.reduce((s,m)=>s+m.flow.gbps,0)*10)/10;
  return {matched,shadowed,gbps,
    blocked:matched.filter(m=>m.v==='blocked').length,
    pending:matched.filter(m=>m.bad).length};
}
/* dst is either a legacy DSTS string enum or a structured {group:'<id>'}.
   A string must be a known DSTS key; an object must name a group that
   actually exists - fail closed on both, same as the string case always
   has, rather than weakening the guard to accept any shape. */
function validDst(dst){
  if(dst&&typeof dst==='object')return !!(dst.group&&(CC.groupList()||[]).some(g=>g.id===dst.group));
  return !!DSTS[dst];
}
/* Human-readable fallback-name endpoint label. src/dst can each be
   tag-based or group-based; read whichever key is present rather than
   assuming .tag or stringifying the object, which is what produced
   "deny undefined → [object Object]" for group rules. */
function ruleEndpointLabel(x){return (x&&typeof x==='object')?(x.group||x.tag||'any'):x;}
function addRule({name,src,dst,ports,action,chain,enforceNow}){
  if(!src||!validDst(dst))return null;
  _.pushUndo('Author rule');
  const r={id:'rule-'+(++ruleSeq),pri:rules.length+1,
    name:name||`${action} ${ruleEndpointLabel(src)} → ${ruleEndpointLabel(dst)}`,
    src,dst,ports:ports||'any',action,chain:chain||[],enforced:false,system:false};
  rules.push(r);
  if(enforceNow)enforceRule(r.id,true);
  _.emit({type:'policy',id:r.id,label:'Rule authored · '+r.name});
  return r;
}
function enforceRule(id,silent){
  const r=rules.find(x=>x.id===id);
  if(!r||ruleEnforced(r))return false;
  if(!silent)_.pushUndo('Enforce '+r.name);
  const fx=r.fix||patternFix(r);
  if(fx&&!fixes[fx]){
    // the fix mutation applies silently; the audit gets the RULE's name,
    // not a raw flag key
    r.fix=fx;CC.applyFix(fx,true);
    if(!silent)_.emit({type:'fix',key:r.id,label:'Rule enforced · '+r.name});
    return true;
  }
  r.enforced=true;
  if(!silent)_.emit({type:'fix',key:r.id,label:'Rule enforced · '+r.name});
  return true;
}
function removeRule(id){
  const i=rules.findIndex(r=>r.id===id&&!r.system);
  if(i<0)return false;
  _.pushUndo('Delete rule');
  const [r]=rules.splice(i,1);
  delete polHits[id];
  rules.forEach((x,j)=>x.pri=j+1);
  _.emit({type:'policy',id,label:'Rule removed · '+r.name});
  return true;
}
function moveRule(id,dir){
  const i=rules.findIndex(r=>r.id===id);
  const j=i+dir;
  if(i<0||j<0||j>=rules.length)return false;
  [rules[i],rules[j]]=[rules[j],rules[i]];
  rules.forEach((x,k)=>x.pri=k+1);
  _.emit({type:'policy',id,label:'Rule priority changed'});
  return true;
}
function ruleList(){return rules.slice().sort((a,b)=>a.pri-b.pri);}
function enforceAny(id){
  if(rules.some(r=>r.id===id))return enforceRule(id);
  return enforcePolicy(id);
}

/* ---------------- approvals ----------------
   Optional enforcement ceremony: with approvals required, Enforce
   becomes Request -> pending -> Approve (the two-persona demo). */
const settings={requireApproval:false};
function setRequireApproval(v){settings.requireApproval=!!v;_.emit({type:'policy',label:'Approval requirement '+(v?'enabled':'disabled')});}
function requestRule(id){
  const r=rules.find(x=>x.id===id);
  if(!r||ruleEnforced(r)||r.pending)return false;
  r.pending=true;
  _.emit({type:'policy',id,label:'Approval requested · '+r.name});
  return true;
}
function approveRule(id){
  const r=rules.find(x=>x.id===id);
  if(!r||!r.pending)return false;
  r.pending=false;
  return enforceRule(id);
}
function rejectRule(id){
  const r=rules.find(x=>x.id===id);
  if(!r||!r.pending)return false;
  r.pending=false;
  _.emit({type:'policy',id,label:'Approval rejected · '+r.name});
  return true;
}
function pendingRules(){return rules.filter(r=>r.pending);}

/* ---------------- policies ----------------
   The three seed policies from the Insights findings. Enforcing one
   runs the SAME mutation the Insights action runs - one source of
   truth for what a fix does. */
function policies(){
  return [
    ...ruleList().map(r=>({id:r.id,name:r.name,custom:!r.system,
      /* Read both endpoints through ruleEndpointLabel, never interpolate
         them raw: a group rule carries an object on BOTH sides, and
         `${r.dst}` on an object is the "[object Object]" this summary used
         to print. */
      match:`${ruleEndpointLabel(r.src)}${r.src.cloud&&r.src.cloud!=='any'?' @ '+r.src.cloud:''} → ${ruleEndpointLabel(r.dst)}${r.ports!=='any'?' :'+r.ports:''}`,
      tag:TAGS[r.src.tag]?r.src.tag:null,
      chain:r.chain.join(' → ')||r.action,action:r.action,
      enforced:ruleEnforced(r),rule:true})),
    ...legacyPolicies()];
}
function legacyPolicies(){
  return [
    {id:'legacy-pol-fin',hidden:true,name:'Isolate finance-invoices from internet',
      match:'tag = finance-invoices',tag:'finance-invoices',
      chain:'route-table rewrite',action:'remove public-subnet association · egress via S3 endpoint + Direct Connect only',
      fix:'isolateFinance',enforced:fixes.isolateFinance,
      effect:'vpc-data-02 (AWS us-east-1) — closes the direct-internet-path violation'},
    {id:'legacy-pol-insp',hidden:true,name:'Enforce inspection on classified-helion',
      match:'tag = classified-helion · all clouds',tag:'classified-helion',
      chain:'fw-inspect-01 (inline firewall)',action:'re-point 0.0.0.0/0 through inspection before any egress',
      fix:'fwInspection',enforced:fixes.fwInspection,
      effect:'vpc-dmz-03 (AWS) + nb-gpu-net (Nebius) — clears both bypass violations'},
    {id:'legacy-pol-seg',hidden:true,name:'Segment rd-helion cross-cloud',
      match:'tag = rd-helion ↔ rd-helion only',tag:'rd-helion',
      chain:'segmentation rule',action:'allow intra-tag traffic across AWS / Azure / CoreWeave · deny all else',
      fix:'segmentHelion',enforced:fixes.segmentHelion,
      effect:'vpc-prod-01 + vnet-app-02 + gpu-cluster-01 — "should only talk to each other", enforced'},
    ...customPolicies.map(p=>{
      const ev=evalPolicy(p);
      const req=REQUIREMENTS[p.requirement];
      return {id:p.id,name:p.name,custom:true,
        match:`tag = ${p.tag}${p.cloud&&p.cloud!=='any'?' · cloud = '+p.cloud:''}${p.param?' · '+p.param+'ms':''}`,tag:p.tag,
        chain:req.chain,action:req.action,
        enforced:p.enforced,liveViolations:ev.violations.length,
        matched:ev.matched.map(m=>m.v.name),
        effect:ev.violations.length
          ?`${ev.matched.length} matched · ${ev.violations.length} in violation: ${ev.violations.filter(x=>x.name).map(x=>x.name).join(', ')||ev.violations[0].msg}`
          :`${ev.matched.length} matched · fully compliant`};
    }),
  ];
}

/* ---------------- policy hit counters ----------------
   Enforced policies accumulate flows-matched / acted-on counters,
   proportional to matched workload weight. Enforcement you can watch. */
const polHits={}; // id -> {flows,acted}
function hitWeight(tag){return policyMatches(tag).reduce((s,m)=>s+m.v.subnets*3,0);}
function tickHits(){
  let any=false;
  const all=[
    ...ruleList().filter(r=>ruleEnforced(r)).map(r=>({id:r.id,tag:r.src.tag&&TAGS[r.src.tag]?r.src.tag:'shared-services',
      actRate:r.action==='inspect'?.08:r.action==='deny'?.012:.03})),
    ...customPolicies.filter(p=>p.enforced).map(p=>({id:p.id,tag:p.tag,actRate:.03})),
  ];
  const rng=_.mulberry32(_.hashStr('hits:'+(tickHits.n=(tickHits.n||0)+1)));
  all.forEach(s=>{
    const h=polHits[s.id]=polHits[s.id]||{flows:0,acted:0};
    const w=hitWeight(s.tag);
    const add=Math.round(w*(2+rng()*3));
    h.flows+=add;
    h.acted+=Math.max(0,Math.round(add*s.actRate*(0.5+rng())));
    any=true;
  });
  if(_.tickTokens(rng))any=true;
  if(any)_.emit({type:'hits'});
}
/* The ticker drives live product state - CC.policyHits counters and, through
   _.tickTokens, the AI token meters the Observe page reads - so it has to keep
   running in the app. It used to be a bare setInterval fired at module load
   with no handle kept: unstoppable, and started fresh in every test file that
   imported the engine, where a 3s timer mutating shared counters is noise the
   suite can neither clear nor rely on. It is now a managed handle, started
   automatically everywhere EXCEPT under test. */
let hitTimer=null;
function startHits(){if(hitTimer!==null)return false;hitTimer=setInterval(tickHits,3000);return true;}
function stopHits(){if(hitTimer===null)return false;clearInterval(hitTimer);hitTimer=null;return true;}
function hitsRunning(){return hitTimer!==null;}
const underTest=typeof process!=='undefined'&&!!process.env&&(!!process.env.VITEST||process.env.NODE_ENV==='test');
if(!underTest)startHits();
function policyHits(id){return polHits[id]||null;}

/* the core's snapshot/restore and the share module's replay reach the
   live arrays and id counters through the bag */
_.rules=rules;
_.customPolicies=customPolicies;
_.nextPolId=()=>'custom-'+(++polSeq);
_.nextRuleId=()=>'rule-'+(++ruleSeq);

Object.assign(CC,{REQUIREMENTS,addPolicy,removePolicy,enforcePolicy,policyMatches,evalPolicy,evalExample,exampleRules,previewPolicy,
  SERVICES,DSTS,flows,ruleList,ruleMatch,dryRun,addRule,enforceRule,removeRule,moveRule,enforceAny,ruleEnforced,
  serviceCatalog,insertService,
  settings,setRequireApproval,requestRule,approveRule,rejectRule,pendingRules,
  policies,policyHits,startHits,stopHits,hitsRunning});
})(window.CC);
