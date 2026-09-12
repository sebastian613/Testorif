#!/usr/bin/env python3
"""Fetches Mishneh Torah's (Rambam's) complete Hebrew text and builds three
standalone files: data/mishneh-torah.json, data/mishneh-torah-words.json,
and data/mishneh-torah-phrases-{1,2}.json — a third, fully independent
corpus, built the same way as data/mishnah.json (see build_mishnah.py).
data/mishneh-torah-sources.json records which edition every treatise came
from, so the licensing below is auditable without re-running this.

Run from the repo root: python3 scripts/build_mishneh_torah.py

Idempotent-ish: cached raw fetches live in .cache/mishneh_torah_raw/ so
re-runs after a partial failure don't re-fetch treatises already saved.
Delete that directory to force a clean re-fetch.

ALL 88 treatises are included. Getting there took three different sources,
because no single Hebrew edition on Sefaria covers the whole work, and
because Sefaria's per-version license tags have gaps. Every treatise's
license is checked live at build time (never assumed from a spot check):

  1. "Torat Emet 363" — Public Domain, and covers 72 treatises: all of
     Sefer Madda, and everything from Sefer Zemanim through Sefer Shoftim.
     It does not cover Sefer Ahavah or the introductory list-books at all.
  2. "Torat Emet 370" — the edition that covers Sefer Ahavah. Sefaria tags
     it Public Domain for 2 of that book's 7 treatises (Reading the Shema;
     Prayer and the Priestly Blessing) and leaves the license "unknown" on
     the other 5 (Tefillin/Mezuzah/Torah Scroll, Fringes, Blessings,
     Circumcision, The Order of Prayer). That is a tagging gap, not a
     different license: all 7 are the same version title from the same
     publisher at the same versionSource
     (http://www.toratemetfreeware.com/index.html?downloads), and a
     license does not vary book-by-book within one edition. Rather than
     just assert that, this script PROVES it each run — see
     SEFARIA_UNTAGGED_OK and the check in main(): an untagged version is
     only accepted if that exact version title came back "Public Domain"
     on some other treatise in the same run. If Sefaria ever retags it,
     the build fails loudly instead of quietly shipping it.
  3. Mechon Mamre (https://www.mechon-mamre.org) — a public domain,
     fully vocalized edition — for the 4 introductory list-books. Sefaria
     carries it for 2 of them (Transmission of the Oral Law; Positive
     Mitzvot) and is used through the normal API path. For the other 2
     (Negative Mitzvot; Overview of Mishneh Torah Contents) Sefaria's ONLY
     Hebrew version is a CC-BY-SA Wikisource transcription, so those are
     fetched straight from Mechon Mamre instead (see MECHON_MAMRE_DIRECT).
     That avoids a share-alike license on this corpus entirely and, as a
     bonus, yields vocalized text matching the rest of the corpus where
     the Wikisource transcription is unvocalized.

Net result: 88 of 88 treatises, no CC-BY-SA or CC-BY-NC text anywhere in
this corpus.
"""
import html
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
# CORPORA entry for this corpus carries a matching `occCap: 2` so the
# app's "N+ occurrences found" display doesn't overstate its precision.
MAX_OCC = 2

# Any Hebrew version Sefaria tags "Public Domain" is acceptable; these are
# preferred first (in order) when several qualify, because they're the
# vocalized editions that match the rest of the app's Hebrew typography.
PREFERRED_VERSION_PREFIXES = ("Torat Emet", "Mechon")

# Treatises where Sefaria lists the right edition but left its license
# untagged ("unknown"). Accepted ONLY if the same version title came back
# "Public Domain" on some other treatise in the same run — see the check
# in main(). See the module docstring for why this is a tagging gap rather
# than a real licensing difference.
SEFARIA_UNTAGGED_OK = {
    "Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll": "Torat Emet 370",
    "Mishneh Torah, Fringes": "Torat Emet 370",
    "Mishneh Torah, Blessings": "Torat Emet 370",
    "Mishneh Torah, Circumcision": "Torat Emet 370",
    "Mishneh Torah, The Order of Prayer": "Torat Emet 370",
}

