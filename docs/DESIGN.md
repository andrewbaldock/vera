# Review Page — Design

**HomeVision Frontend Take-Home · started 2026-08-14**

This doc is written *before* the code and updated *as* the code. It is the record of what was decided, what was rejected, and why. Anything built that isn't explained here is a gap.

**Status:** design settled — every decision below is made. Repo scaffolded (Vite + React + TS); the component layer and the app itself are not built yet.

**Stack:** Vite · React 19 · TypeScript · Tailwind 4 · shadcn/ui (Radix underneath).

---

## 1. What this app is

**UNDIRT — Uploaded New Doc Issue Review Tool.**

This is an App that lets a user review the issues detected by automation in a PDF they uploaded, and understand what must be fixed before the document can be submitted.

Fixing happens in the user's own system, and the corrected version is uploaded somewhere else. **UNDIRT does no uploading. It is the gate.** It stays shut while any critical or major issue remains, and opens when none do — at which point the user can say "this doc is good."

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
- **A list view of all documents this user has to review.** UNDIRT is the single-document view you reach *from* that list. The list is not in the spec's flow diagram — this is our inference about the surrounding product, not something the assignment stated.

### Out — considered, then cut as gold-plating

Wanted, and deliberately not built. Each satisfies **no acceptance criterion**, and each costs more than it first appears. Listed so the absence reads as a decision rather than an oversight — and so the reasoning survives the question.

- **Restoring scroll position across a page reload.** Genuinely nice for a 34-page document worked through over a long session. But a continuous-scroll viewer has no page geometry at mount, so the restore has to hang off the viewer's render signal and fire exactly once — otherwise scrolling away snaps the user back every time. Worth having in a real product; not worth the build time here.
- **Rendered page thumbnails in the thumb strip.** 34 extra pdf.js renders producing images too small to read. The strip's job is showing where problems cluster, which coloured rectangles do better and for a fraction of the work (D6).
- **Pinch-to-zoom the document.** The expected gesture on an iPad, and the full layout is a touch layout (§6d) — so this is a real gap, named rather than hidden. Cut on cost, not on principle: doing it properly means re-rendering pages at a new scale, which reaches into the reserved page heights and the reading-line measurement that decides which page is in view. Both are load-bearing. Letting the browser zoom the whole page instead is a one-liner but breaks a fixed app shell. Deferred with its consequence understood: on a tablet, a page renders at the width we choose, and the user cannot magnify it.

### Where this page sits

The spec's flow diagram gives four pages. We own **one**:

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
| 2 | Cannot submit until all critical + major are resolved; minor may be ignored | `canSubmit` derived from the current issue list — no stored flag |
| 3 | The page clearly communicates what's blocking submission | Blocking summary tied to the specific blockers, not a generic disabled button |

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

