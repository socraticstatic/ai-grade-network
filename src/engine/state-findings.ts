// @ts-nocheck
/* Detective layer - GuardDuty / Access Analyzer / Security Hub-style
   behavioral findings derived from the live flow table and fixes. Each
   finding GRADUATES into a preventive rule via promote(): the article's
   detect-then-prevent loop, made operable. Findings carry no state of
   their own - active() is recomputed from the model, so promoting one
   (which enforces its rule and drains its flow) clears it automatically. */
(function(){
const CC=window.CC;
const DEFS=[
  {id:'gd-dns',severity:'crit',rule:'pol-dns',
    source:'GuardDuty · Trojan:Classified/DNSDataExfiltration',
    title:'DNS data exfiltration from classified-helion',
    detail:'Anomalous UDP/53 volume with data encoded in query names — invisible to TLS inspection.',
    active:()=>!CC.fixes.dnsFirewall&&CC.flows().some(f=>f.dst==='dns-exfil')},
  {id:'gd-s3',severity:'crit',rule:'pol-perimeter',
    source:'GuardDuty · Exfiltration:S3/ExternalBucket',
    title:'Copy to object storage outside the organization',
    detail:'finance-invoices wrote to a bucket whose aws:ResourceOrgID is not ours — clean network path, wrong destination.',
    active:()=>!CC.fixes.dataPerimeter&&CC.flows().some(f=>f.dst==='storage-external')},
  {id:'gd-fin',severity:'high',rule:'pol-fin',
    source:'IAM Access Analyzer · external egress path',
    title:'finance-invoices has a direct internet path',
    detail:'A public-subnet association exposes a direct egress route from a finance workload.',
    active:()=>!CC.fixes.isolateFinance},
  {id:'gd-insp',severity:'high',rule:'pol-insp',
    source:'Security Hub · uninspected egress exposure',
    title:'classified-helion egress bypasses inspection',
    detail:'Two VPCs egress with no inline firewall in the path.',
    active:()=>!CC.fixes.fwInspection},
];
CC.threatFindings=function(){
  return DEFS.map(d=>({id:d.id,severity:d.severity,source:d.source,title:d.title,
    detail:d.detail,rule:d.rule,active:d.active(),
    promote:()=>CC.enforceRule(d.rule)}));
};
})();
