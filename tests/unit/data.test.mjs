import { test } from "node:test";
import assert from "node:assert/strict";
import { findMatches } from "../../src/data.js";

// findMatches takes the precomputed value array directly (an Int32Array in
// production, from data.js's own buildIndex) — this regression-tests the
// exact shape bug that once made every search silently return zero matches:
// findMatches briefly expected a {values: [...]} wrapper object while
// buildIndex had switched to returning the array itself, and the mismatch
// didn't throw because TypedArrays have their own inherited .values()
// method, so `arr.length` quietly evaluated to a function's arity (0).

test("findMatches: finds every index whose value equals the target", () => {
  const values = new Int32Array([26, 14, 26, 358, 26, 91]);
  assert.deepEqual(findMatches(values, 26), [0, 2, 4]);
});

test("findMatches: returns an empty array when nothing matches", () => {
  const values = new Int32Array([26, 14, 358]);
  assert.deepEqual(findMatches(values, 999), []);
});

test("findMatches: works on a plain array too, not just a typed array", () => {
  // Guards against any future refactor coupling findMatches to a specific
  // array type instead of just indexable, length-bearing values.
  assert.deepEqual(findMatches([1, 2, 1, 3], 1), [0, 2]);
});

test("findMatches: an empty index returns no matches", () => {
  assert.deepEqual(findMatches(new Int32Array([]), 26), []);
});
