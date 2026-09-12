import { HECHRACHI_INFO, computeHechrachi, stripToHebrewLetters, numberToHebrewNumeral } from "./gematria.js";
import { CORPORA, loadDatasets, findMatches, textOf } from "./data.js";
import { findNotableValue } from "./notable-values.js";
import { POPULAR_NUMBERS, POPULAR_PHRASES } from "./popular-searches.js";

const PAGE_SIZE = 100;
// Default occurrence cap — must match MAX_OCC used when a corpus's data
// files were generated, once an item's occurrence list reaches this length
// we show "N+" instead of "N". Most corpora use this default; a corpus
// that used a different cap (see scripts/build_mishneh_torah.py) says so
// via its own `occCap` in data.js's CORPORA.
const OCC_CAP = 8;
const DEFAULT_VALUE = "יאשיהו דוד עזריאל לישאביץ";
const RECENT_KEY = "gematria:recentSearches";
const RECENT_MAX = 12;

const TAB_LABELS = { words: "Words", phrases: "Phrases", passages: "Passages" };

const state = {
  datasets: null,
  inputValue: DEFAULT_VALUE,
  corpus: CORPORA[0].key,
  activeTab: "words",
  value: null,
  matches: { words: [], phrases: [], passages: [] },
  visibleCount: { words: PAGE_SIZE, phrases: PAGE_SIZE, passages: PAGE_SIZE },
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
  corpusTabs: document.getElementById("corpus-tabs"),
  tabs: document.getElementById("tabs"),
  filterInput: document.getElementById("filter-input"),
  resultsList: document.getElementById("results-list"),
  resultsMeta: document.getElementById("results-meta"),
  loadMoreBtn: document.getElementById("load-more"),
  recentSearches: document.getElementById("recent-searches"),
  popularNumbers: document.getElementById("popular-numbers"),
  popularPhrases: document.getElementById("popular-phrases"),
  exportBtn: document.getElementById("copy-markdown"),
};

init();

async function init() {
  wireInputs();
  renderRecentSearches();
  renderPopularSearches();

  const params = new URLSearchParams(location.search);
  if (params.get("q")) state.inputValue = params.get("q");

  el.nameInput.value = state.inputValue;
  el.nameInput.disabled = true;
  setStatus("Loading the Hebrew word list and source texts…", true);

  try {
    state.datasets = await loadDatasets((msg) => setStatus(msg, true));
    setStatus("", false);
  } catch (err) {
    console.error(err);
    setStatus("Failed to load data. Try refreshing, or serve this app over HTTP.", false, true);
    return;
  }

  renderCorpusTabs();
  el.nameInput.disabled = false;
  el.nameInput.focus();
  recompute();
}

/**
 * Search is scoped to one corpus at a time (Tanakh, Mishnah, or Mishneh
 * Torah, chosen here) rather than blending them into one result list —
 * each corpus's word/phrase index is independent (see data.js), so
 * switching corpus re-runs the search against a completely separate
 * dataset.
 */
function renderCorpusTabs() {
  el.corpusTabs.innerHTML = "";
  for (const corpus of CORPORA) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "corpus-tab" + (corpus.key === state.corpus ? " active" : "");
    btn.textContent = corpus.label;
    btn.addEventListener("click", () => {
      if (state.corpus === corpus.key) return;
      state.corpus = corpus.key;
      state.activeTab = "words";
      state.filterText = "";
      el.filterInput.value = "";
      renderCorpusTabs();
      recompute();
    });
    el.corpusTabs.appendChild(btn);
  }
}

