export async function loadTorahData() {
  const res = await fetch("data/torah.json");
  if (!res.ok) throw new Error("Failed to load data/torah.json (" + res.status + ")");
  return res.json();
}

export async function loadLexicon() {
  const res = await fetch("data/lexicon.json");
  if (!res.ok) throw new Error("Failed to load data/lexicon.json (" + res.status + ")");
  return res.json();
}
