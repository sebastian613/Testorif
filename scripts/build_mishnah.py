#!/usr/bin/env python3
"""Fetches the Mishnah's Hebrew text from Sefaria (the "Torat Emet 357"
version specifically — see below) and builds three standalone files:
data/mishnah.json, data/mishnah-words.json, data/mishnah-phrases.json.
These are a self-contained second corpus, kept separate from
data/tanakh.json / hebrew-words.json / hebrew-phrases.json rather than
merged into them, so Mishnah search stays a distinct corpus the app can
switch to rather than blending into Tanakh results.

Run from the repo root: python3 scripts/build_mishnah.py

Idempotent-ish: cached raw fetches live in .cache/mishnah_raw/ so re-runs
after a partial failure don't re-fetch tractates already saved. Delete that
directory to force a clean re-fetch.

Why "Torat Emet 357" specifically: Sefaria hosts several independent
Hebrew versions per tractate, and this app's earlier attempt used whichever
one Sefaria's own "merged"/default text happens to prioritize — which
turned out to be CC-BY-NC for 38 of the 63 tractates (see git history).
Checking a tractate's available versions
(https://www.sefaria.org/api/texts/versions/Mishnah_<title>) shows several
independent options, at least two of which are Public Domain for every
tractate checked: "Torat Emet 357" (vocalized, matching the style already
used for Tanakh) and "Mishnah, ed. Romm, Vilna 1913" (unvocalized). This
script uses Torat Emet 357 for visual consistency with the Tanakh text
already shown elsewhere in the app. Confirmed Public Domain on a spot check
across all six sedarim before adopting it; the license is version-specific
and worth re-verifying (via the versions endpoint above) if Sefaria's
licensing terms could have changed since.
"""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "data")
CACHE_DIR = os.path.join(REPO_ROOT, ".cache", "mishnah_raw")
MAX_OCC = 8  # matches the cap used for hebrew-words.json/hebrew-phrases.json
VERSION_TITLE = "Torat Emet 357"

# (Sefaria's category folder, tractate name, real chapter count — used only
# to sanity-check the fetch; a mismatch is logged, not fatal, since a couple
# of tractates have known printed-edition variants, e.g. Bikkurim is
# sometimes 3 chapters, sometimes 4 with an appendix chapter).
TRACTATES = [
    ("Seder Zeraim", "Berakhot", 9), ("Seder Zeraim", "Peah", 8), ("Seder Zeraim", "Demai", 7),
    ("Seder Zeraim", "Kilayim", 9), ("Seder Zeraim", "Sheviit", 10), ("Seder Zeraim", "Terumot", 11),
    ("Seder Zeraim", "Maasrot", 5), ("Seder Zeraim", "Maaser Sheni", 5), ("Seder Zeraim", "Challah", 4),
    ("Seder Zeraim", "Orlah", 3), ("Seder Zeraim", "Bikkurim", 3),
    ("Seder Moed", "Shabbat", 24), ("Seder Moed", "Eruvin", 10), ("Seder Moed", "Pesachim", 10),
    ("Seder Moed", "Shekalim", 8), ("Seder Moed", "Yoma", 8), ("Seder Moed", "Sukkah", 5),
    ("Seder Moed", "Beitzah", 5), ("Seder Moed", "Rosh Hashanah", 4), ("Seder Moed", "Ta'anit", 4),
    ("Seder Moed", "Megillah", 4), ("Seder Moed", "Moed Katan", 3), ("Seder Moed", "Chagigah", 3),
    ("Seder Nashim", "Yevamot", 16), ("Seder Nashim", "Ketubot", 13), ("Seder Nashim", "Nedarim", 11),
    ("Seder Nashim", "Nazir", 9), ("Seder Nashim", "Sotah", 9), ("Seder Nashim", "Gittin", 9),
    ("Seder Nashim", "Kiddushin", 4),
    ("Seder Nezikin", "Bava Kamma", 10), ("Seder Nezikin", "Bava Metzia", 10), ("Seder Nezikin", "Bava Batra", 10),
    ("Seder Nezikin", "Sanhedrin", 11), ("Seder Nezikin", "Makkot", 3), ("Seder Nezikin", "Shevuot", 8),
    ("Seder Nezikin", "Eduyot", 8), ("Seder Nezikin", "Avodah Zarah", 5), ("Seder Nezikin", "Avot", 6),
    ("Seder Nezikin", "Horayot", 3),
    ("Seder Kodashim", "Zevachim", 14), ("Seder Kodashim", "Menachot", 13), ("Seder Kodashim", "Chullin", 12),
    ("Seder Kodashim", "Bekhorot", 9), ("Seder Kodashim", "Arakhin", 9), ("Seder Kodashim", "Temurah", 7),
    ("Seder Kodashim", "Keritot", 6), ("Seder Kodashim", "Meilah", 6), ("Seder Kodashim", "Tamid", 7),
    ("Seder Kodashim", "Middot", 5), ("Seder Kodashim", "Kinnim", 3),
    ("Seder Tahorot", "Kelim", 30), ("Seder Tahorot", "Oholot", 18), ("Seder Tahorot", "Negaim", 14),
    ("Seder Tahorot", "Parah", 12), ("Seder Tahorot", "Tahorot", 10), ("Seder Tahorot", "Mikvaot", 10),
    ("Seder Tahorot", "Niddah", 10), ("Seder Tahorot", "Makhshirin", 6), ("Seder Tahorot", "Zavim", 5),
    ("Seder Tahorot", "Tevul Yom", 4), ("Seder Tahorot", "Yadayim", 4), ("Seder Tahorot", "Oktzin", 3),
]

