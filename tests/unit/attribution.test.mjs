import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { CORPORA, textOf } from "../../src/data.js";
import { resultAttribution } from "../../src/attribution.js";
import { HECHRACHI_INFO } from "../../src/gematria.js";

const mishnah = CORPORA.find((c) => c.key === "mishnah");
const passage = { ref: "Mishnah Berakhot 1:1", text: "מאימתי", en: "From what time" };
const source = readFileSync(new URL("../../src/app.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "").replace(/^init\(\);$/m, "");
function app(corpus, translated = true) {
  const p = translated ? passage : { ...passage, en: undefined };
  const sandbox = { CORPORA, textOf, HECHRACHI_INFO, resultAttribution,
    loadRecentSearches: () => [], localStorage: { getItem: () => null },
    document: { getElementById: () => ({ value: "501" }) }, findNotableValue: () => null };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  sandbox.p = p; sandbox.c = CORPORA.find((c) => c.key === corpus);
  vm.runInContext(`state.value = 501; state.corpus = c.key;
    state.datasets = { [c.key]: { passages: { items: [p] }, words: { items: [["מאימתי", [[0,0,6]]]] }, phrases: { items: [["מאימתי", [[0,0,6]]]] } } };
    state.matches = { words: [0], phrases: [0], passages: [0] };`, sandbox);
  return sandbox;
}
function expectCredit(output) {
  for (const expected of ["Mishnah Yomit", "Dr. Joshua Kulp", "CC BY 3.0", mishnah.translationCredit.licenseUrl, mishnah.translationCredit.sourceUrl, "HTML markup removed"]) {
    assert.ok(output.includes(expected), `missing ${expected}`);
  }
}
test("every result copy path retains translation credits", () => {
  const ctx = app("mishnah");
  expectCredit(vm.runInContext('buildCopyText("passage", p, null, c)', ctx));
  for (const kind of ["words", "phrases"]) {
    expectCredit(vm.runInContext(`buildCopyText("${kind}", state.datasets[c.key]["${kind}"].items[0], state.datasets[c.key].passages, c)`, ctx));
  }
});
test("Markdown credits translated results once, across all tabs", () => {
  const ctx = app("mishnah");
  for (const tab of ["words", "phrases", "passages"]) {
    vm.runInContext(`state.activeTab = "${tab}"`, ctx);
    const output = vm.runInContext("buildMarkdownReport()", ctx);
    expectCredit(output);
    assert.equal(output.split("CC BY 3.0").length - 1, 1);
  }
});
test("no Kulp credit for untranslated, empty, or other corpus reports", () => {
  for (const corpus of ["mishnah", "tanakh", "mishneh-torah"]) {
    const ctx = app(corpus, false);
    assert.ok(!vm.runInContext("buildMarkdownReport()", ctx).includes("Kulp"));
    vm.runInContext("state.matches.words = []", ctx);
    const output = vm.runInContext("buildMarkdownReport()", ctx);
    assert.ok(!output.includes("CC BY"));
  }
});
test("Tanakh Hebrew credit survives without an English translation", () => {
  const ctx = app("tanakh", false);
  assert.match(vm.runInContext('buildCopyText("words", state.datasets[c.key].words.items[0], state.datasets[c.key].passages, c)', ctx), /Open Scriptures Hebrew Bible/);
});
test("footer credits use the configured Mishnah source and license links", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  for (const expected of [mishnah.translationCredit.licenseUrl, mishnah.translationCredit.sourceUrl, "Dr. Joshua Kulp", "Mishnah Yomit"]) assert.ok(html.includes(expected));
});

test("recorded metadata supports every Mishnah and JPS edition credit", () => {
  const evidence = JSON.parse(readFileSync(new URL("../../docs/source-metadata-2026-10-19.json", import.meta.url), "utf8"));
  const mishnahRecords = evidence.records.filter((r) => r.title.startsWith("Mishnah "));
  assert.equal(mishnahRecords.length, 63);
  for (const r of mishnahRecords) {
    assert.equal(r.versions.find((v) => v.versionTitle === "Mishnah Yomit by Dr. Joshua Kulp")?.license, "CC-BY");
    assert.equal(r.versions.find((v) => v.versionTitle === "Torat Emet 357")?.license, "Public Domain");
  }
  assert.equal(evidence.tanakhVersions.length, 39);
  for (const r of evidence.tanakhVersions) {
    assert.equal(r.versions.length, 1);
    assert.equal(r.versions[0].license, "Public Domain");
  }
});
