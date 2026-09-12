// A small, hand-verified glossary of well-known gematria values. Every word
// here is checked against computeAllHebrewCiphers in gematria.js itself (see
// the verification script referenced in the project README) so this list
// can never silently drift out of sync with what the calculator computes.
// Notes are phrased as traditional/classical observations, not assertions.
export const NOTABLE_VALUES = [
  { value: 26, cipher: "hechrachi", note: "יהוה — the Tetragrammaton, the four-letter name of God." },
  { value: 18, cipher: "hechrachi", note: "חי (\"chai\", life) — traditionally why gifts are often given in multiples of 18." },
  { value: 358, cipher: "hechrachi", note: "משיח (\"Mashiach\", Messiah) and נחש (\"nachash\", serpent) — a classical gematria teaching pairs these two." },
  { value: 86, cipher: "hechrachi", note: "אלהים (\"Elohim\", God)." },
  { value: 314, cipher: "hechrachi", note: "שדי (\"Shaddai\"), one of the traditional names of God." },
  { value: 345, cipher: "hechrachi", note: "משה (\"Moshe\", Moses)." },
  { value: 216, cipher: "hechrachi", note: "גבורה (\"Gevurah\", might) — one of the Kabbalistic sefirot." },
  { value: 70, cipher: "hechrachi", note: "יין (\"yayin\", wine) and סוד (\"sod\", secret) — source of the saying \"wine enters, a secret comes out.\"" },
  { value: 401, cipher: "hechrachi", note: "את — the Hebrew alphabet's first and last letters (א and ת), traditionally read as \"beginning and end.\"" },
  { value: 248, cipher: "hechrachi", note: "אברהם (\"Avraham\", Abraham) — traditionally also the count of positive commandments in the Torah." },
  { value: 613, cipher: "hechrachi", note: "the traditional count of the Torah's commandments (תרי״ג מצוות)." },
  { value: 32, cipher: "hechrachi", note: "לב (\"lev\", heart) — also the 32 \"paths of wisdom\" in the Sefer Yetzirah." },
  { value: 72, cipher: "hechrachi", note: "חסד (\"chesed\", lovingkindness) — also the traditional 72-fold Name of God in Kabbalah." },
  { value: 91, cipher: "hechrachi", note: "אמן (\"amen\") — equal to יהוה (26) plus אדני (65) combined, a classical Kabbalistic teaching." },
  { value: 17, cipher: "hechrachi", note: "טוב (\"tov\", good)." },
  { value: 620, cipher: "atbash", note: "the Atbash value of בבל (\"Bavel\", Babylon) — matching the Standard Value of ששך (\"Sheshach\"), the name the Atbash cipher itself produces for it in Jeremiah 25:26 and 51:41." },
];

export function findNotableValue(cipherKey, value) {
  return NOTABLE_VALUES.find((n) => n.cipher === cipherKey && n.value === value) || null;
}
