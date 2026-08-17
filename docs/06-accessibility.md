# Accessibility

**Purpose:** who can use this, verified how, and where it falls short.
**Audience:** an evaluator, and anyone maintaining it.
**Read time:** 5 minutes.
**Last reviewed:** 2026-08-16

---

## The standard I aimed at

**The reasoning here is domain-specific.** This is a compliance tool in a regulated industry, used all day by people doing careful work. If it isn't operable without a mouse, it isn't finished.

The work splits three ways, and only the first is free:

1. **Inherit** — Radix, via shadcn, supplies focus management, ARIA wiring, keyboard interaction and dismiss layers for the primitives.
2. **Audit** — inherited is not the same as verified. What a library emits still has to be checked against what this page needs, and in one case below the library default is the wrong call for us.
3. **Extend** — the system has no splitter, so we author one to the same standard rather than shipping a mouse-only gap.

## What goes beyond a checklist

**The submit button is `aria-disabled`, not `disabled`.** A `disabled` button is removed from the tab order and announces nothing, so a keyboard user tabs straight past the most important control on the page and is never told why it isn't available. Instead it stays focusable and carries `aria-disabled="true"` plus `aria-describedby` pointing at the blocking summary, so reaching it says *"Submit review, dimmed — 12 issues must be fixed before you can submit."* The click handler no-ops while blocked. *(Superseded: blocked, the page now offers no submit control at all. See the decision log.)*

