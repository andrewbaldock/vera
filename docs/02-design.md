# Design

**Purpose:** why the screen looks and behaves the way it does.
**Audience:** designers, and engineers who want the reasoning.
**Read time:** 8 minutes.
**Last reviewed:** 2026-08-16

## The sketches, before any code

![The Review Page, sketched before implementation](assets/wireframes/VERA_wireframes.svg)

![The two layout shapes, at six sizes](../docs/assets/wireframes/VERA_layouts.svg)

## The flow

Jane Cooper opens her queue at `/documents` and picks *Annual Compliance Report - Northeast Region*.

1. **The list is where she starts and where she returns.** It is explicitly not the Documents Page from the spec's flow — that screen owns upload, filtering and assignment, and belongs to someone else's ticket. This is the smallest surface that gives the Review Page somewhere to be opened from, which turns submitting from a one-way trip into something she can do twice.
2. **The review has three regions:** a header, an issues list on the left, and the PDF viewer on the right, separated by a **draggable resizer**. Issues left follows the PDF-tool convention (Preview, Chrome, Acrobat) where the left rail is a way *into* the document, which is what a clickable issue list is. The document takes the clear majority of the width by default, roughly one-third / two-thirds: the page is 612pt wide and there is no useful way to read it in a narrow column.
3. **The verdict sits above the list**, separate from the worklist, and outside the scroller so it cannot scroll away. It leads with what is blocking, *"12 issues must be fixed"*, and reads the opposite just as well once nothing is blocking: *Ready to submit, 6 minor issues can be accepted.*
4. **The severity breakdown under it is also the filter.** Clicking *13 Minor* drops those rows from the list and drops the lozenge to half opacity, but the number never changes, so the summary keeps telling the truth about the document while the list shows a subset of it. That is what makes it safe for one control to both report and filter.
5. **Issues are in page order by default**, with a sort control offering severity instead. Page order is how the document is worked through when she goes to fix things; severity answers *what is worst*, which the verdict has already partly answered.
6. **Each issue shows its description, in full.** The title names the problem; only the description says the cover page reads 03/10/2025 while page 3 reads 01/15/2024. It is not truncated, because these run two or three lines and the decisive clause is usually last.
7. **Each row carries a Done checkbox**, a private note that *"I have handled this."* Saved per review **and version**. A Done lozenge appears once anything is ticked, hiding those rows on the same rule as the severity filters, and severity sort sinks them to the bottom. **None of it affects whether the review can be submitted.**
8. **The list is clickable, and the link runs both ways.** Clicking an issue takes the viewer to its page; landing on a page tints the issues that live there. One value, three readers.
9. **The status bar above the viewer is always current:** `PAGE 13`, the issues on it, and a tap to expand them in full with severity named as a word, not only a color.
10. **She works through the list**, ticking things off, then leaves to fix them in her own system.
11. **While anything is blocking, the only action offered is *Upload new version*.** In this demo that opens an inert dialog.
12. **UPLOAD stays available even after nothing is blocking**, Jane may decide to fix the six minors, after all
13. **Submitting with minor issues prompts a warning** and she submits, a confirmation names exactly what she is choosing to accept — *"6 minor issues will be accepted as-is"* — and says plainly that it cannot be undone. The product permits it; she should say so once, deliberately.
14. **Submitting is a sequence, not an instant.** The dialog becomes the progress surface: *Submitting…*, then *Submitted*, then back to the queue with the finished row settling in indigo. A real submission is a network round trip, and collapsing the one irreversible action in the app into nothing makes it feel like it never happened.
15. **A review that is already submitted renders as submitted**, on a cold load, with no click involved, because `status: 'submitted'` is a value the API can return. The verdict becomes the outcome, the submit control is gone rather than disabled, and the remaining minors are shown as *accepted as-is* rather than as outstanding work.

## Not overfitted to the mock

**The demo must not be overfitted to the mock we were given.** Hand the app a different JSON with no critical or major issues and it must declare the document good. That answer is derived from the data, not a hardcoded state.

---

## The layout

### Mobile-first

**Mobile-first here means the constrained case was designed first, not that the desktop layout survives being squeezed.** This page will be opened on an iPhone and an iPad, and the split view that makes sense at 1440px is not a small version of what works at 390px; it is a different shape.

