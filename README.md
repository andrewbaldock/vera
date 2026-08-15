# UNDIRT — Uploaded New Doc Issue Review Tool

HomeVision frontend take-home: the **Review Page**.

A user uploads a document; the backend's AI processes it and reports issues that must be
resolved before submission. This page shows those issues, explains what is blocking
submission, and opens the gate when nothing critical or major remains.

**UNDIRT does no uploading. It is the gate.**

### ▶︎ Live: **[undirt.andrewbaldock.com](https://undirt.andrewbaldock.com)**

Deployed so it can be opened on a real phone rather than a resized desktop window — that
distinction matters for this build, and the reasoning is in
[`docs/DESIGN.md`](docs/DESIGN.md). Rotating an iPad across 1024px switches between the two
layouts, which is the quickest way to see that the wide one isn't the narrow one stretched.

---

## Quickstart

Whether you cloned the repo or unzipped an archive, this is the whole of it.

**You need [Bun](https://bun.sh)** — one install, no Node required:

```sh
curl -fsSL https://bun.sh/install | bash
```

Then, from the project root:

```sh
bun install
bun run dev
```

Open **<http://localhost:1337>**. The port is pinned (`strictPort`), so if something else
holds it the server fails loudly instead of quietly moving.

### Everything you can run

| Command | What it does |
|---|---|
| `bun run dev` | Dev server with hot reload on port 1337 |
| `bun run build` | Typecheck **and** production build into `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun test` | Unit tests — the product rules (vitest, ~0.2s) |
| `bun run test:layout` | Layout tests in real browsers (Playwright) |
| `bun run lint` | oxlint |

The layout suite needs its browsers once:

```sh
bunx playwright install chromium webkit
```

### Two things worth knowing

**`?demo`** — <http://localhost:1337/?demo> opens the react-pdf spike that proved the viewer
behaviors before the real one was written. It is kept as evidence rather than deleted, and
it is lazy-loaded so it costs regular users nothing.

**Testing on a phone.** The dev server binds all interfaces, and Xcode's iOS Simulator shares
the host network, so `localhost:1337` works there directly. A physical device on the same
Wi-Fi needs your machine's LAN address instead.

---

## Read this first

**[`docs/DESIGN.md`](docs/DESIGN.md)** is the record of every decision in this project — what
was chosen, what was rejected, and why. It was written *before* the code and is updated *as*
the code, and it ends in a decision log. If something here isn't explained there, that's a gap.

- [`docs/DESIGN.md`](docs/DESIGN.md) — **why**: scope, flow, decisions, decision log
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — **how**: layers, data flow, the viewer, the token layer, testing, and the seams where this changes at scale
- [`docs/wireframes/`](docs/wireframes/) — UX sketches and the two layout shapes, drawn before implementation
- [`docs/assignment.pdf`](docs/assignment.pdf) — the original brief

## How it's put together

```
src/
  lib/review.ts        the product rules as pure functions — canSubmit lives here
  types/review.ts      the payload shape, modeled from the mock, not the prose
  hooks/useReview.ts   fetch + validate + loading/error/ready
  hooks/useTheme.ts    system / light / dark
  components/          the shell, the panels, the thumb strip, the splitter
  components/ui/       shadcn/ui source, copied in and owned here
tests/                 Playwright — layout, in real browsers
```

**The rules are separated from the UI on purpose.** `canSubmit` takes a whole `Review` and
reads only its issues, so there is no path — not even an accidental one — from a checkbox or
a filtered list to the gate. That signature is the guarantee, and it's the file most worth
reading first.

**Two layouts, one component tree.** The shape is decided entirely in CSS at 1024px — no
media-query hook, no branch, no second subtree to drift. Below that: one thing at a time with
a view switcher and a merged verdict/submit bar. Above it: the split view with a draggable
splitter and the thumb strip. A 13" iPad is 1024px wide *in portrait*, so the wide layout is a
touch layout that sometimes also has a cursor — every control in it is built to that standard.

## Testing

Two suites, because they answer different questions.

**`bun test` — the rules.** `canSubmit`, the severity counts, issue numbering that has to stay
attached to its issue when the list is re-sorted, and the payload guard. Pure functions, no
DOM, milliseconds.

**`bun run test:layout` — the layout, in Chromium and WebKit.** Twelve real viewports from a
320px iPhone SE to 1920px, asserting no horizontal overflow, that the page itself never
scrolls, that each width renders the correct shape *and not the other one*, that exactly one
submit button is visible and on screen, and that every touch target clears 44px. Then a sweep
from 320 to 1920 in 40px steps, because a fixed matrix sails straight past the 1007px disaster.

No screenshot baselines — WebKit and Chromium rasterize type differently, so baselines would
need a set each and would churn on every change. Structure is what's actually invariant.

**Caveat worth stating:** Playwright's WebKit is what Safari is built on, but it is not Safari,
and its mobile emulation will not reproduce `dvh` against the real toolbar, safe-area insets,
or momentum scrolling. The iOS Simulator remains the mobile truth; this suite is the
regression net underneath it.

## Accessibility

Treated as a strength of this build rather than a pass at the end. It's a compliance tool in a
regulated industry, used all day, by people doing careful work.

- **Submit is `aria-disabled`, never `disabled`.** A `disabled` button leaves the tab order and
  announces nothing, so a keyboard user walks past the most important control on the page and
  is never told why. Focusable, plus `aria-describedby` pointing at the blocking summary, means
  reaching it explains itself. The click handler no-ops while blocked.
- **Severity is never carried by color alone.** Rows pair the dot with a text label; in the
  thumb strip, where a 29px-wide segment has no room for words, the marks differ in *thickness*
  as well as hue, so they survive grayscale.
- **The splitter is a real WAI-ARIA window splitter** — `role="separator"`, `aria-valuenow`,
  arrow keys and Home/End. Radix has no such primitive, so it's authored here to the system's
  own conventions rather than left as a mouse-only gap.
- **The thumb strip is a slider**, which is a consequence of designing it for a thumb: one
  scrub control instead of 34 tap targets means `role="slider"`, `aria-valuetext`, arrow keys
  and Home/End come along for free. A control built for touch delivers keyboard navigation of
  the entire document.
- **Landmarks and a skip link.** `header`, a labeled issues region, `main` for the document,
  and a skip link so a keyboard user doesn't walk 25 issues to reach the document.
- **Nothing essential is behind `:hover`**, because the wide layout appears on touch screens.
  Hover is layered on top as an enhancement only.
- **Touch targets are 44px** — Apple's HIG number, which is also WCAG 2.1's AAA target size.
  WCAG 2.2's AA minimum is only 24px; exceeding it is deliberate on a one-way submit with no
  undo. This is asserted in the layout suite rather than claimed.

**The honest limitation:** a rendered PDF is not accessible. pdf.js paints to a canvas with a
selectable text layer over it — good enough for search and selection, not a substitute for a
tagged document. No client-side work fixes that; it belongs to whatever produces the PDF.
Stated plainly in [`docs/DESIGN.md`](docs/DESIGN.md) rather than glossed.

## Data

The API does not exist yet, so the app fetches a static mock over HTTP — a real async boundary
rather than a build-time import, so the loading and error states are honest.

- `public/review_mock.json` — the supplied mock response
- `public/docs/example_document.pdf` — the document it describes. The mock's `pdf_url` points
  at `example.com`; the app substitutes the local path at the boundary, so the fixture stays a
  faithful copy of what we were given.

The payload is **validated, not asserted**. A cast is a promise; `isReview()` actually looks,
so a malformed response reaches the error state instead of dying inside a render.

## Installable, deliberately not standalone

There's a web manifest and a full icon set, because this gets opened on a phone to be tested
on a phone — and without an `apple-touch-icon`, iOS uses a *screenshot of the page* as the
home-screen icon.

But it ships **`display: browser`**, not `standalone`. Standalone is what makes a PWA feel like
an app, and it does that by removing the browser chrome — which is exactly where iOS keeps
**Find on Page**. Whole-document search is an acceptance criterion, so the chrome is
load-bearing. `apple-mobile-web-app-capable` is deliberately absent for the same reason: on iOS
it forces standalone regardless of the manifest.

No service worker. The app is one screen backed by a live review, and serving a stale verdict
offline would be worse than saying nothing.

## Dependencies

Every package we chose to add. Direct dependencies only — this is what's in `package.json`,
not the resolved tree. The list is short on purpose, and every line should be defensible.

### Runtime

| Package | Version | Why it's here |
|---|---|---|
| `react`, `react-dom` | ^19.2.8 | The framework. React 19 for the current baseline, no experimental APIs used. |
| `react-pdf` | ^10.4.1 | Thin, maintained React binding over Mozilla's pdf.js. Adds no rendering of its own — it saves writing the worker and text-layer glue, not the engine. |
| `pdfjs-dist` | 5.4.296 | The PDF engine. **Pinned exactly**, with no caret: the worker version must match what `react-pdf` loads or it throws at runtime. Declared rather than relied on via hoisting. |
| `tailwindcss`, `@tailwindcss/vite` | ^4.3.3 | Styling, and the token layer the whole theme rests on. |
| `radix-ui` | ^1.6.7 | Accessible behavior under the shadcn components — menus, focus management, dismissal. The part that is genuinely hard to write. |
| `lucide-react` | ^1.31.0 | Icons. Also, as it happens, the icon set HomeVision's own site uses. |
| `class-variance-authority` | ^0.7.1 | Typed component variants. Arrives with shadcn. |
| `clsx`, `tailwind-merge` | ^2.1.1 / ^3.6.0 | Conditional classes, with later Tailwind utilities correctly overriding earlier ones. The `cn()` helper. |
| `tw-animate-css` | ^1.4.0 | The animation utilities shadcn's generated components reference. |
| `@fontsource-variable/geist` | ^5.3.0 | Self-hosted typeface — no third-party font request at runtime. |

### Development

| Package | Version | Why it's here |
|---|---|---|
| `vite` | ^8.2.0 | Build tool and dev server. |
| `@vitejs/plugin-react` | ^6.0.4 | React fast refresh and JSX transform. |
| `typescript` | ~6.0.2 | `strict`, with `noUnusedLocals` and `noUnusedParameters`. |
| `vitest` | ^4.1.10 | Unit tests for the rules. |
| `@playwright/test` | ^1.62.1 | Layout tests in real browsers, which is the only place layout can be tested. |
| `oxlint` | ^1.75.0 | Linting. Fast enough to run without thinking about it. |
| `shadcn` | ^4.18.0 | The CLI that copies component source into the repo. Not a runtime dependency — nothing imports it. |
| `@types/*` | — | Type definitions for React and Node. |

## Stack, and why

**Vite + React + TypeScript + Tailwind + shadcn/ui** (Radix underneath).

No SSR need for a post-upload page behind auth, so Vite rather than Next.js — and every line
of it is explainable, which a framework whose behavior I haven't shipped in production would
not be.

The component library is a deliberate call rather than a default. This page has about ten
controls, and browser-native accessibility covers most of them — but it is one screen of four
in the brief's own flow diagram, inside a product that will already have components to reach
for. Deciding "no library" from a ten-control sample is how component soup starts: every
screen looks small enough to hand-roll, and twenty screens later there are twenty slightly
different buttons.

shadcn specifically, because it copies source into the repo rather than shipping a runtime
dependency: Radix supplies the hard behavior, the skin stays ours to edit, tokens are CSS
variables, and the registry keeps it re-syncable rather than a fork.

The splitter and the thumb strip are authored here, since Radix has no such primitives —
additions to the system following its conventions rather than gaps in it. Full reasoning and
the alternatives rejected are in [`docs/DESIGN.md`](docs/DESIGN.md).
