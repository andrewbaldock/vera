# Process

**Purpose:** how this was built, and by whom.
**Audience:** anyone evaluating how I work.
**Read time:** 6 minutes.
**Last reviewed:** 2026-08-16

---

It began with a sketch, and researching the state of the Art in PDF display.

## Design before code

The design document was opened before the first component and updated as the code moved, not written
afterward to describe what happened. It ended in a decision log of fifty-six rows, each naming the
alternatives rejected, so an absence reads as a decision rather than an oversight. Reversals
stayed in as superseded rows rather than being edited away.

The [wireframes](assets/wireframes/) were drawn before implementation for the same reason: settling
the layout on paper is cheaper than settling it in JSX, and the sketches then record intent
rather than reverse-justifying the code. They were kept unedited where the build diverged.

## Proving the riskiest dependency first

The viewer carries acceptance criterion #1 and was the only genuinely unknown part of the
build, so it was tested rather than assumed. Before any product code, a standalone harness
proved four behaviors: all pages mounted with text layers, whole-document `CMD+F`,
jump-to-page, and knowing which page is in view.

It is still in the repo at [`src/demo/ReactPdfDemo.tsx`](../src/demo/ReactPdfDemo.tsx), served at
`/demo` and lazily loaded so it costs a normal visitor nothing. It is the cheapest way to answer
*"is it react-pdf or is it us?"*

It surfaced three problems that would each have been far more expensive to meet later.

### 1. Every overlay must clear react-pdf's stacking, or it stops accepting clicks.

react-pdf ships pdf.js's stylesheet, which sets:

```css
.textLayer       { position: absolute; inset: 0; z-index: 2 }
.annotationLayer { z-index: 3 }
```

The text layer is the invisible copy of the page's text laid over the canvas, which is what makes `CMD+F` work at all. At an equal `z-index` the pages win on DOM order, so a toolbar at `z-index: 2` gets covered by the text layer of every page you have scrolled past. It still *looks* correct, because the elements are transparent. But `elementFromPoint` over a button returns a `<span>` of invisible PDF text, so hover stops showing a pointer and clicks land on the document instead.

The symptom is specific and a long way from the cause: **controls work until the first scroll, then go dead.**

This affects three things in the real build, not just the harness: the **status bar** sits above the viewer, the **thumb strip** beside it, and the **confirmation dialog** over everything. Every one of them needs to clear `z-index: 3`, and the reason belongs in a comment where the value is set, because `zIndex: 10` on its own looks arbitrary.

### 2. Page heights must be reserved before the canvases paint

All 34 pages mount at once, but each renders asynchronously — until a canvas paints, its wrapper is a few pixels tall. Jumping to page 30 therefore scrolls to where page 30 is *at that instant*, near the top, and then the pages below finish rendering, the document grows, and the user ends up nowhere near what they asked for.

Setting each wrapper's height from the API's per-page `height`/`width` fixes it: the document is its full length from the first paint, so scroll targets are stable.

This reframes those fields. They look like data for drawing the thumb strip; they are **what makes scrolling correct**. A viewer that ignores them can't reliably navigate to a page, which is most of what this page does.

### 3. "Which page am I on" is a measurement, not an observation

Not an `IntersectionObserver`. Its callback fires only when a threshold is *crossed*, so pages far from the viewport keep reporting whatever ratio they last had, and a page taller than the viewport can never reach the higher thresholds at all, which freezes the answer after the first scroll.

What works is measuring against a *reading line* just below the toolbar: the current page is the last one whose top has scrolled past it. Deterministic, correct for pages taller than the viewport, and cheap, being a rAF-throttled scroll handler that exits the loop early since pages are in document order.

**Scrolling is smooth, but honors `prefers-reduced-motion`.** Moving the page tells the user *where* they went in a way a hard jump doesn't; for people who've asked for reduced motion, a long animated scroll is nauseating rather than informative.

