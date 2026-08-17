# Architecture

**Purpose:** how the code is organized and where to change it.
**Audience:** an engineer picking this up cold.
**Read time:** 8 minutes.
**Last reviewed:** 2026-08-16

---

## The shape of it

Four layers, and dependencies point one way only.

```
components/     the two pages, the panels, the viewer, the strip, the splitter,
    │           the actions and dialogs. React lives here and only here.
    ▼
hooks/          useReview · useDoneIssues · useIssueNotes · useScrollTracking
    │           useTheme · useUiScale · usePanelSizes
    │           async boundaries, browser state, and the reader's preferences
    ▼
lib/            review    the product rules — pure, no React
    │           documents the demo catalog: one document, two versions
    │           submission persisted submissions, per review and version
    │           progress  the reviewer's done marks, same scoping
    │           notes     the reviewer's notes, scoped to the document instead
    │           severity  severity's colors and labels, as data
    │           session   who is signed in
    │           brand     the product name
    │           pdf       pdf.js worker configuration
    │           polyfills URL.parse, which pdf.js needs and older Safari lacks
    │           utils     cn()
    ▼
types/          review.ts
                the payload shape, modeled from the mock rather than the prose
```

**The direction is the guarantee, not a convention.** `canSubmit` lives in `lib/review.ts`,
which imports nothing but types. There is no path from a checkbox, a filter or any piece of UI
state into `canSubmit`, because the file that computes it cannot see them. The compiler enforces it.

The signature says it twice:

```ts
export function canSubmit(review: Review): boolean
```

It takes the **whole review**, never an array of issues. Handing it a filtered list is not a
mistake you can make; it is a type error.

## Routing

Three routes and a harness, using React Router rather than a hand-rolled
`pushState`. Same rule that picked shadcn over hand-rolled components and
react-pdf over raw pdf.js: reach for the library when one exists.

| Route | What |
|---|---|
| `/documents` | The queue. Where the app lands, and where submitting returns you. |
| `/reviews/:documentId` | The review. `?v=3` selects the version. |
| `/demo` | The react-pdf harness, lazily loaded so its ~420 KB never reaches a normal visitor. |
| `/dev` | Not built. Will swap the PDF and edit the mock payload, so other document-and-report combinations can be tried. |

**The version is a query parameter rather than component state** because it is a
different thing to look at, and different things deserve addresses: `?v=2` is a
link that survives a paste and a reload, and the back button lands where you
expect.

**`/documents` is a stub, not the Documents Page** from the spec's flow. It has
one live row, three inert placeholders and a reset control: the smallest surface
that gives the review somewhere to be opened from and returned to. Without it,
submitting is a one-way trip and an evaluator gets one attempt at the most
important interaction in the build.

Deployed as a static build on Vercel, where `vercel.json` carries the rewrite,
matching **only extensionless paths**, so a missing asset still 404s instead of
receiving `index.html` with a 200 and being parsed as JavaScript.

---

## Data flow

```
public/review_mock.json
        │  fetched over HTTP, not imported — the async boundary is real,
        │  so loading and error states are honest rather than theater
        ▼
useReview()                  fetch → isReview() validates → discriminated union
        │                    { loading } | { error, message } | { ready, review }
        ▼
ReviewPage                   owns the shell and all shared state
        │
        ├── numberByPage()   stable numbering, returned in page order
        ├── sortIssues()     page order, or severity with done rows sunk
        ├── visibleIssues()  hidden severities and hidden done rows removed
        └── groupByPage()    issues keyed by page — computed on the UNFILTERED
                │            list, because the status bar and the strip describe
                │            the document, not the current view of it
                │
                ├── ReviewVerdict     takes `review`, never a list
                ├── IssuesPanel       takes the view of the issues
                ├── DocumentPanel     status bar + the viewer
                ├── ThumbStrip        the whole document as one scrub control
                └── ReviewAction      upload, submit, and the submit sequence

useDoneIssues(review)        the reviewer's private worklist, from localStorage
                             keyed by review id AND version
useIssueNotes(review)        what the reviewer wrote, keyed by review id only —
                             a note outlives the version it was written against
useScrollTracking()          whether the list follows the document. A preference,
                             so it belongs to neither of the above
useTheme() · useUiScale()    how the reader wants to look at it
usePanelSizes()              and how they want it divided up
```

