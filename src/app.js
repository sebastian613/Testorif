import {
  HE_CIPHERS,
  EN_CIPHERS,
  HE_CIPHER_KEYS,
  EN_CIPHER_KEYS,
  computeAllHebrewCiphers,
  computeHebrewCipherVector,
  computeAllEnglishCiphers,
  computeEnglishCipherVector,
  stripToHebrewLetters,
} from "./gematria.js";
import { loadModeDatasets, findMatches } from "./data.js";

const PAGE_SIZE = 100;
// Must match MAX_OCC used when the Hebrew data files were generated — once an
// item's occurrence list reaches this length we show "N+" instead of "N".
const OCC_CAP = 8;

// All instructional copy is in English regardless of mode; `contentDir` is
// only the direction of the actual Hebrew/English text being matched
// (the input box, result headlines, and cited verse text).
const MODES = {
  hebrew: {
    key: "hebrew",
    contentDir: "rtl",
    ciphers: HE_CIPHERS,
    cipherKeys: HE_CIPHER_KEYS,
    computeAll: computeAllHebrewCiphers,
    computeVector: computeHebrewCipherVector,
    files: {
      words: "data/hebrew-words.json",
      phrases: "data/hebrew-phrases.json",
      verses: "data/tanakh.json",
    },
    loadingLabel: "Loading the Hebrew word list and the Tanakh…",
    indexingLabel: "Building the gematria index…",
    inputLabel: "Name or word (in Hebrew letters)",
    inputPlaceholder: "e.g. דוד",
    defaultValue: "דוד",
    filterPlaceholder: "Filter these results…",
    tabLabels: { words: "Words", phrases: "Phrases", verses: "Verses (Tanakh)" },
    emptyText: "No matches found.",
    metaTemplate: (count, value) => `${count} match${count === 1 ? "" : "es"} for value ${value}`,
    textOf: {
      words: (item) => item[0],
      phrases: (item) => item[0],
      verses: (v) => v.text,
    },
    occurrencesOf: {
      words: (item) => item[1],
      phrases: (item) => item[1],
    },
    occurrenceLabel: (count, capped) =>
      capped ? `${count}+ occurrences in the Tanakh` : count === 1 ? "Only occurrence in the Tanakh" : `${count} occurrences in the Tanakh`,
    verseRef: (v) => v.ref,
    verseBody: (v) => v.text,
    eyebrow: "Hebrew Gematria · Tanakh",
    title: "Gematria Calculator",
    subtitle:
      "Enter a name or word in Hebrew letters to calculate its gematria across five traditional systems, then see every word, phrase, and Tanakh verse that shares that value — each one grounded in the pasuk (verse) it's drawn from, with an English translation alongside.",
    footer:
      "Systems: Standard Value (Mispar Hechrachi), Full/Final Value (Mispar Gadol — final letters take large values), Ordinal Value (Mispar Siduri — position in the alphabet), Reduced Value (Mispar Katan — each letter reduced to one digit), and Integral Reduced (Mispar Katan Mispari — the whole word's total reduced to one digit). Every word and phrase is matched directly against the Masoretic Text (Leningrad Codex) of the Tanakh. English translations are word-for-word and aligned automatically, so a small number of verses don't have one available.",
  },
  english: {
    key: "english",
    contentDir: "ltr",
    ciphers: EN_CIPHERS,
    cipherKeys: EN_CIPHER_KEYS,
    computeAll: computeAllEnglishCiphers,
    computeVector: computeEnglishCipherVector,
    files: {
      words: "data/words.json",
      phrases: "data/phrases.json",
      verses: "data/kjv.json",
    },
    loadingLabel: "Loading dictionary, phrase list, and King James Bible…",
    indexingLabel: "Indexing…",
    inputLabel: "Name or phrase",
    inputPlaceholder: "e.g. John Smith",
    defaultValue: "John Smith",
    filterPlaceholder: "Filter these results…",
    tabLabels: { words: "Words", phrases: "Phrases", verses: "Bible Verses (KJV)" },
    emptyText: "No matches found.",
    metaTemplate: (count, value) => `${count} match${count === 1 ? "" : "es"} for value ${value}`,
    textOf: {
      words: (item) => item,
      phrases: (item) => item,
      verses: (v) => v.text,
    },
    verseRef: (v) => v.ref,
    verseBody: (v) => v.text,
    eyebrow: "English Gematria · bonus feature",
    title: "Gematria Calculator",
    subtitle:
      "Enter a name or phrase to calculate its gematria across six standard English ciphers, then browse every word, phrase, and Bible verse (KJV) that shares that value.",
    footer:
      "Ciphers: English Ordinal (A=1…Z=26), Full Reduction, Reverse Ordinal (Z=1…A=26), Reverse Reduction, Sumerian (Ordinal ×6), and Reverse Sumerian. Only letters A–Z are counted.",
  },
};