**The harness is kept, not deleted.** It is the cheapest way to isolate a viewer problem from the rest of the app: if find or scrolling misbehaves later, the question "is it react-pdf or is it us?" is one page load away.

## What was actually hard

None of it is visible in a screenshot.

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

The general lesson is the one in [07-production.md](07-production.md): a dependency's browser floor is the
product's floor whether or not anyone declared one. "Upgrade your iPad" is not an answer a
lender accepts about hardware it issued.

---

## Tooling

**Bun** for everything — install, scripts, the unit runner. One toolchain, no Node required, and a cold `bun install` is fast enough that a stranger cloning this is not left waiting.

**Vite** for the build and dev server, **TypeScript** in `strict` with `noUnusedLocals` and `noUnusedParameters`. `bun run build` is `tsc -b && vite build`, so the typecheck and the production build are one command. Running `tsc --noEmit` instead would pass on things the real build rejects.

**Two test runners, on purpose.** vitest for the product rules, which are pure functions and want no DOM at all. [Playwright](../tests/) for anything a browser has to answer, because a DOM shim has no layout engine, and the class of bug that suite exists to catch is the class it cannot see.

**oxlint** rather than ESLint, purely on speed: it finishes fast enough to run without thinking about it.

**GitHub Actions** runs all of it on every push, and deploys from `main` only if it passed — see [05-testing.md](05-testing.md).

## AI pair programming, stated plainly

This was built with Claude Code, openly. The question worth answering is not whether a model was in the loop, but who decided what.

The shape of it: I set the scope and the constraints, and the model was fastest at the parts where the answer is knowable — API behavior, arithmetic, the failure modes of an approach I had described. It was most useful as something to argue with. Several entries in [09-decisions.md](09-decisions.md) exist because I proposed something, got a reason it would not work, and the reason was right.

It was least useful where taste and product judgment do the work. Left alone it reaches for the elaborate version, writes prose that sells rather than states, and needs telling that a reader's actual complaint outranks the design that was already there.

### Attribution ledger

An honest record of who drove what, so the walk-through is defensible.

**The first build — 2026-08-14**

- **Andrew:** the scope boundary (in/out); recognizing the JSON is metadata rather than content, not a source to reconstruct the document from; the checkbox todo-list idea; the instinct to mark issues in the document; page-order default sort with a severity toggle; the status bar and the page strip; **the reversal to a component library**, that deciding "no library" from a ten-control sample is the reasoning that produces component soup, because this page is one screen in a suite; and the call that accessibility should be a strength of the demo rather than a checklist.
- **Andrew checked** react-pdf's `CMD+F` behavior and render quality in its live demo before the library was committed to: the riskiest assumption in the build, looked at rather than trusted. He also made licensing part of the criteria, MIT over anything commercial, in a regulated industry where dependency terms are a procurement question.
- **Claude Code proposed:** the continuous-scroll viewer, on the grounds that native `CMD+F` only searches the DOM (see [decisions](09-decisions.md)); the "checkbox must not unlock submit" constraint and the simulated-reprocessor framing that preserves it; that absence-type findings can never be highlighted by any technique ; `aria-disabled` over `disabled` on submit; shadcn as the library that resolves own-vs-import rather than picking a side ; the localStorage scoping table.
- **Corrected by Andrew:** that a proportional page strip must scale *both* dimensions. The proposed "uniform height, variable width" rule would have rendered Legal and Letter identically, hiding the most common real anomaly. Also that the page numbers in the strip are load-bearing rather than decoration.

**Filling it out — 2026-08-15**