**The review and the reviewer are separate sources.** `useReview` is what the API
says about the document. Everything else — what has been ticked, what has been
written, how the list behaves — is what the person at the keyboard did, and it
never merges into the review object.

The two reviewer-owned stores are scoped differently on purpose: a tick means
"I have handled this" and dies with its version, while a note is something
learned about the property and survives into the next one.

**Validation is at the boundary and nowhere else.** `isReview()` is ~20 hand-written lines
rather than a schema dependency. Once past it, every component downstream can trust its props
completely, and none of them carry defensive checks.

## State ownership

Who owns each piece, who reads it, and whether it outlives the tab.

| State | Owner | Readers | Persisted |
|---|---|---|---|
| `review` | [`useReview`](../src/hooks/useReview.ts) | everything | no — fetched |
| `focusedPage` | `ReviewShell` | thumb strip, issues list, status bar | no |
| `seek` | `ReviewShell` | the viewer | no |
| sort · hidden severities · hide-done | `ReviewShell` | issues list | no, deliberately |
| active tab (compact only) | `ReviewShell` | both panels | no |
| done marks | [`useDoneIssues`](../src/hooks/useDoneIssues.ts) | issues list, progress | `localStorage`, per review **and version** |
| notes | [`useIssueNotes`](../src/hooks/useIssueNotes.ts) | issues list | `localStorage`, per document |
| scroll tracking | [`useScrollTracking`](../src/hooks/useScrollTracking.ts) | issues list | `localStorage`, device |
| theme | [`useTheme`](../src/hooks/useTheme.ts) | CSS only | `localStorage`, device |
| text size | [`useUiScale`](../src/hooks/useUiScale.tsx) — a context | account menu | `localStorage`, device |
| panel sizes | [`usePanelSizes`](../src/hooks/usePanelSizes.ts) | both splitters, thumb strip | `localStorage`, device |
| zoom | [`DocumentPanel`](../src/components/DocumentPanel.tsx) | the viewer, the page bar | no |
| `nearPage` | [`DocumentViewer`](../src/components/DocumentViewer.tsx) | itself | no |

Two of those are worth a sentence.

**Zoom sits one level above the thing it zooms.** The viewer does the work, but the control for it is in the page bar, which the panel owns. The panel is the one place that can see both.

**Text size is a context where theme is a bare hook.** The theme is consumed only by CSS, so two components each holding their own copy still agree. Text size is read in JS by the thumb strip, which sizes its segments from the root font size, so a change made in the menu has to reach it.

**Zoom stays inside the viewer.** It is a rendering concern, and the rest of the app has no opinion about it — the same reason `nearPage` is separate from `focusedPage`, which is about what everything *else* highlights.

### The one value with three readers

The single most important piece of state in the app.

```
seekToPage(n)         issue click · thumb strip drag · keyboard
      │
      ▼
viewer scrolls        smooth for a click, instant for a drag
      │
      ▼
reading line measures rAF-throttled, against the scroll container
      │
      ▼
focusedPage  ─────────┬─── thumb strip   marks the segment
                      ├─── issues list   tints the rows on that page, and
                      │                  scrolls to them if the user asked it to
                      └─── status bar    names the issues on that page
```

**Seeking never sets the page.** It scrolls, and the measurement decides. That keeps the
highlight honest: it always means *"this is what you are looking at"*, never *"this is what
you asked for"*, and those two are different for the entire length of a smooth scroll.

Two consequences:

- **Measurement is suppressed during a programmatic scroll**, released on `scrollend` and
  measured once more on release. Without the suppression, a scroll to page 17 reports every
  page it passes and the list strobes on the way; without the measurement on release, a scroll
  that finishes before anything else fires leaves the page reading whatever it said before.
  The timeout is a fallback for browsers with no `scrollend`, and is deliberately too long to
  win the race against a real one.
- **The reading line is a measurement, not an `IntersectionObserver`.** Observer callbacks
  fire only when a threshold is *crossed*, so distant pages keep reporting stale ratios and a
  page taller than the viewport never reaches the higher thresholds at all, which freezes the
  reading after one scroll.

### What persists, and where

Seven things end up in `localStorage`, and they do **not** share a lifetime. Getting the scoping wrong is a real bug rather than a tidiness question: a stale checkmark leaking into a new version would tell the user a defect was handled when it wasn't.

