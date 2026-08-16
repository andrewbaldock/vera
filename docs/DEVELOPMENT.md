# Development approach

**The first of the three bonus artifacts: how this was built, and what in it required knowing
something that isn't obvious.**

The repo is evidence for a single claim: a frontend that takes the phone, the keyboard, the
screen reader, the user's flow and the next developer seriously *at the same time*, with the
reasoning behind every choice written down where it can be checked. [`DESIGN.md`](DESIGN.md) is
that reasoning, [`ARCHITECTURE.md`](ARCHITECTURE.md) is the map of what it built, and this is
how the two got made.

---

## Design before code

DESIGN.md was opened before the first component and updated as the code moved, not written
afterward to describe what happened. It ends in a decision log of fifty-six rows, each naming the
alternatives rejected, so an absence reads as a decision rather than an oversight. Reversals
stay in as **SUPERSEDED** rows rather than being edited away.

The [wireframes](wireframes/) were drawn before implementation for the same reason: settling
the layout on paper is cheaper than settling it in JSX, and the sketches then record intent
rather than reverse-justifying the code. They were kept unedited where the build diverged.

## Prove the riskiest dependency before committing to it

The viewer carries acceptance criterion #1 and was the only genuinely unknown part of the
build, so it was tested rather than assumed. Before any product code, a standalone harness
proved four behaviors: all pages mounted with text layers, whole-document `CMD+F`,
jump-to-page, and knowing which page is in view.

It surfaced three problems that would each have been far more expensive to meet later: pdf.js's
text layer sits at `z-index: 2` and silently eats clicks meant for the UI above it; page heights
must be reserved from the API's dimensions before anything paints, or every scroll target lands
wrong; and `IntersectionObserver` cannot answer "which page am I on."

The harness is still in the repo at [`src/demo/ReactPdfDemo.tsx`](../src/demo/ReactPdfDemo.tsx),
served at `/demo` and lazily loaded so it costs a normal visitor nothing. It is the cheapest way
to answer "is it react-pdf or is it us?"

---

## What most required expertise

Seven things, all documented at length in DESIGN.md. None of them are visible in a screenshot.

**The text layer and the canvas are separable.** Criterion #1 forces every page into the DOM.
At devicePixelRatio 2 a full-width canvas is roughly 10 MB, so 34 of them approaches 350 MB and
iOS Safari discards tabs for less. Find needs the text layer, which is DOM spans; memory is
spent on the canvas. Mount every text layer always, paint canvases only near the viewport:
roughly 50 MB instead of 350. Taking the phone seriously found a defect in the desktop design,
where mounting 34 canvases was never a good idea either, merely survivable.

**The thumb strip's "one scale factor" rule fails in every CSS formulation.** A per-segment
`min-height` floor gives any clamped segment *its own* factor, rendering a short page visibly
wider than the full page beside it. Fitting height alone ignores width and computes 180px
segments inside a 44px column. Percentage heights plus a flex `gap` overflow by `(n−1) × gap` on
every viewport, putting the last pages below the fold of a control you drag rather than scroll.
All three are invisible against a uniform 34-page Letter fixture. Every CSS version stops being
one factor the moment a constraint binds, so this is arithmetic against a measured column.

**Fills and text need different contrast tokens.** The severity colors are tuned to read as 8px
marks. As 12px type they measure 4.77, 2.56 and 3.63 against white: two of three under the
4.5:1 AA floor, Major by a mile. Severity as a *word* gets its own darkened token, and
[`tests/contrast.spec.ts`](../tests/contrast.spec.ts) measures the ratio against every surface
in both themes rather than asserting it in a comment.

**"Ignored" is the wrong word on a compliance file.** The brief's criterion says minor issues
may be ignored, which is fine in a requirements document. *Ignored* means not looked at; what
happens is that a reviewer sees the finding, judges it non-material and accepts it. No lender
wants a file stating six findings were ignored. The product says **accepted as-is**.

**A list of findings worked against a document is spreadsheet-shaped.** The issues list is an
ARIA grid with a roving tabindex: one tab stop instead of fifty, arrow keys to walk the rows,
`Enter` to open a page *without moving focus*. That is what the grid pattern exists for.

**`canSubmit` takes a whole `Review`.** Not an array of issues. A filtered list, a hidden
severity or a ticked checkbox cannot reach it, because handing it one is a type error
rather than a rule someone has to remember. `lib/review.ts` imports nothing but types.

**Which page you are on is a measurement, not an observation.** Observer callbacks fire only on
threshold crossings, so distant pages report stale ratios and a page taller than the viewport
never reaches the higher thresholds, which freezes the reading after one scroll. A reading line
just below the toolbar is deterministic, and it measures against the **scroll container**, never
the window: this app has no window scroll, so viewport geometry would be wrong by the header
plus the status bar, and would look almost right.

---

## Two suites, because they answer different questions

Vitest covers the rules and the payload guard: pure functions, no DOM, milliseconds. Playwright
covers what only a browser can answer, across seven spec files in both Chromium and WebKit.
jsdom has no layout engine and will report that a 900px panel fits in a 320px window, so the
class of bug the layout suite exists to catch is the class jsdom cannot see. It earned itself on
first run by catching a 32px submit button, under the 44px minimum, on the one control the whole
review ends with.

## The bug only a real device could find

The suite runs Chromium and WebKit, both current. Neither is an iPad.

Opening the deployed build on an iPad running iPadOS 17.4 produced a black screen: content
flashed once and vanished, in both browsers, with a stack trace pointing only into a vendor
chunk. `pdfjs-dist` calls `URL.parse`, which is Chrome 126, Firefox 126 and **Safari 18.4 —
March 2025**. On a device from 2024 it is `undefined`, pdf.js throws while resolving its
worker, and React unmounts the whole tree.

Two things came out of it. The API is polyfilled with the spec's own contract — `new URL`,
returning `null` instead of throwing — so nothing downstream can tell the difference. And the
app gained an **error boundary**, which it had not had at all: without one, any uncaught error
takes the entire tree down to a bare background colour, and on a tablet there is no console to
open. It shows the error rather than swallowing it, which is the right trade for a build
someone else runs on hardware I do not have.

Both are tested by *removing* `URL.parse`, because asserting that a polyfill exists proves
nothing about the app that needs it.

The general lesson is the one already in `PRODUCTION.md`: a dependency's browser floor is the
product's floor whether or not anyone declared one. "Upgrade your iPad" is not an answer a
lender accepts about hardware it issued.

## AI pair programming, stated plainly

This was built with Claude Code, openly. The question worth answering is not whether a model was
in the loop but who decided what.

DESIGN.md ends with an **attribution ledger** recording that: which calls were mine, which the
model proposed, and which of its proposals I corrected. The correction that mattered most was
its page-strip rule, which normalized height and varied width and would have rendered Legal and
Letter identically, hiding the most common real anomaly in a document. Judgment is the part that
doesn't delegate, and the ledger exists so the walk-through is defensible line by line.
