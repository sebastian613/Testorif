# Samizdaat — Gematria Calculator

A static, browser-based app that calculates the **Standard Value** (Mispar
Hechrachi) Hebrew gematria of a name or word and finds every word, phrase,
and passage that shares the same value in a source text of your choosing —
the Tanakh (Hebrew Bible), the Mishnah, or Rambam's Mishneh Torah, searched
one at a time rather than blended together — each one grounded in its
source and, for Tanakh citations, shown alongside the JPS 1917 Jewish
translation. One thing, done thoroughly: there is no other mode.

## How it works

- **System**: Standard Value (Hechrachi) — each letter's plain value
  (א=1…ת=400), added up. Only the 22 Hebrew letters count; niqqud (vowel
  points), cantillation marks, and punctuation are ignored. The value badge
  has a hover tooltip spelling out exactly how it's calculated.
- **Corpora**: three so far — **Tanakh**, **Mishnah**, and **Mishneh
  Torah** — searched one at a time, chosen with the tabs above the results.
  They're kept fully independent on purpose, not blended into one combined
  result list: each has its own word/phrase/passage index
  (`data/hebrew-words.json` + `data/hebrew-phrases.json` +
  `data/tanakh.json` for Tanakh; `data/mishnah-words.json` +
  `data/mishnah-phrases.json` + `data/mishnah.json` for Mishnah;
  `data/mishneh-torah-words.json` + `data/mishneh-torah-phrases.json` +
  `data/mishneh-torah.json` for Mishneh Torah), and an occurrence's index is
  always local to its own corpus's passage list — nothing to offset,
  nothing coupling any of them together. `src/data.js`'s `CORPORA` array is
  the whole of what "supporting a corpus" means to the app; adding another
  is adding another entry there plus the three files it points to (see
  **Extending** below).
- **Matching**: within whichever corpus is selected, every word and
  adjacent word-pair that actually occurs in it is indexed on load —
  ~39,500 distinct word forms and ~180,700 two-word phrases for Tanakh's
  23,213 verses; ~24,000 words and ~110,000 phrases for the Mishnah's 4,187
  mishnayot across all 63 tractates; ~50,800 words and ~398,300 phrases for
  Mishneh Torah's 14,622 halachot across 79 treatises (see **Licensing**
  below for why 79 and not all 88). Every word/phrase result shows the
  passage it comes from: the original text with that exact occurrence
  highlighted, cited by its reference, plus — for Tanakh citations — the
  JPS 1917 translation with the corresponding English word(s) highlighted
  too, wherever that can be identified with confidence (see below); Mishnah
  and Mishneh Torah citations show the original Hebrew only, since no
  equivalently freely-licensed English translation is wired in yet. A word
  or phrase that occurs more than once shows its first occurrence plus an
  occurrence count. The Passages tab (whole-passage matches) shows the same
  citation for an entire verse, mishnah, or halacha, unhighlighted (there's
  no single word to point to).
