const HEBREW_LETTER_RE = /[א-ת]/g;

// Strips everything but Hebrew consonants (spaces, niqqud, cantillation,
// punctuation, quotes, Latin text). Preserves letter order and final forms.
export function hebrewLettersOnly(input) {
  const matches = (input || "").match(HEBREW_LETTER_RE);
  return matches ? matches.join("") : "";
}
