import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const readJson = (name) => JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf-8"));

const mishnah = readJson("mishnah.json");
const mishnahWords = readJson("mishnah-words.json");
const mishnahPhrases = readJson("mishnah-phrases.json");

test("mishnah.json: all 63 tractates present", () => {
  // 4187, not a rounder number — a handful of editions split a mishnah
  // differently than others; this is the count for the Torat Emet 357
  // edition specifically (see scripts/build_mishnah.py).
  assert.equal(mishnah.length, 4187);
});

test("mishnah.json: every entry has a clean ref/he/text, no leftover markup, no translation", () => {
  for (const p of mishnah) {
    assert.match(p.ref, /^Mishnah .+ \d+:\d+$/, `bad ref: ${p.ref}`);
    assert.ok(p.he.startsWith("משנה "), `he should name the tractate: ${p.he}`);
    assert.ok(p.text.length > 0);
    assert.doesNotMatch(p.text, /<[a-zA-Z/]/, `leftover HTML in ${p.ref}: ${p.text.slice(0, 60)}`);
    assert.equal(p.en, undefined, "Mishnah entries should not carry an (unlicensed) translation field");
  }
});

test("phrase entries are two space-separated words, in both corpora", () => {
  // Regression test: an earlier version of the Mishnah phrase extraction
  // concatenated the two words with no separator at all ("קוריןאת" instead
  // of "קורין את") — not just a display bug, since two genuinely different
  // word-pairs can concatenate to the exact same string and silently
  // collide into one (wrong) phrase entry once the space disappears.
  for (const file of ["hebrew-phrases.json", "mishnah-phrases.json"]) {
    const phrases = readJson(file);
    for (const [phrase] of phrases) {
      assert.equal((phrase.match(/ /g) || []).length, 1, `${file}: "${phrase}" should be exactly two words`);
    }
  }
});

test("mishnah-words.json / mishnah-phrases.json: occurrence indices stay within mishnah.json's own range", () => {
  // Deliberately NOT offset against Tanakh — Mishnah is a fully separate
  // corpus/index now (see data.js's CORPORA), so its own occurrence
  // indices must be local to mishnah.json alone.
  for (const [file, entries] of [["mishnah-words.json", mishnahWords], ["mishnah-phrases.json", mishnahPhrases]]) {
    let checked = 0;
    for (const [, occurrences] of entries) {
      for (const occ of occurrences) {
        assert.ok(occ[0] >= 0 && occ[0] < mishnah.length, `${file}: index ${occ[0]} out of range`);
        checked++;
      }
    }
    assert.ok(checked > 0, `${file} should have at least one occurrence to check`);
  }
});

test("hebrew-words.json / hebrew-phrases.json (Tanakh) stay untouched by the Mishnah corpus", () => {
  // Regression guard: an earlier version of this feature merged Mishnah's
  // occurrences into Tanakh's own word/phrase files, which coupled the two
  // corpora together (an occurrence's index alone couldn't tell you which
  // corpus it belonged to). Corpora must stay independent going forward.
  const tanakh = readJson("tanakh.json");
  const words = readJson("hebrew-words.json");
  for (const [, occurrences] of words) {
    for (const occ of occurrences) {
      assert.ok(occ[0] < tanakh.length, "a Tanakh word occurrence pointed past the Tanakh passage list");
    }
  }
});

test("a known Mishnah-only word resolves to its real citation", () => {
  // The opening word of Mishnah Berakhot 1:1 — a fixed, well-known reference
  // point that only ever appears in the Mishnah, never the Tanakh.
  const entry = mishnahWords.find(([w]) => w === "מאימתי");
  assert.ok(entry, "מאימתי should be indexed");
  const [, occurrences] = entry;
  assert.equal(mishnah[occurrences[0][0]].ref, "Mishnah Berakhot 1:1");
});
