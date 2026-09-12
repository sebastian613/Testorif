// Hebrew gematria (primary) and English gematria (secondary) cipher systems.
// Non-letter characters (spaces, punctuation, niqqud, cantillation marks) are
// always ignored — only the consonantal letters of a word carry a value.

export const HE_CIPHERS = [
  { key: "hechrachi", label: "Standard Value", sub: "מספר הכרחי" },
  { key: "gadol", label: "Full/Final Value", sub: "מספר גדול" },
  { key: "siduri", label: "Ordinal Value", sub: "מספר סידורי" },
  { key: "katan", label: "Reduced Value", sub: "מספר קטן" },
  { key: "katanMispari", label: "Integral Reduced", sub: "מספר קטן מספרי" },
  { key: "musafi", label: "Additive Value", sub: "מספר מוסף" },
  { key: "kidmi", label: "Cumulative Value", sub: "מספר קדמי" },
  { key: "boneh", label: "Building Value", sub: "מספר בונה" },
  { key: "meruba", label: "Squared Value", sub: "מספר מרובע" },
  { key: "atbash", label: "Atbash Cipher", sub: "מספר אתב״ש" },
  { key: "albam", label: "Albam Cipher", sub: "מספר אלב״ם" },
];

export const EN_CIPHERS = [
  { key: "ordinal", label: "English Ordinal" },
  { key: "reduction", label: "Full Reduction" },
  { key: "reverse", label: "Reverse Ordinal" },
  { key: "reverseReduction", label: "Reverse Reduction" },
  { key: "sumerian", label: "Sumerian" },
  { key: "reverseSumerian", label: "Reverse Sumerian" },
  { key: "extended", label: "English Extended" },
  { key: "bacon", label: "Francis Bacon" },
  { key: "chaldean", label: "Chaldean" },
];

export const HE_CIPHER_KEYS = HE_CIPHERS.map((c) => c.key);
export const EN_CIPHER_KEYS = EN_CIPHERS.map((c) => c.key);

// --- Hebrew --------------------------------------------------------------

// The 22-letter alphabet in order, used for Siduri, Kidmi, Atbash, and Albam.
const ALPHABET = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל","מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"];

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

// Final letters resolve to their base letter for the alphabet-position-based
// systems below (Kidmi, Atbash, Albam) — the same convention Hechrachi uses.
const FINAL_TO_BASE = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

const ALPHABET_INDEX = {};
ALPHABET.forEach((ch, i) => (ALPHABET_INDEX[ch] = i));

// Mispar Kidmi (Cumulative/Triangular Value): each letter's value is the sum
// of every standard value up to and including its own position in the
// alphabet (Alef=1, Bet=1+2=3, Gimel=1+2+3=6, …).
const KIDMI_CUMULATIVE = (() => {
  const out = [];
  let running = 0;
  for (const ch of ALPHABET) {
    running += HECHRACHI[ch];
    out.push(running);
  }
  return out;
})();

// Atbash: mirror the alphabet (Alef<->Tav, Bet<->Shin, …), then take the
// substituted letter's standard value.
const ATBASH_SUB = {};
ALPHABET.forEach((ch, i) => (ATBASH_SUB[ch] = ALPHABET[ALPHABET.length - 1 - i]));

// Albam: swap each half of the alphabet with the other (Alef<->Lamed, …).
const ALBAM_SUB = {};
ALPHABET.forEach((ch, i) => (ALBAM_SUB[ch] = ALPHABET[(i + 11) % 22]));

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
  let kidmi = 0;
  let atbash = 0;
  let albam = 0;
  let meruba = 0;
  let boneh = 0;
  let runningBoneh = 0;
  let letterCount = 0;

  for (const ch of text) {
    const base = HECHRACHI[ch];
    if (base === undefined) continue; // skip niqqud, spaces, punctuation, non-Hebrew
    letterCount += 1;
    hechrachi += base;
    gadol += GADOL_FINAL[ch] ?? base;
    siduri += SIDURI[ch];
    katan += digitalRoot(base);
    meruba += base * base;
    runningBoneh += base;
    boneh += runningBoneh;

    const root = FINAL_TO_BASE[ch] ?? ch;
    const idx = ALPHABET_INDEX[root];
    kidmi += KIDMI_CUMULATIVE[idx];
    atbash += HECHRACHI[ATBASH_SUB[root]];
    albam += HECHRACHI[ALBAM_SUB[root]];
  }

  return {
    hechrachi,
    gadol,
    siduri,
    katan,
    katanMispari: digitalRoot(hechrachi),
    musafi: hechrachi + letterCount,
    kidmi,
    boneh,
    meruba,
    atbash,
    albam,
  };
}

export function computeHebrewCipherVector(text) {
  const values = computeAllHebrewCiphers(text);
  return HE_CIPHER_KEYS.map((key) => values[key]);
}

// --- English (secondary feature) -----------------------------------------

// English Extended: mirrors the units/tens/hundreds pattern of Hebrew and
// Greek numerals — A-I = 1-9, J-R = 10-90 (by tens), S-Z = 100-800 (by
// hundreds).
const EXTENDED = {};
"ABCDEFGHI".split("").forEach((ch, i) => (EXTENDED[ch] = i + 1));
"JKLMNOPQR".split("").forEach((ch, i) => (EXTENDED[ch] = (i + 1) * 10));
"STUVWXYZ".split("").forEach((ch, i) => (EXTENDED[ch] = (i + 1) * 100));

// Chaldean numerology: a fixed 1-8 table (9 is traditionally never assigned).
const CHALDEAN = {};
[
  [1, "AIJQY"],
  [2, "BKR"],
  [3, "CGLS"],
  [4, "DMT"],
  [5, "EHNX"],
  [6, "UVW"],
  [7, "OZ"],
  [8, "FP"],
].forEach(([value, letters]) => {
  for (const ch of letters) CHALDEAN[ch] = value;
});

export function computeAllEnglishCiphers(text) {
  let ordinal = 0;
  let reduction = 0;
  let reverse = 0;
  let reverseReduction = 0;
  let sumerian = 0;
  let reverseSumerian = 0;
  let extended = 0;
  let bacon = 0;
  let chaldean = 0;

  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i);
    if (code < 65 || code > 90) continue; // skip non A-Z
    const ch = upper[i];
    const ord = code - 64; // A=1 .. Z=26
    const rev = 27 - ord; // Z=1 .. A=26

    ordinal += ord;
    reverse += rev;
    reduction += ((ord - 1) % 9) + 1;
    reverseReduction += ((rev - 1) % 9) + 1;
    sumerian += ord * 6;
    reverseSumerian += rev * 6;
    extended += EXTENDED[ch];
    bacon += ord + 99;
    chaldean += CHALDEAN[ch] ?? 0;
  }

  return {
    ordinal,
    reduction,
    reverse,
    reverseReduction,
    sumerian,
    reverseSumerian,
    extended,
    bacon,
    chaldean,
  };
}

export function computeEnglishCipherVector(text) {
  const values = computeAllEnglishCiphers(text);
  return EN_CIPHER_KEYS.map((key) => values[key]);
}