Practically that means base styles target the phone and breakpoints *add* complexity upward, which is also how Tailwind's `min-width` breakpoints work by default. The split view is an enhancement at `lg`, not a default being patched.

#### The mobile constraint produced a better desktop architecture

Taking the phone seriously **broke an assumption already accepted on desktop.**

Acceptance criterion #1 forces every page to be mounted so native find can reach it (see above). On a phone that is dangerous: at devicePixelRatio 2, one full-width page canvas is roughly 10 MB, so 34 of them approaches 350 MB of canvas memory. iOS Safari discards tabs for less, and a viewer that reloads itself mid-review is worthless.

The resolution is a distinction the desktop design never had to draw: **the text layer is what find needs, and the canvas is what costs memory.** They're separable.

- **Every page's text layer is mounted whenever the document is on screen.** It's DOM spans — cheap. Whole-document `CMD+F` keeps working exactly as the criterion requires.

  **The qualification is stated rather than glossed.** In the compact layout the two views are exclusive, and the one you are not looking at is `display: none`, which browser find cannot reach into. So on a phone, find searches the whole document *when you are on the Document tab*, and finds nothing while you are on the Issues tab.

  That is a real limit on acceptance criterion #1, chosen over the alternative. Keeping the document mounted and merely moved off-screen would restore find in both tabs, but the match would then be highlighted somewhere the user cannot see, in a layout whose premise is one thing at a time, and it would hold all thirty-four text layers in the DOM permanently on the device where memory is scarce, which is the pressure this architecture exists to relieve. Find while looking at the document is the only moment anyone invokes it. **In the full layout the question doesn't arise**: both panels are always mounted, so find always covers the whole document.
- **Canvases render only for pages near the viewport**, in a window that widens on desktop and narrows on a phone. react-pdf's per-`<Page>` `renderMode` makes a page text-only until it comes near.

One viewer, one architecture, a single tuning constant that differs by device, rather than two code paths that drift. And it's strictly better on desktop too: mounting 34 canvases was never a good idea, it was just survivable.

That is the mobile-first argument in its honest form. Not *"it also works on phones"*: designing for the phone found a real defect in the desktop design.

#### Two shapes, and the boundary is 1024px

There are exactly two layouts. Not three.

| Shape | Applies | What it is |
|---|---|---|
| **Compact** (`< lg`) | Every phone, **every iPad in portrait up to 1024**, every Stage Manager and Split View window, and a narrow desktop browser | One thing at a time behind a segmented control — **Issues / Document**. The verdict panel carries the upload control in its corner. No bottom bar, no thumbnail strip, no resizer. |
| **Full** (`≥ lg`, 1024px) | Every iPad in landscape, the 13" iPad **in portrait**, and every desktop | The sketch: issues panel and viewer side by side with a draggable resizer, thumb strip down the viewer edge, full metadata in the header. |

**Why 1024 rather than 768.** The full shape carries two controls the compact shape does without, the resizer and the thumb strip, and both need room to be operated. At 768 an issues panel wide enough to read leaves a document column too narrow to. The rule is about *the window*, not the device, which is what makes the Stage Manager case correct without special-casing it.

**The consequence, accepted:** an 820pt iPad in portrait shows one panel where two would nearly fit. A 520pt document column is a bad way to read a document that wants the width.

### The full shape is a touch layout

The full shape is not "the desktop layout." **iPad Air 13" and iPad Pro 13" are 1024 CSS px wide in portrait**, so the full shape appears on a touch screen held vertically, before anyone rotates anything. Landscape iPads are 1133–1366 and land there too.

So the full shape is a touch layout that also has a pointer, and every control in it is built to that standard:

- **The thumb strip is one scrub control, not 34 targets**. This is the whole reason it survives on touch.
- **The resizer** renders as a hairline with a ~44px padded grab zone, driven by Pointer Events with `touch-action: none`, and is `role="separator"` with arrow-key support.
- **Nothing essential is behind `:hover`.** The status bar's issue descriptions are tap-to-expand at every size; hover is layered on top via `@media (hover: hover)` as an enhancement only.
- **Both panels set `overscroll-behavior: contain`**, or scrolling the issues list to its end rubber-bands the whole app on iOS.

