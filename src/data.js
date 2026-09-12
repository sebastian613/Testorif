import { HE_CIPHER_KEYS, computeHebrewCipherVector } from "./gematria.js";

const FILES = {
  words: "data/hebrew-words.json",
  phrases: "data/hebrew-phrases.json",
  verses: "data/tanakh.json",
};

const TEXT_OF = {
  words: (item) => item[0],
  phrases: (item) => item[0],
  verses: (v) => v.text,
};

export { TEXT_OF as textOf };

/**
 * Loads the word/phrase/verse datasets and precomputes gematria values for
 * every cipher so lookups are a simple array scan instead of recomputing
 * gematria on every keystroke.
 */
export async function loadDatasets(onProgress) {
  const report = (msg) => onProgress && onProgress(msg);

  report("Loading the Hebrew word list and the Tanakh…");
  const [words, phrases, verses] = await Promise.all([
    fetchJson(FILES.words),
    fetchJson(FILES.phrases),
    fetchJson(FILES.verses),
  ]);

  report("Building the gematria index…");
  const wordIndex = buildIndex(words, TEXT_OF.words);
  const phraseIndex = buildIndex(phrases, TEXT_OF.phrases);
  const verseIndex = buildIndex(verses, TEXT_OF.verses);

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
  for (const key of HE_CIPHER_KEYS) values[key] = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const vec = computeHebrewCipherVector(getText(items[i]));
    for (let c = 0; c < HE_CIPHER_KEYS.length; c++) {
      values[HE_CIPHER_KEYS[c]][i] = vec[c];
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
