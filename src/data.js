import { computeHechrachi } from "./gematria.js";

/**
 * Each corpus is a fully independent word/phrase/passage index — searching
 * one never touches another. This is deliberate: a word's occurrence
 * indices are local to its own corpus's passage list, so corpora can be
 * added (or dropped) without ever renumbering another corpus's data.
 */
export const CORPORA = [
  {
    key: "tanakh",
    label: "Tanakh",
    files: { words: "data/hebrew-words.json", phrases: "data/hebrew-phrases.json", passages: "data/tanakh.json" },
  },
  {
    key: "mishnah",
    label: "Mishnah",
    files: { words: "data/mishnah-words.json", phrases: "data/mishnah-phrases.json", passages: "data/mishnah.json" },
  },
  {
    key: "mishneh-torah",
    label: "Mishneh Torah",
    files: {
      words: "data/mishneh-torah-words.json",
      // Split across two files: one file would be too large to publish to
      // some hosting targets (see scripts/build_mishneh_torah.py) — see
      // fetchJsonConcat in loadDatasets below for how a corpus file entry
      // can be an array of shards instead of one path.
      phrases: ["data/mishneh-torah-phrases-1.json", "data/mishneh-torah-phrases-2.json"],
      passages: "data/mishneh-torah.json",
    },
    // This corpus's build script caps stored occurrences per word/phrase
    // at 3, not the 8 every other corpus uses (Mishneh Torah's halachot
    // are long enough that 398,000+ distinct phrases at a cap of 8 was too
    // large to publish to some hosting targets) — app.js's "N+ occurrences
    // found" display needs to know this to avoid claiming an exact count
    // past the point where more occurrences actually exist but weren't kept.
    occCap: 3,
  },
];

const TEXT_OF = {
  words: (item) => item[0],
  phrases: (item) => item[0],
  passages: (p) => p.text,
};

export { TEXT_OF as textOf };

/**
 * Loads every corpus's word/phrase/passage datasets and precomputes each
 * item's Standard Value so lookups are a simple array scan instead of
 * recomputing gematria on every keystroke.
 * @returns {Object} keyed by corpus key, e.g. { tanakh: {...}, mishnah: {...} }
 */
export async function loadDatasets(onProgress) {
  const report = (msg) => onProgress && onProgress(msg);

  report("Loading source texts…");
  const loaded = await Promise.all(
    CORPORA.map(async (corpus) => {
      const [words, phrases, passages] = await Promise.all([
        fetchJsonConcat(corpus.files.words),
        fetchJsonConcat(corpus.files.phrases),
        fetchJsonConcat(corpus.files.passages),
      ]);
      return [corpus.key, { words, phrases, passages }];
    })
  );

  report("Building the gematria index…");
  const result = {};
  for (const [key, { words, phrases, passages }] of loaded) {
    result[key] = {
      words: { items: words, values: buildIndex(words, TEXT_OF.words) },
      phrases: { items: phrases, values: buildIndex(phrases, TEXT_OF.phrases) },
      passages: { items: passages, values: buildIndex(passages, TEXT_OF.passages) },
    };
  }
  return result;
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

/**
 * A corpus file entry is normally a single path, but a large corpus can
 * split one logical dataset (e.g. a huge phrases list) across several
 * physical files — a publishing-size concern, not a data-shape one — by
 * giving an array of paths instead. Either way this returns one combined
 * array, so callers never need to know whether a corpus is sharded.
 */
async function fetchJsonConcat(pathOrPaths) {
  if (!Array.isArray(pathOrPaths)) return fetchJson(pathOrPaths);
  const parts = await Promise.all(pathOrPaths.map(fetchJson));
  return parts.flat();
}

/**
 * Builds one Int32Array holding the precomputed Standard Value for every
 * item (parallel to `items`), so a match query is a single linear scan.
 */
function buildIndex(items, getText) {
  const n = items.length;
  const values = new Int32Array(n);
  for (let i = 0; i < n; i++) values[i] = computeHechrachi(getText(items[i]));
  return values;
}

/**
 * Finds every item whose precomputed Standard Value equals `target`.
 * @returns {number[]} matching indices into the original items array
 */
export function findMatches(values, target) {
  const matches = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] === target) matches.push(i);
  }
  return matches;
}
