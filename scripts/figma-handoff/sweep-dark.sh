#!/bin/bash
# Dark-mode sweep: capture every board route with --dark.
# Usage: sweep-dark.sh [--freeze] [prefix]   (default prefix: zz-dark)
set -e
export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH
FREEZE=""
PREFIX="zz-dark"
for a in "$@"; do
  if [ "$a" = "--freeze" ]; then FREEZE="--freeze"; else PREFIX="$a"; fi
done
M="node scripts/figma-handoff/measure.mjs --dark $FREEZE"
A="scripts/figma-handoff/actions"

$M --route /discover           --slug $PREFIX-01-discover        --actions $A/01-discover.mjs
$M --route /discover/advisor   --slug $PREFIX-02-advisor-first   --no-advisor-done --actions $A/02-advisor-settle.mjs
$M --route /naas/home          --slug $PREFIX-03-naas-home
$M --route /naas/connect       --slug $PREFIX-04-connect-fabric
$M --route /naas/connect       --slug $PREFIX-05-connect-drill   --actions $A/05-fabric-drill.mjs
$M --route /naas/connect       --slug $PREFIX-06-estate-map      --actions $A/06-estate-map.mjs
$M --route /naas/connect       --slug $PREFIX-07-path-choice     --actions $A/07-path-choice.mjs
$M --route "/naas/connect?provision=usw2" --slug $PREFIX-08-wizard --actions $A/08-wizard.mjs
$M --route /naas/govern        --slug $PREFIX-09-govern
$M --route /naas/observe       --slug $PREFIX-10-observe-sankey
$M --route /naas/cost          --slug $PREFIX-11-cost
$M --route /naas/__gallery     --slug $PREFIX-13-components
$M --route /discover/advisor   --slug $PREFIX-14-advisor-offers  --no-advisor-done --actions $A/14-advisor-offers.mjs
$M --route /ai/home            --slug $PREFIX-15-ai-home
$M --route /ai/providers       --slug $PREFIX-16-ai-providers
$M --route /ai/teams           --slug $PREFIX-17-ai-teams
$M --route /ai/keys            --slug $PREFIX-18-ai-keys
$M --route /ai/govern          --slug $PREFIX-19-ai-govern
$M --route /ai/observe         --slug $PREFIX-20-ai-insights-performance
$M --route "/ai/observe?tab=savings"  --slug $PREFIX-21-ai-insights-savings
$M --route "/ai/observe?tab=security" --slug $PREFIX-22-ai-insights-security
echo "sweep complete → docs/figma-handoff/captures/$PREFIX/"
