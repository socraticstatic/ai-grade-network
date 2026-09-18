import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Task 17, item 7 (and item 8's finish): pin the wave-end deletions so a
// future merge cannot resurrect a dead value silently. Each of these was
// proven dead by a whole-repo grep (only the returned line read it, or -
// for startOrder - only a test exercising the dead route read it, which is
// not a live reader) before it was deleted from vals() - see the task-17
// report for the greps.
test('vals() carries none of the wave-end dead values', () => {
  const v = vals(mkC());
  assert.ok(!('strataX' in v), 'strataX (item 1) was supposed to be deleted - the strata cards hardcode their own geometry');
  assert.ok(!('strataW' in v), 'strataW (item 1) was supposed to be deleted - the strata cards hardcode their own geometry');
  assert.ok(!('layerLabel' in v), 'layerLabel (item 2, the crumb-level one) was supposed to be deleted - {{ layerLabel }} is unbound');
  assert.ok(!('layerTagline' in v), 'layerTagline (item 2) was supposed to be deleted - nothing ever bound it');
  assert.ok(!('places' in v), 'places (item 8) was supposed to be deleted - nothing reads it but the returned line');
  assert.ok(!('goCapacity' in v), 'goCapacity (item 9) was supposed to be deleted - {{ goCapacity }} is unbound');
  assert.ok(!('startOrder' in v), 'startOrder (item 8) was supposed to be deleted - the live product path is p.choose straight to s6, not this route');

  // The products list's own layerLabel (a different object - D.LAYERS.find(...).label
  // on each product) is untouched; only the crumb-level vals() key is gone.
  assert.ok(v.mostChosen.length > 0, 'fixture sanity: mostChosen must be non-empty to check its layerLabel');
  assert.ok('layerLabel' in v.mostChosen[0], 'the product list\'s own layerLabel must survive - it is a different object, not the deleted crumb-level key');
});