const state = {
  modeKey: "hebrew",
  datasets: {}, // modeKey -> loaded datasets
  inputValues: {},
  activeCipher: {},
  activeTab: { hebrew: "words", english: "words" },
  values: {},
  matches: { words: [], phrases: [], verses: [] },
  visibleCount: { words: PAGE_SIZE, phrases: PAGE_SIZE, verses: PAGE_SIZE },
  filterText: "",
};

const el = {
  eyebrow: document.getElementById("eyebrow"),
  title: document.getElementById("title"),
  subtitle: document.getElementById("subtitle"),
  modeSwitch: document.getElementById("mode-switch"),
  inputLabel: document.getElementById("input-label"),
  nameInput: document.getElementById("name-input"),
  status: document.getElementById("status"),
  cipherBadges: document.getElementById("cipher-badges"),
  resultsSection: document.getElementById("results-section"),
  tabs: document.getElementById("tabs"),
  filterInput: document.getElementById("filter-input"),
  resultsList: document.getElementById("results-list"),
  resultsMeta: document.getElementById("results-meta"),
  loadMoreBtn: document.getElementById("load-more"),
  footerText: document.getElementById("footer-text"),
};

init();

function currentMode() {
  return MODES[state.modeKey];
}

async function init() {
  wireModeSwitch();
  wireInputs();
  await switchMode("hebrew", { initial: true });
}

function wireModeSwitch() {
  el.modeSwitch.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchMode(btn.dataset.mode));
  });
}

function wireInputs() {
  el.nameInput.addEventListener("input", debounce(() => {
    state.inputValues[state.modeKey] = el.nameInput.value;
    recompute();
  }, 150));

  el.filterInput.addEventListener("input", debounce(() => {
    state.filterText = el.filterInput.value.trim().toLowerCase();
    resetVisibleCount();
    renderResultsList();
  }, 150));

  el.loadMoreBtn.addEventListener("click", () => {
    state.visibleCount[state.activeTab[state.modeKey]] += PAGE_SIZE;
    renderResultsList();
  });
}

async function switchMode(modeKey, { initial = false } = {}) {
  if (!initial && modeKey === state.modeKey) return;
  state.modeKey = modeKey;
  const mode = currentMode();

  el.modeSwitch.querySelectorAll(".mode-tab").forEach((btn) => {
    const active = btn.dataset.mode === modeKey;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });

  el.eyebrow.textContent = mode.eyebrow;
  el.title.textContent = mode.title;
  el.subtitle.textContent = mode.subtitle;
  el.inputLabel.textContent = mode.inputLabel;
  el.nameInput.placeholder = mode.inputPlaceholder;
  el.nameInput.dir = mode.contentDir;
  el.filterInput.placeholder = mode.filterPlaceholder;
  el.filterInput.dir = mode.contentDir;
  el.loadMoreBtn.textContent = "Load more";
  el.footerText.textContent = mode.footer;

  if (!(modeKey in state.activeCipher)) {
    state.activeCipher[modeKey] = mode.ciphers[0].key;
  }
  if (!(modeKey in state.inputValues)) {
    state.inputValues[modeKey] = mode.defaultValue;
  }

  el.nameInput.value = state.inputValues[modeKey];
  el.filterInput.value = "";
  state.filterText = "";

  if (!state.datasets[modeKey]) {
    el.nameInput.disabled = true;
    el.resultsSection.hidden = true;
    setStatus(mode.loadingLabel, true);
    try {
      state.datasets[modeKey] = await loadModeDatasets(
        {
          files: mode.files,
          cipherKeys: mode.cipherKeys,
          computeVector: mode.computeVector,
          textOf: mode.textOf,
          loadingLabel: mode.loadingLabel,
          indexingLabel: mode.indexingLabel,
        },
        (msg) => setStatus(msg, true)
      );
      setStatus("", false);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load data. Try refreshing, or serve this app over HTTP.", false, true);
      return;
    }
    el.nameInput.disabled = false;
  }

  recompute();
  if (initial) el.nameInput.focus();
}

function recompute() {
  const mode = currentMode();
  const text = el.nameInput.value;
  if (!text.trim() || !state.datasets[mode.key]) {
    state.values[mode.key] = null;
    el.resultsSection.hidden = true;
    renderCipherBadges();
    return;
  }
  state.values[mode.key] = mode.computeAll(text);
  renderCipherBadges();
  recomputeMatches();
  el.resultsSection.hidden = false;
}

