import { defaults } from '../naas-app.js';

// Shared test harness (Task 17, item 5): mkC() was copy-pasted into seven
// test files with the same trust/s3/cloud/connect defaults. One copy here so
// it can only drift once. `base` lets a file override just the fields where
// its own defaults differ from the shared ones (tests/inventory-memo.test.mjs
// needs tab: 'cost'; tests/inv-gate.test.mjs needs screen: 's1'), without
// touching every call site in that file.
//
// setState supports the functional-updater form (`c.setState(st => ({...}))`)
// as well as a plain object patch, because naas-app.js uses both forms
// internally (tests/gap-count.test.mjs's copy already had to grow this).
export function mkC(extra = {}, base = {}) {
  const state = { ...defaults(), view: 'trust', screen: 's3', layer: 'cloud', tab: 'connect', ...base, ...extra };
  return {
    state,
    setState: (p) => { const patch = typeof p === 'function' ? p(state) : p; if (patch) Object.assign(state, patch); },
  };
}