| What | Key | Scope | Why that scope |
|---|---|---|---|
| Theme preference | `vera.theme` | **Device** | Which theme suits you depends on the screen you are looking at and the light you are sitting in, not on who you are. Signing in on a different machine should not drag a laptop's dark mode onto a bright office monitor. |
| Done marks | `vera.done.<id>.v<n>` | **This review, this version** | When v3 arrives with a fresh issue list, v2's ticks are meaningless, and a stale one would claim a defect was handled that the new review never raised. |
| Submission | `vera.submitted.<id>.v<n>` | **This review, this version** | `status: 'submitted'` is a value the API can return, so the page has to render a submitted review on a cold load with no click involved. Persisting it means the demo exercises the real path rather than a boolean in component state. |
| Notes | `vera.notes.<id>` | **This document, every version** | The one thing here that deliberately outlives a version. A tick means "I have handled this" and dies with the findings it was made against; a note is something the reviewer *learned* — "the appraiser confirmed the measurement by phone" — and is still true when v4 arrives. That difference is the whole reason these are two keys and not one. It rests on a surviving finding keeping its issue id across versions, which a unit test enforces because nothing else would notice it breaking. |
| Text size | `vera.uiScale` | **Device** | How large you want the type depends on the screen you are looking at, exactly as the theme does. Applied before first paint by an inline script, or the whole layout reflows on every load. |
| Panel sizes | `vera.panels` | **Device** | The issues split, the strip's width, and whether the strip is open. `strip` starts at 100px and returns there when the strip is reopened. |
| Scroll tracking | `vera.scrollTracking` | **Device** | Whether the issues list follows the document is a preference about how the tool behaves, not a fact about a review, so it belongs to the machine in the same way the theme does. Stored as a word rather than a boolean, so "never asked" and "explicitly off" cannot be confused — absent means on. |

**Sort order and severity filters do *not* persist.** They are a *view* of one document, not a way of working. Carrying "minors hidden" into the next review would hide thirteen issues someone never chose to hide, on a compliance tool, which is a bad failure direction. They reset.

#### The reviewer's own layer — and the API it implies

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

---

## Two layouts, one component tree

The shape is decided **entirely in CSS**, at 1024px.

```
< 1024px   compact   one view at a time behind a view switcher,
                     verdict and submit merged into one bottom bar
≥ 1024px   full      split view, draggable splitter, thumb strip,
                     metadata inline in the header
```

There is no `useMediaQuery`, no `isMobile` branch and no second subtree. Three things follow:

- **Nothing can drift.** Most codebases claiming "mobile-first" have two trees that diverge
  quietly over months.
- **No layout flash**, because there is no JS deciding anything at mount.
- **The layout suite can prove the shapes by resizing a single page**, which it does across
  twelve viewports and a 320→1920px sweep, with touch targets measured at phone width.

The mechanism is `max-lg:hidden` on the inactive view and `lg:w-[var(--issues-width)]` for
the splitter's width, with `--issues-width` set as an inline custom property so a JS number
can reach a CSS media query without JS knowing the breakpoint.

**1024 rather than 768** because the full shape carries two controls the compact one does
without, and both need room — [decisions](09-decisions.md). It is a rule about the *window*, which is what makes iPad Split
View and Stage Manager come out right with no special case.

**The full shape is a touch layout.** A 13" iPad is 1024px wide *in portrait*, so it appears
under a finger before anyone rotates anything: Pointer Events throughout, 44px targets,
`touch-action: none` on drag surfaces, nothing essential behind `:hover`.

## The viewer

The riskiest component, and the one that carries acceptance criterion #1.

| Concern | How |
|---|---|
| **Whole-document find** | Every page's text layer is mounted, always. Browser find only searches the DOM, so this is the price of using the platform's find rather than reimplementing it. |
| **Memory** | Canvases render only within `CANVAS_WINDOW` pages of the one being read. about 7 canvases instead of 34: roughly 70 MB instead of 350 MB, and iOS Safari discards tabs for less. |
| **Correct navigation** | Page wrapper heights are reserved from the API's `width`/`height` before pdf.js paints. Unreserved, the document is nearly zero pixels tall while loading and every scroll target lands in the wrong place. |
| **Which page** | The reading line, measured against the scroll container. A floating counter reports it over the document while a scroll is in progress, since nobody is looking at the top of the panel mid-scroll. |
| **Zoom** | Pinch on touch, trackpad pinch on desktop. A transform follows the gesture and a real re-render lands when it ends: re-rendering the canvas window every frame is not viable. |

