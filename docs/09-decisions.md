# Decisions

**Purpose:** every decision that shaped this build, what it was chosen over, and why.
**Audience:** anyone asking "why is it like this?"
**Read time:** skim the index, read the two or three you care about.
**Last reviewed:** 2026-08-16

Kept as one file on purpose. A decision log is most useful when it can be read
top to bottom and searched in one place, and splitting it into records makes
you decide, for every entry, whether it is a big one — which is a judgement
nobody can make consistently.

Reversals stay in as their own entries rather than being edited away. A decision
you can watch change its mind is worth more than one written as though the
answer were always obvious.

---

## Index


1. [Vite + React + TypeScript](#1-vite-react-typescript)
2. [~~Hand-rolled components + CSS tokens on main; a second branch on a component …](#2-hand-rolled-components-css-tokens-on-main-a-second-branch-on)
3. [Scope: no in-browser fixing, no real backend, no versioning](#3-scope-no-in-browser-fixing-no-real-backend-no-versioning)
4. [VERA does no uploading](#4-vera-does-no-uploading)
5. [Continuous-scroll PDF viewer, all pages and text layers mounted](#5-continuous-scroll-pdf-viewer-all-pages-and-text-layers-mount)
6. [react-pdf as the renderer, wrapping Mozilla's pdf.js](#6-react-pdf-as-the-renderer-wrapping-mozillas-pdfjs)
7. [Issues list sorts by page order by default, with a severity sort available](#7-issues-list-sorts-by-page-order-by-default-with-a-severity-s)
8. [Simulated re-upload is a stretch goal, built last](#8-simulated-re-upload-is-a-stretch-goal-built-last)
9. [Checkboxes feed the simulator, never canSubmit](#9-checkboxes-feed-the-simulator-never-cansubmit)
10. [Submit asks for confirmation naming the unresolved minors](#10-submit-asks-for-confirmation-naming-the-unresolved-minors)
11. [Render the terminal submitted state in place; label it "Submitted"](#11-render-the-terminal-submitted-state-in-place-label-it-submit)
12. [No un-submit / mark-for-re-review](#12-no-un-submit-mark-for-re-review)
13. [Thumb strip down the viewer edge](#13-thumb-strip-down-the-viewer-edge)
14. [Page-margin markers, numbered in page order, labeled with the real issue title…](#14-page-margin-markers-numbered-in-page-order-labeled-with-the)
15. [Scroll restore across reloads](#15-scroll-restore-across-reloads)
16. [Accessibility in scope, including resizer keyboard support](#16-accessibility-in-scope-including-resizer-keyboard-support)
17. [shadcn/ui + Tailwind from the start (Radix underneath)](#17-shadcnui-tailwind-from-the-start-radix-underneath)
18. [Mobile-first: phone layout is the base, split view is an enhancement at lg](#18-mobile-first-phone-layout-is-the-base-split-view-is-an-enhan)
19. [Page wrappers get their height reserved from the API's page dimensions before …](#19-page-wrappers-get-their-height-reserved-from-the-apis-page-d)
20. [Current page is measured against a reading line, not observed](#20-current-page-is-measured-against-a-reading-line-not-observed)
21. [Every overlay sits above z-index: 3](#21-every-overlay-sits-above-z-index-3)
22. [Scroll is smooth, but honors prefers-reduced-motion](#22-scroll-is-smooth-but-honors-prefers-reduced-motion)
23. [The splitter is authored by us, to system conventions](#23-the-splitter-is-authored-by-us-to-system-conventions)
24. [SUPERSEDED](#24-superseded)
25. [Two layouts, not three](#25-two-layouts-not-three)
26. [The full layout is a touch layout, not "the desktop layout"](#26-the-full-layout-is-a-touch-layout-not-the-desktop-layout)
27. [The thumb strip is one scrub control, not 34 buttons](#27-the-thumb-strip-is-one-scrub-control-not-34-buttons)
28. [One focusedPage, three views of it](#28-one-focusedpage-three-views-of-it)
29. [SUPERSEDED](#29-superseded)
30. [The thumb strip's scale factor is computed in JS from a measured column, not e…](#30-the-thumb-strips-scale-factor-is-computed-in-js-from-a-measu)
31. [The verdict is a component that takes the whole review, never a list of issues](#31-the-verdict-is-a-component-that-takes-the-whole-review-never)
32. [Theme is a user setting](#32-theme-is-a-user-setting)
33. [The payload is validated at the boundary, not asserted with as Review](#33-the-payload-is-validated-at-the-boundary-not-asserted-with-a)
34. [Two test suites, two runners](#34-two-test-suites-two-runners)
35. [The compact layout hides the inactive view with display: none, so find-on-page…](#35-the-compact-layout-hides-the-inactive-view-with-display-none)
36. [PWA ships display: browser](#36-pwa-ships-display-browser)
37. [The product says minor findings are accepted, never ignored](#37-the-product-says-minor-findings-are-accepted-never-ignored)
38. [React Router, and /documents exists as a stub](#38-react-router-and-documents-exists-as-a-stub)
39. [The version lives in the URL (?v=3), not in component state](#39-the-version-lives-in-the-url-v3-not-in-component-state)
40. [Two versions of one document replace ?fixture=clean](#40-two-versions-of-one-document-replace-fixtureclean)
41. [Blocked, the page does not offer submit](#41-blocked-the-page-does-not-offer-submit)
42. [The upload dialog is inert](#42-the-upload-dialog-is-inert)
43. [Submitting is a sequence: confirm → Submitting… → Submitted → the queue](#43-submitting-is-a-sequence-confirm-submitting-submitted-the-qu)
44. [A Done checkbox per issue, scoped to review + version](#44-a-done-checkbox-per-issue-scoped-to-review-version)
45. [The severity counts are also the filter, and the count never changes](#45-the-severity-counts-are-also-the-filter-and-the-count-never)
46. [Sorting rearranges rows and never renumbers them; severity sort sinks done rows](#46-sorting-rearranges-rows-and-never-renumbers-them-severity-so)
47. [Severity words get their own text tokens, separate from the fills](#47-severity-words-get-their-own-text-tokens-separate-from-the-f)
48. [VERA is the product name, always in capitals](#48-vera-is-the-product-name-always-in-capitals)
49. [Deployed to Vercel, not the existing Apache host](#49-deployed-to-vercel-not-the-existing-apache-host)
50. [Scroll tracking is a setting, default on](#50-scroll-tracking-is-a-setting-default-on)
51. [URL.parse is polyfilled, and the app has an error boundary](#51-urlparse-is-polyfilled-and-the-app-has-an-error-boundary)
52. [The compact upload control carries the word "Upload"](#52-the-compact-upload-control-carries-the-word-upload)
53. [A truncated title reveals itself on hover or tap](#53-a-truncated-title-reveals-itself-on-hover-or-tap)
54. [The queue row says why, not just what](#54-the-queue-row-says-why-not-just-what)
55. [Each row shows its cover page, as a stack of paper](#55-each-row-shows-its-cover-page-as-a-stack-of-paper)
56. [No pinch-to-zoom](#56-no-pinch-to-zoom)
57. [Three interface text sizes, as a user setting scaling the root font size](#57-three-interface-text-sizes-as-a-user-setting-scaling-the-roo)
58. [A floor under the thumb strip's scale, and the strip scrolls below it](#58-a-floor-under-the-thumb-strips-scale-and-the-strip-scrolls-b)
59. [The thumb strip resizes and closes, and panel sizes persist](#59-the-thumb-strip-resizes-and-closes-and-panel-sizes-persist)
60. [Page images in the strip, at every width](#60-page-images-in-the-strip-at-every-width)
61. [Pinch-to-zoom the document](#61-pinch-to-zoom-the-document)
62. [Secondary text gets its own contrast floor, measured in a test](#62-secondary-text-gets-its-own-contrast-floor-measured-in-a-tes)
63. [The build names itself, in the account menu and at /version.json](#63-the-build-names-itself-in-the-account-menu-and-at-versionjso)
64. [CI runs the suites and gates the deploy](#64-ci-runs-the-suites-and-gates-the-deploy)

65. [An automated accessibility rule scan, scoped to WCAG A and AA](#65-an-automated-accessibility-rule-scan-scoped-to-wcag-a-and-aa)

---

### 1. Vite + React + TypeScript

**2026-08-14**

**Decided:** Vite + React + TypeScript

**Over:** Next.js

No SSR need for a post-upload page behind auth. Every line explainable. Next.js is not yet shipped experience, so choosing it would mean defending framework behavior not personally lived.

### 2. ~~Hand-rolled components + CSS tokens on main; a second branch on a component …

**2026-08-14**

**Decided:** ~~Hand-rolled components + CSS tokens on `main`; a second branch on a component library~~ **SUPERSEDED**, see the shadcn row below

**Over:** —

Reversed once the framing changed from "this page" to "one screen in a suite." shadcn also collapses the two-branch idea: you own the source *and* depend on the behavior in one codebase, so there is no second side left to demonstrate.

### 3. Scope: no in-browser fixing, no real backend, no versioning

**2026-08-14**

**Decided:** Scope: no in-browser fixing, no real backend, no versioning

**Over:** Simulating the re-upload loop

The spec puts resolution outside the app. Simulating it would misrepresent the product.

### 4. VERA does no uploading

**2026-08-14**

**Decided:** **VERA does no uploading.** The re-upload loop exits the page.

**Over:** An upload control on the Review Page; simulating the version bump

The flow diagram gives re-upload to the Upload Page, a teammate's ticket. Owning it would be building someone else's screen and blurring the one job this page has.

### 5. Continuous-scroll PDF viewer, all pages and text layers mounted

**2026-08-14**

**Decided:** **Continuous-scroll PDF viewer**, all pages and text layers mounted

**Over:** Single page at a time; single page + hijacked CMD+F

Native CMD+F only finds text in the DOM. Whole-document search is an acceptance criterion, so the viewer architecture follows from it. Virtualization is the production answer at larger page counts.

### 6. react-pdf as the renderer, wrapping Mozilla's pdf.js

**2026-08-14**

**Decided:** **`react-pdf`** as the renderer, wrapping Mozilla's `pdf.js`

**Over:** Raw `pdfjs-dist`; commercial SDKs (Nutrient/PSPDFKit, Apryse)

`pdf.js` is the only serious open engine: Mozilla-owned, in Firefox, ~53k stars, since 2011, ~23M weekly downloads. `react-pdf` is a thin, maintained React binding over it (npm since 2014, v10, ~5M weekly) that adds no rendering of its own, so I get the heavy-hitter engine and skip writing the text-layer/worker glue. Raw `pdfjs-dist` = re-inventing a solved binding; commercial SDKs = annotation/licensing overkill for a read-only screen.

### 7. Issues list sorts by page order by default, with a severity sort available

**2026-08-14**

**Decided:** Issues list sorts by **page order by default**, with a severity sort available

**Over:** Severity-first default

Jane works through the document in page order when she goes to fix things. "What's blocking" is communicated by the summary above the list, not by the list's ordering.

### 8. Simulated re-upload is a stretch goal, built last

**2026-08-14**

**Decided:** Simulated re-upload is a **stretch goal, built last**

**Over:** Building it alongside the core; skipping it entirely

It satisfies no acceptance criterion. It exists to demonstrate the loop, so it is worth building only once the required work is done.

### 9. Checkboxes feed the simulator, never canSubmit

**2026-08-14**

**Decided:** Checkboxes feed the **simulator**, never `canSubmit`

**Over:** Letting checked blockers directly unlock submit

Reads correctly in the code and models the real rule: submission becomes possible because a new clean version arrived, not because a user asserted it.

### 10. Submit asks for confirmation naming the unresolved minors

**2026-08-14**

**Decided:** Submit asks for **confirmation naming the unresolved minors**

**Over:** Submitting straight through

"Minor may be ignored" is a choice the user makes. One-way door, no undo, mortgage file — she should acknowledge it once.

### 11. Render the terminal submitted state in place; label it "Submitted"

**2026-08-14**

**Decided:** Render the **terminal submitted state in place**; label it "Submitted"

**Over:** Navigate to a stub Submitted Page; label it "Reviewed"

`status: submitted` is a value the API can return, so this page must handle it regardless of the button. "Submitted" matches the data and carries the finality; "Reviewed" implies a state you could leave.

### 12. No un-submit / mark-for-re-review

**2026-08-14**

**Decided:** **No un-submit / mark-for-re-review**

**Over:** A reopen control

Not a scope call — the transition doesn't exist. No reopened status in the enum, one-way arrow in the flow diagram, and submission is an external event. Corrections happen via a new version.

### 13. Thumb strip down the viewer edge

**2026-08-14**

**Decided:** **Thumb strip** down the viewer edge — one colored segment per page

**Over:** Rendered page thumbnails

34 extra pdf.js renders for images too small to read. The strip's job is showing *where the problems cluster*, which colored rectangles do better and for ~30 lines. Uses the per-page `height`/`width` the API gives us.

### 14. Page-margin markers, numbered in page order, labeled with the real issue title…

**2026-08-14**

**Decided:** **Page-margin markers**, numbered in page order, labeled with the real issue title, severity by color **and** icon

**Over:** In-page highlighting via LLM lookup, via text-matching literals, or with a derived category taxonomy

The data gives `page` and no coordinates — anything drawn inside a page is an unsupported claim about position. Text-matching works for only ~half the issues with no way for a user to tell a correct miss from a bug. And absence-type issues ("Missing Summary of Findings") can never be highlighted by any technique. Bounding boxes from the backend are the production answer.

### 15. Scroll restore across reloads

**2026-08-14**

**Decided:** **Scroll restore across reloads — CUT**

**Over:** Persisting a page number, restored on the viewer's render signal

Gold-plating. Satisfies no acceptance criterion, and correct restore is more work than it appears: no page geometry exists at mount, so it must hang off the render signal and fire exactly once or scrolling away snaps the user back. Documented in Out of Scope rather than deleted, so the reasoning survives the question.

### 16. Accessibility in scope, including resizer keyboard support

**2026-08-14**

**Decided:** **Accessibility in scope**, including resizer keyboard support

**Over:** Shipping it mouse-only as a documented gap

The WAI-ARIA separator pattern is a `role`, four ARIA attributes and an arrow-key handler on top of pointer logic we're writing anyway. "I skipped accessibility" is also the one gap in that list a frontend reviewer would poke at, on a compliance tool used all day by people doing careful work.

### 17. shadcn/ui + Tailwind from the start (Radix underneath)

**2026-08-14**

**Decided:** **shadcn/ui + Tailwind from the start** (Radix underneath)

**Over:** Browser-native only; Radix directly; a runtime component library

Browser-native only covers most of ten controls, and native `<dialog>` handles the one hard piece. But this page is one screen of four in the spec's own diagram, inside a product that will already have components to reach for. Deciding "no library" from a ten-control sample is the reasoning that produces component soup: every screen looks small enough to hand-roll, and twenty screens later there are twenty slightly different buttons. shadcn resolves it rather than trading a side away: Radix behavior underneath, source copied into the repo so the skin is ours, CSS-variable tokens, re-syncable from the registry.

### 18. Mobile-first: phone layout is the base, split view is an enhancement at lg

**2026-08-14**

**Decided:** **Mobile-first**: phone layout is the base, split view is an enhancement at `lg`. **All text layers mounted, canvases windowed**

**Over:** Mounting every canvas (the original D1 plan); a separate mobile build; desktop-only

~10 MB per full-width canvas at DPR 2 means 34 pages approach 350 MB, and iOS Safari discards tabs for less. Separating the text layer (what find needs, cheap) from the canvas (what costs memory) preserves acceptance criterion #1 on every device and is strictly better on desktop too. One architecture, one tuning constant, no second code path to drift.

### 19. Page wrappers get their height reserved from the API's page dimensions before …

**2026-08-14**

**Decided:** Page wrappers get their **height reserved from the API's page dimensions** before the canvas paints

**Over:** Letting pages size themselves as they render

Pages render asynchronously, so an unreserved document has almost no height while it loads and any scroll target lands in the wrong place. The `height`/`width` fields turn out to be what makes navigation correct, not just strip decoration.

### 20. Current page is measured against a reading line, not observed

**2026-08-14**

**Decided:** Current page is **measured against a reading line**, not observed

**Over:** `IntersectionObserver` on each page

Observer callbacks fire only on threshold crossings, so distant pages report stale ratios and a page taller than the viewport never reaches the higher thresholds, which freezes the reading after one scroll. Measuring which page's top last passed a fixed line is deterministic and holds for oversized pages.

### 21. Every overlay sits above z-index: 3

**2026-08-14**

**Decided:** Every overlay sits **above `z-index: 3`**

**Over:** Leaving overlays at the default stacking

react-pdf's `.textLayer` is `z-index: 2` and `.annotationLayer` is `z-index: 3`. At equal z-index the pages win on DOM order and their invisible text covers the UI: it looks fine and silently eats every click.

### 22. Scroll is smooth, but honors prefers-reduced-motion

**2026-08-14**

**Decided:** Scroll is **smooth, but honors `prefers-reduced-motion`**

**Over:** Always smooth; always instant

Animating the movement shows the user *where* they went; a hard jump doesn't. For people who have asked for reduced motion, a long smooth scroll is nauseating rather than informative.

### 23. The splitter is authored by us, to system conventions

**2026-08-14**

**Decided:** The **splitter is authored by us**, to system conventions

**Over:** A splitter library; leaving it mouse-only

Radix has no splitter primitive, so this is a new primitive added to the system following its conventions, with the full WAI-ARIA window-splitter pattern.

### 24. SUPERSEDED

**2026-08-14**

**Decided:** **SUPERSEDED** — Submit uses **`aria-disabled`, not `disabled`**

**Over:** A genuinely `disabled` button

`disabled` drops the button out of the tab order and announces nothing, so a keyboard user tabs past the most important control on the page and is never told why. Focusable + `aria-disabled` + `aria-describedby` on the blocking summary means reaching it explains itself. Click handler no-ops while blocked.

### 25. Two layouts, not three

**2026-08-14**

**Decided:** **Two layouts, not three. The boundary is 1024px**

**Over:** A third shape for iPad portrait, splitting at 768

A middle shape is the most work to justify and the least designed. Two shapes answer four open iPad questions at once: thumb strip, resizer, bottom bar and header metadata all belong to the full shape, so nothing is half-built for a middle case. 1024 rather than 768 because at 768 an issues panel wide enough to read leaves a document column too narrow to. The rule is about the *window*, so iPad Split View and Stage Manager come out right with no special case. Cost accepted: an 820pt iPad portrait shows one panel where two would nearly fit.

### 26. The full layout is a touch layout, not "the desktop layout"

**2026-08-14**

**Decided:** **The full layout is a touch layout**, not "the desktop layout"

**Over:** Treating `lg`+ as pointer-only

The 13" iPad is 1024 CSS px wide *in portrait*, so the full shape appears on a touch screen before anyone rotates anything. Everything in it is therefore built to touch standards: Pointer Events over mouse events, 44px grab zones, `touch-action: none` on drag surfaces, `overscroll-behavior: contain` on the panels, and no essential affordance behind `:hover`. Rotating an iPad crossing 1024 flips between the two designs, which also happens to be the clearest demonstration that the full shape isn't the compact one stretched.

### 27. The thumb strip is one scrub control, not 34 buttons

**2026-08-14**

**Decided:** The thumb strip is **one scrub control, not 34 buttons**

**Over:** 34 individually clickable segments

34 targets at the 44px minimum need 1,496px of column, which rules the design out on touch. As a single press-and-drag control the minimum applies once, at 44px wide and full panel height, and the strip survives everywhere. Same interaction as the iOS index scrubber. It also earns slider semantics: `role="slider"`, `aria-valuenow` on the page number, arrow keys and Home/End, so a control designed for a thumb delivers keyboard navigation of the whole document. Forces a readout that follows the thumb, since a finger covers what it points at.

### 28. One focusedPage, three views of it

**2026-08-14**

**Decided:** **One `focusedPage`, three views of it.** The thumb strip marks it, the issues on it highlight in the list, the status bar names them

**Over:** Independent state per region

Everything on screen answers the same question, *what am I looking at*, so it is one value rather than three features that can disagree. Scroll position is its only writer: clicking an issue or dragging the strip *scrolls*, and the highlight follows arrival. Otherwise the reading line reports every page the smooth scroll passes through and the list strobes on the way to page 17. Not color-only: `aria-current` on the strip segment and the highlighted rows, with the status bar as the text channel.

### 29. SUPERSEDED

**2026-08-14**

**Decided:** **SUPERSEDED** — The issues list never scrolls itself

**Over:** `scrollIntoView({ block: 'nearest' })` on the focused page's first issue

The list is the user's: they scrolled it somewhere on purpose, and having it move under them because the document scrolled takes that away. The highlight is enough, and if it is off-screen the status bar still names the issues on the page, which is the third of the three redundant routes doing its job.

### 30. The thumb strip's scale factor is computed in JS from a measured column, not e…

**2026-08-14**

**Decided:** The thumb strip's scale factor is **computed in JS from a measured column**, not expressed in CSS

**Over:** Percentage heights + `aspect-ratio`; a per-segment `min-height` floor

Every CSS formulation of "one scale factor" stops being one factor the moment a constraint binds: a clamped segment gets its own and renders a short page *wider* than a full page. Fitting height alone ignores width and blows a four-page document out of a 44px column; percentage heights plus a flex `gap` overflow by `(n−1) × gap` on every viewport, putting the last pages below the fold of a control you drag rather than scroll. All three are invisible against a uniform Letter fixture. Measuring is the only version that is the rule the document describes.

### 31. The verdict is a component that takes the whole review, never a list of issues

**2026-08-14**

**Decided:** **The verdict is a component that takes the whole `review`**, never a list of issues

**Over:** Computing it inside the issues panel from the array being rendered

The panel renders a *view*, sorted and filtered, and a verdict derived from that view under-reports the moment anything is hidden while looking like it works. Taking `Review` makes the mistake unrepresentable. It also fixed a second bug in the same place: the copy was hardcoded to the blocked state, so a clean document read "0 issues must be fixed / before you can submit", overfitting the one thing D4 says must not be overfitted.

### 32. Theme is a user setting

**2026-08-14**

**Decided:** **Theme is a user setting** — system / light / dark, from the account menu

**Over:** System preference only; no dark mode at all

The palette was already authored and completely unreachable, so an iPhone in dark mode rendered white. Resolving the three-value preference in JS and letting CSS see only a `.dark` class keeps one definition of dark instead of a class rule and a media query that can drift. Device-scoped rather than account-scoped: which theme suits you depends on the screen and the room, not on who you are. An inline script applies it before first paint, because the alternative is a white flash on every load.

### 33. The payload is validated at the boundary, not asserted with as Review

**2026-08-14**

**Decided:** **The payload is validated at the boundary**, not asserted with `as Review`

**Over:** Trusting the cast; a schema library

The app's central claim is that it isn't overfitted to the supplied mock, which needs a boundary that actually looks. Without one, `issues: null` sails past the error state built for it and dies inside a render, and an unrecognized severity degrades silently into an uncolored dot and a `NaN` count. Hand-written in ~20 lines rather than a dependency, because the short dependency list is part of the argument. Raw parser messages stopped reaching the UI at the same time.

### 34. Two test suites, two runners

**2026-08-14**

**Decided:** **Two test suites, two runners** — vitest on the rules, Playwright on the layout

**Over:** One runner; screenshot baselines

The rules are pure functions, so they test fastest with no DOM at all. Layout is the opposite: jsdom has no layout engine, so the class of bug the layout suite exists to catch is the class jsdom cannot see. No screenshot baselines, because WebKit and Chromium rasterize type differently, so they would need a set each and would churn on every change; structure is what's invariant. The suite earned itself immediately by catching a 32px submit button under the 44px minimum.

### 35. The compact layout hides the inactive view with display: none, so find-on-page…

**2026-08-14**

**Decided:** **The compact layout hides the inactive view with `display: none`**, so find-on-page reaches the document only from the Document tab

**Over:** Keeping the document mounted and moved off-screen; a `visibility`/`clip` variant

Restoring find in both tabs would highlight a match somewhere the user cannot see, in a layout whose premise is one thing at a time, and it would pin all 34 text layers in the DOM permanently on the device where memory is scarce, which is the pressure the text-layer/canvas split exists to relieve. Find while looking at the document is the only moment anyone invokes it. §6d's claim is qualified accordingly; the full layout is unaffected because both panels are always mounted.

### 36. PWA ships display: browser

**2026-08-14**

**Decided:** **PWA ships `display: browser`. The browser chrome is load-bearing, so we keep it**

**Over:** `display: standalone`, which is what "make it a PWA" usually means

Standalone is the app-like option and it removes the browser chrome, which is where iOS keeps Find on Page. There is no share sheet and no address bar in a standalone window, so installing the app would delete the affordance acceptance criterion #1 depends on. Chrome over polish: an installed icon that opens into Safari keeps whole-document search working on the device we most want to test on. `apple-mobile-web-app-capable` is absent for the same reason, since on iOS it forces standalone regardless of the manifest. The alternative is building find into the page, which D1 declined *because the platform had one*; that reasoning inverts the moment the platform's is taken away, so the cheaper move is to not take it away.

### 37. The product says minor findings are accepted, never ignored

**2026-08-14**

**Decided:** The product says minor findings are **accepted**, never *ignored*

**Over:** Using the brief's own word, "ignored"

The brief's acceptance criterion reads "minor may be ignored", which is fine in a requirements document and wrong in a regulated one. *Ignored* means not looked at; what happens is that a qualified reviewer sees the finding, judges it non-material and accepts it. That distinction is the value of the record, and no lender wants a compliance file stating six findings were ignored. "Accepted as-is" is also appraisal-native language. The stronger term is *exception*, precise and standard in "approved with exceptions", but it reads stiffer and *accepted* carries the meaning without the jargon. The submitted state says "accepted" rather than "unresolved" for the same reason: on a closed file they are not outstanding work.

### 38. React Router, and /documents exists as a stub

**2026-08-14**

**Decided:** **React Router**, and `/documents` exists as a stub

**Over:** Hand-rolled `pushState`; owning no second route at all

Writing a router for two routes is the same mistake as writing a pdf.js binding: use the library when one exists, which is the rule already applied to shadcn and react-pdf. The stub list is what makes the whole loop demonstrable more than once; without somewhere to return to, submitting is a one-way trip and an evaluator gets one shot at the most important interaction in the build.

### 39. The version lives in the URL (?v=3), not in component state

**2026-08-14**

**Decided:** **The version lives in the URL** (`?v=3`), not in component state

**Over:** Component state; a version picker with no address

It is a different thing to look at, so it gets an address: "this document at v2" becomes a link that survives a paste and a reload, and the back button lands where you expect.

### 40. Two versions of one document replace ?fixture=clean

**2026-08-14**

**Decided:** **Two versions of one document replace `?fixture=clean`**

**Over:** Two separate documents; a query-param demo switch

Both fixtures share one PDF, and two differently-named properties with byte-identical pages is a fiction a reviewer notices. Same document, later version is the truth, and it tells the product's own loop: fix externally, re-upload, submit.

### 41. Blocked, the page does not offer submit

**2026-08-14**

**Decided:** **Blocked, the page does not offer submit.** It offers *Upload new version*, and keeps offering it once nothing is blocking

**Over:** Keeping an `aria-disabled` submit; showing upload only while blocked

A control labelled with an action it will not carry out is wrong every time it renders, and disabling it only makes it quieter about being wrong. This supersedes the `aria-disabled` decision below: not having an unavailable control beats explaining one. It stays visible once nothing is blocking because someone may decide to fix the minors after all, and withdrawing the escape hatch the moment a document passes makes the clean state feel like a trap. It disappears only on submission, when there is nothing left to re-upload for. Outlined rather than filled throughout, because submitting is the goal and this is the fallback; icon-only below `lg`, where the bottom bar is already carrying the verdict and the primary action.

### 42. The upload dialog is inert

**2026-08-14**

**Decided:** **The upload dialog is inert**

**Over:** Wiring a real file input; linking away to nothing

VERA does not upload; that screen is a teammate's ticket. But a blocked state with no visible next step looks like a dead end when it is a loop. The dialog shows where the loop goes and stops at the boundary, saying so in as many words.

### 43. Submitting is a sequence: confirm → Submitting… → Submitted → the queue

**2026-08-14**

**Decided:** **Submitting is a sequence**: confirm → *Submitting…* → *Submitted* → the queue

**Over:** Submitting instantly; a toast

A real submission is a network round trip, and collapsing the one irreversible action in the app into an instant nothing makes it feel like it did not happen. The dialog becomes the progress surface rather than vanishing and leaving the page to explain itself. The finished row then settles on the list over three and a half seconds, slow because a quick flash reads as an error and this is a completion.

### 44. A Done checkbox per issue, scoped to review + version

**2026-08-14**

**Decided:** **A Done checkbox per issue, scoped to review + version**

**Over:** No checkbox; a global "handled" list

A private worklist, and the point is what it *cannot* do: `canSubmit` takes a whole `Review` and a checkbox is not part of one, so a defective file cannot be submitted by lying to a checkbox. Version scoping is not tidiness — a tick carried from v2 would claim a defect was handled that v3 never raised.

### 45. The severity counts are also the filter, and the count never changes

**2026-08-14**

**Decided:** **The severity counts are also the filter**, and the count never changes

**Over:** A separate filter row; changing the counts to match the list

One control both states the verdict and filters the list, which is only safe because the *number* stays fixed and just the opacity moves. Hide the thirteen minors to concentrate on what is blocking, and the summary still says there are thirteen. Done rows follow the same rule.

### 46. Sorting rearranges rows and never renumbers them; severity sort sinks done rows

**2026-08-14**

**Decided:** **Sorting rearranges rows and never renumbers them**; severity sort sinks done rows

**Over:** Renumbering on sort; leaving done rows in place

The number appears beside the row *and* against the document, so it has to survive re-sorting. Page order is a map of the document, where a handled issue keeps its place; severity order is a worklist, where what is left to do belongs at the top.

### 47. Severity words get their own text tokens, separate from the fills

**2026-08-14**

**Decided:** **Severity words get their own text tokens**, separate from the fills

**Over:** Reusing the dot colors as text

The fills are tuned to read as 8px marks. As 12px type they measure 4.77, 2.56 and 3.63 against white, two of three failing the 4.5 AA floor outright. The darkened text tokens clear 5.8 or better, and a Playwright test measures it against both surfaces in both themes rather than asserting it in a comment.

### 48. VERA is the product name, always in capitals

**2026-08-14**

**Decided:** **VERA is the product name**, always in capitals

**Over:** Shipping the UNDIRT codename; title case

MIRA is set in capitals everywhere on HomeVision's site, so a sibling product rendered as "Vera" reads as a different kind of thing. Latin *verus*, true: MIRA finds the problems, VERA is where a person decides. The mark borrows their faceted construction rather than their shape: a cut slab with a triangle tucked under it, arms uneven so it reads as a check as well as a V.

### 49. Deployed to Vercel, not the existing Apache host

**2026-08-14**

**Decided:** **Deployed to Vercel, not the existing Apache host**

**Over:** FTP to the same cPanel box as the portfolio site

The portfolio lives on that host. Deploying here would mean touching the same document root, credentials and `.htaccess` as a site actively being sent to employers, for no benefit. Vercel is a separate blast radius with instant certificates. The rewrite matches **only extensionless paths**, because a blanket rule hands `index.html` back for a missing asset with a 200: the "Unexpected token '<'" white screen that only ever appears after a deploy.

### 50. Scroll tracking is a setting, default on

**2026-08-15**

**Decided:** **Scroll tracking is a setting, default on.** The list follows the document unless the user turns it off

**Over:** Keeping the list permanently still (the decision below); making it follow with no way out

Both behaviors are defensible and neither is obviously right, which is the signal that it belongs to the user rather than to us. Following keeps the issue beside the page it describes, which matters most on a document you do not know — and the tint is easy to miss when it lands off-screen. Not following leaves a panel you scrolled on purpose where you left it. Default on because a first-time reader benefits from being taken there, and `block: 'nearest'` means it does nothing when the row is already visible, so it never jerks the list while you read down it. This supersedes the row below, which had the reasoning right but forced the answer.

### 51. URL.parse is polyfilled, and the app has an error boundary

**2026-08-15**

**Decided:** **`URL.parse` is polyfilled, and the app has an error boundary**

**Over:** Raising the browser floor and saying so in the README; leaving React to unmount on an uncaught error

`pdfjs-dist` calls `URL.parse`, which is Chrome 126, Firefox 126 and **Safari 18.4 — March 2025**. On an iPad running 17.4 it is `undefined`, pdf.js throws while resolving its worker, and the entire app went blank: content flashing once and vanishing, in both iPad browsers, with a stack pointing only into a vendor chunk. A dependency's browser floor is the product's floor whether or not anyone declared one, and "upgrade your iPad" is not an answer a lender accepts for hardware it issued. The polyfill is the spec's own contract — `new URL`, returning `null` instead of throwing — so nothing downstream can tell the difference. The reason it took the *app* down rather than the viewer is that there was no error boundary anywhere; there is one now, and it shows the error rather than swallowing it, because on a tablet there is no console to open. Both are tested by deleting the API, since asserting a polyfill exists proves nothing about the app that needs it.

### 52. The compact upload control carries the word "Upload"

**2026-08-15**

**Decided:** **The compact upload control carries the word "Upload"**

**Over:** The icon alone, with the label in the accessible name

An upward arrow is not a word: it reads as export, or share, or open. This is the only route out of a blocked review, so the one control that must not be a guess was the one with no label. The full phrase stays in the accessible name at every width.

### 53. A truncated title reveals itself on hover or tap

**2026-08-15**

**Decided:** **A truncated title reveals itself on hover or tap**

**Over:** The `title` attribute; leaving it truncated

That tooltip is the browser's — never shown on touch, a second's delay on a pointer, unstyleable — and this screen exists to identify *which* loan file you are looking at. A popover rather than a tooltip, because tooltips are hover-only by design and this has to work under a thumb. It only becomes a control when the text is actually cut off: a button that reveals the same string is a promise of information that is not there. The trigger fills its container deliberately — a shrink-to-fit one lets the text stop being constrained, so the measurement that created the button then deletes it, which flickers and settles on the wrong answer.

### 54. The queue row says why, not just what

**2026-08-15**

**Decided:** **The queue row says why, not just what**

**Over:** The status pill alone; a count typed into the catalog

"Awaiting review" raises the question it cannot answer — waiting on what? A queue where every row looks equally stuck has to be triaged one row at a time, by opening each. The row now carries the blocking count of the version you would land on, in the severity's own color, and switches to what was accepted once the document is submitted. Counted from the fixture rather than stored beside the catalog, because the number is a property of the findings and one typed into the catalog goes quietly wrong the first time a fixture changes.

### 55. Each row shows its cover page, as a stack of paper

**2026-08-15**

**Decided:** **Each row shows its cover page, as a stack of paper**

**Over:** No thumbnail; a generic file glyph on every row

A list of documents that shows none of them makes every row the same shape, and a first page is recognizable long before a filename is readable. The sheets behind are the one piece of pure decoration, and they earn it by saying "multi-page" without spending text on it. pdf.js is ~420 KB and this is the first screen anyone loads, so the render is lazily imported and the row reserves its space and shimmers until it arrives. Rows without a PDF get the same stack, empty — not a generic glyph and not somebody else's page: a pending document has no cover yet, and an empty sheet is what that looks like.

### 56. No pinch-to-zoom

**2026-08-14**

**Decided:** **No pinch-to-zoom — CUT**

**Over:** Handling the gesture and re-rendering pages at a new scale; letting the browser zoom the page

The expected gesture on an iPad, and a real gap. Doing it properly reaches into the reserved page heights and the reading-line measurement, both load-bearing. Letting the browser zoom is a one-liner that breaks a fixed app shell. Deferred with the consequence stated: on a tablet the page renders at the width we choose and cannot be magnified.

### 57. Three interface text sizes, as a user setting scaling the root font size

**2026-08-16**

**Decided:** **Three interface text sizes**, as a user setting scaling the root font size

**Over:** Leaving it to browser zoom; a single larger default

Browser zoom magnifies the document along with the interface, so a reader who can already read the pages gets bigger pages they did not ask for. Tailwind sizes type *and* spacing in rem, so one root value moves labels, padding, gaps and the 44px touch minimum together. Percentages of the browser default rather than px, so a reader who has already raised their base size keeps it and gets this on top. The document is deliberately excluded and has its own zoom.

### 58. A floor under the thumb strip's scale, and the strip scrolls below it

**2026-08-16**

**Decided:** **A floor under the thumb strip's scale**, and the strip scrolls below it

**Over:** Fitting always, as shipped; a resizable strip alone

Fitting the whole document into a fixed column is right for 34 pages and wrong for a hundred: against an 800px column, 34 pages give 21.6 x 16.7px and 100 give 6.0 x 4.6px. The scale becomes `max(fit, floor)` with the floor in rem, so it follows the text-size setting with no preference plumbed into the component. Below the floor the strip scrolls, which costs the thing the original design avoided: a `touch-action: none` scrub surface cannot be scrolled by the finger it exists for, so the strip scrolls itself and edge auto-scroll becomes mandatory. Resizing the strip alone would not have changed the thumb size at all — height was the binding constraint, not width.

### 59. The thumb strip resizes and closes, and panel sizes persist

**2026-08-16**

**Decided:** **The thumb strip resizes and closes**, and panel sizes persist

**Over:** A fixed 44px strip; persisting nothing

Until it is dragged, the strip fits the document into its column and stays a map. Dragged, width decides how big a page is, up to 140px. Dragged shut it costs no width at all and leaves a pull tab, because a panel that cannot be dismissed is always in the way on a laptop. Sizes persist to `vera.panels`, device-scoped, written on change and never on mount — `strip: null` means *never dragged*, and a stored default would switch every reader into the resized behaviour on their first visit.

### 60. Page images in the strip, at every width

**2026-08-16**

**Decided:** **Page images in the strip, at every width** — REVERSES the "not thumbnails" row above

**Over:** Colored rectangles only; images above a size threshold

The original call was that a picture that small is unreadable. True of the picture, and beside the point of it: a cover sheet, a table and a photo page are three different shapes even as a smear, which is enough to navigate by. The page number and the severity marks still carry the reading. Rendered from a second react-pdf `Document` in its own lazily-imported chunk, so pdf.js stays out of the entry bundle.

### 61. Pinch-to-zoom the document

**2026-08-16**

**Decided:** **Pinch-to-zoom the document** — REVERSES the CUT row above

**Over:** Leaving it cut; letting the browser zoom the page

The cost named when it was cut was real and was paid: zoom changes every reserved page height and the reading-line measurement. A transform follows the gesture and a real re-render lands when it ends, because re-rendering the canvas window every frame is not viable. The canvas window narrows as zoom opens, since a canvas costs the square of the zoom, and the page being read is anchored across the change. On a trackpad the same gesture zooms the document rather than the app.

### 62. Secondary text gets its own contrast floor, measured in a test

**2026-08-16**

**Decided:** **Secondary text gets its own contrast floor**, measured in a test

**Over:** Leaving shadcn's default `--muted-foreground`

It shipped under the AA floor in light mode: 4.27:1 against a highlighted row, where 4.5 is the minimum, and 4.44 and 4.48 on two other surfaces. Reported as a dark-mode problem, where it measures 5.53 and passes but still reads badly, because a neutral grey on a blue-violet tint at 12px reads worse than its ratio. It carries the issue descriptions, which are the finding itself. The contrast spec now measures it on every surface in both themes, which is the check that would have caught it.

### 63. The build names itself, in the account menu and at /version.json

**2026-08-16**

**Decided:** **The build names itself**, in the account menu and at `/version.json`

**Over:** Leaving the deployed build anonymous

A deployed link that cannot say which build it is turns every "is that fixed yet?" into a guess on both sides. Stamped at build time from `package.json` and the commit SHA.

### 64. CI runs the suites and gates the deploy

**2026-08-16**

**Decided:** **CI runs the suites and gates the deploy**

**Over:** Vercel's own Git integration; deploying by hand

Vercel's integration deploys whatever was pushed, green or not, and the point of having 244 browser tests is that they get to vote. Every push runs lint, types, the production build and both suites across Chromium and WebKit; `main` deploys only if all of it passed, then re-reads `/version.json` to confirm the live build is that commit rather than trusting a 200.

### 65. An automated accessibility rule scan, scoped to WCAG A and AA

**2026-08-16**

**Decided:** **`@axe-core/playwright` over both routes in both themes**, plus the confirmation dialog while open

**Over:** Leaving the rule-level claims asserted only in prose; running every rule axe ships

Roles, names and keyboard paths were already asserted, but "nothing is carried by colour alone" and "every icon-only control has an accessible name" were claims a reader had to take on trust. This turns them into something CI enforces on every push. Scoped to `wcag2a` / `wcag2aa` / `wcag21aa` rather than the full rule set, because the extras are largely best-practice advisories and a suite that fails on advice is one people learn to ignore. `.react-pdf__Document` is excluded: it is third-party canvas output whose inaccessibility is a known limitation with a server-side fix, and scanning it would report the same unfixable finding forever. It found one thing immediately — a 3.37:1 contrast failure on the submit button — which turned out to be axe reading a background 96% of the way through a fade, so the suite waits for finite animations to finish before scanning. Proposed by Claude Code; the floor, not the ceiling, since no rule scan can say whether a page makes sense to listen to.
