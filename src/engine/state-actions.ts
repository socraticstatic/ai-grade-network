// @ts-nocheck
/* Shared remediation registry - the catalog of posture categories, their
   findings, and the actions that fix them. Data only: no rendering, no
   icons (categories carry an iconKey the view resolves). Both the Posture
   tab and NetOps for AI read this one array, so a fix defined here changes
   the numbers everywhere. Lazy - every function runs against window.CC at
   call time, so this file only needs CC to EXIST, not to be fully built. */
(function(){
const CC=window.CC;
const on=id=>CC.onramps.find(o=>o.id===id);
const fmtK=n=>'$'+(n/1000).toFixed(1)+'k';

CC.postureCatalog=[
  {id:'reach',name:'Reach & attachment',iconKey:'net',color:'var(--att2)',
    score:()=>CC.scores().reach,
    summary:()=>{const c=CC.counts();return `${c.attached} of ${c.vpcs} VPCs attached · ${CC.reachableUnattached()} reachable VPCs unused on existing on-ramps`;},
    metrics:()=>{const c=CC.counts();return [
      ['Clouds discovered',c.clouds,''],['Regions discovered',c.regions,''],['VPC / VNet',c.vpcs,''],
      ['Attached',`${c.attached} / ${c.vpcs}`,c.attached===c.vpcs?'g':'a'],
      ['Reachable, unattached',CC.reachableUnattached(),CC.reachableUnattached()?'a':'g'],
      ['Active on-ramps',`${CC.activeOnramps()} / ${CC.onramps.length}`,CC.activeOnramps()===CC.onramps.length?'g':'a'],
    ];},
    findings:[
      {level:'crit',title:'GPU regions unreached',tags:['rd-helion'],resolved:()=>on('nb2').active,
        desc:'CoreWeave US-EAST-04A and Nebius eu-north1 carry inference traffic with no AT&T on-ramp at all — NetBond Adv · PE-DAL-01 is provisioned to reach both but not yet active.',
        done:'NetBond Adv · PE-DAL-01 is live — CoreWeave, Nebius, and OCI now ride private paths.'},
      {level:'warn',title:'Regions reachable on idle capacity',tags:[],resolved:()=>on('dx1').active&&on('er1').active,
        desc:'Direct Connect · Equinix DC2 and ExpressRoute · Equinix CH1 already terminate near AWS us-west-2, eu-west-1, GCP us-central1, and both Azure regions — none are attached yet.',
        done:'Both idle circuits are carrying traffic — every reachable region is attached.'},
      {level:'warn',title:'Azure UK South is a single path of failure',tags:[],resolved:()=>on('er1').active,
        desc:'vnet-emea-01 reaches AT&T only via EMEA-LON-01 with no secondary on-ramp or AZ diversity.',
        done:'ExpressRoute · CH1 gives UK South a second path — SPOF cleared.'},
    ],
    actions:[
      {label:'Attach CoreWeave & Nebius via NetBond Adv',sub:'Provisions PE-DAL-01 · resolves the AI-reach gap',
        apply:()=>CC.activateOnramp('nb2'),applied:()=>on('nb2').active,previewKey:{kind:'onramp',id:'nb2'}},
      {label:'Attach AWS us-west-2 + eu-west-1 to Direct Connect',sub:'Uses existing Equinix DC2 capacity · no new circuit',
        apply:()=>CC.activateOnramp('dx1'),applied:()=>on('dx1').active,previewKey:{kind:'onramp',id:'dx1'}},
      {label:'Ask the assistant to plan attach order',sub:'Sequences by workload count and AI exposure'},
    ]},

  {id:'exposure',name:'Exposure & posture',iconKey:'shield',color:'var(--amber)',
    score:()=>CC.scores().exposure,
    summary:()=>{const c=CC.counts(),p=CC.publicVpcs();return p?`${p} of ${c.vpcs} VPCs reachable only over public internet · ${CC.aiExposed()} AI endpoints ungoverned`:'Every VPC rides a private path · AI traffic governed';},
    metrics:()=>{const c=CC.counts(),p=CC.publicVpcs();return [
      ['Private paths',`${c.attached} / ${c.vpcs}`,c.attached===c.vpcs?'g':'g'],
      ['Public paths',`${p} / ${c.vpcs}`,p?'r':'g'],
      ['AI workloads exposed',CC.aiExposed(),CC.aiExposed()?'r':'g'],
      ['Inline inspection',CC.fixes.fwInspection?'enforced':'missing',CC.fixes.fwInspection?'g':'r'],
      // uks is acme's own seed region (Azure UK South); meridian's swap
      // replaces azure's regions with scus/eus2, so it doesn't resolve
      // there - a region this estate doesn't model carries no single-path
      // risk, same as if it were already attached.
      ['Single-path regions',(CC.regions.azure.find(r=>r.id==='uks')?.attached??true)?0:1,(CC.regions.azure.find(r=>r.id==='uks')?.attached??true)?'g':'a'],
    ];},
    findings:[
      {level:'crit',title:'Ungoverned AI traffic on public internet',tags:['rd-helion','classified-helion'],resolved:()=>on('nb2').active,
        desc:'OpenAI API, CoreWeave gpu-cluster-01, and Nebius nb-gpu-net all serve inference traffic over public internet with no SLA and variable latency (28–44ms).',
        done:'AI inference rides the AI-grade network — SLA-backed, inspected, private.'},
      {level:'crit',title:'vpc-dmz-03 has no inline inspection',tags:['classified-helion'],resolved:()=>CC.fixes.fwInspection,
        desc:'Both AZ route tables egress directly via NAT/IGW — classified-helion traffic bypasses security inspection entirely.',
        done:'fw-inspect-01 sits inline on every classified-helion egress path.'},
      {level:'warn',title:'Azure West US 2 has no private peering',tags:[],resolved:()=>on('er1').active,
        desc:'vnet-app-02 (tagged rd-helion) is served over AT&T internet only — 18ms with no SLA backing.',
        done:'vnet-app-02 peers privately over ExpressRoute · CH1.'},
    ],
    actions:[
      {label:'Route AI traffic over the AI-grade network',sub:'OpenAI, CoreWeave, Nebius → private path with inspection',
        apply:()=>CC.activateOnramp('nb2'),applied:()=>on('nb2').active,previewKey:{kind:'onramp',id:'nb2'}},
      {label:'Insert firewall on classified-helion egress',sub:'Creates fw-inspect-01 inline on vpc-dmz-03 and nb-gpu-net',
        apply:()=>CC.applyFix('fwInspection'),applied:()=>CC.fixes.fwInspection,previewKey:{kind:'fix',id:'fwInspection'}},
      {label:'Convert vnet-app-02 to private peering',sub:'Moves rd-helion App tier off public internet',
        apply:()=>CC.activateOnramp('er1'),applied:()=>on('er1').active,previewKey:{kind:'onramp',id:'er1'}},
    ]},

  {id:'policy',name:'Policy & segmentation',iconKey:'tag',color:'var(--purple)',
    score:()=>CC.scores().policy,
    summary:()=>{const v=CC.violations().length;return v?`4 tag groups discovered · ${v} active policy violation${v>1?'s':''}`:'4 tag groups · zero active violations';},
    metrics:()=>{const v=CC.violations();return [
      ['Tag groups discovered','4',''],['Resources tagged','9 VPC/VNet',''],
      ['Policy violations',v.length,v.length?'r':'g'],
      ['finance-invoices internet paths',CC.fixes.isolateFinance?0:1,CC.fixes.isolateFinance?'g':'r'],
      ['classified-helion uninspected',CC.fixes.fwInspection?'0 VPC':'2 VPC',CC.fixes.fwInspection?'g':'r'],
      ['rd-helion segmentation',CC.fixes.segmentHelion?'enforced':'untagged policy',CC.fixes.segmentHelion?'g':'a'],
    ];},
    findings:[
      {level:'crit',title:'finance-invoices has a direct internet path',tags:['finance-invoices'],resolved:()=>CC.fixes.isolateFinance,
        desc:'vpc-data-02 (AWS us-east-1) still associates a public subnet to rtb-public — finance-invoices workloads should have no direct internet egress.',
        done:'Public-subnet association removed — vpc-data-02 egress is S3 endpoint + Direct Connect only.'},
      {level:'crit',title:'classified-helion bypasses inspection in 2 VPCs',tags:['classified-helion'],resolved:()=>CC.fixes.fwInspection,
        desc:'vpc-dmz-03 (AWS) and nb-gpu-net (Nebius) both route 0.0.0.0/0 to NAT/IGW with no firewall in path.',
        done:'Both VPCs route 0.0.0.0/0 through fw-inspect-01 — inspection enforced by tag.'},
      {level:'warn',title:'rd-helion spans 3 clouds with no segmentation policy',tags:['rd-helion'],resolved:()=>CC.fixes.segmentHelion,
        desc:'vpc-prod-01 (AWS), vnet-app-02 (Azure), and gpu-cluster-01 (CoreWeave) all carry rd-helion workloads — "should only talk to each other" is tagged but not yet enforced as a routing policy.',
        done:'rd-helion ↔ rd-helion only, enforced across AWS, Azure, and CoreWeave.'},
    ],
    actions:[
      {label:'Create policy: isolate finance-invoices from internet',sub:'Removes public subnet association on vpc-data-02',
        apply:()=>CC.applyFix('isolateFinance'),applied:()=>CC.fixes.isolateFinance,previewKey:{kind:'fix',id:'isolateFinance'}},
      {label:'Create policy: enforce inspection on classified-helion',sub:'Inserts firewall on 2 VPCs, applies to all classified-helion tags',
        apply:()=>CC.applyFix('fwInspection'),applied:()=>CC.fixes.fwInspection,previewKey:{kind:'fix',id:'fwInspection'}},
      {label:'Create policy: segment rd-helion cross-cloud',sub:'Allow rd-helion ↔ rd-helion only, across AWS/Azure/CoreWeave',
        apply:()=>CC.applyFix('segmentHelion'),applied:()=>CC.fixes.segmentHelion,previewKey:{kind:'fix',id:'segmentHelion'}},
    ]},

  {id:'cost',name:'Cost & egress',iconKey:'cost',color:'var(--green)',
    score:()=>CC.scores().cost,
    summary:()=>{const e=CC.egress();return `${fmtK(e.total)}/mo cross-provider egress · ${Math.round(e.pub/e.total*100)}% over public internet paths`;},
    metrics:()=>{const e=CC.egress();return [
      ['Total egress (mo)',fmtK(e.total),e.pub>20000?'r':'a'],
      ['Over public internet',fmtK(e.pub),e.pub?'r':'g'],
      ['Over the AI-grade network',fmtK(e.priv),'g'],
      ['Private-path savings',fmtK(e.savings)+'/mo',e.savings?'g':''],
      ['NetBond utilization',CC.utilization()+'%',CC.utilization()>80?'g':'a'],
      ['Forecast next mo',e.forecast,e.forecast.startsWith('+')?'r':'g'],
    ];},
    findings:[
      {level:'crit',title:'AI inference egress up 22% week over week',tags:['rd-helion','classified-helion'],resolved:()=>on('nb2').active,
        desc:'CoreWeave and Nebius inference egress over public internet ($11.4k of the public total) is the fastest-growing line item and has no private-path discount.',
        done:'GPU egress moved to committed private pricing — the growth line now carries a discount.'},
      {level:'warn',title:'NetBond · PE-IAD-02 running at 60% utilization',tags:[],resolved:()=>CC.fixes.shiftAws,
        desc:'us-east-1 attachment has 40% headroom — additional AWS workloads could move to private peering at no incremental circuit cost.',
        done:'Headroom consumed — PE-IAD-02 at 85% with misc AWS egress on private pricing.'},
      {level:'warn',title:'Equinix DC2 and CH1 circuits fully idle',tags:[],resolved:()=>on('dx1').active&&on('er1').active,
        desc:'$0 egress currently routed through Direct Connect or ExpressRoute capacity that AT&T already provisions — both reach unattached regions.',
        done:'Both circuits carry production egress.'},
    ],
    actions:[
      {label:'Attach CoreWeave + Nebius for private pricing',sub:'Shifts $11.4k/mo of growth-line egress to committed rates',
        apply:()=>CC.activateOnramp('nb2'),applied:()=>on('nb2').active,previewKey:{kind:'onramp',id:'nb2'}},
      {label:'Shift AWS workloads onto idle NetBond capacity',sub:'Uses existing 40% headroom on PE-IAD-02',
        apply:()=>CC.applyFix('shiftAws'),applied:()=>CC.fixes.shiftAws,previewKey:{kind:'fix',id:'shiftAws'}},
      {label:'Ask the assistant for a 90-day cost forecast',sub:'Projects egress trend with and without attach actions'},
    ],
    extra:()=>{
      const b=CC.billing();
      return `<div class="ipamwrap"><div class="colh" style="margin-bottom:6px">Service invoice · this month <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">· consumption billing, derived live</span></div>
        ${b.lines.map(l=>`<div class="mrow"><span class="ml">${l.item} <span style="color:var(--text3)">· ${l.note}</span></span><span class="mv" style="font-family:'DM Mono',monospace">$${l.amount.toLocaleString()}</span></div>`).join('')}
        <div class="mrow" style="border-top:1px solid var(--border2);margin-top:4px;padding-top:8px"><span class="ml"><b>Total consumption</b></span><span class="mv" style="font-family:'DM Mono',monospace;font-weight:600">$${b.total.toLocaleString()}/mo</span></div>
        <div class="mrow"><span class="ml">Monthly commit $${(b.commit/1000)}k · <span class="appmeter" style="display:inline-block;vertical-align:middle;width:90px"><i style="width:${b.commitPct}%;background:${b.commitPct>95?'var(--amber)':'var(--att)'}"></i></span> ${b.commitPct}% drawn${b.burst?` · <b style="color:var(--amber)">$${b.burst.toLocaleString()} burst above commit</b>`:''}</span>
        <span class="mv ${b.uncommitted?'r':'g'}">${b.uncommitted?'$'+b.uncommitted.toLocaleString()+' off-contract':'fully on contract'}</span></div></div>`;
    }},

  {id:'perf',name:'Performance',iconKey:'gauge',color:'var(--teal)',
    score:()=>CC.scores().perf,
    // uks is acme's own seed region - not present once meridian's azure
    // swap lands (scus/eus2). Absent => no such single-path risk, so it
    // reads the same as an already-attached uks (??true).
    summary:()=>{const uks=CC.regions.azure.find(r=>r.id==='uks');return (uks?.attached??true)?'Private paths SLA-backed · no single-path regions':'Avg latency 31ms · 1 region at risk of single-path failure';},
    metrics:()=>{const uks=CC.regions.azure.find(r=>r.id==='uks'),usw2=CC.regions.aws.find(r=>r.id==='usw2'),c=CC.counts();return [
      ['Avg latency (private)','12ms','g'],
      ['Avg latency (public)',CC.publicVpcs()?'34ms':'—',CC.publicVpcs()?'a':'g'],
      ['P95 latency',usw2.attached?'31ms':'62ms',usw2.attached?'g':'a'],
      ['Single-path regions',(uks?.attached??true)?0:1,(uks?.attached??true)?'g':'a'],
      ['SLA-backed paths',`${c.attached} / ${c.vpcs}`,c.attached===c.vpcs?'g':'a'],
    ];},
    findings:[
      {level:'warn',title:'Azure UK South latency variance 31–42ms',tags:[],resolved:()=>CC.regions.azure.find(r=>r.id==='uks')?.attached??true,
        desc:'vnet-emea-01 shows the widest variance of any attached-eligible region — consistent with single public path via EMEA-LON-01.',
        done:'UK South rides ExpressRoute — variance collapsed to the private-path envelope.'},
      {level:'warn',title:'us-west-2 at 62ms is the highest P95',tags:[],resolved:()=>CC.regions.aws.find(r=>r.id==='usw2').attached,
        desc:'vpc-west-01 and vpc-backup-02 both sit behind this path; Direct Connect · Equinix DC2 would cut this materially once attached.',
        done:'us-west-2 attached over Direct Connect — P95 down to the private envelope.'},
      {level:'ok',title:'us-east-1 private path holding steady at 12ms',tags:['rd-helion'],resolved:()=>false,
        desc:'The one attached region shows the lowest and most stable latency of the footprint — the benchmark for what attach delivers elsewhere.'},
    ],
    actions:[
      {label:'Attach Azure UK South to ExpressRoute · CH1',sub:'Adds second path, removes single-path risk',
        apply:()=>CC.activateOnramp('er1'),applied:()=>on('er1').active,previewKey:{kind:'onramp',id:'er1'}},
      {label:'Simulate latency after attaching us-west-2',sub:'Projects P95 drop using us-east-1 as baseline'},
    ]},

  {id:'address',name:'IP addressing',iconKey:'net',color:'var(--att)',
    score:()=>CC.scores().address,
    summary:()=>{const a=CC.addressPlan();return a.conflicts?`${a.rows.length} ranges across 6 clouds · ${a.conflicts} CIDR collision blocks peering`:`${a.rows.length} ranges across 6 clouds · plan is clean`;},
    metrics:()=>{const a=CC.addressPlan();return [
      ['CIDR ranges',a.rows.length,''],
      ['Collisions',a.conflicts,a.conflicts?'r':'g'],
      ['Next free range',a.nextFree,''],
      ['Largest block','10.0.0.0/8 family',''],
      ['Peering-blocked pairs',a.conflicts,a.conflicts?'r':'g'],
    ];},
    findings:[
      {level:'crit',title:'10.4.0.0/16 claimed twice across clouds',tags:['rd-helion'],resolved:()=>CC.fixes.renumbered,
        get desc(){return `vnet-app-02 (Azure West US 2) and vpc-svc-02 (GCP us-central1) both carry 10.4.0.0/16 — routing between these environments is ambiguous and they can never peer over the fabric. ${CC.nextFreeCidr()} is free in this estate.`;},
        done:'vpc-svc-02 renumbered to a free range — every CIDR in the estate is now unique and peerable.'},
      {level:'ok',title:'No other overlaps in 15 ranges',tags:[],resolved:()=>false,
        desc:'The rest of the estate allocates cleanly from 10.0.0.0/8 with consistent /16 blocks per VPC — discovery found no second collision.'},
    ],
    actions:[
      {label:'Renumber vpc-svc-02 to the next free range',sub:'Rewrites the VPC CIDR · clears the peering block',
        apply:()=>CC.applyFix('renumbered'),applied:()=>CC.fixes.renumbered,previewKey:{kind:'fix',id:'renumbered'}},
      {label:'Ask about the address plan',sub:'Full CIDR inventory with conflict detail'},
    ],
    extra:()=>{
      const a=CC.addressPlan();
      const colorOf={};CC.clouds.forEach(cl=>colorOf[cl.name]=cl.color);
      const byOct={};
      a.rows.forEach(r=>{const o=+r.cidr.split('.')[1];(byOct[o]=byOct[o]||[]).push(r);});
      const MAXO=40;
      let cells='';
      for(let o=0;o<=MAXO;o++){
        const owners=byOct[o]||[];
        if(!owners.length){cells+=`<span class="ipcell free" title="10.${o}.0.0/16 · free"></span>`;continue;}
        const conflict=owners.length>1;
        const t=owners.map(x=>`${x.name} (${x.cloud})`).join(' + ');
        cells+=`<span class="ipcell${conflict?' conflict':''}" data-oct="${o}" title="10.${o}.0.0/16 · ${t}${conflict?' — COLLISION, click to renumber':''}" style="${conflict?'':'background:'+colorOf[owners[0].cloud]+'cc'}"></span>`;
      }
      return `<div class="ipamwrap"><div class="colh" style="margin-bottom:6px">Address space · 10.0.0.0/8 <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">· one cell per /16 · hover for owner${a.conflicts?' · the pulsing cell is the collision':''}</span></div>
        <div class="ipamgrid">${cells}</div>
        <div class="obslegend" style="margin-top:7px">${CC.clouds.map(cl=>`<span class="li"><span class="sw" style="background:${cl.color};height:8px;width:8px;border-radius:2px"></span>${cl.name}</span>`).join('')}<span class="li"><span class="sw" style="background:var(--red);height:8px;width:8px;border-radius:2px"></span>collision</span><span class="li"><span class="sw" style="background:rgba(255,255,255,.07);height:8px;width:8px;border-radius:2px"></span>free</span></div></div>`;
    }},

  {id:'ai',name:'AI governance',iconKey:'shield',color:'var(--purple)',
    score:()=>CC.scores().ai,
    summary:()=>{const tp=CC.tokenPolicyList();const enf=tp.filter(p=>p.enforced).length;
      return `${enf}/${tp.length} token policies enforced · ${CC.agentList().filter(a=>a.enabled).length} active agents · ${CC.modelCatalog().filter(m=>m.ready).length}/${CC.modelCatalog().length} models on governed paths`;},
    metrics:()=>{const tp=CC.tokenPolicyList();return [
      ['Token policies enforced',`${tp.filter(p=>p.enforced).length} / ${tp.length}`,tp.every(p=>p.enforced)?'g':'a'],
      ['Guardrail on classified',CC.tokenPolicy('classified-helion').guardrail?'inline':'off',CC.tokenPolicy('classified-helion').guardrail?'g':'r'],
      ['GPU endpoints private',CC.regions.cw.find(r=>r.id==='cwe').attached&&CC.regions.neb.find(r=>r.id==='nbe').attached?'yes':'no',CC.regions.cw.find(r=>r.id==='cwe').attached?'g':'r'],
      ['Agents registered',CC.agentList().length,'g'],
      ['External egress governed',on('nb2').active?'yes':'no',on('nb2').active?'g':'a'],
    ];},
    findings:[
      {level:'crit',title:'Token policies are drafts, not law',tags:['rd-helion','classified-helion'],
        resolved:()=>CC.tokenPolicyList().every(p=>p.enforced),
        desc:'All three token policies exist but none are enforced — model scope and budgets are advisory until they are. The tokens layer is governed on paper only.',
        done:'Every token policy is enforced — scope and budgets are law, audited like any rule.'},
      {level:'warn',title:'External model calls without a guardrail',tags:['shared-services'],
        resolved:()=>CC.tokenPolicy('shared-services').guardrail||CC.tokenPolicy('shared-services').scope!=='external-allowed',
        desc:'shared-services apps and the ops-copilot agent call GPT-class externally with no inline guardrail — completions leave ungoverned.',
        done:'Guarded — external completions pass the inline guardrail (or external access was withdrawn).'},
      {level:'warn',title:'AI traffic rides public internet',tags:['rd-helion','classified-helion'],
        resolved:()=>on('nb2').active,
        desc:'Inference to CoreWeave and Nebius is on public paths — the tokens layer has no private substrate yet.',
        done:'GPU endpoints attached — inference rides the private fabric.'},
    ],
    actions:[
      {label:'Enforce all token policies',sub:'Scope + budgets become law, audited',
        apply:()=>CC.tokenPolicyList().forEach(p=>CC.setTokenPolicy(p.tag,{enforced:true})),
        applied:()=>CC.tokenPolicyList().every(p=>p.enforced)},
      {label:'Guardrail shared-services completions',sub:'ai-guardrail inline on external model calls',
        apply:()=>CC.setTokenPolicy('shared-services',{guardrail:true}),
        applied:()=>CC.tokenPolicy('shared-services').guardrail},
      {label:'Attach the GPU substrate',sub:'NetBond Adv · PE-DAL-01 — same action as everywhere',
        apply:()=>CC.activateOnramp('nb2'),applied:()=>on('nb2').active,previewKey:{kind:'onramp',id:'nb2'}},
    ]},
];
})();