- **Licensing, per corpus**: adding a text here only ever needs two things
  settled first — is the original-language text actually public domain
  (rabbinic and biblical text always is, being centuries to millennia old),
  and is there a translation licensed for how it'll be shown/used. Tanakh's
  JPS 1917 translation is fully public domain, so it's shown everywhere
  without restriction. The Mishnah's Hebrew is Sefaria's "Torat Emet 357"
  version specifically — checked **Public Domain across every one of the 63
  tractates**, unlike Sefaria's own default/"merged" text for the same
  tractates, which turned out to be CC-BY-NC for 38 of them (see
  **Regenerating the data** below for how that was found and worked
  around). Mishneh Torah turned out to be split across *two* independently
  licensed editions, and neither covers the whole work: "Torat Emet 363"
  is Public Domain for 72 of its 88 treatises (all of Sefer Madda, plus
  everything from Sefer Zemanim through Sefer Shoftim), and "Torat Emet
  370" — the edition covering Sefer Ahavah — is Public Domain for only 2 of
  its 7 treatises (Reading the Shema; Prayer and the Priestly Blessing).
  That leaves 9 of the 88 treatises out of this corpus entirely: 4
  introductory list-books (Transmission of the Oral Law, Positive Mitzvot,
  Negative Mitzvot, Overview of Contents) and 5 of Sefer Ahavah's remaining
  6 (Tefillin/Mezuzah/Torah Scroll, Fringes, Blessings, Circumcision, The
  Order of Prayer) — every Hebrew version Sefaria lists for those 9 is
  either CC-BY-SA or license `"unknown"`, checked directly per treatise via
  `scripts/build_mishneh_torah.py`, not assumed from a spot check. No
  English translation is wired in for the Mishnah or Mishneh Torah yet
  either way. Talmud and Zohar are natural next corpora — their original
  text is equally public domain — but both are far larger than Mishneh
  Torah, and for the Talmud specifically, the only readily available
  complete English translation (the Steinsaltz/William Davidson Edition) is
  CC-BY-NC, meaning free to show in this app but not usable in a
  commercial/print product built from it — the same kind of per-version
  check that solved the Mishnah's and (mostly) Mishneh Torah's licensing
  may or may not turn up a public-domain Talmud translation too; that
  hasn't been checked yet.
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
                   # served app in a browser (search, switching corpus,
                   # Popular Searches, Copy, Copy as Markdown)
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
data/hebrew-words.json     # Tanakh words: [bareWord, [[passageIndex, heStart, heEnd, enStart, enEnd], ...]]
data/hebrew-phrases.json   # Tanakh two-word phrases, same shape
data/mishnah.json          # all 63 tractates, {ref, he, text} per mishnah — no `en`, see Corpora above
data/mishnah-words.json    # Mishnah words: [bareWord, [[passageIndex, heStart, heEnd], ...]] — own index, not Tanakh's
data/mishnah-phrases.json  # Mishnah two-word phrases, same shape
scripts/build_mishnah.py   # fetches Sefaria's Torat Emet 357 Mishnah text, builds the three mishnah-*.json files
data/mishneh-torah.json         # 79 of 88 treatises, {ref, he, text} per halacha — no `en`, see Corpora above
data/mishneh-torah-words.json   # Mishneh Torah words, same shape as mishnah-words.json — own index
data/mishneh-torah-phrases.json # Mishneh Torah two-word phrases, same shape
scripts/build_mishneh_torah.py  # fetches Sefaria's Torat Emet 363/370 text, builds the three mishneh-torah-*.json files
tests/unit/                # node --test: pure-logic unit tests (no browser)
tests/e2e/                 # Playwright: drives the real served app in a browser
playwright.config.js       # e2e test config (auto-starts/stops the static server)
```

An occurrence is `[passageIndex, heStart, heEnd, enStart, enEnd]` (the last
two omitted for Mishnah and Mishneh Torah, which have no translation to
highlight). `passageIndex` is always local to that corpus's own passage
file — Tanakh occurrences index into `tanakh.json`, Mishnah occurrences
into `mishnah.json`, Mishneh Torah occurrences into `mishneh-torah.json`;
none of the three are ever mixed or offset against each other, since
`src/data.js`'s `CORPORA` array loads and indexes each corpus completely
independently. `heStart`/`heEnd` are character offsets into that passage's
Hebrew/Aramaic text, used to highlight the exact occurrence in context;
`enStart`/`enEnd` are the equivalent offsets into the Tanakh passage's JPS
text (`.en`), or `-1` when no confident English highlight was found (the
translation still displays, just unhighlighted).

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
  **Corpora** above)? `scripts/build_mishnah.py`/`build_mishneh_torah.py`
  are the template: fetch the Hebrew/Aramaic text into `data/<corpus>.json`
  in the same `{ref, he, text}` shape (add `en` only if a translation with
  a license that fits your use is actually available), extract its
  word/phrase occurrences into
  `data/<corpus>-words.json`/`data/<corpus>-phrases.json` as their own,
  self-contained index (indices local to `data/<corpus>.json` — never
  offset against or merged into another corpus's files), then add one entry
  to `src/data.js`'s `CORPORA` array pointing at the three files. That's the
  entire integration; `src/app.js` already renders whatever's in `CORPORA`
  as a tab with no further changes needed. Both the Talmud and the Zohar
  are much bigger than the Mishnah — expect this to be a heavier fetch/build
  job, not a quick rerun of the same script with new URLs — and check each
  one's *own* per-version licensing the way `build_mishnah.py` and
  `build_mishneh_torah.py` do rather than trusting whichever text a
  source's API returns by default, or assuming one licensing check made
  for one part of a work covers the rest of it (Mishneh Torah's own two
  differently-licensed editions are the cautionary example here).

## Regenerating the data

`data/mishnah.json`, `data/mishnah-words.json`, and
`data/mishnah-phrases.json` are generated by `scripts/build_mishnah.py`
(run it from the repo root: `python3 scripts/build_mishnah.py`; raw
per-tractate fetches are cached in `.cache/mishnah_raw/` so a re-run after
a partial failure doesn't re-fetch everything).

Getting a fully public-domain Mishnah took two passes. The first pull used
Sefaria's public GCS export (its "merged"/default Hebrew text per
tractate) and, checked after the fact against
`https://www.sefaria.org/api/texts/<title>`'s `license` field, turned out
to be CC-BY-NC for 38 of the 63 tractates (all of Seder Moed, Seder Nashim,
and Seder Nezikin, most of Seder Kodashim, plus Berakhot and Niddah — the
pattern lines up almost exactly with which tractates have accompanying
Talmud Bavli Gemara, digitized as part of the same Steinsaltz/Koren
project that licenses that translation CC-BY-NC). The fix wasn't a
different source — it was asking Sefaria for a different *version* of the
same tractates: `https://www.sefaria.org/api/texts/versions/<title>` lists
every independent Hebrew edition Sefaria hosts per text, and one of
them — **"Torat Emet 357"** — checked Public Domain on every one of the 63
tractates (spot-checked across all six sedarim, including ones that were
CC-BY-NC under the default text) and happens to be vocalized in the same
style as the Tanakh text already used elsewhere in the app. The script
requests it explicitly via the v3 API
(`/api/v3/texts/<title>?version=hebrew|Torat Emet 357`) and asserts the
returned license actually is `"Public Domain"` before using it, so a
future change on Sefaria's end fails loudly instead of silently
reintroducing a licensing problem.

