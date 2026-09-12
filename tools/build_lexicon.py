#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds data/lexicon.json: the word list used to find "other words and
phrases" inside a rendered matrix, tagged by register:

  - "torah"    : word forms actually attested in the extracted Torah text
                 (top forms by frequency) -- sourced directly from the text,
                 not hand-picked.
  - "rabbinic" : curated Mishnaic/Talmudic Hebrew terms.
  - "modern"   : curated modern Hebrew terms.

A word may carry more than one tag (e.g. a biblical word still in everyday
modern use). Run tools/extract_torah.py first to produce
build/torah_word_freq.json.

Usage:
    python3 tools/build_lexicon.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD_DIR = os.path.join(ROOT, "build")
DATA_DIR = os.path.join(ROOT, "data")

HEB_RE = re.compile(r"^[א-ת]+$")

TORAH_WORD_LIMIT = 900

RABBINIC = """
משנה תלמוד גמרא הלכה הלכות אגדה מצוה מצוות תפילה תפילות ברכה ברכות קידוש הבדלה
ישיבה ישיבות תנא תנאים אמורא אמוראים סנהדרין נזיקין מועד זרעים טהרות קדשים נשים
עירוב עירובין כשר כשרות טרפה נבלה חמץ מצה מצות סוכה לולב אתרוג שופר מנורה תפילין
מזוזה מזוזות ציצית טלית כיפה קרבן קרבנות כהן כהנים לוי לויים רבי רבנים חכם חכמים
תלמיד תלמידים פלפול חידוש חידושים תוספות פוסק פוסקים מגילה מגילות חנוכה פורים
כיפור תשובה גיהנום נשמה נשמות גלגול קבלה זוהר מלאך מלאכים שטן ענווה גאווה צדקה
חסד חסדים גבורה בינה חכמה כתר דעת דיין דיינים עדות עדים שבועה שבועות ממון נזק
גזלן גנב רוצח קניין חזקה שכירות שותפות ערבות פדיון גיטין גט קידושין כתובה יבום
חליצה ממזר גר גיור טבילה מקווה נידה טהרה טומאה אבלות שבעה שלושים קדיש מניין חזן
דרשה דרשות מדרש מדרשים איסור היתר ספק ודאי מוחזק גזירה גזירות תקנה תקנות מנהג
מנהגים מחלוקת פשרה ריבית הלוואה פקדון שומר שומרים אונס פשיעה
""".split()

MODERN = """
מחשב מחשבים אינטרנט טלפון טלפונים סלולר נייד מכונית מכוניות אוטובוס רכבת רכבות
מטוס מטוסים מסוק טלוויזיה רדיו עיתון עיתונים אוניברסיטה דמוקרטיה ממשלה כנסת נשיא
שגריר שגרירות משטרה שוטר צבא חייל חיילים קצין קצינים טנק טילים טיל פצצה לוויין
לוויינים חלל חללית אסטרונאוט מדע מדעים טכנולוגיה ביולוגיה כימיה פיזיקה מתמטיקה
כלכלה בנק בנקים שקל שקלים מטבע מטבעות בורסה חברה חברות תעשייה חקלאות תחבורה
כביש כבישים מנהרה מנהרות גשר גשרים חשמל סוללה סוללות מצלמה מצלמות מקרר מקררים
מזגן מזגנים מדפסת מדפסות תוכנה תוכנות חומרה אתר אתרים דואר רשת אבטחה סייבר רובוט
רובוטים סטארטאפ חדשנות יזמות יזם יזמים פרסום שיווק מדיה עיתונאי עיתונאים במאי
שחקן שחקנים קולנוע סרט סרטים אולפן אולפנים אמן אמנים מוזיקה פסטיבל תערוכה גלריה
מוזיאון ספרייה ספריות מרפאה מרפאות רופא רופאים אחות אחיות תרופה תרופות חיסון
חיסונים מגפה וירוס
""".split()


def main():
    freq_path = os.path.join(BUILD_DIR, "torah_word_freq.json")
    with open(freq_path, encoding="utf-8") as f:
        freq = json.load(f)

    torah_words = [w for w in freq if HEB_RE.match(w) and len(w) >= 2]
    torah_words.sort(key=lambda w: -freq[w])
    torah_words = torah_words[:TORAH_WORD_LIMIT]

    entries = {}

    def add(word, category):
        word = word.strip()
        if not word or not HEB_RE.match(word):
            return
        entries.setdefault(word, set()).add(category)

    for w in torah_words:
        add(w, "torah")
    for w in RABBINIC:
        add(w, "rabbinic")
    for w in MODERN:
        add(w, "modern")

    lexicon = [{"w": w, "cat": sorted(cats)} for w, cats in entries.items()]
    lexicon.sort(key=lambda e: e["w"])

    print("Total lexicon entries:", len(lexicon))

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, "lexicon.json"), "w", encoding="utf-8") as f:
        json.dump(lexicon, f, ensure_ascii=False, separators=(",", ":"))

    print("Wrote data/lexicon.json")


if __name__ == "__main__":
    main()
