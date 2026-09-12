import { hebrewLettersOnly } from "./hebrew.js";
import { loadTorahData, loadLexicon } from "./data.js";
import { buildPositionIndex, findAllELS, findVerseForIndex, buildMatrix } from "./els.js";
import { buildLexiconAutomaton, findWordsInMatrix } from "./wordfinder.js";
import { MatrixView } from "./render.js";

const els = {
  termInput: document.getElementById("term-input"),
  lettersPreview: document.getElementById("letters-preview"),
  minSkip: document.getElementById("min-skip"),
  maxSkip: document.getElementById("max-skip"),
  rowsAbove: document.getElementById("rows-above"),
  rowsBelow: document.getElementById("rows-below"),
  minLength: document.getElementById("min-length"),
  minLengthValue: document.getElementById("min-length-value"),
  searchBtn: document.getElementById("search-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
  progressWrap: document.getElementById("progress-wrap"),
  progressBar: document.getElementById("progress-bar"),
  progressLabel: document.getElementById("progress-label"),
  searchStatus: document.getElementById("search-status"),
  occurrenceList: document.getElementById("occurrence-list"),
  canvas: document.getElementById("matrix-canvas"),
  canvasEmpty: document.getElementById("canvas-empty"),
  tooltip: document.getElementById("cell-tooltip"),
  foundCount: document.getElementById("found-count"),
  foundList: document.getElementById("found-list"),
  zoomIn: document.getElementById("zoom-in"),
  zoomOut: document.getElementById("zoom-out"),
  zoomReset: document.getElementById("zoom-reset"),
  themeToggle: document.getElementById("theme-toggle"),
  legend: document.getElementById("legend"),
};

const MAX_DISPLAYED_WORDS = 180;
const MAX_DISPLAYED_OCCURRENCES = 300;

const state = {
  torah: null,          // { books, letters, verses, source }
  positionIndex: null,  // Map<letter, sortedIndexArray>
  lexiconIndex: null,   // { automaton, words, categoryByWord }
  occurrences: [],       // full sorted list from the last search (capped at MAX_DISPLAYED_OCCURRENCES for display)
  occurrenceTotal: 0,
  activeOccurrenceIdx: -1,
  matrix: null,
  foundWords: [],
  foundWordsTotal: 0,
  categoryVisibility: { torah: true, rabbinic: true, modern: true },
  cancelToken: null,
};

let matrixView;

function setStatus(msg, isError) {
  els.searchStatus.textContent = msg || "";
  els.searchStatus.classList.toggle("error", !!isError);
}

function updateLettersPreview() {
  const letters = hebrewLettersOnly(els.termInput.value);
  els.lettersPreview.textContent = letters ? letters.split("").join(" ") : "";
}

function verseLabel(v) {
  return v ? `${v.book} ${v.chapter}:${v.verse}` : "—";
}

function renderOccurrenceList(termLetters) {
  els.occurrenceList.innerHTML = "";
  state.occurrences.forEach((occ, i) => {
    const chip = document.createElement("div");
    chip.className = "occurrence-chip" + (i === state.activeOccurrenceIdx ? " active" : "");
    chip.innerHTML = `<span>${verseLabel(occ.verse)}</span><span class="skip-tag">skip ${occ.skip > 0 ? "+" : ""}${occ.skip}</span>`;
    chip.addEventListener("click", () => selectOccurrence(i, termLetters));
    els.occurrenceList.appendChild(chip);
  });
}

function selectOccurrence(index, termLetters) {
  state.activeOccurrenceIdx = index;
  const occ = state.occurrences[index];
  renderOccurrenceList(termLetters);
  buildAndRender(occ.startIndex, occ.skip, termLetters.length);
}

function categoryDotColor(cat) {
  const map = { torah: "var(--torah)", rabbinic: "var(--rabbinic)", modern: "var(--modern)" };
  return map[cat[0]] || "var(--torah)";
}

function renderFoundList() {
  els.foundList.innerHTML = "";
  const visible = state.foundWords.filter((f) => f.category.some((c) => state.categoryVisibility[c]));
  els.foundCount.textContent = state.foundWordsTotal > state.foundWords.length
    ? `${visible.length} shown (top ${state.foundWords.length} of ${state.foundWordsTotal} matches — raise min. length to narrow)`
    : `${visible.length} of ${state.foundWords.length} shown`;

  visible.forEach((entry) => {
    const realIndex = state.foundWords.indexOf(entry);
    const li = document.createElement("li");
    li.className = "found-item";
    li.innerHTML = `
      <span class="found-word">${entry.word}</span>
      <span class="found-dot" style="background:${categoryDotColor(entry.category)}"></span>
    `;
    li.title = entry.category.join(", ");
    li.addEventListener("click", () => {
      const isolating = matrixView.isolatedIndex === realIndex;
      matrixView.setIsolated(isolating ? -1 : realIndex);
      li.parentElement.querySelectorAll(".found-item").forEach((x) => x.classList.remove("isolated"));
      if (!isolating) {
        li.classList.add("isolated");
        matrixView.focusOnCells(entry.cells);
      }
    });
    els.foundList.appendChild(li);
  });
}

function buildAndRender(startIndex, skip, termLength) {
  const rowsAbove = parseInt(els.rowsAbove.value, 10) || 0;
  const rowsBelow = parseInt(els.rowsBelow.value, 10) || 0;
  const minLength = parseInt(els.minLength.value, 10) || 2;

  const matrix = buildMatrix(
    state.torah.letters, state.torah.verses, state.torah.books,
    startIndex, skip, termLength, rowsAbove, rowsBelow
  );
  const allFound = findWordsInMatrix(matrix, state.lexiconIndex, { minLength });
  const foundWords = allFound.slice(0, MAX_DISPLAYED_WORDS);

  state.matrix = matrix;
  state.foundWords = foundWords;
  state.foundWordsTotal = allFound.length;

  els.canvasEmpty.hidden = true;
  matrixView.setData(matrix, foundWords);
  matrixView.setCategoryVisibility(state.categoryVisibility);
  renderFoundList();
}

function showProgress(current, total, foundSoFar) {
  els.progressWrap.hidden = false;
  const pct = total ? Math.round((current / total) * 100) : 0;
  els.progressBar.style.width = pct + "%";
  els.progressLabel.textContent = `Scanning… ${pct}% (${foundSoFar.toLocaleString()} found so far)`;
}

function hideProgress() {
  els.progressWrap.hidden = true;
}

function resetResultsUI() {
  els.occurrenceList.innerHTML = "";
  state.occurrences = [];
  state.occurrenceTotal = 0;
  state.activeOccurrenceIdx = -1;
  state.matrix = null;
  state.foundWords = [];
  matrixView.setData(null, []);
  els.canvasEmpty.hidden = false;
  els.foundList.innerHTML = "";
  els.foundCount.textContent = "";
}

async function runSearch() {
  const raw = els.termInput.value;
  const termLetters = hebrewLettersOnly(raw);
  if (termLetters.length < 2) {
    setStatus("Type a Hebrew word or phrase of at least 2 letters.", true);
    return;
  }
  const minSkip = parseInt(els.minSkip.value, 10) || 1;
  const maxSkip = parseInt(els.maxSkip.value, 10);
  if (!maxSkip || maxSkip < 1) {
    setStatus("Enter a max skip of at least 1.", true);
    return;
  }
  if (minSkip > maxSkip) {
    setStatus("Min skip can't be greater than max skip.", true);
    return;
  }

  resetResultsUI();
  els.searchBtn.disabled = true;
  els.searchBtn.hidden = true;
  els.cancelBtn.hidden = false;
  setStatus(`Searching every skip from ${minSkip.toLocaleString()} to ${maxSkip.toLocaleString()}…`);

  const cancelToken = { cancelled: false };
  state.cancelToken = cancelToken;

  let result;
  try {
    result = await findAllELS(state.positionIndex, state.torah.letters.length, termLetters, maxSkip, {
      minSkip,
      onProgress: (current, total, foundSoFar) => showProgress(current, total, foundSoFar),
      cancelToken,
    });
  } finally {
    hideProgress();
    els.searchBtn.disabled = false;
    els.searchBtn.hidden = false;
    els.cancelBtn.hidden = true;
  }

  if (cancelToken.cancelled) {
    setStatus("Search cancelled.");
    return;
  }

  const all = result.occurrences.map((o) => ({
    ...o,
    verse: findVerseForIndex(state.torah.verses, state.torah.books, o.startIndex),
  }));
  state.occurrenceTotal = all.length;
  state.occurrences = all.slice(0, MAX_DISPLAYED_OCCURRENCES);

  if (all.length === 0) {
    setStatus(`No occurrences of "${termLetters}" found at any skip from ${minSkip.toLocaleString()} to ${maxSkip.toLocaleString()}.`, true);
    return;
  }

  const truncatedNote = result.truncated
    ? ` (stopped early — extremely common term; narrow the skip range or use a longer phrase)`
    : state.occurrenceTotal > state.occurrences.length
      ? ` — showing the ${state.occurrences.length} smallest-skip occurrences`
      : "";
  setStatus(`Found ${state.occurrenceTotal.toLocaleString()} occurrence${state.occurrenceTotal === 1 ? "" : "s"} across skips ${minSkip.toLocaleString()}–${maxSkip.toLocaleString()}${truncatedNote}. Smallest skip: ${state.occurrences[0].skip}.`);

  renderOccurrenceList(termLetters);
  selectOccurrence(0, termLetters);
}

function wireEvents() {
  els.termInput.addEventListener("input", updateLettersPreview);
  els.termInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
  els.searchBtn.addEventListener("click", runSearch);
  els.cancelBtn.addEventListener("click", () => {
    if (state.cancelToken) state.cancelToken.cancelled = true;
  });

  els.minLength.addEventListener("input", () => {
    els.minLengthValue.textContent = els.minLength.value;
  });
  els.minLength.addEventListener("change", () => {
    if (state.activeOccurrenceIdx === -1) return;
    const occ = state.occurrences[state.activeOccurrenceIdx];
    const termLetters = hebrewLettersOnly(els.termInput.value);
    buildAndRender(occ.startIndex, occ.skip, termLetters.length);
  });

  [els.rowsAbove, els.rowsBelow].forEach((input) => {
    input.addEventListener("change", () => {
      if (state.activeOccurrenceIdx === -1) return;
      const occ = state.occurrences[state.activeOccurrenceIdx];
      const termLetters = hebrewLettersOnly(els.termInput.value);
      buildAndRender(occ.startIndex, occ.skip, termLetters.length);
    });
  });

  els.legend.querySelectorAll('input[data-cat]').forEach((cb) => {
    cb.addEventListener("change", () => {
      state.categoryVisibility[cb.dataset.cat] = cb.checked;
      matrixView.setCategoryVisibility(state.categoryVisibility);
      renderFoundList();
    });
  });

  els.zoomIn.addEventListener("click", () => matrixView.zoomBy(1.25));
  els.zoomOut.addEventListener("click", () => matrixView.zoomBy(0.8));
  els.zoomReset.addEventListener("click", () => matrixView.resetView());

  els.themeToggle.addEventListener("click", () => {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("torah-codes-theme", next); } catch (_) {}
    if (matrixView) matrixView.draw();
  });

  matrixView.onHover = (info) => {
    if (!info) { els.tooltip.hidden = true; return; }
    const verse = findVerseForIndex(state.torah.verses, state.torah.books, info.idx);
    els.tooltip.hidden = false;
    els.tooltip.style.left = info.screenX + "px";
    els.tooltip.style.top = info.screenY + "px";
    els.tooltip.textContent = `${info.letter} · ${verseLabel(verse)}`;
  };
}

async function init() {
  try {
    const savedTheme = localStorage.getItem("torah-codes-theme");
    if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  } catch (_) {}

  matrixView = new MatrixView(els.canvas, { onHover: () => {} });

  setStatus("Loading Torah text and lexicon…");
  els.searchBtn.disabled = true;
  try {
    const [torah, lexicon] = await Promise.all([loadTorahData(), loadLexicon()]);
    state.torah = torah;
    state.positionIndex = buildPositionIndex(torah.letters);
    state.lexiconIndex = buildLexiconAutomaton(lexicon);
    setStatus(`Loaded ${torah.letters.length.toLocaleString()} letters of Torah text. Ready.`);
  } catch (err) {
    setStatus("Failed to load data: " + err.message, true);
    return;
  } finally {
    els.searchBtn.disabled = false;
  }

  wireEvents();
  updateLettersPreview();
}

init();
