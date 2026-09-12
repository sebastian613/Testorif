import { computeHechrachi } from "./gematria.js";

const FILES = {
  words: "data/hebrew-words.json",
  phrases: "data/hebrew-phrases.json",
  // Passage corpora, concatenated in this order into one combined array.
  // Word/phrase occurrences store an index into that combined array, so
  // this order must never change without regenerating hebrew-words.json
  // and hebrew-phrases.json to match.
  corpora: ["data/tanakh.json", "data/mishnah.json"],
};

const TEXT_OF = {
  words: (item) => item[0],
  phrases: (item) => item[0],
  passages: (p) => p.text,
};

export { TEXT_OF as textOf };

/**
 * Loads the word/phrase/passage datasets and precomputes each item's
 * Standard Value so lookups are a simple array scan instead of recomputing
 * gematria on every keystroke.
 */
export async function loadDatasets(onProgress) {
  const report = (msg) => onProgress && onProgress(msg);

  report("Loading the Hebrew word list and source texts…");
  const [words, phrases, ...corpora] = await Promise.all([
    fetchJson(FILES.words),
    fetchJson(FILES.phrases),
    ...FILES.corpora.map(fetchJson),
  ]);
  const passages = corpora.flat();

  report("Building the gematria index…");
  return {
    words: { items: words, values: buildIndex(words, TEXT_OF.words) },
    phrases: { items: phrases, values: buildIndex(phrases, TEXT_OF.phrases) },
    passages: { items: passages, values: buildIndex(passages, TEXT_OF.passages) },
  };
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
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
