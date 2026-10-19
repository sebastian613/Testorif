# Torahscope source licensing audit

Checked October 19, 2026, against repository commit `dd0270b87cbe5c931d8cc14b0f5a11c80f38709e`.
This is a provenance and attribution audit, not a finding that a license violation occurred.
It does not establish commercial clearance for the entire application.

## Findings and scope

| Material used | Evidence | Status and action |
| --- | --- | --- |
| Mishnah Hebrew, Torat Emet 357 | Live Sefaria version metadata for all 63 tractates | All 63 explicitly tagged Public Domain. Credit the edition and Sefaria. |
| Mishnah English, Mishnah Yomit by Dr. Joshua Kulp | Live version metadata for all 63 tractates, with original source `http://learn.conservativeyeshiva.org/mishnah/` | All 63 explicitly tagged `CC-BY`. Sefaria's own license map resolves that label to CC BY 3.0. Retain attribution, source and license links, and describe processing. |
| Tanakh Hebrew, Westminster Leningrad Codex via Open Scriptures Hebrew Bible | [Upstream license](https://github.com/openscriptures/morphhb/blob/master/LICENSE.md) | Underlying Westminster text is public domain; OSHB project specifies CC BY 4.0 and a required attribution statement. Conservatively retain project attribution and license in the interface and exports. No conclusion that all extracted Hebrew text is independently copyrightable. |
| Tanakh English, The Holy Scriptures: A New Translation (JPS 1917) | Sefaria's exact edition metadata for all 39 book files, including its explicit public domain note | Public Domain metadata. Keep JPS credit. Do not confuse this edition with modernized JPS editions carrying different licenses. |
| Tanakh English highlight offsets | README identifies STEPBible TAHOT as the gloss used to derive offsets; [STEPBible data README](https://github.com/STEPBible/STEPBible-Data/blob/master/README.md) specifies CC BY 4.0 | Credit STEPBible and identify offset derivation. The app reproduces JPS prose rather than the TAHOT gloss. No conclusion here about copyright in numerical offsets. Original regeneration inputs are not checked in. |
| Mishneh Torah Hebrew, Torat Emet 363 | Exact version metadata for the 77 treatises recorded in the checked-in manifest | All 77 tagged Public Domain. Older README count of 72 was stale. A separately named Kings and Wars edition with omissions reinserted is unknown, and is not the manifest's selected edition. |
| Mishneh Torah Hebrew, Torat Emet 370 | Exact version metadata for seven treatises | Reading the Shema and Prayer and the Priestly Blessing tagged Public Domain. Five others unknown, detailed below. |
| Mishneh Torah introductory texts, Mechon Mamre via Sefaria | Exact version metadata for Transmission of the Oral Law and Positive Mitzvot | Both tagged Public Domain by Sefaria. This observation applies to these exact hosted versions. |
| Mishneh Torah introductory texts, direct Mechon Mamre downloads | Builder downloads two pages and previously assigns Public Domain without checking source terms | Permission unresolved. Source pages returned HTTP 403 during this audit. Sefaria's tags on other texts do not resolve the direct downloads. |

Raw version metadata and endpoint URLs are retained in
[source-metadata-2026-10-19.json](source-metadata-2026-10-19.json).
This contains 63 Mishnah version-list queries, 88 Mishneh Torah version-list
queries and a Genesis check, plus a separate 39 book Tanakh edition survey. Empty filtered
version lists for two introductory texts mean no matching Torat Emet or Mechon
Mamre hosted edition was found, not that an unrestricted edition exists.
The metadata survey is evidence of current labels, not independent verification
of each contributor's chain of title or a byte-for-byte comparison of the shipped
datasets with live source text.

## Joshua Kulp attribution and permissions

Sefaria returns the title **Mishnah Yomit by Dr. Joshua Kulp**, short title
**Dr. Joshua Kulp**, license **CC-BY**, and the Conservative Yeshiva source URL.
The reviewed records contain empty version notes and extended notes; no additional
attribution party or copyright notice was supplied in those fields.

The numeric license version is absent from the API label. It is resolved using
[Sefaria's own license map at commit 121350b2659ef01e08ef618cf7bbefd54f8799ed](https://github.com/Sefaria/Sefaria-Project/blob/121350b2659ef01e08ef618cf7bbefd54f8799ed/static/js/sefaria/sefaria.js),
which maps `CC-BY` to `https://creativecommons.org/licenses/by/3.0/`.
A dated excerpt is retained in [sefaria-license-map-2026-10-19.json](sefaria-license-map-2026-10-19.json).
This is an interpretation of Sefaria's unversioned label using its own published
implementation, not a separately obtained grant from the translator.

[CC BY 3.0 legal code](https://creativecommons.org/licenses/by/3.0/legalcode)
sections 3 and 4 permit reproduction and adaptation, including commercial use,
subject to conditions. Distribution must retain required notices, identify the
creator and supplied title, retain the relevant supplied URI where reasonably
practicable, and include a copy of or URI for the license. Adaptations must identify
use of the original; do not imply endorsement or impose restrictions that prevent
recipients exercising the licensed rights. This is not a blanket license for
Sefaria's website or for other editions.

Torahscope's credit includes the supplied title and creator, a Sefaria edition
link, the supplied original source URI, and the CC BY 3.0 URI. It states what the
builder actually does: removes HTML and normalizes whitespace. It does not claim
that the extracted text is wholly unchanged. The footer keeps the core credit
visible; source details expand on demand. Individual word, phrase and passage
copies carry attribution when they reproduce the translation. Markdown includes
one credit for the report, only if a displayed citation includes English. Empty
reports and Hebrew-only Mishnah output do not claim to reproduce Kulp's English.

The Tanakh attribution also retains the OSHB statement:
“Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb”.
This applies to Hebrew output even where JPS English is absent.

## Unresolved Mishneh Torah permissions

The following **Torat Emet 370** versions remain `unknown` in live metadata:

1. Tefillin, Mezuzah and the Torah Scroll
2. Fringes
3. Blessings
4. Circumcision
5. The Order of Prayer

Matching title, publisher or source URL does not establish that these texts have
the same permissions as another treatise. The earlier build's comparison across
edition names was an inference, not proof. Torat Emet's own
[introduction](https://mail.toratemetfreeware.com/contents/intro.html) describes free
copying and distribution. That language does not independently establish a public
domain dedication or permission for commercial reuse of these exact editions.

Two additional direct downloads require independent verification:

| Treatise | Direct source |
| --- | --- |
| Negative Mitzvot | https://www.mechon-mamre.org/i/0002n.htm |
| Overview of Mishneh Torah Contents | https://www.mechon-mamre.org/i/0003n.htm |

The manifest now labels all seven records `unknown` with
`permissionsStatus: unresolved`. Existing corpus text remains present, so this
patch does **not** make the shipped corpus commercially cleared. The builder
refuses unverified records before writing datasets, including legacy cached
records labeled Public Domain by the previous inference. This intentionally
blocks a complete rebuild pending resolution.

To resolve each item, obtain an authoritative statement covering the exact edition,
its electronic transcription and intended commercial distribution, or replace it
with a verified edition and rebuild all dependent indexes. Retain the statement,
source URL, edition title and verification date. Confirm API and copyright notices
again at release time. Do not simply remove `unknown` or bypass the guard.

## Validation

Node regression tests execute the actual copy and Markdown routines with controlled
corpus data, covering all three result types, missing translations, empty reports,
wrong-corpus attribution and one notice per report. Additional Python tests verify
rejection of unknown permissions, old cached claims and direct-download assumptions.
Browser clipboard checks are extended in the existing Playwright suite. Local
browser execution depends on an available Chromium installation.

Local validation on October 19, 2026: all 38 Node tests and all four Python
permission tests passed; JavaScript syntax and whitespace checks passed. Browser
checks could not run: Chromium downloads were invalid archives, and the existing
http-server startup failed on the sandbox's network interface enumeration.
No browser or visual verification is claimed. CI retains the browser checks.
