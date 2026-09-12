import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const readJson = (name) => JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf-8"));

const tanakh = readJson("tanakh.json");
const mishnah = readJson("mishnah.json");

test("mishnah.json: all 63 tractates present, 4192 mishnayot", () => {
  assert.equal(mishnah.length, 4192);
});

test("mishnah.json: every entry has a clean ref/he/text, no leftover markup", () => {
  for (const p of mishnah) {
    assert.match(p.ref, /^Mishnah .+ \d+:\d+$/, `bad ref: ${p.ref}`);
    assert.ok(p.he.startsWith("משנה "), `he should name the tractate: ${p.he}`);
    assert.ok(p.text.length > 0);
    assert.doesNotMatch(p.text, /<[a-zA-Z/]/, `leftover HTML in ${p.ref}: ${p.text.slice(0, 60)}`);
    assert.equal(p.en, undefined, "Mishnah entries should not carry an (unlicensed) translation field");
  }
});

test("hebrew-words.json / hebrew-phrases.json: occurrence indices stay within the combined passages range", () => {
  const combinedLength = tanakh.length + mishnah.length;
  for (const file of ["hebrew-words.json", "hebrew-phrases.json"]) {
    const entries = readJson(file);
    let checked = 0;
    for (const [, occurrences] of entries) {
      for (const occ of occurrences) {
        assert.ok(occ[0] >= 0 && occ[0] < combinedLength, `${file}: index ${occ[0]} out of range`);
        checked++;
      }
    }
    assert.ok(checked > 0, `${file} should have at least one occurrence to check`);
  }
});

test("a known Mishnah-only word resolves to its real citation", () => {
  // The opening word of Mishnah Berakhot 1:1 — a fixed, well-known reference
  // point that only ever appears in the Mishnah, never the Tanakh.
  const words = readJson("hebrew-words.json");
  const entry = words.find(([w]) => w === "מאימתי");
  assert.ok(entry, "מאימתי should be indexed");
  const [, occurrences] = entry;
  const passage = tanakh.concat(mishnah)[occurrences[0][0]];
  assert.equal(passage.ref, "Mishnah Berakhot 1:1");
});
