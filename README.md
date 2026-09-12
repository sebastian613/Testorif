# Torah Codes Matrix

A clean, fast Equal Letter Skip (ELS) explorer over the full text of the
Torah — built the way the original ELS/"Bible code" search tools work:
given a Hebrew word or phrase, it searches **every skip distance** from 1
up to a max you choose (in both directions) for occurrences of the term,
ranks them with the smallest skip first (the traditional "most notable"
convention), and lets you open a classic ELS letter matrix for any one of
them — the term running in a straight line down (or up) one column, exactly
like the early Bible-code display programs. It then scans every straight
line in the visible matrix (horizontal, vertical, both diagonals) against a
Hebrew lexicon spanning Torah/Biblical, Rabbinic, and Modern registers, and
highlights whatever else turns up.

## Features

- **Full-range ELS search** — scans every skip magnitude from 1 to your
  chosen maximum, both directions, across all ~304,850 letters of the
  Torah (ketiv, no spaces/niqqud). Built on a letter-position index rather
  than re-scanning the text per skip, so cost tracks how often the term's
  letters actually co-occur rather than the size of the skip range —
  searching every skip up to 1,000 for a word typically takes well under a
  second; larger ranges run in the background with a progress bar and a
  cancel button instead of freezing the page.
- **Classic matrix rendering** — canvas-based grid, pan & zoom, matrix width
  fixed to the occurrence's skip so the found term is always a straight
  highlighted line with a direction arrow.
- **Multi-register word finder** — an Aho-Corasick automaton over ~1,200
  lexicon entries (Torah, Rabbinic, Modern Hebrew) scans all 8 directions of
  the rendered matrix and overlays every hit, color-coded by register, with
  a toggleable legend and a minimum-length filter.
- **Verse lookup** — hover any letter to see its book/chapter/verse; click
  any occurrence chip to jump between different places the term appears at
  a given skip.
- Light/dark themes, fully responsive down to phone width, no build step,
  no external runtime dependencies (works offline once the data files are
  present).

## Running it

Static site — any HTTP server works (the browser needs `fetch()` to load
the JSON data files, so `file://` won't work):

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

## Data

- `data/torah.json` — the continuous Torah letter stream plus a verse
  index, extracted from the [Open Scriptures Hebrew
  Bible](https://github.com/openscriptures/morphhb) (Westminster Leningrad
  Codex; CC-BY 4.0 / Public Domain). Only the *ketiv* (as-written) text is
  kept — nested *qere* variants, niqqud, cantillation, and spaces are
  stripped, leaving 304,850 consonants, matching the traditional letter
  count closely.
- `data/lexicon.json` — the word list used for "found in this matrix":
  the Torah-tagged entries are the most frequent word forms actually
  attested in the extracted text (no hand-curation); the Rabbinic and
  Modern entries are curated word lists.

Regenerate both from scratch with:

```bash
python3 tools/extract_torah.py   # downloads the source XML, writes data/torah.json
python3 tools/build_lexicon.py   # writes data/lexicon.json
```

## Notes

ELS pattern-finding in the Torah is a long-running subject of debate among
scholars and statisticians. This tool is offered for study and exploration
of the phenomenon, not as a claim about its significance.
