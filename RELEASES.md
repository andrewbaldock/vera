# Releases

Newest first. The version the live site is running is in the account menu, and
at [`/version.json`](https://vera.andrewbaldock.com/version.json).

---

## v1.1.0 — 2026-08-16

- **Viewability.** A beta tester found the interface type too small. This release
  adds: a UI text size, PDF zoom, and a thumbnail strip you can widen into actual
  thumbnails.
- **CI.** Every push runs lint, types, the production build and both test suites
  across Chromium and WebKit, including an accessibility scan. `main` deploys
  only if all of it passed.
- **Docs.** Rewrote the developer documentation to "derobotize" it, and make them
  more honest. Start at the [README](README.md).

**Added**

- **Text size setting** in the account menu — Compact, Comfortable, Large. Scales
  labels, spacing and touch targets together, and leaves the document alone.
- **Document zoom** up to 4×, from controls in the center of the page bar or a
  pinch. Click the percentage or double-tap to return to fit. Zoomed pages pan
  sideways.
- **Resizable thumbnail strip.** Drag its edge, or drag it shut and reopen it
  from the tab. Where you leave it is remembered.
- **Real page images** in the strip, at every width.
- **A page counter** over the document while you scroll.
- **Severity shapes** — critical points up, minor points down, major is a disc.
- **The build version**, in the account menu and at `/version.json`.

**Changed**

- The thumbnail strip used to shrink its pages to fit any document into its
  column, so a long document became a thread of slivers. It now has a floor and
  scrolls below it.
- Strip page numbers follow the text size setting. They were fixed at 8px, which
  is the specific thing that was too small.
- The findings under the page bar are set one size larger.
- More contrast on the focused row, in both themes.

**Fixed**

- Secondary text failed the WCAG AA contrast floor in light mode on three of the
  four surfaces it sits on — 4.27:1 against a highlighted row, against a 4.5
  minimum. Reported as a dark mode problem, where it passed at 5.53 and still
  read badly.
- Severity marks in the thumbnail strip painted underneath the page numbers.
- The thumbnail strip's page readout pointed at the wrong segment once the strip
  scrolled.
- Browser find matched the app's own readouts — `100` hit the zoom control, `34`
  the page counter. Both are generated content now.

---

## v1.0.2 — 2026-08-15

Restored the pointer cursor that Tailwind v4's reset removes from buttons. One
CSS rule; nothing else changed.

## v1.0.1 — 2026-08-15

Documentation only — added the development-approach writeup. No change to the
app.

## v1.0.0 — 2026-08-15

**The submitted build.** The Review Page from the take-home brief: a reviewer
opens a document the AI has already checked, reads what it found, decides what
is blocking submission, and submits.

Whole-document search, a continuously scrolled viewer, an issues list that is a
keyboard-navigable grid, a per-issue done list and notes, a draggable split, a
scrub-to-navigate page strip, light and dark themes, and two layout shapes with
the boundary at 1024px so an iPad changes shape rather than scale.

Described in full in [`docs/`](docs/).
