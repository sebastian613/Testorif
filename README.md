# Samizdaat — Gematria Calculator

A static, browser-based app that calculates the **Standard Value** (Mispar
Hechrachi) Hebrew gematria of a name or word and finds every word, phrase,
and Tanakh (Hebrew Bible) verse that shares the same value — each one
grounded in its pasuk (verse), cited by book/chapter/verse, and shown
alongside the JPS 1917 Jewish translation. One thing, done thoroughly: there
is no other mode.

## How it works

- **System**: Standard Value (Hechrachi) — each letter's plain value
  (א=1…ת=400), added up. Only the 22 Hebrew letters count; niqqud (vowel
  points), cantillation marks, and punctuation are ignored. The value badge
  has a hover tooltip spelling out exactly how it's calculated.
- **Matching**: `data/hebrew-words.json` (~39,500 distinct word forms) and
  `data/hebrew-phrases.json` (~180,000 two-word phrases) are every word and
  adjacent word-pair that actually occurs in `data/tanakh.json` (all 23,213
  verses of the Masoretic Text) — so every match is indexed on load, and
  every word/phrase result shows the pasuk it comes from: the Hebrew verse
  with that exact occurrence highlighted, cited by book/chapter/verse, plus
  its JPS 1917 translation with the corresponding English word(s)
  highlighted too, wherever that can be identified with confidence (see
  below). A word or phrase that occurs more than once shows its first
  occurrence plus an occurrence count. The Verses tab (whole-verse matches)
  shows that same translation under each Hebrew pasuk, unhighlighted
  (there's no single word to point to).
- **Hebrew text source**: the Westminster Leningrad Codex, via the
  [Open Scriptures Hebrew Bible](https://github.com/openscriptures/morphhb)
  project (public domain). Verses use the Qere (traditional spoken reading)
  wherever the text has a Ketiv/Qere variant. Words/phrases are matched on
  their bare consonants (niqqud-independent) but cited and highlighted using
  the fully vocalized verse text.
- **English translation**: *The Holy Scriptures: A New Translation* (JPS,
  1917) — a public-domain Jewish translation of the complete Tanakh, via
  [Sefaria's data export](https://github.com/Sefaria/Sefaria-Export). Unlike
  a word-aligned interlinear gloss, this is real, published prose that
  follows the Masoretic chapter/verse numbering throughout, so it lines up
  with the Hebrew text directly for 99.7% of verses — the only exceptions
  are three chapters (Exodus 20, Numbers 25, Deuteronomy 5) where printed
  editions differ on verse splitting around the Ten Commandments.
- **English highlighting**: JPS isn't word-aligned to the Hebrew the way an
  interlinear gloss would be, so highlighting the matched word/phrase inside
  it is a heuristic, not a lookup: a separate, word-aligned interlinear
  source ([STEPBible's TAHOT](https://github.com/STEPBible/STEPBible-Data))
  supplies a rough English gloss for the specific Hebrew word(s) matched,
  and that gloss's most distinctive word is searched for in the JPS verse
  text. The highlight is only shown when that search word appears **exactly
  once** in the verse (for a phrase, both words must each be unique and land
  within ~45 characters of each other) — ambiguous or unlocatable cases
  simply show the translation unhighlighted rather than risk pointing at the
  wrong word. Candidate words also try a few regular English inflections
  (plural/singular, simple past) since the gloss's base form often isn't the
  exact form the JPS prose uses. In practice this finds a confident
  highlight for about 46% of word occurrences and 15.5% of phrase
  occurrences (phrases need two independent unique matches, so the bar is
  higher).
- **Numeral input**: a plain number (e.g. `613`) is searched exactly like a
  word or phrase's computed value — it's used directly as the target value
  (so it shows that same number under the value badge, since it wasn't
  derived from letters) rather than being spelled out and recomputed. A
  small note underneath shows how it would traditionally be written in
  Hebrew numerals (`תרי״ג`, with the customary ט״ו/ט״ז substitution for
  15/16) for reference only.
- **Notable values**: a small, hand-verified glossary (`src/notable-values.js`)
  of well-known gematria values — יהוה=26, חי=18, the traditional 613
  commandments, and a dozen others — shown as a callout when your search
  lands on one. Every entry's arithmetic is checked against the app's own
  cipher function, not just asserted, so it can't silently drift out of sync
  with what the calculator actually computes; the notes themselves are
  phrased as traditional observations, not claims.
- **Recent searches**: the last dozen searches are remembered (in
  `localStorage`, per browser) and shown as clickable chips for quick
  recall.
- **PDF export**: the "Export as PDF" button opens the browser's print
  dialog against a dedicated print stylesheet — pick "Save as PDF" for a
  clean, paginated document of the current results (the value badge plus
  the active tab's matches), with all interactive chrome hidden.

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
style.css                 # styling (light/dark aware) + print stylesheet for PDF export
src/gematria.js            # the Standard Value cipher + integer-to-Hebrew-numeral conversion
src/data.js                # dataset loading + precomputed Standard Value index
src/notable-values.js      # hand-verified glossary of well-known gematria values
src/app.js                 # UI wiring: search, tabs, recent searches, PDF export
data/tanakh.json           # Tanakh (WLC + JPS 1917), {ref, he, text (Hebrew), en (English)} per verse
data/hebrew-words.json     # [bareWord, [[verseIndex, heStart, heEnd, enStart, enEnd], ...]]
data/hebrew-phrases.json   # same shape, for two-word phrases from the Tanakh
```

An occurrence is `[verseIndex, heStart, heEnd, enStart, enEnd]`: `heStart`/
`heEnd` are character offsets into that verse's Hebrew text
(`data/tanakh.json[verseIndex].text`), used to highlight the exact
occurrence in context; `enStart`/`enEnd` are the equivalent offsets into the
verse's JPS text (`.en`), or `-1` when no confident English highlight was
found (the translation still displays, just unhighlighted).

## Extending

- Phrases are currently two-word spans; three-word (or longer) spans can be
  added by adjusting the n-gram lengths generated from the Tanakh text (see
  below) — the offset-based citation/highlight scheme works for any span
  length.
- To bring back another gematria system (Ordinal, Full/Final, Atbash, etc.),
  add a compute function to `src/gematria.js`, extend the per-item index in
  `src/data.js` to store a value per system, and rework `src/app.js`'s
  single value card back into a set you can switch between. Keep an eye on
  value range if you add a system that compounds values (e.g. a square or
  cube of the Standard Value) — a plain `Int32Array` can silently wrap
  around on long input; `Float64Array` avoids that up to 2^53.
- If you add a new "notable value," verify its arithmetic against
  `computeHechrachi` yourself before adding it to `src/notable-values.js` —
  don't take a remembered or secondhand value on faith.

## Regenerating the data

`data/tanakh.json`, `data/hebrew-words.json`, and `data/hebrew-phrases.json`
are generated from two sources, not hand-written:

1. The Open Scriptures Hebrew Bible XML — the Westminster Leningrad Codex
   (`git clone https://github.com/openscriptures/morphhb`) — parsed verse by
   verse: Ketiv/Qere pairs resolve to the Qere reading, maqqef-bound words
   join without a space, and each word's character offset within its verse's
   Hebrew display text is recorded.
2. The JPS 1917 translation from Sefaria's public GCS export
   (`https://storage.googleapis.com/sefaria-export/json/Tanakh/{category}/{book}/English/The%20Holy%20Scriptures%20A%20New%20Translation%20JPS%201917.json`,
   discoverable via `books.json` in the
   [Sefaria-Export](https://github.com/Sefaria/Sefaria-Export) repo). Its
   `text` field is chapter/verse-nested exactly like the Hebrew XML, so each
   verse is matched by simple chapter/verse position — no word-count
   heuristics needed. Before trusting a chapter, its JPS verse count is
   checked against the Hebrew XML's; the three chapters (of 929) where they
   differ are left without a translation rather than risking a misaligned
   one. A couple of verses (end of Ecclesiastes, end of Lamentations) carry
   an appended `<br><small>[...]</small>` liturgical repeat-note used only
   for public reading; that markup and its content is stripped.

Every distinct bare (niqqud-stripped) word and two-word span is then emitted
with `[verseIndex, heStart, heEnd]` for each of its occurrences (capped at 8
per entry to bound file size).

3. A separate pass adds the English highlight offsets: STEPBible's TAHOT
   (`git clone https://github.com/STEPBible/STEPBible-Data`) is parsed the
   same way as for the earlier interlinear approach (keying on its
   parenthetical Hebrew verse reference where present, then verifying word
   count and first/last word against the Hebrew XML per verse) to get a
   verified, token-aligned English gloss for ~19,150 of the 23,213 verses.
   For each stored occurrence, the gloss word(s) at that Hebrew token
   position are looked up, split into individual words (a gloss can be
   multi-word, e.g. "sheaves your" for a suffixed noun), and the most
   distinctive candidate word — trying a few regular inflections of it too
   (plural/singular, simple past) — is searched for in that verse's JPS
   text. `enStart`/`enEnd` are only set when a candidate is found as a whole
   word exactly once in the verse (for phrases, both words must be unique
   and land within 45 characters of each other); otherwise they're `-1`.
