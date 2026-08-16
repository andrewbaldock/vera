# Architecture

**Purpose:** how the code is organized and where to change it.
**Audience:** an engineer picking this up cold.
**Read time:** 8 minutes.
**Last reviewed:** <!-- DATE -->

<!--
  CEILING: 250 lines.
  THE RULE FOR THIS FILE: describe structure, not rationale. "Why this shape"
  goes in an ADR; this file says what the shape is and where things live.
  Every component named here should be a link into ../src/.
-->

---

## The shape of it

<!-- PROMPT (120 words + diagram)
The component tree in one diagram, and a paragraph naming the three or four
pieces that matter. A reader should be able to point at the file that owns each
region of the screen.
ASSET: assets/architecture/
-->

## Routing

<!-- PROMPT (80 words)
The routes, what each renders, and what the URL is treated as the source of
truth for. Why a router at all for this few routes.
-->

---

## Data flow

<!-- PROMPT (120 words + diagram)
Where data enters, where it's validated, what shape it has by the time a
component sees it. The boundary validation is the load-bearing part — say what
it catches.
-->

## State ownership

<!-- PROMPT (table)
Columns: State | Owner | Readers | Persisted where.
The single most useful table in this document. It's what stops the next person
adding a fourth copy of something that already has an owner.
-->

### The one value with three readers

<!-- PROMPT (120 words)
`focusedPage`: one writer, three views of it, and why scroll position is its only
writer. This is the piece of the design most likely to be broken by someone
who doesn't know the rule, so state the rule plainly.
-->

### What persists, and where

<!-- PROMPT (table)
Columns: Key | Scope | Lifetime | Why it's device-scoped or account-scoped.
Include the localStorage keys by name.
-->

---

## Two layouts, one component tree

<!-- PROMPT (100 words)
How the two shapes come out of one tree, what CSS decides, and what
consequently cannot drift. Name the one behavior that genuinely differs between
them and why.
-->

## The viewer

<!-- PROMPT (150 words)
The heaviest part of the app and the part with the most non-obvious constraints.
Cover: why every text layer mounts and only nearby canvases paint; why heights
are reserved from API data before anything renders; why measurement is against
the scroll container and never the window; the zoom control and how it interacts
with the canvas window.
LINK: decisions/ for each.
-->

## The token layer

<!-- PROMPT (100 words)
Where design tokens live, the rule that components never name a color, and how
the theme resolves to a single class. Name the file.
-->

---

## Seams

<!-- PROMPT (table)
Columns: Seam | What's there now | What replaces it in production.
This is the section that shows the demo was built to be replaced rather than to
be a demo. Keep it concrete — name the module, not the concept.
LINK: 07-production.md
-->

## Where to add things

<!-- PROMPT (bullets)
"If you need to add X, it goes in Y." Six or eight of the most likely changes.
Written for the person who inherits this, which on a portfolio project is a
reviewer imagining being that person.
-->