function renderCipherBadges() {
  const mode = currentMode();
  const values = state.values[mode.key];
  el.cipherBadges.innerHTML = "";
  for (const cipher of mode.ciphers) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cipher-badge" + (cipher.key === state.activeCipher[mode.key] ? " active" : "");
    const value = values ? values[cipher.key] : null;
    btn.innerHTML = `<span class="cipher-label">${cipher.label}</span>${
      cipher.sub ? `<span class="cipher-sub" dir="rtl">${cipher.sub}</span>` : ""
    }<span class="cipher-value">${value === null ? "–" : value}</span>`;
    btn.disabled = !values;
    btn.addEventListener("click", () => {
      state.activeCipher[mode.key] = cipher.key;
      renderCipherBadges();
      recomputeMatches();
    });
    el.cipherBadges.appendChild(btn);
  }
}

function recomputeMatches() {
  const mode = currentMode();
  const values = state.values[mode.key];
  const datasets = state.datasets[mode.key];
  if (!values || !datasets) return;

  const cipherKey = state.activeCipher[mode.key];
  const target = values[cipherKey];
  const { words, phrases, verses } = datasets;
  const rawInput = el.nameInput.value.trim();
  const selfKey = mode.key === "hebrew" ? stripToHebrewLetters(rawInput) : rawInput;

  state.matches.words = findMatches(words, cipherKey, target).filter(
    (i) => mode.textOf.words(words.items[i]) !== selfKey
  );
  state.matches.phrases = findMatches(phrases, cipherKey, target).filter(
    (i) => mode.textOf.phrases(phrases.items[i]) !== selfKey
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
  const mode = currentMode();
  el.tabs.innerHTML = "";
  for (const tab of ["words", "phrases", "verses"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (tab === state.activeTab[mode.key] ? " active" : "");
    btn.textContent = `${mode.tabLabels[tab]} (${state.matches[tab].length})`;
    btn.addEventListener("click", () => {
      state.activeTab[mode.key] = tab;
      state.filterText = "";
      el.filterInput.value = "";
      renderTabs();
      renderResultsList();
    });
    el.tabs.appendChild(btn);
  }
}

function renderResultsList() {
  const mode = currentMode();
  const tab = state.activeTab[mode.key];
  const dataset = state.datasets[mode.key][tab];
  let indices = state.matches[tab];

  if (state.filterText) {
    indices = indices.filter((i) => mode.textOf[tab](dataset.items[i]).toLowerCase().includes(state.filterText));
  }

  const values = state.values[mode.key];
  el.resultsMeta.textContent = values
    ? mode.metaTemplate(indices.length, values[state.activeCipher[mode.key]])
    : "";

  const visible = indices.slice(0, state.visibleCount[tab]);
  el.resultsList.innerHTML = "";

  if (indices.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = mode.emptyText;
    el.resultsList.appendChild(empty);
  } else {
    const verseDataset = state.datasets[mode.key].verses;
    for (const i of visible) {
      const li = document.createElement("li");
      const item = dataset.items[i];
      if (tab === "verses") {
        li.innerHTML =
          `<span class="verse-ref">${escapeHtml(mode.verseRef(item))}</span>` +
          `<span class="verse-text" dir="${mode.contentDir}">${escapeHtml(mode.verseBody(item))}</span>`;
      } else {
        const headline = document.createElement("div");
        headline.className = "result-headline";
        headline.dir = mode.contentDir;
        headline.textContent = mode.textOf[tab](item);
        li.appendChild(headline);

        const occurrences = mode.occurrencesOf && mode.occurrencesOf[tab] ? mode.occurrencesOf[tab](item) : null;
        if (occurrences && occurrences.length && verseDataset) {
          const [verseIndex, heStart, heEnd, enStart, enEnd] = occurrences[0];
          const verse = verseDataset.items[verseIndex];
          const capped = occurrences.length >= OCC_CAP;
          const citation = document.createElement("div");
          citation.className = "result-citation";

          let html =
            `<span class="verse-ref">${escapeHtml(mode.verseRef(verse))}` +
            `<span class="occurrence-count"> · ${escapeHtml(mode.occurrenceLabel(occurrences.length, capped))}</span></span>` +
            `<span class="verse-text" dir="rtl">${highlightSpan(verse.text, heStart, heEnd)}</span>`;

          if (enStart !== -1 && verse.en) {
            html += `<span class="verse-text verse-text-en" dir="ltr">${highlightSpan(verse.en, enStart, enEnd)}</span>`;
          }

          citation.innerHTML = html;
          li.appendChild(citation);
        }
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
