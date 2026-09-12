import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const readJson = (name) => JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf-8"));

const mishnehTorah = readJson("mishneh-torah.json");
const mtWords = readJson("mishneh-torah-words.json");
// Split across two files purely because one file is too large to publish
// to some hosting targets — see scripts/build_mishneh_torah.py and
// src/data.js's fetchJsonConcat. Concatenated back into one list here,
// same as the app does at load time.
const mtPhrases = [...readJson("mishneh-torah-phrases-1.json"), ...readJson("mishneh-torah-phrases-2.json")];

test("mishneh-torah.json: 79 confirmed-Public-Domain treatises' worth of halachot present", () => {
  // 9 of the 88 treatises (4 introductory list-books, 5 of Sefer Ahavah's
  // 7) have no confirmed Public Domain Hebrew version and are excluded —
  // see scripts/build_mishneh_torah.py's EXCLUDED set and docstring.
  assert.equal(mishnehTorah.length, 14622);
});

test("mishneh-torah.json: every entry has a clean ref/he/text, no leftover markup, no translation", () => {
  for (const p of mishnehTorah) {
    assert.match(p.ref, /^Mishneh Torah, .+ \d+:\d+$/, `bad ref: ${p.ref}`);
    assert.ok(p.he.length > 0);
    assert.ok(p.text.length > 0);
    assert.doesNotMatch(p.text, /<[a-zA-Z/]/, `leftover HTML in ${p.ref}: ${p.text.slice(0, 60)}`);
    assert.equal(p.en, undefined, "Mishneh Torah entries should not carry an (unlicensed) translation field");
  }
});

test("mishneh-torah-words.json / mishneh-torah-phrases.json: occurrence indices stay within mishneh-torah.json's own range", () => {
  // Deliberately NOT offset against Tanakh or Mishnah — Mishneh Torah is
  // a fully separate corpus/index (see data.js's CORPORA), so its own
  // occurrence indices must be local to mishneh-torah.json alone.
  for (const [file, entries] of [["mishneh-torah-words.json", mtWords], ["mishneh-torah-phrases.json", mtPhrases]]) {
    let checked = 0;
    for (const [, occurrences] of entries) {
      for (const occ of occurrences) {
        assert.ok(occ[0] >= 0 && occ[0] < mishnehTorah.length, `${file}: index ${occ[0]} out of range`);
        checked++;
      }
    }
    assert.ok(checked > 0, `${file} should have at least one occurrence to check`);
  }
});

test("Mishneh Torah's excluded treatises never leak into the built corpus", () => {
  const excludedNames = [
    "Transmission of the Oral Law",
    "Positive Mitzvot",
    "Negative Mitzvot",
    "Overview of Mishneh Torah Contents",
    "Tefillin, Mezuzah and the Torah Scroll",
    "Fringes",
    "Blessings",
    "Circumcision",
    "The Order of Prayer",
  ];
  for (const p of mishnehTorah) {
    for (const name of excludedNames) {
      assert.ok(!p.ref.includes(name), `excluded treatise leaked in: ${p.ref}`);
    }
  }
});

test("a known Mishneh Torah opening line resolves to its real citation", () => {
  // The famous opening halacha of the entire work — Foundations of the
  // Torah 1:1 — a fixed, well-known reference point.
  const entry = mtWords.find(([w]) => w === "יסוד");
  assert.ok(entry, "יסוד should be indexed");
  const [, occurrences] = entry;
  const refs = occurrences.map((occ) => mishnehTorah[occ[0]].ref);
  assert.ok(refs.includes("Mishneh Torah, Foundations of the Torah 1:1"));
});
