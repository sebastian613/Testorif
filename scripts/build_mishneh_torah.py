#!/usr/bin/env python3
"""Fetches Mishneh Torah's (Rambam's) Hebrew text from Sefaria and builds
three standalone files: data/mishneh-torah.json, data/mishneh-torah-words.json,
data/mishneh-torah-phrases.json — a third, fully independent corpus, built
the same way as data/mishnah.json (see scripts/build_mishnah.py).

Run from the repo root: python3 scripts/build_mishneh_torah.py

Idempotent-ish: cached raw fetches live in .cache/mishneh_torah_raw/ so
re-runs after a partial failure don't re-fetch treatises already saved.
Delete that directory to force a clean re-fetch.

Licensing — verified per treatise via
https://www.sefaria.org/api/texts/versions/<title>, not assumed:

Mishneh Torah's 88 treatises are split across two independently-licensed
Hebrew editions on Sefaria, and neither covers the whole work:
  - "Torat Emet 363" is Public Domain for 77 of the 88 treatises: all of
    Sefer Madda, and everything from Sefer Zemanim through Sefer Shoftim
    (72 treatises), plus (checked separately, since it doesn't cover
    Sefer Ahavah) is simply absent there.
  - "Torat Emet 370" covers Sefer Ahavah, but is only confirmed Public
    Domain for 2 of its 7 treatises (Reading the Shema; Prayer and the
    Priestly Blessing) — the other 5 (Tefillin/Mezuzah/Torah Scroll,
    Fringes, Blessings, Circumcision, The Order of Prayer) come back
    license "unknown" for every Hebrew version Sefaria lists.
  - The 4 introductory list-books (Transmission of the Oral Law, Positive
    Mitzvot, Negative Mitzvot, Overview of Mishneh Torah Contents) have
    no confirmed Public Domain Hebrew version at all (only a CC-BY-SA
    Wikisource transcription).

This script includes only the 79 treatises with a confirmed Public Domain
Hebrew version (checked live, per book, at fetch time — never assumed
from one spot check) and skips the other 9, logging exactly which and
why. This mirrors how build_mishnah.py excluded Mishnah tractates that
turned out to be CC-BY-NC rather than silently including them.
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
CACHE_DIR = os.path.join(REPO_ROOT, ".cache", "mishneh_torah_raw")
# Lower than the 8 used for hebrew-words.json/mishnah-words.json: Mishneh
# Torah's halachot run much longer per passage than a Tanakh verse or a
# mishnah, so it has far more distinct two-word phrases despite fewer
# passages — at a cap of 8 the phrases file alone was too large to publish
# to some hosting targets even split across two files. src/data.js's
# CORPORA entry for this corpus carries a matching `occCap: 3` so the
# app's "N+ occurrences found" display doesn't overstate its precision.
MAX_OCC = 3

# Candidate Hebrew version titles to try per treatise, in order — the
# first one that comes back license == "Public Domain" wins. A treatise
# with none of these Public Domain is skipped (see EXCLUDED below, which
# this script asserts against so a licensing change on Sefaria's end
# gets noticed rather than silently changing what's included).
CANDIDATE_VERSIONS = ["Torat Emet 363", "Torat Emet 370"]

# (Sefaria category, treatise title) for all 88 treatises, in canonical order.
TREATISES = [
    ("Introduction", "Mishneh Torah, Transmission of the Oral Law"),
    ("Introduction", "Mishneh Torah, Positive Mitzvot"),
    ("Introduction", "Mishneh Torah, Negative Mitzvot"),
    ("Introduction", "Mishneh Torah, Overview of Mishneh Torah Contents"),
    ("Sefer Madda", "Mishneh Torah, Foundations of the Torah"),
    ("Sefer Madda", "Mishneh Torah, Human Dispositions"),
    ("Sefer Madda", "Mishneh Torah, Torah Study"),
    ("Sefer Madda", "Mishneh Torah, Foreign Worship and Customs of the Nations"),
    ("Sefer Madda", "Mishneh Torah, Repentance"),
    ("Sefer Ahavah", "Mishneh Torah, Reading the Shema"),
    ("Sefer Ahavah", "Mishneh Torah, Prayer and the Priestly Blessing"),
    ("Sefer Ahavah", "Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll"),
    ("Sefer Ahavah", "Mishneh Torah, Fringes"),
    ("Sefer Ahavah", "Mishneh Torah, Blessings"),
    ("Sefer Ahavah", "Mishneh Torah, Circumcision"),
    ("Sefer Ahavah", "Mishneh Torah, The Order of Prayer"),
    ("Sefer Zemanim", "Mishneh Torah, Sabbath"),
    ("Sefer Zemanim", "Mishneh Torah, Eruvin"),
    ("Sefer Zemanim", "Mishneh Torah, Rest on the Tenth of Tishrei"),
    ("Sefer Zemanim", "Mishneh Torah, Rest on a Holiday"),
    ("Sefer Zemanim", "Mishneh Torah, Leavened and Unleavened Bread"),
    ("Sefer Zemanim", "Mishneh Torah, Shofar, Sukkah and Lulav"),
    ("Sefer Zemanim", "Mishneh Torah, Sheqel Dues"),
    ("Sefer Zemanim", "Mishneh Torah, Sanctification of the New Month"),
    ("Sefer Zemanim", "Mishneh Torah, Fasts"),
    ("Sefer Zemanim", "Mishneh Torah, Scroll of Esther and Hanukkah"),
    ("Sefer Nashim", "Mishneh Torah, Marriage"),
    ("Sefer Nashim", "Mishneh Torah, Divorce"),
    ("Sefer Nashim", "Mishneh Torah, Levirate Marriage and Release"),
    ("Sefer Nashim", "Mishneh Torah, Virgin Maiden"),
    ("Sefer Nashim", "Mishneh Torah, Woman Suspected of Infidelity"),
    ("Sefer Kedushah", "Mishneh Torah, Forbidden Intercourse"),
    ("Sefer Kedushah", "Mishneh Torah, Forbidden Foods"),
    ("Sefer Kedushah", "Mishneh Torah, Ritual Slaughter"),
    ("Sefer Haflaah", "Mishneh Torah, Oaths"),
    ("Sefer Haflaah", "Mishneh Torah, Vows"),
    ("Sefer Haflaah", "Mishneh Torah, Nazariteship"),
    ("Sefer Haflaah", "Mishneh Torah, Appraisals and Devoted Property"),
    ("Sefer Zeraim", "Mishneh Torah, Diverse Species"),
    ("Sefer Zeraim", "Mishneh Torah, Gifts to the Poor"),
    ("Sefer Zeraim", "Mishneh Torah, Heave Offerings"),
    ("Sefer Zeraim", "Mishneh Torah, Tithes"),
    ("Sefer Zeraim", "Mishneh Torah, Second Tithes and Fourth Year's Fruit"),
    ("Sefer Zeraim", "Mishneh Torah, First Fruits and other Gifts to Priests Outside the Sanctuary"),
    ("Sefer Zeraim", "Mishneh Torah, Sabbatical Year and the Jubilee"),
    ("Sefer Avodah", "Mishneh Torah, The Chosen Temple"),
    ("Sefer Avodah", "Mishneh Torah, Vessels of the Sanctuary and Those Who Serve Therein"),
    ("Sefer Avodah", "Mishneh Torah, Admission into the Sanctuary"),
    ("Sefer Avodah", "Mishneh Torah, Things Forbidden on the Altar"),
    ("Sefer Avodah", "Mishneh Torah, Sacrificial Procedure"),
    ("Sefer Avodah", "Mishneh Torah, Daily Offerings and Additional Offerings"),
    ("Sefer Avodah", "Mishneh Torah, Sacrifices Rendered Unfit"),
    ("Sefer Avodah", "Mishneh Torah, Service on the Day of Atonement"),
    ("Sefer Avodah", "Mishneh Torah, Trespass"),
    ("Sefer Korbanot", "Mishneh Torah, Paschal Offering"),
    ("Sefer Korbanot", "Mishneh Torah, Festival Offering"),
    ("Sefer Korbanot", "Mishneh Torah, Firstlings"),
    ("Sefer Korbanot", "Mishneh Torah, Offerings for Unintentional Transgressions"),
    ("Sefer Korbanot", "Mishneh Torah, Offerings for Those with Incomplete Atonement"),
    ("Sefer Korbanot", "Mishneh Torah, Substitution"),
    ("Sefer Taharah", "Mishneh Torah, Defilement by a Corpse"),
    ("Sefer Taharah", "Mishneh Torah, Red Heifer"),
    ("Sefer Taharah", "Mishneh Torah, Defilement by Leprosy"),
    ("Sefer Taharah", "Mishneh Torah, Those Who Defile Bed or Seat"),
    ("Sefer Taharah", "Mishneh Torah, Other Sources of Defilement"),
    ("Sefer Taharah", "Mishneh Torah, Defilement of Foods"),
    ("Sefer Taharah", "Mishneh Torah, Vessels"),
    ("Sefer Taharah", "Mishneh Torah, Immersion Pools"),
    ("Sefer Nezikim", "Mishneh Torah, Damages to Property"),
    ("Sefer Nezikim", "Mishneh Torah, Theft"),
    ("Sefer Nezikim", "Mishneh Torah, Robbery and Lost Property"),
    ("Sefer Nezikim", "Mishneh Torah, One Who Injures a Person or Property"),
    ("Sefer Nezikim", "Mishneh Torah, Murderer and the Preservation of Life"),
    ("Sefer Kinyan", "Mishneh Torah, Sales"),
    ("Sefer Kinyan", "Mishneh Torah, Ownerless Property and Gifts"),
    ("Sefer Kinyan", "Mishneh Torah, Neighbors"),
    ("Sefer Kinyan", "Mishneh Torah, Agents and Partners"),
    ("Sefer Kinyan", "Mishneh Torah, Slaves"),
    ("Sefer Mishpatim", "Mishneh Torah, Hiring"),
    ("Sefer Mishpatim", "Mishneh Torah, Borrowing and Deposit"),
    ("Sefer Mishpatim", "Mishneh Torah, Creditor and Debtor"),
    ("Sefer Mishpatim", "Mishneh Torah, Plaintiff and Defendant"),
    ("Sefer Mishpatim", "Mishneh Torah, Inheritances"),
    ("Sefer Shoftim", "Mishneh Torah, The Sanhedrin and the Penalties within Their Jurisdiction"),
    ("Sefer Shoftim", "Mishneh Torah, Testimony"),
    ("Sefer Shoftim", "Mishneh Torah, Rebels"),
    ("Sefer Shoftim", "Mishneh Torah, Mourning"),
    ("Sefer Shoftim", "Mishneh Torah, Kings and Wars"),
]

# Treatises with no confirmed Public Domain Hebrew version, checked live
# against Sefaria on 2026-09-12 — see the licensing note above. Asserted
# against at the end of the run so a change on Sefaria's end (a newly
# freed version, or a license getting revoked) is noticed, not silently
# absorbed.
EXCLUDED = {
    "Mishneh Torah, Transmission of the Oral Law",
    "Mishneh Torah, Positive Mitzvot",
    "Mishneh Torah, Negative Mitzvot",
    "Mishneh Torah, Overview of Mishneh Torah Contents",
    "Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll",
    "Mishneh Torah, Fringes",
    "Mishneh Torah, Blessings",
    "Mishneh Torah, Circumcision",
    "Mishneh Torah, The Order of Prayer",
}

HECHRACHI = {
    "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
    "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80, "צ": 90,
    "ק": 100, "ר": 200, "ש": 300, "ת": 400, "ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90,
}


def strip_to_letters(s):
    return "".join(ch for ch in s if ch in HECHRACHI)


def clean_text(t):
    """Strips Sefaria's inline markup (small-caps footnote markers, <br>) down to plain text."""
    t = re.sub(r"<br\s*/?>", " ", t)
    t = re.sub(r"<[^>]+>", "", t)
    return re.sub(r"\s+", " ", t).strip()


