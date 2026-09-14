import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Boxes, ShieldAlert, ShieldCheck, Eye, Wrench } from 'lucide-react';
import { OverflowMenu, type OverflowMenuItem } from '../../components/common/OverflowMenu';
import { RuleBuilder } from './RuleBuilder';
import { NextMoveBand } from './NextMoveBand';
import { ProposalBand } from './ProposalBand';
import { EnforcedDeltaPanel } from './EnforcedDeltaPanel';
import { enforceAndMeasure, type EnforcementDelta } from './enforcementDelta';
import { AttIcon } from '../../components/icons/AttIcon';
import { CC } from '../../engine';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';

interface RuleSrc {
  tag?: string;
  cloud?: string;
  group?: string;
}

/** A destination is either a legacy DSTS string enum or a structured group
 *  reference. Both shapes reach this table, so both must be rendered. */
type RuleDst = string | { group?: string };

interface Rule {
  id: string;
  pri: number;
  name: string;
  system?: boolean;
  src: RuleSrc;
  dst: RuleDst;
  ports: string;
  action: string;
  chain: string[];
  fix?: string;
}

interface Violation {
  tag?: string;
  vpc?: string | null;
  msg: string;
  policy?: string;
}

interface FixPreview {
  posture: number;
  pub: number;
  violations: number;
  egressPub: number;
  savings: number;
  scores: Record<string, number>;
}

/** Group ids are stored on rules; people recognise group LABELS. Resolved
 *  live from the engine on every render, so a renamed group is renamed
 *  here. An id with no live group is shown as-is rather than swallowed —
 *  a dangling reference should be visible, not silently blank. */
function groupLabel(id: string): string {
  const g = (CC.groupList() as { id: string; label: string }[]).find(x => x.id === id);
  return g ? g.label : id;
}

/* Destinations that are relative to the rule's own source group. Spelled
   out, because "not-intra-group" is engine vocabulary, not English. */
const RELATIVE_DST: Record<string, string> = {
  'not-intra-tag': 'outside tag',
  'intra-group': 'inside the same group',
  'not-intra-group': 'outside the group',
};

/** A named group is the whole point of the match — it must never collapse
 *  to "any", which is what reading only src.tag used to do. */
function matchLabel(rule: Rule): string {
  const cloudPart = rule.src.cloud && rule.src.cloud !== 'any' ? ` @ ${rule.src.cloud}` : '';
  const tagPart = rule.src.tag && rule.src.tag !== 'any' ? rule.src.tag : null;
  if (rule.src.group) {
    // A group rule may still narrow by tag; say both rather than drop one.
    return `${groupLabel(rule.src.group)}${tagPart ? ` · ${tagPart}` : ''}${cloudPart}`;
  }
  return `${tagPart ?? 'any'}${cloudPart}`;
}

/** Never interpolate rule.dst directly: a group destination is an object,
 *  and `${obj}` is the "[object Object]" this column used to print. */
function dstLabel(dst: RuleDst): string {
  if (dst && typeof dst === 'object') return dst.group ? groupLabel(dst.group) : 'any destination';
  return RELATIVE_DST[dst] || dst;
}

function requirementLabel(rule: Rule): string {
  const dst = dstLabel(rule.dst);
  const via = rule.chain.length ? ` via ${rule.chain.join(' → ')}` : '';
  return `${rule.action} → ${dst}${rule.ports !== 'any' ? ` :${rule.ports}` : ''}${via}`;
}

