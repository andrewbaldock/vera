# Roadmap

**Purpose:** what's missing, what was deferred on purpose, and what's next.
**Audience:** me, and anyone asking "why doesn't it do X?"
**Read time:** 4 minutes.
**Last reviewed:** <!-- DATE -->

<!--
  CEILING: 250 lines.
  THE RULE FOR THIS FILE: a deferral with a reason and a cost is engineering
  judgment. A deferral without one is a gap. Every row below needs both.
  The source material is already written — grep the codebase for `ponytail:` and
  for the "left undone deliberately" notes in component docblocks.
-->

---

## Known limits

<!-- PROMPT (table)
Columns: Limit | Where it bites | Why it's acceptable now.
Things that are true of the current build and would surprise someone. The
fixture-sized assumptions belong here: constants tuned to 34 pages, windows
sized for one panel shape, anything measured against one document.
-->

## Deliberately deferred

<!-- PROMPT (table)
Columns: What | Why deferred | What it would take.
Column 3 is the one that matters — a deferral I can cost is a decision, and one
I can't is a guess. Be specific: name the function and the constraint, not
"refactor the viewer".
LINK: each row to its ADR where one exists.
-->

## Next

<!-- PROMPT (ordered list)
In the order I'd actually do them, with the reason for the order. Three to five
items. A roadmap longer than that isn't a roadmap.
-->

## Won't do

<!-- PROMPT (bullets)
Things that look like obvious next steps and aren't, with the reason. This
section prevents the same suggestion arriving three times, and it's the one
that shows the scope boundary was held on purpose.
-->
