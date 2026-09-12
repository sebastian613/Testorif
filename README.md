# Gematria Calculator

A static, browser-based app — with all instructions in English — that
calculates the **Hebrew gematria** of a name or word and finds every word,
phrase, and Tanakh (Hebrew Bible) verse that shares the same value, each
shown in its original pasuk with an aligned English translation. English
gematria is a full, equally-rigorous second mode: its words and phrases are
drawn from the King James Bible the same way the Hebrew mode draws from the
Tanakh, with the same citation-and-highlight treatment.

## How it works

### Hebrew

- **Systems** (11): Standard Value (Hechrachi), Full/Final Value (Gadol —
  final letters take large values 500–900), Ordinal Value (Siduri — position
  in the alphabet), Reduced Value (Katan — each letter reduced to a single
  digit), Integral Reduced (Katan Mispari — the word's total reduced to a
  single digit), Additive Value (Musafi — standard value plus letter count),
  Cumulative Value (Kidmi — triangular alphabet-position sums), Building
  Value (Bone'eh — a running total across the word), Squared Value (Meruba —
  each letter's value squared), and the **Atbash** and **Albam** substitution
  ciphers (each letter swapped for its mirror-alphabet partner before
  valuing — Atbash is the classic cipher behind "Sheshach" for "Babel" in
  Jeremiah). Only the 22 Hebrew letters count; niqqud (vowel points),
  cantillation marks, and punctuation are ignored.
- **Matching**: `data/hebrew-words.json` (~39,500 distinct word forms) and
  `data/hebrew-phrases.json` (~180,000 two-word phrases) are every word and
  adjacent word-pair that actually occurs in `data/tanakh.json` (all 23,213
  verses of the Masoretic Text) — so every match is indexed against all
  eleven systems on load, and every word/phrase result shows the pasuk
  (verse) it comes from: the Hebrew verse with that exact occurrence
  highlighted, cited by book/chapter/verse, plus (where available) a
  word-for-word English translation of the same verse with the corresponding
  English word(s) highlighted too. A word or phrase that occurs more than
  once shows its first occurrence plus an occurrence count. The Verses tab
  (whole-verse matches) shows that same English translation under each
  Hebrew pasuk.
- **Text source**: the Westminster Leningrad Codex, via the
  [Open Scriptures Hebrew Bible](https://github.com/openscriptures/morphhb)
  project (public domain). Verses use the Qere (traditional spoken reading)
  wherever the text has a Ketiv/Qere variant. Words/phrases are matched on
  their bare consonants (niqqud-independent) but cited and highlighted using
  the fully vocalized verse text.
- **English translation**: word-for-word glosses from
  [STEPBible's Translators Amalgamated Hebrew OT](https://github.com/STEPBible/STEPBible-Data)
  (CC BY), aligned to each Hebrew word automatically and verified before use
  (matching word count plus matching first/last word per verse). STEPBible
  annotates its own Hebrew/English verse-numbering differences inline (e.g.
  Psalm superscriptions, Genesis 32, Joel, Malachi), and those are resolved
  before matching, so ~82% of verses have a verified English alignment; the
  rest simply show the Hebrew citation alone.

### English

- **Ciphers** (9): English Ordinal (A=1…Z=26), Full Reduction, Reverse
  Ordinal (Z=1…A=26), Reverse Reduction, Sumerian (Ordinal ×6), Reverse
  Sumerian, English Extended (a Hebrew/Greek-style units-tens-hundreds
  table: A-I=1-9, J-R=10-90, S-Z=100-800), the Francis Bacon cipher
  (A=100…Z=125), and Chaldean numerology (a fixed 1-8 table with no letter
  assigned 9). Only letters A–Z are counted.
- **Matching**: `data/words.json` (~13,300 distinct word forms) and
  `data/phrases.json` (~163,000 two-word phrases) are every word and
  adjacent word-pair that actually occurs in `data/kjv.json` (the full King
  James Bible, 31,100 verses) — the same corpus-grounded, citation-and-
  highlight approach as the Hebrew mode, so every English match is just as
  rigorously sourced.

Each mode loads its own datasets on demand (Hebrew loads immediately;
English loads the first time you switch to it) and precomputes every
cipher/system value once, so typing a name is an instant lookup rather than
a live recomputation.

## Running it

Because the app loads JSON data files via `fetch`, it needs to be served over
HTTP (opening `index.html` directly as a `file://` URL will fail in most
browsers). From the project root:

```bash
npm start
```

This runs a small static file server at http://localhost:8080. Any static
server works equally well, e.g. `python3 -m http.server 8080`.

## Project layout

```
index.html               # page shell (English UI, LTR; Hebrew content is RTL inline)
style.css                 # styling (light/dark aware)
src/gematria.js            # Hebrew (11 systems) + English (9 ciphers) math
src/data.js                # dataset loading + precomputed per-cipher indexes
src/app.js                 # UI wiring, mode switching (Hebrew/English)
data/tanakh.json           # Tanakh (WLC), {ref, he, text (Hebrew), en (English)} per verse
data/hebrew-words.json     # [bareWord, [[verseIndex, heStart, heEnd, enStart, enEnd], ...]]
data/hebrew-phrases.json   # same shape, for two-word phrases from the Tanakh
data/kjv.json              # King James Bible, {ref, b, text} per verse
data/words.json            # [word, [[verseIndex, start, end], ...]] from the KJV text
data/phrases.json          # same shape, for two-word phrases from the KJV text
```

An occurrence's `enStart`/`enEnd` (Hebrew only) are `-1` when no verified
English alignment exists for that verse — the UI simply omits the
translation line in that case. English occurrences are 3-element
`[verseIndex, start, end]` since the corpus is already in English.

## Extending

- Phrases (both languages) are currently two-word spans; three-word (or
  longer) spans can be added by adjusting the n-gram lengths generated from
  the source text — the offset-based citation/highlight scheme works for any
  span length.
- Add another gematria system by extending `HE_CIPHERS`/`EN_CIPHERS` in
  `src/gematria.js` and the corresponding compute function.

## Regenerating the data

**Hebrew** — `data/tanakh.json`, `data/hebrew-words.json`, and
`data/hebrew-phrases.json` are generated from two sources, not hand-written:

1. The Open Scriptures Hebrew Bible XML — the Westminster Leningrad Codex
   (`git clone https://github.com/openscriptures/morphhb`) — parsed verse by
   verse: Ketiv/Qere pairs resolve to the Qere reading, maqqef-bound words
   join without a space, and each word's character offset within its verse's
   Hebrew display text is recorded.
2. STEPBible's Translators Amalgamated Hebrew OT
   (`git clone https://github.com/STEPBible/STEPBible-Data`) — its
   `Translators Amalgamated OT+NT/TAHOT *.txt` files give a per-word English
   gloss in Hebrew word order, keyed by verse reference. Where the English
   (KJV) and Hebrew (Masoretic) verse numbers differ — Psalm superscriptions
   counted as verse 1 in Hebrew but not English, Genesis 32, Joel, Malachi,
   etc. — STEPBible's reference includes both, e.g. `Psa.3.0(3.1)` is English
   Ps 3:0 / Hebrew Ps 3:1; parsing must key on the parenthetical Hebrew
   reference when present (falling back to the primary one otherwise) or it
   silently drops every such line. For each verse, its word count and
   first/last bare-consonant word are then compared against the Hebrew Bible
   XML's; only when both match is the verse's English gloss sequence
   trusted, cleaned up (stripping the interlinear markup, capitalizing the
   first word), and given its own character offsets the same way as the
   Hebrew text.

Every distinct bare (niqqud-stripped) word and two-word span is then emitted
with `[verseIndex, heStart, heEnd, enStart, enEnd]` for each of its
occurrences (capped at 8 per entry to bound file size; `enStart`/`enEnd` are
`-1` where no verified English alignment exists for that verse).

**English** — `data/words.json` and `data/phrases.json` are generated
directly from `data/kjv.json`: each verse's text is tokenized on `[A-Za-z]+`
(offsets taken straight from the original string, so no reconstruction is
needed the way Hebrew's morpheme-joined XML requires), then every distinct
lowercased word and two-word span is emitted with
`[verseIndex, start, end]` for each of its occurrences (capped at 8).