> 📐 **Sketched:** [`wireframes/UNDIRT_wireframes.svg`](wireframes/UNDIRT_wireframes.svg) — the visual companion to this section, drawn before any code. ([live source](https://docs.google.com/drawings/d/1P1lXCZPaLolqYNq0aOk2XJNdWGl8UmqJt4W83rlUnVE/edit?usp=sharing))

Jane arrives on the Review Page for *Annual Compliance Report - Northeast Region.pdf*.

1. **The page has three regions:** a header, an issues list on the left, and the PDF viewer on the right, separated by a **draggable resizer**. Issues left follows the PDF-tool convention (Preview, Chrome, Acrobat) where the left rail is a way *into* the document — which is exactly what a clickable issue list is. The document takes the clear majority of the width by default (roughly one-third / two-thirds): it is 612pt of dense evidence, and squeezing it defeats the point of showing it. Split position persists in `localStorage`.
2. **A summary sits above the list** — the verdict, separate from the worklist. Form: **"12 blockers, 13 minors"**, and when minors are collapsed, **"12 blockers, 13 minors (hidden)"**. Blocking count leads; minors are reported but clearly not part of the verdict, and the summary always accounts for them even when the list doesn't show them. When the gate opens it must read the opposite just as well: *no blockers, 13 minors, you can submit.*
3. **She sees the issues in page order by default**, with a control to re-sort by severity (critical → major → minor).
4. **A hide/show toggle for minor issues**, defaulting to **shown**. Once she toggles it, the choice is remembered in `localStorage`. Minors are 13 of 25 and none can block her; collapsing them turns a wall into a punch list.
5. **The list is clickable.** Clicking an issue takes the viewer to that issue's page.
6. **Each issue carries a checkbox** — a private note that *"I have addressed this."* Saved to `localStorage`. It changes very little about the UI. It is a marker of what she's done and not done, nothing more. **It does not gate submit.**
7. **She scans the list and clicks an issue.** The viewer moves to that page, and the status bar above the viewer names the issues on it (see D2).
8. **The viewer has forward/back page controls.** Navigating by page, not only by issue.
9. **The link runs both directions.** When she lands on a page that has issues, those issues are emphasized in the list — *"here's what needs attention on this page."*
10. **The status bar above the viewer is always current** — `[ PAGE 13 ]` plus a labelled chip per issue on that page, updating as she scrolls.
11. **She works through the list**, checking things off or not, then leaves to fix them in her own system.
12. **When the gate opens** and she clicks submit, a confirmation names what she is choosing to ignore — *"Submit with 13 minor issues unresolved?"* The product permits it; she should say so once, deliberately. Minor-can-be-ignored is a decision the user makes, not something the app does quietly on her behalf.
13. **After submitting**, the page renders its terminal state: status **Submitted**, the review read-only, the submit button gone rather than disabled, remaining minors shown as *accepted as-is* rather than as outstanding work, and a link back to the (out-of-scope) document list.

**There is no un-submit.** The status enum has no reopened state and the flow diagram's submit arrow is one-way. Submission is the moment the document leaves the user and goes to the lender — it isn't ours to reverse. A mistake after submission is corrected the same way as any other: new document, new upload, new review.

**And the demo must not be overfitted to the mock we were given.** Hand the app a different JSON with no critical or major issues and it must declare the document good. The gate is logic, not a hardcoded state.

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

**Decided: A.** It satisfies the criterion by construction rather than by cleverness, and it costs the least code. This is the decision the whole viewer hangs off — the acceptance criterion dictated the architecture, not the other way round.

**Checked before committing to it, not assumed.** This is the only genuinely unknown part of the build, so before writing any viewer code I went and looked at react-pdf's live demo myself. Two things were immediately clear: native `CMD+F` finds and highlights text in the rendered document, and the rendering is faithful — real type, tables and vector charts, not a degraded approximation.

That was enough to settle the library choice and to know acceptance criterion #1 was achievable rather than hoping so. A bad answer here would have invalidated the viewer architecture, and discovering that late would have been expensive.

**Licensing was part of the choice, not an afterthought.** `react-pdf` is MIT and sits on Mozilla's `pdfjs-dist`, which is Apache-2.0 — both permissive, both free, and both durably so given pdf.js is maintained by Mozilla rather than by a company that needs to monetise it. Several of the alternatives are commercial: `@react-pdf-viewer` doesn't publish an SPDX identifier at all, only a link to a license page.

That matters more here than on a typical project. This is a document-processing product in mortgage and appraisal — a regulated industry, where a viewer sits in the path of every loan file. Picking a dependency whose terms could change, or that needs a per-seat negotiation to scale, is a procurement and audit problem long before it's an engineering one. MIT plus Apache-2.0 is a dependency nobody has to have a conversation about.

One known upstream issue to watch during implementation ([wojtekmaj/react-pdf#1848](https://github.com/wojtekmaj/react-pdf/issues/1848)): when every page renders inside a single `<Document>`, pages after the first can pick up a scaled `scaleX` on the text layer in some documents, which misaligns the invisible text from the visible glyphs. Symptom is find highlighting the *wrong place* rather than failing — worth checking past page 20.

### Three things the viewer spike taught us

A standalone harness — [`src/demo/ReactPdfDemo.tsx`](../src/demo/ReactPdfDemo.tsx), **kept in the repo rather than deleted** — proved the four behaviours the viewer depends on — all pages mounted with text layers, whole-document find, jump-to-page, and knowing which page is in view. All four work. Getting there surfaced three problems that would each have been much more expensive to meet later.

**1. Every overlay must clear react-pdf's stacking, or it stops accepting clicks.**

react-pdf ships pdf.js's stylesheet, which sets:

```css
.textLayer       { position: absolute; inset: 0; z-index: 2 }
.annotationLayer { z-index: 3 }
```

The text layer is the invisible copy of the page's text laid over the canvas — the thing that makes `CMD+F` work at all. At an equal `z-index` the pages win on DOM order, so a toolbar at `z-index: 2` gets covered by the text layer of every page you have scrolled past. It still *looks* correct; the elements are transparent. But `elementFromPoint` over a button returns a `<span>` of invisible PDF text, so hover stops showing a pointer and clicks land on the document instead.

The symptom is bizarre and specific — **controls work until the first scroll, then go dead** — which is a long way from the cause.

This affects three things in the real build, not just the spike: the **status bar** sits above the viewer, the **thumb strip** beside it, and the **confirmation dialog** over everything. Every one of them needs to clear `z-index: 3`, and the reason belongs in a comment where the value is set, because `zIndex: 10` on its own looks arbitrary.

**2. Page heights must be reserved before the canvases paint, and the API's dimensions are what makes that possible.**

All 34 pages mount at once, but each renders asynchronously — until a canvas paints, its wrapper is a few pixels tall. Jumping to page 30 therefore scrolls to where page 30 is *at that instant*, near the top, and then the pages below finish rendering, the document grows, and the user ends up nowhere near what they asked for.

Setting each wrapper's height from the API's per-page `height`/`width` fixes it: the document is its full length from the first paint, so scroll targets are stable.

This reframes those fields. They looked like data for drawing the thumb strip; they are actually **what makes scrolling correct**. A viewer that ignores them can't reliably navigate to a page — which is most of what this page does.

**3. "Which page am I on" is a measurement, not an observation.**

`IntersectionObserver` was the obvious tool and the wrong one. Its callback fires only when a threshold is *crossed*, so pages far from the viewport keep reporting whatever ratio they last had, and a page taller than the viewport can never reach the higher thresholds at all. The answer froze after the first scroll.

What works is measuring against a *reading line* just below the toolbar: the current page is the last one whose top has scrolled past it. Deterministic, correct for pages taller than the viewport, and cheap — a rAF-throttled scroll handler that exits the loop early, since pages are in document order.

**Scrolling is smooth, but honours `prefers-reduced-motion`.** Moving the page tells the user *where* they went in a way a hard jump doesn't; for people who've asked for reduced motion, a long animated scroll is nauseating rather than informative.

**The harness is kept, not deleted.** It's the cheapest way to isolate a viewer problem from the rest of the app — if find or scrolling misbehaves later, the question "is it react-pdf or is it us?" is one page load away. It's also the evidence that the riskiest part of the build was tested rather than assumed.

### D1b — Which library renders it — **DECIDED: `react-pdf`, wrapping Mozilla's `pdf.js`**

Rendering a PDF in a browser is not something to hand-roll. PDF is a thirty-year-old spec — fonts, encodings, page geometry, malformed files in the wild — and getting it right is a specialist's job. The only serious open engine is **Mozilla's `pdf.js`**: the exact renderer built into Firefox, so it is exercised by a browser's worth of users every day rather than by a library's worth. It is Apache-2.0, first committed in **2011**, still actively maintained by Mozilla (last release mid-2026), and sits at roughly **53k GitHub stars**. Its npm engine package `pdfjs-dist` pulls about **23 million downloads a week**. As dependencies go this is near the safe end of the spectrum: an institutional owner, a fifteen-year track record, an enormous install base, and a permissive licence. I am not betting the build on a solo weekend project.

`pdf.js` is the engine — a canvas painter and a text-layer builder — but it ships no React. Two ways to consume it:

- **Raw `pdfjs-dist`** — drive the engine directly and own the canvas, the text layer, and the worker lifecycle myself. Most control, but it means re-implementing a React binding that already exists, and the text-layer wiring — the part `CMD+F` depends on — is exactly the fiddly piece I'd least want to own from scratch.
- **`react-pdf`** *(chosen)* — a thin, long-lived React wrapper over that same `pdf.js`. Declarative `<Document>` / `<Page>` components, the text layer on by default, worker configured through Vite's `?url` import. It has been on npm since **2014**, is on its **v10** major line, and pulls roughly **5 million downloads a week**. Crucially it adds no rendering of its own — the pixels are still Mozilla's — so choosing the wrapper costs nothing in engine quality and saves me the integration code.

**Decided: `react-pdf`.** I get Mozilla's renderer for the genuinely hard part and a maintained React surface for the binding, which is the right division of labour: depend on the heavy-hitter for what's hard, own only the thin glue. The one thing to configure carefully is the worker under Vite; the wrapper handles the rest. Rejected raw `pdfjs-dist` as needless re-invention of a solved binding, and the commercial SDKs (Nutrient/PSPDFKit, Apryse) as overkill — they sell annotation, form-filling, and enterprise licensing that a single read-only review screen does not need.

*(Figures as of Aug 2026: `pdf.js` ≈53.5k stars, `pdfjs-dist` ≈23M weekly npm downloads; `react-pdf` ≈5M weekly downloads, on npm since 2014, current major v10.)*

### D2 — How precisely do we point at an issue in the document? — **DECIDED: a status bar above the viewer**

**We do not highlight inside the page.** A **status bar sits above the PDF viewer**, showing the page currently in focus and the issues on it:

```
[ PAGE 13 ]   ⚠ Depreciation Table Rounding Error    ● Formatting: Inconsistent Currency Notation
```

- The **page number** of whatever page is currently focused, derived from scroll position.
- One **label per issue on that page**, carrying the issue's **real title** verbatim from the data.
- **Colour and an icon** for severity — both, never colour alone.
- Issues are numbered in **page order, permanently**, so a label's number never disagrees with its list row no matter how the list is sorted.

Clicking a label selects that issue in the list. That gives the page → issue direction of the two-way link for free.

On a page with no issues the bar still shows the page number and says so — *"no issues on this page"* is useful information in a document she is working through, not an empty state.

**Why a bar rather than markers in each page's margin:** it lives in one fixed place instead of scrolling past, it doubles as the page indicator for the forward/back controls, and it is far less code than annotating 34 pages. The trade is that you can no longer see at a glance where problems cluster across the document — but the issues list already carries page numbers, so that reading is still available.

**Why not in-page highlighting.** Three approaches were considered and rejected:

1. **LLM locates the region at runtime.** Non-deterministic in a reviewer's hands — one bad highlight and they can't tell a model error from a bug — and it needs an API key, so the take-home wouldn't run out of the box.
2. **Text-match on literals in the description** (`$308,120`, `Map #17167C0215E`, `"Not to Scale"`). Deterministic and cheap, but it only works for about half the issues, and the user has no way to tell a correct miss from a bug. Shipping a feature that is silently wrong some of the time is worse than not shipping it.
3. **Deriving a category** (`wrong number`, `missing content`) to label markers. Same guessing problem as text-matching. Unnecessary anyway — every issue already ships with a human-written title more specific than any category we'd invent.

**The deeper reason.** We have `page` and nothing else — no coordinates, no bounding boxes, no text offsets. Anything drawn *inside* a page is a claim about position that the data does not support. Margin markers claim only *"these issues concern this page,"* which is exactly what the data does say.

And a whole class of issue can never be highlighted regardless of technique: **"Missing Summary of Findings" is an absence.** There is nothing on page 3 to point at. Roughly a quarter of these issues are missing-thing findings, so any design resting on in-page highlighting is broken for them by construction.

**The production answer is bounding boxes from the backend.** The AI that found "page 18 shows $308,120" necessarily knew where on page 18 it was looking. Location is the API's to return, not the client's to reverse-engineer. That request goes in the production-readiness writeup.

### D3 — The checkbox / personal todo list — **DECIDED**

Users check issues off as they work through them. Private notes, persisted to `localStorage`, minimal visual weight.

This is good UX — 25 items, worked through in another application, over a long session. It is **scratch state, not a resolution claim.** Hard rule:

> **`canSubmit` never reads a checkbox.** It is derived from the review data alone: are there any critical or major issues in this review? Resolution is proven by a new version. If a checkbox could unlock submit, a user could submit a defective mortgage document by lying to a checkbox.

The checkboxes do feed one other thing — the simulated reprocessor in D5 — but they do it by producing a *new review*, never by short-circuiting the gate.

Open sub-questions:
- Does it survive a reload? (`localStorage`, keyed by review id + version?)
- What happens when version increments and the issue list changes — do stale checks leak into the new review? Do issue `id`s even survive a re-parse? **Unknown — we don't know if `issue_1` in v2 is the same defect as `issue_1` in v3.**
- Should it be labeled to make its meaning unmistakable (e.g. "my notes" vs anything resembling "resolved")?

### D4 — How to demo the submittable state — **DECIDED**

The app must not be overfitted to the supplied mock. Hand it a JSON with no critical or major issues and it declares the document good. The gate is derived logic, never a hardcoded state.

Implementation open: a second mock file plus a way to switch to it (query param, or a small dev control). Whichever we pick gets called out as a demo affordance, not a product feature.

### D6 — Document thumb strip (minimap) — **DECIDED: cheap version**

A vertical strip down the edge of the viewer, one segment per page, mapping onto scroll position the way a scrollbar does:

- Each segment is a **page-shaped rectangle**. It carries no page number — see the sizing rule below, which is what settled that.
- Inside it, **one coloured bar per issue on that page**, in that issue's severity colour — so page 14 visibly has three marks and page 4 has none. Richer than a single worst-severity fill: you see both severity and volume at a glance.
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

Each segment is that page's actual `width` × `height` from the API, multiplied by a single shared scale factor. Both dimensions scale. Nothing is normalised.

This is the only rule that catches the cases that matter:

- **Legal (612×1008) next to Letter (612×792)** — same width, different height. A taller segment, immediately visible. Any rule that fixed the height would render these identically and hide the most common real anomaly.
- **A landscape page** — wider and shorter, breaks the column.
- **An oversized exhibit** — bigger in both directions.

**The factor fits both dimensions, and the strip never scrolls.** It is `min(availableHeight / totalPageHeight, availableWidth / widestPage)` — computed once from a measured column, then multiplied into every page's own width and height.

Three earlier versions of this rule were wrong, and all three were invisible against a 34-page document of identical Letter pages:

- **A per-segment `min-height` floor** — meant to keep a two-digit page number legible — silently gave any clamped segment *its own* scale factor. A short page then rendered 31% off-scale and visibly **wider** than a full page it is narrower than. A floor on the segment is not a floor on the scale.
- **Fitting height only** ignored the other dimension, so a four-page document computed segments ~180px wide inside a 44px strip.
- **Percentage heights plus a flex `gap`** summed to exactly 100% and then added the gaps on top, so the strip overflowed its column by `(n−1) × gap` on *every* viewport — meaning the last pages sat below the fold, unreachable by a control you drag rather than scroll.

The last one is why the floor is gone rather than fixed: the strip is a scrub surface with `touch-action: none`, so a scroll container inside it cannot be scrolled by the finger it exists for. A strip that always fits has no such conflict. And with no floor there is no page number to protect — which is the right outcome anyway, since the readout that follows the thumb states the page far more legibly than 9px type inside a 29px box ever would.

The arithmetic is done in JavaScript against a measured column rather than expressed in CSS, because every CSS formulation of "one scale factor" quietly stops being one the moment a constraint binds.

A useful side effect: because every segment is proportional, the strip becomes a true miniature of the scrolled document, so a segment's position in the strip corresponds to that page's position in the scroll.

Every page in this sample is 612×792, so it reads as a uniform column here. That is the correct output *for this document*, not a hardcoded assumption — feed it a mixed-format file and the anomaly shows up unprompted.

This recovers the whole-document view that the status bar gave up: *"pages 12 through 18 are a mess, the back half is clean."*

**Explicitly not thumbnails.** Rendering 34 more pdf.js canvases on top of the 34 already mounted is real cost, and at that size the images are unreadable anyway — you cannot tell page 22 from page 23 in a 60px thumbnail. What is wanted from this strip is the *pattern of problems*, not the pictures. Coloured rectangles deliver that for a fraction of the work.

### D5 — Simulated re-upload — **STRETCH GOAL, build last**

Not essential to the acceptance criteria. Built only after everything else is done, because it exists to *show* the loop rather than to satisfy a requirement.

A demo-only control simulates the round trip that really happens on the Upload Page:

1. Jane checks off the blockers she has fixed in her own system.
2. She clicks the demo's "simulate re-upload."
3. A mock reprocessor takes the current review, drops the issues she marked done, increments `version`, and returns a **new review object** — exactly the shape the real backend would return.
4. `canSubmit` re-derives from that new review and is now `true`, because that review genuinely contains no critical or major issues.

**The checkbox never unlocks the gate.** It tells the simulator what was fixed upstream. The gate opens because a new version arrived clean — which is the real product rule, faithfully modelled.

This must be visually and structurally distinct from the product UI (a labelled demo control, and simulation code that lives apart from product logic) so nobody reads it as the app letting users self-certify. Framed correctly it's a strength: *"I mocked the backend's reprocessing step so you can walk the whole loop — blocked, fixed, clean, submitted — from a single static mock."*

---

## 6b. Persisted state

Three things end up in `localStorage`, and they do **not** share a lifetime. Getting the scoping wrong here is a real bug, not a tidiness question — stale checkmarks leaking into a new version would tell the user a defect was handled when it wasn't.

| What | Scope | Key shape | Why that scope |
|---|---|---|---|
| Hide/show minor issues | User preference | global | It's about how Jane likes to work, not about this document. She'd want it to hold across every review she opens. |
| Split position | Device preference | global | Belongs to the screen she's sitting at. |
| Issue checkboxes | **This review, this version** | `review id + version` | When version 3 arrives with a fresh issue list, last version's checkmarks are meaningless. They must not carry over. |

**Open question for the backend:** do issue `id`s survive a re-parse? If `issue_1` in v2 and `issue_1` in v3 are unrelated defects, version-scoping is doing real work. Nothing in the spec says either way.

---

## 6d. Mobile-first

**Mobile-first here means the constrained case was designed first, not that the desktop layout survives being squeezed.** The distinction matters: this page will be opened on an iPhone and an iPad, and the split view that makes sense at 1440px is not a small version of what works at 390px — it's a different shape.

Practically that means base styles target the phone and breakpoints *add* complexity upward, which is also how Tailwind's `min-width` breakpoints work by default. The split view is an enhancement at `lg`, not a default being patched.

### The mobile constraint produced a better desktop architecture

The most useful thing to come out of taking the phone seriously is that it **broke an assumption we had already accepted on desktop.**

Acceptance criterion #1 forced every page to be mounted so native find can reach it (D1). On a phone that is dangerous: at devicePixelRatio 2, one full-width page canvas is roughly 10 MB, so 34 of them approaches 350 MB of canvas memory. iOS Safari discards tabs for less, and a viewer that reloads itself mid-review is worthless.

The resolution is a distinction we hadn't drawn: **the text layer is what find needs, and the canvas is what costs memory.** They're separable.

- **Every page's text layer is mounted whenever the document is on screen.** It's DOM spans — cheap. Whole-document `CMD+F` keeps working exactly as the criterion requires.

  **The qualification matters, so it is stated rather than glossed.** In the compact layout the two views are exclusive, and the one you are not looking at is `display: none` — which browser find cannot reach into. So on a phone, find searches the whole document *when you are on the Document tab*, and finds nothing while you are on the Issues tab.

  That is a real limit on acceptance criterion #1 and it was a deliberate choice over the alternative. Keeping the document mounted and merely moved off-screen would restore find in both tabs, but the match would then be highlighted somewhere the user cannot see, in a layout whose entire premise is one thing at a time — and it would hold all thirty-four text layers in the DOM permanently on the device where memory is actually scarce, which is the pressure this architecture exists to relieve. Find while looking at the document is the only moment anyone invokes it. **In the full layout the question doesn't arise**: both panels are always mounted, so find always covers the whole document.
- **Canvases render only for pages near the viewport**, in a window that widens on desktop and narrows on a phone. react-pdf's per-`<Page>` `renderMode` makes a page text-only until it comes near.

One viewer, one architecture, a single tuning constant that differs by device — rather than two code paths that drift. And it's strictly better on desktop too: mounting 34 canvases was never a good idea, it was just survivable.

This is the mobile-first argument in its most honest form. Not *"it also works on phones."* Designing for the phone found a real defect in the desktop design.

### Layout by form factor — **two shapes, and the boundary is 1024px**

There are exactly two layouts. Not three.

| Shape | Applies | What it is |
|---|---|---|
| **Compact** (`< lg`) | Every phone, **every iPad in portrait up to 1024**, every Stage Manager and Split View window, and a narrow desktop browser | One thing at a time behind a segmented control — **Issues / Document**. Verdict and submit merge into one bottom bar. No thumb strip, no resizer. |
| **Full** (`≥ lg`, 1024px) | Every iPad in landscape, the 13" iPad **in portrait**, and every desktop | The sketch: issues panel and viewer side by side with a draggable resizer, thumb strip down the viewer edge, full metadata in the header. |

**Why 1024 rather than 768.** The full shape carries two controls the compact shape does without — the resizer and the thumb strip — and both need room to be operated. At 768 an issues panel wide enough to read leaves a document column too narrow to. The rule is about *the window*, not the device, which is what makes the Stage Manager case correct without special-casing it.

**The consequence, accepted deliberately:** an 820pt iPad in portrait shows one panel where two would nearly fit. That is the honest trade — a 520pt document column is a bad way to read a document that wants the width.

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

**The verdict and the submit button merge into one bottom bar.** A 390-point-wide screen can't afford separate chrome for each — but the merge is also *better than the desktop arrangement*. The blocking count sits directly against the button it is blocking, which is the plainest possible statement of acceptance criterion #3, and the bottom of the screen is both thumb reach and where iOS puts primary actions.

**The nav bar collapses to a back chevron, a truncated title and an overflow.** Version, uploaded-at and assigned user move behind the `⋯` — they're reference data you consult, not things you act on, so they lose the fight for vertical space.

**Tapping an issue switches to the Document tab at that page.** The same intent as the desktop click, expressed as navigation instead of as a scroll in an adjacent panel. Returning is one tap.

**The thumb strip is dropped here, not miniaturised.** Not for want of touch targets — as a scrub control it works fine under a thumb (D6). It is dropped because it costs *width*, and it is the third of three redundant routes to a page: the list and the status bar both survive without it. A cramped horizontal version would be worse than its absence. A deliberate removal, not an oversight.

**A segmented control, not a bottom tab bar.** Two views is not a tab bar's job, and the bottom edge is already carrying the verdict and the submit button.

### iOS specifics that actually bite

- **`100dvh`, never `100vh`.** iOS Safari's `vh` ignores the browser chrome, so a full-height layout gets clipped and the submit button ends up under the toolbar.
- **Safe areas.** `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, or the home indicator sits over the controls at the bottom of the screen.
- **Nothing may depend on hover.** The status-bar labels reveal an issue's description on hover — on touch that has to be tap-to-expand. Any hover-only affordance is an unreachable feature on half our target devices.
- **Touch targets are 44px minimum**, and the thumb strip looks like it fails this — 34 segments at 44px would need 1,496px of column. It doesn't fail, because it is a **single scrub control rather than 34 buttons** (D6): one target, 44px wide, as tall as the panel. The rule that actually binds is on the issue rows, which take the full row as their target with the checkbox getting its own.
- **Momentum scrolling and a rAF scroll handler.** The reading-line measurement runs on scroll; on iOS that fires during momentum and must stay cheap. It already exits its loop early and is rAF-throttled.
- **`CMD+F` doesn't exist on a phone, but find does.** iOS Safari reaches it two ways: **Share sheet → Find on Page**, and by typing in the address bar and choosing **"On This Page — Find …"** at the bottom of the suggestions. Android Chrome puts it in the ⋮ menu as **Find in page**. All of them search rendered DOM text, which is exactly what our mounted text layers are — so the criterion is met by the platform's own find on every platform that has one. It is a browser affordance we can't invoke or point at, which is worth saying out loud rather than implying the app provides it.

- **Which is why the app is installable but not standalone.** `display: standalone` is what usually makes a PWA feel like an app, and it does that by removing the browser chrome — the share sheet and the address bar, which is precisely where iOS keeps Find on Page. Installing it that way would delete the affordance acceptance criterion #1 depends on.

  So the manifest ships **`display: browser`**, and `apple-mobile-web-app-capable` is deliberately absent because on iOS it forces standalone regardless of what the manifest says. You still get our icon on the home screen; tapping it opens Safari with its chrome intact, and find keeps working. Trading the app-like frame for a graded acceptance criterion is not a close call — and it is a good illustration of why "make it a PWA" is a set of separate decisions rather than one switch.

### What "tested on mobile" means here

**Xcode's iOS Simulator, iPhone and iPad, in Safari** — not a resized desktop window. That distinction matters: the Simulator runs real WebKit, so it faithfully reproduces the things most likely to break — `dvh` versus the browser toolbar, safe-area insets, momentum scrolling, and iOS Safari's own CSS behaviour. A narrow Chrome window reproduces none of them. It also shares the host's network, so the dev server is reachable at `localhost` with no extra setup.

**What the Simulator cannot show us is the memory ceiling.** It runs on the Mac's RAM, so canvas usage that would get a real iPhone's tab discarded simply works there. That is exactly the risk the text-layer/canvas separation exists to avoid — so the windowing is built conservatively and treated as *reasoned*, not *proven*. Verifying it needs a physical device, and that limitation is named in the production-readiness writeup rather than quietly assumed away.

---

## 6c. Accessibility

**This is a deliberate strength of the build, not a checklist at the end.** The reasoning is domain-specific: this is a compliance tool in a regulated industry, used all day by people doing careful work. If it isn't operable without a mouse, it isn't finished.

The work splits three ways, and only the first is free:

1. **Inherit** — Radix, via shadcn, supplies focus management, ARIA wiring, keyboard interaction and dismiss layers for the primitives.
2. **Audit** — inherited is not the same as verified. What a library emits still has to be checked against what this page needs, and in one case below the library default is the wrong call for us.
3. **Extend** — the system has no splitter, so we author one to the same standard rather than shipping a mouse-only gap.

### Why a component library — and which one

I considered **not** using one. Given the small number of controls on this page, browser-native accessibility genuinely covers most of it. Here is the inventory I made:

| Control | What provides the accessible behaviour |
|---|---|
| Back link | `<a href>` — native |
| Sort by page / severity | `<select>` — native |
| Hide/show minor issues | `<input type="checkbox">` — native |
| Issue title (jump to page) | `<button>` — native |
| Status-bar labels, strip segments, page controls | `<button>` — native |
| Submit | `<button>` + `aria-disabled` + `aria-describedby` |
| Confirmation modal | `<dialog>` + `showModal()` — **native**: focus trap, focus return, escape, background inertness, `aria-modal`. *(We ended up using the system's Dialog instead — see below.)* |
| Panel splitter | Hand-written WAI-ARIA separator: a `role`, four ARIA attributes, an arrow-key handler |

Nine of those ten are a native element doing its job, and the one genuinely hard piece — the modal, where hand-rolled dialogs usually go wrong on focus trapping and focus return — the platform now handles too, via `<dialog>`. On the evidence of this page alone, a component library looked like a dependency added to wrap controls the browser already ships.

**Then I remembered what this page actually is.**

It is one screen of four in the spec's own flow diagram, and the Document Review product is bigger than those four. In the real repo I would not be authoring a checkbox — I'd be importing `<Checkbox>` from the system that already exists, and the interesting question would be whether that system already has a splitter and a severity chip, or whether this page is the third call site that finally justifies promoting them.

**Deciding "no component library" from a ten-control sample is exactly the reasoning that produces component soup.** Every screen looks small enough to hand-roll. Twenty screens later you have twenty slightly different buttons and nobody remembers which is canonical. The decision has to be made for the suite, not for the page.

So: a component library, from the start.

### Why shadcn/ui specifically

**shadcn is not a runtime dependency — it copies source into the repo.** That resolves the tension rather than trading one side away:

- **Depend on the hard behaviour.** Radix underneath: focus management, ARIA wiring, keyboard interaction, dismiss layers. The parts that are difficult, security- and accessibility-critical, and genuinely worth not reinventing.
- **Own the skin.** The markup and styling live in *our* files and are ours to edit. No fighting a vendor's opinions from the outside.
- **Tokens are the unifying layer.** CSS variables mean severity colour is defined once and consumed by every surface that renders severity — here that's three of them: list rows, status-bar labels, and the strip.
- **Stays current without being an abandoned fork.** The registry lets you re-pull upstream and diff against local customisations — owned, but re-syncable.

That is the same "own the skin, depend on the behaviour" split applied honestly, rather than a blanket position in either direction.

### What we still author ourselves

**The splitter.** Radix has no such primitive — `@radix-ui/react-resizable` and `@radix-ui/react-splitter` do not exist, and `@radix-ui/react-separator` is a *decorative divider*, not a draggable one, despite the name collision with `role="separator"`.

That isn't a gap, it's the interesting part: it's a new primitive being added to the system, following the system's conventions — cva variants, the same token layer, and the full WAI-ARIA window-splitter pattern (`role="separator"`, focusable, `aria-orientation`, `aria-valuenow/min/max`, arrow keys to nudge, Home/End to snap). Consuming a design system is table stakes; extending one correctly is the actual work.

**The domain components** — `IssueRow`, `SeverityChip`, `PageStrip`, `StatusBar` — are composed *from* the primitives rather than invented alongside them. That composition boundary is the thing that keeps a system coherent as the product grows: primitives stay generic and few, domain components stay specific and many.

### Where accessibility changed a design decision

**The submit button is `aria-disabled`, not `disabled`.** A `disabled` button is removed from the tab order and announces nothing — a keyboard user tabs straight past the most important control on the page and is never told why it isn't available. Instead it stays focusable and carries `aria-disabled="true"` plus `aria-describedby` pointing at the blocking summary, so reaching it says *"Submit review, dimmed — 12 issues must be fixed before you can submit."* The click handler no-ops while blocked. This is the single highest-value a11y decision in the app, because it's the one place where the visual design already communicates something the accessible layer otherwise wouldn't.

**An issue row is not one big clickable `div`.** Each row holds two independent controls — a button (jump to this issue's page) and a checkbox (my private note) — so it cannot be a single clickable region, and nesting a checkbox inside a button is invalid. The row is an `<li>` containing a real `<button>` for the title and a real `<input type="checkbox">` with its own label.

**The verdict is a live region.** When the gate opens, or the minor filter changes what's listed, the summary announces. Otherwise a screen reader user checks something off, the state changes materially, and nothing tells them.

**The confirmation uses the system's Dialog (Radix underneath), not a native `<dialog>`.** Native `<dialog>` + `showModal()` would give the same focus trap, focus return, escape and inertness for free, and I considered it — but once a system exists, a screen that opens modals its own private way is the first crack in the system. Consistency with the primitive layer beats platform purity here. It's worth knowing both work; it's worth picking the one the next screen will also use.

**Severity is never colour alone.** Colour plus an icon plus the text label, everywhere severity appears — list rows, status bar labels, and the strip.

### The rest

- Landmarks: `header`, the issues panel, `main` for the viewer. Skip link to the document.
- The splitter implements the WAI-ARIA window-splitter pattern: `role="separator"`, focusable, `aria-orientation`, `aria-valuenow/min/max`, arrow keys to nudge and Home/End to snap.
- The back link is a real anchor with a real `href`, never `href="#"`.
- Visible focus everywhere. Outlines are never removed.
- Jumping to a page scrolls smoothly, so the movement shows you where you went — unless `prefers-reduced-motion` is set, in which case it jumps.
- Every icon-only control has an accessible name.

### The honest limitation

**A rendered PDF is not accessible, and we should say so rather than imply otherwise.** pdf.js paints a canvas and overlays absolutely-positioned text spans; the reading order that produces is unreliable, and none of the document's structure — headings, tables, reading order — survives. Whole-document `CMD+F` works because the text is in the DOM, but that is not the same as the document being navigable by a screen reader.

We are not going to fix that client-side, and pretending otherwise would be worse than naming it. The real answer is server-side: tagged/structured PDF, or an accessible HTML rendering of the extracted content served alongside the visual one. That goes in the production-readiness writeup as a known gap with a named fix.

---

## 7. Assumptions and open questions

- **The Ashby version of the assignment contains one paragraph the PDF does not:** *"develop a system that detects and classifies checkboxes in document images."* Nothing downstream — ticket, API, acceptance criteria — mentions checkboxes again, and the cleaned-up PDF drops it entirely. Treating it as leftover boilerplate from a different challenge. Worth a one-line confirmation to David.
- **The mock is authored as a parse of the supplied PDF, and mostly checks out** (GLA 2,450 sq ft, basement 65%, cost approach $306,844 all match page 3 exactly). A couple don't — issue #2 cites a date the document doesn't contain, and issue #1 reports a missing summary on the page that *is* the summary. Not worth chasing; noted so nobody assumes the mock is gospel.
- **Status:** the mock is `on_review`. What this page should do for `created` / `processing` / `submitted` is unspecified. Presumably the user is routed elsewhere — those are other pages in the diagram.
- **Is there a re-upload CTA on this page?** The flow diagram loops back to the Upload Page, but that's a teammate's screen. Probably a link out, not a real upload.

---

## 8. Bonus artifacts to deliver

1. Development approach + what most required expertise.
2. **UX sketches — ✅ [`wireframes/UNDIRT_wireframes.svg`](wireframes/UNDIRT_wireframes.svg)**, drawn in Google Drawings *before* the build. [Live source](https://docs.google.com/drawings/d/1P1lXCZPaLolqYNq0aOk2XJNdWGl8UmqJt4W83rlUnVE/edit?usp=sharing). Kept as-is even where the final implementation differs — they record intent, not a spec.
3. What's required for a production deployment.

### The README is a deliverable too

It is the first file anyone opens, and it is read by people arriving two different ways — from a cloned private repo and from an unzipped archive. It must carry, at minimum:

- **A quickstart that works from cold**, for someone who has never seen this repo: clone *or* unzip, install, run, test, and the `?demo` route. Assume nothing about their toolchain beyond a package manager.
- **An accessibility section.** Accessibility is a stated strength of this build rather than a checklist pass (§6c), so the README has to say what was done, what it buys, and — just as importantly — the honest limitation that a rendered PDF is not accessible.
- **A dependency table**: every package we chose to add, its version, and one line on the job it does. **Direct dependencies only** — what is written in `package.json`, not the resolved tree. The short list is part of the argument, and every line in it should be defensible on the spot.

---

## Decision log

| Date | Decision | Alternatives | Why |
|---|---|---|---|
| 2026-08-14 | Vite + React + TypeScript | Next.js | No SSR need for a post-upload page behind auth. Every line explainable. Next.js is not yet shipped experience — choosing it would mean defending framework behavior not personally lived. |
| 2026-08-14 | ~~Hand-rolled components + CSS tokens on `main`; a second branch on a component library~~ **SUPERSEDED** — see the shadcn row below | — | Reversed once the framing changed from "this page" to "one screen in a suite." shadcn also collapses the two-branch idea: you own the source *and* depend on the behaviour in one codebase, so there is no second side left to demonstrate. |
| 2026-08-14 | Scope: no in-browser fixing, no real backend, no versioning | Simulating the re-upload loop | The spec puts resolution outside the app. Simulating it would misrepresent the product. |
| 2026-08-14 | **UNDIRT does no uploading. It is a gate.** The re-upload loop exits the page. | An upload control on the Review Page; simulating the version bump | The flow diagram gives re-upload to the Upload Page — a teammate's ticket. Owning it would be building someone else's screen and blurring the one job this page has. |
| 2026-08-14 | **Continuous-scroll PDF viewer**, all pages and text layers mounted | Single page at a time; single page + hijacked CMD+F | Native CMD+F only finds text in the DOM. Whole-document search is an acceptance criterion, so the viewer architecture follows from it. Virtualization is the production answer at larger page counts. |
| 2026-08-14 | **`react-pdf`** as the renderer, wrapping Mozilla's `pdf.js` | Raw `pdfjs-dist`; commercial SDKs (Nutrient/PSPDFKit, Apryse) | `pdf.js` is the only serious open engine — Mozilla-owned, in Firefox, ~53k stars, since 2011, ~23M weekly downloads. `react-pdf` is a thin, maintained React binding over it (npm since 2014, v10, ~5M weekly) that adds no rendering of its own, so I get the heavy-hitter engine and skip writing the text-layer/worker glue. Raw `pdfjs-dist` = re-inventing a solved binding; commercial SDKs = annotation/licensing overkill for a read-only screen. |
| 2026-08-14 | Issues list sorts by **page order by default**, with a severity sort available | Severity-first default | Jane works through the document in page order when she goes to fix things. "What's blocking" is communicated by the summary above the list, not by the list's ordering. |
| 2026-08-14 | Simulated re-upload is a **stretch goal, built last** | Building it alongside the core; skipping it entirely | It satisfies no acceptance criterion. It exists to demonstrate the loop, so it earns its place only once the required work is done. |
| 2026-08-14 | Checkboxes feed the **simulator**, never `canSubmit` | Letting checked blockers directly unlock submit | Reads correctly in the code and models the real rule: the gate opens because a new clean version arrived, not because a user asserted it. |
| 2026-08-14 | Submit asks for **confirmation naming the unresolved minors** | Submitting straight through | "Minor may be ignored" is a choice the user makes. One-way door, no undo, mortgage file — she should acknowledge it once. |
| 2026-08-14 | Render the **terminal submitted state in place**; label it "Submitted" | Navigate to a stub Submitted Page; label it "Reviewed" | `status: submitted` is a value the API can return, so this page must handle it regardless of the button. "Submitted" matches the data and carries the finality; "Reviewed" implies a state you could leave. |
| 2026-08-14 | **No un-submit / mark-for-re-review** | A reopen control | Not a scope call — the transition doesn't exist. No reopened status in the enum, one-way arrow in the flow diagram, and submission is an external event. Corrections happen via a new version. |
| 2026-08-14 | **Thumb strip** down the viewer edge — one coloured segment per page | Rendered page thumbnails | 34 extra pdf.js renders for images too small to read. The strip's job is showing *where the problems cluster*, which coloured rectangles do better and for ~30 lines. Uses the per-page `height`/`width` the API gives us. |
| 2026-08-14 | **Page-margin markers**, numbered in page order, labelled with the real issue title, severity by colour **and** icon | In-page highlighting via LLM lookup, via text-matching literals, or with a derived category taxonomy | The data gives `page` and no coordinates — anything drawn inside a page is an unsupported claim about position. Text-matching works for only ~half the issues with no way for a user to tell a correct miss from a bug. And absence-type issues ("Missing Summary of Findings") can never be highlighted by any technique. Bounding boxes from the backend are the production answer. |
| 2026-08-14 | **Scroll restore across reloads — CUT** | Persisting a page number, restored on the viewer's render signal | Gold-plating. Satisfies no acceptance criterion, and correct restore is more work than it appears: no page geometry exists at mount, so it must hang off the render signal and fire exactly once or scrolling away snaps the user back. Documented in Out of Scope rather than deleted, so the reasoning survives the question. |
| 2026-08-14 | **Accessibility is a deliberate strength**, not a checklist pass. Resizer keyboard support back **in scope** | Shipping it mouse-only as a documented gap | The cut was priced wrong: the WAI-ARIA separator pattern is a `role`, four ARIA attributes and an arrow-key handler on top of pointer logic we're writing anyway. "I skipped accessibility" is also the one gap in that list a frontend reviewer would actually poke at — and this is a compliance tool used all day by people doing careful work. |
| 2026-08-14 | **shadcn/ui + Tailwind from the start** (Radix underneath) | Browser-native only; Radix directly; a runtime component library | I considered browser-native only — with ten controls it genuinely covers most of it, and native `<dialog>` handles the one hard piece. But this page is one screen of four in the spec's own diagram, inside a product that will certainly already have components to reach for. Deciding "no library" from a ten-control sample is precisely the reasoning that produces component soup: every screen looks small enough to hand-roll, and twenty screens later there are twenty slightly different buttons. shadcn resolves it rather than trading a side away — Radix behaviour underneath, source copied into the repo so the skin is ours, CSS-variable tokens, re-syncable from the registry. |
| 2026-08-14 | **Mobile-first**: phone layout is the base, split view is an enhancement at `lg`. **All text layers mounted, canvases windowed** | Mounting every canvas (the original D1 plan); a separate mobile build; desktop-only | ~10 MB per full-width canvas at DPR 2 means 34 pages approach 350 MB — iOS Safari discards tabs for less. Separating the text layer (what find needs, cheap) from the canvas (what costs memory) preserves acceptance criterion #1 on every device and is strictly better on desktop too. One architecture, one tuning constant, no second code path to drift. |
| 2026-08-14 | Page wrappers get their **height reserved from the API's page dimensions** before the canvas paints | Letting pages size themselves as they render | Pages render asynchronously, so an unreserved document has almost no height while it loads and any scroll target lands in the wrong place. The `height`/`width` fields turn out to be what makes navigation correct, not just strip decoration. |
| 2026-08-14 | Current page is **measured against a reading line**, not observed | `IntersectionObserver` on each page | Observer callbacks fire only on threshold crossings, so distant pages report stale ratios and a page taller than the viewport never reaches the higher thresholds — the reading froze after one scroll. Measuring which page's top last passed a fixed line is deterministic and holds for oversized pages. |
| 2026-08-14 | Every overlay sits **above `z-index: 3`** | Leaving overlays at the default stacking | react-pdf's `.textLayer` is `z-index: 2` and `.annotationLayer` is `z-index: 3`. At equal z-index the pages win on DOM order and their invisible text covers the UI — it looks fine and silently eats every click. |
| 2026-08-14 | Scroll is **smooth, but honours `prefers-reduced-motion`** | Always smooth; always instant | Animating the movement shows the user *where* they went; a hard jump doesn't. For people who have asked for reduced motion, a long smooth scroll is nauseating rather than informative. |
| 2026-08-14 | The **splitter is authored by us**, to system conventions | A splitter library; leaving it mouse-only | Radix has no splitter primitive. Writing it is the demonstration rather than the gap: a new primitive added to the system following its conventions, with the full WAI-ARIA window-splitter pattern. Consuming a system is table stakes; extending one correctly is the job. |
| 2026-08-14 | Submit uses **`aria-disabled`, not `disabled`** | A genuinely `disabled` button | `disabled` drops the button out of the tab order and announces nothing, so a keyboard user tabs past the most important control on the page and is never told why. Focusable + `aria-disabled` + `aria-describedby` on the blocking summary means reaching it explains itself. Click handler no-ops while blocked. |
| 2026-08-14 | **Two layouts, not three. The boundary is 1024px** | A third shape for iPad portrait, splitting at 768 | The middle shape was the least-designed thing in the document and the most work to justify. Collapsing it answers four open iPad questions at once — thumb strip, resizer, bottom bar, header metadata all belong to the full shape and nothing has to be half-built for a middle case. 1024 rather than 768 because at 768 an issues panel wide enough to read leaves a document column too narrow to. The rule is about the *window*, so iPad Split View and Stage Manager come out right with no special case. Cost accepted: an 820pt iPad portrait shows one panel where two would nearly fit. |
| 2026-08-14 | **The full layout is a touch layout**, not "the desktop layout" | Treating `lg`+ as pointer-only | The 13" iPad is 1024 CSS px wide *in portrait*, so the full shape appears on a touch screen before anyone rotates anything. Everything in it is therefore built to touch standards: Pointer Events over mouse events, 44px grab zones, `touch-action: none` on drag surfaces, `overscroll-behavior: contain` on the panels, and no essential affordance behind `:hover`. Rotating an iPad crossing 1024 flips between the two designs, which also happens to be the clearest demonstration that the full shape isn't the compact one stretched. |
| 2026-08-14 | The thumb strip is **one scrub control, not 34 buttons** | 34 individually clickable segments | 34 targets at the 44px minimum need 1,496px of column, which is what appeared to kill the strip on touch. As a single press-and-drag control the minimum applies once — 44px wide, full panel height — and the strip survives everywhere. Same interaction as the iOS index scrubber. It also earns slider semantics for free: `role="slider"`, `aria-valuenow` on the page number, arrow keys and Home/End, so a control designed for a thumb delivers keyboard navigation of the whole document. Forces a readout that follows the thumb, since a finger covers what it points at. |
| 2026-08-14 | **One `focusedPage`, three views of it.** The thumb strip marks it, the issues on it highlight in the list, the status bar names them | Independent state per region | Everything on screen answers the same question — *what am I looking at* — so it is one value, not three features that can disagree. Scroll position is its only writer: clicking an issue or dragging the strip *scrolls*, and the highlight follows arrival. Otherwise the reading line reports every page the smooth scroll passes through and the list strobes on the way to page 17. Not colour-only: `aria-current` on the strip segment and the highlighted rows, with the status bar as the text channel. |
| 2026-08-14 | **The issues list never scrolls itself** | `scrollIntoView({ block: 'nearest' })` on the focused page's first issue | I proposed the auto-scroll and it was the wrong call. The list is the user's — they scrolled it somewhere on purpose, and having it move under them because the document scrolled is exactly the irritation that makes a panel feel possessed. The highlight is enough: if it's off-screen the status bar still names the issues on the page, which is the third of the three redundant routes doing its job. |
| 2026-08-14 | The thumb strip's scale factor is **computed in JS from a measured column**, not expressed in CSS | Percentage heights + `aspect-ratio`; a per-segment `min-height` floor | Every CSS formulation of "one scale factor" stops being one factor the moment a constraint binds — a clamped segment gets its own, and rendered a short page *wider* than a full page. Fitting height alone ignored width and blew a four-page document out of a 44px column; percentage heights plus a flex `gap` overflowed by `(n−1) × gap` on every viewport, putting the last pages below the fold of a control you drag rather than scroll. All three were invisible against a uniform Letter fixture. Measuring is the only version that is actually the rule the document describes. |
| 2026-08-14 | **The verdict is a component that takes the whole `review`**, never a list of issues | Computing it inside the issues panel from the array being rendered | The panel renders a *view* — sorted now, filtered next — and a verdict derived from the view under-reports the moment anything is hidden, while looking like it works. Taking `Review` makes that mistake unrepresentable rather than merely unlikely. It also fixed a second bug in the same place: the copy was hardcoded to the blocked state, so a clean document read "0 issues must be fixed / before you can submit" — overfitting the one thing D4 says must not be overfitted. |
| 2026-08-14 | **Theme is a user setting** — system / light / dark, from the account menu | System preference only; no dark mode at all | The palette was already authored and completely unreachable, so an iPhone in dark mode rendered white. Resolving the three-value preference in JS and letting CSS see only a `.dark` class keeps one definition of dark instead of a class rule and a media query that can drift. Device-scoped rather than account-scoped: which theme suits you depends on the screen and the room, not on who you are. An inline script applies it before first paint, because the alternative is a white flash on every load. |
| 2026-08-14 | **The payload is validated at the boundary**, not asserted with `as Review` | Trusting the cast; a schema library | The app's central claim is that it isn't overfitted to the supplied mock — which needs a boundary that actually looks. Without one, `issues: null` sailed straight past the error state built for it and died inside a render, and an unrecognised severity degraded *silently* into an uncoloured dot and a `NaN` count. Hand-written in ~20 lines rather than a dependency, because the short dependency list is part of the argument. Raw parser messages stopped reaching the UI at the same time. |
| 2026-08-14 | **Two test suites, two runners** — vitest on the rules, Playwright on the layout | One runner; screenshot baselines | The rules are pure functions, so they test fastest with no DOM at all. Layout is the opposite: jsdom has no layout engine, so the entire class of bug the layout suite exists to catch is the class jsdom cannot see. No screenshot baselines — WebKit and Chromium rasterise type differently, so they would need a set each and would churn on every change; structure is what's actually invariant. The suite earned itself immediately by catching a 32px submit button under the 44px minimum. |
| 2026-08-14 | **The compact layout hides the inactive view with `display: none`**, so find-on-page reaches the document only from the Document tab | Keeping the document mounted and moved off-screen; a `visibility`/`clip` variant | Restoring find in both tabs would highlight a match somewhere the user cannot see, in a layout whose premise is one thing at a time — and it would pin all 34 text layers in the DOM permanently on the device where memory is actually scarce, which is the pressure the text-layer/canvas split exists to relieve. Find while looking at the document is the only moment anyone invokes it. §6d's claim was an absolute and is now qualified; the full layout is unaffected because both panels are always mounted. |
| 2026-08-14 | **PWA ships `display: browser`. The browser chrome is load-bearing, so we keep it** | `display: standalone`, which is what "make it a PWA" usually means | Standalone is the app-like option and it removes the browser chrome — which is exactly where iOS keeps Find on Page. There is no share sheet and no address bar in a standalone window, so installing the app would delete the affordance acceptance criterion #1 depends on. Chrome over polish: an installed icon that opens into Safari keeps whole-document search working on the device we most want to test on. `apple-mobile-web-app-capable` is deliberately absent for the same reason — on iOS it forces standalone regardless of the manifest. The alternative is building find into the page, which D1 declined *because the platform had one*; that reasoning inverts the moment the platform's is taken away, so the cheaper move is to not take it away. |
| 2026-08-14 | **No pinch-to-zoom — CUT** | Handling the gesture and re-rendering pages at a new scale; letting the browser zoom the page | The expected gesture on an iPad and a real gap, so it is named rather than hidden. Doing it properly reaches into the reserved page heights and the reading-line measurement, both load-bearing. Letting the browser zoom is a one-liner that breaks a fixed app shell. Deferred with the consequence stated: on a tablet the page renders at the width we choose and cannot be magnified. |

---

## Attribution ledger

_Honest record of who drove what, so the walk-through is defensible._

- **Andrew:** the scope boundary (in/out); recognizing the JSON is metadata rather than content, not a source to reconstruct the document from; the checkbox todo-list idea; the instinct to mark issues in the document; page-order default sort with a severity toggle; the status bar and the page strip; **the reversal to a component library** — that deciding "no library" from a ten-control sample is the reasoning that produces component soup, because this page is one screen in a suite; and the call that accessibility should be a genuine strength of the demo rather than a checklist.
- **Andrew checked** react-pdf's `CMD+F` behaviour and render quality in its live demo before the library was committed to — the riskiest assumption in the build, looked at rather than trusted. He also made licensing part of the criteria: MIT over anything commercial, in a regulated industry where dependency terms are a procurement question.
- **Claude Code proposed:** the continuous-scroll viewer, on the grounds that native CMD+F only searches the DOM (D1); the "checkbox must not gate submit" constraint and the simulated-reprocessor framing that preserves it (D3/D5); the observation that absence-type issues can never be highlighted by any technique; `aria-disabled` over `disabled` on submit; shadcn as the specific library that resolves own-vs-import rather than picking a side; the localStorage scoping table.
- **Corrected by Andrew:** that a proportional page strip must scale *both* dimensions — my "uniform height, variable width" rule would have rendered Legal and Letter identically, hiding the most common real anomaly. Also that the page numbers in the strip are load-bearing rather than decoration.
