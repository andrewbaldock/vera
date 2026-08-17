# Releases

Newest first. The version the live site is running is in the account menu, and
at [`/version.json`](https://vera.andrewbaldock.com/version.json).

---

## v1.1.0 — 2026-08-16

**Making it readable.** Someone reviewing VERA found the interface type too
small, and browser zoom turned out to be the wrong tool for it: zoom scales the
document along with the interface, so the pages you could already read get
bigger too. This release separates the two, and then fixes everything that
separation exposed.

**Added**

- A text size setting in the account menu — Compact, Comfortable, Large. It
  scales the whole interface: labels, spacing and touch targets together. The
  document is deliberately unaffected.
- The page strip can be resized, and closed. Drag its edge to make the pages
  bigger, or drag it shut and reopen it from the tab at the edge of the
  document. Where you leave it is remembered.
- Real page images in the strip, at every width.
- A page counter that appears over the document while you scroll and fades out
  when you stop.
- The build version, in the account menu and at `/version.json`.

**Changed**

- The page strip used to shrink its pages to fit any document into its column,
  which meant a long document got a thread of unreadable slivers. It now has a
  floor: below it the strip scrolls instead of shrinking. At the shipped size a
  34-page document looks exactly as it did.
- Page numbers in the strip follow the text size setting. They were fixed at
  8px, which is the specific thing that was too small.

**Fixed**

- Secondary text failed the WCAG AA contrast floor in light mode on three of the
  four surfaces it sits on — 4.27:1 against a highlighted row, where 4.5 is the
  minimum. It carries the issue descriptions, which are the finding itself.
  Reported as a dark mode problem, where it passed at 5.53 and still read badly.
- Severity marks in the strip were painting underneath the page numbers.
- The strip's page readout pointed at the wrong segment once the strip scrolled.

**Notes**

Page images in the strip reverse a decision recorded in the original build,
which declined them on the grounds that a picture that small is unreadable.
That is true of the picture and beside the point of it: a cover sheet, a table
and a photo page are three different shapes even as a smear.

The repo now runs its own tests. Every push checks lint, types, the production
build, 32 unit tests and 244 browser tests across Chromium and WebKit.

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
