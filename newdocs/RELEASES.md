<!--
  TEMPLATE. Move to the repo root as RELEASES.md when the first real entry is
  written.

  RULES
  - Newest first.
  - Written for David, not for a build log. He should be able to read one entry
    and know whether he needs to look at the app again.
  - Every entry answers "what changed and why does it matter", before any bullets.
  - Thin releases say they're thin. Inflating a docs-only tag costs credibility
    that a real release then has to spend.
  - Tag freely. Email only on releases with user-visible change.
    See _release-email.md.

  ENTRY SHAPE

    ## vX.Y.Z — YYYY-MM-DD
    One paragraph: what changed and why it matters. No bullets in it.

    **Added** / **Changed** / **Fixed** — only the groups that apply.
    One line each, in the user's language. "The thumb strip is legible at large
    text sizes", not "refactored the scale calculation".

    **Notes** — anything a reader needs that isn't a change: a reversed
    decision, a known issue, something to look at specifically.

  VERSIONING
  - Patch: fixes, nothing new to look at.
  - Minor: new user-visible capability.
  - Major: reserved. This is a take-home; there is unlikely to be a 2.0.
-->

# Releases

<!-- PROMPT
Backfill v1.0.0, v1.0.1 and v1.0.2 from the tags, then add v1.1.0.

  v1.0.0  2026-08-15  the submitted build
  v1.0.1  2026-08-15  the development-approach writeup — docs only
  v1.0.2  2026-08-15  pointer cursor fix, version bump

Be straight about 1.0.1 and 1.0.2. One is a document and the other is a cursor.
Neither needed an email and neither needs a paragraph pretending otherwise.
-->

## v1.1.0 — <!-- DATE -->

<!-- PROMPT (80 words)
The legibility release. Frame it by who it's for: someone who found the type too
small, on a screen where browser zoom is the wrong tool because it scales the
document along with the interface.
-->

**Added**

<!-- PROMPT
- Text size setting, three stops, in the account menu
- Zoom control for the document
-->

**Changed**

<!-- PROMPT
- Thumb strip at large text sizes
-->

**Fixed**

<!-- PROMPT
- The thumb strip readout position under scroll
-->

**Notes**

<!-- PROMPT
The zoom control reverses a documented cut from the original build. Say so and
link the record. A reversal stated openly reads as judgment; one found by a
reader reads as an oversight.
-->

---

## v1.0.2 — 2026-08-15

<!-- PROMPT (30 words) Thin. Say what it was. -->

## v1.0.1 — 2026-08-15

<!-- PROMPT (30 words) Documentation only. Say so. -->

## v1.0.0 — 2026-08-15

<!-- PROMPT (100 words)
The submitted build. This entry is the one people scroll back to, so it earns
more room than the two above it: what the take-home asked for, what was built,
and where the whole thing is described.
LINK: 01-product.md
-->
