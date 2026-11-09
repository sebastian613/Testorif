#!/usr/bin/env python3
"""Torahscope profile report: every number we can honestly compute for a name.

Usage (from the repo root):
  python3 scripts/name_report.py "יאשיהו דוד עזריאל לישאביץ" reports/yoshiyahu.json

Everything here is counted directly from the texts in data/ -- no occurrence
caps (the search index keeps at most 8 per word; this recounts from the
passages), and the hidden-sequence (ELS) section is always reported next to a
shuffled-text control so a reader can see what chance alone produces.
"""
import bisect
import collections
import json
import math
import re
import sys

import numpy as np

V = dict(zip("אבגדהוזחטיכלמנסעפצקרשת",
             [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400]))
V.update({"ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90})
FINAL_TO_BASE = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
NON_LETTER = re.compile(r"[^א-ת]")
SPLIT = re.compile(r"[\s־]+")
PREFIXES = set("ובכלמהש")
TORAH_BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]
# Known alternate biblical spellings of a name part.
VARIANTS = {"יאשיהו": ["יאשיה"], "דוד": ["דויד"]}
ELS_MAX_SKIP = 1000
ELS_SHUFFLES = 10
# A plain shuffle ignores that letters cluster (one passage is dense in some
# letters, another in others), which inflates or deflates ELS counts and
# manufactures "signals". The fair control shuffles only within blocks of
# this many letters, keeping each stretch's own letter mix.
ELS_BLOCK = 5000


def g(s):
    return sum(V.get(c, 0) for c in s)


def katan(s):
    """Mispar katan: each letter reduced to its last non-zero digit-sum unit (100->1, 20->2)."""
    return sum(int(str(V[c]).rstrip("0")) for c in s if c in V)


def words_of(text):
    return [w for w in (NON_LETTER.sub("", t) for t in SPLIT.split(text)) if w]


def book_of(ref):
    return ref.rsplit(" ", 1)[0]


def load_corpus(path, key="text"):
    return [(p["ref"], p[key], p.get("en")) for p in json.load(open(path))]


def name_matches(word, part):
    """The word is the name, or the name behind one or two prefix letters (ו־, ל־, ...)."""
    forms = [part] + VARIANTS.get(part, [])
    for f in forms:
        if word == f:
            return True
        if word.endswith(f) and 1 <= len(word) - len(f) <= 2 and set(word[: -len(f)]) <= PREFIXES:
            return True
    return False


def els_counts(arr, word, max_skip):
    """Count forward+backward equidistant-letter occurrences, skips 2..max_skip; also the min-skip hit."""
    w = [ord(c) for c in word]
    n, L = len(w), len(arr)
    total, best = 0, None
    for k in range(2, max_skip + 1):
        span = (n - 1) * k
        if span >= L:
            break
        for seq, direction in ((w, 1), (w[::-1], -1)):
            m = arr[: L - span] == seq[0]
            for j in range(1, n):
                m &= arr[j * k: L - span + j * k] == seq[j]
            c = int(m.sum())
            if c:
                total += c
                if best is None:
                    start = int(np.flatnonzero(m)[0])
                    pos = [start + j * k for j in range(n)]
                    if direction == -1:
                        pos = pos[::-1]
                    best = {"skip": k * direction, "positions": pos}
    return total, best


def main(name, out_path):
    parts = name.split()
    tanakh = load_corpus("data/tanakh.json")
    tan_words = [words_of(t) for _, t, _ in tanakh]
    torah_idx = [i for i, (r, _, _) in enumerate(tanakh) if book_of(r) in TORAH_BOOKS]
    book_order = list(dict.fromkeys(book_of(r) for r, _, _ in tanakh))
    letters = json.load(open("data/torah-letters.json"))
    T = open("data/torah-string.txt", encoding="utf-8").read().strip()
    tv = json.load(open("data/torah-verses.json"))
    tv_starts = [o for _, o in tv]

    def where(pos):
        return tv[bisect.bisect_right(tv_starts, pos) - 1][0]

    arr = np.frombuffer(T.encode("utf-32-le"), dtype=np.uint32).astype(np.int32)

    # Uncapped word frequencies per corpus.
    def freq(word_lists):
        c = collections.Counter()
        for ws in word_lists:
            c.update(ws)
        return c
    corpora = {
        "Tanakh": tan_words,
        "Mishnah": [words_of(t) for _, t, _ in load_corpus("data/mishnah.json")],
        "Mishneh Torah": [words_of(t) for _, t, _ in load_corpus("data/mishneh-torah.json")],
    }
    freqs = {k: freq(v) for k, v in corpora.items()}
    tan_freq = freqs["Tanakh"]
    torah_freq = freq(tan_words[i] for i in torah_idx)

    def verse(i, hl=None):
        r, t, en = tanakh[i]
        return {"ref": r, "he": t, "en": en, "highlight": hl}

    report = {"name": name, "parts": [], "full": {}}

    # ---- Per-part analysis -------------------------------------------------
    for part in parts:
        val = g(part)
        info = {"word": part, "value": val, "katan": katan(part),
                "letters": [{"ch": c, "value": V[c]} for c in part]}

        # The name itself in the Tanakh.
        hits = [(i, w) for i, ws in enumerate(tan_words) for w in ws if name_matches(w, part)]
        verses_with = sorted(set(i for i, _ in hits))
        by_book = collections.Counter(book_of(tanakh[i][0]) for i, _ in hits)
        info["inTanakh"] = {
            "occurrences": len(hits),
            "verses": len(verses_with),
            "forms": collections.Counter(w for _, w in hits).most_common(),
            "byBook": [[b, by_book[b]] for b in book_order if by_book[b]],
            "first": verse(verses_with[0]) if verses_with else None,
            "all": [tanakh[i][0] for i in verses_with][:400],
        }

        # Gematria siblings: every distinct Tanakh word with the same value, uncapped counts.
        sib = [(w, n) for w, n in tan_freq.items() if g(w) == val]
        sib.sort(key=lambda x: -x[1])
        info["siblings"] = {
            "distinctForms": len(sib),
            "occurrences": sum(n for _, n in sib),
            "inTorah": sum(torah_freq.get(w, 0) for w, _ in sib),
            "top": [{"word": w, "count": n, "torah": torah_freq.get(w, 0)} for w, n in sib[:24]],
            "otherCorpora": {k: {"distinctForms": sum(1 for w in f if g(w) == val),
                                 "occurrences": sum(n for w, n in f.items() if g(w) == val)}
                             for k, f in freqs.items()},
        }
        # Where the siblings live, book by book.
        sib_set = {w for w, _ in sib}
        sb = collections.Counter()
        for i, ws in enumerate(tan_words):
            for w in ws:
                if w in sib_set:
                    sb[book_of(tanakh[i][0])] += 1
        info["siblings"]["byBook"] = [[b, sb[b]] for b in book_order if sb[b]]

        # Pasuk l'shmo: a verse opening with the name's first letter and closing with its last.
        first, last = part[0], part[-1]
        cand = []
        for i, ws in enumerate(tan_words):
            if not ws or ws[0][0] != first:
                continue
            end = ws[-1][-1]
            if FINAL_TO_BASE.get(end, end) != FINAL_TO_BASE.get(last, last):
                continue
            has_name = any(name_matches(w, part) for w in ws)
            bk = book_of(tanakh[i][0])
            cand.append((not has_name, bk != "Psalms", len(ws), i, has_name))
        cand.sort()
        info["nameVerses"] = {"candidates": len(cand),
                              "picks": [dict(verse(c[3]), containsName=c[4]) for c in cand[:12]]}

        # Letters in the Torah.
        tot = letters["total"]["letters"]
        lc = letters["total"]["counts"]
        info["letterStats"] = [{"ch": c, "count": lc[c], "pct": 100 * lc[c] / tot} for c in part]
        info["surprisalBits"] = -sum(math.log2(lc[c] / tot) for c in part)

        # Literal appearances in the unbroken Torah string (crossing word breaks too).
        pos, start = [], T.find(part)
        while start != -1:
            pos.append(start)
            start = T.find(part, start + 1)
        info["torahString"] = {"count": len(pos), "positions": pos,
                               "hits": [{"pos": q, "ref": where(q),
                                         "context": T[max(0, q - 8): q + len(part) + 8],
                                         "offset": min(8, q)} for q in pos]}

        # ELS with two controls: a naive full shuffle and the fair block shuffle.
        real, best = els_counts(arr, part, ELS_MAX_SKIP)
        controls = {}
        for label, block in (("fullShuffle", len(arr)), ("blockShuffle", ELS_BLOCK)):
            rng = np.random.default_rng(613)
            runs = []
            for _ in range(ELS_SHUFFLES):
                sh = arr.copy()
                for i in range(0, len(sh), block):
                    rng.shuffle(sh[i:i + block])
                runs.append(els_counts(sh, part, ELS_MAX_SKIP)[0])
            mu, sd = float(np.mean(runs)), float(np.std(runs))
            controls[label] = {"runs": runs, "mean": mu, "z": (real - mu) / sd if sd else 0.0}
        if best:
            best["refs"] = sorted({where(q) for q in best["positions"]}, key=lambda r: tv_starts[[x for x, _ in tv].index(r)])
        info["els"] = {"maxSkip": ELS_MAX_SKIP, "block": ELS_BLOCK, "real": real,
                       "controls": controls, "minSkip": best}
        report["parts"].append(info)
        print(part, val, "tanakh:", len(hits), "siblings:", len(sib), "els:", real,
              {k: round(c["z"], 2) for k, c in controls.items()}, file=sys.stderr)

    # ---- Whole name --------------------------------------------------------
    joined = "".join(parts)
    total = g(joined)
    distinct = sorted(set(FINAL_TO_BASE.get(c, c) for c in joined), key=lambda c: V[c])
    phrases = json.load(open("data/hebrew-phrases.json"))
    ph = [(p[0], len(p[1]), p[1][0][0]) for p in phrases if g(p[0]) == total]
    ph_words = [(w, n) for w, n in tan_freq.items() if g(w) == total]
    vs = [i for i, ws in enumerate(tan_words) if g("".join(ws)) == total]
    initials = "".join(p[0] for p in parts)
    finals = "".join(p[-1] for p in parts)
    report["full"] = {
        "value": total, "katan": katan(joined), "letterCount": len(joined),
        "distinctLetters": distinct, "missingLetters": [c for c in "אבגדהוזחטיכלמנסעפצקרשת" if c not in distinct],
        "words": [{"word": w, "count": n} for w, n in sorted(ph_words, key=lambda x: -x[1])],
        "phrases": {"count": len(ph), "top": [{"phrase": p, "count": n, "first": verse(i)}
                                              for p, n, i in sorted(ph, key=lambda x: -x[1])[:12]]},
        "verses": [verse(i) for i in vs][:12],
        "versesCount": len(vs),
        "initials": {"letters": initials, "value": g(initials)},
        "finals": {"letters": finals, "value": g(finals)},
    }
    report["meta"] = {
        "torahLetters": letters["total"]["letters"],
        "bookStarts": [[r.split(" ")[0], o] for r, o in tv if r.endswith(" 1:1")],
        "torahSource": letters["source"],
        "tanakhSource": "Westminster Leningrad Codex (Qere) + JPS 1917, via data/tanakh.json",
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("wrote", out_path, file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