# Treatises where Sefaria's only Hebrew version is CC-BY-SA, fetched
# straight from Mechon Mamre's public domain vocalized edition instead.
# Values are the page number in https://www.mechon-mamre.org/i/<n>n.htm.
MECHON_MAMRE_DIRECT = {
    "Mishneh Torah, Negative Mitzvot": ("0002", "משנה תורה, מצוות לא תעשה"),
    "Mishneh Torah, Overview of Mishneh Torah Contents": ("0003", "משנה תורה, חלוקת הספרים"),
}

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


def pick_version(title):
    """Chooses the Hebrew version to use for this treatise.

    Returns (versionTitle, license, tagged) where `tagged` is False for a
    version Sefaria left license-"unknown" that SEFARIA_UNTAGGED_OK allows
    — main() only accepts those once the same version title has proven
    itself Public Domain on another treatise in the same run.
    """
    url = f"https://www.sefaria.org/api/texts/versions/{urllib.parse.quote(title.replace(' ', '_'))}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        versions = json.loads(resp.read().decode("utf-8"))
    he = [(v.get("versionTitle"), v.get("license")) for v in versions if v.get("language") == "he"]
    public_domain = [vt for vt, lic in he if lic == "Public Domain"]

    for prefix in PREFERRED_VERSION_PREFIXES:
        for vt in public_domain:
            if vt and vt.startswith(prefix):
                return vt, "Public Domain", True
    if public_domain:
        return public_domain[0], "Public Domain", True

    allowed = SEFARIA_UNTAGGED_OK.get(title)
    if allowed and any(vt == allowed for vt, _ in he):
        return allowed, "Public Domain (untagged by Sefaria on this treatise)", False
    return None, None, False


MECHON_MAMRE_URL = "https://www.mechon-mamre.org/i/{page}n.htm"
# Each item on a Mechon Mamre page is an <A NAME=...> anchor immediately
# followed by the <P> (or opening <H2>) holding that item's text. Anchoring
# on that pairing skips the page's nav bar and <noscript> banner, which
# carry no anchor of their own.
MM_ITEM_RE = re.compile(r'<A NAME="[^"]*">\s*</A>\s*<(H2|P)(?:\s[^>]*)?>(.*?)</\1>', re.I | re.S)


