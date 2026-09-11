# Gematria Calculator

A static, browser-based app — with all instructions in English — that
calculates the **Hebrew gematria** of a name or word and finds every word,
phrase, and Tanakh (Hebrew Bible) verse that shares the same value, each
shown in its original pasuk with an aligned English translation. English
gematria is included as a secondary, bonus mode.

## How it works

### Hebrew (primary)

- **Systems**: Mispar Hechrachi (standard value), Mispar Gadol (final letters
  get large values 500–900), Mispar Siduri (ordinal position in the alphabet),
  Mispar Katan (each letter reduced to a single digit), and Mispar Katan
  Mispari (the word's total reduced to a single digit). Only the 22 Hebrew
  letters count; niqqud (vowel points), cantillation marks, and punctuation
  are ignored.
- **Matching**: `data/hebrew-words.json` (~39,500 distinct word forms) and
  `data/hebrew-phrases.json` (~180,000 two-word phrases) are every word and
  adjacent word-pair that actually occurs in `data/tanakh.json` (all 23,213
  verses of the Masoretic Text) — so every match is indexed against all five
  systems on load, and every word/phrase result shows the pasuk (verse) it
  comes from: the Hebrew verse with that exact occurrence highlighted, cited
  by book/chapter/verse, plus (where available) a word-for-word English
  translation of the same verse with the corresponding English word(s)
  highlighted too. A word or phrase that occurs more than once shows its
  first occurrence plus an occurrence count.
- **Text source**: the Westminster Leningrad Codex, via the
  [Open Scriptures Hebrew Bible](https://github.com/openscriptures/morphhb)
  project (public domain). Verses use the Qere (traditional spoken reading)
  wherever the text has a Ketiv/Qere variant. Words/phrases are matched on
  their bare consonants (niqqud-independent) but cited and highlighted using
  the fully vocalized verse text.
- **English translation**: word-for-word glosses from
  [STEPBible's Translators Amalgamated Hebrew OT](https://github.com/STEPBible/STEPBible-Data)
  (CC BY), aligned to each Hebrew word automatically and verified before use
  (matching word count plus matching first/last word per verse) — so a
  minority of verses (~25%, mostly where Hebrew and English Bibles number
  verses differently, e.g. Psalm superscriptions) don't have a verified
  English alignment and simply show the Hebrew citation alone.

### English (secondary/bonus)

- **Ciphers**: English Ordinal (A=1…Z=26), Full Reduction, Reverse Ordinal
  (Z=1…A=26), Reverse Reduction, Sumerian (Ordinal ×6), and Reverse Sumerian.
- **Matching**: `data/words.json` (~370k English words), `data/phrases.json`
  (curated idioms/quotes/names), and `data/kjv.json` (King James Bible).

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
src/gematria.js            # Hebrew + English cipher math
src/data.js                # dataset loading + precomputed per-cipher indexes
src/app.js                 # UI wiring, mode switching (Hebrew/English)
data/tanakh.json           # Tanakh (WLC), {ref, he, text (Hebrew), en (English)} per verse
data/hebrew-words.json     # [bareWord, [[verseIndex, heStart, heEnd, enStart, enEnd], ...]]
data/hebrew-phrases.json   # same shape, for two-word phrases from the Tanakh
data/words.json            # English word list
data/phrases.json          # curated English idioms, quotes, and names
data/kjv.json              # King James Bible, flattened to {ref, b, text} per verse
```

An occurrence's `enStart`/`enEnd` are `-1` when no verified English alignment
exists for that verse — the UI simply omits the translation line in that case.

## Extending

- Hebrew phrases are currently two-word spans; three-word (or longer) spans
  can be added by adjusting the n-gram lengths generated from the Tanakh
  text (see the parsing notes below) — the offset-based citation/highlight
  scheme works for any span length.
- Add more entries to `data/phrases.json` (a plain JSON array of strings) to
  broaden English phrase matches.
- Add another gematria system by extending `HE_CIPHERS`/`EN_CIPHERS` in
  `src/gematria.js` and the corresponding compute function.

## Regenerating the Hebrew data

`data/tanakh.json`, `data/hebrew-words.json`, and `data/hebrew-phrases.json`
are generated from two sources, not hand-written:

1. The Open Scriptures Hebrew Bible XML — the Westminster Leningrad Codex
   (`git clone https://github.com/openscriptures/morphhb`) — parsed verse by
   verse: Ketiv/Qere pairs resolve to the Qere reading, maqqef-bound words
   join without a space, and each word's character offset within its verse's
   Hebrew display text is recorded.
2. STEPBible's Translators Amalgamated Hebrew OT
   (`git clone https://github.com/STEPBible/STEPBible-Data`) — its
   `Translators Amalgamated OT+NT/TAHOT *.txt` files give a per-word English
   gloss in Hebrew word order. For each verse, its word count and first/last
   bare-consonant word are compared against the Hebrew Bible XML's; only when
   both match is the verse's English gloss sequence trusted, cleaned up
   (stripping the interlinear markup), and given its own character offsets
   the same way as the Hebrew text.

Every distinct bare (niqqud-stripped) word and two-word span is then emitted
with `[verseIndex, heStart, heEnd, enStart, enEnd]` for each of its
occurrences (capped at 8 per entry to bound file size; `enStart`/`enEnd` are
`-1` where no verified English alignment exists for that verse).
