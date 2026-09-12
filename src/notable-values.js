// A small, hand-verified glossary of well-known Standard Value gematria
// values. Every entry here is checked against computeHechrachi in
// gematria.js itself so this list can never silently drift out of sync with
// what the calculator computes. Notes are phrased as traditional/classical
// observations, not assertions.
export const NOTABLE_VALUES = [
  { value: 26, note: "יהוה — the Tetragrammaton, the four-letter name of God." },
  { value: 18, note: "חי (\"chai\", life) — traditionally why gifts are often given in multiples of 18." },
  { value: 358, note: "משיח (\"Mashiach\", Messiah) and נחש (\"nachash\", serpent) — a classical gematria teaching pairs these two." },
  { value: 86, note: "אלהים (\"Elohim\", God)." },
  { value: 314, note: "שדי (\"Shaddai\"), one of the traditional names of God." },
  { value: 345, note: "משה (\"Moshe\", Moses)." },
  { value: 216, note: "גבורה (\"Gevurah\", might) — one of the Kabbalistic sefirot." },
  { value: 70, note: "יין (\"yayin\", wine) and סוד (\"sod\", secret) — source of the saying \"wine enters, a secret comes out.\"" },
  { value: 401, note: "את — the Hebrew alphabet's first and last letters (א and ת), traditionally read as \"beginning and end.\"" },
  { value: 248, note: "אברהם (\"Avraham\", Abraham) — traditionally also the count of positive commandments in the Torah." },
  { value: 613, note: "the traditional count of the Torah's commandments (תרי״ג מצוות)." },
  { value: 32, note: "לב (\"lev\", heart) — also the 32 \"paths of wisdom\" in the Sefer Yetzirah." },
  { value: 72, note: "חסד (\"chesed\", lovingkindness) — also the traditional 72-fold Name of God in Kabbalah." },
  { value: 91, note: "אמן (\"amen\") — equal to יהוה (26) plus אדני (65) combined, a classical Kabbalistic teaching." },
  { value: 17, note: "טוב (\"tov\", good)." },
];

export function findNotableValue(value) {
  return NOTABLE_VALUES.find((n) => n.value === value) || null;
}