def cache_path_for(title):
    safe = re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_")
    return os.path.join(CACHE_DIR, f"{safe}.json")


def pick_public_domain_version(title):
    """Returns the first candidate version title that Sefaria lists as
    Public Domain for this treatise, or None if none of them are."""
    url = f"https://www.sefaria.org/api/texts/versions/{urllib.parse.quote(title.replace(' ', '_'))}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        versions = json.loads(resp.read().decode("utf-8"))
    he_licenses = {v.get("versionTitle"): v.get("license") for v in versions if v.get("language") == "he"}
    for candidate in CANDIDATE_VERSIONS:
        if he_licenses.get(candidate) == "Public Domain":
            return candidate
    return None


def fetch_treatise(seder, title):
    cache_path = cache_path_for(title)
    if os.path.exists(cache_path):
        return json.load(open(cache_path, encoding="utf-8"))

    version_title = pick_public_domain_version(title)
    if version_title is None:
        return None

    slug = title.replace(" ", "_")
    version = urllib.parse.quote(version_title)
    url = f"https://www.sefaria.org/api/v3/texts/{urllib.parse.quote(slug)}?version=hebrew|{version}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        d = json.loads(resp.read().decode("utf-8"))
    versions = d.get("versions") or []
    if not versions:
        raise RuntimeError(f"{title}: no {version_title!r} version returned")
    v = versions[0]
    license_ = v.get("license")
    if license_ != "Public Domain":
        raise RuntimeError(f"{title}: expected Public Domain, got {license_!r} — investigate before using")
    chapters = v.get("text")
    record = {
        "seder": seder,
        "name": title,
        "heTitle": d.get("heTitle"),
        "license": license_,
        "versionTitle": version_title,
        "text": chapters,
    }
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
    print(f"Checking/fetching {len(TREATISES)} Mishneh Torah treatises...")
    treatises = []
    skipped = []
    for i, (seder, title) in enumerate(TREATISES, 1):
        d = fetch_treatise(seder, title)
        if d is None:
            skipped.append(title)
            print(f"  [{i}/{len(TREATISES)}] {title}: SKIPPED (no confirmed Public Domain Hebrew version)")
            continue
        treatises.append(d)
        print(f"  [{i}/{len(TREATISES)}] {title}: {d['license']} ({d['versionTitle']})")
        time.sleep(0.1)

    if set(skipped) != EXCLUDED:
        raise RuntimeError(
            "licensing landscape changed since this script was written — "
            f"skipped {sorted(set(skipped))} but EXCLUDED says {sorted(EXCLUDED)}; "
            "update EXCLUDED (and the module docstring) after checking why."
        )

    licenses = {d["license"] for d in treatises}
    assert licenses == {"Public Domain"}, f"unexpected licenses found: {licenses}"

    print(f"Building data/mishneh-torah.json ({len(treatises)} treatises, {len(skipped)} skipped)...")
    passages = []
    for d in treatises:
        for ch_idx, chapter in enumerate(d["text"], start=1):
            for h_idx, h_text in enumerate(chapter, start=1):
                text = clean_text(h_text)
                if not text:
                    continue
                passages.append({
                    "ref": f"{d['name']} {ch_idx}:{h_idx}",
                    "he": f"{d.get('heTitle') or d['name']}",
                    "text": text,
                })
    print(f"  {len(passages)} halachot")
    json.dump(passages, open(os.path.join(DATA_DIR, "mishneh-torah.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print("Extracting word/phrase occurrences (local indices, no offset against any other corpus)...")
    word_occ, phrase_occ = {}, {}
    for i, p in enumerate(passages):
        toks = tokenize(p["text"])
        for bare, start, end in toks:
            bucket = word_occ.setdefault(bare, [])
            if len(bucket) < MAX_OCC:
                bucket.append([i, start, end])
        for j in range(len(toks) - 1):
            b1, s1, _ = toks[j]
            _, _, e2 = toks[j + 1]
            bucket = phrase_occ.setdefault(f"{b1} {toks[j + 1][0]}", [])
            if len(bucket) < MAX_OCC:
                bucket.append([i, s1, e2])

    print(f"  {len(word_occ)} distinct words, {len(phrase_occ)} distinct phrases")
    json.dump([[w, o] for w, o in word_occ.items()],
              open(os.path.join(DATA_DIR, "mishneh-torah-words.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    # The phrases list alone is too large for some hosting targets as one
    # file (Mishneh Torah's halachot run much longer per passage than a
    # Tanakh verse or a mishnah, so it has far more distinct two-word
    # spans than either despite fewer passages). Split it across two files
    # of roughly equal size; src/data.js's CORPORA entry for this corpus
    # lists both, and loadDatasets fetches and concatenates them
    # transparently — this is a publishing-size split, not a data-shape
    # one, so both shards are committed and neither is a derived/cache
    # artifact.
    phrase_items = [[w, o] for w, o in phrase_occ.items()]
    midpoint = len(phrase_items) // 2
    shards = [phrase_items[:midpoint], phrase_items[midpoint:]]
    for i, shard in enumerate(shards, start=1):
        json.dump(shard, open(os.path.join(DATA_DIR, f"mishneh-torah-phrases-{i}.json"), "w", encoding="utf-8"),
                   ensure_ascii=False, separators=(",", ":"))
    print("Done.")
    print(f"Skipped (no confirmed Public Domain Hebrew version): {', '.join(sorted(skipped))}")


if __name__ == "__main__":
    main()
