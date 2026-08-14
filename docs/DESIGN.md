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
- **Rendered page thumbnails in the severity strip.** 34 extra pdf.js renders producing images too small to read. The strip's job is showing where problems cluster, which coloured rectangles do better and for a fraction of the work (D6).

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
| 1 | See the document, search text across the entire PDF with CMD+F | PDF rendered with a text layer for **every** page, all in the DOM at once |
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

### D6 — Document severity strip (minimap) — **DECIDED: cheap version**

A vertical strip down the edge of the viewer, one segment per page, mapping onto scroll position the way a scrollbar does:

- Each segment is a **page-shaped rectangle carrying its page number**.
- Inside it, **one coloured bar per issue on that page**, in that issue's severity colour — so page 14 visibly has three marks and page 4 has none. Richer than a single worst-severity fill: you see both severity and volume at a glance.
- Clean pages are empty rectangles.
- The **current viewport position** is marked.
- **Click a segment to jump** to that page.
- Aspect ratio comes from the `height`/`width` the API already gives us per page — otherwise unused data.

**Not rendered thumbnails.** Plain rectangles, no pdf.js involved.

**Sizing rule: one scale factor, applied to every page's real dimensions.**

Each segment is that page's actual `width` × `height` from the API, multiplied by a single shared scale factor. Both dimensions scale. Nothing is normalised.

This is the only rule that catches the cases that matter:

- **Legal (612×1008) next to Letter (612×792)** — same width, different height. A taller segment, immediately visible. Any rule that fixed the height would render these identically and hide the most common real anomaly.
- **A landscape page** — wider and shorter, breaks the column.
- **An oversized exhibit** — bigger in both directions.

The scale factor is chosen to fit the whole document in the available height when it can, with a floor that keeps a two-digit page number legible in the *smallest* page. Below that floor the strip scrolls. Fits whole on a tall monitor, scrolls a little on a laptop.

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

---

## Decision log

