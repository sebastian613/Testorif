# Gematria Calculator

A static, browser-based app that calculates the gematria value of a name or
phrase and finds every word, phrase, and King James Bible verse that shares
the same value.

## How it works

- **Ciphers**: English Ordinal (A=1…Z=26), Full Reduction, Reverse Ordinal
  (Z=1…A=26), Reverse Reduction, Sumerian (Ordinal ×6), and Reverse Sumerian —
  the same six ciphers used by common online gematria calculators. Only
  letters A–Z are counted; spaces, punctuation, and digits are ignored.
- **Matching**: `data/words.json` (~370k English words), `data/phrases.json`
  (a curated set of idioms, famous quotes, and names), and `data/kjv.json`
  (all ~31,100 verses of the King James Bible) are loaded in the browser and
  indexed against all six ciphers on startup. Typing a name instantly looks
  up every item that shares its value for the selected cipher.

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
index.html        # page shell
style.css          # styling (light/dark aware)
src/gematria.js    # cipher math
src/data.js        # dataset loading + precomputed per-cipher indexes
src/app.js         # UI wiring
data/words.json    # English word list
data/phrases.json  # curated idioms, quotes, and names
data/kjv.json      # King James Bible, flattened to {ref, b, text} per verse
```

## Extending

- Add more entries to `data/phrases.json` (a plain JSON array of strings) to
  broaden phrase matches.
- Add another cipher by extending `CIPHERS` in `src/gematria.js` and the sum
  loop in `computeAllCiphers`.
