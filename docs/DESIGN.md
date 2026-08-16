# Review Page — Design

**HomeVision Frontend Take-Home · started 2026-08-14**

This doc is written *before* the code and updated *as* the code. It is the record of what was decided, what was rejected, and why. Anything built that isn't explained here is a gap.

**Status:** built. Every decision below is made and shipped. Where the implementation departed from a decision, the decision log at the end records what changed and why — the body of this document is kept as written, so it reads as the reasoning that produced the build rather than a description of it.

**Stack:** Vite · React 19 · TypeScript · Tailwind 4 · shadcn/ui (Radix underneath).

---

> **Looking for how it works rather than why?** [`ARCHITECTURE.md`](ARCHITECTURE.md) has the
> layer map, the data flow, `focusedPage`'s single-writer rule, the viewer internals and the
> production seams. This document is the reasoning; that one is the map.

## 1. What this app is

**VERA — Uploaded New Doc Issue Review Tool.**

This is an App that lets a user review the issues detected by automation in a PDF they uploaded, and understand what must be fixed before the document can be submitted.

Fixing happens in the user's own system, and the corrected version is uploaded somewhere else. This app does neither. It is where the reviewing happens: reading what the automated check found, judging it, and saying so — which it will not let you do while a critical or major issue is outstanding.

---

## 2. Scope

### In

- Mock API → Review Page receives the mock JSON response.
- Render the PDF on screen, with page-level markup indicating where issues are.
- Sidebar issues list, grouped/marked by the three severities.
- Whole-document text search via native `CMD+F` / `Ctrl+F`.
- The page knows when only minor issues remain, and lets the user sign off on the review.
- The mock JSON carries a working URL to the local PDF so the document actually loads.
- Header: document title, version number, uploaded-at. Small user avatar/menu (the API gives us a user, so show one).
- A back link to the (out-of-scope) document list. Inert for now — it establishes that this is a detail view, not the whole product.
- **Works properly on iPhone and iPad**, in the right shape for each — not a squeezed desktop layout. Tested on real devices. See §6d.

### Out — because the brief puts it outside this ticket

Not our call. The assignment draws these lines itself.

- **The user fixing anything in the browser.** Fixes happen in the user's own system, by regenerating the document. The spec is explicit.
- **Any real backend.** Mock response only.
- **Actually submitting.** The submit endpoint doesn't exist yet; the brief says to skip the call. UI only.
- **Creating a new version / the upload flow.** That's the Upload Page — a teammate's ticket in the spec's own flow diagram.
- **A list view of all documents this user has to review.** VERA is the single-document view you reach *from* that list. The list is not in the spec's flow diagram — this is our inference about the surrounding product, not something the assignment stated.

### Out — considered, then cut as gold-plating

Wanted, and not built. Each satisfies **no acceptance criterion**, and each costs more than it first appears. Listed so the absence reads as a decision rather than an oversight.

- **Restoring scroll position across a page reload.** Useful for a 34-page document worked through over a long session. But a continuous-scroll viewer has no page geometry at mount, so the restore has to hang off the viewer's render signal and fire exactly once, or scrolling away snaps the user back every time. Worth having in a real product; not worth the build time here.
- **Rendered page thumbnails in the thumb strip.** 34 extra pdf.js renders producing images too small to read. The strip's job is showing where problems cluster, which colored rectangles do better and for a fraction of the work (D6).
- **Pinch-to-zoom the document.** The expected gesture on an iPad, and the full layout is a touch layout (§6d), so this is a real gap, named rather than hidden. Cut on cost, not on principle: doing it properly means re-rendering pages at a new scale, which reaches into the reserved page heights and the reading-line measurement that decides which page is in view. Both are load-bearing. Letting the browser zoom the whole page instead is a one-liner but breaks a fixed app shell. Deferred with its consequence stated: on a tablet, a page renders at the width we choose, and the user cannot magnify it.

### Where this page sits

The spec's flow diagram gives four pages. We own **one**, plus a stub.

**`/documents` is a stub, not the Documents Page.** That screen owns upload, filtering, pagination and assignment, and building it would be building someone else's ticket. What exists here is one live row, three inert placeholders and a reset control: the smallest surface that gives the Review Page somewhere to be opened *from* and returned *to*. Without it, submitting is a one-way trip and the most important interaction in the build can be exercised exactly once by whoever is evaluating it. That makes the list demo infrastructure rather than product, and it is labeled that way in the UI.

The pages we own, then:

```
Upload Page ──upload──> Processing Page ──completes, version+1──> [ REVIEW PAGE ] ──submit──> Submitted Page
     ^                                                                   │
     └───────────────────── "fix issues and re-upload" ──────────────────┘
```

Everything upstream and downstream belongs to teammates. The loop back to Upload is the product's real cycle, and it exits *our* page.

---

## 3. Acceptance criteria → what satisfies them

| # | Criterion | Satisfied by |
|---|---|---|
| 1 | See the document, search text across the entire PDF with CMD+F | A text layer for **every** page, all in the DOM at once, so the platform's own find can reach any of them. Canvases render only near the viewport — see §6d for why that separation matters. |
| 2 | Cannot submit until all critical + major are resolved; minor may be ignored | `canSubmit(review)` derived from the review data alone. It takes a whole `Review`, so a filtered list, a hidden severity or a ticked checkbox cannot reach it: the separation is a type error, not a rule to remember. Blocked, the page doesn't offer submit at all; it offers *Upload new version*, which is the action that exists. |
| 3 | The page clearly communicates what's blocking submission | A verdict above the list, outside the scroller so it cannot scroll away, tied to the specific blockers rather than a generic disabled button, and it reads the opposite just as well once nothing is blocking. |

---

## 4. What the data tells us

Read from the real `review_mock.json` — 34 pages, 25 issues (4 critical, 8 major, 13 minor), status `on_review`, version `2`.

- **The JSON is metadata + defect list. It contains no document text at all.** Pages carry only `page_num`, `height`, `width`. That rules out reconstructing the document from data — the PDF must be rendered, not rebuilt.
- **Page dimensions (612×792, US Letter in points)** tell the browser how to size and lay out each page.
- **An issue carries `title`, `description`, `severity`, `page`.** `page` is an integer. There are **no coordinates, no bounding boxes, no text offsets.** From the data alone we can point at a page; we cannot point at a line.
- **`version: 2`** means the user has already been through this loop once. The API returns only the current version, so we have no history to show.
- **No `resolved` field on an issue** — by design. Resolution happens outside the app, proven by a new version, never asserted in the UI.
- **With this mock, submit is BLOCKED** (12 blockers). We need a second way to demo the submittable state.

---

## 5. Jane's flow