**Pinch-to-zoom zooms the document, not the app.** It was cut from the first build on cost, and the cost was real: zoom changes every reserved page height and the reading-line measurement that decides which page is in view. Both had to be handled, and both were. On a trackpad the same gesture does the same thing, so hovering the document and pinching magnifies the pages rather than the interface.

A gesture cannot be the only way in, so the same zoom has controls in the center of the page bar: `−`, the percentage, `+`. The percentage is itself a button and returns the document to fit, which is the shape zoom controls take in map and document software. They sit in the bar rather than floating on the page because the bar is where this view's chrome already lives, and its middle was empty.

A useful side effect of drawing the line at 1024: **rotating an iPad switches between the two designs.** That is the clearest possible demonstration that the full shape is a design in its own right and not the compact one stretched.

The **verdict summary always stays visible**, in both shapes. It's the answer to acceptance criterion #3, and it is the one thing that must never be a tab away.

### The compact shape

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

**The verdict panel carries the upload control.** It sits in the corner the done count has in the full layout, on the row with the blocking headline — so the count that blocks submission and the control that resolves it are on one line, which is the plainest statement of acceptance criterion #3. This replaced a bottom bar that repeated the headline and cost 61px of a screen whose whole problem is room; the trade is that the control is on the issues tab only, one tap from the other.

**The nav bar collapses to a back chevron, a truncated title and an overflow.** Version, uploaded-at and assigned user move behind the `⋯`, being reference data you consult rather than act on, so they lose the fight for vertical space.

**Tapping an issue switches to the Document tab at that page.** The same intent as the desktop click, expressed as navigation instead of as a scroll in an adjacent panel. Returning is one tap.

**The thumb strip is dropped here, not miniaturized.** Not for want of touch targets, since as a scrub control it works fine under a thumb. It is dropped because it costs *width*, and it is the third of three redundant routes to a page: the list and the status bar both survive without it. A cramped horizontal version would be worse than its absence.

**A segmented control, not a bottom tab bar.** Two views is not a tab bar's job — a tab bar is for the top level of an app, and this is one screen showing one of two things.

#### iOS specifics that actually bite

