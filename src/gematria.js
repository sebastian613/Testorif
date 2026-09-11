// Standard English gematria ciphers, as used by common gematria calculators.
// Only letters A-Z are counted; everything else (spaces, punctuation, digits) is ignored.

export const CIPHERS = [
  { key: "ordinal", label: "English Ordinal" },
  { key: "reduction", label: "Full Reduction" },
  { key: "reverse", label: "Reverse Ordinal" },
  { key: "reverseReduction", label: "Reverse Reduction" },
  { key: "sumerian", label: "Sumerian" },
  { key: "reverseSumerian", label: "Reverse Sumerian" },
];

// Order matches CIPHERS above; used for fast typed-array indexing.
export const CIPHER_KEYS = CIPHERS.map((c) => c.key);

/**
 * Compute every cipher value for a string in a single pass.
 * @param {string} text
 * @returns {Record<string, number>}
 */
export function computeAllCiphers(text) {
  let ordinal = 0;
  let reduction = 0;
  let reverse = 0;
  let reverseReduction = 0;
  let sumerian = 0;
  let reverseSumerian = 0;

  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i);
    if (code < 65 || code > 90) continue; // skip non A-Z
    const ord = code - 64; // A=1 .. Z=26
    const rev = 27 - ord; // Z=1 .. A=26

    ordinal += ord;
    reverse += rev;
    reduction += ((ord - 1) % 9) + 1;
    reverseReduction += ((rev - 1) % 9) + 1;
    sumerian += ord * 6;
    reverseSumerian += rev * 6;
  }

  return { ordinal, reduction, reverse, reverseReduction, sumerian, reverseSumerian };
}

/** Same as computeAllCiphers but returns values in CIPHER_KEYS order as a plain array. */
export function computeCipherVector(text) {
  const values = computeAllCiphers(text);
  return CIPHER_KEYS.map((key) => values[key]);
}
