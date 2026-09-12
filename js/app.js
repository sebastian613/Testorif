import { gematria, hebrewLettersOnly } from "./gematria.js";
import { loadTorahData, loadLexicon } from "./data.js";
import { findELS, findVerseForIndex, buildMatrix } from "./els.js";
import { buildLexiconAutomaton, findWordsInMatrix } from "./wordfinder.js";
import { MatrixView } from "./render.js";

const els = {
  termInput: document.getElementById("term-input"),
  gematriaValue: document.getElementById("gematria-value"),
  lettersPreview: document.getElementById("letters-preview"),
  rowsAbove: document.getElementById("rows-above"),
  rowsBelow: document.getElementById("rows-below"),
  minLength: document.getElementById("min-length"),
  minLengthValue: document.getElementById("min-length-value"),
  searchBtn: document.getElementById("search-btn"),
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

const state = {
  torah: null,          // { books, letters, verses, source }
  lexiconIndex: null,   // { automaton, words, categoryByWord }
  occurrences: [],       // [{ startIndex, skip, verse }]
  activeOccurrenceIdx: -1,
  matrix: null,
  foundWords: [],        // capped list actually rendered/drawn
  foundWordsTotal: 0,     // total matches before capping
  categoryVisibility: { torah: true, rabbinic: true, modern: true },
};

let matrixView;

function setStatus(msg, isError) {
  els.searchStatus.textContent = msg || "";
  els.searchStatus.classList.toggle("error", !!isError);
}

function updateGematriaPreview() {
  const raw = els.termInput.value;
  const letters = hebrewLettersOnly(raw);
  const value = gematria(raw);
  els.gematriaValue.textContent = value.toLocaleString();
  els.lettersPreview.textContent = letters ? `${letters.split("").join(" ")}` : "";
}

function verseLabel(v) {
  return v ? `${v.book} ${v.chapter}:${v.verse}` : "—";
}

function renderOccurrenceList(term, termLetters) {
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
  renderOccurrenceList(null, termLetters);
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

function runSearch() {
  const raw = els.termInput.value;
  const termLetters = hebrewLettersOnly(raw);
  if (!termLetters) {
    setStatus("Type a Hebrew word or phrase first.", true);
    return;
  }
  const skip = gematria(raw);
  if (!skip) {
    setStatus("Gematria value is zero — nothing to search for.", true);
    return;
  }

  setStatus("Searching…");
  els.searchBtn.disabled = true;

  // Let the status message paint before the (fast, but synchronous) search.
  setTimeout(() => {
    const fwd = findELS(state.torah.letters, termLetters, skip);
    const bwd = findELS(state.torah.letters, termLetters, -skip);

    const occurrences = [
      ...fwd.map((startIndex) => ({ startIndex, skip })),
      ...bwd.map((startIndex) => ({ startIndex, skip: -skip })),
    ].map((o) => ({ ...o, verse: findVerseForIndex(state.torah.verses, state.torah.books, o.startIndex) }));

    occurrences.sort((a, b) => a.startIndex - b.startIndex);
    state.occurrences = occurrences;
    state.activeOccurrenceIdx = -1;

    els.searchBtn.disabled = false;

    if (occurrences.length === 0) {
      setStatus(`No occurrences of "${termLetters}" found at skip ±${skip} in the Torah.`, true);
      els.occurrenceList.innerHTML = "";
      state.matrix = null;
      state.foundWords = [];
      matrixView.setData(null, []);
      els.canvasEmpty.hidden = false;
      els.foundList.innerHTML = "";
      els.foundCount.textContent = "";
      return;
    }

    setStatus(`Gematria ${skip} → found ${occurrences.length} occurrence${occurrences.length === 1 ? "" : "s"} at skip ±${skip}.`);
    renderOccurrenceList(termLetters, termLetters);
    selectOccurrence(0, termLetters);
  }, 10);
}

function wireEvents() {
  els.termInput.addEventListener("input", updateGematriaPreview);
  els.termInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
  els.searchBtn.addEventListener("click", runSearch);

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
    state.lexiconIndex = buildLexiconAutomaton(lexicon);
    setStatus(`Loaded ${torah.letters.length.toLocaleString()} letters of Torah text. Ready.`);
  } catch (err) {
    setStatus("Failed to load data: " + err.message, true);
    return;
  } finally {
    els.searchBtn.disabled = false;
  }

  wireEvents();
  updateGematriaPreview();
}

init();
