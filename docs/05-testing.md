# Testing

**Purpose:** what's verified, how, and what isn't.
**Audience:** an engineer deciding whether to trust this code.
**Read time:** 4 minutes.
**Last reviewed:** 2026-08-16

---

## What I test, and what I don't

The policy, before the detail: **test the rules exhaustively, test the layout structurally, and
test nothing by screenshot.**

The product rules are where a bug is expensive and silent — a document that submits when it
should not is worse than one that looks wrong — so those get pure functions and full coverage.
Layout gets tested for structure rather than appearance, because structure is what has to hold
and appearance is what changes every time somebody has an opinion. Anything that needs a human
eye or real hardware is listed at the bottom as a manual check rather than pretended into a
suite.

## Two suites, two runners

They answer different questions.

| | `bun test` (vitest) | `bun run test:layout` (Playwright) |
|---|---|---|
| **Covers** | the rules and the payload guard | layout, shapes, touch targets, the viewer |
| **Where** | no DOM at all | real Chromium and WebKit |
| **Count** | 3 files | 10 specs, over 250 tests |
| **Speed** | ~0.2s | ~60s locally, ~12m in CI |

**jsdom has no layout engine.** It will report that a 900px panel fits in a 320px window, so the
class of bug the layout suite exists to catch is the class jsdom cannot see. That is the argument
for a real browser here.

**No screenshot baselines.** WebKit and Chromium rasterize type differently, so baselines would
need a set per engine and would churn on every UI change. Structure is what is invariant across
both: no horizontal overflow, the right shape at the right width, exactly one visible submit
button, 44px targets.

### Unit — the product rules

| File | What it pins down |
|---|---|
| [`review.test.ts`](../src/lib/review.test.ts) | `canSubmit` reads only the review; the severity counts; numbering that stays attached to its issue when the list is re-sorted |
| [`documents.test.ts`](../src/lib/documents.test.ts) | The two submission states the demo depends on, and that a surviving finding keeps its id across versions — which is what notes hang on |
| [`useReview.test.ts`](../src/hooks/useReview.test.ts) | The payload guard: a malformed response reaches the error state instead of dying inside a render |

### Browser — layout and interaction

The root README carries the same table with a sentence on each; this is the short
form.

| Spec | Holds down |
|---|---|
| `layout` | Twelve viewports plus a 320→1920 sweep: no horizontal overflow, the correct shape at each width, one primary action, 44px targets |
| `viewer` | Text layers everywhere so find reaches the whole document, canvases actually windowed, seeking, and both screens rendering without `URL.parse` |
| `submit` | Both halves of the rule: blocked offers upload, clear asks for confirmation, submitted reads as submitted on a cold load |
| `done` | The worklist reports progress without changing what is blocking, and never crosses versions |
| `documents` | The queue, the version switch surviving a reload, the placeholders being inert |
| `keyboard` | The issue grid driven entirely from the keyboard |
| `contrast` | Severity and secondary text measured against every surface, both themes, against the 4.5:1 AA floor |
| `uiscale` | The three text sizes, applied *before* the app mounts, surviving a reload, with the document not scaling |
| `panels` | The splitter, and the thumb strip's resize-and-close handover |
| `axe` | An automated WCAG A/AA rule scan of both routes in both themes, and of the confirmation dialog while open |

## Two tests that earned themselves

**The layout suite, on its first run**, caught a 32px submit button — under the 44px minimum, on
the one control the whole review ends with.

**The contrast spec, after the fact.** Secondary text shipped at 4.27:1 in light mode against a
highlighted row, under the AA floor. It was reported to me as a dark-mode problem, where it
measures 5.53 and passes. Writing the check meant measuring every text token on every surface it
lands on, in both themes, which is the only reason the failing one was the one nobody had
complained about.

---

## Tested on real devices

The suites run Chromium and WebKit. Neither is an iPad, and that gap has already cost once.

- **An iPhone in Xcode's iOS Simulator**, in Safari. It runs real WebKit, so it reproduces what
  a narrow Chrome window cannot: `dvh` against the browser toolbar, safe-area insets, momentum
  scrolling, and iOS Safari's own CSS behavior. It also shares the host's network, so the dev
  server is reachable at `localhost` with no extra setup.
- **A physical iPad, connected to desktop Safari's Web Inspector.** This is the one that matters.
  It is where the blank-screen bug appeared — `pdfjs-dist` calls `URL.parse`, which Safari only
  shipped in 18.4, so on iPadOS 17.4 the whole app died with a stack pointing into a vendor
  chunk. No simulator and no emulated viewport would have found it, and there is no console on a
  tablet without the cable.

Rotating that iPad across 1024px is also the fastest check that the two layout shapes are two
designs rather than one stretched.

## What isn't covered

- **The memory ceiling.** The Simulator runs on the Mac's RAM, so canvas usage that would get a
  real iPhone's tab discarded simply works there. The windowing constant is therefore *reasoned*
  rather than *proven*, and it is built conservatively for that reason. Closing this needs
  instrumented runs on a physical phone.
- **Screen readers.** Roles, names, keyboard paths and the WCAG A/AA rule set are all asserted by
  the suite. What no scanner can tell you is whether the page *makes sense* to listen to, and it
  has not yet been run through VoiceOver — **on the list, not written off**, see
  [08-roadmap.md](08-roadmap.md).
- **Android.** WebKit and Chromium cover the engines, but no physical Android device has been
  used.
- **The zoom gesture.** Pinch is exercised by hand rather than by the suite — synthesising a
  two-finger gesture in Playwright tests the synthesiser more than the app.

## Running them

```sh
bun test              # rules, ~0.2s
bun run test:layout   # browsers, ~60s
bun run test:layout:ui   # stepping through a failure
```

The browser suite needs its engines once:

```sh
bunx playwright install chromium webkit
```

**CI runs all of it on every push** — lint, types, the production build, both suites — and
`main` deploys only if all of it passed, then re-reads `/version.json` to confirm the live build
is that commit.

## Before a release

What no suite covers, checked by hand:

- Both themes, at all three text sizes.
- A keyboard-only pass: tab from the top, reach the document via the skip link, drive the issue
  grid, open and dismiss the confirmation.
- The iPad, rotated across the breakpoint.
- The iPhone Simulator, for the bottom bar against the home indicator.
- A submit, end to end, then a demo reset.

**To add:** a VoiceOver pass. It belongs on this list and is not on it yet.
