# Security assessment

Assessed 2026-09-14, at the commit that made this repository public.

This repository was flagged by a scanner as containing "malicious code". It
does not. This note records what was checked, what the flag is almost
certainly reacting to, what was fixed, and what is still open.

## Verdict

No malicious code found.

The most likely cause of the warning is content, not behavior: this is a
network security dashboard, so it displays threat vocabulary as data.
`src/engine/state-findings.ts` carries literal AWS GuardDuty finding
identifiers as demo records:

- `GuardDuty · Trojan:Classified/DNSDataExfiltration`
- `GuardDuty · Exfiltration:S3/ExternalBucket`

Plus "malware" in two Marketplace product descriptions and "Beacon Health
Systems", a fictional persona's employer. A keyword scanner sees Trojan,
Exfiltration, malware, beacon and flags the repo. Every one is a display
string. None is code.

A second contributor: 16 files under `src/engine/` are `@ts-nocheck` IIFEs
that read and write a `window.CC` global. That pattern is unusual in a React
codebase and reads as evasive to heuristics. It is the demo state engine.

## What was checked

| Check | Result |
|---|---|
| npm install hooks (`preinstall`/`install`/`postinstall`) in this package | None |
| `eval`, `new Function`, `document.write` | None in shipped code |
| `child_process` / shell execution | Test files only, all running `git ls-files` or `cat package.json` |
| Hardcoded outbound hosts in `src/` | Zero. The only `fetch` is same-origin (`./build-id.json`); nothing leaves the page's host. |
| Obfuscation (char-code assembly, hex-escape density, packed code) | None |
| `atob()` / `btoa()` usage | 4 files, all `JSON.parse(atob(x))` in a try/catch. Data decode, never decode-then-execute. |
| Tracked minified or bundled JS | None |
| Tracked binaries | Web fonts only |
| Base64 blobs | Embedded fonts and images in `docs/figma-handoff/artboards/*.html` |
| Committed secrets | None. No JWT, no service-role key, no private key, no `.env` in any commit in history. |
| GitHub secret scanning | 0 alerts |
| CI workflow | `push` to `main` and `workflow_dispatch` only. No `pull_request_target`, no `workflow_run`, no pipe-to-shell, no secrets consumed. `permissions` scoped to `contents: read`, `pages: write`, `id-token: write`. |
| XSS sinks | 8 `dangerouslySetInnerHTML` / `innerHTML` lines across 5 files, all fed by engine-generated strings. The share-link hash is charset-constrained to `[A-Za-z0-9_-]+` and decodes to JSON; it never reaches an HTML sink. |

## Fixed in this pass

- **Third-party auth removed entirely.** The Supabase dependency, its client,
  the 6-digit OTP flow, and the login gate are gone. The app opens directly.
  A publishable key that used to ship in the bundle is no longer anywhere in
  the tree.
- **Production dependency vulnerabilities: 3 high → 0.** `npm audit fix`
  cleared the high-severity advisories reachable from shipped code.
- **Two font archives removed** (`ATTAleckSans_Web.zip`,
  `All_ATTAleck_Web_Fonts.zip`, 6.7 MB). No code referenced them, and one
  contained `ATT_Aleck_EULA.pdf`. See the licensing note below.

## Open

**Licensing, not security, and the sharpest item here.** AT&T Aleck Sans is a
licensed corporate typeface. Five `.woff2` files remain in
`src/assets/fonts/` because the UI loads them, and this repository is now
public. Removing the zips reduced the exposure; it did not end it. Confirm
the license permits public redistribution, or move the faces behind a build
step.

**Two moderate advisories remain** in `react-router` / `react-router-dom`
(XSS via open redirect). Clearing them needs a major version bump, which is
not a drive-by change.

**`core-js` declares a `postinstall` script.** It is a well-known, benign
package, noted here only because install-time execution is the vector worth
tracking in any dependency tree.

**Dependabot alerts are disabled and no code scanning is configured.** Both
are free on a public repository and both are worth turning on.

## Threat model

This is a static GitHub Pages prototype with no backend, no database, and no
user data. The JS bundle is public by construction. There is nothing to
authenticate to and nothing to steal. Treat everything in it as published.
