// Standard mispar hechrachi (absolute value) gematria table.
// Final forms (sofit) carry the same value as their base letter, matching
// standard practice for equal-letter-skip (ELS) calculations.
export const LETTER_VALUES = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
  "י": 10, "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80,
  "צ": 90, "ק": 100, "ר": 200, "ש": 300, "ת": 400,
  "ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90,
};

const HEBREW_LETTER_RE = /[א-ת]/g;

// Strips everything but Hebrew consonants (spaces, niqqud, cantillation,
// punctuation, quotes, Latin text). Preserves letter order and final forms.
export function hebrewLettersOnly(input) {
  const matches = (input || "").match(HEBREW_LETTER_RE);
  return matches ? matches.join("") : "";
}

export function gematria(input) {
  const letters = hebrewLettersOnly(input);
  let sum = 0;
  for (const ch of letters) sum += LETTER_VALUES[ch] || 0;
  return sum;
}