HECHRACHI = {
    "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
    "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80, "צ": 90,
    "ק": 100, "ר": 200, "ש": 300, "ת": 400, "ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90,
}


def strip_to_letters(s):
    return "".join(ch for ch in s if ch in HECHRACHI)


def clean_text(t):
    """Strips Sefaria's inline markup (Vilna-page overlay markers, <br>) down to plain text."""
    t = re.sub(r"<br\s*/?>", " ", t)
    t = re.sub(r"<[^>]+>", "", t)
    return re.sub(r"\s+", " ", t).strip()


def fetch_tractate(seder, name, expected_chapters):
    cache_path = os.path.join(CACHE_DIR, f"Mishnah_{name.replace(' ', '_').replace(chr(39), '')}.json")
    if os.path.exists(cache_path):
        return json.load(open(cache_path, encoding="utf-8"))

    slug = "Mishnah_" + name.replace(" ", "_")
    version = urllib.parse.quote(VERSION_TITLE)
    url = f"https://www.sefaria.org/api/v3/texts/{urllib.parse.quote(slug)}?version=hebrew|{version}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        d = json.loads(resp.read().decode("utf-8"))
    versions = d.get("versions") or []
    if not versions:
        raise RuntimeError(f"{name}: no '{VERSION_TITLE}' version returned")
    v = versions[0]
    license_ = v.get("license")
    if license_ != "Public Domain":
        raise RuntimeError(f"{name}: expected Public Domain, got {license_!r} — investigate before using")
    chapters = v.get("text")
    n = len(chapters) if isinstance(chapters, list) else 0
    if n != expected_chapters:
        print(f"  note: {name} has {n} chapters, expected {expected_chapters} "
              f"(printed editions sometimes vary — verify this wasn't a partial fetch)")
    record = {"seder": seder, "name": name, "heTitle": d.get("heTitle"), "license": license_, "text": chapters}
    os.makedirs(CACHE_DIR, exist_ok=True)
    json.dump(record, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False)
    return record


def tokenize(text):
    """[(bare_word, start, end), ...] for each token, offsets into the vocalized text."""
    tokens = []
    for m in re.finditer(r"\S+", text):
        bare = strip_to_letters(m.group(0))
        if bare:
            tokens.append((bare, m.start(), m.end()))
    return tokens


def main():
    print(f"Fetching {len(TRACTATES)} tractates (version: {VERSION_TITLE!r})...")
    tractates = []
    for i, (seder, name, expected) in enumerate(TRACTATES, 1):
        d = fetch_tractate(seder, name, expected)
        tractates.append(d)
        print(f"  [{i}/{len(TRACTATES)}] {name}: {d['license']}")
        time.sleep(0.1)

    licenses = {d["license"] for d in tractates}
    assert licenses == {"Public Domain"}, f"unexpected licenses found: {licenses}"

    print("Building data/mishnah.json...")
    mishnah_passages = []
    for d in tractates:
        for ch_idx, chapter in enumerate(d["text"], start=1):
            for m_idx, m_text in enumerate(chapter, start=1):
                text = clean_text(m_text)
                if not text:
                    continue
                mishnah_passages.append({
                    "ref": f"Mishnah {d['name']} {ch_idx}:{m_idx}",
                    "he": f"משנה {d.get('heTitle') or d['name']}",
                    "text": text,
                })
    print(f"  {len(mishnah_passages)} mishnayot")
    json.dump(mishnah_passages, open(os.path.join(DATA_DIR, "mishnah.json"), "w", encoding="utf-8"), ensure_ascii=False)

    print("Extracting word/phrase occurrences (local indices, no Tanakh offset)...")
    word_occ, phrase_occ = {}, {}
    for i, p in enumerate(mishnah_passages):
        toks = tokenize(p["text"])
        for bare, start, end in toks:
            bucket = word_occ.setdefault(bare, [])
            if len(bucket) < MAX_OCC:
                bucket.append([i, start, end])
        for j in range(len(toks) - 1):
            b1, s1, _ = toks[j]
            _, _, e2 = toks[j + 1]
            bucket = phrase_occ.setdefault(b1 + toks[j + 1][0], [])
            if len(bucket) < MAX_OCC:
                bucket.append([i, s1, e2])

    print(f"  {len(word_occ)} distinct words, {len(phrase_occ)} distinct phrases")
    json.dump([[w, o] for w, o in word_occ.items()],
              open(os.path.join(DATA_DIR, "mishnah-words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump([[w, o] for w, o in phrase_occ.items()],
              open(os.path.join(DATA_DIR, "mishnah-phrases.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("Done.")


if __name__ == "__main__":
    main()
