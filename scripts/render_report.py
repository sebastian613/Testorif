#!/usr/bin/env python3
"""Fill a report template with its computed data and the Torah letter string.

  python3 scripts/render_report.py reports/templates/yoshiyahu.html reports/yoshiyahu.json reports/yoshiyahu.html

The template holds two placeholders: __REPORT__ (the JSON from name_report.py)
and __TORAH__ (the 304,850 Torah letters, one ASCII character per letter, so
the scroll map can draw every letter as a pixel).
"""
import json
import sys

LETTERS = "אבגדהוזחטיכךלמםנןסעפףצץקרשת"
CODE = {ch: chr(ord("a") + i) for i, ch in enumerate(LETTERS)}

tpl, data, out = sys.argv[1:4]
report = json.load(open(data, encoding="utf-8"))
for p in report["parts"]:
    p["inTanakh"].pop("all", None)
torah = open("data/torah-string.txt", encoding="utf-8").read().strip()
html = open(tpl, encoding="utf-8").read()
html = html.replace("__REPORT__", json.dumps(report, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
html = html.replace("__TORAH__", "".join(CODE[c] for c in torah))
open(out, "w", encoding="utf-8").write(html)
print(f"wrote {out} ({len(html.encode()) // 1024} KB)")