**An issue row is not one big clickable `div`.** Each row holds two independent controls, a button (jump to this issue's page) and a checkbox (my private note), so it cannot be a single clickable region, and nesting a checkbox inside a button is invalid. The row is an `<li>` containing a real `<button>` for the title and a real `<input type="checkbox">` with its own label.

**The verdict is a live region.** When the last blocker clears, or a Done tick changes the progress count, the summary announces. Filtering deliberately does *not*: the counts describe the document rather than the view, so hiding the minors leaves the text identical and there is nothing to say. Otherwise a screen reader user checks something off, the state changes materially, and nothing tells them.

**The confirmation uses the system's Dialog (Radix underneath), not a native `<dialog>`.** Native `<dialog>` + `showModal()` would give the same focus trap, focus return, escape and inertness for free, but once a system exists, a screen that opens modals its own private way is the first crack in it. Both work; the one the next screen will also use is the right pick.

**Severity is never color alone.** Color plus an icon plus the text label, everywhere severity appears — list rows, status bar labels, and the strip.

---

## Keyboard

Every interactive region follows a named pattern rather than an invented one.

| Region | Keys | Pattern |
|---|---|---|
| Issues list | `↑` `↓` rows · `←` `→` columns · `Enter` opens the page · `Space` ticks Done · `Home` `End` · `Esc` leaves | [ARIA grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), roving tabindex |
| Thumb strip | `↑` `↓` `←` `→` step a page · `PageUp` `PageDown` step five · `Home` `End` | [Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) |
| Splitter | `←` `→` nudge · `Home` `End` snap | [Window splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) |
| Dialogs | `Esc` dismisses, focus trapped, focus returned | Radix, underneath shadcn |
| Skip link | First stop in the tab order | — |

Asserted in [`tests/keyboard.spec.ts`](../tests/keyboard.spec.ts) rather than claimed here.

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
good is worth nothing if nobody finds it, and nobody reads a wiki page to learn a
keyboard shortcut. The guide states the keys, the rules that are easy to get wrong (Done never opens the
submission; ticks don't cross versions; submitting can't be undone), and what the app does not do. A
user who knows why something is missing is not a user filing a bug about it.

## Screen reader

**What announces.** The verdict is a live region: when the last blocker clears, or a Done tick
moves the progress count, it says so. The submit control carries `aria-describedby` pointing at
the blocking summary, so reaching it explains itself. The thumb strip reports page and issue
count through `aria-valuetext`, on demand rather than continuously. Focused rows carry
`aria-current`.

**What deliberately does not.** The page status bar has no live region, and that is the more
considered half. Its text changes on every page a momentum scroll passes, so announcing it would
queue thirty updates about pages the listener has already left. The same fact is available from
the strip's slider, which reports when asked. Filtering the list is silent too: the counts
describe the document rather than the view, so hiding the minors leaves the text identical and
there is nothing to say.

**Honest about coverage.** Roles, names and keyboard paths are asserted by the suite. How
VoiceOver actually reads this page end to end has not been tested yet — it is the next thing on
this document's list, and saying so is more useful than implying a pass that has not happened. A
rule scanner catches the mechanical failures; it cannot hear the page.

## Color and contrast

Measured, not eyeballed. [`tests/contrast.spec.ts`](../tests/contrast.spec.ts) walks every text
token against every surface it lands on, in both themes, and fails under 4.5:1.

Two findings came out of doing that.

**Severity needs two token roles, not one.** The fills are tuned to read as 8px marks. Set as
12px type they measure **4.77, 2.56 and 3.63** against white — two of three under the AA floor,
Major by a mile. So the severity *words* use their own darkened tokens, which clear 5.8 or
better.

**Secondary text shipped under the floor in light mode.** It measured **4.27:1** against a
highlighted row, plus 4.44 and 4.48 on two other surfaces. It was reported as a dark-mode
problem, where it measures 5.53 and passes but still reads badly — a neutral grey on a
blue-violet tint at 12px reads worse than its ratio suggests. It carries the issue descriptions,
which are the finding itself. Now 5.31 at worst in light and 6.90 in dark, and covered by the
spec so it cannot regress.

**Nothing is carried by color alone.** Severity is color plus icon plus the word, everywhere it
appears. In the thumb strip, where a narrow segment has no room for a label, the marks differ in
*thickness* as well as hue, so they survive grayscale.

## Touch, pointer, and the rest

- Landmarks: `header`, the issues panel, `main` for the viewer. Skip link to the document.
- The splitter implements the WAI-ARIA window-splitter pattern: `role="separator"`, focusable, `aria-orientation`, `aria-valuenow/min/max`, arrow keys to nudge and Home/End to snap.
- The back link is a real anchor with a real `href`, never `href="#"`.
- Visible focus everywhere. The default outline is replaced, never removed: every control swaps it for a 3px `focus-visible` ring, and the splitter — a 6px line with no room for one — inverts its own color instead, which measures about 4:1 against its resting state.
- Jumping to a page scrolls smoothly, so the movement shows you where you went, unless `prefers-reduced-motion` is set, in which case it jumps.
- Every icon-only control has an accessible name.
- **Touch targets are 44px.** Apple's HIG number, and also WCAG 2.1's AAA target size — WCAG
  2.2's AA minimum is only 24px, and exceeding it is a decision about a one-way submit with no
  undo. Asserted at twelve viewports rather than claimed.
- **The thumb strip meets that as one control rather than thirty-four.** Thirty-four segments at
  44px would need 1,496px of column; as a single press-and-drag scrubber the minimum applies
  once. Designing it for a thumb is also what earned it slider semantics and full keyboard
  navigation of the document.
- **Nothing essential is behind `:hover`**, because the wide layout appears on touch screens. A
  truncated title reveals itself on tap as well as hover; the status bar's descriptions expand on
  tap at every size.

## Motion and preferences

Every animation honors `prefers-reduced-motion`, and each degrades to its **end state** rather
than to nothing — a state that exists only as an animation would otherwise disappear entirely
for the people who asked for less movement. The row that settles after a submission keeps its
tint and ring; the sweep, the landing mark and the shimmer simply stop.

Seeking a page scrolls smoothly, because the movement shows you where you went in a way a hard
jump does not. Under reduced motion it jumps instead, since a long animated scroll is nauseating
rather than informative.

## Text size

Three stops in the account menu, applied as the root font size. Because Tailwind sizes type
*and* spacing in rem, one value moves labels, padding, gaps and the 44px touch minimum together.
The stops are percentages of the browser's own default, so a reader who has already raised their
base size keeps it and gets this on top.

**This exists because browser zoom is the wrong tool.** Zoom magnifies the document along with
the interface, so a reader who can already read the pages gets bigger pages they did not ask
for. The document is deliberately excluded and has its own zoom for when that is what is wanted.

It was added because someone outside the project found the type too small — which is the only
reason this section is not a checklist item.

---

## The honest limitation

**A rendered PDF is not accessible, and we say so rather than imply otherwise.** pdf.js paints a canvas and overlays absolutely-positioned text spans; the reading order that produces is unreliable, and none of the document's structure (headings, tables, reading order) survives. Whole-document `CMD+F` works because the text is in the DOM, which is not the same as the document being navigable by a screen reader.

We are not going to fix that client-side. The real answer is server-side: tagged/structured PDF, or an accessible HTML rendering of the extracted content served alongside the visual one. It is a known gap with a named fix, carried into [07-production.md](07-production.md) rather than glossed.

---

## How this was verified

- **Automated, every push.** [`axe.spec.ts`](../tests/axe.spec.ts) runs the WCAG A and AA rule
  set over both routes in both themes, and over the confirmation dialog while it is open.
  [`contrast.spec.ts`](../tests/contrast.spec.ts) measures every text token on every surface in
  both themes, which is the more specific check of the two. [`keyboard.spec.ts`](../tests/keyboard.spec.ts) drives
  the issues grid with no mouse at all. [`layout.spec.ts`](../tests/layout.spec.ts) asserts every
  touch target clears 44px, at twelve viewports.
- **By hand, before a release.** A keyboard-only pass from the top of the tab order: skip link to
  the document, drive the grid, open and dismiss the confirmation. Both themes, all three text
  sizes.
- **On real hardware.** A physical iPad on Safari's Web Inspector, and an iPhone in the
  Simulator — see [05-testing.md](05-testing.md).
- **Not done yet:** a VoiceOver pass, end to end. **Next up** — see
  [08-roadmap.md](08-roadmap.md). A rule scan is a floor and cannot tell you whether a page makes
  sense to listen to.

