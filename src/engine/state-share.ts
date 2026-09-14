// @ts-nocheck
/* Cloud Control - grounded answers + shareable sessions.
   Loads LAST of the state modules: hydrate() replays a shared session
   through the real mutations, so every engine it touches (rules,
   custom policies, fixes, sim) must already exist by the time it runs.
   Load order guarantees that. Unlike the original vanilla-JS build,
   hydrate() is NOT auto-invoked at module load - the app runs under
   HashRouter now, and calling it before React mounts would race the
   router's own history handling. Instead the React shell calls
   restoreFromLocation() (src/features/share/shareLink.ts) once on app
   mount, which delegates to CC.hydrate() below. */
(function(CC){
const _=CC._;
const {onramps,fixes,sim}=CC;

/* ---------------- grounded answer engine ----------------
   Shared by the Discovery rail and the Insights ask bar. Every answer
   is computed from live state at ask time. */
const fmtK=n=>'$'+(n/1000).toFixed(1)+'k';
function answerFor(text){
  const key=(text||'').toLowerCase();
  const onr=id=>onramps.find(o=>o.id===id);
  const e=CC.egress();
  if(key.includes('egress cost')||key.includes('cost up')){
    if(onr('nb2').active)return `<b>The growth line is contained.</b> AI inference egress moved to committed private pricing when NetBond Adv attached — public-path spend is down to ${fmtK(e.pub)}/mo and the forecast has turned ${e.forecast.startsWith('-')?'negative (good)':'flat'}. Private-path savings are running ${fmtK(e.savings)}/mo.`;
    return `<b>AI inference egress is the driver.</b> CoreWeave and Nebius egress over public internet rose 22% week over week — $11.4k of the ${fmtK(e.pub)} public-path total. NetBond Adv · PE-DAL-01 is already provisioned to reach both and would move this traffic to private pricing.`;
  }
  if(key.includes('coreweave')||key.includes('nebius')||key.includes('gpu')){
    if(onr('nb2').active)return `<b>Already done.</b> NetBond Adv · PE-DAL-01 is live — CoreWeave US-EAST-04A, Nebius eu-north1, and OCI us-ashburn-1 all ride private paths. That cleared the top findings in Reach, Exposure, and Cost in one action.`;
    return `Provisioning <b>NetBond Adv · PE-DAL-01</b> would attach CoreWeave US-EAST-04A and Nebius eu-north1 — both currently unreached. This resolves the top finding in <b>Reach &amp; attachment</b> and the top finding in <b>Cost &amp; egress</b> in one action, and removes the ungoverned-AI-traffic endpoints in <b>Exposure &amp; posture</b>.`;
  }
  if(key.includes('isolate finance')||key.includes('finance-invoices')){
    if(fixes.isolateFinance)return `<b>Enforced.</b> vpc-data-02's public subnets are re-associated to private route tables — egress is S3 endpoint + Direct Connect only. The violation is cleared and the route-table chips in Discovery are gone.`;
    return `This creates a policy matching the <b>finance-invoices</b> tag: remove the public-subnet association on <b>vpc-data-02</b>'s rtb-public, leaving only the private route table (S3 endpoint + Direct Connect, no IGW). Closes the one direct-internet-path violation in <b>Policy &amp; segmentation</b>.`;
  }
  if(key.includes('inspection')||key.includes('classified')){
    if(fixes.fwInspection)return `<b>Enforced.</b> fw-inspect-01 sits inline on vpc-dmz-03 (AWS) and nb-gpu-net (Nebius) — every classified-helion route table points 0.0.0.0/0 through it. Open either resource map in Discovery to see the rewired path.`;
    return `This creates a policy matching the <b>classified-helion</b> tag across clouds: insert <code>fw-inspect-01</code> inline on the egress path for <b>vpc-dmz-03</b> (AWS) and <b>nb-gpu-net</b> (Nebius), and re-point each private route table's <code>0.0.0.0/0</code> route through it.`;
  }
  if(key.includes('attach order')||key.includes('plan')){
    const p=CC.plan();
    if(!p.steps.length)return `<b>Nothing left to sequence.</b> Every step in the remediation plan has been applied — posture is holding at ${CC.posture()}.`;
    return `<b>Recommended order, greedy by posture gain (${p.from} → ${p.to} across ${p.steps.length} steps):</b><br>`+p.steps.map((st,i)=>`${i+1}. ${st.label} <span style="color:var(--text3)">→ posture ${st.projected}</span>`).join('<br>');
  }
  if(key.includes('forecast')){
    return `<b>90-day projection from current state:</b> public-path egress at ${fmtK(e.pub)}/mo trending ${e.forecast} monthly. ${e.pub>6000?`Attaching the remaining on-ramps shifts the public spend to committed private pricing — modeled savings reach ${fmtK(Math.round(e.pub*0.15+e.savings))}/mo at full attach.`:`At full attach the model holds savings at ${fmtK(e.savings)}/mo against public rates.`}`;
  }
  if(key.includes('cidr')||key.includes('address')||key.includes('overlap')||key.includes('renumber')){
    const a=CC.addressPlan();
    if(!a.conflicts)return `<b>The address plan is clean</b> — ${a.rows.length} ranges, no overlaps. Next free range if you need one: <code>${a.nextFree}</code>.`;
    const c=a.rows.find(r=>r.conflict.length);
    return `<b>${a.conflicts} CIDR collision in the estate.</b> <code>${c.cidr}</code> is claimed by ${c.name} (${c.cloud}) and ${c.conflict.map(x=>x.name+' ('+x.cloud+')').join(', ')} — routing between them is ambiguous and they can never peer. <code>${a.nextFree}</code> is free; renumbering vpc-svc-02 resolves it.`;
  }
  if(key.includes('app')||key.includes('workload layer')){
    const al=CC.appList();
    const risky=al.filter(a=>a.health==='at-risk'||a.health==='degraded');
    return `<b>${al.length} applications</b> run on this estate (plus ${CC.untaggedWorkloads()} untagged workloads). ${risky.length?`<b style="color:#ff9db4">${risky.length} need attention:</b> ${risky.map(a=>`${a.app.name} (${a.health})`).join(', ')}.`:'All healthy on the current substrate.'} ${al.filter(a=>a.aiDeps.length).length} consume AI endpoints — the workload layer is what connects the bytes you attach to the tokens they spend.`;
  }
  if(key.includes('fail')||key.includes('down')||key.includes('what if')){
    const active=onramps.filter(o=>o.active);
    return `<b>Run a what-if:</b> every active on-ramp card in the Discovery fabric rail has a "Simulate failure" control. ${active.length?`Right now ${active.map(o=>o.name).join(', ')} ${active.length>1?'are':'is'} carrying traffic — failing one shows exactly which VPCs lose their private path and what egress falls back to public rates.`:''}`;
  }
  return null;
}

/* ---------------- shareable session state ----------------
   Only DELTAS from the pristine model travel: attached on-ramp ids,
   fix flags, custom policies, active sim. Compact JSON -> base64url.

   The app now runs under HashRouter (routes live at #/discover etc.), so
   the payload can no longer ride location.hash the way the original
   vanilla-JS build did - a pasted #s=... link would be swallowed by the
   router as an unmatched route instead of reaching hydrate(). It travels
   as a top-level ?s= query param instead: HashRouter never reads
   location.search, so the param survives every client-side navigation
   untouched, and a share link can still carry the current #/route after
   it (?s=<payload>#/discover) so the recipient lands on the right page. */
/* ---------------- base64 that survives real text ----------------
   btoa() is defined over Latin-1 only: it throws InvalidCharacterError on any
   code point above U+00FF. The payload carries free text - a group's label and
   desc, and addRule()'s generated fallback name, which is built as
   `${action} ${src} → ${dst}` with U+2192 - so authoring an unnamed rule and
   hitting Share produced no link at all, just a throw.

   Encode UTF-8 bytes rather than code units. Decoding is deliberately
   asymmetric: a link minted by the OLD encoder holds raw Latin-1 bytes (e.g.
   U+00B7 written as a lone 0xB7), which is not valid UTF-8, so a strict decode
   is tried first and falls back to the raw byte string. Every pre-existing
   share link still hydrates. */
function b64encode(str){
  const bytes=new TextEncoder().encode(str);
  let bin='';
  for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(b64){
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch(e){return bin;} // legacy payload: the old encoder wrote Latin-1 bytes
}

/* Pristine token-policy snapshot, taken at module load - state-share loads
   last of the state modules (see header), before any user mutation or
   hydrate() replay can touch the seeds. Only policies that differ from this
   snapshot travel: the seeds already exist on the receiving end, and an
   always-true filter here would defeat the emptiness check below (a pristine
   engine must keep minting an empty payload). */
const tpSeed=JSON.parse(JSON.stringify(_.tokenPolicies||{}));
function tpChanged(t,p){
  const s=tpSeed[t];
  return !s||p.enforced!==s.enforced||p.scope!==s.scope||p.budget!==s.budget||!p.guardrail!==!s.guardrail;
}
function payloadObject(){
  const d={
    o:onramps.filter(o=>o.active&&o.id!=='nb1').map(o=>o.id),
    f:Object.keys(fixes).filter(k=>fixes[k]),
    p:_.customPolicies.map(p=>({n:p.name,t:p.tag,r:p.requirement,e:p.enforced,c:p.cloud,m:p.param})),
    r:_.rules.filter(r=>!r.system).map(r=>({n:r.name,s:r.src,d:r.dst,po:r.ports,a:r.action,ch:r.chain,e:r.enforced})),
    tp:Object.entries(_.tokenPolicies||{}).filter(([t,p])=>tpChanged(t,p)).map(([t,p])=>({t,s:p.scope,b:p.budget,g:p.guardrail?1:0,e:p.enforced?1:0})),
    s:sim.onrampId||undefined,
    // Only custom (user-created) groups travel - the seeded groups
    // (west-branches, west-workloads) already exist on the receiving end,
    // so re-sending them would duplicate rather than restore.
    groups:(CC.groupList()||[]).filter(function(g){return g.custom;}).map(function(g){
      // custom:true travels explicitly (every entry here is custom by the
      // filter above, but the flag has to ride the wire too) - it is the
      // receiving end's signal that this definition is authoritative and
      // should win even if the id collides with an existing group (e.g. an
      // edited seed like west-workloads). See applyShareData below.
      return {id:g.id,label:g.label,kind:g.kind,members:g.members,predicates:g.predicates,desc:g.desc,custom:true};
    }),
  };
  // Gateway levers travel only when flipped - a pristine engine must keep
  // minting an empty payload (see the emptiness check in serialize()).
  const gwOn=Object.keys(_.gatewayFlags||{}).filter(k=>_.gatewayFlags[k]);
  if(gwOn.length)d.gw=gwOn;
  // Declared intents travel as declarations: the recipient's engine
  // re-evaluates and re-compiles - the link never carries a status.
  const ints=(_.intents||[]).map(i=>({k:i.key,sk:i.scope.kind,si:i.scope.id,sl:i.scope.label,m:i.mode}));
  if(ints.length)d.in=ints;
  // The assessment stage travels only once started - pristine stays empty.
  if(_.assessment&&_.assessment.stage!=='not-started')
    d.as={g:_.assessment.stage,d:_.assessment.day,t:_.assessment.startedAt};
  if(!d.r.length)delete d.r;
  if(!d.tp.length)delete d.tp;
  if(!d.groups.length)delete d.groups;
  return d;
}
function encodePayload(d){
  return b64encode(JSON.stringify(d)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function serialize(){
  const d=payloadObject();
  if(!d.o.length&&!d.f.length&&!d.p.length&&!d.r&&!d.tp&&!d.s&&!d.groups&&!d.gw&&!d.in&&!d.as)return '';
  return encodePayload(d);
}
function shareUrl(){
  const s=serialize();
  return location.origin+location.pathname+(s?'?s='+s:'')+location.hash;
}
/* A proposal link: the session payload PLUS the staged, uncommitted moves.
   The link carries INTENTIONS, never figures - the receiving engine reprices
   every move from its own getters, so a stale link cannot state a stale
   number. Never empty: `pr` itself is the content. */
function proposalUrl(moves){
  const d=payloadObject();
  d.pr=(moves||[]).map(m=>{
    if(m.kind==='attach')return ['a',m.regionId];
    if(m.kind==='steer')return ['s',m.flowId,m.pathId];
    if(m.kind==='fix')return ['f',m.fixKey];
    if(m.kind==='enforce')return ['e',m.ruleId];
    if(m.kind==='policy')return ['tp',m.tag,m.patch||{}];
    return null;
  }).filter(Boolean);
  return location.origin+location.pathname+'?s='+encodePayload(d)+location.hash;
}
/* Decoded proposal moves wait here for the UI to claim them - staged, never
   applied. takeProposal() is read-once so a remount cannot re-stage. */
let pendingProposal=null;
function takeProposal(){
  const p=pendingProposal;
  pendingProposal=null;
  return p;
}
/* Applies one decoded payload string against the live model. Shared by
   hydrate() (below) and any router-safe caller (see the React bridge's
   restoreFromLocation in src/features/share/shareLink.ts) that has already
   pulled the raw ?s= value off the URL itself. */
function applyShareData(raw){
  try{
    const d=JSON.parse(b64decode(raw.replace(/-/g,'+').replace(/_/g,'/')));
    if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('share payload is not an object');
    (d.o||[]).forEach(id=>CC.activateOnramp(id,true));
    (d.o||[]).forEach(id=>{const o=onramps.find(x=>x.id===id);if(o)o.targets.forEach(([cid,rid])=>{const k=cid+'/'+rid;if(!_.sessionAttached.includes(k))_.sessionAttached.push(k);});});
    (d.f||[]).forEach(k=>CC.applyFix(k,true));
    (d.p||[]).forEach(x=>{
      if(!CC.REQUIREMENTS[x.r]||!CC.TAGS[x.t])return;
      _.customPolicies.push({id:_.nextPolId(),name:x.n||(CC.REQUIREMENTS[x.r].label+' · '+x.t),tag:x.t,requirement:x.r,cloud:x.c||'any',param:x.m||null,enforced:!!x.e,custom:true});
    });
    (d.r||[]).forEach(x=>{
      if(!CC.DSTS[x.d])return;
      _.rules.push({id:_.nextRuleId(),pri:_.rules.length+1,name:x.n,src:x.s||{tag:'any',cloud:'any'},
        dst:x.d,ports:x.po||'any',action:x.a||'allow',chain:x.ch||[],enforced:!!x.e,system:false});
    });
    (d.tp||[]).forEach(x=>{
      const p=(_.tokenPolicies||{})[x.t];
      if(p)Object.assign(p,{scope:x.s||p.scope,budget:x.b||p.budget,guardrail:!!x.g,enforced:!!x.e});
    });
    (d.gw||[]).forEach(k=>{if(_.gatewayFlags&&k in _.gatewayFlags)_.gatewayFlags[k]=true;});
    // declareIntent validates key+scope against the catalog; silent replay,
    // like every other hydrate mutation - a replayed session is not an edit.
    (d.in||[]).forEach(x=>{
      if(CC.declareIntent)CC.declareIntent(x.k,{kind:x.sk,id:x.si??null,label:x.sl||String(x.si)},x.m==='enforce'?'enforce':'watch',true);
    });
    if(d.as&&_.assessment&&['measuring','report','closed'].includes(d.as.g)){
      _.assessment.stage=d.as.g;
      _.assessment.day=Math.min(14,Math.max(1,d.as.d|0));
      _.assessment.startedAt=typeof d.as.t==='number'?d.as.t:null;
    }
    if(d.s){const o=onramps.find(x=>x.id===d.s);if(o&&o.active)sim.onrampId=d.s;}
    // addGroup no-ops (returns null) when the id already exists, so replaying
    // a payload against an estate that already has the group - the common
    // case, since the recipient's engine seeds are already present - is
    // safe by default: no throw, no overwrite of the existing group. But
    // when the incoming entry is explicitly marked custom (the only kind
    // serialize() ever emits - see above), it is an authoritative
    // definition the sender owns, possibly an edited seed. In that case the
    // edit must win over the local copy, or it vanishes on replay a second
    // time even after updateGroup marks the source group custom.
    (d.groups||[]).forEach(g=>{
      if(!g||!g.id)return;
      const created=CC.addGroup(g);
      if(!created&&g.custom)CC.updateGroup(g.id,{members:g.members,predicates:g.predicates,label:g.label});
    });
    /* Proposal moves surface to the UI, they are NEVER applied here - the
       whole point is that the recipient commits, or does not. Malformed
       entries are dropped, not guessed. */
    if(Array.isArray(d.pr)){
      const moves=d.pr.map(x=>{
        if(!Array.isArray(x))return null;
        if(x[0]==='a'&&typeof x[1]==='string')return {kind:'attach',regionId:x[1]};
        if(x[0]==='s'&&typeof x[1]==='string'&&typeof x[2]==='string')return {kind:'steer',flowId:x[1],pathId:x[2]};
        if(x[0]==='f'&&typeof x[1]==='string')return {kind:'fix',fixKey:x[1]};
        if(x[0]==='e'&&typeof x[1]==='string')return {kind:'enforce',ruleId:x[1]};
        if(x[0]==='tp'&&typeof x[1]==='string'&&x[2]&&typeof x[2]==='object')return {kind:'policy',tag:x[1],patch:x[2]};
        return null;
      }).filter(Boolean);
      if(moves.length)pendingProposal=moves;
    }
    _.hist.push({label:'Restored shared session',posture:CC.posture()});
    return true;
  }catch(e){console.warn('bad share payload',e);return false;}
}
let hydrated=false;
/* Router-safe restore entry point: reads ?s= off location.search (ignored
   by HashRouter), falling back to the legacy #s= hash form so any link
   copied before this change still replays. Guarded so a caller invoking
   this from a React mount effect can't double-apply the same payload. */
function hydrate(){
  if(hydrated)return false;
  const q=new URLSearchParams(location.search).get('s');
  if(q){hydrated=true;return applyShareData(q);}
  const m=location.hash.match(/#s=([A-Za-z0-9_-]+)/);
  if(!m)return false;
  hydrated=true;
  return applyShareData(m[1]);
}

/* emulated-AI streaming: think, then type. Strips to text while
   streaming, swaps in the full html at the end. */
function stream(elm,html,done){
  const tmp=document.createElement('div');tmp.innerHTML=html;
  const text=tmp.textContent||'';
  elm.innerHTML='<span class="thinkdots" style="letter-spacing:2px;color:var(--text3)">·&nbsp;·&nbsp;·</span>';
  const chunk=Math.max(2,Math.round(text.length/55)); // ~1.2s total
  setTimeout(()=>{
    let i=0;
    const t=setInterval(()=>{
      i+=chunk;
      if(i>=text.length){clearInterval(t);elm.innerHTML=html;if(done)done();return;}
      elm.textContent=text.slice(0,i);
    },22);
  },420);
}

Object.assign(CC,{answerFor,serialize,shareUrl,proposalUrl,takeProposal,applyShareData,hydrate,stream,b64encode,b64decode});
})(window.CC);
