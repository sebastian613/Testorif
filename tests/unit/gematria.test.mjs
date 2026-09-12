import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeHechrachi,
  isHebrewLetter,
  stripToHebrewLetters,
  numberToHebrewNumeral,
} from "../../src/gematria.js";

test("computeHechrachi: known words match their traditional Standard Values", () => {
  const cases = {
    "יהוה": 26,
    "דוד": 14,
    "משיח": 358,
    "אברהם": 248,
    "חי": 18,
    "אמן": 91,
    "חסד": 72,
    "שדי": 314,
  };
  for (const [word, expected] of Object.entries(cases)) {
    assert.equal(computeHechrachi(word), expected, `${word} should equal ${expected}`);
  }
});

test("computeHechrachi: final letters share their base letter's value", () => {
  // ך/כ, ם/מ, ן/נ, ף/פ, ץ/צ must be equal under Standard Value.
  assert.equal(computeHechrachi("ך"), computeHechrachi("כ"));
  assert.equal(computeHechrachi("ם"), computeHechrachi("מ"));
  assert.equal(computeHechrachi("ן"), computeHechrachi("נ"));
  assert.equal(computeHechrachi("ף"), computeHechrachi("פ"));
  assert.equal(computeHechrachi("ץ"), computeHechrachi("צ"));
});

test("computeHechrachi: ignores niqqud, cantillation, punctuation, and non-Hebrew text", () => {
  assert.equal(computeHechrachi("דָּוִד"), computeHechrachi("דוד"), "niqqud should be stripped");
  assert.equal(computeHechrachi("דָּוִ֖ד"), computeHechrachi("דוד"), "cantillation should be stripped");
  assert.equal(computeHechrachi("דוד!"), computeHechrachi("דוד"), "punctuation should be stripped");
  assert.equal(computeHechrachi("hello"), 0, "non-Hebrew text has no value");
  assert.equal(computeHechrachi(""), 0, "empty string has no value");
});

test("computeHechrachi: a multi-word phrase sums across all words (spaces ignored)", () => {
  assert.equal(computeHechrachi("יאשיהו דוד עזריאל לישאביץ"), 1107);
});

test("isHebrewLetter: true for all 22 base letters and 5 final forms, false otherwise", () => {
  for (const ch of "אבגדהוזחטיכלמנסעפצקרשת") assert.equal(isHebrewLetter(ch), true, ch);
  for (const ch of "ךםןףץ") assert.equal(isHebrewLetter(ch), true, ch);
  assert.equal(isHebrewLetter("a"), false);
  assert.equal(isHebrewLetter(" "), false);
  assert.equal(isHebrewLetter("5"), false);
});

test("stripToHebrewLetters: keeps only the 22 letters, drops everything else", () => {
  assert.equal(stripToHebrewLetters("דָּוִד מֶלֶךְ"), "דודמלך");
  assert.equal(stripToHebrewLetters("613"), "");
  assert.equal(stripToHebrewLetters(""), "");
});

test("numberToHebrewNumeral: standard conversions", () => {
  assert.equal(numberToHebrewNumeral(613), "תרי״ג");
  assert.equal(numberToHebrewNumeral(18), "י״ח");
  assert.equal(numberToHebrewNumeral(1), "א׳");
});

test("numberToHebrewNumeral: 15 and 16 use the customary טו/טז substitution", () => {
  // Avoids resembling an abbreviation of the divine name (which יה/יו would).
  assert.equal(numberToHebrewNumeral(15), "ט״ו");
  assert.equal(numberToHebrewNumeral(16), "ט״ז");
  assert.equal(numberToHebrewNumeral(115), "קט״ו");
});

test("numberToHebrewNumeral: rejects out-of-range or non-integer input", () => {
  assert.equal(numberToHebrewNumeral(0), null);
  assert.equal(numberToHebrewNumeral(-5), null);
  assert.equal(numberToHebrewNumeral(1.5), null);
  assert.equal(numberToHebrewNumeral(1000000), null);
});
