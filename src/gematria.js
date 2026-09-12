// Hebrew gematria: eleven traditional value systems. Non-letter characters
// (spaces, punctuation, niqqud, cantillation marks) are always ignored —
// only the consonantal letters of a word carry a value.

export const HE_CIPHERS = [
  {
    key: "hechrachi",
    label: "Standard Value",
    sub: "מספר הכרחי",
    formula: "Each letter's plain value (א=1…ת=400), added up.",
  },
  {
    key: "gadol",
    label: "Full/Final Value",
    sub: "מספר גדול",
    formula:
      "Like Standard Value, but the five final letters (ך ם ן ף ץ) take large values 500–900 instead of repeating their base letter's value.",
  },
  {
    key: "siduri",
    label: "Ordinal Value",
    sub: "מספר סידורי",
    formula:
      "Each letter's position in the 22-letter alphabet (1–22; final letters continue 23–27), added up.",
  },
  {
    key: "katan",
    label: "Reduced Value",
    sub: "מספר קטן",
    formula:
      "Each letter's Standard Value with trailing zeros dropped (100→1, 20→2, 6→6…), added up.",
  },
  {
    key: "katanMispari",
    label: "Integral Reduced",
    sub: "מספר קטן מספרי",
    formula:
      "The Standard Value's digits are added together, repeatedly, until a single digit remains.",
  },
  {
    key: "musafi",
    label: "Additive Value",
    sub: "מספר מוסף",
    formula: "Standard Value, plus the number of letters in the word.",
  },
  {
    key: "kidmi",
    label: "Cumulative Value",
    sub: "מספר קדמי",
    formula:
      "Each letter's value is the running total of every letter's Standard Value up to and including it, in alphabet order (א=1, ב=1+2=3, ג=1+2+3=6…) — then those are added up for the word.",
  },
  {
    key: "boneh",
    label: "Building Value",
    sub: "מספר בונה",
    formula:
      "Walking the word left to right, add a running total at each letter, then add up all those running totals — so earlier letters count extra times.",
  },
  {
    key: "perati",
    label: "Individual Squared",
    sub: "מספר פרטי",
    formula:
      "Each letter's Standard Value is squared, then those squares are added up. Also called Mispar HaMerubah HaPerati.",
  },
  {
    key: "klali",
    label: "Total Squared",
    sub: "מספר כללי",
    formula:
      "The word's total Standard Value, squared once. Also called Mispar HaMerubah HaKlali — a different (and much larger) number than Individual Squared.",
  },
  {
    key: "atbash",
    label: "Atbash Cipher",
    sub: "מספר אתב״ש",
    formula:
      "Each letter is swapped for its mirror-image partner across the alphabet (א↔ת, ב↔ש…), then that substituted letter's Standard Value is used — the cipher behind \"Sheshach\" for \"Babel\" in Jeremiah.",
  },
  {
    key: "albam",
    label: "Albam Cipher",
    sub: "מספר אלב״ם",
    formula:
      "Each letter is swapped with its counterpart in the other half of the alphabet (א↔ל, ב↔מ…), then that substituted letter's Standard Value is used.",
  },
];

export const HE_CIPHER_KEYS = HE_CIPHERS.map((c) => c.key);

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
  let perati = 0;
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
    perati += base * base;
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
    perati,
    klali: hechrachi * hechrachi,
    atbash,
    albam,
  };
}

export function computeHebrewCipherVector(text) {
  const values = computeAllHebrewCiphers(text);
  return HE_CIPHER_KEYS.map((key) => values[key]);
}

// --- Numeral input ---------------------------------------------------------

const NUMERAL_UNITS = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const NUMERAL_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
// 100, 200, 300, 400, then 400+400, 400+400+100, … for 500-900.
const NUMERAL_HUNDREDS = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];

/** Renders 1-999 as bare Hebrew numeral letters, no punctuation. */
function smallNumberToHebrewLetters(n) {
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  let out = NUMERAL_HUNDREDS[hundreds] || "";
  // 15 and 16 are traditionally written ט"ו and ט"ז instead of יה/יו,
  // which would otherwise resemble abbreviations of the divine name.
  if (rem === 15) out += "טו";
  else if (rem === 16) out += "טז";
  else {
    out += NUMERAL_TENS[Math.floor(rem / 10)] || "";
    out += NUMERAL_UNITS[rem % 10] || "";
  }
  return out;
}

/** Inserts geresh/gershayim: a single letter gets ׳ after it; multiple get ״ before the last. */
function punctuateNumeral(letters) {
  if (letters.length <= 1) return letters + "׳";
  return letters.slice(0, -1) + "״" + letters.slice(-1);
}

/**
 * Converts a positive integer into standard Hebrew numeral notation
 * (e.g. 18 -> י״ח, 15 -> ט״ו, 613 -> תרי״ג, 5784 -> ה׳תשפ״ד).
 * Returns null for input outside a sane range.
 */
export function numberToHebrewNumeral(n) {
  if (!Number.isInteger(n) || n <= 0 || n > 999999) return null;
  const thousands = Math.floor(n / 1000);
  const rem = n % 1000;
  const parts = [];
  if (thousands > 0) parts.push(punctuateNumeral(smallNumberToHebrewLetters(thousands)));
  if (rem > 0) parts.push(punctuateNumeral(smallNumberToHebrewLetters(rem)));
  if (parts.length === 0) return null;
  return parts.join("");
}
