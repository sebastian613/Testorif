#!/usr/bin/env python3
"""
Builds data/torah.json: the continuous Torah consonant-letter stream (ketiv,
no niqqud/cantillation/spaces) plus a verse-reference index, from the Open
Scriptures Hebrew Bible (Westminster Leningrad Codex).

Source: https://github.com/openscriptures/morphhb (CC-BY 4.0 / Public Domain)

Usage:
    python3 tools/extract_torah.py
Requires network access to raw.githubusercontent.com. Writes:
    data/torah.json
    build/torah_word_freq.json   (intermediate, used by build_lexicon.py)
"""
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD_DIR = os.path.join(ROOT, "build")
DATA_DIR = os.path.join(ROOT, "data")

BOOKS = [
    ("Gen", "Genesis"),
    ("Exod", "Exodus"),
    ("Lev", "Leviticus"),
    ("Num", "Numbers"),
    ("Deut", "Deuteronomy"),
]

RAW_URL = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/{}.xml"

HEB_LETTER_RE = re.compile(r"[א-ת]")
verse_re = re.compile(r'<verse osisID="([^"]+)"[^>]*>(.*?)</verse>', re.S)
note_re = re.compile(r"<note\b.*?</note>", re.S)
w_re = re.compile(r"<w\b[^>]*>(.*?)</w>")
tag_re = re.compile(r"<[^>]+>")


def clean_word(raw):
    raw = tag_re.sub("", raw)
    return "".join(HEB_LETTER_RE.findall(raw))


def fetch_book_xml(code):
    cache_path = os.path.join(BUILD_DIR, f"{code}.xml")
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            return f.read()
    url = RAW_URL.format(code)
    with urllib.request.urlopen(url, timeout=60) as resp:
        data = resp.read().decode("utf-8")
    os.makedirs(BUILD_DIR, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(data)
    return data


def main():
    os.makedirs(BUILD_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    letters = []
    refs = []
    word_freq = {}
    book_index = {name: i for i, (_, name) in enumerate(BOOKS)}

    for code, name in BOOKS:
        xml = fetch_book_xml(code)
        for vid, vbody in verse_re.findall(xml):
            parts = vid.split(".")
            if len(parts) != 3:
                continue
            _, chap, vnum = parts
            # Strip <note>...</note> blocks: these hold qere (read-as) variants
            # nested inside the ketiv (written) text; we keep only the ketiv,
            # which is the traditional basis for letter-skip computations.
            vbody_clean = note_re.sub("", vbody)
            words = w_re.findall(vbody_clean)
            verse_letters = []
            for w in words:
                cw = clean_word(w)
                if cw:
                    verse_letters.append(cw)
                    word_freq[cw] = word_freq.get(cw, 0) + 1
            if not verse_letters:
                continue
            start = len(letters)
            for cw in verse_letters:
                letters.extend(list(cw))
            refs.append([book_index[name], int(chap), int(vnum), start])

    full_text = "".join(letters)
    print("Total letters:", len(full_text))
    print("Total verses:", len(refs))

    torah_data = {
        "source": "Open Scriptures Hebrew Bible (Westminster Leningrad Codex), ketiv, consonants only",
        "books": [name for _, name in BOOKS],
        "letters": full_text,
        "verses": refs,
    }

    with open(os.path.join(DATA_DIR, "torah.json"), "w", encoding="utf-8") as f:
        json.dump(torah_data, f, ensure_ascii=False, separators=(",", ":"))

    with open(os.path.join(BUILD_DIR, "torah_word_freq.json"), "w", encoding="utf-8") as f:
        json.dump(word_freq, f, ensure_ascii=False)

    print("Wrote data/torah.json and build/torah_word_freq.json")


if __name__ == "__main__":
    main()
