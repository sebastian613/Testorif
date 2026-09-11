import { CIPHERS, computeAllCiphers } from "./gematria.js";
import { loadDatasets, findMatches } from "./data.js";

const PAGE_SIZE = 100;

const state = {
  datasets: null,
  activeCipher: "ordinal",
  activeTab: "words",
  values: null, // current computeAllCiphers() result for the input text
  matches: { words: [], phrases: [], verses: [] },
  visibleCount: { words: PAGE_SIZE, phrases: PAGE_SIZE, verses: PAGE_SIZE },
  filterText: "",
};

const el = {
  nameInput: document.getElementById("name-input"),
  status: document.getElementById("status"),
  cipherBadges: document.getElementById("cipher-badges"),
  resultsSection: document.getElementById("results-section"),
  tabs: document.getElementById("tabs"),
  filterInput: document.getElementById("filter-input"),
  resultsList: document.getElementById("results-list"),
  resultsMeta: document.getElementById("results-meta"),
  loadMoreBtn: document.getElementById("load-more"),
};

init();

async function init() {
  setStatus("Loading dictionary, phrase list, and King James Bible…", true);
  try {
    state.datasets = await loadDatasets((msg) => setStatus(msg, true));
    setStatus("", false);
    el.nameInput.disabled = false;
    el.nameInput.focus();
    renderCipherBadges();
    if (el.nameInput.value.trim()) {
      recompute();
    }
  } catch (err) {
    console.error(err);
    setStatus(
      "Failed to load data. Try refreshing, or serve this app over HTTP instead of opening the file directly.",
      false,
      true
    );
  }
}

el.nameInput.addEventListener("input", debounce(recompute, 150));
el.filterInput.addEventListener("input", debounce(() => {
  state.filterText = el.filterInput.value.trim().toLowerCase();
  resetVisibleCount();
  renderResultsList();
}, 150));

el.loadMoreBtn.addEventListener("click", () => {
  state.visibleCount[state.activeTab] += PAGE_SIZE;
  renderResultsList();
});

function recompute() {
  const text = el.nameInput.value;
  if (!text.trim() || !state.datasets) {
    state.values = null;
    el.resultsSection.hidden = true;
    renderCipherBadges();
    return;
  }
  state.values = computeAllCiphers(text);
  renderCipherBadges();
  recomputeMatches();
  el.resultsSection.hidden = false;
}

function renderCipherBadges() {
  el.cipherBadges.innerHTML = "";
  for (const cipher of CIPHERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cipher-badge" + (cipher.key === state.activeCipher ? " active" : "");
    const value = state.values ? state.values[cipher.key] : null;
    btn.innerHTML = `<span class="cipher-label">${cipher.label}</span><span class="cipher-value">${
      value === null ? "–" : value
    }</span>`;
    btn.disabled = !state.values;
    btn.addEventListener("click", () => {
      state.activeCipher = cipher.key;
      renderCipherBadges();
      recomputeMatches();
    });
    el.cipherBadges.appendChild(btn);
  }
}

function recomputeMatches() {
  if (!state.values || !state.datasets) return;
  const target = state.values[state.activeCipher];
  const { words, phrases, verses } = state.datasets;

  const nameLower = el.nameInput.value.trim().toLowerCase();

  state.matches.words = findMatches(words, state.activeCipher, target).filter(
    (i) => words.items[i].toLowerCase() !== nameLower
  );
  state.matches.phrases = findMatches(phrases, state.activeCipher, target).filter(
    (i) => phrases.items[i].toLowerCase() !== nameLower
  );
  state.matches.verses = findMatches(verses, state.activeCipher, target);

  resetVisibleCount();
  renderTabs();
  renderResultsList();
}

function resetVisibleCount() {
  state.visibleCount = { words: PAGE_SIZE, phrases: PAGE_SIZE, verses: PAGE_SIZE };
}

function renderTabs() {
  el.tabs.innerHTML = "";
  const labels = { words: "Words", phrases: "Phrases", verses: "Bible Verses (KJV)" };
  for (const tab of ["words", "phrases", "verses"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (tab === state.activeTab ? " active" : "");
    btn.textContent = `${labels[tab]} (${state.matches[tab].length})`;
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
    indices = indices.filter((i) => {
      const text = tab === "verses" ? dataset.items[i].text : dataset.items[i];
      return text.toLowerCase().includes(state.filterText);
    });
  }

  el.resultsMeta.textContent = state.values
    ? `${indices.length} match${indices.length === 1 ? "" : "es"} for value ${
        state.values[state.activeCipher]
      }`
    : "";

  const visible = indices.slice(0, state.visibleCount[tab]);
  el.resultsList.innerHTML = "";

  if (indices.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No matches found.";
    el.resultsList.appendChild(empty);
  } else {
    for (const i of visible) {
      const li = document.createElement("li");
      if (tab === "verses") {
        const v = dataset.items[i];
        li.innerHTML = `<span class="verse-ref">${escapeHtml(v.ref)}</span><span class="verse-text">${escapeHtml(
          v.text
        )}</span>`;
      } else {
        li.textContent = dataset.items[i];
      }
      el.resultsList.appendChild(li);
    }
  }

  el.loadMoreBtn.hidden = visible.length >= indices.length;
}

function setStatus(message, loading, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("loading", !!loading);
  el.status.classList.toggle("error", !!isError);
  el.status.hidden = !message;
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