export function RulesPanel() {
  const rules = useCloudControl(cc => cc.ruleList()) as Rule[];
  const violations = useCloudControl(cc => cc.violations()) as Violation[];
  const actions = useCloudControlActions();

  const [previews, setPreviews] = useState<Record<string, FixPreview | null>>({});
  const [builderOpen, setBuilderOpen] = useState(false);
  // "Tighten it" (ProposalBand) lands here as /naas/govern?rule=<ruleId>.
  // Capture which rule to seed the builder from, then strip the param the
  // same way StackPanel strips ?draft= — so a refresh of this URL cannot
  // reopen the builder pre-filled from a link already acted on.
  const [seedRuleId, setSeedRuleId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const ruleId = searchParams.get('rule');
    if (!ruleId) return;
    // An id the engine does not carry (stale link, typo, tampered query
    // string) must not seed the builder at all - it would otherwise open a
    // blank dialog whose provenance line names the bogus id as if it were a
    // real rule Andi proposed.
    if (CC.ruleList().some((r: { id: string }) => r.id === ruleId)) {
      setSeedRuleId(ruleId);
      setBuilderOpen(true);
    }
    searchParams.delete('rule');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* The last act and what it moved. ONE piece of state, and both enforcement
     paths write it — the row overflow menu below and the recommendation
     band's own button, which is handed this same enforcer. Neither path is
     allowed to be the lesser experience. */
  const [lastDelta, setLastDelta] = useState<EnforcementDelta | null>(null);

  /* Reads the three Govern figures, enforces, reads them again. `null` back
     means nothing was enforced (already enforced, or unknown id) — in which
     case there is no consequence to report and the previous one stands. */
  const enforceMeasured = (ruleId: string) => {
    const delta = enforceAndMeasure(actions, ruleId);
    if (delta) setLastDelta(delta);
  };

  const handleEnforce = (rule: Rule) => {
    enforceMeasured(rule.id);
  };

  const handlePreview = (rule: Rule) => {
    if (!rule.fix) return;
    const result = actions.previewFix(rule.fix) as FixPreview | null;
    setPreviews(prev => ({ ...prev, [rule.id]: result }));
  };

  const handleApply = (rule: Rule) => {
    if (!rule.fix) return;
    actions.applyFix(rule.fix);
    setPreviews(prev => ({ ...prev, [rule.id]: null }));
    /* Apply moves violations and posture WITHOUT passing through
       enforceAndMeasure, so a panel still reporting the last enforce's
       before/after now disagrees with the header and the violation list
       around it. A stale claim is worse than no claim — clear it. (Apply is
       deliberately NOT routed through the measured shape: it is remediation,
       not enforcement, and the panel's header says "Enforced".) */
    setLastDelta(null);
  };

  // Enforce leads — it is the primary act on this screen. Preview and Apply
  // only exist for rules bound to a known remediation, so they are omitted
  // rather than shown disabled on the rules that have no fix.
  const menuItems = (rule: Rule): OverflowMenuItem[] => {
    const items: OverflowMenuItem[] = [
      {
        id: 'enforce',
        label: 'Enforce',
        icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
        onClick: () => handleEnforce(rule),
      },
    ];
    if (rule.fix) {
      items.push(
        {
          id: 'preview',
          label: 'Preview impact',
          icon: <Eye className="h-4 w-4" aria-hidden="true" />,
          onClick: () => handlePreview(rule),
        },
        {
          id: 'apply',
          label: 'Apply',
          icon: <Wrench className="h-4 w-4" aria-hidden="true" />,
          onClick: () => handleApply(rule),
        },
      );
    }
    return items;
  };

  return (
    <div className="space-y-4" data-tour="govern-rules">
      <ProposalBand />

      <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
          <AttIcon name="check-shield" className="h-5 w-5 text-fw-body" />
          <span className="font-medium text-fw-heading">Rules</span>
          <span className="text-figma-xs text-fw-bodyLight">
            {rules.filter(r => actions.ruleEnforced(r)).length} / {rules.length} enforced
          </span>
          <span className="text-fw-bodyLight">·</span>
          <span className="text-figma-xs text-fw-bodyLight">
            {violations.length} violation{violations.length === 1 ? '' : 's'}
          </span>
          {/* Create action belongs in the card header, not trailing the table. */}
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="ml-auto inline-flex items-center h-8 px-3.5 rounded-full text-figma-xs font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
          >
            New rule
          </button>
        </div>

        {/* Eight rules of equal visual weight answer "what is here" but not
            "where do I start". The band answers that once, in the currency of
            the violation list below, before anyone commits to anything. */}
        {/* Consequence first, then the re-pointed recommendation — that is
            the order the two things happen in. Rendered UNCONDITIONALLY and
            unkeyed: the panel is a live region, and a live region must exist
            (empty) before its first announcement — one inserted or remounted
            already populated is commonly not announced at all. The panel
            keys its own inner content per rule, so the reveal still replays
            on a second enforce without the region node ever remounting. */}
        <EnforcedDeltaPanel delta={lastDelta} />

        <NextMoveBand onEnforce={enforceMeasured} />

        <table className="w-full text-figma-sm">
          <thead>
            <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
              <th className="px-5 py-2 font-medium">Rule</th>
              <th className="px-5 py-2 font-medium">Match</th>
              <th className="px-5 py-2 font-medium">Requirement</th>
              <th className="px-5 py-2 font-medium text-center">Status</th>
              {/* Row actions collapse into an overflow menu so Rule / Match /
                  Requirement get the width back — they were wrapping badly
                  while ~264px went to buttons that are secondary on most rows. */}
              <th className="w-12 px-2 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fw-secondary">
            {rules.map(rule => {
              const enforced = actions.ruleEnforced(rule);
              const preview = previews[rule.id];
              return (
                <tr key={rule.id} className="align-top">
                  <td className="px-5 py-3">
                    <div className="font-medium text-fw-heading">{rule.name}</div>
                    {!rule.system && (
                      <div className="text-figma-xs text-fw-bodyLight">Custom rule</div>
                    )}
                  </td>
                  {/* Tag names are single tokens — never break them mid-word
                      ("classified-" / "helion" reads as two tags). */}
                  <td className="px-5 py-3 text-fw-body whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {/* A group and a tag are different kinds of match —
                          the icon says which without extra words. */}
                      {rule.src.group ? (
                        <Boxes className="w-3.5 h-3.5 shrink-0 text-fw-bodyLight" aria-hidden="true" />
                      ) : (
                        <Tag className="w-3.5 h-3.5 shrink-0 text-fw-bodyLight" aria-hidden="true" />
                      )}
                      {matchLabel(rule)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-fw-body">{requirementLabel(rule)}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium ${
                        enforced
                          ? 'bg-fw-successLight text-fw-success'
                          : 'bg-fw-neutral text-fw-bodyLight'
                      }`}
                    >
                      {enforced ? 'Enforced' : 'Unenforced'}
                    </span>
                    {preview && (
                      <div className="mt-1.5 text-figma-xs text-fw-bodyLight">
                        Preview: posture {preview.posture} · {preview.violations} violation
                        {preview.violations === 1 ? '' : 's'}
                      </div>
                    )}
                  </td>
                  <td className="w-12 px-2 py-3">
                    {!enforced && (
                      <div className="flex justify-end">
                        <OverflowMenu items={menuItems(rule)} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RuleBuilder
        open={builderOpen}
        onOpenChange={v => {
          setBuilderOpen(v);
          // Closing (Cancel, Escape, or a successful stage) clears the seed
          // too — reopening via "New rule" afterward must start blank, not
          // silently carry the last Tighten link's fields forward.
          if (!v) setSeedRuleId(null);
        }}
        seed={seedRuleId ? { ruleId: seedRuleId } : undefined}
      />

      {violations.length > 0 && (
        <div className="rounded-2xl border border-fw-secondary bg-fw-wash px-5 py-3">
          {/* Open violations are true policy failures — the one place red (the
              reserved violation tier, #dc2626) is warranted. A leading alert
              icon makes each read as a problem, not ordinary slate copy. */}
          <div className="flex items-center gap-2 font-medium text-fw-heading text-figma-sm mb-1.5">
            <ShieldAlert size={15} className="shrink-0 text-fw-error" aria-hidden="true" />
            {violations.length} open violation{violations.length === 1 ? '' : 's'}
          </div>
          <ul className="space-y-1">
            {violations.map((v, i) => (
              <li key={i} className="flex items-start gap-1.5 text-figma-xs text-fw-body">
                <ShieldAlert size={13} className="mt-0.5 shrink-0 text-fw-error" aria-hidden="true" />
                <span>
                  {v.tag ? <span className="font-medium text-fw-heading">{v.tag}</span> : null}
                  {v.tag ? ' — ' : ''}
                  {v.msg}
                  {v.vpc ? ` (${v.vpc})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
