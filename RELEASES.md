# Releases

Newest first. The version the live site is running is in the account menu, and
at [`/version.json`](https://vera.andrewbaldock.com/version.json).

---

## v1.1.0 — 2026-08-16

**Making it readable.** Someone reviewing VERA found the interface type too
small. Browser zoom is the wrong tool for that — it scales the document along
with the interface. This release separates the two.

**Added**

- A text size setting in the account menu: Compact, Comfortable, Large. It scales
  labels, spacing and touch targets together, and leaves the document alone.
- Zoom on the document, up to 4×. Controls in the centre of the page bar, or a
  pinch. The percentage between them returns the document to fit, as does a
  double-tap. Zoomed pages pan sideways.
- The page strip resizes and closes — drag its edge, or drag it shut and reopen
  it from the tab. Where you leave it is remembered.
- Real page images in the strip, at every width.
- A page counter over the document while you scroll.
- Severity has a shape as well as a colour: critical points up, minor points
  down, major is a disc between them.
- The build version, in the account menu and at `/version.json`.

**Changed**

- The strip used to shrink its pages to fit any document into its column, so a
  long document became a thread of slivers. It now has a floor and scrolls below
  it. At 34 pages it looks exactly as it did.
- Page numbers in the strip follow the text size setting. They were fixed at 8px,
  which is the specific thing that was too small.
- The findings under the page bar are set one size larger.

**Fixed**

- Secondary text failed the WCAG AA contrast floor in light mode on three of the
  four surfaces it sits on — 4.27:1 against a highlighted row, against a 4.5
  minimum. It carries the issue descriptions. Reported as a dark mode problem,
  where it passed at 5.53 and still read badly.
- Severity marks in the strip painted underneath the page numbers.
- The strip's page readout pointed at the wrong segment once the strip scrolled.
- Browser find matched the app's own readouts: searching for `100` landed on the
  zoom control, `34` on the page counter. Both are drawn as generated content now.

**Notes**

Two decisions from the first build are reversed here. Pinch-to-zoom was cut on
cost, and the cost was real — zoom reaches into the reserved page heights and
into the measurement that decides which page you are reading. Page images were
declined because a picture that small is unreadable, which is true of the picture
and beside the point of it: a cover sheet, a table and a photo page are three
different shapes even as a smear.

Every push now runs lint, types, the production build and both test suites across
Chromium and WebKit, including an accessibility scan. `main` deploys only if all
of it passed.

The documentation is rewritten, from four long files into a numbered set, with
every decision the build has made collected in one place.

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
