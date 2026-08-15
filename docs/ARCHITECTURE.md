# UNDIRT — Architecture

**How it works.** [`DESIGN.md`](DESIGN.md) is the record of *why* every decision was taken;
this is the map of what those decisions built. Where the two disagree, DESIGN.md is the
source of truth for intent and this file is wrong and should be fixed.

![Architecture](architecture/UNDIRT_architecture.svg)

*Editable source: [`architecture/UNDIRT_architecture.drawio`](architecture/UNDIRT_architecture.drawio)*

---

## 1. The shape of it

Four layers, and dependencies point one way only.

```
components/     the shell, the panels, the viewer, the strip, the splitter
    │           React lives here and only here
    ▼
hooks/          useReview · useTheme
    │           async boundaries and browser state
    ▼
lib/            review.ts · severity.ts · pdf.ts · utils.ts
    │           the product rules — pure, no React
    ▼
types/          review.ts
                the payload shape, modeled from the mock rather than the prose
```

**The direction is the guarantee, not a convention.** `canSubmit` lives in `lib/review.ts`,
which imports nothing but types. There is no path — not even an accidental one — from a
checkbox, a filter or any piece of UI state into the gate, because the file that computes the
gate cannot see them. That is stronger than a code review promising the same thing.

The signature says it twice:

```ts
export function canSubmit(review: Review): boolean
```

It takes the **whole review**, never an array of issues. Handing it a filtered list is not a
mistake you can make; it is a type error.

## 2. Data flow

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
        └── groupByPage()    issues keyed by page, for the status bar and the strip
                │
                ├── ReviewVerdict     takes `review`, never a list
                ├── IssuesPanel       takes the view of the issues
                ├── DocumentPanel     status bar + the viewer
                └── ThumbStrip        the whole document as one scrub control
```

**Validation is at the boundary and nowhere else.** `isReview()` is ~20 hand-written lines
rather than a schema dependency. Once past it, every component downstream can trust its props
completely, and none of them carry defensive checks.

## 3. `focusedPage` — one writer, three readers

The single most important piece of state in the app, and the one most worth understanding.

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
                      ├─── issues list   tints the rows on that page
                      └─── status bar    names the issues on that page
```

**Seeking never sets the page.** It scrolls, and the measurement decides. That is what keeps
the highlight honest: it always means *"this is what you are looking at"*, never *"this is
what you asked for"* — and those two are different for the entire length of a smooth scroll.

Two consequences worth knowing before touching it:

- **Measurement is suppressed during a programmatic scroll**, released on `scrollend` with a
  timeout fallback. Without it, a scroll to page 17 reports every page it passes and the list
  strobes on the way.
- **The reading line is a measurement, not an `IntersectionObserver`.** Observer callbacks
  fire only when a threshold is *crossed*, so distant pages keep reporting stale ratios and a
  page taller than the viewport never reaches the higher thresholds at all. The first version
  froze after one scroll.

## 4. Two layouts, one component tree

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
- **The layout suite can prove the shapes by resizing a single page** — which is exactly what
  it does, across twelve viewports and a 320→1920px sweep.

The mechanism is `max-lg:hidden` on the inactive view and `lg:w-[var(--issues-width)]` for
the splitter's width, with `--issues-width` set as an inline custom property so a JS number
can reach a CSS media query without JS knowing the breakpoint.

**1024 rather than 768** because the full shape carries two controls the compact one does
without, and both need room. It is a rule about the *window*, which is what makes iPad Split
View and Stage Manager come out right with no special case.

**The full shape is a touch layout.** A 13" iPad is 1024px wide *in portrait*, so it appears
under a finger before anyone rotates anything: Pointer Events throughout, 44px targets,
`touch-action: none` on drag surfaces, nothing essential behind `:hover`.

## 5. The viewer

The riskiest component, and the one that carries acceptance criterion #1.

