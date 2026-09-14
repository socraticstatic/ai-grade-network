// @ts-nocheck
/* Managed VPC/VNET lifecycle — an AT&T-managed gateway VPC with a vSRX HA
   pair, deployed into an AWS/Azure region and plumbed toward the cloud and
   toward AT&T in five watchable stages.

   The orderCircuit idiom, generalized: a setTimeout chain PACES the demo,
   but advanceManagedVpc() is the only function that DECIDES state — tests
   drive stages synchronously and never wait on a timer. Going live
   activates the region's serving on-ramp via the existing activateOnramp,
   so the tree, map and fabric all move from the one engine effect they
   already render. */
(function(){
const CC=window.CC;

const STAGE_KEYS=['create','vsrx','cloud-plumbing','att-plumbing','live'];
const BEAT_MS=4000;
let mvSeq=0;

const CIDR_SHAPE=/^10\.255\.\d{1,3}\.0\/24$/;

function stageDefs(cloudId){
  const az=cloudId==='azure';
  return [
    {key:'create',label:az?'Create VNet':'Create VPC',detail:az?'VNet + 2 subnets across zones':'VPC + 2 subnets across 2 AZs'},
    {key:'vsrx',label:'Launch vSRX HA pair',detail:'vSRX active/backup across zones'},
    {key:'cloud-plumbing',label:'Plumb toward cloud',detail:az?'VNet peering + UDRs':'TGW attachment + route propagation'},
    {key:'att-plumbing',label:'Plumb toward AT&T',detail:az?'Private peering + BGP to AT&T':'Private VIF + BGP to AT&T'},
    {key:'live',label:'Validated · live',detail:'End-to-end path verified'},
  ];
}

/* Same active-first rule as the Discover chain's servingRamp — duplicated
   here because the engine cannot import from the feature layer; the rule is
   the contract. */
function servingRampFor(cloudId,regionId){
  const ramps=(CC.onramps||[]).filter(o=>o.targets.some(([c,r])=>c===cloudId&&r===regionId));
  return ramps.find(r=>r.active)||ramps[0]||null;
}

CC.managedVpcs=[];
CC.managedVpcFor=function(cloudId,regionId){
  return CC.managedVpcs.find(m=>m.cloudId===cloudId&&m.regionId===regionId)||null;
};
CC.suggestManagedCidr=function(){return `10.255.${mvSeq+1}.0/24`;};

CC.deployManagedVpc=function({cloudId,regionId,tier,cidr}){
  if(cloudId!=='aws'&&cloudId!=='azure')return null;
  if(CC.managedVpcFor(cloudId,regionId))return null;
  if(!(CC.regions[cloudId]||[]).some(r=>r.id===regionId))return null;
  const ramp=servingRampFor(cloudId,regionId);
  const seq=++mvSeq;
  const az=cloudId==='azure';
  const t=tier==='500M'||tier==='5G'?tier:'1G';
  const m={
    id:'mv-'+seq,
    cloudId,regionId,
    name:'att-managed-'+regionId,
    cidr:cidr&&CIDR_SHAPE.test(cidr)?cidr:`10.255.${seq}.0/24`,
    tier:t,
    stage:'create',
    stages:stageDefs(cloudId).map(s=>({...s,done:false})),
    vsrx:{
      nodes:[
        {id:'vsrx-0',role:'active',state:'launching'},
        {id:'vsrx-1',role:'backup',state:'launching'},
      ],
      interfaces:[
        {name:'ge-0/0/0',toward:az?'VNet peering':'TGW attachment',state:'down'},
        {name:'ge-0/0/1',toward:'AT&T circuit',state:'down'},
        {name:'fxp0',toward:'management',state:'down'},
      ],
      bgp:[
        {peer:'cloud',label:az?'vSRX ↔ VNet (over peering)':'vSRX ↔ TGW',state:'idle'},
        {peer:'att',label:az?'vSRX ↔ AT&T (private peering)':'vSRX ↔ AT&T (private VIF)',state:'idle'},
      ],
      throughput:t==='500M'?'500 Mbps':t==='5G'?'5 Gbps':'1 Gbps',
    },
    onrampId:ramp?ramp.id:null,
  };
  CC.managedVpcs.push(m);
  CC._.emit({type:'policy',label:'Managed '+(az?'VNET':'VPC')+' deploying · '+m.name});
  const beat=()=>{if(m.stage!=='live'){CC.advanceManagedVpc(m.id);setTimeout(beat,BEAT_MS);}};
  setTimeout(beat,BEAT_MS);
  return m;
};

CC.advanceManagedVpc=function(id){
  const m=CC.managedVpcs.find(x=>x.id===id);
  if(!m||m.stage==='live')return m||null;
  const next=STAGE_KEYS[STAGE_KEYS.indexOf(m.stage)+1];
  const mark=k=>{const s=m.stages.find(x=>x.key===k);if(s)s.done=true;};
  const ifc=(n,st)=>{const i=m.vsrx.interfaces.find(x=>x.name===n);if(i)i.state=st;};
  const bgp=(p,st)=>{const b=m.vsrx.bgp.find(x=>x.peer===p);if(b)b.state=st;};
  mark(m.stage);
  if(next==='cloud-plumbing'){m.vsrx.nodes.forEach(n=>{n.state='up';});ifc('ge-0/0/0','up');ifc('fxp0','up');}
  if(next==='att-plumbing'){bgp('cloud','established');}
  if(next==='live'){
    ifc('ge-0/0/1','up');bgp('att','established');mark('live');
    const o=(CC.onramps||[]).find(x=>x.id===m.onrampId);
    if(o&&!o.active)CC.activateOnramp(m.onrampId);
  }
  m.stage=next;
  const noun='Managed '+(m.cloudId==='azure'?'VNET':'VPC');
  CC._.emit({type:'policy',label:(next==='live'?noun+' live · ':noun+' · '+next+' · ')+m.name});
  return m;
};
})();
