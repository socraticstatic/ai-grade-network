import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The markup's logic class must parse as the dc-runtime parses it (2026-10-01): a merge left the
// constructor closed twice ("}; } }; }"), every vals() test passed, and the page rendered props only
// ("Unexpected identifier 'componentDidUpdate'"). The runtime evals the script body with new Function.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

test('the markup\'s logic class parses as the runtime evals it', () => {
  const open = HTML.indexOf('<script type="text/x-dc" data-dc-script>');
  assert.ok(open > 0, 'the logic script is gone');
  const body = HTML.slice(HTML.indexOf('>', open) + 1, HTML.indexOf('</script>', open));
  class DCLogic { constructor(p) { this.props = p; } setState() {} }
  assert.doesNotThrow(() => new Function('DCLogic', `${body}\nreturn Component;`)(DCLogic), 'the logic class does not parse');
});
