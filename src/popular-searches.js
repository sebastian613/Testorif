// Curated quick-pick searches shown as an always-available "Popular
// searches" disclosure, separate from the user's own Recent Searches.
// Numbers are plain integers searched directly as a target Standard Value;
// phrases are verified against computeHechrachi (see README) before being
// added here, the same discipline src/notable-values.js follows.

export const POPULAR_NUMBERS = [
  // Torah / mitzvot & sacred counts
  613, 248, 365, 401, 10, 12, 5, 4, 3, 1,
  // Names of God / core Kabbalah
  26, 86, 314, 65, 91, 72, 42, 216,
  // Chai & multiples / folk numerology
  18, 36, 22, 17, 13, 358, 345, 14, 32, 45, 52,
  // Time & ritual counts
  6, 7, 8, 9, 15, 30, 40, 49, 50, 70, 71,
  // Biblical lifespans & narrative numbers
  120, 137, 147, 150, 175, 180, 318,
  // Popular / pop-culture curiosity searches
  100, 666, 770,
];

export const POPULAR_PHRASES = [
  // Names of God
  "יהוה", "אלהים", "אדני", "שדי", "אהיה אשר אהיה",
  // Core concepts
  "משיח", "תורה", "ישראל", "ירושלים", "ציון", "שלום", "אהבה", "חיים", "אמת", "אמונה", "אמן",
  // The ten Sefirot (Kabbalah)
  "חכמה", "בינה", "דעת", "חסד", "גבורה", "תפארת", "נצח", "הוד", "יסוד", "מלכות", "כתר",
  // Other classical terms
  "שכינה", "נשמה", "רוח הקדש",
  // Places & institutions
  "בית המקדש",
  // Festivals & sacred time
  "שבת", "פסח", "ראש השנה", "יום כיפור", "סוכות", "חנוכה",
  // Patriarchs, matriarchs & prophets
  "אברהם", "יצחק", "יעקב", "שרה", "רבקה", "רחל", "לאה", "משה", "אהרן", "דוד", "שלמה", "אליהו",
  // Liturgy
  "שמע ישראל",
];