function wireInputs() {
  el.nameInput.addEventListener("input", debounce(() => {
    state.inputValue = el.nameInput.value;
    recompute();
  }, 150));

  // Deferred: blur fires synchronously on mousedown, before the browser
  // dispatches mouseup/click — committing (and re-rendering) Recent
  // Searches in place can shift page layout mid-click, so whatever the
  // user was actually clicking below the input can miss its target. A
  // macrotask lets the current click finish first.
  el.nameInput.addEventListener("blur", () => setTimeout(commitRecentSearch, 0));
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

  el.exportBtn.addEventListener("click", () => copyToClipboardWithFeedback(el.exportBtn, buildMarkdownReport));
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
  const datasets = state.datasets && state.datasets[state.corpus];
  if (state.value === null || !datasets) return;

  const target = state.value;
  const { words, phrases, passages } = datasets;
  const selfKey = stripToHebrewLetters(el.nameInput.value.trim());

  state.matches.words = findMatches(words.values, target).filter(
    (i) => textOf.words(words.items[i]) !== selfKey
  );
  state.matches.phrases = findMatches(phrases.values, target).filter(
    (i) => textOf.phrases(phrases.items[i]) !== selfKey
  );
  state.matches.passages = findMatches(passages.values, target);

  resetVisibleCount();
  renderTabs();
  renderResultsList();
}

function resetVisibleCount() {
  state.visibleCount = { words: PAGE_SIZE, phrases: PAGE_SIZE, passages: PAGE_SIZE };
}