- **`100dvh`, never `100vh`.** iOS Safari's `vh` ignores the browser chrome, so a full-height layout gets clipped and the submit button ends up under the toolbar.
- **Safe areas.** `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, or the home indicator sits over the controls at the bottom of the screen.
- **Nothing may depend on hover.** The status-bar labels reveal an issue's description on hover — on touch that has to be tap-to-expand. Any hover-only affordance is an unreachable feature on half our target devices.
- **Touch targets are 44px minimum**, and the thumb strip looks like it fails this, since 34 segments at 44px would need 1,496px of column. It doesn't fail, because it is a **single scrub control rather than 34 buttons**: one target, 44px wide, as tall as the panel. The rule that binds is on the issue rows, which take the full row as their target with the checkbox getting its own.
- **Momentum scrolling and a rAF scroll handler.** The reading-line measurement runs on scroll; on iOS that fires during momentum and must stay cheap. It already exits its loop early and is rAF-throttled.
- **`CMD+F` doesn't exist on a phone, but find does.** iOS Safari reaches it two ways: **Share sheet → Find on Page**, and by typing in the address bar and choosing **"On This Page — Find …"** at the bottom of the suggestions. Android Chrome puts it in the ⋮ menu as **Find in page**. All of them search rendered DOM text, which is exactly what our mounted text layers are — so the criterion is met by the platform's own find on every platform that has one. It is a browser affordance we can't invoke or point at, which is worth saying out loud rather than implying the app provides it.

- **Which is why the app is installable but not standalone.** `display: standalone` usually makes a PWA feel like an app by removing the browser chrome, meaning the share sheet and the address bar, which is where iOS keeps Find on Page. Installing it that way would delete the affordance acceptance criterion #1 depends on.

  So the manifest ships **`display: browser`**, and `apple-mobile-web-app-capable` is absent because on iOS it forces standalone regardless of what the manifest says. You still get our icon on the home screen; tapping it opens Safari with its chrome intact, and find keeps working. "Make it a PWA" is a set of separate decisions rather than one switch.

---

## The three regions

### The issues list

#### The done checkbox, and what it must never do

Users check issues off as they work through them. Private notes, persisted to `localStorage`, minimal visual weight.

Good UX for 25 items worked through in another application over a long session. It is **scratch state, not a resolution claim.** Hard rule:

> **`canSubmit` never reads a checkbox.** It is derived from the review data alone: are there any critical or major issues in this review? Resolution is proven by a new version. If a checkbox could unlock submit, a user could submit a defective mortgage document by lying to a checkbox.

The checkboxes do feed one other thing — the simulated reprocessor in the simulated reprocessor — but they do it by producing a *new review*, never by short-circuiting `canSubmit`.

All three open questions closed the same way: it persists to `localStorage`, keyed by review **and version**, so a tick made against v2 cannot claim a finding in v3 was handled — and the label says *Done*, never *resolved*, because those are different claims.

#### Demonstrating the submittable state

The app must not be overfitted to the supplied mock. Hand it a JSON with no critical or major issues and it declares the document good. It is derived from the review data, never a hardcoded state.

Implementation open: a second mock file plus a way to switch to it (query param, or a small dev control). Whichever we pick gets called out as a demo affordance, not a product feature.

### The document

The document scrolls continuously, every page mounted. That follows from acceptance criterion #1 rather than from taste: browser find only searches the DOM, so a viewer showing one page at a time can only search one page. Mounting everything is the price of using the platform's find instead of rebuilding it.

Mounting everything would cost roughly 350 MB of canvas on a phone, so the text layer and the canvas are treated separately: every text layer is always in the DOM, and only pages near the viewport get painted.

It renders through **react-pdf over Mozilla's pdf.js** — the engine that ships in Firefox, permissively licensed, which matters in an industry where a viewer sits in the path of every loan file.

**Nothing is drawn inside a page.** A status bar above the viewer names the page in view and the findings on it, using each finding's real title. The data gives a page number and no coordinates, so anything drawn inside a page would be a claim it cannot support — and about a quarter of these findings are absences with nothing to point at anyway.

On a page with no findings the bar still shows the page number and says so. *"No issues on this page"* is useful information in a document being worked through, not an empty state.

### The thumb strip

#### What the strip encodes

A vertical strip down the edge of the viewer, one segment per page, mapping onto scroll position the way a scrollbar does:

- Each segment is a **page-shaped rectangle**, carrying its page number when the segment is tall enough to hold one legibly. Whether it is tall enough is not a design choice but an outcome of the sizing rule below: the scale is computed from the column, and the number is drawn only above a measured 16px. An unlabeled block beats a clipped digit.
- Inside it, **one colored bar per issue on that page**, in that issue's severity color — so page 14 visibly has three marks and page 4 has none. Richer than a single worst-severity fill: you see both severity and volume at a glance.
- Clean pages are empty rectangles.
- The **current viewport position** is marked.
- Aspect ratio comes from the `height`/`width` the API already gives us per page — otherwise unused data.

**It is one control you scrub, not 34 you click.** This is what the name is for, and it is the decision that lets the strip exist on touch at all.

Press and drag anywhere on the strip and the document follows continuously; lift to land. A tap jumps to the page under your finger. Because it's a single control rather than 34 discrete targets, the 44px minimum applies once — 44px wide, as tall as the panel — instead of demanding 1,496px of column for 34 legal-size targets. The same reasoning as the iOS index scrubber or a Kindle page slider.

That forces one addition, and one more falls out of it:

- **A readout follows the thumb** — `PAGE 17 · 2 issues` — because a finger on the strip covers the thing it is pointing at. On a pointer device the same readout appears on hover, where it reads as a tooltip rather than a workaround.
- **It is a slider, so it gets slider semantics.** `role="slider"` with `aria-valuenow` on the page number, Arrow keys to step, Home/End to jump — keyboard navigation of the whole document for free, from a control built for a thumb.

Driven by Pointer Events, not mouse events, with `touch-action: none` so the drag doesn't scroll the page underneath it.

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

**There is a floor under the fit, and below it the strip scrolls.** Fitting alone shrinks width along with height, so a long document gets segments that are both shorter and narrower: against an 800px column of Letter pages, 34 gives 21.6 x 16.7px and 100 gives 6.0 x 4.6px, a thread down a 44px column. The scale is `max(fit, floor)`, and the floor is expressed in rem so it follows the text-size setting with no preference plumbed into the component.

That floor cost something the original design avoided on purpose. A scroll container inside a `touch-action: none` scrub surface cannot be scrolled by the finger it exists for, so the strip scrolls itself: it keeps the focused segment in view, and a scrub reaching either edge scrolls on while the finger stays there. Without that, the pages off screen would be unreachable on the exact device the control was designed for.

The page number follows the text-size setting rather than a fixed 8px, and is drawn only when the segment is tall enough to hold it. An unlabeled block still beats a clipped digit, and the readout that follows the thumb states the page either way.

The arithmetic is done in JavaScript against a measured column rather than expressed in CSS, because every CSS formulation of "one scale factor" stops being one the moment a constraint binds.

A useful side effect: because every segment is proportional, the strip becomes a true miniature of the scrolled document, so a segment's position in the strip corresponds to that page's position in the scroll.

Every page in this sample is 612×792, so it reads as a uniform column here. That is the correct output *for this document*, not a hardcoded assumption — feed it a mixed-format file and the anomaly shows up unprompted.

The strip answers a question the status bar cannot, because the status bar only ever describes the page you are on: *"pages 12 through 18 are a mess, the back half is clean."*

**The strip resizes, from 44px up to 140.** Wider pages mean bigger thumbnails, and the strip scrolls once they no longer all fit. Drag it shut and a pull tab brings it back. Where you leave it is remembered.

**It renders real page images**, which reverses the original call. That call was that a picture this small is unreadable — true of the picture, and beside the point of it. A cover sheet, a table and a photo page are three different shapes even as a smear, and that is enough to navigate by. The page number and the severity marks still carry the reading; the image is the backdrop they sit on.

---

## The visual system

### Type

Three faces, three jobs.

**Geist** is the interface: everything the system says. **Ubuntu Sans Mono** is for notes only — a note is handwriting on the file, not product copy, and a different face separates *the reviewer wrote this* from *the system found this*. Mono rather than a serif, because a note is working text, closer to a margin annotation than to prose.

**Goldman** sets the wordmark and nothing else, at weight 700 only, since that is the one weight the mark uses. It is a separate token from the interface face on purpose: the brand can move without the interface moving with it, and pointing that token at the platform's own display face would change the mark and leave the product alone. All three are self-hosted, so there is no third-party font request at runtime.

### Color

**No component ever names a color.** Every one reads a token, and the tokens are defined once per theme. That is what lets severity be defined in one place and consumed by the three surfaces that render it — list rows, the page status bar, and the thumb strip — without them drifting apart.

Severity is product vocabulary, so it lives in the token layer with everything else. It needs **two** roles rather than one, and the reason is measured: the fills are tuned to read as 8px marks, and the same values set as 12px type measure 4.77, 2.56 and 3.63 against white. Two of the three fail the 4.5:1 AA floor outright, amber badly. So the words use their own darkened tokens, which clear 5.8 or better, and a test measures it against both surfaces in both themes rather than asserting it in a comment.

Green is the only green in the product and means one thing: nothing here is blocking you. Severity owns red, amber and slate, so a green that meant anything else would be confusable with a finding.

One pair is deliberately **not** themed. The floating page counter sits over the document, and the document is white paper in both light and dark, so keying it to the app's surfaces would make it a white chip on white paper. It is dark in both themes because its ground is the same in both.

### Density

Three text sizes — Compact, Comfortable, Large — in the account menu.

They set the root font size, and because Tailwind sizes type *and* spacing in rem, one value moves the whole interface together: labels, padding, gaps, and the 44px touch minimum. The stops are percentages of the browser's own default rather than pixel values, so a reader who has already raised their base font size keeps that and gets this on top.

**The document deliberately does not scale with it.** That is the entire difference from browser zoom, which magnifies the pages along with the labels. Someone who can read the document fine and cannot read the interface wants exactly one of those to move; the document has its own zoom for when they want the other.

The thumb strip is the one part the root font size cannot reach on its own, because it sizes itself from arithmetic rather than from CSS. It reads the root size and puts a floor under its own scale instead.

### Motion

Four animations, and all of them are slower than a first instinct would make them.

**A finished row settles** over three and a half seconds, easing out from a solid indigo ring to nothing. A quick flash reads as an error; this is a completion, and it should look like something coming to rest.

**Submitting is a sequence** rather than an instant: a sweep that runs while the work happens, then a mark that lands with a halo behind it. This is the one irreversible action in the app, and collapsing it into nothing makes it feel like it did not happen.

**A cover sheet shimmers** while pdf.js works, unhurried on purpose — a fast sweep reads as urgency about a wait nobody noticed.

**The page counter fades in fast and out slow.** It has to be there the moment you start moving, and something that vanishes the instant you stop reads as a glitch rather than as a control standing down.

Every one of them honours `prefers-reduced-motion`, and each degrades to its *end state* rather than to nothing — a state that exists only as an animation would otherwise disappear entirely for the people who asked for less movement.

---

## Why a component library

Nine of this page's ten controls are a native element doing its job, and the platform now handles the tenth — the modal — through `<dialog>`. On the evidence of this page alone a component library looks like a dependency that wraps things the browser already ships.

But this page is one screen of four, inside a product that will already have components to reach for. **Deciding "no library" from a ten-control sample is the reasoning that produces component soup**: every screen looks small enough to hand-roll, and twenty screens later there are twenty slightly different buttons. shadcn/ui resolves it rather than picking a side — Radix behavior underneath, source copied into the repo so the skin is ours, tokens as CSS variables, re-syncable from the registry.

The splitter and the thumb strip are authored here, because Radix has no such primitives. They are additions to the system following its conventions rather than gaps in it.

Severity presentation is two components rather than one: a `SeverityDot` for lists, and a `SeverityMark` for the strip, where a narrow segment has no room for a label and the mark carries meaning in thickness instead. One component would have had to be two things.

## What I'd change

Some of it I already did. v1.0 went out, testing was done, and five things came back.

**The interface type was too small.** My mom found the labels hard to read and reached for browser zoom, which is the wrong tool: it magnifies the document along with the interface, so the pages they could already read got bigger too. That is what the three text sizes are for, and it is why the document deliberately does not scale with them.

**The thumb strip was the worst of it, and for a reason I had built in.** The page numbers were hard-coded at 8px, so they were the one thing on screen that did not move when anything else did. They follow the size setting now.

**The strip shrank without limit.** Fitting the whole document into a fixed column is right for 34 pages and wrong for a hundred, where it produces a thread of slivers. There is a floor under the scale now, and below it the strip scrolls rather than shrinking further.

**The strip was also fixed at 44px and could not be got rid of.** It is resizable and it closes, because a panel you cannot dismiss is a panel that is always in the way on a laptop.

**And it turned out I was wrong about thumbnails.** I cut them on the grounds that a picture that small is unreadable. True of the picture, beside the point of it — shape alone is enough to navigate by.

One correctness bug came with them, and it is the one worth writing down: secondary text was **under the AA contrast floor in light mode**, at 4.27:1 against a highlighted row. It was reported to me as a dark-mode problem, where it measures 5.53 and passes. Dark mode read worse while light mode was the one actually failing, because the ratio does not capture a neutral grey sitting on a blue-violet tint at 12px. It is measured in a test now, on every surface it lands on, in both themes.

### Two tradeoffs

**The status bar instead of in-page markers.** It is the right call on this data — there are no coordinates to point with, and a quarter of these findings are absences with nothing to point at. The cost is that you can see *which* page a finding is on and never *where* on it. If the backend returns bounding boxes, this is a decision to revisit rather than extend.

**The compact layout hides the inactive panel**, which is what confines browser find to the Document tab. The alternative was holding 34 text layers in the DOM on the device with the least memory, which is the pressure the whole text-layer/canvas split exists to relieve. The cost is a qualification on acceptance criterion #1 that only applies on a phone, and only while you are looking at the issues list.

## Decisions

Every call above is in [09-decisions.md](09-decisions.md), with what it was chosen over.
