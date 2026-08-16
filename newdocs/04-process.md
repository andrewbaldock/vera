# Process

**Purpose:** how this was built, and by whom.
**Audience:** anyone evaluating how I work.
**Read time:** 6 minutes.
**Last reviewed:** <!-- DATE -->

<!--
  CEILING: 250 lines.
  THE RULE FOR THIS FILE: this is the most personal document in the set and the
  one an interviewer is most likely to quote back. Write it last, when the rest
  has reminded you what actually happened. First person throughout, no hedging.
-->

---

## How I worked

<!-- PROMPT (120 words)
The actual sequence, honestly. Where the time went. If most of a day went into
one problem, say which and why — that's more interesting than a tidy timeline.
-->

## Design before code

<!-- PROMPT (100 words)
What existed on paper before the first commit, and what that bought. The
wireframes are the evidence, so link them.
LINK: 02-design.md, assets/wireframes/
-->

## Proving the riskiest dependency first

<!-- PROMPT (150 words)
The PDF renderer was the assumption the whole build rested on, so it got a
throwaway harness before anything else was committed to.
Cover: what was uncertain, what the harness tested, what it showed, and what
would have happened had it failed.
LINK: ../src/demo/ReactPdfDemo.tsx
This section is the strongest thing in the document. Give it room.
-->

## What was actually hard

<!-- PROMPT (200 words)
Two or three genuine problems, with the wrong turns included. Not "TypeScript
was tricky" — the specific thing that took hours and why the obvious approach
failed.
The failed approaches are the content. A problem with no wrong turn in it wasn't
hard, it was just work.
-->

## The bug only a real device could find

<!-- PROMPT (150 words)
The failure that never appeared in a desktop browser or a simulator. What broke,
how it presented, how it was tracked down, and what it changed about the build
beyond the fix itself.
The general lesson — a dependency's browser floor is the product's floor — is
worth one sentence at the end. One.
-->

---

## Tooling

<!-- PROMPT (80 words)
Runtime, bundler, linter, test runners, and one clause each on why. Skip
anything that was the default and stayed the default.
-->

## AI pair programming, stated plainly

<!-- PROMPT (200 words)
What I used, for what, and where I overrode it. Be specific and be honest in
both directions — claiming too little is as unconvincing as claiming too much.
The useful content is the shape of the collaboration: what I brought that the
model didn't, and what it caught that I wouldn't have.
LINK: the attribution ledger for the itemized record.
-->

## What I'd do differently

<!-- PROMPT (120 words)
Real regrets, not humble-brags. Something that cost time, something built in the
wrong order, something over-built.
-->
