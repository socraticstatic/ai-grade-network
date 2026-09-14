# Security notes

This repository is a static prototype: HTML, JavaScript and images served
exactly as they sit on disk. There is no server-side code, no database, no
authentication and no user data. Everything in it should be treated as
published.

## Things a scanner may flag, and why they are fine

**`new Function(...)` in `support.js`.** `support.js` is the Claude Design
runtime. It compiles the artboards' component templates at load time, which
is what those two calls do. They run only on code that ships in this
repository; nothing is fetched and executed from elsewhere.

**Threat vocabulary in the data.** `naas-data.js` and the Observe screens
carry demo security findings written in the style of AWS GuardDuty
(`Trojan:Classified/DNSDataExfiltration`, `Exfiltration:S3/ExternalBucket`).
They are display strings for a network security dashboard, not behaviour.

## What the page loads

Nothing from a CDN. React 18.3.1, ReactDOM and Babel standalone are vendored
under `vendor/` and every artboard maps the runtime's CDN URLs to those files
before `support.js` runs. The only network requests a page makes are to its
own host.

## Deploy

`.github/workflows/gh-pages.yml` runs on push to `main`: it checks out the
repository, runs `scripts/stamp-version.sh` (bash only, no package install)
and publishes the result. The workflow token has `contents: read`,
`pages: write`, `id-token: write` and nothing else.

## Licensing

`fonts/` holds AT&T Aleck Sans web fonts, which are licensed. Their presence
in a public repository is a licensing question, not a security one.
