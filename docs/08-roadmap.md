# Roadmap

**Purpose:** what was deferred on purpose, what got reversed, and what's next.
**Audience:** me, and anyone asking "why doesn't it do X?"
**Read time:** 3 minutes.
**Last reviewed:** 2026-08-16

---

## Deliberately deferred

Wanted, and not built. Each satisfies **no acceptance criterion**, and each costs more than it
first appears. Listed so the absence reads as a decision rather than an oversight.

**Restoring scroll position across a reload.** Useful for a 34-page document worked through over
a long session. But a continuous-scroll viewer has no page geometry at mount, so the restore has
to hang off the viewer's render signal and fire exactly once, or scrolling away snaps the reader
back every time. Worth having in a real product; not worth the build time here.

### The simulated re-upload

The reprocessor was never built, and the loop is shown two other ways instead.

- **An inert *Upload new version* dialog**
  ([`UploadDialog.tsx`](../src/components/UploadDialog.tsx)), offered whenever something is still
  blocking. It names the document, says a new version replaces this one and is checked from
  scratch, and stops at the boundary with the drop zone disabled. It exists so a blocked state
  shows where the loop goes rather than looking like a dead end.
- **Two real versions of the document** in the catalog, v2 and v3, switched from the header.

What was *not* built is a demo control that would take the current review, drop the issues ticked
done, bump the version and hand back a new review object. Two real fixtures do the same job more
honestly: v3 is a payload the backend could have returned, whereas a client-side reprocessor
mutating a review in the browser is the one thing the done checkbox exists to make impossible.

The reasoning is kept because it is what produced the answer. A checkbox must never unlock
submission — it can only tell a simulator what was fixed upstream, and submission becomes
possible because a new version arrived clean. That is the real product rule, and two fixtures
model it without writing code that appears to break it.

---

## Reversed since

Both of these were deferred with a stated cost, and in both cases the cost turned out to be
payable. They are kept visible because a decision you can watch change its mind is worth more
than one written as though the answer were always obvious.

**Pinch-to-zoom.** Cut on cost rather than on principle: doing it properly reaches into the
reserved page heights and the reading-line measurement, both load-bearing. That estimate was
right, and both were handled. A transform follows the gesture and a real re-render lands when it
ends; the canvas window narrows as zoom opens, since a canvas costs the square of the zoom; and
the page being read is anchored across the change. On a trackpad the same gesture zooms the
document rather than the app.

**Page thumbnails in the strip.** Declined because 34 extra pdf.js renders produce images too
small to read. True of the picture, and beside the point of it: a cover sheet, a table and a
photo page are three different shapes even as a smear, which is enough to navigate by. They
render at every width now, from a lazily-imported chunk so pdf.js stays out of the entry bundle.

---

## Next

In the order I would actually do them.

1. **A VoiceOver pass, end to end.** The one claim in
   [06-accessibility.md](06-accessibility.md) currently resting on inference rather than on
   having listened to it. Roles, names and keyboard paths are asserted by the suite; how the page
   actually reads is not.
2. **A `/dev` route** — swap the PDF and edit the mock payload, so other document-and-report
   combinations can be tried without a rebuild.
3. **Export the findings as a printable report.** The app's whole subject is a PDF report and it
   cannot produce one. A reviewer who wants the findings on paper, or attached to the loan file,
   has nothing but a screenshot.

   **The shape.** One row per page *that has a finding* — the page rastered on the left, its
   findings listed on the right. On the supplied fixture that is 20 rows, not 34: 25 issues fall
   on 20 distinct pages, and the 14 clean pages say nothing worth a row. Numbering comes from
   [`numberByPage`](../src/lib/review.ts) and the grouping from `groupByPage`, so the report and
   the list agree about what `#12` refers to. `Issue` carries a page number and no coordinates,
   so a page is the finest location the report can honestly claim — nothing is drawn inside one.

   **How.** A print stylesheet and `window.print()`, reached from the user menu. pdf.js is
   already in the bundle and already renders a page to a canvas, so this needs no new dependency;
   the browser's own *Save as PDF* does the export. The cost is that the browser owns the
   filename and the page furniture, which is the trade being accepted rather than an oversight.

   Four things that decide whether it works:

   - **Canvas count.** The viewer windows canvases on purpose, so 34 pages never cost 34
     canvases. A print view mounting 20 at once walks straight into what that decision avoids —
     they have to be rendered sequentially, at a modest scale, and released.
   - **Print colour is dropped by default.** Severity is carried by colour, so without
     `print-color-adjust: exact` the report prints as grey rows and loses the one distinction it
     exists to show.
   - **Resolution.** Paper is ~300dpi against a 96dpi canvas. pdf.js has to render at 2–3× and be
     constrained by CSS, or the page images arrive as the smears the strip deliberately settles
     for.
   - **Page breaks.** `break-inside: avoid` per row, or a page image is separated from its own
     findings.
