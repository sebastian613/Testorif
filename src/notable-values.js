// A small, hand-verified glossary of well-known Standard Value gematria
// values. Every entry here is checked against computeHechrachi in
// gematria.js itself so this list can never silently drift out of sync with
// what the calculator computes. Notes are phrased as traditional/classical
// observations, not assertions.
// `words` lists every Hebrew word the note claims equals `value` — it exists
// so tests/unit/notable-values.test.mjs can mechanically re-verify that
// claim against computeHechrachi, instead of trusting the prose. Keep this
// field in sync whenever a note's wording changes.
export const NOTABLE_VALUES = [
  { value: 26, words: ["יהוה"], note: "יהוה — the Tetragrammaton, the four-letter name of God." },
  { value: 18, words: ["חי"], note: "חי (\"chai\", life) — traditionally why gifts are often given in multiples of 18." },
  { value: 358, words: ["משיח", "נחש"], note: "משיח (\"Mashiach\", Messiah) and נחש (\"nachash\", serpent) — a classical gematria teaching pairs these two." },
  { value: 86, words: ["אלהים"], note: "אלהים (\"Elohim\", God)." },
  { value: 314, words: ["שדי"], note: "שדי (\"Shaddai\"), one of the traditional names of God." },
  { value: 345, words: ["משה"], note: "משה (\"Moshe\", Moses)." },
  { value: 216, words: ["גבורה"], note: "גבורה (\"Gevurah\", might) — one of the Kabbalistic sefirot." },
  { value: 70, words: ["יין", "סוד"], note: "יין (\"yayin\", wine) and סוד (\"sod\", secret) — source of the saying \"wine enters, a secret comes out.\"" },
  { value: 401, words: ["את"], note: "את — the Hebrew alphabet's first and last letters (א and ת), traditionally read as \"beginning and end.\"" },
  { value: 248, words: ["אברהם"], note: "אברהם (\"Avraham\", Abraham) — traditionally also the count of positive commandments in the Torah." },
  { value: 613, words: ["תריג"], note: "the traditional count of the Torah's commandments (תרי״ג מצוות)." },
  { value: 32, words: ["לב"], note: "לב (\"lev\", heart) — also the 32 \"paths of wisdom\" in the Sefer Yetzirah." },
  { value: 72, words: ["חסד"], note: "חסד (\"chesed\", lovingkindness) — also the traditional 72-fold Name of God in Kabbalah." },
  { value: 91, words: ["אמן"], note: "אמן (\"amen\") — equal to יהוה (26) plus אדני (65) combined, a classical Kabbalistic teaching." },
  { value: 17, words: ["טוב"], note: "טוב (\"tov\", good)." },
];

export function findNotableValue(value) {
  return NOTABLE_VALUES.find((n) => n.value === value) || null;
}
