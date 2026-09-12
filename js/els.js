// Equal Letter Skip (ELS) search + matrix construction over the full
// continuous Torah letter stream (no spaces, ketiv only).
//
// findAllELS finds every occurrence of a term across a whole range of skip
// magnitudes at once -- the way the original ELS/"Bible code" search tools
// work: rather than picking one skip, they scan for every (start, skip)
// pair where the term appears, then let you inspect any occurrence's
// matrix, with the smallest |skip| generally treated as most notable.
//
// The naive way to do this -- for every candidate skip, re-scan the whole
// 305k-letter text -- costs O(text length x max skip), which gets slow
// past a few hundred skips. Instead we index every letter's positions once
// (O(n)), then for a given term intersect those position lists: for each
// occurrence of the term's first letter, binary-search the second letter's
// positions within +-maxSkip to get candidate skips directly, and confirm
// the rest of the term with O(log n) membership checks. Cost then tracks
// how often those letters actually co-occur, independent of how large
// maxSkip is -- which is what makes a large, user-chosen skip range
// practical instead of a many-second scan.

export function buildPositionIndex(text) {
  const index = new Map();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let arr = index.get(ch);
    if (!arr) { arr = []; index.set(ch, arr); }
    arr.push(i);
  }
  return index;
}

function lowerBound(arr, value) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1; else hi = mid;
  }
  return lo;
}

function hasValue(arr, value) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === value) return true;
    if (arr[mid] < value) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}

const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 0));

// Scans every skip magnitude from minSkip..maxSkip (both directions at
// once -- d = t - s is signed) for `term`. Chunked with periodic yields so
// the caller can show progress and cancel a long search without freezing
// the page. Returns { occurrences: [{startIndex, skip}], truncated },
// sorted by ascending |skip| (smallest skip first, the traditional
// convention). minSkip defaults to 2: skip 1 is just the plain text (read
// forward or backward), not a letter-skip pattern.
export async function findAllELS(positionIndex, textLength, term, maxSkip, opts = {}) {
  const { minSkip = 2, resultCap = 200000, onProgress, cancelToken, chunkSize = 400 } = opts;
  const L = term.length;
  if (L < 2 || maxSkip < 1 || maxSkip < minSkip) return { occurrences: [], truncated: false };

  const letterPositions = [];
  for (const ch of term) letterPositions.push(positionIndex.get(ch) || []);

  const results = [];
  let truncated = false;
  const P0 = letterPositions[0];
  const P1 = letterPositions[1];

  function scanRange(s, lo, hi) {
    for (let j = lo; j < hi; j++) {
      const t = P1[j];
      const d = t - s;
      let ok = true;
      for (let k = 2; k < L; k++) {
        const pos = s + k * d;
        if (pos < 0 || pos >= textLength || !hasValue(letterPositions[k], pos)) { ok = false; break; }
      }
      if (ok) results.push({ startIndex: s, skip: d });
    }
  }

  outer:
  for (let i = 0; i < P0.length; i++) {
    const s = P0[i];
    // Two windows around s, excluding |d| < minSkip (skip 1 is just the
    // plain text, not a letter-skip pattern) and d = 0.
    scanRange(s, lowerBound(P1, s - maxSkip), lowerBound(P1, s - minSkip + 1));
    scanRange(s, lowerBound(P1, s + minSkip), lowerBound(P1, s + maxSkip + 1));
    if (results.length >= resultCap) { truncated = true; break outer; }
    if (i % chunkSize === chunkSize - 1) {
      if (cancelToken && cancelToken.cancelled) { truncated = true; break; }
      if (onProgress) onProgress(i + 1, P0.length, results.length);
      await yieldToUI();
    }
  }

  results.sort((a, b) => Math.abs(a.skip) - Math.abs(b.skip) || a.startIndex - b.startIndex);
  return { occurrences: results, truncated };
}

// Binary search: returns the verse reference {book, chapter, verse} whose
// span contains `index`, or null if index is out of range.
export function findVerseForIndex(verses, books, index) {
  if (index < 0) return null;
  let lo = 0, hi = verses.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (verses[mid][3] <= index) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans === -1) return null;
  const [bookIdx, chapter, verse] = verses[ans];
  return { book: books[bookIdx], chapter, verse };
}

// Builds a rectangular grid (rows x cols) of the underlying text, arranged
// so that a term found at (startIndex, skip) reads as a single straight
// vertical line down (skip > 0) or up (skip < 0) one fixed column -- the
// classic ELS matrix display. Grid is returned in VISUAL (RTL) column
// order: pixelCol 0 is the leftmost thing drawn on screen, and text within
// a row advances right-to-left as in normal Hebrew reading.
export function buildMatrix(text, verses, books, startIndex, skip, termLength, rowsAbove, rowsBelow) {
  const n = text.length;
  const cols = Math.abs(skip);
  const totalRows = rowsAbove + rowsBelow + 1;

  // Reading-offset within a row (0 = first letter read in that row) that we
  // want the term to occupy; centered rather than jammed against an edge.
  const targetPixelCol = Math.floor(cols / 2);
  const k = cols - 1 - targetPixelCol;

  // origin = linear index of the (reading-order) start of row `rowsAbove`,
  // chosen so the term's first letter lands at offset k within that row.
  const origin = startIndex - k - rowsAbove * cols;

  const grid = new Array(totalRows);
  const valid = new Array(totalRows);
  const cellIndex = new Array(totalRows);
  for (let r = 0; r < totalRows; r++) {
    grid[r] = new Array(cols).fill("");
    valid[r] = new Array(cols).fill(false);
    cellIndex[r] = new Array(cols).fill(-1);
    const rowStart = origin + r * cols;
    for (let readOffset = 0; readOffset < cols; readOffset++) {
      const idx = rowStart + readOffset;
      const pixelCol = cols - 1 - readOffset;
      if (idx >= 0 && idx < n) {
        grid[r][pixelCol] = text[idx];
        valid[r][pixelCol] = true;
        cellIndex[r][pixelCol] = idx;
      }
    }
  }

  // Locate the term's own cells (for highlighting), by construction all in
  // pixelCol = targetPixelCol.
  const termCells = [];
  for (let j = 0; j < termLength; j++) {
    const idx = startIndex + j * skip;
    const rowOffsetFromStart = skip > 0 ? j : -j;
    const r = rowsAbove + rowOffsetFromStart;
    if (r >= 0 && r < totalRows && idx >= 0 && idx < n) {
      termCells.push({ r, c: targetPixelCol, idx });
    }
  }

  const anchorVerse = findVerseForIndex(verses, books, startIndex);

  return {
    rows: totalRows,
    cols,
    grid,
    valid,
    cellIndex,
    termCells,
    termColumn: targetPixelCol,
    skip,
    startIndex,
    anchorVerse,
  };
}
