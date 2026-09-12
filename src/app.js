import { HECHRACHI_INFO, computeHechrachi, stripToHebrewLetters, numberToHebrewNumeral } from "./gematria.js";
import { loadDatasets, findMatches, textOf } from "./data.js";
import { findNotableValue } from "./notable-values.js";

const PAGE_SIZE = 100;
// Must match MAX_OCC used when the Hebrew data files were generated — once an
// item's occurrence list reaches this length we show "N+" instead of "N".
const OCC_CAP = 8;
const DEFAULT_VALUE = "דוד";
const RECENT_KEY = "gematria:recentSearches";
const RECENT_MAX = 12;

const TAB_LABELS = { words: "Words", phrases: "Phrases", verses: "Verses (Tanakh)" };

const state = {
  datasets: null,
  inputValue: DEFAULT_VALUE,
  activeTab: "words",
  value: null,
  matches: { words: [], phrases: [], verses: [] },
  visibleCount: { words: PAGE_SIZE, phrases: PAGE_SIZE, verses: PAGE_SIZE },
  filterText: "",
  recentSearches: loadRecentSearches(),
};

const el = {
  nameInput: document.getElementById("name-input"),
  status: document.getElementById("status"),
  numeralHint: document.getElementById("numeral-hint"),
  notableValue: document.getElementById("notable-value"),
  valueDisplay: document.getElementById("value-display"),
  resultsSection: document.getElementById("results-section"),
  tabs: document.getElementById("tabs"),
  filterInput: document.getElementById("filter-input"),
  resultsList: document.getElementById("results-list"),
  resultsMeta: document.getElementById("results-meta"),
  loadMoreBtn: document.getElementById("load-more"),
  recentSearches: document.getElementById("recent-searches"),
  exportBtn: document.getElementById("export-pdf"),
};

init();

async function init() {
  wireInputs();
  renderRecentSearches();

  el.nameInput.value = state.inputValue;
  el.nameInput.disabled = true;
  setStatus("Loading the Hebrew word list and the Tanakh…", true);

  try {
    state.datasets = await loadDatasets((msg) => setStatus(msg, true));
    setStatus("", false);
  } catch (err) {
    console.error(err);
    setStatus("Failed to load data. Try refreshing, or serve this app over HTTP.", false, true);
    return;
  }

  el.nameInput.disabled = false;
  el.nameInput.focus();
  recompute();
}

function wireInputs() {
  el.nameInput.addEventListener("input", debounce(() => {
    state.inputValue = el.nameInput.value;
    recompute();
  }, 150));

  el.nameInput.addEventListener("blur", () => commitRecentSearch());
  el.nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commitRecentSearch();
  });

  el.filterInput.addEventListener("input", debounce(() => {
    state.filterText = el.filterInput.value.trim().toLowerCase();
    resetVisibleCount();
    renderResultsList();
  }, 150));

  el.loadMoreBtn.addEventListener("click", () => {
    state.visibleCount[state.activeTab] += PAGE_SIZE;
    renderResultsList();
  });

  el.exportBtn.addEventListener("click", () => window.print());
}

function recompute() {
  const text = el.nameInput.value;
  const trimmed = text.trim();
  if (!trimmed || !state.datasets) {
    state.value = null;
    renderNumeralHint(null);
    el.resultsSection.hidden = true;
    renderValueDisplay();
    return;
  }

  if (/^\d+$/.test(trimmed)) {
    // A plain number is the target value itself — searched the same way a
    // word's computed value would be, not spelled out and recomputed.
    state.value = parseInt(trimmed, 10);
    renderNumeralHint(numberToHebrewNumeral(state.value));
  } else {
    state.value = computeHechrachi(text);
    renderNumeralHint(null);
  }

  renderValueDisplay();
  renderNotableValue();
  recomputeMatches();
  el.resultsSection.hidden = false;
}

function renderNotableValue() {
  const found = state.value !== null ? findNotableValue(state.value) : null;
  if (!found) {
    el.notableValue.hidden = true;
    return;
  }
  el.notableValue.hidden = false;
  el.notableValue.innerHTML = `<strong>${found.value}</strong> is traditionally associated with ${escapeHtml(found.note)}`;
}

function renderValueDisplay() {
  el.valueDisplay.innerHTML = "";
  const card = document.createElement("div");
  card.className = "value-card";
  card.dataset.tooltip = HECHRACHI_INFO.formula;
  card.setAttribute("aria-label", `${HECHRACHI_INFO.label}: ${HECHRACHI_INFO.formula}`);
  card.innerHTML =
    `<span class="value-label">${HECHRACHI_INFO.label}</span>` +
    `<span class="value-sub" dir="rtl">${HECHRACHI_INFO.sub}</span>` +
    `<span class="value-number">${state.value === null ? "–" : state.value}</span>`;
  el.valueDisplay.appendChild(card);
}

function recomputeMatches() {
  const datasets = state.datasets;
  if (state.value === null || !datasets) return;

  const target = state.value;
  const { words, phrases, verses } = datasets;
  const selfKey = stripToHebrewLetters(el.nameInput.value.trim());

  state.matches.words = findMatches(words.values, target).filter(
    (i) => textOf.words(words.items[i]) !== selfKey
  );
  state.matches.phrases = findMatches(phrases.values, target).filter(
    (i) => textOf.phrases(phrases.items[i]) !== selfKey
  );
  state.matches.verses = findMatches(verses.values, target);

  resetVisibleCount();
  renderTabs();
  renderResultsList();
}

