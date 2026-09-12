import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHechrachi } from "../../src/gematria.js";
import { NOTABLE_VALUES, findNotableValue } from "../../src/notable-values.js";

test("every notable value's word(s) actually compute to the claimed value", () => {
  for (const entry of NOTABLE_VALUES) {
    assert.ok(Array.isArray(entry.words) && entry.words.length > 0, `entry ${entry.value} needs a words[] to verify`);
    for (const word of entry.words) {
      assert.equal(
        computeHechrachi(word),
        entry.value,
        `${word} should compute to ${entry.value} but got ${computeHechrachi(word)}`
      );
    }
  }
});

test("notable values have no duplicate target values", () => {
  const values = NOTABLE_VALUES.map((n) => n.value);
  assert.equal(new Set(values).size, values.length);
});

test("findNotableValue: returns the matching entry or null", () => {
  assert.equal(findNotableValue(26).words[0], "יהוה");
  assert.equal(findNotableValue(999999), null);
});
