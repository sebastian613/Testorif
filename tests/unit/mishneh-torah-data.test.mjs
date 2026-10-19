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
const sources = readJson("mishneh-torah-sources.json");

test("mishneh-torah.json: the complete work — all 88 treatises, nothing dropped", () => {
  // An earlier build shipped only the 79 treatises Sefaria tags Public
  // Domain outright. The other 9 are now sourced too (see the script's
  // docstring): 5 from the same Torat Emet 370 edition Sefaria left
  // license-untagged, and 4 from Mechon Mamre's public domain edition.
  assert.equal(sources.length, 88);
  const treatisesInText = new Set(mishnehTorah.map((p) => p.ref.replace(/ [\d:]+$/, "")));
  assert.equal(treatisesInText.size, 88, "every treatise should contribute at least one passage");
  for (const s of sources) {
    assert.ok(treatisesInText.has(s.treatise), `no passages built for ${s.treatise}`);
  }
  assert.equal(mishnehTorah.length, 15895);
});

test("mishneh-torah.json: the 9 once-missing treatises are really present", () => {
  // Regression guard on the specific gap the earlier build had, so a
  // sourcing change can't quietly drop them again.
  const onceMissing = [
    "Mishneh Torah, Transmission of the Oral Law",
    "Mishneh Torah, Positive Mitzvot",
    "Mishneh Torah, Negative Mitzvot",
    "Mishneh Torah, Overview of Mishneh Torah Contents",
    "Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll",
    "Mishneh Torah, Fringes",
    "Mishneh Torah, Blessings",
    "Mishneh Torah, Circumcision",
    "Mishneh Torah, The Order of Prayer",
  ];
  for (const name of onceMissing) {
    const passages = mishnehTorah.filter((p) => p.ref.startsWith(`${name} `));
    assert.ok(passages.length > 0, `${name} is missing from the corpus again`);
  }
  // Rambam enumerates exactly 248 positive commandments — a fixed,
  // externally-known number, so a mis-parse of that list fails here.
  const positive = mishnehTorah.filter((p) => p.ref.startsWith("Mishneh Torah, Positive Mitzvot "));
  assert.equal(positive.length, 248);
});

test("source manifest distinguishes unverified permissions from public domain metadata", () => {
  const unresolved = sources.filter((s) => s.permissionsStatus === "unresolved");
  assert.equal(unresolved.length, 7);
  assert.equal(unresolved.filter((s) => s.versionTitle === "Torat Emet 370").length, 5);
  for (const s of unresolved) {
    assert.equal(s.license, "unknown");
    assert.equal(s.sefariaLicenseTagged, false);
  }
  for (const s of sources.filter((s) => s.permissionsStatus !== "unresolved")) {
    assert.equal(s.license, "Public Domain");
    assert.equal(s.sefariaLicenseTagged, true);
  }
});

test("mishneh-torah.json: every entry has a clean ref and text, no leftover markup, no translation", () => {
  for (const p of mishnehTorah) {
    // Chapter:halacha for the halachic treatises, a flat index for the
    // prefatory lists (which have no chapters) — both are valid.
    assert.match(p.ref, /^Mishneh Torah, .+ \d+(:\d+)?$/, `bad ref: ${p.ref}`);
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

test("stored occurrences never exceed the cap data.js advertises for this corpus", () => {
  // src/data.js's CORPORA entry carries `occCap` so the "N+ occurrences
  // found" label matches how many the build script actually kept. If the
  // two drift apart the UI starts claiming exact counts it can't back up.
  const dataJs = readFileSync(path.join(DATA_DIR, "..", "src", "data.js"), "utf-8");
  const declared = Number(/occCap:\s*(\d+)/.exec(dataJs)[1]);
  for (const [, occurrences] of [...mtWords, ...mtPhrases]) {
    assert.ok(occurrences.length <= declared, `an entry stored ${occurrences.length} occurrences, cap is ${declared}`);
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