function resetVisibleCount() {
  state.visibleCount = { words: PAGE_SIZE, phrases: PAGE_SIZE, verses: PAGE_SIZE };
}

function renderTabs() {
  el.tabs.innerHTML = "";
  for (const tab of ["words", "phrases", "verses"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (tab === state.activeTab ? " active" : "");
    btn.textContent = `${TAB_LABELS[tab]} (${state.matches[tab].length})`;
    btn.addEventListener("click", () => {
      state.activeTab = tab;
      state.filterText = "";
      el.filterInput.value = "";
      renderTabs();
      renderResultsList();
    });
    el.tabs.appendChild(btn);
  }
}

function renderResultsList() {
  const tab = state.activeTab;
  const dataset = state.datasets[tab];
  let indices = state.matches[tab];

  if (state.filterText) {
    indices = indices.filter((i) => textOf[tab](dataset.items[i]).toLowerCase().includes(state.filterText));
  }

  el.resultsMeta.textContent = state.value !== null
    ? `${TAB_LABELS[tab]} — ${indices.length} match${indices.length === 1 ? "" : "es"} for value ${state.value}`
    : "";

  const visible = indices.slice(0, state.visibleCount[tab]);
  el.resultsList.innerHTML = "";

  if (indices.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No matches found.";
    el.resultsList.appendChild(empty);
  } else {
    const verseDataset = state.datasets.verses;
    for (const i of visible) {
      const li = document.createElement("li");
      const item = dataset.items[i];
      if (tab === "verses") {
        li.innerHTML = renderVerseBlock(item);
      } else {
        const headline = document.createElement("div");
        headline.className = "result-headline";
        headline.dir = "rtl";
        headline.textContent = textOf[tab](item);
        li.appendChild(headline);

        const occurrences = item[1];
        if (occurrences && occurrences.length) {
          const occ = occurrences[0];
          const [verseIndex, start, end] = occ;
          const enStart = occ.length > 3 ? occ[3] : -1;
          const enEnd = occ.length > 3 ? occ[4] : -1;
          const verse = verseDataset.items[verseIndex];
          const capped = occurrences.length >= OCC_CAP;
          const label =
            capped ? `${occurrences.length}+ occurrences in the Tanakh`
              : occurrences.length === 1 ? "Only occurrence in the Tanakh"
              : `${occurrences.length} occurrences in the Tanakh`;

          const citation = document.createElement("div");
          citation.className = "result-citation";
          citation.innerHTML =
            `<span class="verse-ref">${escapeHtml(verse.ref)}` +
            `<span class="occurrence-count"> · ${escapeHtml(label)}</span></span>` +
            `<span class="verse-text" dir="rtl">${highlightSpan(verse.text, start, end)}</span>` +
            (verse.en
              ? `<span class="lang-label">JPS 1917 translation</span><span class="verse-text verse-text-en" dir="ltr">${
                  enStart !== -1
                    ? highlightSpan(verse.en, enStart, enEnd)
                    : escapeHtml(verse.en)
                }</span>`
              : "");
          li.appendChild(citation);
        }
      }
      el.resultsList.appendChild(li);
    }
  }

  el.loadMoreBtn.hidden = visible.length >= indices.length;
}

function renderVerseBlock(v) {
  return (
    `<span class="verse-ref">${escapeHtml(v.ref)}</span>` +
    `<span class="verse-text" dir="rtl">${escapeHtml(v.text)}</span>` +
    (v.en
      ? `<span class="lang-label">JPS 1917 translation</span><span class="verse-text verse-text-en" dir="ltr">${escapeHtml(v.en)}</span>`
      : "")
  );
}

// --- Recent searches --------------------------------------------------------

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearches() {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(state.recentSearches));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — recent
    // searches just won't persist across reloads this session.
  }
}

function commitRecentSearch() {
  const value = el.nameInput.value.trim();
  const isNumeral = /^\d+$/.test(value);
  if (!value || (!isNumeral && !stripToHebrewLetters(value))) return;
  state.recentSearches = [value, ...state.recentSearches.filter((v) => v !== value)].slice(0, RECENT_MAX);
  saveRecentSearches();
  renderRecentSearches();
}

function renderRecentSearches() {
  el.recentSearches.innerHTML = "";
  if (state.recentSearches.length === 0) {
    el.recentSearches.hidden = true;
    return;
  }
  el.recentSearches.hidden = false;
  for (const value of state.recentSearches) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recent-chip";
    btn.dir = "rtl";
    btn.textContent = value;
    btn.addEventListener("click", () => {
      el.nameInput.value = value;
      state.inputValue = value;
      recompute();
      commitRecentSearch();
    });
    el.recentSearches.appendChild(btn);
  }
}

// --- Rendering helpers -------------------------------------------------------

function renderNumeralHint(hebrewNumeral) {
  if (!hebrewNumeral) {
    el.numeralHint.hidden = true;
    return;
  }
  el.numeralHint.hidden = false;
  el.numeralHint.innerHTML = `Searching for this value directly — traditionally written <span dir="rtl">${escapeHtml(
    hebrewNumeral
  )}</span>`;
}

function setStatus(message, loading, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("loading", !!loading);
  el.status.classList.toggle("error", !!isError);
  el.status.hidden = !message;
}

function highlightSpan(text, start, end) {
  if (start === end) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, start))}<mark>${escapeHtml(text.slice(start, end))}</mark>${escapeHtml(
    text.slice(end)
  )}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
