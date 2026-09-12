# Samizdaat — Gematria Calculator

A static, browser-based app that calculates the **Standard Value** (Mispar
Hechrachi) Hebrew gematria of a name or word and finds every word, phrase,
and passage — from the Tanakh (Hebrew Bible) and the Mishnah — that shares
the same value, each one grounded in its source and, for Tanakh citations,
shown alongside the JPS 1917 Jewish translation. One thing, done thoroughly:
there is no other mode.

## How it works

- **System**: Standard Value (Hechrachi) — each letter's plain value
  (א=1…ת=400), added up. Only the 22 Hebrew letters count; niqqud (vowel
  points), cantillation marks, and punctuation are ignored. The value badge
  has a hover tooltip spelling out exactly how it's calculated.
- **Matching**: `data/hebrew-words.json` (~55,900 distinct word forms) and
  `data/hebrew-phrases.json` (~290,900 two-word phrases) are every word and
  adjacent word-pair that actually occurs across two source corpora —
  `data/tanakh.json` (all 23,213 verses of the Masoretic Text) and
  `data/mishnah.json` (all 4,192 mishnayot across all 63 tractates) —
  concatenated into one combined passage list at load time (Tanakh first,
  Mishnah appended after, so an occurrence's index either lands in the first
  23,213 slots or the ones after). Every word/phrase result shows the
  passage it comes from: the original text with that exact occurrence
  highlighted, cited by its reference, plus — for Tanakh citations — the
  JPS 1917 translation with the corresponding English word(s) highlighted
  too, wherever that can be identified with confidence (see below); Mishnah
  citations show the original Hebrew only, since no equivalently
  freely-licensed English translation is wired in yet (see **Corpora**
  below). A word or phrase that occurs more than once shows its first
  occurrence plus a combined occurrence count. The Passages tab
  (whole-passage matches) shows the same citation for an entire verse or
  mishnah, unhighlighted (there's no single word to point to).
- **Corpora**: adding a text here only ever needs two things settled first —
  is the original-language text actually public domain (rabbinic and
  biblical text always is, being centuries to millennia old), and is there a
  translation licensed for how it'll be shown/used. Tanakh's JPS 1917
  translation is fully public domain, so it's shown everywhere without
  restriction. The Mishnah's Hebrew (via Sefaria) is included for search and
  citation, but the license genuinely varies by tractate — 25 of 63 are
  CC-BY (commercial-safe), the other 38 are CC-BY-NC (free to show here,
  not for a print/commercial product) — see **Regenerating the data** below
  for the exact split; no English translation is wired in for it yet either
  way. Talmud and Zohar are natural next additions — their original text is
  equally public domain — but are both far larger than the Mishnah and, for
  the Talmud specifically, the only readily available complete English
  translation (the Steinsaltz/William Davidson Edition) is CC-BY-NC, meaning
  free to show in this app but not usable in a commercial/print product
  built from it.
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
- **Popular searches**: a collapsed-by-default disclosure below the input
  offering 50 curated numbers and 50 curated Hebrew phrases/names
  (`src/popular-searches.js`) as one-click searches — phrase values are
  verified against `computeHechrachi` the same way the notable-values
  glossary is.
- **Copy button**: every result carries a small "Copy" button that puts a
  plain-text summary (the word/phrase and its value, or the verse citation,
  plus the Hebrew text and JPS translation) on the clipboard, for pasting
  into a message, note, or email. Uses `navigator.clipboard.writeText()`
  with a legacy `execCommand("copy")` fallback, since Clipboard API access
  can itself be restricted in some embedded/sandboxed contexts.
- **Copy as Markdown**: the toolbar button builds a full Markdown write-up
  of the current search and the active tab's visible results — a heading
  per result, a blockquote per citation — and copies it the same way the
  per-result Copy button does. This replaced an earlier "Export as PDF"
  button (`window.print()`, then a `window.open()` popup, then an
  unconditional `<a target="_blank">` link — three different mechanisms,
  all silently blocked or unreliable inside a sandboxed preview embed with
  no client-side way found to detect or work around it). Markdown needs
  only the clipboard to deliver, pastes cleanly into Notion, Obsidian,
  GitHub, email, or Word, and converts to a PDF trivially with any
  Markdown-to-PDF tool downstream if one is still wanted. The print
  stylesheet (`@media print` in `style.css`) is still there for anyone
  printing via their browser's own Ctrl+P/File→Print in a real,
  non-embedded deployment — only the in-app button was the problem.

## Testing

```bash
npm install       # once, to fetch @playwright/test
npm test          # unit tests, then the e2e suite
npm run test:unit # tests/unit/*.test.mjs via node's built-in test runner —
                   # pure-logic checks (gematria math, findMatches, and that
                   # every notable-value/popular-phrase entry actually
                   # computes to the value it claims)
npm run test:e2e  # tests/e2e/*.spec.js via Playwright — drives the real
                   # served app in a browser (search, Popular Searches,
                   # Copy, Copy as Markdown)
```

CI (`.github/workflows/ci.yml`) runs both on every push and pull request.
`npm run test:e2e` auto-starts and stops its own static server
(`playwright.config.js`'s `webServer`), so nothing needs to be running
first. Several e2e specs are regression tests written for real bugs this
project hit — a `findMatches` shape mismatch that made every search
silently return zero results, and a click on the Popular Searches
disclosure landing on the wrong element because a synchronous re-render
shifted the page mid-click — specifically so those classes of bug fail CI
instead of waiting to be caught by hand again.

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
style.css                 # styling (light/dark aware) + print stylesheet for browser printing
src/gematria.js            # the Standard Value cipher + integer-to-Hebrew-numeral conversion
src/data.js                # dataset loading + precomputed Standard Value index
src/notable-values.js      # hand-verified glossary of well-known gematria values
src/popular-searches.js    # curated quick-pick numbers/phrases for the Popular Searches panel
src/app.js                 # UI wiring: search, tabs, recent/popular searches, copy, copy as markdown
assets/                    # brand mark + favicons
data/tanakh.json           # Tanakh (WLC + JPS 1917), {ref, he, text (Hebrew), en (English)} per verse
data/mishnah.json          # all 63 tractates, {ref, he, text} per mishnah — no `en`, see Corpora above
data/hebrew-words.json     # [bareWord, [[passageIndex, heStart, heEnd, enStart, enEnd], ...]]
data/hebrew-phrases.json   # same shape, for two-word phrases, across both corpora
scripts/build_mishnah.py   # fetches + builds data/mishnah.json, merges its words/phrases in
tests/unit/                # node --test: pure-logic unit tests (no browser)
tests/e2e/                 # Playwright: drives the real served app in a browser
playwright.config.js       # e2e test config (auto-starts/stops the static server)
```

An occurrence is `[passageIndex, heStart, heEnd, enStart, enEnd]` (the last
two omitted for Mishnah occurrences, which have no translation to
highlight): `passageIndex` indexes into the combined passages array
`src/data.js` builds by concatenating `tanakh.json` then `mishnah.json` at
load time — indices `0..23212` are Tanakh, `23213` and up are Mishnah.
`heStart`/`heEnd` are character offsets into that passage's Hebrew/Aramaic
text, used to highlight the exact occurrence in context; `enStart`/`enEnd`
are the equivalent offsets into the Tanakh passage's JPS text (`.en`), or
`-1` when no confident English highlight was found (the translation still
displays, just unhighlighted).

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
- If you add a new "notable value," give it a `words: [...]` field —
  `tests/unit/notable-values.test.mjs` checks every entry's `words` against
  `computeHechrachi` automatically, so a wrong value fails the test suite
  instead of sitting there unverified.
- Adding a feature? Add the regression test with it. Both real bugs this
  project shipped (the `findMatches` shape mismatch, the Popular Searches
  click race) were caught by hand, after the fact — the e2e specs written
  for them afterward are there so the *next* one like it fails CI instead.
- Adding another corpus (Talmud and Zohar are the natural next ones — see
  **Corpora** above)? `scripts/build_mishnah.py` is the template: fetch the
  Hebrew/Aramaic text into `data/<corpus>.json` in the same `{ref, he,
  text}` shape (add `en` only if a translation with a license that fits
  your use is actually available), then extract and merge its word/phrase
  occurrences into `hebrew-words.json`/`hebrew-phrases.json` the same way,
  offsetting each occurrence's passage index by the combined length of
  every corpus already in `src/data.js`'s `FILES.corpora` array (in the
  order they're listed there) before merging. Both the Talmud and the Zohar
  are much bigger than the Mishnah — expect this to be a heavier fetch/build
  job, not a quick rerun of the same script with new URLs.

## Regenerating the data

`data/mishnah.json` is generated by `scripts/build_mishnah.py`, which also
merges its word/phrase occurrences into `hebrew-words.json`/
`hebrew-phrases.json` (run it from the repo root: `python3
scripts/build_mishnah.py`; raw per-tractate fetches are cached in
`.cache/mishnah_raw/` so a re-run after a partial failure doesn't re-fetch
everything). Its source is Sefaria's public GCS export of the Mishnah's
Hebrew text — but the license is **not one blanket value for the whole
work**, and the actual split is lopsided enough to matter for anything built
commercially on top of this app: checked per-tractate against
`https://www.sefaria.org/api/texts/<title>`'s `license` field, only
**25 of the 63 tractates are CC-BY** (freely reusable, commercial included) —
essentially all of Seder Zeraim and Seder Tahorot, plus Eduyot, Avot,
Middot, and Kinnim. The other **38 (60%) are CC-BY-NC**: all of Seder Moed,
Seder Nashim, and Seder Nezikin, most of Seder Kodashim, plus Berakhot and
Niddah — free to show in this app, not usable in a print/commercial product
without swapping in a different source for those tractates specifically.
The pattern lines up with which tractates have accompanying Talmud Bavli
Gemara (digitized as part of the same Steinsaltz/Koren project) versus which
don't, which tracks with the same CC-BY-NC restriction already noted for
the Talmud translation itself.

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
