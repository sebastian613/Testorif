/**
 * Generic dataset loader/indexer. A "mode" (Hebrew or English) supplies its
 * own cipher key list and a function to compute a cipher vector for a piece
 * of text; this module fetches the mode's word/phrase/verse JSON files and
 * precomputes every cipher value once so lookups are a plain array scan
 * instead of recomputing gematria on every keystroke.
 */

export async function loadModeDatasets(modeConfig, onProgress) {
  const { files, cipherKeys, computeVector, textOf } = modeConfig;
  const report = (msg) => onProgress && onProgress(msg);

  report(modeConfig.loadingLabel || "Loading data…");
  const [words, phrases, verses] = await Promise.all([
    fetchJson(files.words),
    fetchJson(files.phrases),
    fetchJson(files.verses),
  ]);

  report(modeConfig.indexingLabel || "Indexing…");
  const wordIndex = buildIndex(words, textOf.words, cipherKeys, computeVector);
  const phraseIndex = buildIndex(phrases, textOf.phrases, cipherKeys, computeVector);
  const verseIndex = buildIndex(verses, textOf.verses, cipherKeys, computeVector);

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
function buildIndex(items, getText, cipherKeys, computeVector) {
  const n = items.length;
  const values = {};
  for (const key of cipherKeys) values[key] = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const vec = computeVector(getText(items[i]));
    for (let c = 0; c < cipherKeys.length; c++) {
      values[cipherKeys[c]][i] = vec[c];
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