Zoom costs the square of itself in canvas pixels, so `CANVAS_WINDOW` narrows as it opens, and the page being read is anchored across the change — every reserved height moves, so the scroll offset that meant "page 14" before means something else after.

**The text layer and the canvas are separable.** The text layer is what find needs and it is
only DOM spans. The canvas is what costs memory. Taking the phone seriously surfaced it, and it
made the desktop build better too, since mounting 34 canvases was never a good idea, merely
survivable — [decisions](09-decisions.md).

**Everything measures against the scroll container, never the window.** The app has no window
scroll: the shell is `h-dvh overflow-hidden` and the layout suite asserts the document never
scrolls. Geometry taken from the viewport would be wrong by the height of the header plus the
status bar, and would look almost right.

**The thumb strip renders its own document.** Page images in the strip come from a second react-pdf `<Document>` in [`ThumbRasters.tsx`](../src/components/ThumbRasters.tsx), lazily imported so pdf.js stays out of the entry chunk — the strip is reachable from `ReviewPage`, which is imported statically, so a direct import would put the engine on the queue screen too. On the review page it costs nothing extra: the viewer has already pulled the same chunk.

The annotation layer is disabled. It makes PDF hyperlinks clickable, which this document does
not need, and it is the layer that ships `z-index: 3` and swallows clicks meant for the UI
above it.

## The token layer

`src/index.css` holds the entire theme as CSS custom properties, including product
vocabulary rather than just chrome:

```css
--severity-critical  --severity-major  --severity-minor
--severity-*-text    the same three, darkened for 12px type
--focus-tint         --focus-edge
--ready              --ready-text      --ready-surface
--wordmark-from      --wordmark-to
--paper-chip         --paper-chip-text
```

**No component ever names a color.** `SeverityDot` maps a severity to a token class and
nothing else. A brand pass should be *this one file changing and the whole app re-skinning*.
If it ever requires touching a component, the token layer was wrong.

One pair is deliberately absent from `.dark`. `--paper-chip` colors the floating page counter, which sits over the document — and the document is white paper in both themes, so keying it to the app's surfaces would make it a white chip on white paper in light mode.

Dark is one class, `.dark`, applied by `useTheme`. The preference has three values
(system / light / dark) but there are only two palettes, so the resolving happens in JS and
CSS never has to know about the media query. That keeps a single definition of dark instead of
a class rule and a media query that can drift apart.

---

## Seams

Named here so the answer to *"what would you do differently at scale"* points at code rather
than at good intentions. [`07-production.md`](07-production.md) expands each of these into the work
behind it.

| Seam | Today | At scale |
|---|---|---|
| `useReview` | fetches a static mock | swap the fetch for the real endpoint; `isReview()` stays exactly as it is |
| `Issue.page` | a page number, no coordinates | bounding boxes from the backend, and the markers move onto the page instead of into a status bar |
| `CANVAS_WINDOW` | a fixed page count | geometry against the viewport, once documents run to hundreds of pages |
| submit | writes to `localStorage`, then plays a fixed 2.7s sequence | a real mutation, with the sequence driven by the request rather than a timer, plus a failure path and a conflict path for a review that changed underneath you |
| `lib/session` | one constant | whatever auth returns. The distinction between *the signed-in user* and *the review's assigned user* already exists, which is what makes showing someone else's review possible |
| `lib/documents` | a hand-written catalog of one document | a documents endpoint, and this file becomes a fetch |
| `focusedPage` | React state | unchanged — the single-writer rule is what makes any of the above safe to add |

---

## Where to add things

- **A new product rule** → `lib/review.ts`, as a pure function, with a test beside it.
- **A new shared visual** → a token in `index.css` first, then a component that consumes it.
- **A new control** → check the touch requirements in [`02-design.md`](02-design.md) before the
  visual design. The full layout is a touch layout.
- **Anything that moves the document** → route it through `seekToPage`. Never set
  `focusedPage` directly. That is the invariant the whole page rests on.
