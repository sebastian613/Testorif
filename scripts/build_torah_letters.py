#!/usr/bin/env python3
"""Build the Torah letter string and a hard count of every Hebrew letter.

Source: the Westminster Leningrad Codex (WLC) as published by the Open
Scriptures Hebrew Bible project (public domain), github.com/openscriptures/morphhb.

Unlike data/tanakh.json (which follows the Qere, the traditional *spoken*
reading), this uses the **Ketiv** -- the consonants as actually *written* --
because that is what a Torah scroll contains, letter for letter. Niqqud,
cantillation, maqqef, paseq, sof pasuq, and the petucha/setuma paragraph
markers are not letters and are excluded.

Outputs (run from the repo root: python3 scripts/build_torah_letters.py):
  data/torah-string.txt   the whole Torah as one unbroken string of consonants
  data/torah-letters.json letter counts (all 27 forms) -- total and per book
"""
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

MORPHHB_REV = os.environ.get("MORPHHB_REV", "master")
BASE = f"https://raw.githubusercontent.com/openscriptures/morphhb/{MORPHHB_REV}/wlc/"
BOOKS = [("Gen", "Genesis"), ("Exod", "Exodus"), ("Lev", "Leviticus"),
         ("Num", "Numbers"), ("Deut", "Deuteronomy")]
NS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
CACHE = os.path.join(os.path.dirname(__file__), ".cache", "morphhb")

# Alphabetical order, each final (sofit) form right after its base letter.
LETTERS = list("אבגדהוזחטיכךלמםנןסעפףצץקרשת")
NAMES = {
    "א": "Alef", "ב": "Bet", "ג": "Gimel", "ד": "Dalet", "ה": "He", "ו": "Vav",
    "ז": "Zayin", "ח": "Chet", "ט": "Tet", "י": "Yod", "כ": "Kaf", "ך": "Final Kaf",
    "ל": "Lamed", "מ": "Mem", "ם": "Final Mem", "נ": "Nun", "ן": "Final Nun",
    "ס": "Samekh", "ע": "Ayin", "פ": "Pe", "ף": "Final Pe", "צ": "Tsadi",
    "ץ": "Final Tsadi", "ק": "Qof", "ר": "Resh", "ש": "Shin", "ת": "Tav",
}
VALUES = dict(zip("אבגדהוזחטיכלמנסעפצקרשת",
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400]))
VALUES.update({"ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90})
NON_LETTER = re.compile(r"[^א-ת]")


def fetch(book):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{book}.xml")
    if not os.path.exists(path):
        with urllib.request.urlopen(BASE + f"{book}.xml") as r, open(path, "wb") as f:
            f.write(r.read())
    return ET.parse(path)


def verse_words(verse):
    """Words written in the scroll: every <w> directly in the verse.

    Ketiv words are plain children (type="x-ketiv"); the Qere and any
    alternative readings live inside <note>, which we never descend into.
    """
    for el in verse:
        if el.tag == NS + "w":
            yield NON_LETTER.sub("", "".join(el.itertext()))


def count(s):
    return {ch: s.count(ch) for ch in LETTERS}


def main():
    books, verses, words_total, parts = [], 0, 0, []
    for osis, name in BOOKS:
        tree = fetch(osis)
        text, nverses, nwords = [], 0, 0
        for v in tree.iter(NS + "verse"):
            ws = [w for w in verse_words(v) if w]
            nverses += 1
            nwords += len(ws)
            text.extend(ws)
        s = "".join(text)
        parts.append(s)
        books.append({"book": name, "verses": nverses, "words": nwords,
                      "letters": len(s), "counts": count(s)})
        verses += nverses
        words_total += nwords

    torah = "".join(parts)
    assert not NON_LETTER.search(torah)
    counts = count(torah)
    assert sum(counts.values()) == len(torah)

    out = {
        "source": "Westminster Leningrad Codex via openscriptures/morphhb "
                  f"({MORPHHB_REV}), Ketiv (written) text",
        "letterOrder": LETTERS,
        "letterInfo": {ch: {"name": NAMES[ch], "value": VALUES[ch]} for ch in LETTERS},
        "total": {"verses": verses, "words": words_total, "letters": len(torah),
                  "gematria": sum(VALUES[c] for c in torah), "counts": counts},
        "books": books,
    }
    root = os.path.join(os.path.dirname(__file__), "..", "data")
    with open(os.path.join(root, "torah-string.txt"), "w", encoding="utf-8") as f:
        f.write(torah + "\n")
    with open(os.path.join(root, "torah-letters.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print(f"verses {verses}  words {words_total}  letters {len(torah)}")
    for ch in LETTERS:
        n = counts[ch]
        print(f"{ch}  {NAMES[ch]:<12} {n:>7}  {100 * n / len(torah):5.2f}%")


if __name__ == "__main__":
    sys.exit(main())