- **Andrew:** the done worklist, and per-issue notes. Both belong to the reviewer rather than to the review, which is the distinction the persistence scoping rests on.
- **Andrew:** scroll tracking, and the shape of it. The tension was that both behaviors are defensible — a list that follows the document keeps the finding beside the page it describes, and a list that stays put respects the fact that you scrolled it somewhere on purpose. His answer was that a tension neither side wins is the signal it belongs to the user. So it became a setting.
- **Andrew:** the Help button and its keystroke guide, and opening findings directly on the page bar.
- **Andrew:** the branding — the name, the mark, the wordmark set in Goldman.
- **Andrew found three bugs by using the build**, none of which any suite would have caught: the demo reset that did nothing visible until you reloaded, the address bar that kept a stale version after a reset, and the pointer cursor that Tailwind v4's preflight quietly removes from every button. All three are the kind of defect that only shows up when the person looking at the screen is the person who cares whether it is right.
- **Andrew debugged the iPad blank screen**, on his own hardware, which is the only place it reproduces. **Claude Code fixed it** — the `URL.parse` polyfill written to the spec's own contract, and the error boundary the app had been missing entirely — and wrote it up afterwards.
- **Claude Code:** the deployment, and a documentation pass that made the docs describe the build rather than the plan.
- **An adversarial review pass caught a regression neither of us did:** the scroll-tracking feature had broken the skip link, which is exactly the sort of thing that survives a manual check because nobody tabs into a page they have been clicking around in all day.
- **Both:** the development-approach writeup.

**v1.1.0 — the legibility release, 2026-08-16**

- **Andrew brought the complaint that started it**, from a reader outside the project who found the interface type too small. He also asked for the strip to be resizable and, when told the resize alone would not change the thumb size, took the arithmetic fix instead; asked for the strip to close entirely and return on a pull tab; overruled the size threshold on page images — *render them at any size*; asked for pinch-to-zoom, and for the desktop gesture to zoom the document rather than the app; and called the "gate" metaphor out of the source, the tests and the README.
- **Andrew's diagnosis was sharper than mine on the prose.** I had flagged a repeated antithesis construction as a stylistic tic. He identified what it was actually doing: inventing a weaker alternative in order to beat it. That reframing is what turned a word-frequency observation into a usable rule.
- **Claude Code proposed:** the scale floor that replaced the resize idea, expressed in rem so it follows the text-size setting with no preference plumbed into the component ; the finding that the contrast bug was worse in light mode than the dark mode it was reported against; the two-phase zoom, a transform during the gesture and a real re-render on release; and gating deployment on the test suites rather than connecting Vercel's own git integration.
- **Corrected by Andrew:** that the severity marks were invisible over the page images — found with the one-word question *"z-index?"*. Also that I had written a regret into a document that he did not have, and that a style contract written for my prose does not get applied to his.

---

## What came out of it: `/depurple`

Rewriting these documents produced a reusable thing, which was not the plan.

The docs started out in a voice I did not want — confident, dense, and quietly
selling. Working out *why* took longer than fixing it. The first diagnosis was a
word-frequency observation: one rhetorical construction appearing every hundred
words. That is true and not useful, because most instances of it are fine.

The useful diagnosis was what the construction was **doing**: inventing a weaker
alternative so the real thing could beat it. *Not just a bird — a bird that
ROARS.* Nobody had proposed the bird was ordinary. Once that was named, the same
shape turned up in five other disguises: metaphors standing in for mechanisms
(a submit rule called *the gate*, which had spread to 23 places), interfaces that
*lie* and *deserve* things, paragraphs ending on a zinger after the information
had finished, and clauses restating the clause before them.

The second half was less interesting to write and mattered more. Several of the
boldest sentences in these files were **false** — a test count that had drifted,
an absolute with a counterexample, two features the docs still said had been cut
after they shipped, and one sentence implying a screen-reader check that nobody
had run. Bold text is where an author puts the claims, which makes it exactly
where being wrong is most expensive.

Both passes are now a skill, [`.claude/skills/depurple/`](../.claude/skills/depurple/SKILL.md),
committed here because it was built against this repo and its examples are all
real ones from it. It reports before it changes anything, and it has one rule it
will not break: never soften a claim to make it true when the honest fix is to
do the work.
