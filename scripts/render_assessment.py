#!/usr/bin/env python3
"""Fill an assessment template's verse placeholders from data/tanakh.json.

  python3 scripts/render_assessment.py reports/templates/assessment-yoshiyahu.html reports/assessment-yoshiyahu.html

{{he:Ref|phrase}} becomes the vocalized verse (cantillation removed) with the
words matching `phrase` (by bare consonants) wrapped in <mark>; an empty
phrase leaves the verse unmarked. {{en:Ref}} becomes the JPS 1917 English.
Pulling the text from the data, rather than typing it, keeps quotes exact.
"""
import html
import json
import re
import sys

CANT = re.compile(r"[֑-ֽ֯׀׃]")
LETTERS = re.compile(r"[^א-ת]")
verses = {v["ref"]: v for v in json.load(open("data/tanakh.json", encoding="utf-8"))}


def he(ref, phrase):
    text = CANT.sub("", verses[ref]["text"])
    tokens = re.split(r"([\s־]+)", text)
    words = [i for i, t in enumerate(tokens) if LETTERS.sub("", t)]
    target = phrase.split()
    marked = set()
    if target:
        cons = [LETTERS.sub("", tokens[i]) for i in words]
        for k in range(len(cons) - len(target) + 1):
            if cons[k:k + len(target)] == target:
                marked = set(words[k:k + len(target)])
                break
        if not marked:
            raise SystemExit(f"phrase {phrase!r} not found in {ref}")
    out = []
    for i, t in enumerate(tokens):
        out.append(f"<mark>{html.escape(t)}</mark>" if i in marked else html.escape(t))
    return "".join(out)


def fill(m):
    kind, arg = m.group(1), m.group(2)
    if kind == "he":
        ref, _, phrase = arg.partition("|")
        return he(ref, phrase)
    return html.escape(verses[arg]["en"])


src, out = sys.argv[1:3]
page = re.sub(r"\{\{(he|en):([^}]*)\}\}", fill, open(src, encoding="utf-8").read())
open(out, "w", encoding="utf-8").write(page)
print("wrote", out)
