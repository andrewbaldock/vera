# Testing

**Purpose:** what's verified, how, and what isn't.
**Audience:** an engineer deciding whether to trust this code.
**Read time:** 4 minutes.
**Last reviewed:** <!-- DATE -->

<!-- CEILING: 250 lines. -->

---

## What I test, and what I don't

<!-- PROMPT (100 words)
The policy in a paragraph, before any detail. Which classes of bug the suites are
built to catch, and which are deliberately left to manual checking. A stated
policy is worth more than a coverage number.
-->

## Two suites, two runners

<!-- PROMPT (120 words)
Why the split. The rules are pure functions and want no DOM; layout is the
opposite, and the class of bug the layout suite exists to catch is the class a
DOM shim cannot see. One paragraph each.
-->

### Unit — the product rules

<!-- PROMPT (table)
Columns: File | What it pins down.
One row per test file in ../src/. Column 2 says the rule, not the mechanics:
"a checked box can never unlock submit", not "tests useReview".
-->

### Browser — layout and interaction

<!-- PROMPT (table)
Columns: File | What it pins down.
One row per spec in ../tests/. Same rule: state the guarantee.
-->

## A test that earned itself

<!-- PROMPT (80 words)
One concrete bug a suite caught that review didn't. This is the section that
justifies the suites existing, so pick the best example and give the number.
-->

---

## What isn't covered

<!-- PROMPT (bullets)
Honest gaps, each with one clause on why it's acceptable here and what would
close it. Naming the gaps is what makes the coverage claims credible.
-->

## Running them

<!-- PROMPT (80 words)
Commands, first-run setup for the browser suite, and roughly how long each takes.
Anything a stranger would hit on a clean machine goes here.
-->

## Manual checks

<!-- PROMPT (bullets)
The things no suite covers and I check by hand before a release: real devices,
both themes, all three text sizes, keyboard-only pass, screen reader spot check.
This doubles as the pre-release checklist, so keep it actionable.
LINK: ../newdocs/RELEASES.md
-->