> 📐 **Sketched before any code.** ([live source](https://docs.google.com/drawings/d/1P1lXCZPaLolqYNq0aOk2XJNdWGl8UmqJt4W83rlUnVE/edit?usp=sharing) · [full size](wireframes/VERA_wireframes.svg) · [all sketches](wireframes/))

![The Review Page, sketched before implementation](wireframes/VERA_wireframes.svg)

The six layout shapes, drawn to relative scale so they can be compared rather than described — iPhone and iPad-portrait in the compact shape, iPad-landscape and desktop in the full one, with the 1024px breakpoint marked across the middle:

![The two layout shapes, at six sizes](wireframes/VERA_layouts.svg)

Jane opens her queue at `/documents` and picks *Annual Compliance Report - Northeast Region*.

1. **The list is where she starts and where she returns.** It is explicitly not the Documents Page from the spec's flow — that screen owns upload, filtering and assignment, and belongs to someone else's ticket. This is the smallest surface that gives the Review Page somewhere to be opened from, which turns submitting from a one-way trip into something she can do twice.
2. **The review has three regions:** a header, an issues list on the left, and the PDF viewer on the right, separated by a **draggable resizer**. Issues left follows the PDF-tool convention (Preview, Chrome, Acrobat) where the left rail is a way *into* the document, which is what a clickable issue list is. The document takes the clear majority of the width by default, roughly one-third / two-thirds: it is 612pt of dense evidence, and squeezing it defeats the point of showing it.
3. **The verdict sits above the list**, separate from the worklist, and outside the scroller so it cannot scroll away. It leads with what is blocking, *"12 issues must be fixed"*, and reads the opposite just as well once nothing is blocking: *Ready to submit, 6 minor issues can be accepted.*
4. **The severity breakdown under it is also the filter.** Clicking *13 Minor* drops those rows from the list and drops the lozenge to half opacity, but the number never changes, so the summary keeps telling the truth about the document while the list shows a subset of it. That is what makes it safe for one control to both report and filter.
5. **Issues are in page order by default**, with a sort control offering severity instead. Page order is how the document is worked through when she goes to fix things; severity answers *what is worst*, which the verdict has already partly answered.
6. **Each issue shows its description, in full.** The title names the problem; only the description says the cover page reads 03/10/2025 while page 3 reads 01/15/2024. It is not truncated, because these run two or three lines and the decisive clause is usually last.
7. **Each row carries a Done checkbox**, a private note that *"I have handled this."* Saved per review **and version**. A Done lozenge appears once anything is ticked, hiding those rows on the same rule as the severity filters, and severity sort sinks them to the bottom. **None of it affects whether the review can be submitted.**
8. **The list is clickable, and the link runs both ways.** Clicking an issue takes the viewer to its page; landing on a page tints the issues that live there. One value, three readers.
9. **The status bar above the viewer is always current:** `PAGE 13`, the issues on it, and a tap to expand them in full with severity named as a word, not only a color.
10. **She works through the list**, ticking things off, then leaves to fix them in her own system.
11. **While anything is blocking, the only action offered is *Upload new version*.** Not a grayed-out submit: a button labeled with something it refuses to perform is a lie told on every render, and disabling it only makes the lie quieter. It opens an inert dialog explaining that uploading belongs to another screen, so the blocked state shows where the loop goes instead of looking like a dead end.
12. **That action stays available once nothing is blocking**, alongside submit and outlined rather than filled, because submitting is the goal and this is the escape hatch. Jane may decide to fix the six minors after all, and withdrawing the way to do that the moment the document passes would make the clean state feel like a trap. It disappears only once the review is submitted, when there is nothing left to re-upload for. On a phone it collapses to an icon so the bottom bar can still carry the verdict and the primary action at 320px.
13. **When nothing is blocking** and she submits, a confirmation names exactly what she is choosing to accept — *"6 minor issues will be accepted as-is"* — and says plainly that it cannot be undone. The product permits it; she should say so once, deliberately.
14. **Submitting is a sequence, not an instant.** The dialog becomes the progress surface: *Submitting…*, then *Submitted*, then back to the queue with the finished row settling in indigo. A real submission is a network round trip, and collapsing the one irreversible action in the app into nothing makes it feel like it never happened.
15. **A review that is already submitted renders as submitted**, on a cold load, with no click involved, because `status: 'submitted'` is a value the API can return. The verdict becomes the outcome, the submit control is gone rather than disabled, and the remaining minors are shown as *accepted as-is* rather than as outstanding work.

**There is no un-submit.** The status enum has no reopened state and the flow diagram's submit arrow is one-way. Submission is the moment the document leaves the user and goes to the lender, so it isn't ours to reverse. A mistake after submission is corrected the same way as any other: new document, new upload, new review.

**And the demo must not be overfitted to the mock we were given.** Hand the app a different JSON with no critical or major issues and it must declare the document good. That answer is derived from the data, not a hardcoded state.

---

## 6. Design decisions

All settled. Each records what was chosen, what was rejected, and why. `D5` sits last because it is the one stretch goal — it satisfies no acceptance criterion and is built only if time remains.

### D1 — Single page at a time, or continuous scroll? — **DECIDED: continuous scroll (A)**

Andrew's flow describes a viewer that "shows a single page at a time," maybe styled like a stack of documents. That collides head-on with acceptance criterion #1.

**Native `CMD+F` only searches text that is in the DOM.** If one page is mounted, `CMD+F` searches one page. The criterion says *"search for text across the entire PDF."*

Options:

**A. Continuous scroll — all 34 pages rendered, every text layer in the DOM.** Native find works across the whole document with zero custom code. Page navigation becomes scroll-to-page. Everything else in Jane's flow still works: clicking an issue scrolls to its page, forward/back scroll by one page, per-page corner badges sit on each page. This is also what Preview, Acrobat, and Drive do — the "stack of documents" look *is* continuous scroll.
Cost: 34 pages of canvas + text in the DOM. Fine at this size. Virtualization is the production answer, and naming that is worth a bonus point.

**B. Single page mounted, others hidden.** Doesn't work. Text hidden with `display:none` or `visibility:hidden` is not found by browser find at all; text that is merely off-screen *is* found — which means find would jump to matches Jane cannot see. Broken either way.

**C. Single page + intercept `CMD+F` with a custom search UI** over pdf.js's extracted text for all pages. Keeps the single-page look, and gives better search UX than the browser (result counts, next/prev, cross-page jumps). But it hijacks a browser shortcut, and a reviewer reading the criterion literally may score it as not meeting the ask.

**Decided: A.** It satisfies the criterion by construction rather than by cleverness, and it costs the least code. The acceptance criterion dictated the architecture, not the other way round.

**Checked before committing to it, not assumed.** This is the only genuinely unknown part of the build, so before writing any viewer code I looked at react-pdf's live demo myself. Native `CMD+F` finds and highlights text in the rendered document, and the rendering is faithful: real type, tables and vector charts, not a degraded approximation. A bad answer here would have invalidated the viewer architecture.

**Licensing was part of the choice.** `react-pdf` is MIT and sits on Mozilla's `pdfjs-dist`, which is Apache-2.0: both permissive, both free, and both durably so given pdf.js is maintained by Mozilla rather than by a company that needs to monetize it. Several of the alternatives are commercial, and `@react-pdf-viewer` doesn't publish an SPDX identifier at all, only a link to a license page.

That matters more here than on a typical project. This is a document-processing product in mortgage and appraisal, a regulated industry where a viewer sits in the path of every loan file. Picking a dependency whose terms could change, or that needs a per-seat negotiation to scale, is a procurement and audit problem long before it's an engineering one.

One known upstream issue to watch during implementation ([wojtekmaj/react-pdf#1848](https://github.com/wojtekmaj/react-pdf/issues/1848)): when every page renders inside a single `<Document>`, pages after the first can pick up a scaled `scaleX` on the text layer in some documents, which misaligns the invisible text from the visible glyphs. The symptom is find highlighting the *wrong place* rather than failing, so it is worth checking past page 20.

### Three things the viewer harness taught us

A standalone harness, [`src/demo/ReactPdfDemo.tsx`](../src/demo/ReactPdfDemo.tsx), **kept in the repo rather than deleted**, proved the four behaviors the viewer depends on: all pages mounted with text layers, whole-document find, jump-to-page, and knowing which page is in view. It surfaced three problems that would each have been much more expensive to meet later.

**1. Every overlay must clear react-pdf's stacking, or it stops accepting clicks.**

react-pdf ships pdf.js's stylesheet, which sets:

```css
.textLayer       { position: absolute; inset: 0; z-index: 2 }
.annotationLayer { z-index: 3 }
```

The text layer is the invisible copy of the page's text laid over the canvas, which is what makes `CMD+F` work at all. At an equal `z-index` the pages win on DOM order, so a toolbar at `z-index: 2` gets covered by the text layer of every page you have scrolled past. It still *looks* correct, because the elements are transparent. But `elementFromPoint` over a button returns a `<span>` of invisible PDF text, so hover stops showing a pointer and clicks land on the document instead.

The symptom is specific and a long way from the cause: **controls work until the first scroll, then go dead.**

This affects three things in the real build, not just the harness: the **status bar** sits above the viewer, the **thumb strip** beside it, and the **confirmation dialog** over everything. Every one of them needs to clear `z-index: 3`, and the reason belongs in a comment where the value is set, because `zIndex: 10` on its own looks arbitrary.

**2. Page heights must be reserved before the canvases paint, and the API's dimensions are what makes that possible.**

All 34 pages mount at once, but each renders asynchronously — until a canvas paints, its wrapper is a few pixels tall. Jumping to page 30 therefore scrolls to where page 30 is *at that instant*, near the top, and then the pages below finish rendering, the document grows, and the user ends up nowhere near what they asked for.

Setting each wrapper's height from the API's per-page `height`/`width` fixes it: the document is its full length from the first paint, so scroll targets are stable.

This reframes those fields. They look like data for drawing the thumb strip; they are **what makes scrolling correct**. A viewer that ignores them can't reliably navigate to a page, which is most of what this page does.

**3. "Which page am I on" is a measurement, not an observation.**

Not an `IntersectionObserver`. Its callback fires only when a threshold is *crossed*, so pages far from the viewport keep reporting whatever ratio they last had, and a page taller than the viewport can never reach the higher thresholds at all, which freezes the answer after the first scroll.

What works is measuring against a *reading line* just below the toolbar: the current page is the last one whose top has scrolled past it. Deterministic, correct for pages taller than the viewport, and cheap, being a rAF-throttled scroll handler that exits the loop early since pages are in document order.

**Scrolling is smooth, but honors `prefers-reduced-motion`.** Moving the page tells the user *where* they went in a way a hard jump doesn't; for people who've asked for reduced motion, a long animated scroll is nauseating rather than informative.

**The harness is kept, not deleted.** It is the cheapest way to isolate a viewer problem from the rest of the app: if find or scrolling misbehaves later, the question "is it react-pdf or is it us?" is one page load away.

### D1b — Which library renders it — **DECIDED: `react-pdf`, wrapping Mozilla's `pdf.js`**

Rendering a PDF in a browser is not something to hand-roll. PDF is a thirty-year-old spec — fonts, encodings, page geometry, malformed files in the wild — and getting it right is a specialist's job. The only serious open engine is **Mozilla's `pdf.js`**: the exact renderer built into Firefox, so it is exercised by a browser's worth of users every day rather than by a library's worth. It is Apache-2.0, first committed in **2011**, still actively maintained by Mozilla (last release mid-2026), and sits at roughly **53k GitHub stars**. Its npm engine package `pdfjs-dist` pulls about **23 million downloads a week**. As dependencies go this is near the safe end of the spectrum: an institutional owner, a fifteen-year track record, an enormous install base, and a permissive license. I am not betting the build on a solo weekend project.

`pdf.js` is the engine — a canvas painter and a text-layer builder — but it ships no React. Two ways to consume it:

- **Raw `pdfjs-dist`** — drive the engine directly and own the canvas, the text layer, and the worker lifecycle myself. Most control, but it means re-implementing a React binding that already exists, and the text-layer wiring — the part `CMD+F` depends on — is exactly the fiddly piece I'd least want to own from scratch.
- **`react-pdf`** *(chosen)* — a thin, long-lived React wrapper over that same `pdf.js`. Declarative `<Document>` / `<Page>` components, the text layer on by default, worker configured through Vite's `?url` import. It has been on npm since **2014**, is on its **v10** major line, and pulls roughly **5 million downloads a week**. Crucially it adds no rendering of its own — the pixels are still Mozilla's — so choosing the wrapper costs nothing in engine quality and saves me the integration code.

**Decided: `react-pdf`.** Mozilla's renderer for the hard part, a maintained React surface for the binding: depend on the heavy-hitter for what's hard, own only the thin glue. The one thing to configure carefully is the worker under Vite; the wrapper handles the rest. Rejected raw `pdfjs-dist` as needless re-invention of a solved binding, and the commercial SDKs (Nutrient/PSPDFKit, Apryse) as overkill, since they sell annotation, form-filling and enterprise licensing that a single read-only review screen does not need.

*(Figures as of Aug 2026: `pdf.js` ≈53.5k stars, `pdfjs-dist` ≈23M weekly npm downloads; `react-pdf` ≈5M weekly downloads, on npm since 2014, current major v10.)*

### D2 — How precisely do we point at an issue in the document? — **DECIDED: a status bar above the viewer**

**We do not highlight inside the page.** A **status bar sits above the PDF viewer**, showing the page currently in focus and the issues on it:

```
[ PAGE 13 ]   ⚠ Depreciation Table Rounding Error    ● Formatting: Inconsistent Currency Notation
```

- The **page number** of whatever page is currently focused, derived from scroll position.
- One **label per issue on that page**, carrying the issue's **real title** verbatim from the data.
- **Color and an icon** for severity — both, never color alone.
- Issues are numbered in **page order, permanently**, so a label's number never disagrees with its list row no matter how the list is sorted.

Clicking a label selects that issue in the list. That gives the page → issue direction of the two-way link for free.

On a page with no issues the bar still shows the page number and says so — *"no issues on this page"* is useful information in a document she is working through, not an empty state.

**Why a bar rather than markers in each page's margin:** it lives in one fixed place instead of scrolling past, it doubles as the page indicator for the forward/back controls, and it is far less code than annotating 34 pages. The trade is that you can no longer see at a glance where problems cluster across the document, though the issues list already carries page numbers.

**Why not in-page highlighting.** Three approaches were considered and rejected:

1. **LLM locates the region at runtime.** Non-deterministic in a reviewer's hands — one bad highlight and they can't tell a model error from a bug — and it needs an API key, so the take-home wouldn't run out of the box.
2. **Text-match on literals in the description** (`$308,120`, `Map #17167C0215E`, `"Not to Scale"`). Deterministic and cheap, but it only works for about half the issues, and the user has no way to tell a correct miss from a bug. Shipping a feature that is silently wrong some of the time is worse than not shipping it.
3. **Deriving a category** (`wrong number`, `missing content`) to label markers. Same guessing problem as text-matching. Unnecessary anyway — every issue already ships with a human-written title more specific than any category we'd invent.

**The deeper reason.** We have `page` and nothing else — no coordinates, no bounding boxes, no text offsets. Anything drawn *inside* a page is a claim about position that the data does not support. Margin markers claim only *"these issues concern this page,"* which is exactly what the data does say.

And a whole class of issue can never be highlighted regardless of technique: **"Missing Summary of Findings" is an absence.** There is nothing on page 3 to point at. Roughly a quarter of these issues are missing-thing findings, so any design resting on in-page highlighting is broken for them by construction.

**The production answer is bounding boxes from the backend.** The AI that found "page 18 shows $308,120" knew where on page 18 it was looking. Location is the API's to return, not the client's to reverse-engineer.

### D3 — The checkbox / personal todo list — **DECIDED**

Users check issues off as they work through them. Private notes, persisted to `localStorage`, minimal visual weight.

Good UX for 25 items worked through in another application over a long session. It is **scratch state, not a resolution claim.** Hard rule:

> **`canSubmit` never reads a checkbox.** It is derived from the review data alone: are there any critical or major issues in this review? Resolution is proven by a new version. If a checkbox could unlock submit, a user could submit a defective mortgage document by lying to a checkbox.

The checkboxes do feed one other thing — the simulated reprocessor in D5 — but they do it by producing a *new review*, never by short-circuiting `canSubmit`.

Open sub-questions:
- Does it survive a reload? (`localStorage`, keyed by review id + version?)
- What happens when version increments and the issue list changes — do stale checks leak into the new review? Do issue `id`s even survive a re-parse? **Unknown — we don't know if `issue_1` in v2 is the same defect as `issue_1` in v3.**
- Should it be labeled to make its meaning unmistakable (e.g. "my notes" vs anything resembling "resolved")?

### D4 — How to demo the submittable state — **DECIDED**

The app must not be overfitted to the supplied mock. Hand it a JSON with no critical or major issues and it declares the document good. It is derived from the review data, never a hardcoded state.

Implementation open: a second mock file plus a way to switch to it (query param, or a small dev control). Whichever we pick gets called out as a demo affordance, not a product feature.

### D6 — Document thumb strip (minimap) — **DECIDED: cheap version**

A vertical strip down the edge of the viewer, one segment per page, mapping onto scroll position the way a scrollbar does:

- Each segment is a **page-shaped rectangle**, carrying its page number when the segment is tall enough to hold one legibly. Whether it is tall enough is not a design choice but an outcome of the sizing rule below: the scale is computed from the column, and the number is drawn only above a measured 16px. An unlabeled block beats a clipped digit.
- Inside it, **one colored bar per issue on that page**, in that issue's severity color — so page 14 visibly has three marks and page 4 has none. Richer than a single worst-severity fill: you see both severity and volume at a glance.
- Clean pages are empty rectangles.
- The **current viewport position** is marked.
- Aspect ratio comes from the `height`/`width` the API already gives us per page — otherwise unused data.

**It is one control you scrub, not 34 you click.** This is what the name is for, and it is the decision that lets the strip exist on touch at all.

Press and drag anywhere on the strip and the document follows continuously; lift to land. A tap jumps to the page under your finger. Because it's a single control rather than 34 discrete targets, the 44px minimum applies once — 44px wide, as tall as the panel — instead of demanding 1,496px of column for 34 legal-size targets. The same reasoning as the iOS index scrubber or a Kindle page slider.

That forces one addition and earns one for free:

- **A readout follows the thumb** — `PAGE 17 · 2 issues` — because a finger on the strip covers the thing it is pointing at. On a pointer device the same readout appears on hover, where it reads as a tooltip rather than a workaround.
- **It is a slider, so it gets slider semantics.** `role="slider"` with `aria-valuenow` on the page number, Arrow keys to step, Home/End to jump — keyboard navigation of the whole document for free, from a control built for a thumb.

Driven by Pointer Events, not mouse events, with `touch-action: none` so the drag doesn't scroll the page underneath it.

**Not rendered thumbnails.** Plain rectangles, no pdf.js involved.

**Sizing rule: one scale factor, applied to every page's real dimensions.**

Each segment is that page's actual `width` × `height` from the API, multiplied by a single shared scale factor. Both dimensions scale. Nothing is normalized.

This is the only rule that catches the cases that matter:

- **Legal (612×1008) next to Letter (612×792)** — same width, different height. A taller segment, immediately visible. Any rule that fixed the height would render these identically and hide the most common real anomaly.
- **A landscape page** — wider and shorter, breaks the column.
- **An oversized exhibit** — bigger in both directions.

**The factor fits both dimensions, and the strip never scrolls.** It is `min(availableHeight / totalPageHeight, availableWidth / widestPage)`, computed once from a measured column, then multiplied into every page's own width and height.

Three formulations of this rule fail, and all three are invisible against a 34-page document of identical Letter pages:

- **A per-segment `min-height` floor**, meant to keep a two-digit page number legible, silently gives any clamped segment *its own* scale factor. A short page then renders 31% off-scale and visibly **wider** than a full page it is narrower than. A floor on the segment is not a floor on the scale.
- **Fitting height only** ignores the other dimension, so a four-page document computes segments ~180px wide inside a 44px strip.
- **Percentage heights plus a flex `gap`** sum to exactly 100% and then add the gaps on top, so the strip overflows its column by `(n−1) × gap` on *every* viewport, putting the last pages below the fold, unreachable by a control you drag rather than scroll.

The last one is why there is no floor: the strip is a scrub surface with `touch-action: none`, so a scroll container inside it cannot be scrolled by the finger it exists for. A strip that always fits has no such conflict.

So the page number is a *consequence* of the scale rather than a constraint on it. At 34 Letter pages in a typical column the segment comes out around 18x23px and the number fits; on a longer document it does not, and the number simply stops being drawn rather than forcing a floor that would break the one-scale-factor rule. The readout that follows the thumb states the page either way, which is what makes that acceptable.

The arithmetic is done in JavaScript against a measured column rather than expressed in CSS, because every CSS formulation of "one scale factor" stops being one the moment a constraint binds.

A useful side effect: because every segment is proportional, the strip becomes a true miniature of the scrolled document, so a segment's position in the strip corresponds to that page's position in the scroll.

Every page in this sample is 612×792, so it reads as a uniform column here. That is the correct output *for this document*, not a hardcoded assumption — feed it a mixed-format file and the anomaly shows up unprompted.

This recovers the whole-document view that the status bar gave up: *"pages 12 through 18 are a mess, the back half is clean."*

**Explicitly not thumbnails.** Rendering 34 more pdf.js canvases on top of the 34 already mounted is real cost, and at that size the images are unreadable: you cannot tell page 22 from page 23 in a 60px thumbnail. What is wanted from this strip is the *pattern of problems*, not the pictures.

### D5 — Simulated re-upload — **The reprocessor was not built. The loop is shown two other ways.**

> **What shipped instead**, and it is two separate things:
>
> - **An inert *Upload new version* dialog** ([`UploadDialog.tsx`](../src/components/UploadDialog.tsx)),
>   offered whenever something is still blocking. It names the document, says a new version replaces this
>   one and is checked from scratch, and stops at the boundary with the drop zone disabled. It
>   exists so a blocked state shows where the loop goes rather than looking like a dead end.
> - **Two real versions of the document** in the catalog, v2 and v3, switched from the header.
>
> What was *not* built is the mock reprocessor described below: the demo control that would
> take the current review, drop the issues ticked done, bump the version and hand back a new
> review object. Two real fixtures do the same job more honestly — v3 is a payload the backend
> could have returned, whereas a client-side reprocessor mutating a review in the browser is
> the one thing D3 spends its length arguing must never happen. The reasoning below is kept
> because it is what produced that conclusion.

Not essential to the acceptance criteria. Built only after everything else is done, because it exists to *show* the loop rather than to satisfy a requirement.

A demo-only control simulates the round trip that really happens on the Upload Page:

1. Jane checks off the blockers she has fixed in her own system.
2. She clicks the demo's "simulate re-upload."
3. A mock reprocessor takes the current review, drops the issues she marked done, increments `version`, and returns a **new review object** — exactly the shape the real backend would return.
4. `canSubmit` re-derives from that new review and is now `true`, because that review genuinely contains no critical or major issues.

**The checkbox never unlocks submission.** It tells the simulator what was fixed upstream. Submission becomes possible because a new version arrived clean — which is the real product rule, faithfully modeled.

This must be visually and structurally distinct from the product UI (a labeled demo control, and simulation code that lives apart from product logic) so nobody reads it as the app letting users self-certify. Framed correctly it's a strength: *"I mocked the backend's reprocessing step so you can walk the whole loop, blocked to fixed to clean to submitted, from a single static mock."*

---

## 6b. Persisted state

Five things end up in `localStorage`, and they do **not** share a lifetime. Getting the scoping wrong is a real bug rather than a tidiness question: a stale checkmark leaking into a new version would tell the user a defect was handled when it wasn't.

| What | Key | Scope | Why that scope |
|---|---|---|---|
| Theme preference | `vera.theme` | **Device** | Which theme suits you depends on the screen you are looking at and the light you are sitting in, not on who you are. Signing in on a different machine should not drag a laptop's dark mode onto a bright office monitor. |
| Done marks | `vera.done.<id>.v<n>` | **This review, this version** | When v3 arrives with a fresh issue list, v2's ticks are meaningless, and a stale one would claim a defect was handled that the new review never raised. |
| Submission | `vera.submitted.<id>.v<n>` | **This review, this version** | `status: 'submitted'` is a value the API can return, so the page has to render a submitted review on a cold load with no click involved. Persisting it means the demo exercises the real path rather than a boolean in component state. |
| Notes | `vera.notes.<id>` | **This document, every version** | The one thing here that deliberately outlives a version. A tick means "I have handled this" and dies with the findings it was made against; a note is something the reviewer *learned* — "the appraiser confirmed the measurement by phone" — and is still true when v4 arrives. That difference is the whole reason these are two keys and not one. It rests on a surviving finding keeping its issue id across versions, which a unit test enforces because nothing else would notice it breaking. |
| Scroll tracking | `vera.scrollTracking` | **Device** | Whether the issues list follows the document is a preference about how the tool behaves, not a fact about a review, so it belongs to the machine in the same way the theme does. Stored as a word rather than a boolean, so "never asked" and "explicitly off" cannot be confused — absent means on. |

**Two things do *not* persist:**

- **Split position.** The splitter is dragged rarely and the default is good, so persistence would be code and a storage key earning nothing.
- **Sort order and severity filters.** These are a *view* of one document, not a way of working. Carrying "minors hidden" into the next review would hide thirteen issues someone never chose to hide, on a compliance tool, which is a bad failure direction. They reset.

### The reviewer's own layer — and the API it implies

Done marks and notes are not review data. They belong to a *person working on* a review, and
in production they are the same table:

```
user_issue_meta
  user_id      who
  document_id  which document
  issue_id     which finding
  version      which version raised it        (nullable — see below)
  done         boolean
  note         text
  updated_at
```

**The two fields have different lifetimes.**

- **Done is scoped to the version.** "I have handled this" stops being true the moment a new
  version arrives with a fresh set of findings. A tick carried forward would state that a
  defect was dealt with when the latest review never raised it, which is the one direction of
  error a compliance tool must not make.
- **A note is scoped to the document.** "This is acceptable because the appraiser confirmed
  the measurement by phone" does not expire when v4 is uploaded. If the same finding comes
  back, that reasoning should be waiting rather than retyped, and on a compliance file it is
  what gets defended months later.

So the same table, different keys: `done` by `(user, document, version, issue)`, `note` by
`(user, document, issue)`.

Locally these are two `localStorage` namespaces with those exact shapes, which means the swap
to a real endpoint is a change of transport rather than of model.

**Why this is a separate API and not part of the review payload:** the review is what the
system found; this is what a person thinks about it. They have different owners, different
write permissions and different audit requirements, and the separation is what keeps
`canSubmit` unable to see any of it.

**Open question for the backend:** do issue `id`s survive a re-parse? If `issue_1` in v2 and `issue_1` in v3 are unrelated defects, version-scoping is doing real work and the done marks are correct. If ids are stable across versions, there is an argument for carrying ticks forward — but only if the backend can say so, and nothing in the spec does.

---

## 6d. Mobile-first

**Mobile-first here means the constrained case was designed first, not that the desktop layout survives being squeezed.** This page will be opened on an iPhone and an iPad, and the split view that makes sense at 1440px is not a small version of what works at 390px; it is a different shape.

Practically that means base styles target the phone and breakpoints *add* complexity upward, which is also how Tailwind's `min-width` breakpoints work by default. The split view is an enhancement at `lg`, not a default being patched.

### The mobile constraint produced a better desktop architecture

Taking the phone seriously **broke an assumption already accepted on desktop.**

Acceptance criterion #1 forces every page to be mounted so native find can reach it (D1). On a phone that is dangerous: at devicePixelRatio 2, one full-width page canvas is roughly 10 MB, so 34 of them approaches 350 MB of canvas memory. iOS Safari discards tabs for less, and a viewer that reloads itself mid-review is worthless.

The resolution is a distinction the desktop design never had to draw: **the text layer is what find needs, and the canvas is what costs memory.** They're separable.

- **Every page's text layer is mounted whenever the document is on screen.** It's DOM spans — cheap. Whole-document `CMD+F` keeps working exactly as the criterion requires.

  **The qualification is stated rather than glossed.** In the compact layout the two views are exclusive, and the one you are not looking at is `display: none`, which browser find cannot reach into. So on a phone, find searches the whole document *when you are on the Document tab*, and finds nothing while you are on the Issues tab.

  That is a real limit on acceptance criterion #1, chosen over the alternative. Keeping the document mounted and merely moved off-screen would restore find in both tabs, but the match would then be highlighted somewhere the user cannot see, in a layout whose premise is one thing at a time, and it would hold all thirty-four text layers in the DOM permanently on the device where memory is scarce, which is the pressure this architecture exists to relieve. Find while looking at the document is the only moment anyone invokes it. **In the full layout the question doesn't arise**: both panels are always mounted, so find always covers the whole document.
- **Canvases render only for pages near the viewport**, in a window that widens on desktop and narrows on a phone. react-pdf's per-`<Page>` `renderMode` makes a page text-only until it comes near.

One viewer, one architecture, a single tuning constant that differs by device, rather than two code paths that drift. And it's strictly better on desktop too: mounting 34 canvases was never a good idea, it was just survivable.

That is the mobile-first argument in its honest form. Not *"it also works on phones"*: designing for the phone found a real defect in the desktop design.

### Layout by form factor — **two shapes, and the boundary is 1024px**

There are exactly two layouts. Not three.

| Shape | Applies | What it is |
|---|---|---|
| **Compact** (`< lg`) | Every phone, **every iPad in portrait up to 1024**, every Stage Manager and Split View window, and a narrow desktop browser | One thing at a time behind a segmented control — **Issues / Document**. Verdict and submit merge into one bottom bar. No thumb strip, no resizer. |
| **Full** (`≥ lg`, 1024px) | Every iPad in landscape, the 13" iPad **in portrait**, and every desktop | The sketch: issues panel and viewer side by side with a draggable resizer, thumb strip down the viewer edge, full metadata in the header. |

**Why 1024 rather than 768.** The full shape carries two controls the compact shape does without, the resizer and the thumb strip, and both need room to be operated. At 768 an issues panel wide enough to read leaves a document column too narrow to. The rule is about *the window*, not the device, which is what makes the Stage Manager case correct without special-casing it.

**The consequence, accepted:** an 820pt iPad in portrait shows one panel where two would nearly fit. A 520pt document column is a bad way to read a document that wants the width.

### Two shapes, both of them touch

The full shape is not "the desktop layout." **iPad Air 13" and iPad Pro 13" are 1024 CSS px wide in portrait**, so the full shape appears on a touch screen held vertically, before anyone rotates anything. Landscape iPads are 1133–1366 and land there too.

So the full shape is a touch layout that also has a pointer, and every control in it is built to that standard:

- **The thumb strip is one scrub control, not 34 targets** (D6). This is the whole reason it survives on touch.
- **The resizer** renders as a hairline with a ~44px padded grab zone, driven by Pointer Events with `touch-action: none`, and is `role="separator"` with arrow-key support.
- **Nothing essential is behind `:hover`.** The status bar's issue descriptions are tap-to-expand at every size; hover is layered on top via `@media (hover: hover)` as an enhancement only.
- **Both panels set `overscroll-behavior: contain`**, or scrolling the issues list to its end rubber-bands the whole app on iOS.

The one gesture we do not support is **pinch-to-zoom** — cut on cost, with the reasoning and the consequence in §2.

A useful side effect of drawing the line at 1024: **rotating an iPad switches between the two designs.** That is the clearest possible demonstration that the full shape is a design in its own right and not the compact one stretched.

The **verdict summary always stays visible**, in both shapes. It's the answer to acceptance criterion #3, and it is the one thing that must never be a tab away.

### The compact layout

Drawn at phone width because that is where it is tightest, but this is the layout every iPad in portrait gets too — the same shape with more room in it.

```
   Issues tab                      Document tab
┌──────────────────────────┐   ┌──────────────────────────┐
│ ‹ Docs  Annual Complia… ⋯│   │ ‹ Docs  Annual Complia… ⋯│  nav bar
├──────────────────────────┤   ├──────────────────────────┤
│  [ Issues ] [ Document ] │   │  [ Issues ] [ Document ] │  segmented
├──────────────────────────┤   ├──────────────────────────┤
│ ☐ ⛔ 1 Effective Date M… │   │ PAGE 13 · 2 issues     ▾ │  status bar
│     The effective date…  │   ├──────────────────────────┤
│ ──────────────────────── │   │                          │
│ ☐ ⚠ 2 Missing Flood Zo… │   │       [ pdf page ]       │
│     FEMA flood zone de…  │   │                          │
│ ──────────────────────── │   │                          │
│ ☐ ● 3 Low Resolution P…  │   │                          │
├──────────────────────────┤   ├──────────────────────────┤
│ 12 must be fixed         │   │ 12 must be fixed [Submit]│  verdict + action
│ [    Submit review    ]  │   │                          │
└──────────────────────────┘   └──────────────────────────┘
        ↑ safe-area inset               ↑ safe-area inset
```

Five decisions are baked into that:

**The verdict and the submit button merge into one bottom bar.** A 390-point-wide screen can't afford separate chrome for each, and the merge is also *better than the desktop arrangement*. The blocking count sits directly against the button it is blocking, which is the plainest statement of acceptance criterion #3, and the bottom of the screen is both thumb reach and where iOS puts primary actions.

**The nav bar collapses to a back chevron, a truncated title and an overflow.** Version, uploaded-at and assigned user move behind the `⋯`, being reference data you consult rather than act on, so they lose the fight for vertical space.

**Tapping an issue switches to the Document tab at that page.** The same intent as the desktop click, expressed as navigation instead of as a scroll in an adjacent panel. Returning is one tap.

**The thumb strip is dropped here, not miniaturized.** Not for want of touch targets, since as a scrub control it works fine under a thumb (D6). It is dropped because it costs *width*, and it is the third of three redundant routes to a page: the list and the status bar both survive without it. A cramped horizontal version would be worse than its absence.

**A segmented control, not a bottom tab bar.** Two views is not a tab bar's job, and the bottom edge is already carrying the verdict and the submit button.

### iOS specifics that actually bite

- **`100dvh`, never `100vh`.** iOS Safari's `vh` ignores the browser chrome, so a full-height layout gets clipped and the submit button ends up under the toolbar.
- **Safe areas.** `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, or the home indicator sits over the controls at the bottom of the screen.
- **Nothing may depend on hover.** The status-bar labels reveal an issue's description on hover — on touch that has to be tap-to-expand. Any hover-only affordance is an unreachable feature on half our target devices.
- **Touch targets are 44px minimum**, and the thumb strip looks like it fails this, since 34 segments at 44px would need 1,496px of column. It doesn't fail, because it is a **single scrub control rather than 34 buttons** (D6): one target, 44px wide, as tall as the panel. The rule that binds is on the issue rows, which take the full row as their target with the checkbox getting its own.
- **Momentum scrolling and a rAF scroll handler.** The reading-line measurement runs on scroll; on iOS that fires during momentum and must stay cheap. It already exits its loop early and is rAF-throttled.
- **`CMD+F` doesn't exist on a phone, but find does.** iOS Safari reaches it two ways: **Share sheet → Find on Page**, and by typing in the address bar and choosing **"On This Page — Find …"** at the bottom of the suggestions. Android Chrome puts it in the ⋮ menu as **Find in page**. All of them search rendered DOM text, which is exactly what our mounted text layers are — so the criterion is met by the platform's own find on every platform that has one. It is a browser affordance we can't invoke or point at, which is worth saying out loud rather than implying the app provides it.

- **Which is why the app is installable but not standalone.** `display: standalone` usually makes a PWA feel like an app by removing the browser chrome, meaning the share sheet and the address bar, which is where iOS keeps Find on Page. Installing it that way would delete the affordance acceptance criterion #1 depends on.

  So the manifest ships **`display: browser`**, and `apple-mobile-web-app-capable` is absent because on iOS it forces standalone regardless of what the manifest says. You still get our icon on the home screen; tapping it opens Safari with its chrome intact, and find keeps working. "Make it a PWA" is a set of separate decisions rather than one switch.

### What "tested on mobile" means here

**Xcode's iOS Simulator, iPhone and iPad, in Safari**, not a resized desktop window. The Simulator runs real WebKit, so it reproduces the things most likely to break: `dvh` versus the browser toolbar, safe-area insets, momentum scrolling, and iOS Safari's own CSS behavior. A narrow Chrome window reproduces none of them. It also shares the host's network, so the dev server is reachable at `localhost` with no extra setup.

**What the Simulator cannot show us is the memory ceiling.** It runs on the Mac's RAM, so canvas usage that would get a real iPhone's tab discarded simply works there. That is the risk the text-layer/canvas separation exists to avoid, so the windowing is built conservatively and treated as *reasoned*, not *proven*. Verifying it needs a physical device, so the windowing is stated as reasoned rather than proven.

---

## 6c. Accessibility

**A strength of the build, not a checklist at the end.** The reasoning is domain-specific: this is a compliance tool in a regulated industry, used all day by people doing careful work. If it isn't operable without a mouse, it isn't finished.

The work splits three ways, and only the first is free:

1. **Inherit** — Radix, via shadcn, supplies focus management, ARIA wiring, keyboard interaction and dismiss layers for the primitives.
2. **Audit** — inherited is not the same as verified. What a library emits still has to be checked against what this page needs, and in one case below the library default is the wrong call for us.
3. **Extend** — the system has no splitter, so we author one to the same standard rather than shipping a mouse-only gap.

### Why a component library — and which one

I considered **not** using one. Given the small number of controls on this page, browser-native accessibility genuinely covers most of it. Here is the inventory I made:

| Control | What provides the accessible behavior |
|---|---|
| Back link | `<a href>` — native |
| Sort by page / severity | `<select>` — native |
| Hide/show minor issues | `<input type="checkbox">` — native |
| Issue title (jump to page) | `<button>` — native |
| Status-bar labels, strip segments, page controls | `<button>` — native |
| Submit | `<button>` + `aria-disabled` + `aria-describedby` |
| Confirmation modal | `<dialog>` + `showModal()` — **native**: focus trap, focus return, escape, background inertness, `aria-modal`. *(We ended up using the system's Dialog instead — see below.)* |
| Panel splitter | Hand-written WAI-ARIA separator: a `role`, four ARIA attributes, an arrow-key handler |

Nine of those ten are a native element doing its job, and the one hard piece, the modal, where hand-rolled dialogs usually go wrong on focus trapping and focus return, the platform now handles too via `<dialog>`. On the evidence of this page alone, a component library looks like a dependency added to wrap controls the browser already ships.

**But this page is one screen of four** in the spec's own flow diagram, and the Document Review product is bigger than those four. In the real repo I would not be authoring a checkbox; I'd be importing `<Checkbox>` from the system that already exists, and the open question would be whether that system already has a splitter and a severity chip, or whether this page is the third call site that finally justifies promoting them.

**Deciding "no component library" from a ten-control sample is the reasoning that produces component soup.** Every screen looks small enough to hand-roll. Twenty screens later you have twenty slightly different buttons and nobody remembers which is canonical. The decision has to be made for the suite, not for the page.

So: a component library, from the start.

### Why shadcn/ui specifically

**shadcn is not a runtime dependency — it copies source into the repo.** That resolves the tension rather than trading one side away:

- **Depend on the hard behavior.** Radix underneath: focus management, ARIA wiring, keyboard interaction, dismiss layers. The parts that are difficult, security- and accessibility-critical, and genuinely worth not reinventing.
- **Own the skin.** The markup and styling live in *our* files and are ours to edit. No fighting a vendor's opinions from the outside.
- **Tokens are the unifying layer.** CSS variables mean severity color is defined once and consumed by every surface that renders severity — here that's three of them: list rows, status-bar labels, and the strip.
- **Stays current without being an abandoned fork.** The registry lets you re-pull upstream and diff against local customizations: owned, but re-syncable.

That is "own the skin, depend on the behavior" rather than a blanket position in either direction.

### What we still author ourselves

**The splitter.** Radix has no such primitive — `@radix-ui/react-resizable` and `@radix-ui/react-splitter` do not exist, and `@radix-ui/react-separator` is a *decorative divider*, not a draggable one, despite the name collision with `role="separator"`.

So it is a new primitive added to the system, following the system's conventions: cva variants, the same token layer, and the full WAI-ARIA window-splitter pattern (`role="separator"`, focusable, `aria-orientation`, `aria-valuenow/min/max`, arrow keys to nudge, Home/End to snap).

**The domain components** are composed *from* the primitives rather than invented alongside them, and as built they are `IssuesPanel`, `ReviewVerdict`, `DocumentPanel`, `ThumbStrip`, `Splitter`, `ReviewAction` and the two severity marks in `lib/severity` + `components/severity`. That composition boundary is what keeps a system coherent as the product grows: primitives stay generic and few, domain components stay specific and many.

Severity presentation is two components rather than one `SeverityChip`: a `SeverityDot` for lists and a `SeverityMark` for the thumb strip, where a 29px-wide segment has no room for a label and the mark carries meaning in thickness instead. One component would have had to be two things.

### Where accessibility changed a design decision

**The submit button is `aria-disabled`, not `disabled`.** A `disabled` button is removed from the tab order and announces nothing, so a keyboard user tabs straight past the most important control on the page and is never told why it isn't available. Instead it stays focusable and carries `aria-disabled="true"` plus `aria-describedby` pointing at the blocking summary, so reaching it says *"Submit review, dimmed — 12 issues must be fixed before you can submit."* The click handler no-ops while blocked. *(Superseded: blocked, the page now offers no submit control at all. See the decision log.)*

**An issue row is not one big clickable `div`.** Each row holds two independent controls, a button (jump to this issue's page) and a checkbox (my private note), so it cannot be a single clickable region, and nesting a checkbox inside a button is invalid. The row is an `<li>` containing a real `<button>` for the title and a real `<input type="checkbox">` with its own label.

**The verdict is a live region.** When the last blocker clears, or a Done tick changes the progress count, the summary announces. Filtering deliberately does *not*: the counts describe the document rather than the view, so hiding the minors leaves the text identical and there is nothing to say. Otherwise a screen reader user checks something off, the state changes materially, and nothing tells them.

**The confirmation uses the system's Dialog (Radix underneath), not a native `<dialog>`.** Native `<dialog>` + `showModal()` would give the same focus trap, focus return, escape and inertness for free, but once a system exists, a screen that opens modals its own private way is the first crack in it. Both work; the one the next screen will also use is the right pick.

**Severity is never color alone.** Color plus an icon plus the text label, everywhere severity appears — list rows, status bar labels, and the strip.

### The list is a grid, and the app explains itself

Two decisions that belong together.

**The issues list uses the ARIA grid pattern.** Three columns, a roving tabindex, arrow keys
inside. The arithmetic makes the case: twenty-five rows with an issue button, a note and a Done
checkbox each is seventy-five tab stops, and reaching issue nineteen means pressing `Tab`
fifty-five times. As a grid it is one stop, and `↑`/`↓` walk the issues while `Enter` opens a page
*without moving focus*, so the loop is read, open, arrow on, open the next, never touching the
mouse and never losing your place. `→` and `Tab` cross to the Done box, `←` and `Shift+Tab`
come back, and `Tab` at the final column is left alone so the grid can always be escaped.

This is the pattern's actual use case rather than a box ticked. A reviewer works a list of
findings against a document all day, which is a spreadsheet-shaped job.

**And there is a user guide in the app**, under the account menu. Keyboard navigation this
good is worth nothing if nobody discovers it, and a wiki page is where discoverability goes to
die. The guide states the keys, the rules that are easy to get wrong (Done never opens the
submission; ticks don't cross versions; submitting can't be undone), and what the app does not do. A
user who knows why something is missing is not a user filing a bug about it.

### The rest

- Landmarks: `header`, the issues panel, `main` for the viewer. Skip link to the document.
- The splitter implements the WAI-ARIA window-splitter pattern: `role="separator"`, focusable, `aria-orientation`, `aria-valuenow/min/max`, arrow keys to nudge and Home/End to snap.
- The back link is a real anchor with a real `href`, never `href="#"`.
- Visible focus everywhere. The default outline is replaced, never removed: every control swaps it for a 3px `focus-visible` ring, and the splitter — a 6px line with no room for one — inverts its own color instead, which measures about 4:1 against its resting state.
- Jumping to a page scrolls smoothly, so the movement shows you where you went, unless `prefers-reduced-motion` is set, in which case it jumps.
- Every icon-only control has an accessible name.

### The honest limitation

**A rendered PDF is not accessible, and we say so rather than imply otherwise.** pdf.js paints a canvas and overlays absolutely-positioned text spans; the reading order that produces is unreliable, and none of the document's structure (headings, tables, reading order) survives. Whole-document `CMD+F` works because the text is in the DOM, which is not the same as the document being navigable by a screen reader.

We are not going to fix that client-side. The real answer is server-side: tagged/structured PDF, or an accessible HTML rendering of the extracted content served alongside the visual one. It is a known gap with a named fix, carried into [`PRODUCTION.md`](PRODUCTION.md) rather than glossed.

---

## 7. Assumptions and open questions

- **The Ashby version of the assignment contains one paragraph the PDF does not:** *"develop a system that detects and classifies checkboxes in document images."* Nothing downstream (ticket, API, acceptance criteria) mentions checkboxes again, and the cleaned-up PDF drops it entirely. Treating it as leftover boilerplate from a different challenge. Worth a one-line confirmation to David.
- **The mock is authored as a parse of the supplied PDF, and mostly checks out** (GLA 2,450 sq ft, basement 65%, cost approach $306,844 all match page 3 exactly). A couple don't: issue #2 cites a date the document doesn't contain, and issue #1 reports a missing summary on the page that *is* the summary. Not worth chasing; noted so nobody assumes the mock is gospel.
- **Status:** the mock is `on_review`. What this page should do for `created` / `processing` / `submitted` is unspecified. Presumably the user is routed elsewhere — those are other pages in the diagram.
- **Is there a re-upload CTA on this page?** The flow diagram loops back to the Upload Page, but that's a teammate's screen. Probably a link out, not a real upload.

---

## 8. Bonus artifacts to deliver

1. **Development approach — ✅ [`DEVELOPMENT.md`](DEVELOPMENT.md)**, including what most required expertise and the reversals along the way.
2. **UX sketches — ✅ [`wireframes/VERA_wireframes.svg`](wireframes/VERA_wireframes.svg)**, drawn in Google Drawings *before* the build. [Live source](https://docs.google.com/drawings/d/1P1lXCZPaLolqYNq0aOk2XJNdWGl8UmqJt4W83rlUnVE/edit?usp=sharing). Kept as-is even where the final implementation differs — they record intent, not a spec.
3. **What's required for a production deployment — ✅ [`PRODUCTION.md`](PRODUCTION.md)**, split into the seams this build was shaped around and the work it does not touch at all.

All three are against a build with **32 unit tests and 208 browser tests across seven spec files**, which is worth stating rather than claiming "well tested".

### The README is a deliverable too

It is the first file anyone opens, and it is read by people arriving two different ways — from a cloned private repo and from an unzipped archive. It must carry, at minimum:

- **A quickstart that works from cold**, for someone who has never seen this repo: clone *or* unzip, install, run, test, and the `/demo` route. Assume nothing about their toolchain beyond a package manager.
- **An accessibility section.** Accessibility is a stated strength of this build rather than a checklist pass (§6c), so the README has to say what was done, what it buys, and the honest limitation that a rendered PDF is not accessible.
- **A dependency table**: every package we chose to add, its version, and one line on the job it does. **Direct dependencies only**, what is written in `package.json` rather than the resolved tree. The short list is part of the argument, and every line in it should be defensible on the spot.

---

## Decision log

| Date | Decision | Alternatives | Why |
|---|---|---|---|
| 2026-08-14 | Vite + React + TypeScript | Next.js | No SSR need for a post-upload page behind auth. Every line explainable. Next.js is not yet shipped experience, so choosing it would mean defending framework behavior not personally lived. |
| 2026-08-14 | ~~Hand-rolled components + CSS tokens on `main`; a second branch on a component library~~ **SUPERSEDED**, see the shadcn row below | — | Reversed once the framing changed from "this page" to "one screen in a suite." shadcn also collapses the two-branch idea: you own the source *and* depend on the behavior in one codebase, so there is no second side left to demonstrate. |
| 2026-08-14 | Scope: no in-browser fixing, no real backend, no versioning | Simulating the re-upload loop | The spec puts resolution outside the app. Simulating it would misrepresent the product. |
| 2026-08-14 | **VERA does no uploading.** The re-upload loop exits the page. | An upload control on the Review Page; simulating the version bump | The flow diagram gives re-upload to the Upload Page, a teammate's ticket. Owning it would be building someone else's screen and blurring the one job this page has. |
| 2026-08-14 | **Continuous-scroll PDF viewer**, all pages and text layers mounted | Single page at a time; single page + hijacked CMD+F | Native CMD+F only finds text in the DOM. Whole-document search is an acceptance criterion, so the viewer architecture follows from it. Virtualization is the production answer at larger page counts. |
| 2026-08-14 | **`react-pdf`** as the renderer, wrapping Mozilla's `pdf.js` | Raw `pdfjs-dist`; commercial SDKs (Nutrient/PSPDFKit, Apryse) | `pdf.js` is the only serious open engine: Mozilla-owned, in Firefox, ~53k stars, since 2011, ~23M weekly downloads. `react-pdf` is a thin, maintained React binding over it (npm since 2014, v10, ~5M weekly) that adds no rendering of its own, so I get the heavy-hitter engine and skip writing the text-layer/worker glue. Raw `pdfjs-dist` = re-inventing a solved binding; commercial SDKs = annotation/licensing overkill for a read-only screen. |
| 2026-08-14 | Issues list sorts by **page order by default**, with a severity sort available | Severity-first default | Jane works through the document in page order when she goes to fix things. "What's blocking" is communicated by the summary above the list, not by the list's ordering. |
| 2026-08-14 | Simulated re-upload is a **stretch goal, built last** | Building it alongside the core; skipping it entirely | It satisfies no acceptance criterion. It exists to demonstrate the loop, so it earns its place only once the required work is done. |
| 2026-08-14 | Checkboxes feed the **simulator**, never `canSubmit` | Letting checked blockers directly unlock submit | Reads correctly in the code and models the real rule: submission becomes possible because a new clean version arrived, not because a user asserted it. |
| 2026-08-14 | Submit asks for **confirmation naming the unresolved minors** | Submitting straight through | "Minor may be ignored" is a choice the user makes. One-way door, no undo, mortgage file — she should acknowledge it once. |
| 2026-08-14 | Render the **terminal submitted state in place**; label it "Submitted" | Navigate to a stub Submitted Page; label it "Reviewed" | `status: submitted` is a value the API can return, so this page must handle it regardless of the button. "Submitted" matches the data and carries the finality; "Reviewed" implies a state you could leave. |
| 2026-08-14 | **No un-submit / mark-for-re-review** | A reopen control | Not a scope call — the transition doesn't exist. No reopened status in the enum, one-way arrow in the flow diagram, and submission is an external event. Corrections happen via a new version. |
| 2026-08-14 | **Thumb strip** down the viewer edge — one colored segment per page | Rendered page thumbnails | 34 extra pdf.js renders for images too small to read. The strip's job is showing *where the problems cluster*, which colored rectangles do better and for ~30 lines. Uses the per-page `height`/`width` the API gives us. |
| 2026-08-14 | **Page-margin markers**, numbered in page order, labeled with the real issue title, severity by color **and** icon | In-page highlighting via LLM lookup, via text-matching literals, or with a derived category taxonomy | The data gives `page` and no coordinates — anything drawn inside a page is an unsupported claim about position. Text-matching works for only ~half the issues with no way for a user to tell a correct miss from a bug. And absence-type issues ("Missing Summary of Findings") can never be highlighted by any technique. Bounding boxes from the backend are the production answer. |
| 2026-08-14 | **Scroll restore across reloads — CUT** | Persisting a page number, restored on the viewer's render signal | Gold-plating. Satisfies no acceptance criterion, and correct restore is more work than it appears: no page geometry exists at mount, so it must hang off the render signal and fire exactly once or scrolling away snaps the user back. Documented in Out of Scope rather than deleted, so the reasoning survives the question. |
| 2026-08-14 | **Accessibility is a strength**, not a checklist pass. Resizer keyboard support **in scope** | Shipping it mouse-only as a documented gap | The WAI-ARIA separator pattern is a `role`, four ARIA attributes and an arrow-key handler on top of pointer logic we're writing anyway. "I skipped accessibility" is also the one gap in that list a frontend reviewer would poke at, on a compliance tool used all day by people doing careful work. |
| 2026-08-14 | **shadcn/ui + Tailwind from the start** (Radix underneath) | Browser-native only; Radix directly; a runtime component library | Browser-native only covers most of ten controls, and native `<dialog>` handles the one hard piece. But this page is one screen of four in the spec's own diagram, inside a product that will already have components to reach for. Deciding "no library" from a ten-control sample is the reasoning that produces component soup: every screen looks small enough to hand-roll, and twenty screens later there are twenty slightly different buttons. shadcn resolves it rather than trading a side away: Radix behavior underneath, source copied into the repo so the skin is ours, CSS-variable tokens, re-syncable from the registry. |
| 2026-08-14 | **Mobile-first**: phone layout is the base, split view is an enhancement at `lg`. **All text layers mounted, canvases windowed** | Mounting every canvas (the original D1 plan); a separate mobile build; desktop-only | ~10 MB per full-width canvas at DPR 2 means 34 pages approach 350 MB, and iOS Safari discards tabs for less. Separating the text layer (what find needs, cheap) from the canvas (what costs memory) preserves acceptance criterion #1 on every device and is strictly better on desktop too. One architecture, one tuning constant, no second code path to drift. |
| 2026-08-14 | Page wrappers get their **height reserved from the API's page dimensions** before the canvas paints | Letting pages size themselves as they render | Pages render asynchronously, so an unreserved document has almost no height while it loads and any scroll target lands in the wrong place. The `height`/`width` fields turn out to be what makes navigation correct, not just strip decoration. |
| 2026-08-14 | Current page is **measured against a reading line**, not observed | `IntersectionObserver` on each page | Observer callbacks fire only on threshold crossings, so distant pages report stale ratios and a page taller than the viewport never reaches the higher thresholds, which freezes the reading after one scroll. Measuring which page's top last passed a fixed line is deterministic and holds for oversized pages. |
| 2026-08-14 | Every overlay sits **above `z-index: 3`** | Leaving overlays at the default stacking | react-pdf's `.textLayer` is `z-index: 2` and `.annotationLayer` is `z-index: 3`. At equal z-index the pages win on DOM order and their invisible text covers the UI: it looks fine and silently eats every click. |
| 2026-08-14 | Scroll is **smooth, but honors `prefers-reduced-motion`** | Always smooth; always instant | Animating the movement shows the user *where* they went; a hard jump doesn't. For people who have asked for reduced motion, a long smooth scroll is nauseating rather than informative. |
| 2026-08-14 | The **splitter is authored by us**, to system conventions | A splitter library; leaving it mouse-only | Radix has no splitter primitive, so this is a new primitive added to the system following its conventions, with the full WAI-ARIA window-splitter pattern. |
| 2026-08-14 | **SUPERSEDED** — Submit uses **`aria-disabled`, not `disabled`** | A genuinely `disabled` button | `disabled` drops the button out of the tab order and announces nothing, so a keyboard user tabs past the most important control on the page and is never told why. Focusable + `aria-disabled` + `aria-describedby` on the blocking summary means reaching it explains itself. Click handler no-ops while blocked. |
| 2026-08-14 | **Two layouts, not three. The boundary is 1024px** | A third shape for iPad portrait, splitting at 768 | A middle shape is the most work to justify and the least designed. Two shapes answer four open iPad questions at once: thumb strip, resizer, bottom bar and header metadata all belong to the full shape, so nothing is half-built for a middle case. 1024 rather than 768 because at 768 an issues panel wide enough to read leaves a document column too narrow to. The rule is about the *window*, so iPad Split View and Stage Manager come out right with no special case. Cost accepted: an 820pt iPad portrait shows one panel where two would nearly fit. |
| 2026-08-14 | **The full layout is a touch layout**, not "the desktop layout" | Treating `lg`+ as pointer-only | The 13" iPad is 1024 CSS px wide *in portrait*, so the full shape appears on a touch screen before anyone rotates anything. Everything in it is therefore built to touch standards: Pointer Events over mouse events, 44px grab zones, `touch-action: none` on drag surfaces, `overscroll-behavior: contain` on the panels, and no essential affordance behind `:hover`. Rotating an iPad crossing 1024 flips between the two designs, which also happens to be the clearest demonstration that the full shape isn't the compact one stretched. |
| 2026-08-14 | The thumb strip is **one scrub control, not 34 buttons** | 34 individually clickable segments | 34 targets at the 44px minimum need 1,496px of column, which is what appears to kill the strip on touch. As a single press-and-drag control the minimum applies once, at 44px wide and full panel height, and the strip survives everywhere. Same interaction as the iOS index scrubber. It also earns slider semantics: `role="slider"`, `aria-valuenow` on the page number, arrow keys and Home/End, so a control designed for a thumb delivers keyboard navigation of the whole document. Forces a readout that follows the thumb, since a finger covers what it points at. |
| 2026-08-14 | **One `focusedPage`, three views of it.** The thumb strip marks it, the issues on it highlight in the list, the status bar names them | Independent state per region | Everything on screen answers the same question, *what am I looking at*, so it is one value rather than three features that can disagree. Scroll position is its only writer: clicking an issue or dragging the strip *scrolls*, and the highlight follows arrival. Otherwise the reading line reports every page the smooth scroll passes through and the list strobes on the way to page 17. Not color-only: `aria-current` on the strip segment and the highlighted rows, with the status bar as the text channel. |
| 2026-08-14 | **SUPERSEDED** — The issues list never scrolls itself | `scrollIntoView({ block: 'nearest' })` on the focused page's first issue | The list is the user's: they scrolled it somewhere on purpose, and having it move under them because the document scrolled is the irritation that makes a panel feel possessed. The highlight is enough, and if it is off-screen the status bar still names the issues on the page, which is the third of the three redundant routes doing its job. |
| 2026-08-14 | The thumb strip's scale factor is **computed in JS from a measured column**, not expressed in CSS | Percentage heights + `aspect-ratio`; a per-segment `min-height` floor | Every CSS formulation of "one scale factor" stops being one factor the moment a constraint binds: a clamped segment gets its own and renders a short page *wider* than a full page. Fitting height alone ignores width and blows a four-page document out of a 44px column; percentage heights plus a flex `gap` overflow by `(n−1) × gap` on every viewport, putting the last pages below the fold of a control you drag rather than scroll. All three are invisible against a uniform Letter fixture. Measuring is the only version that is the rule the document describes. |
| 2026-08-14 | **The verdict is a component that takes the whole `review`**, never a list of issues | Computing it inside the issues panel from the array being rendered | The panel renders a *view*, sorted and filtered, and a verdict derived from that view under-reports the moment anything is hidden while looking like it works. Taking `Review` makes the mistake unrepresentable. It also fixed a second bug in the same place: the copy was hardcoded to the blocked state, so a clean document read "0 issues must be fixed / before you can submit", overfitting the one thing D4 says must not be overfitted. |
| 2026-08-14 | **Theme is a user setting** — system / light / dark, from the account menu | System preference only; no dark mode at all | The palette was already authored and completely unreachable, so an iPhone in dark mode rendered white. Resolving the three-value preference in JS and letting CSS see only a `.dark` class keeps one definition of dark instead of a class rule and a media query that can drift. Device-scoped rather than account-scoped: which theme suits you depends on the screen and the room, not on who you are. An inline script applies it before first paint, because the alternative is a white flash on every load. |
| 2026-08-14 | **The payload is validated at the boundary**, not asserted with `as Review` | Trusting the cast; a schema library | The app's central claim is that it isn't overfitted to the supplied mock, which needs a boundary that actually looks. Without one, `issues: null` sails past the error state built for it and dies inside a render, and an unrecognized severity degrades silently into an uncolored dot and a `NaN` count. Hand-written in ~20 lines rather than a dependency, because the short dependency list is part of the argument. Raw parser messages stopped reaching the UI at the same time. |
| 2026-08-14 | **Two test suites, two runners** — vitest on the rules, Playwright on the layout | One runner; screenshot baselines | The rules are pure functions, so they test fastest with no DOM at all. Layout is the opposite: jsdom has no layout engine, so the class of bug the layout suite exists to catch is the class jsdom cannot see. No screenshot baselines, because WebKit and Chromium rasterize type differently, so they would need a set each and would churn on every change; structure is what's invariant. The suite earned itself immediately by catching a 32px submit button under the 44px minimum. |
| 2026-08-14 | **The compact layout hides the inactive view with `display: none`**, so find-on-page reaches the document only from the Document tab | Keeping the document mounted and moved off-screen; a `visibility`/`clip` variant | Restoring find in both tabs would highlight a match somewhere the user cannot see, in a layout whose premise is one thing at a time, and it would pin all 34 text layers in the DOM permanently on the device where memory is scarce, which is the pressure the text-layer/canvas split exists to relieve. Find while looking at the document is the only moment anyone invokes it. §6d's claim is qualified accordingly; the full layout is unaffected because both panels are always mounted. |
| 2026-08-14 | **PWA ships `display: browser`. The browser chrome is load-bearing, so we keep it** | `display: standalone`, which is what "make it a PWA" usually means | Standalone is the app-like option and it removes the browser chrome, which is where iOS keeps Find on Page. There is no share sheet and no address bar in a standalone window, so installing the app would delete the affordance acceptance criterion #1 depends on. Chrome over polish: an installed icon that opens into Safari keeps whole-document search working on the device we most want to test on. `apple-mobile-web-app-capable` is absent for the same reason, since on iOS it forces standalone regardless of the manifest. The alternative is building find into the page, which D1 declined *because the platform had one*; that reasoning inverts the moment the platform's is taken away, so the cheaper move is to not take it away. |
| 2026-08-14 | The product says minor findings are **accepted**, never *ignored* | Using the brief's own word, "ignored" | The brief's acceptance criterion reads "minor may be ignored", which is fine in a requirements document and wrong in a regulated one. *Ignored* means not looked at; what happens is that a qualified reviewer sees the finding, judges it non-material and accepts it. That distinction is the value of the record, and no lender wants a compliance file stating six findings were ignored. "Accepted as-is" is also appraisal-native language. The stronger term is *exception*, precise and standard in "approved with exceptions", but it reads stiffer and *accepted* carries the meaning without the jargon. The submitted state says "accepted" rather than "unresolved" for the same reason: on a closed file they are not outstanding work. |
| 2026-08-14 | **React Router**, and `/documents` exists as a stub | Hand-rolled `pushState`; owning no second route at all | Writing a router for two routes is the same mistake as writing a pdf.js binding: use the library when one exists, which is the rule already applied to shadcn and react-pdf. The stub list is what makes the whole loop demonstrable more than once; without somewhere to return to, submitting is a one-way trip and an evaluator gets one shot at the most important interaction in the build. |
| 2026-08-14 | **The version lives in the URL** (`?v=3`), not in component state | Component state; a version picker with no address | It is a different thing to look at, so it deserves an address: "this document at v2" becomes a link that survives a paste and a reload, and the back button stops lying about where you are. |
| 2026-08-14 | **Two versions of one document replace `?fixture=clean`** | Two separate documents; a query-param demo switch | Both fixtures share one PDF, and two differently-named properties with byte-identical pages is a fiction a reviewer notices. Same document, later version is the truth, and it tells the product's own loop: fix externally, re-upload, submit. |
| 2026-08-14 | **Blocked, the page does not offer submit.** It offers *Upload new version*, and keeps offering it once nothing is blocking | Keeping an `aria-disabled` submit; showing upload only while blocked | A control labeled with something it refuses to perform is a lie told on every render, and disabling it only makes the lie quieter. This supersedes the `aria-disabled` decision below: not having an unavailable control beats explaining one. It stays visible once nothing is blocking because someone may decide to fix the minors after all, and withdrawing the escape hatch the moment a document passes makes the clean state feel like a trap. It disappears only on submission, when there is nothing left to re-upload for. Outlined rather than filled throughout, because submitting is the goal and this is the fallback; icon-only below `lg`, where the bottom bar is already carrying the verdict and the primary action. |
| 2026-08-14 | **The upload dialog is inert** | Wiring a real file input; linking away to nothing | VERA does not upload; that screen is a teammate's ticket. But a blocked state with no visible next step looks like a dead end when it is a loop. The dialog shows where the loop goes and stops at the boundary, saying so in as many words. |
| 2026-08-14 | **Submitting is a sequence**: confirm → *Submitting…* → *Submitted* → the queue | Submitting instantly; a toast | Theater, and the honest kind. A real submission is a network round trip, and collapsing the one irreversible action in the app into an instant nothing makes it feel like it did not happen. The dialog becomes the progress surface rather than vanishing and leaving the page to explain itself. The finished row then settles on the list over three and a half seconds, slow because a quick flash reads as an error and this is a completion. |
| 2026-08-14 | **A Done checkbox per issue, scoped to review + version** | No checkbox; a global "handled" list | A private worklist, and the point is what it *cannot* do: `canSubmit` takes a whole `Review` and a checkbox is not part of one, so a defective file cannot be submitted by lying to a checkbox. Version scoping is not tidiness — a tick carried from v2 would claim a defect was handled that v3 never raised. |
| 2026-08-14 | **The severity counts are also the filter**, and the count never changes | A separate filter row; changing the counts to match the list | One control both states the verdict and filters the list, which is only safe because the *number* stays fixed and just the opacity moves. Hide the thirteen minors to concentrate on what is blocking, and the summary still says there are thirteen. Done rows follow the same rule. |
| 2026-08-14 | **Sorting rearranges rows and never renumbers them**; severity sort sinks done rows | Renumbering on sort; leaving done rows in place | The number appears beside the row *and* against the document, so it has to survive re-sorting. Page order is a map of the document, where a handled issue keeps its place; severity order is a worklist, where what is left to do belongs at the top. |
| 2026-08-14 | **Severity words get their own text tokens**, separate from the fills | Reusing the dot colors as text | The fills are tuned to read as 8px marks. As 12px type they measure 4.77, 2.56 and 3.63 against white, two of three failing the 4.5 AA floor outright. The darkened text tokens clear 5.8 or better, and a Playwright test measures it against both surfaces in both themes rather than asserting it in a comment. |
| 2026-08-14 | **VERA is the product name**, always in capitals | Shipping the UNDIRT codename; title case | MIRA is set in capitals everywhere on HomeVision's site, so a sibling product rendered as "Vera" reads as a different kind of thing. Latin *verus*, true: MIRA finds the problems, VERA is where a person decides. The mark borrows their faceted construction rather than their shape: a cut slab with a triangle tucked under it, arms uneven so it reads as a check as well as a V. |
| 2026-08-14 | **Deployed to Vercel, not the existing Apache host** | FTP to the same cPanel box as the portfolio site | The portfolio lives on that host. Deploying here would mean touching the same document root, credentials and `.htaccess` as a site actively being sent to employers, for no benefit. Vercel is a separate blast radius with instant certificates. The rewrite matches **only extensionless paths**, because a blanket rule hands `index.html` back for a missing asset with a 200: the "Unexpected token '<'" white screen that only ever appears after a deploy. |
| 2026-08-15 | **Scroll tracking is a setting, default on.** The list follows the document unless the user turns it off | Keeping the list permanently still (the decision below); making it follow with no way out | Both behaviors are defensible and neither is obviously right, which is the signal that it belongs to the user rather than to us. Following keeps the issue beside the page it describes, which matters most on a document you do not know — and the tint is easy to miss when it lands off-screen. Not following leaves a panel you scrolled on purpose where you left it. Default on because a first-time reader benefits from being taken there, and `block: 'nearest'` means it does nothing when the row is already visible, so it never jerks the list while you read down it. This supersedes the row below, which had the reasoning right but forced the answer. |
| 2026-08-15 | **`URL.parse` is polyfilled, and the app has an error boundary** | Raising the browser floor and saying so in the README; leaving React to unmount on an uncaught error | `pdfjs-dist` calls `URL.parse`, which is Chrome 126, Firefox 126 and **Safari 18.4 — March 2025**. On an iPad running 17.4 it is `undefined`, pdf.js throws while resolving its worker, and the entire app went blank: content flashing once and vanishing, in both iPad browsers, with a stack pointing only into a vendor chunk. A dependency's browser floor is the product's floor whether or not anyone declared one, and "upgrade your iPad" is not an answer a lender accepts for hardware it issued. The polyfill is the spec's own contract — `new URL`, returning `null` instead of throwing — so nothing downstream can tell the difference. The reason it took the *app* down rather than the viewer is that there was no error boundary anywhere; there is one now, and it shows the error rather than swallowing it, because on a tablet there is no console to open. Both are tested by deleting the API, since asserting a polyfill exists proves nothing about the app that needs it. |
| 2026-08-15 | **The compact upload control carries the word "Upload"** | The icon alone, with the label in the accessible name | An upward arrow is not a word: it reads as export, or share, or open. This is the only route out of a blocked review, so the one control that must not be a guess was the one with no label. The full phrase stays in the accessible name at every width. |
| 2026-08-15 | **A truncated title reveals itself on hover or tap** | The `title` attribute; leaving it truncated | That tooltip is the browser's — never shown on touch, a second's delay on a pointer, unstyleable — and this screen exists to identify *which* loan file you are looking at. A popover rather than a tooltip, because tooltips are hover-only by design and this has to work under a thumb. It only becomes a control when the text is actually cut off: a button that reveals the same string is a promise of information that is not there. The trigger fills its container deliberately — a shrink-to-fit one lets the text stop being constrained, so the measurement that created the button then deletes it, which flickers and settles on the wrong answer. |
| 2026-08-15 | **The queue row says why, not just what** | The status pill alone; a count typed into the catalog | "Awaiting review" raises the question it cannot answer — waiting on what? A queue where every row looks equally stuck has to be triaged one row at a time, by opening each. The row now carries the blocking count of the version you would land on, in the severity's own color, and switches to what was accepted once the document is submitted. Counted from the fixture rather than stored beside the catalog, because the number is a property of the findings and one typed into the catalog goes quietly wrong the first time a fixture changes. |
| 2026-08-15 | **Each row shows its cover page, as a stack of paper** | No thumbnail; a generic file glyph on every row | A list of documents that shows none of them makes every row the same shape, and a first page is recognizable long before a filename is readable. The sheets behind are the one piece of pure decoration, and they earn it by saying "multi-page" without spending text on it. pdf.js is ~420 KB and this is the first screen anyone loads, so the render is lazily imported and the row reserves its space and shimmers until it arrives. Rows without a PDF get the same stack, empty — not a generic glyph and not somebody else's page: a pending document has no cover yet, and an empty sheet is what that looks like. |
| 2026-08-14 | **No pinch-to-zoom — CUT** | Handling the gesture and re-rendering pages at a new scale; letting the browser zoom the page | The expected gesture on an iPad and a real gap, named rather than hidden. Doing it properly reaches into the reserved page heights and the reading-line measurement, both load-bearing. Letting the browser zoom is a one-liner that breaks a fixed app shell. Deferred with the consequence stated: on a tablet the page renders at the width we choose and cannot be magnified. |

---

## Attribution ledger

_Honest record of who drove what, so the walk-through is defensible._

- **Andrew:** the scope boundary (in/out); recognizing the JSON is metadata rather than content, not a source to reconstruct the document from; the checkbox todo-list idea; the instinct to mark issues in the document; page-order default sort with a severity toggle; the status bar and the page strip; **the reversal to a component library**, that deciding "no library" from a ten-control sample is the reasoning that produces component soup, because this page is one screen in a suite; and the call that accessibility should be a strength of the demo rather than a checklist.
- **Andrew checked** react-pdf's `CMD+F` behavior and render quality in its live demo before the library was committed to: the riskiest assumption in the build, looked at rather than trusted. He also made licensing part of the criteria, MIT over anything commercial, in a regulated industry where dependency terms are a procurement question.
- **Claude Code proposed:** the continuous-scroll viewer, on the grounds that native CMD+F only searches the DOM (D1); the "checkbox must not unlock submit" constraint and the simulated-reprocessor framing that preserves it (D3/D5); the observation that absence-type issues can never be highlighted by any technique; `aria-disabled` over `disabled` on submit; shadcn as the specific library that resolves own-vs-import rather than picking a side; the localStorage scoping table.
- **Corrected by Andrew:** that a proportional page strip must scale *both* dimensions. The proposed "uniform height, variable width" rule would have rendered Legal and Letter identically, hiding the most common real anomaly. Also that the page numbers in the strip are load-bearing rather than decoration.
