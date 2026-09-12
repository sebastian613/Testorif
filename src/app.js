import { HE_CIPHERS, HE_CIPHER_KEYS, computeAllHebrewCiphers, stripToHebrewLetters, numberToHebrewNumeral } from "./gematria.js";
import { loadDatasets, findMatches, textOf } from "./data.js";
import { findNotableValue } from "./notable-values.js";

const CIPHER_LABELS = Object.fromEntries(HE_CIPHERS.map((c) => [c.key, c.label]));

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
  activeCipher: HE_CIPHERS[0].key,
  activeTab: "words",
  values: null,
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
  cipherBadges: document.getElementById("cipher-badges"),
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
    state.values = null;
    renderNumeralHint(null);
    el.resultsSection.hidden = true;
    renderCipherBadges();
    return;
  }

  if (/^\d+$/.test(trimmed)) {
    // A plain number is the target value itself — searched the same way a
    // word's computed value would be, under whichever system you pick, not
    // spelled out and recomputed from letters.
    const n = parseInt(trimmed, 10);
    state.values = {};
    for (const key of HE_CIPHER_KEYS) state.values[key] = n;
    renderNumeralHint(numberToHebrewNumeral(n));
  } else {
    state.values = computeAllHebrewCiphers(text);
    renderNumeralHint(null);
  }

  renderCipherBadges();
  renderNotableValue();
  recomputeMatches();
  el.resultsSection.hidden = false;
}

function renderNotableValue() {
  const found = state.values ? findNotableValue(state.activeCipher, state.values[state.activeCipher]) : null;
  if (!found) {
    el.notableValue.hidden = true;
    return;
  }
  el.notableValue.hidden = false;
  el.notableValue.innerHTML = `<strong>${found.value}</strong> is traditionally associated with ${escapeHtml(found.note)}`;
}

function renderCipherBadges() {
  el.cipherBadges.innerHTML = "";
  for (const cipher of HE_CIPHERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cipher-badge" + (cipher.key === state.activeCipher ? " active" : "");
    const value = state.values ? state.values[cipher.key] : null;
    btn.innerHTML = `<span class="cipher-label">${cipher.label}</span>` +
      `<span class="cipher-sub" dir="rtl">${cipher.sub}</span>` +
      `<span class="cipher-value">${value === null ? "–" : value}</span>`;
    btn.disabled = !state.values;
    btn.dataset.tooltip = cipher.formula;
    btn.setAttribute("aria-label", `${cipher.label}: ${cipher.formula}`);
    btn.addEventListener("click", () => {
      state.activeCipher = cipher.key;
      renderCipherBadges();
      renderNotableValue();
      recomputeMatches();
    });
    el.cipherBadges.appendChild(btn);
  }
}

function recomputeMatches() {
  const datasets = state.datasets;
  if (!state.values || !datasets) return;

  const cipherKey = state.activeCipher;
  const target = state.values[cipherKey];
  const { words, phrases, verses } = datasets;
  const selfKey = stripToHebrewLetters(el.nameInput.value.trim());

  state.matches.words = findMatches(words, cipherKey, target).filter(
    (i) => textOf.words(words.items[i]) !== selfKey
  );
  state.matches.phrases = findMatches(phrases, cipherKey, target).filter(
    (i) => textOf.phrases(phrases.items[i]) !== selfKey
  );
  state.matches.verses = findMatches(verses, cipherKey, target);

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

  el.resultsMeta.textContent = state.values
    ? `${TAB_LABELS[tab]} — ${indices.length} match${indices.length === 1 ? "" : "es"} for value ${state.values[state.activeCipher]}`
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
      const connections = renderConnectionsBadge(dataset, i);
      if (tab === "verses") {
        li.innerHTML = renderVerseBlock(item, connections);
      } else {
        const headline = document.createElement("div");
        headline.className = "result-headline";
        headline.dir = "rtl";
        headline.textContent = textOf[tab](item);
        li.appendChild(headline);
        if (connections) li.insertAdjacentHTML("beforeend", connections);

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

// Total Squared (klali) is hechrachi², and Integral Reduced (katanMispari)
// is digitalRoot(hechrachi) — both are pure functions of Standard Value, and
// klali's square is invertible (for positive integers), so within either of
// these two systems the other two are ALWAYS also going to match: that's
// not a coincidence worth flagging, just arithmetic. (Integral Reduced runs
// the other way — many different Standard Values share a digital root — so
// it doesn't force the other two, and stays a real, interesting connection.)
const DETERMINISTIC_SIBLINGS = {
  hechrachi: ["klali", "katanMispari"],
  klali: ["hechrachi", "katanMispari"],
};

/**
 * A result already matches the search on the active cipher (that's why it's
 * a result) — this checks whether it *also* matches on any of the other
 * systems, which (outside the guaranteed pairs above) is a much rarer
 * coincidence worth calling out.
 */
function renderConnectionsBadge(dataset, i) {
  const skip = new Set([state.activeCipher, ...(DETERMINISTIC_SIBLINGS[state.activeCipher] || [])]);
  const extra = [];
  for (const key of HE_CIPHER_KEYS) {
    if (skip.has(key)) continue;
    if (dataset.values[key][i] === state.values[key]) extra.push(key);
  }
  if (extra.length === 0) return "";

  const tooltip = extra.map((key) => `${CIPHER_LABELS[key]} (${dataset.values[key][i]})`).join(", ");
  const label = extra.length === 1 ? "+1 system" : `+${extra.length} systems`;
  return `<span class="connections-badge" data-tooltip="Also matches on: ${escapeHtml(tooltip)}">${label}</span>`;
}

function renderVerseBlock(v, connections = "") {
  return (
    `<span class="verse-ref">${escapeHtml(v.ref)}${connections}</span>` +
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