| Date | Decision | Alternatives | Why |
|---|---|---|---|
| 2026-08-14 | Vite + React + TypeScript | Next.js | No SSR need for a post-upload page behind auth. Every line explainable. Next.js is not yet shipped experience — choosing it would mean defending framework behavior not personally lived. |
| 2026-08-14 | ~~Hand-rolled components + CSS tokens on `main`; a second branch on a component library~~ **SUPERSEDED** — see the shadcn row below | — | Reversed once the framing changed from "this page" to "one screen in a suite." shadcn also collapses the two-branch idea: you own the source *and* depend on the behaviour in one codebase, so there is no second side left to demonstrate. |
| 2026-08-14 | Scope: no in-browser fixing, no real backend, no versioning | Simulating the re-upload loop | The spec puts resolution outside the app. Simulating it would misrepresent the product. |
| 2026-08-14 | **UNDIRT does no uploading. It is a gate.** The re-upload loop exits the page. | An upload control on the Review Page; simulating the version bump | The flow diagram gives re-upload to the Upload Page — a teammate's ticket. Owning it would be building someone else's screen and blurring the one job this page has. |
| 2026-08-14 | **Continuous-scroll PDF viewer**, all pages and text layers mounted | Single page at a time; single page + hijacked CMD+F | Native CMD+F only finds text in the DOM. Whole-document search is an acceptance criterion, so the viewer architecture follows from it. Virtualization is the production answer at larger page counts. |
| 2026-08-14 | Issues list sorts by **page order by default**, with a severity sort available | Severity-first default | Jane works through the document in page order when she goes to fix things. "What's blocking" is communicated by the summary above the list, not by the list's ordering. |
| 2026-08-14 | Simulated re-upload is a **stretch goal, built last** | Building it alongside the core; skipping it entirely | It satisfies no acceptance criterion. It exists to demonstrate the loop, so it earns its place only once the required work is done. |
| 2026-08-14 | Checkboxes feed the **simulator**, never `canSubmit` | Letting checked blockers directly unlock submit | Reads correctly in the code and models the real rule: the gate opens because a new clean version arrived, not because a user asserted it. |
| 2026-08-14 | Submit asks for **confirmation naming the unresolved minors** | Submitting straight through | "Minor may be ignored" is a choice the user makes. One-way door, no undo, mortgage file — she should acknowledge it once. |
| 2026-08-14 | Render the **terminal submitted state in place**; label it "Submitted" | Navigate to a stub Submitted Page; label it "Reviewed" | `status: submitted` is a value the API can return, so this page must handle it regardless of the button. "Submitted" matches the data and carries the finality; "Reviewed" implies a state you could leave. |
| 2026-08-14 | **No un-submit / mark-for-re-review** | A reopen control | Not a scope call — the transition doesn't exist. No reopened status in the enum, one-way arrow in the flow diagram, and submission is an external event. Corrections happen via a new version. |
| 2026-08-14 | **Severity strip** down the viewer edge — one coloured segment per page, click to jump | Rendered page thumbnails | 34 extra pdf.js renders for images too small to read. The strip's job is showing *where the problems cluster*, which coloured rectangles do better and for ~30 lines. Uses the per-page `height`/`width` the API gives us. |
| 2026-08-14 | **Page-margin markers**, numbered in page order, labelled with the real issue title, severity by colour **and** icon | In-page highlighting via LLM lookup, via text-matching literals, or with a derived category taxonomy | The data gives `page` and no coordinates — anything drawn inside a page is an unsupported claim about position. Text-matching works for only ~half the issues with no way for a user to tell a correct miss from a bug. And absence-type issues ("Missing Summary of Findings") can never be highlighted by any technique. Bounding boxes from the backend are the production answer. |
| 2026-08-14 | **Scroll restore across reloads — CUT** | Persisting a page number, restored on the viewer's render signal | Gold-plating. Satisfies no acceptance criterion, and correct restore is more work than it appears: no page geometry exists at mount, so it must hang off the render signal and fire exactly once or scrolling away snaps the user back. Documented in Out of Scope rather than deleted, so the reasoning survives the question. |
| 2026-08-14 | **Accessibility is a deliberate strength**, not a checklist pass. Resizer keyboard support back **in scope** | Shipping it mouse-only as a documented gap | The cut was priced wrong: the WAI-ARIA separator pattern is a `role`, four ARIA attributes and an arrow-key handler on top of pointer logic we're writing anyway. "I skipped accessibility" is also the one gap in that list a frontend reviewer would actually poke at — and this is a compliance tool used all day by people doing careful work. |
| 2026-08-14 | **shadcn/ui + Tailwind from the start** (Radix underneath) | Browser-native only; Radix directly; a runtime component library | I considered browser-native only — with ten controls it genuinely covers most of it, and native `<dialog>` handles the one hard piece. But this page is one screen of four in the spec's own diagram, inside a product that will certainly already have components to reach for. Deciding "no library" from a ten-control sample is precisely the reasoning that produces component soup: every screen looks small enough to hand-roll, and twenty screens later there are twenty slightly different buttons. shadcn resolves it rather than trading a side away — Radix behaviour underneath, source copied into the repo so the skin is ours, CSS-variable tokens, re-syncable from the registry. |
| 2026-08-14 | The **splitter is authored by us**, to system conventions | A splitter library; leaving it mouse-only | Radix has no splitter primitive. Writing it is the demonstration rather than the gap: a new primitive added to the system following its conventions, with the full WAI-ARIA window-splitter pattern. Consuming a system is table stakes; extending one correctly is the job. |
| 2026-08-14 | Submit uses **`aria-disabled`, not `disabled`** | A genuinely `disabled` button | `disabled` drops the button out of the tab order and announces nothing, so a keyboard user tabs past the most important control on the page and is never told why. Focusable + `aria-disabled` + `aria-describedby` on the blocking summary means reaching it explains itself. Click handler no-ops while blocked. |

---

## Attribution ledger

_Honest record of who drove what, so the walk-through is defensible._

- **Andrew:** the scope boundary (in/out); recognizing the JSON is metadata rather than content, not a source to reconstruct the document from; the checkbox todo-list idea; the instinct to mark issues in the document; page-order default sort with a severity toggle; the status bar and the page strip; **the reversal to a component library** — that deciding "no library" from a ten-control sample is the reasoning that produces component soup, because this page is one screen in a suite; and the call that accessibility should be a genuine strength of the demo rather than a checklist.
- **Claude Code proposed:** the continuous-scroll viewer, on the grounds that native CMD+F only searches the DOM (D1); the "checkbox must not gate submit" constraint and the simulated-reprocessor framing that preserves it (D3/D5); the observation that absence-type issues can never be highlighted by any technique; `aria-disabled` over `disabled` on submit; shadcn as the specific library that resolves own-vs-import rather than picking a side; the localStorage scoping table.
- **Corrected by Andrew:** that a proportional page strip must scale *both* dimensions — my "uniform height, variable width" rule would have rendered Legal and Letter identically, hiding the most common real anomaly. Also that the page numbers in the strip are load-bearing rather than decoration.
