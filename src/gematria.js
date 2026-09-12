// Hebrew gematria: Mispar Hechrachi, the Standard Value. Non-letter
// characters (spaces, punctuation, niqqud, cantillation marks) are always
// ignored — only the consonantal letters of a word carry a value.

export const HECHRACHI_INFO = {
  label: "Standard Value",
  sub: "מספר הכרחי",
  formula: "Each letter's plain value (א=1…ת=400), added up.",
};

// Mispar Hechrachi (Standard/Absolute Value). Final letters share their
// base letter's value, per the traditional convention.
const HECHRACHI = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
  "י": 10, "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80, "צ": 90,
  "ק": 100, "ר": 200, "ש": 300, "ת": 400,
  "ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90,
};

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

/** Sums the Standard Value of every Hebrew letter in `text`. */
export function computeHechrachi(text) {
  let total = 0;
  for (const ch of text) {
    const base = HECHRACHI[ch];
    if (base === undefined) continue; // skip niqqud, spaces, punctuation, non-Hebrew
    total += base;
  }
  return total;
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
