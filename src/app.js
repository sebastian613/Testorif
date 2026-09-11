import {
  HE_CIPHERS,
  EN_CIPHERS,
  HE_CIPHER_KEYS,
  EN_CIPHER_KEYS,
  computeAllHebrewCiphers,
  computeHebrewCipherVector,
  computeAllEnglishCiphers,
  computeEnglishCipherVector,
} from "./gematria.js";
import { loadModeDatasets, findMatches } from "./data.js";

const PAGE_SIZE = 100;

const MODES = {
  hebrew: {
    key: "hebrew",
    dir: "rtl",
    lang: "he",
    ciphers: HE_CIPHERS,
    cipherKeys: HE_CIPHER_KEYS,
    computeAll: computeAllHebrewCiphers,
    computeVector: computeHebrewCipherVector,
    files: {
      words: "data/hebrew-words.json",
      phrases: "data/hebrew-phrases.json",
      verses: "data/tanakh.json",
    },
    loadingLabel: "טוען מילון עברי, ביטויים, ותנ״ך…",
    indexingLabel: "בונה אינדקס גימטרי…",
    inputLabel: "שם או מילה",
    inputPlaceholder: "לדוגמה: דוד",
    defaultValue: "דוד",
    filterPlaceholder: "סינון תוצאות…",
    tabLabels: { words: "מילים", phrases: "ביטויים", verses: "פסוקי תנ״ך" },
    emptyText: "לא נמצאו התאמות.",
    metaTemplate: (count, value) => `${count} התאמות לערך ${value}`,
    verseText: (v) => `${v.text} — ${v.ref}`,
    verseRef: (v) => v.ref,
    verseBody: (v) => v.text,
    eyebrow: "גימטריה עברית · מקרא",
    title: "מחשבון גימטריה",
    subtitle:
      "הזינו שם או מילה בעברית כדי לחשב את ערכו הגימטרי בכמה שיטות מסורתיות, ולמצוא כל מילה, ביטוי ופסוק בתנ״ך שמקבלים אותו ערך בדיוק.",
    footer:
      "שיטות: מספר הכרחי (הערך הרגיל), מספר גדול (אותיות סופיות מקבלות ערך גדול), מספר סידורי (מיקום באלף-בית), מספר קטן (צמצום כל אות לספרה בודדת), ומספר קטן מספרי (צמצום סכום המילה כולה לספרה בודדת). מאגר הפסוקים הוא נוסח המסורה (כתר לנינגרד) של כל ספרי התנ״ך.",
  },
  english: {
    key: "english",
    dir: "ltr",
    lang: "en",
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
    verseRef: (v) => v.ref,
    verseBody: (v) => v.text,
    eyebrow: "English gematria · bonus feature",
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
  loading: {}, // modeKey -> boolean
  inputValues: {},
  activeCipher: {},
  activeTab: { hebrew: "words", english: "words" },
  values: {},
  matches: { words: [], phrases: [], verses: [] },
  visibleCount: { words: PAGE_SIZE, phrases: PAGE_SIZE, verses: PAGE_SIZE },
  filterText: "",
};

const el = {
  html: document.documentElement,
  pageRoot: document.querySelector(".page"),
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

  el.html.lang = mode.lang;
  el.html.dir = mode.dir;
  if (el.pageRoot) {
    el.pageRoot.lang = mode.lang;
    el.pageRoot.dir = mode.dir;
  }
  el.eyebrow.textContent = mode.eyebrow;
  el.title.textContent = mode.title;
  el.subtitle.textContent = mode.subtitle;
  el.inputLabel.textContent = mode.inputLabel;
  el.nameInput.placeholder = mode.inputPlaceholder;
  el.nameInput.dir = mode.dir;
  el.filterInput.placeholder = mode.filterPlaceholder;
  el.loadMoreBtn.textContent = mode.dir === "rtl" ? "עוד תוצאות" : "Load more";
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
          loadingLabel: mode.loadingLabel,
          indexingLabel: mode.indexingLabel,
        },
        (msg) => setStatus(msg, true)
      );
      setStatus("", false);
    } catch (err) {
      console.error(err);
      setStatus(
        mode.dir === "rtl"
          ? "טעינת הנתונים נכשלה. נסו לרענן, או להפעיל את הדף דרך שרת HTTP."
          : "Failed to load data. Try refreshing, or serve this app over HTTP.",
        false,
        true
      );
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
      cipher.sub ? `<span class="cipher-sub">${cipher.sub}</span>` : ""
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
  const nameNormalized = el.nameInput.value.trim();

  state.matches.words = findMatches(words, cipherKey, target).filter(
    (i) => words.items[i] !== nameNormalized
  );
  state.matches.phrases = findMatches(phrases, cipherKey, target).filter(
    (i) => phrases.items[i] !== nameNormalized
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
    indices = indices.filter((i) => {
      const text = tab === "verses" ? dataset.items[i].text : dataset.items[i];
      return text.toLowerCase().includes(state.filterText);
    });
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
    for (const i of visible) {
      const li = document.createElement("li");
      if (tab === "verses") {
        const v = dataset.items[i];
        li.innerHTML = `<span class="verse-ref">${escapeHtml(mode.verseRef(v))}</span><span class="verse-text">${escapeHtml(
          mode.verseBody(v)
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
