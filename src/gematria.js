// Hebrew gematria (primary) and English gematria (secondary) cipher systems.
// Non-letter characters (spaces, punctuation, niqqud, cantillation marks) are
// always ignored — only the consonantal letters of a word carry a value.

export const HE_CIPHERS = [
  { key: "hechrachi", label: "מספר הכרחי", sub: "Standard Value" },
  { key: "gadol", label: "מספר גדול", sub: "Full/Final Value" },
  { key: "siduri", label: "מספר סידורי", sub: "Ordinal Value" },
  { key: "katan", label: "מספר קטן", sub: "Reduced Value" },
  { key: "katanMispari", label: "מספר קטן מספרי", sub: "Integral Reduced" },
];

export const EN_CIPHERS = [
  { key: "ordinal", label: "English Ordinal" },
  { key: "reduction", label: "Full Reduction" },
  { key: "reverse", label: "Reverse Ordinal" },
  { key: "reverseReduction", label: "Reverse Reduction" },
  { key: "sumerian", label: "Sumerian" },
  { key: "reverseSumerian", label: "Reverse Sumerian" },
];

export const HE_CIPHER_KEYS = HE_CIPHERS.map((c) => c.key);
export const EN_CIPHER_KEYS = EN_CIPHERS.map((c) => c.key);

// --- Hebrew --------------------------------------------------------------

// Mispar Hechrachi (Standard/Absolute Value). Final letters share their
// base letter's value, per the traditional convention.
const HECHRACHI = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
  "י": 10, "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80, "צ": 90,
  "ק": 100, "ר": 200, "ש": 300, "ת": 400,
  "ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90,
};

// Mispar Gadol (Full/Large Value): final letters get their own large values.
const GADOL_FINAL = { "ך": 500, "ם": 600, "ן": 700, "ף": 800, "ץ": 900 };

// Mispar Siduri (Ordinal Value): position in the 22-letter alphabet;
// final letters continue the sequence at 23-27.
const SIDURI = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
  "כ": 11, "ל": 12, "מ": 13, "נ": 14, "ס": 15, "ע": 16, "פ": 17, "צ": 18,
  "ק": 19, "ר": 20, "ש": 21, "ת": 22,
  "ך": 23, "ם": 24, "ן": 25, "ף": 26, "ץ": 27,
};

function digitalRoot(n) {
  if (n <= 0) return 0;
  const r = n % 9;
  return r === 0 ? 9 : r;
}

/** True for any of the 22 Hebrew letters (including final forms). */
export function isHebrewLetter(ch) {
  return Object.prototype.hasOwnProperty.call(HECHRACHI, ch);
}

/** Strips niqqud, cantillation marks, and punctuation, keeping only letters. */
export function stripToHebrewLetters(text) {
  let out = "";
  for (const ch of text) if (isHebrewLetter(ch)) out += ch;
  return out;
}

export function computeAllHebrewCiphers(text) {
  let hechrachi = 0;
  let gadol = 0;
  let siduri = 0;
  let katan = 0;

  for (const ch of text) {
    const base = HECHRACHI[ch];
    if (base === undefined) continue; // skip niqqud, spaces, punctuation, non-Hebrew
    hechrachi += base;
    gadol += GADOL_FINAL[ch] ?? base;
    siduri += SIDURI[ch];
    katan += digitalRoot(base);
  }

  return { hechrachi, gadol, siduri, katan, katanMispari: digitalRoot(hechrachi) };
}

export function computeHebrewCipherVector(text) {
  const values = computeAllHebrewCiphers(text);
  return HE_CIPHER_KEYS.map((key) => values[key]);
}

// --- English (secondary feature) -----------------------------------------

export function computeAllEnglishCiphers(text) {
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

export function computeEnglishCipherVector(text) {
  const values = computeAllEnglishCiphers(text);
  return EN_CIPHER_KEYS.map((key) => values[key]);
}
