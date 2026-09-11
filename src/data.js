import { CIPHER_KEYS, computeCipherVector } from "./gematria.js";

/**
 * Loads the word/phrase/verse datasets and precomputes gematria values for
 * every cipher so lookups are a simple array scan instead of recomputing
 * gematria on every keystroke.
 */
export async function loadDatasets(onProgress) {
  const report = (msg) => onProgress && onProgress(msg);

  report("Loading words…");
  const [words, phrases, verses] = await Promise.all([
    fetchJson("data/words.json"),
    fetchJson("data/phrases.json"),
    fetchJson("data/kjv.json"),
  ]);

  report("Indexing words…");
  const wordIndex = buildIndex(words, (w) => w);

  report("Indexing phrases…");
  const phraseIndex = buildIndex(phrases, (p) => p);

  report("Indexing Bible verses…");
  const verseIndex = buildIndex(verses, (v) => v.text);

  return {
    words: { items: words, ...wordIndex },
    phrases: { items: phrases, ...phraseIndex },
    verses: { items: verses, ...verseIndex },
  };
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

/**
 * Builds one Int32Array per cipher holding the precomputed value for every
 * item (parallel to `items`), so a match query is a single linear scan.
 */
function buildIndex(items, getText) {
  const n = items.length;
  const values = {};
  for (const key of CIPHER_KEYS) values[key] = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const vec = computeCipherVector(getText(items[i]));
    for (let c = 0; c < CIPHER_KEYS.length; c++) {
      values[CIPHER_KEYS[c]][i] = vec[c];
    }
  }

  return { values };
}

/**
 * Finds every item whose precomputed value for `cipherKey` equals `target`.
 * @returns {number[]} matching indices into the original items array
 */
export function findMatches(index, cipherKey, target) {
  const arr = index.values[cipherKey];
  const matches = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) matches.push(i);
  }
  return matches;
}