`data/mishneh-torah.json`, `data/mishneh-torah-words.json`, and
`data/mishneh-torah-phrases.json` are generated by
`scripts/build_mishneh_torah.py` (run it from the repo root: `python3
scripts/build_mishneh_torah.py`; raw per-treatise fetches are cached in
`.cache/mishneh_torah_raw/`).

Mishneh Torah's full table of contents (88 treatises across 14 books plus
4 introductory list-books) comes from Sefaria's `/api/index/` endpoint,
filtered down to nodes under the `Halakhah > Mishneh Torah` category with
a `Mishneh Torah, ...` title and a 3-level category path (deeper paths
turned out to be derivative commentaries nested in the same tree, not
primary text — an early version of this script's TOC walk picked up 1,935
"books" before that filter was added). Checking each of the 88 individually
against `/api/texts/versions/<title>` (rather than assuming Mishnah's
single-version-covers-everything pattern would repeat) turned up a messier
picture: the work is split across two independently-licensed Hebrew
editions, neither complete. **"Torat Emet 363"** is Public Domain for 72
of the 88 (all of Sefer Madda, and everything from Sefer Zemanim through
Sefer Shoftim) but doesn't cover Sefer Ahavah at all. **"Torat Emet
370"** covers Sefer Ahavah instead, but is only Public Domain for 2 of its
7 treatises (Reading the Shema; Prayer and the Priestly Blessing) — the
other 5 come back license `"unknown"`. The 4 introductory list-books have
no Public Domain Hebrew version under either name — only a CC-BY-SA
Wikisource transcription. The script checks both candidate version names
per treatise, uses whichever comes back `"Public Domain"`, and skips (and
logs) a treatise where neither does, asserting the resulting skip list
against a hardcoded `EXCLUDED` set so a change on Sefaria's end — a newly
freed version, or a license getting revoked — is noticed at build time
rather than silently changing what's in the corpus. The result: 79 of 88
treatises, 14,622 halachot.

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