def fetch_mechon_mamre(title, page):
    """Fetches one of Mechon Mamre's public domain vocalized pages and
    returns its items as a flat list of plain-text strings."""
    req = urllib.request.Request(
        MECHON_MAMRE_URL.format(page=page),
        headers={"User-Agent": "Mozilla/5.0 (compatible; samizdaat-corpus-build/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="replace")

    items = []
    for _tag, body in MM_ITEM_RE.findall(raw):
        # Drop the leading <B>numeral</B> label, then all remaining inline
        # markup (scripture-reference links), then collapse whitespace.
        body = re.sub(r"(?is)^\s*<B>.*?</B>", " ", body)
        text = html.unescape(re.sub(r"(?s)<[^>]+>", " ", body))
        text = re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()
        if text:
            items.append(text)
    if not items:
        raise RuntimeError(f"{title}: parsed no items from Mechon Mamre page {page}")
    return items


def fetch_treatise(seder, title):
    cache_path = cache_path_for(title)
    if os.path.exists(cache_path):
        return json.load(open(cache_path, encoding="utf-8"))

    if title in MECHON_MAMRE_DIRECT:
        page, he_title = MECHON_MAMRE_DIRECT[title]
        record = {
            "seder": seder,
            "name": title,
            "heTitle": he_title,
            "license": "Public Domain",
            "versionTitle": f"Mechon Mamre (mechon-mamre.org/i/{page}n.htm)",
            "tagged": True,
            "text": fetch_mechon_mamre(title, page),
        }
    else:
        version_title, license_, tagged = pick_version(title)
        if version_title is None:
            raise RuntimeError(
                f"{title}: no usable Hebrew version found. Sefaria's licensing may have "
                "changed — check /api/texts/versions/ for this treatise before proceeding."
            )
        slug = title.replace(" ", "_")
        url = (f"https://www.sefaria.org/api/v3/texts/{urllib.parse.quote(slug)}"
               f"?version=hebrew|{urllib.parse.quote(version_title)}")
        with urllib.request.urlopen(url, timeout=20) as resp:
            d = json.loads(resp.read().decode("utf-8"))
        versions = d.get("versions") or []
        if not versions:
            raise RuntimeError(f"{title}: no {version_title!r} version returned")
        v = versions[0]
        if tagged and v.get("license") != "Public Domain":
            raise RuntimeError(
                f"{title}: expected Public Domain, got {v.get('license')!r} — investigate before using")
        record = {
            "seder": seder,
            "name": title,
            "heTitle": d.get("heTitle"),
            "license": license_,
            "versionTitle": version_title,
            "tagged": tagged,
            "text": v.get("text"),
        }
    os.makedirs(CACHE_DIR, exist_ok=True)
    json.dump(record, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False)
    return record


def iter_passages(record):
    """Yields (ref_suffix, raw_text) for a treatise, handling both shapes:
    chapter/halacha texts nest one level deeper than the flat prefatory
    lists, so refs come out as "3:12" for the former and "12" for the latter.
    """
    text = record["text"]
    if not isinstance(text, list):
        return
    nested = any(isinstance(x, list) for x in text)
    if nested:
        for ch_idx, chapter in enumerate(text, start=1):
            if not isinstance(chapter, list):
                chapter = [chapter]
            for h_idx, h_text in enumerate(chapter, start=1):
                if isinstance(h_text, str):
                    yield f"{ch_idx}:{h_idx}", h_text
    else:
        for idx, item in enumerate(text, start=1):
            if isinstance(item, str):
                yield f"{idx}", item


def tokenize(text):
    """[(bare_word, start, end), ...] for each token, offsets into the vocalized text."""
    tokens = []
    for m in re.finditer(r"\S+", text):
        bare = strip_to_letters(m.group(0))
        if bare:
            tokens.append((bare, m.start(), m.end()))
    return tokens


def main():
    print(f"Checking/fetching all {len(TREATISES)} Mishneh Torah treatises...")
    treatises = []
    for i, (seder, title) in enumerate(TREATISES, 1):
        d = fetch_treatise(seder, title)
        treatises.append(d)
        mark = "" if d.get("tagged", True) else "  [untagged — verified below]"
        print(f"  [{i}/{len(TREATISES)}] {title}: {d['license']} ({d['versionTitle']}){mark}")
        time.sleep(0.1)

    if len(treatises) != 88:
        raise RuntimeError(f"expected all 88 treatises, built {len(treatises)}")

    # Prove, rather than assume, that an untagged version really is the same
    # Public Domain edition: the identical version title must have come back
    # explicitly Public Domain on at least one other treatise this run.
    proven_public_domain = {
        d["versionTitle"] for d in treatises if d.get("tagged", True) and d["license"] == "Public Domain"
    }
    for d in treatises:
        if d.get("tagged", True):
            continue
        if d["versionTitle"] not in proven_public_domain:
            raise RuntimeError(
                f"{d['name']}: {d['versionTitle']!r} is untagged here and no longer comes back "
                "Public Domain on any other treatise, so the inference that it's the same "
                "Public Domain edition no longer holds. Re-check Sefaria's licensing before building."
            )
        print(f"  verified: {d['name']} — {d['versionTitle']!r} is tagged Public Domain on other treatises")

    unexpected = {d["license"] for d in treatises} - {
        "Public Domain", "Public Domain (untagged by Sefaria on this treatise)"
    }
    if unexpected:
        raise RuntimeError(f"unexpected licenses found: {unexpected}")

    sources = [
        {"treatise": d["name"], "book": d["seder"], "versionTitle": d["versionTitle"],
         "license": d["license"], "sefariaLicenseTagged": d.get("tagged", True)}
        for d in treatises
    ]
    json.dump(sources, open(os.path.join(DATA_DIR, "mishneh-torah-sources.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"Building data/mishneh-torah.json ({len(treatises)} treatises)...")
    passages = []
    for d in treatises:
        for ref_suffix, raw in iter_passages(d):
            text = clean_text(raw)
            if not text:
                continue
            # No `he` (the treatise's Hebrew title) here, unlike tanakh.json
            # and mishnah.json: nothing in the app ever reads that field, and
            # repeating it on all ~15,900 passages cost ~0.6MB of the budget
            # this corpus needs to fit alongside the other two. It's in
            # data/mishneh-torah-sources.json per treatise if ever wanted.
            passages.append({"ref": f"{d['name']} {ref_suffix}", "text": text})
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
    print(f"Done — all {len(treatises)} treatises, no restrictively-licensed text.")


if __name__ == "__main__":
    main()