function renderTabs() {
  el.tabs.innerHTML = "";
  for (const tab of ["words", "phrases", "passages"]) {
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
  const corpus = CORPORA.find((c) => c.key === state.corpus);
  const occCap = corpus.occCap ?? OCC_CAP;
  const corpusData = state.datasets[state.corpus];
  const dataset = corpusData[tab];
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
    const passageDataset = corpusData.passages;
    for (const i of visible) {
      const li = document.createElement("li");
      const item = dataset.items[i];
      if (tab === "passages") {
        li.innerHTML = renderPassageBlock(item);
        li.querySelector(".verse-ref").appendChild(makeCopyButton(() => buildCopyText("passage", item)));
      } else {
        const headline = document.createElement("div");
        headline.className = "result-headline";
        headline.dir = "rtl";
        headline.textContent = textOf[tab](item);
        headline.appendChild(makeCopyButton(() => buildCopyText(tab, item, passageDataset)));
        li.appendChild(headline);

        const occurrences = item[1];
        if (occurrences && occurrences.length) {
          const occ = occurrences[0];
          const [passageIndex, start, end] = occ;
          const enStart = occ.length > 3 ? occ[3] : -1;
          const enEnd = occ.length > 3 ? occ[4] : -1;
          const passage = passageDataset.items[passageIndex];
          const capped = occurrences.length >= occCap;
          const label =
            capped ? `${occurrences.length}+ occurrences found`
              : occurrences.length === 1 ? "Only occurrence found"
              : `${occurrences.length} occurrences found`;

          const citation = document.createElement("div");
          citation.className = "result-citation";
          citation.innerHTML =
            `<span class="verse-ref">${escapeHtml(passage.ref)}` +
            `<span class="occurrence-count"> · ${escapeHtml(label)}</span></span>` +
            `<span class="verse-text" dir="rtl">${highlightSpan(passage.text, start, end)}</span>` +
            (passage.en
              ? `<span class="lang-label">JPS 1917 translation</span><span class="verse-text verse-text-en" dir="ltr">${
                  enStart !== -1
                    ? highlightSpan(passage.en, enStart, enEnd)
                    : escapeHtml(passage.en)
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

function renderPassageBlock(p) {
  return (
    `<span class="verse-ref">${escapeHtml(p.ref)}</span>` +
    `<span class="verse-text" dir="rtl">${escapeHtml(p.text)}</span>` +
    (p.en
      ? `<span class="lang-label">JPS 1917 translation</span><span class="verse-text verse-text-en" dir="ltr">${escapeHtml(p.en)}</span>`
      : "")
  );
}

// --- Copy / share ------------------------------------------------------------

/** Builds the plain-text summary a result's Copy button puts on the clipboard. */
function buildCopyText(kind, item, passageDataset) {
  if (kind === "passage") {
    return [item.ref, item.text, item.en ? `JPS 1917: ${item.en}` : null].filter(Boolean).join("\n");
  }
  const [text, occurrences] = item;
  const lines = [`${text} — ${HECHRACHI_INFO.label} ${state.value}`];
  if (occurrences && occurrences.length) {
    const passage = passageDataset.items[occurrences[0][0]];
    lines.push(passage.ref, passage.text);
    if (passage.en) lines.push(`JPS 1917: ${passage.en}`);
  }
  return lines.join("\n");
}

/**
 * A full Markdown write-up of the current search and its active tab's
 * visible results — headings, a blockquote per citation. Markdown was
 * chosen over a "Export as PDF" button because it needs nothing but the
 * clipboard to deliver: no window.print() dialog, no window.open()/`<a
 * target="_blank">` new tab, both of which turned out to be silently
 * blocked inside Claude's embedded Artifact preview with no reliable way
 * detected to work around it there. A copied Markdown block pastes cleanly
 * into Notion, Obsidian, GitHub, email, or Word, and converts trivially to
 * a PDF with any Markdown-to-PDF tool if one is still wanted downstream.
 */
function buildMarkdownReport() {
  const tab = state.activeTab;
  const corpusLabel = CORPORA.find((c) => c.key === state.corpus).label;
  const corpusData = state.datasets[state.corpus];
  const passageDataset = corpusData.passages;
  const indices = state.matches[tab].slice(0, state.visibleCount[tab]);
  const lines = [`# ${el.nameInput.value.trim()} — ${HECHRACHI_INFO.label}: ${state.value}`, ""];

  const notable = state.value !== null ? findNotableValue(state.value) : null;
  if (notable) lines.push(`> ${notable.value} is traditionally associated with ${notable.note}`, "");

  lines.push(`## ${corpusLabel} ${TAB_LABELS[tab]} (${state.matches[tab].length})`, "");

  if (indices.length === 0) {
    lines.push("_No matches found._");
  } else if (tab === "passages") {
    for (const i of indices) lines.push(...markdownForPassage(passageDataset.items[i]), "");
  } else {
    const dataset = corpusData[tab];
    for (const i of indices) {
      const item = dataset.items[i];
      lines.push(`### ${textOf[tab](item)}`);
      const occurrences = item[1];
      if (occurrences && occurrences.length) {
        lines.push(...markdownForPassage(passageDataset.items[occurrences[0][0]]));
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim() + "\n";
}

/** Renders one passage citation as a Markdown blockquote (original text, then translation if any). */
function markdownForPassage(p) {
  const lines = [`**${p.ref}**`, `> ${p.text}`];
  if (p.en) lines.push(">", `> *JPS 1917:* ${p.en}`);
  return lines;
}

function makeCopyButton(getText) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.dir = "ltr";
  btn.textContent = "Copy";
  btn.addEventListener("click", () => copyToClipboardWithFeedback(btn, getText));
  return btn;
}

/** Copies getText()'s result to the clipboard, flashing the button's label to confirm. */
async function copyToClipboardWithFeedback(btn, getText) {
  const original = btn.textContent;
  const ok = await writeClipboard(getText());
  btn.textContent = ok ? "Copied!" : "Couldn't copy";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1500);
}

/** navigator.clipboard is blocked in some sandboxed embeds — fall back to
 * the legacy execCommand("copy") path via a temporary offscreen textarea. */
async function writeClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy fallback below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
    el.recentSearches.appendChild(makeSearchChip(value, "recent-chip", "rtl"));
  }
}

/** A search picked from Recent or Popular: fill the input, search, and remember it. */
function selectSearch(value) {
  el.nameInput.value = value;
  state.inputValue = value;
  recompute();
  commitRecentSearch();
}

function makeSearchChip(value, className, dir) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.dir = dir;
  btn.textContent = value;
  btn.addEventListener("click", () => selectSearch(value));
  return btn;
}

function renderPopularSearches() {
  el.popularNumbers.innerHTML = "";
  for (const n of POPULAR_NUMBERS) el.popularNumbers.appendChild(makeSearchChip(n, "popular-chip", "ltr"));

  el.popularPhrases.innerHTML = "";
  for (const phrase of POPULAR_PHRASES) el.popularPhrases.appendChild(makeSearchChip(phrase, "popular-chip", "rtl"));
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
