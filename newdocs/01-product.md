# Product

**Purpose:** what this screen is, who it's for, and where its edges are.
**Audience:** anyone, including non-engineers.
**Read time:** 5 minutes.
**Last reviewed:** <!-- DATE -->

<!-- CEILING: 250 lines. No code in this file. -->

---

## The problem

<!-- PROMPT (120 words)
What is broken, for whom, before this app exists. Name the person and the task.
One concrete moment beats a paragraph of context.
AVOID: explaining what a mortgage or an appraisal is. AVOID: market framing.
-->

## Who uses it

<!-- PROMPT (100 words)
The reviewer. What their day looks like, what they already know, what they're
under pressure to get right. This is the section that makes every later design
decision legible, so it's worth the words.
-->

## What this screen does

<!-- PROMPT (100 words)
Three or four sentences. A reader should finish this able to say what the screen
is for without using the word "dashboard".
-->

## Where it sits in the flow

<!-- PROMPT (80 words + diagram)
The screens either side of this one, and who owns them. The point is that upload
and fix are other people's tickets, which is what makes the scope boundary a
decision rather than an omission.
ASSET: a flow diagram in assets/.
-->

---

## Scope

### In

<!-- PROMPT (bullets)
What this build delivers. Each bullet is a thing a user can do, not a technology.
-->

### Out, because the brief puts it elsewhere

<!-- PROMPT (bullets)
Things belonging to another screen or another ticket. One clause each on which.
-->

### Out, because I cut it

<!-- PROMPT (bullets)
Things I considered and dropped. This is the more interesting list of the two —
name the thing, then the reason in one clause. A cut with a reason reads as
judgment; a cut without one reads as an omission.
LINK: each significant cut to its ADR in decisions/.
-->

---

## Acceptance criteria

<!-- PROMPT (table)
Columns: Criterion | What satisfies it | Where to see it.
Column 3 links to a component or a test. This table is the fastest way for an
evaluator to confirm the build does what was asked, so it goes near the top of
the file and stays scannable.
-->

---

## The data

<!-- PROMPT (150 words)
What the API gives and, more usefully, what it doesn't. The absences are what
shaped the design — no coordinates, so nothing can be drawn inside a page; page
dimensions present, so heights can be reserved before render.
LINK: the ADRs that follow from each absence.
-->

## Assumptions

<!-- PROMPT (bullets)
Things I decided were true without being told. Each one is a place the build
would need revisiting if it turned out false. Being explicit here is cheap
insurance in a walkthrough.
-->

## Open questions

<!-- PROMPT (bullets)
What I'd ask the product owner if I had one. Keep these real — a question with
an obvious answer reads as padding.
-->
