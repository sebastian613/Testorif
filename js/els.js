// Equal Letter Skip (ELS) search + matrix construction over the full
// continuous Torah letter stream (no spaces, ketiv only).
//
// Performance note: for a fixed skip magnitude m, the letters at positions
// {r, r+m, r+2m, ...} (one residue class r = 0..m-1) form a subsequence of
// the text. Concatenating all m residue subsequences visits every letter
// exactly once, so a full ELS search at a given skip costs O(n) plus the
// substring search inside each residue slice -- independent of how large
// the skip itself is. This keeps single-skip searches fast even for large
// gematria values / a 300k-letter text.

function reverseString(s) {
  return s.split("").reverse().join("");
}

// Returns an ascending array of text indices, one per match, each the
// index of the term's FIRST letter (in reading order) for that skip.
export function findELS(text, term, skip) {
  const n = text.length;
  const L = term.length;
  if (L === 0 || skip === 0 || L > n) return [];

  const m = Math.abs(skip);
  const forward = skip > 0;
  const pattern = forward ? term : reverseString(term);
  const results = [];

  for (let r = 0; r < m; r++) {
    const idxMap = [];
    const chars = [];
    for (let idx = r; idx < n; idx += m) {
      chars.push(text[idx]);
      idxMap.push(idx);
    }
    if (chars.length < L) continue;
    const sub = chars.join("");
    let pos = sub.indexOf(pattern);
    while (pos !== -1) {
      results.push(forward ? idxMap[pos] : idxMap[pos + L - 1]);
      pos = sub.indexOf(pattern, pos + 1);
    }
  }

  results.sort((a, b) => a - b);
  return results;
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
