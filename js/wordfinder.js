import { AhoCorasick } from "./ahocorasick.js";

// Builds (once) an Aho-Corasick automaton over every lexicon word, so a
// single linear pass over each line of the matrix finds all lexicon hits
// at once instead of testing 1000+ words individually per line.
export function buildLexiconAutomaton(lexicon) {
  const words = lexicon.map((e) => e.w);
  const automaton = new AhoCorasick(words);
  const categoryByWord = new Map(lexicon.map((e) => [e.w, e.cat]));
  return { automaton, words, categoryByWord };
}

function extractLines(matrix) {
  const { rows, cols, grid, valid } = matrix;
  const lines = [];

  // Horizontal (rows)
  for (let r = 0; r < rows; r++) {
    const coords = [];
    for (let c = 0; c < cols; c++) coords.push({ r, c });
    lines.push(coords);
  }
  // Vertical (columns)
  for (let c = 0; c < cols; c++) {
    const coords = [];
    for (let r = 0; r < rows; r++) coords.push({ r, c });
    lines.push(coords);
  }
  // Diagonal down-right, one line per starting cell on the top row or left column
  for (let r = 0; r < rows; r++) {
    if (r !== 0) continue;
    for (let sc = 0; sc < cols; sc++) {
      const coords = [];
      for (let rr = 0, cc = sc; rr < rows && cc < cols; rr++, cc++) coords.push({ r: rr, c: cc });
      lines.push(coords);
    }
  }
  for (let sr = 1; sr < rows; sr++) {
    const coords = [];
    for (let rr = sr, cc = 0; rr < rows && cc < cols; rr++, cc++) coords.push({ r: rr, c: cc });
    lines.push(coords);
  }
  // Diagonal down-left
  for (let sc = 0; sc < cols; sc++) {
    const coords = [];
    for (let rr = 0, cc = sc; rr < rows && cc >= 0; rr++, cc--) coords.push({ r: rr, c: cc });
    lines.push(coords);
  }
  for (let sr = 1; sr < rows; sr++) {
    const coords = [];
    for (let rr = sr, cc = cols - 1; rr < rows && cc >= 0; rr++, cc--) coords.push({ r: rr, c: cc });
    lines.push(coords);
  }

  // Split each line into maximal runs of valid (in-bounds) cells only.
  const segments = [];
  for (const coords of lines) {
    let run = [];
    for (const cell of coords) {
      if (valid[cell.r][cell.c]) {
        run.push(cell);
      } else if (run.length) {
        segments.push(run);
        run = [];
      }
    }
    if (run.length) segments.push(run);
  }
  return segments;
}

// Scans every straight 8-direction line in the matrix for lexicon words.
// Returns [{ word, category: string[], cells: [{r,c,idx}], minLength }]
// deduplicated by exact cell span.
export function findWordsInMatrix(matrix, lexiconIndex, options = {}) {
  const minLength = options.minLength || 2;
  const { automaton, words, categoryByWord } = lexiconIndex;
  const segments = extractLines(matrix);
  const seen = new Set();
  const found = [];

  for (const coords of segments) {
    if (coords.length < minLength) continue;
    const chars = coords.map((c) => matrix.grid[c.r][c.c]);
    const forwardStr = chars.join("");

    for (const m of automaton.search(forwardStr)) {
      if (m.end - m.start < minLength) continue;
      const cells = coords.slice(m.start, m.end);
      pushMatch(cells, words[m.patternIndex]);
    }

    const revStr = chars.slice().reverse().join("");
    const revCoords = coords.slice().reverse();
    for (const m of automaton.search(revStr)) {
      if (m.end - m.start < minLength) continue;
      const cells = revCoords.slice(m.start, m.end);
      pushMatch(cells, words[m.patternIndex]);
    }
  }

  function pushMatch(cells, word) {
    const key = word + "@" + cells.map((c) => matrix.cellIndex[c.r][c.c]).join(",");
    if (seen.has(key)) return;
    seen.add(key);
    const cellsWithIdx = cells.map((c) => ({ r: c.r, c: c.c, idx: matrix.cellIndex[c.r][c.c] }));
    const dr = cellsWithIdx[1].r - cellsWithIdx[0].r;
    const dc = cellsWithIdx[1].c - cellsWithIdx[0].c;
    const direction = dr === 0 ? "horizontal" : dc === 0 ? "vertical" : "diagonal";
    found.push({ word, category: categoryByWord.get(word) || [], cells: cellsWithIdx, direction });
  }

  // Vertical/diagonal hits are the interesting "code" style finds; plain
  // horizontal runs are just literal Torah text, so they sort last.
  const directionRank = { vertical: 0, diagonal: 1, horizontal: 2 };
  found.sort((a, b) => {
    const dr = directionRank[a.direction] - directionRank[b.direction];
    if (dr !== 0) return dr;
    return b.word.length - a.word.length;
  });
  return found;
}
