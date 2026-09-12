import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHechrachi, stripToHebrewLetters } from "../../src/gematria.js";
import { POPULAR_NUMBERS, POPULAR_PHRASES } from "../../src/popular-searches.js";

test("POPULAR_NUMBERS: exactly 50 unique positive integers", () => {
  assert.equal(POPULAR_NUMBERS.length, 50);
  assert.equal(new Set(POPULAR_NUMBERS).size, 50, "no duplicates");
  for (const n of POPULAR_NUMBERS) {
    assert.ok(Number.isInteger(n) && n > 0, `${n} should be a positive integer`);
  }
});

test("POPULAR_PHRASES: exactly 50 unique, real Hebrew phrases with a positive value", () => {
  assert.equal(POPULAR_PHRASES.length, 50);
  assert.equal(new Set(POPULAR_PHRASES).size, 50, "no duplicates");
  for (const phrase of POPULAR_PHRASES) {
    assert.ok(stripToHebrewLetters(phrase).length > 0, `${phrase} should contain Hebrew letters`);
    assert.ok(computeHechrachi(phrase) > 0, `${phrase} should have a positive Standard Value`);
  }
});