| Concern | How |
|---|---|
| **Whole-document find** | Every page's text layer is mounted, always. Browser find only searches the DOM, so this is the price of using the platform's find rather than reimplementing it. |
| **Memory** | Canvases render only within `CANVAS_WINDOW` pages of the one being read. ~5 canvases instead of 34 — roughly 50 MB instead of 350 MB, and iOS Safari discards tabs for less. |
| **Correct navigation** | Page wrapper heights are reserved from the API's `width`/`height` before pdf.js paints. Unreserved, the document is nearly zero pixels tall while loading and every scroll target lands in the wrong place. |
| **Which page** | The reading line, measured against the scroll container. |

**The text layer and the canvas are separable, and that is the whole insight.** The text layer
is what find needs and it is only DOM spans. The canvas is what costs memory. Taking the phone
seriously is what surfaced it — and it made the desktop build better too, since mounting 34
canvases was never a good idea, merely survivable.

**Everything measures against the scroll container, never the window.** The app has no window
scroll at all: the shell is `h-dvh overflow-hidden` and the layout suite asserts the document
never scrolls. Geometry taken from the viewport would be wrong by the height of the header
plus the status bar — and would look almost right, which is worse.

The annotation layer is disabled. It exists to make PDF hyperlinks clickable, which this
document does not need, and it is the layer that ships `z-index: 3` and swallows clicks meant
for the UI above it.

## 6. The token layer

`src/index.css` holds the entire theme as CSS custom properties — including product
vocabulary, not just chrome:

```css
--severity-critical  --severity-major  --severity-minor
--focus-tint         --focus-edge
```

**No component ever names a color.** `SeverityDot` maps a severity to a token class and
nothing else. The payoff is a claim that can be demonstrated rather than asserted: a brand
pass should be *this one file changing and the whole app re-skinning*. If it ever requires
touching a component, the token layer was wrong — and that is worth finding out before someone
asks.

Dark is one class, `.dark`, applied by `useTheme`. The preference has three values
(system / light / dark) but there are only two palettes, so the resolving happens in JS and
CSS never has to know about the media query. That keeps a single definition of dark instead of
a class rule and a media query that can drift apart.

## 7. Testing

Two suites, two runners, because they answer different questions.

| | `bun run test` (vitest) | `bun run test:layout` (Playwright) |
|---|---|---|
| **Covers** | the rules and the payload guard | layout, shapes, touch targets, the viewer |
| **Where** | no DOM at all | real Chromium and WebKit |
| **Speed** | ~0.2s | ~25s |

**jsdom has no layout engine.** It will happily report that a 900px panel fits in a 320px
window, so the entire class of bug the layout suite exists to catch is the class jsdom cannot
see. That is the argument for a browser here, not a preference.

**No screenshot baselines.** WebKit and Chromium rasterize type differently, so baselines
would need a set per engine and would churn on every UI change. Structure is what is actually
invariant across both — no horizontal overflow, the right shape, exactly one visible submit
button, 44px targets.

The suite earned itself on first run by catching a 32px submit button, under the 44px minimum,
on the one control the whole page exists to gate.

## 8. Seams — where this changes for production

Named here so the answer to *"what would you do differently at scale"* points at code rather
than at good intentions. Fuller treatment in the production-readiness writeup.

| Seam | Today | At scale |
|---|---|---|
| `useReview` | fetches a static mock | swap the fetch for the real endpoint; `isReview()` stays exactly as it is |
| `Issue.page` | a page number, no coordinates | bounding boxes from the backend, and the markers move onto the page instead of into a status bar |
| `CANVAS_WINDOW` | a fixed page count | geometry against the viewport, once documents run to hundreds of pages |
| submit | no handler yet | a real mutation, optimistic state, and a conflict path when the review changed underneath you |
| `focusedPage` | React state | unchanged — the single-writer rule is what makes any of the above safe to add |

---

## Where to add things

- **A new product rule** → `lib/review.ts`, as a pure function, with a test beside it.
- **A new shared visual** → a token in `index.css` first, then a component that consumes it.
- **A new control** → check the touch requirements in [`DESIGN.md` §6d](DESIGN.md) before the
  visual design. The full layout is a touch layout.
- **Anything that moves the document** → route it through `seekToPage`. Never set
  `focusedPage` directly; that is the invariant the whole page rests on.
