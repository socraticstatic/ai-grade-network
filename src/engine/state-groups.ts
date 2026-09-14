// @ts-nocheck
/* Cloud Control - groups.

   A group is one named set of estate objects, defined two ways at once:
   literal `members` (ids you picked) unioned with `predicates` (queries that
   re-evaluate as the estate changes). Policies reference the group name; the
   resolver turns it back into concrete objects at call time.

   Resolution is never stored. A group's membership is always derived, so a
   workload tagged tomorrow is in the group tomorrow. */
(function(){
const CC=window.CC;

const groups={
  'west-branches':{id:'west-branches',label:'West branches',kind:'site',
    members:['br-sjc','br-sfo','br-bkl'],predicates:[],
    desc:'Bay Area premises'},
  'west-workloads':{id:'west-workloads',label:'West workloads',kind:'workload',
    members:[],predicates:[{source:'cloudTag',key:'Region',values:['west']}],
    desc:'Spans three different clouds - AWS, Azure and GCP'},
};

function allVpcs(){
  return Object.values(CC.vpcs||{}).reduce(function(a,list){return a.concat(list);},[]);
}

/* One predicate vocabulary, two estates. `tags` is the AT&T governance
   taxonomy; `cloudTags` is the hyperscaler key/value map. Never conflate
   them - a governanceTag predicate reads tags, a cloudTag predicate reads
   cloudTags, and branches (which carry no tags) match only the latter. */
function matchesPredicate(v,p){
  if(p.source==='governanceTag')return (v.tags||[]).some(function(t){return p.values.indexOf(t)>=0;});
  if(p.source==='cloudTag'){
    const val=(v.cloudTags||{})[p.key];
    return val!=null&&p.values.indexOf(val)>=0;
  }
  return false;
}

function copyGroup(g){
  return {id:g.id,label:g.label,kind:g.kind,desc:g.desc,custom:g.custom,
    members:(g.members||[]).slice(),
    predicates:(g.predicates||[]).map(function(p){return {...p,values:(p.values||[]).slice()};})};
}

/* Derived at call time, never stored. Everything below reads the live
   estate on every call, so a workload tagged tomorrow is in the group
   tomorrow. Do not memoize any of it.

   `kind` is load-bearing here, not decorative: 'workload' groups match
   VPCs only, 'site' groups match branches only, 'mixed' matches both (the
   old, unconditional behaviour). It constrains literal `members` too, not
   just `predicates` - a kind:'workload' group cannot contain a branch no
   matter how the id got into `members` (typed in, replayed off a share
   link, or written later by updateGroup). Enforcing the constraint here,
   at resolution, rather than only when the group is created, means no
   mutator can reopen the hole by patching `members` after the fact.

   Resolution takes a SPEC, not an id, so a group being authored - which has
   no id in `groups` yet - resolves through this exact code path too. The
   preview a person reads while typing and the membership they get after
   saving are therefore the same computation, and cannot drift apart the way
   a re-implemented preview would. resolveGroup(id) is a thin lookup on top
   of it. */
function resolveSpec(g){
  if(!g)return {vpcIds:[],branchIds:[],cidrs:[],count:0};

  const kind=g.kind||'mixed';
  const matchVpcs=kind!=='site';
  const matchBranches=kind!=='workload';

  const vpcs=allVpcs();
  const branches=CC.branches||[];
  const vpcById={},branchById={};
  vpcs.forEach(function(v){vpcById[v.id]=v;});
  branches.forEach(function(b){branchById[b.id]=b;});

  const vpcSet={},branchSet={};

  // Literal members are resolved against the real estate AND against
  // `kind`: an id naming neither a branch nor a VPC is a typo and must not
  // count, and an id naming the wrong estate for this group's kind is
  // dropped the same way.
  (g.members||[]).forEach(function(m){
    if(matchBranches&&branchById[m])branchSet[m]=1;
    else if(matchVpcs&&vpcById[m])vpcSet[m]=1;
  });

  (g.predicates||[]).forEach(function(p){
    if(matchVpcs)vpcs.forEach(function(v){ if(matchesPredicate(v,p))vpcSet[v.id]=1; });
    if(matchBranches)branches.forEach(function(b){ if(matchesPredicate(b,p))branchSet[b.id]=1; });
  });

  const branchIds=Object.keys(branchSet);
  const vpcIds=Object.keys(vpcSet);

  const seen={},cidrs=[];
  function addCidr(c){ if(c&&!seen[c]){seen[c]=1;cidrs.push(c);} }
  branchIds.forEach(function(bid){ (branchById[bid].cidrs||[]).forEach(addCidr); });
  vpcIds.forEach(function(vid){ addCidr(vpcById[vid].cidr); });

  return {vpcIds:vpcIds,branchIds:branchIds,cidrs:cidrs,count:vpcIds.length+branchIds.length};
}

function resolveGroup(id){
  return resolveSpec(groups[id]);
}

function groupList(){return Object.keys(groups).map(function(k){return copyGroup(groups[k]);});}

function groupsFor(objectId){
  return Object.keys(groups).filter(function(gid){
    const r=resolveGroup(gid);
    return r.vpcIds.indexOf(objectId)>=0||r.branchIds.indexOf(objectId)>=0;
  });
}

// A caller that omits `kind` used to get 'mixed' unconditionally - the
// permissive, unconstrained behaviour - which meant every group created
// through the UI or a share link without an explicit kind got predicate
// matching against both estates, and Task C2's defect (a workload group
// quietly absorbing branches) could return by the back door. Infer from
// literal `members` when they disclose one: if every member is a real VPC,
// 'workload'; if every member is a real branch, 'site'; a mix (or members
// naming nothing real) is 'mixed'. Predicates are NOT used to infer kind -
// cloudTag is one vocabulary across both estates by design, so a
// predicate-only spec can't honestly be guessed at; it falls back to
// 'mixed', same as a spec with no members at all. A caller that wants a
// predicate-only group constrained to one estate has to say so explicitly.
function inferKind(members){
  if(!members||!members.length)return 'mixed';
  const vpcById={},branchById={};
  allVpcs().forEach(function(v){vpcById[v.id]=1;});
  (CC.branches||[]).forEach(function(b){branchById[b.id]=1;});
  let hasVpc=false,hasBranch=false;
  members.forEach(function(m){
    if(vpcById[m])hasVpc=true;
    if(branchById[m])hasBranch=true;
  });
  if(hasVpc&&!hasBranch)return 'workload';
  if(hasBranch&&!hasVpc)return 'site';
  return 'mixed';
}

/* Every mutator snapshots BEFORE it mutates - same contract as
   activateOnramp and applyFix - so undo restores the prior group store
   rather than the one the caller just wrote. */
function addGroup(spec){
  if(!spec||!spec.id||groups[spec.id])return null;
  CC._.pushUndo&&CC._.pushUndo('Create group '+spec.id);
  groups[spec.id]={
    id:spec.id,label:spec.label||spec.id,kind:spec.kind||inferKind(spec.members),
    members:(spec.members||[]).slice(),predicates:(spec.predicates||[]).slice(),
    desc:spec.desc||'',custom:true,
  };
  CC._.emit({type:'policy',label:'Group created · '+spec.id});
  return copyGroup(groups[spec.id]);
}

function updateGroup(id,patch){
  const g=groups[id];
  if(!g||!patch)return null;
  CC._.pushUndo&&CC._.pushUndo('Update group '+id);
  if(patch.members)g.members=patch.members.slice();
  if(patch.predicates)g.predicates=patch.predicates.slice();
  if(patch.label)g.label=patch.label;
  // A seeded group that has been edited is no longer the seed definition -
  // mark it custom so serialize() (which only carries custom:true groups)
  // stops dropping the edit on a shared link. Without this, editing
  // west-workloads and sharing the link silently replays the pristine seed
  // on the receiving end.
  g.custom=true;
  CC._.emit({type:'policy',label:'Group updated · '+id});
  return copyGroup(g);
}

function removeGroup(id){
  if(!groups[id])return false;
  CC._.pushUndo&&CC._.pushUndo('Remove group '+id);
  delete groups[id];
  CC._.emit({type:'policy',label:'Group removed · '+id});
  return true;
}

CC._.groups=groups;
Object.assign(CC,{groupList:groupList,addGroup:addGroup,updateGroup:updateGroup,
  removeGroup:removeGroup,resolveGroup:resolveGroup,resolveGroupSpec:resolveSpec,
  groupsFor:groupsFor,inferGroupKind:inferKind});
})();
