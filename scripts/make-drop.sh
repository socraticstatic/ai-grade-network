#!/usr/bin/env bash
# Build the downloadable storefront package.
#
#   bash scripts/make-drop.sh
#
# Writes storefront-YYYYMMDD-HHMM.zip at the repo root and removes the
# previous one, so exactly one drop is ever tracked and the deploy workflow
# has exactly one file to publish.
#
# The file list comes from `git ls-files`, never from the working tree. This
# repo carries untracked scratch at the root (.env.local, dist/, public/,
# .worktrees/, nested clones) and a recursive copy would sweep all of it into
# a package that goes to a partner. Tracked-only makes that impossible.
#
# Excluded on purpose:
#   fonts/*.woff2, *.ttf  AT&T Aleck Sans is separately licensed. NOTICE and
#                         fonts/README.txt both say it is not in the package,
#                         so it must not be. The pages fall back to a system
#                         sans and render correctly.
#   .github/              CI for this repo, not for the reader's.
#   .thumbnail            Claude Design working file, like the uploads/ folder
#                         dropped in c50b5cf.
#   storefront-*.zip      never nest a drop inside a drop.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

stamp="$(date +%Y%m%d-%H%M)"
name="storefront-${stamp}.zip"
sha="$(git rev-parse --short HEAD)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

git ls-files -z |
  grep -zEv '^(\.github/|\.thumbnail$|storefront-.*\.zip$)' |
  grep -zEv '^fonts/.*\.(woff2|ttf)$' |
  while IFS= read -r -d '' f; do
    mkdir -p "$stage/storefront/$(dirname "$f")"
    cp "$f" "$stage/storefront/$f"
  done

# Every page fetches ./version.js on load to notice a stale cached build. The
# deploy workflow generates it; a downloaded copy had nothing to fetch and
# opened with a seventh console 404 on top of the six the README documents.
# Stamping it here removes the noise and lets the package say which build it
# is, which is the first thing anyone asks of a zip.
iso="$(git log -1 --format=%cI)"
day="$(TZ=America/Chicago git log -1 --format=%cd --date=format-local:%Y-%m-%d)"
cat > "$stage/storefront/version.js" <<VERSION
// Stamped by scripts/make-drop.sh when this package was built.
(function () {
  var v = { build: $(git rev-list --count HEAD), sha: "${sha}", date: "${day}", iso: "${iso}" };
  window.__naasVersion = v;
  if (document.body && document.body.dataset.versionPill === 'off') return;
  function mount() {
    if (document.getElementById('naas-version')) return;
    var el = document.createElement('div');
    el.id = 'naas-version';
    el.textContent = 'v' + v.build + ' \u00b7 ' + v.date;
    el.style.cssText = 'position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:60;' +
      'padding:3px 10px;border-radius:9999px;font:11px/16px system-ui,sans-serif;' +
      'color:rgba(128,128,128,.95);background:rgba(128,128,128,.14);white-space:nowrap';
    document.body.appendChild(el);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
VERSION

# The licence notice claims the fonts are absent. Prove it before shipping.
if find "$stage/storefront/fonts" -name '*.woff2' -o -name '*.ttf' | grep -q .; then
  echo "refusing to build: licensed font binaries are in the package" >&2
  exit 1
fi
[ -f "$stage/storefront/fonts/README.txt" ] || { echo "fonts/README.txt is missing" >&2; exit 1; }
[ -f "$stage/storefront/NOTICE" ] || { echo "NOTICE is missing" >&2; exit 1; }

rm -f storefront-*.zip
( cd "$stage" && zip -rq "$root/$name" storefront -x '*.DS_Store' )
zip -zq "$root/$name" <<<"built from ai-grade-network ${sha} on ${stamp}"

echo "$name  $(unzip -l "$name" | tail -1 | awk '{print $2}') files  $(du -h "$name" | cut -f1)  @ ${sha}"
